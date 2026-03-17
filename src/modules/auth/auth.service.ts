import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { createHash, randomBytes } from 'crypto';
import ms from 'ms';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { ForgotPasswordRequestDto } from './dto/forgot-password-request.dto.js';
import { ForgotPasswordVerifyDto } from './dto/forgot-password-verify.dto.js';
import { ForgotPasswordConfirmDto } from './dto/forgot-password-confirm.dto.js';
import { ForgotUidRequestDto } from './dto/forgot-uid-request.dto.js';
import { ForgotUidVerifyDto } from './dto/forgot-uid-verify.dto.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { JwtPayload } from './types/jwt-payload.type.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresAt: Date;
}

interface PasswordResetTokenPayload {
  sub: string;
  rid: string;
  email: string;
  type: 'PASSWORD_RESET';
}

@Injectable()
export class AuthService {
  private readonly invalidCredentialMessage = 'Invalid User ID or Password';
  private readonly recoveryCodeLength = 5;
  private readonly recoveryCodeTtl = '10m';
  private readonly passwordResetTokenTtl = '15m';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async login(dto: LoginDto, request: Request): Promise<TokenPair> {
    const userIdInput = dto.userId.trim();
    const user = await this.prisma.user.findFirst({
      where: {
        uid: { equals: userIdInput, mode: 'insensitive' },
      },
    });

    if (!user) {
      await this.logLoginAttempt(userIdInput, false, request, 'USER_NOT_FOUND');
      throw new UnauthorizedException(this.invalidCredentialMessage);
    }

    const isUserActive = user.status === 'ACTIVE' && !!user.publishedAt;
    if (!isUserActive) {
      await this.logLoginAttempt(user.uid, false, request, 'USER_NOT_ACTIVE');
      throw new UnauthorizedException(this.invalidCredentialMessage);
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: { increment: 1 } },
      });
      await this.logLoginAttempt(user.uid, false, request, 'INVALID_PASSWORD');
      throw new UnauthorizedException(this.invalidCredentialMessage);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lastSeenAt: new Date(),
      },
    });

    const refreshTokenTtl = dto.rememberMe
      ? this.getConfigString('auth.rememberMeTtl')
      : this.getConfigString('auth.refreshTtl');
    const refreshExpiresAt = this.computeExpiry(refreshTokenTtl);

    const refreshTokenRaw = this.generateOpaqueToken();
    const refreshTokenHash = this.hashToken(refreshTokenRaw);
    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        rememberMe: dto.rememberMe,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        ipAddress: this.readIp(request),
        userAgent: request.headers['user-agent'] ?? null,
        expiresAt: refreshExpiresAt,
      },
    });

    await this.logLoginAttempt(user.uid, true, request);

    const accessPayload: JwtPayload = {
      sub: user.id,
      sid: session.id,
      uid: user.uid,
      email: user.email,
    };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.getConfigString('auth.accessSecret'),
      expiresIn: this.getConfigString('auth.accessTtl') as ms.StringValue,
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      accessTokenExpiresIn: this.getConfigString('auth.accessTtl'),
      refreshTokenExpiresAt: refreshExpiresAt,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const hash = this.hashToken(dto.refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshTokenRaw = this.generateOpaqueToken();
    const refreshTokenHash = this.hashToken(refreshTokenRaw);
    const expiresAt = this.computeExpiry(
      session.rememberMe
        ? this.getConfigString('auth.rememberMeTtl')
        : this.getConfigString('auth.refreshTtl'),
    );

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    const accessToken = await this.jwtService.signAsync(
      {
        sub: session.user.id,
        sid: session.id,
        uid: session.user.uid,
        email: session.user.email,
      } satisfies JwtPayload,
      {
        secret: this.getConfigString('auth.accessSecret'),
        expiresIn: this.getConfigString('auth.accessTtl') as ms.StringValue,
      },
    );

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      accessTokenExpiresIn: this.getConfigString('auth.accessTtl'),
      refreshTokenExpiresAt: expiresAt,
    };
  }

  async logout(user: AuthenticatedUser, dto: LogoutDto): Promise<void> {
    if (dto.refreshToken) {
      const hash = this.hashToken(dto.refreshToken);
      await this.prisma.authSession.updateMany({
        where: {
          userId: user.id,
          refreshTokenHash: hash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          activeStationId: null,
        },
      });
      return;
    }

    await this.prisma.authSession.update({
      where: { id: user.sessionId },
      data: {
        revokedAt: new Date(),
        activeStationId: null,
      },
    });
  }

  async me(user: AuthenticatedUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        uid: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
      },
    });

    const session = await this.prisma.authSession.findUnique({
      where: { id: user.sessionId },
      select: {
        id: true,
        activeStationId: true,
        rememberMe: true,
        expiresAt: true,
      },
    });

    return { user: dbUser, session };
  }

  async forgotPasswordRequest(
    dto: ForgotPasswordRequestDto,
    request: Request,
  ): Promise<void> {
    const emailInput = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: emailInput, mode: 'insensitive' } },
    });

    if (!user) {
      throw new BadRequestException({
        message: 'This email is not registered in our system.',
        code: 'EMAIL_NOT_REGISTERED',
      });
    }

    await this.expireOutstandingRecoveryRequests(emailInput, 'PASSWORD_RESET');

    const verificationCode = this.generateVerificationCode();
    const verificationCodeHash = this.hashToken(verificationCode);
    const expiresAt = this.computeExpiry(this.recoveryCodeTtl);

    const requestRecord = await this.prisma.accountRecoveryRequest.create({
      data: {
        userId: user.id,
        requestedEmail: user.email,
        recoveryType: 'PASSWORD_RESET',
        verificationCodeHash,
        expiresAt,
        status: 'SENT',
        requestedIp: this.readIp(request),
      },
    });

    await this.notificationsService.queueAndSendEmail({
      requestId: requestRecord.id,
      userId: user.id,
      emailTo: user.email,
      subject: 'Password Reset Verification Code',
      templateCode: 'PASSWORD_RESET_OTP',
      payloadJson: {
        userName: `${user.firstName} ${user.lastName}`,
        verificationCode,
        expiresInMinutes: this.durationToMinutes(this.recoveryCodeTtl),
      },
    });
  }

  async forgotPasswordVerify(
    dto: ForgotPasswordVerifyDto,
  ): Promise<{ resetToken: string }> {
    const emailInput = dto.email.trim().toLowerCase();
    const requestRecord = await this.findLatestRecoveryRequest(
      emailInput,
      'PASSWORD_RESET',
    );

    if (
      !requestRecord ||
      !requestRecord.user ||
      !requestRecord.verificationCodeHash ||
      requestRecord.status !== 'SENT' ||
      !requestRecord.expiresAt ||
      requestRecord.expiresAt <= new Date() ||
      requestRecord.verificationCodeHash !== this.hashToken(dto.code.trim())
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    return {
      resetToken: await this.issuePasswordResetToken({
        requestId: requestRecord.id,
        userId: requestRecord.user.id,
        email: requestRecord.user.email,
      }),
    };
  }

  async forgotPasswordConfirm(dto: ForgotPasswordConfirmDto): Promise<void> {
    const payload = await this.verifyPasswordResetToken(dto.token);
    const requestRecord = await this.prisma.accountRecoveryRequest.findUnique({
      where: { id: payload.rid },
      include: { user: true },
    });

    if (
      !requestRecord ||
      requestRecord.recoveryType !== 'PASSWORD_RESET' ||
      requestRecord.status === 'COMPLETED' ||
      !requestRecord.user ||
      requestRecord.user.id !== payload.sub ||
      requestRecord.user.email.toLowerCase() !== payload.email.toLowerCase()
    ) {
      throw new BadRequestException('Invalid or expired recovery token');
    }

    const passwordHash = await argon2.hash(dto.newPassword);
    const revokedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: requestRecord.user.id },
        data: {
          passwordHash,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.authSession.updateMany({
        where: {
          userId: requestRecord.user.id,
          revokedAt: null,
        },
        data: {
          revokedAt,
          activeStationId: null,
        },
      }),
      this.prisma.accountRecoveryRequest.update({
        where: { id: requestRecord.id },
        data: {
          status: 'COMPLETED',
          consumedAt: new Date(),
          verificationCodeHash: null,
        },
      }),
    ]);
  }

  async forgotUidRequest(
    dto: ForgotUidRequestDto,
    request: Request,
  ): Promise<void> {
    const emailInput = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: emailInput, mode: 'insensitive' } },
    });

    if (!user) {
      throw new BadRequestException({
        message: 'This email is not registered in our system.',
        code: 'EMAIL_NOT_REGISTERED',
      });
    }

    await this.expireOutstandingRecoveryRequests(emailInput, 'UID_RECOVERY');

    const verificationCode = this.generateVerificationCode();
    const verificationCodeHash = this.hashToken(verificationCode);
    const expiresAt = this.computeExpiry(this.recoveryCodeTtl);

    const requestRecord = await this.prisma.accountRecoveryRequest.create({
      data: {
        userId: user.id,
        requestedEmail: user.email,
        recoveryType: 'UID_RECOVERY',
        verificationCodeHash,
        expiresAt,
        status: 'SENT',
        requestedIp: this.readIp(request),
      },
    });

    await this.notificationsService.queueAndSendEmail({
      requestId: requestRecord.id,
      userId: user.id,
      emailTo: user.email,
      subject: 'User ID Recovery Verification Code',
      templateCode: 'UID_RECOVERY_OTP',
      payloadJson: {
        userName: `${user.firstName} ${user.lastName}`,
        verificationCode,
        expiresInMinutes: this.durationToMinutes(this.recoveryCodeTtl),
      },
    });
  }

  async forgotUidVerify(dto: ForgotUidVerifyDto): Promise<{ userId: string }> {
    const emailInput = dto.email.trim().toLowerCase();
    const requestRecord = await this.findLatestRecoveryRequest(
      emailInput,
      'UID_RECOVERY',
    );

    if (
      !requestRecord ||
      !requestRecord.user ||
      !requestRecord.verificationCodeHash ||
      requestRecord.status !== 'SENT' ||
      !requestRecord.expiresAt ||
      requestRecord.expiresAt <= new Date() ||
      requestRecord.verificationCodeHash !== this.hashToken(dto.code.trim())
    ) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.prisma.accountRecoveryRequest.update({
      where: { id: requestRecord.id },
      data: {
        status: 'COMPLETED',
        consumedAt: new Date(),
        verificationCodeHash: null,
      },
    });

    return { userId: requestRecord.user.uid };
  }

  noEmailAccessMessage(): string {
    return 'Please Contact your management (management will provide details and will help with problems to the user to fix their issues regarding account).';
  }

  private async logLoginAttempt(
    attemptedUid: string,
    success: boolean,
    request: Request,
    failureReason?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { uid: { equals: attemptedUid, mode: 'insensitive' } },
      select: { id: true },
    });
    await this.prisma.loginAuditLog.create({
      data: {
        userId: user?.id,
        attemptedUid,
        success,
        failureReason,
        ipAddress: this.readIp(request),
        userAgent: request.headers['user-agent'] ?? null,
      },
    });
  }

  private readIp(request: Request): string | null {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() ?? null;
    }
    return request.ip ?? null;
  }

  private hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private generateOpaqueToken(): string {
    return randomBytes(48).toString('hex');
  }

  private generateVerificationCode(): string {
    const max = 10 ** this.recoveryCodeLength;
    return Math.floor(Math.random() * max)
      .toString()
      .padStart(this.recoveryCodeLength, '0');
  }

  private async expireOutstandingRecoveryRequests(
    email: string,
    recoveryType: 'PASSWORD_RESET' | 'UID_RECOVERY',
  ): Promise<void> {
    await this.prisma.accountRecoveryRequest.updateMany({
      where: {
        requestedEmail: email,
        recoveryType,
        consumedAt: null,
        status: {
          in: ['REQUESTED', 'SENT'],
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  private async findLatestRecoveryRequest(
    email: string,
    recoveryType: 'PASSWORD_RESET' | 'UID_RECOVERY',
  ) {
    return this.prisma.accountRecoveryRequest.findFirst({
      where: {
        requestedEmail: email,
        recoveryType,
        consumedAt: null,
      },
      include: { user: true },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async issuePasswordResetToken(input: {
    requestId: string;
    userId: string;
    email: string;
  }): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: input.userId,
        rid: input.requestId,
        email: input.email,
        type: 'PASSWORD_RESET',
      } satisfies PasswordResetTokenPayload,
      {
        secret: this.getConfigString('auth.accessSecret'),
        expiresIn: this.passwordResetTokenTtl as ms.StringValue,
      },
    );
  }

  private async verifyPasswordResetToken(
    token: string,
  ): Promise<PasswordResetTokenPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<PasswordResetTokenPayload>(token, {
          secret: this.getConfigString('auth.accessSecret'),
        });

      if (payload.type !== 'PASSWORD_RESET') {
        throw new BadRequestException('Invalid or expired recovery token');
      }

      return payload;
    } catch {
      throw new BadRequestException('Invalid or expired recovery token');
    }
  }

  private computeExpiry(duration: string): Date {
    const durationMs = ms(duration as ms.StringValue);
    if (!durationMs) {
      throw new Error(`Invalid duration: ${duration}`);
    }
    return new Date(Date.now() + durationMs);
  }

  private durationToMinutes(duration: string): number {
    const durationMs = ms(duration as ms.StringValue);
    if (!durationMs) {
      throw new Error(`Invalid duration: ${duration}`);
    }
    return Math.round(durationMs / 60_000);
  }

  private getConfigString(path: string): string {
    const value = this.configService.get<string>(path, { infer: true });
    if (!value) {
      throw new Error(`Missing config value: ${path}`);
    }
    return value;
  }
}
