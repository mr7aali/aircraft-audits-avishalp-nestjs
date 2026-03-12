import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  live() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  async ready() {
    const checks: Record<string, string> = {};
    await this.prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';

    const redisEnabled = this.configService.get<boolean>('redis.enabled', {
      infer: true,
    });
    if (redisEnabled) {
      const RedisModule = await import('ioredis');
      const RedisCtor = RedisModule.default as unknown as new (
        options: Record<string, unknown>,
      ) => {
        ping: () => Promise<string>;
        disconnect: () => void;
      };

      const redis = new RedisCtor({
        host: this.configService.get<string>('redis.host', { infer: true }),
        port: this.configService.get<number>('redis.port', { infer: true }),
        password:
          this.configService.get<string>('redis.password', { infer: true }) ||
          undefined,
        maxRetriesPerRequest: 1,
      });
      try {
        const pong = await redis.ping();
        checks.redis = pong === 'PONG' ? 'ok' : 'failed';
      } finally {
        redis.disconnect();
      }
    } else {
      checks.redis = 'disabled';
    }

    return {
      status: Object.values(checks).every(
        (entry) => entry === 'ok' || entry === 'disabled',
      )
        ? 'ok'
        : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}
