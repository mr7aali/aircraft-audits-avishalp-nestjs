import { Module } from '@nestjs/common';
import { StationsService } from './stations.service.js';
import { StationsController } from './stations.controller.js';

@Module({
  providers: [StationsService],
  controllers: [StationsController],
  exports: [StationsService],
})
export class StationsModule {}
