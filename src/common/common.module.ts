import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ShiftContextService } from './services/shift-context.service.js';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ShiftContextService],
  exports: [ShiftContextService],
})
export class CommonModule {}
