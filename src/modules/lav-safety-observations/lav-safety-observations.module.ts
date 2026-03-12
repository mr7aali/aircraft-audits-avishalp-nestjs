import { Module } from '@nestjs/common';
import { LavSafetyObservationsController } from './lav-safety-observations.controller.js';
import { LavSafetyObservationsService } from './lav-safety-observations.service.js';

@Module({
  controllers: [LavSafetyObservationsController],
  providers: [LavSafetyObservationsService],
})
export class LavSafetyObservationsModule {}
