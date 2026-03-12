import { Module } from '@nestjs/common';
import { EndOfShiftReportsController } from './end-of-shift-reports.controller.js';
import { EndOfShiftReportsService } from './end-of-shift-reports.service.js';

@Module({
  controllers: [EndOfShiftReportsController],
  providers: [EndOfShiftReportsService],
})
export class EndOfShiftReportsModule {}
