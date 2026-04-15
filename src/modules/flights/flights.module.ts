import { Module } from '@nestjs/common';
import { FlightsController } from './flights.controller.js';
import { FlightsService } from './flights.service.js';

@Module({
  controllers: [FlightsController],
  providers: [FlightsService],
})
export class FlightsModule {}
