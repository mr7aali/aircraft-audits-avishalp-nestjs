import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  EMAIL_NOTIFICATION_JOB,
  EMAIL_NOTIFICATIONS_QUEUE,
} from './notifications.constants.js';

interface QueueEmailInput {
  userId?: string;
  requestId?: string;
  emailTo: string;
  subject: string;
  templateCode: string;
  payloadJson?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter?: Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectQueue(EMAIL_NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get<string>('mail.host', { infer: true }),
        port: this.configService.get<number>('mail.port', { infer: true }),
        secure: this.configService.get<boolean>('mail.secure', { infer: true }),
        auth: this.configService.get<string>('mail.user')
          ? {
              user: this.configService.get<string>('mail.user', {
                infer: true,
              }),
              pass: this.configService.get<string>('mail.pass', {
                infer: true,
              }),
            }
          : undefined,
      });
    }
    return this.transporter;
  }

  async queueAndSendEmail(input: QueueEmailInput): Promise<void> {
    const notification = await this.prisma.emailNotification.create({
      data: {
        requestId: input.requestId,
        userId: input.userId,
        emailTo: input.emailTo,
        templateCode: input.templateCode,
        subject: input.subject,
        payloadJson: input.payloadJson as Prisma.InputJsonValue | undefined,
        status: 'PENDING',
      },
    });

    try {
      await this.queue.add(
        EMAIL_NOTIFICATION_JOB,
        {
          notificationId: notification.id,
          emailTo: input.emailTo,
          subject: input.subject,
          templateCode: input.templateCode,
          payloadJson: input.payloadJson ?? {},
        },
        {
          attempts: 3,
          removeOnComplete: 100,
          removeOnFail: 100,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
    } catch (error) {
      this.logger.error('Queue unavailable; sending email directly', error);
      await this.sendEmailNow({
        notificationId: notification.id,
        emailTo: input.emailTo,
        subject: input.subject,
        templateCode: input.templateCode,
        payloadJson: input.payloadJson ?? {},
      });
    }
  }

  async sendEmailNow(input: {
    notificationId: string;
    emailTo: string;
    subject: string;
    templateCode: string;
    payloadJson: Record<string, unknown>;
  }): Promise<void> {
    const html = this.renderTemplate(input.templateCode, input.payloadJson);
    try {
      await this.getTransporter().sendMail({
        from: this.configService.get<string>('mail.from', { infer: true }),
        to: input.emailTo,
        subject: input.subject,
        text: this.renderTextTemplate(input.templateCode, input.payloadJson),
        html,
      });

      await this.prisma.emailNotification.update({
        where: { id: input.notificationId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    } catch (error) {
      await this.prisma.emailNotification.update({
        where: { id: input.notificationId },
        data: { status: 'FAILED', failedAt: new Date() },
      });
      this.logger.error('Failed to send email', error);
    }
  }

  private renderTemplate(
    templateCode: string,
    payload: Record<string, unknown>,
  ): string {
    if (templateCode === 'PASSWORD_RESET_OTP') {
      return `<p>Dear ${payload.userName as string},</p>
<p>We received a request to reset your password. Use the verification code below to continue in the app:</p>
<p><strong style="font-size: 24px; letter-spacing: 4px;">${payload.verificationCode as string}</strong></p>
<p>This code expires in ${payload.expiresInMinutes as number} minutes.</p>
<p>If you did not request this, please ignore this email.</p>
<p>Thank you,<br/>Support Team</p>`;
    }
    if (templateCode === 'UID_RECOVERY_OTP') {
      return `<p>Dear ${payload.userName as string},</p>
<p>We received a request to recover your User ID. Use the verification code below in the app:</p>
<p><strong style="font-size: 24px; letter-spacing: 4px;">${payload.verificationCode as string}</strong></p>
<p>This code expires in ${payload.expiresInMinutes as number} minutes.</p>
<p>Thank you,<br/>Support Team</p>`;
    }
    return '<p>Notification</p>';
  }

  private renderTextTemplate(
    templateCode: string,
    payload: Record<string, unknown>,
  ): string {
    if (templateCode === 'PASSWORD_RESET_OTP') {
      return `Dear ${payload.userName as string},

We received a request to reset your password. Use this verification code in the app: ${payload.verificationCode as string}.

This code expires in ${payload.expiresInMinutes as number} minutes.

If you did not request this, please ignore this email.

Thank you,
Support Team`;
    }
    if (templateCode === 'UID_RECOVERY_OTP') {
      return `Dear ${payload.userName as string},

We received a request to recover your User ID. Use this verification code in the app: ${payload.verificationCode as string}.

This code expires in ${payload.expiresInMinutes as number} minutes.

Thank you,
Support Team`;
    }
    return 'Notification';
  }
}
