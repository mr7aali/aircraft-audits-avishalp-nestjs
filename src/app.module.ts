import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AccessTokenGuard } from './common/guards/access-token.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { StationsModule } from './modules/stations/stations.module.js';
import { MasterDataModule } from './modules/master-data/master-data.module.js';
import { FilesModule } from './modules/files/files.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CabinQualityAuditsModule } from './modules/cabin-quality-audits/cabin-quality-audits.module.js';
import { LavSafetyObservationsModule } from './modules/lav-safety-observations/lav-safety-observations.module.js';
import { CabinSecuritySearchTrainingsModule } from './modules/cabin-security-search-trainings/cabin-security-search-trainings.module.js';
import { EndOfShiftReportsModule } from './modules/end-of-shift-reports/end-of-shift-reports.module.js';
import { EmployeeOneOnOnesModule } from './modules/employee-one-on-ones/employee-one-on-ones.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { CommonModule } from './common/common.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction =
          configService.get<string>('nodeEnv', { infer: true }) ===
          'production';

        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
                    singleLine: false,
                    ignore: 'pid,hostname',
                  },
                },
            customLogLevel: (_req, res, err) => {
              if (err || res.statusCode >= 500) {
                return 'error';
              }
              if (res.statusCode >= 400) {
                return 'warn';
              }
              return 'info';
            },
            customSuccessMessage: (req, res) =>
              `${req.method} ${req.url} completed ${res.statusCode}`,
            customErrorMessage: (req, res, err) =>
              `${req.method} ${req.url} failed ${res.statusCode}${
                err?.message ? `: ${err.message}` : ''
              }`,
            serializers: {
              req: (req) => ({
                method: req.method,
                url: req.url,
                params: req.params,
                query: req.query,
                remoteAddress: req.socket?.remoteAddress,
                remotePort: req.socket?.remotePort,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
              err: (err) => ({
                type: err.name,
                message: err.message,
                stack: err.stack,
              }),
            },
          },
        };
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host', { infer: true }),
          port: configService.get<number>('redis.port', { infer: true }),
          password:
            configService.get<string>('redis.password', { infer: true }) ||
            undefined,
        },
      }),
    }),
    CommonModule,
    PrismaModule,
    AuthModule,
    StationsModule,
    MasterDataModule,
    FilesModule,
    NotificationsModule,
    HealthModule,
    UsersModule,
    CabinQualityAuditsModule,
    LavSafetyObservationsModule,
    CabinSecuritySearchTrainingsModule,
    EndOfShiftReportsModule,
    EmployeeOneOnOnesModule,
    FeedbackModule,
    ChatModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
