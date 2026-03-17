import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { ForgotPasswordRequestDto } from './dto/forgot-password-request.dto.js';
import { ForgotPasswordVerifyDto } from './dto/forgot-password-verify.dto.js';
import { ForgotPasswordConfirmDto } from './dto/forgot-password-confirm.dto.js';
import { ForgotUidRequestDto } from './dto/forgot-uid-request.dto.js';
import { ForgotUidVerifyDto } from './dto/forgot-uid-verify.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, request);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
  ): Promise<{ success: boolean }> {
    await this.authService.logout(user, dto);
    return { success: true };
  }

  @ApiBearerAuth()
  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/request')
  async forgotPasswordRequest(
    @Body() dto: ForgotPasswordRequestDto,
    @Req() request: Request,
  ) {
    await this.authService.forgotPasswordRequest(dto, request);
    return {
      message: 'A verification code has been sent to the registered email.',
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/verify')
  async forgotPasswordVerify(@Body() dto: ForgotPasswordVerifyDto) {
    const recovery = await this.authService.forgotPasswordVerify(dto);
    return {
      message: 'Verification successful.',
      ...recovery,
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-password/confirm')
  async forgotPasswordConfirm(@Body() dto: ForgotPasswordConfirmDto) {
    await this.authService.forgotPasswordConfirm(dto);
    return { message: 'Password reset successful.' };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-uid/request')
  async forgotUidRequest(
    @Body() dto: ForgotUidRequestDto,
    @Req() request: Request,
  ) {
    await this.authService.forgotUidRequest(dto, request);
    return {
      message: 'A verification code has been sent to the registered email.',
    };
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('forgot-uid/verify')
  async forgotUidVerify(@Body() dto: ForgotUidVerifyDto) {
    const recovery = await this.authService.forgotUidVerify(dto);
    return {
      message: 'User ID verified successfully.',
      ...recovery,
    };
  }

  @Public()
  @Get('no-email-access-message')
  getNoEmailAccessMessage() {
    return {
      success: true,
      statusCode: 200,
      message: this.authService.noEmailAccessMessage(),
      data: null,
    };
  }
}
