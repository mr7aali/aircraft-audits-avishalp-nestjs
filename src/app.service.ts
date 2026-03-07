import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Template for NestJS + Prisma + Auth';
  }
}
