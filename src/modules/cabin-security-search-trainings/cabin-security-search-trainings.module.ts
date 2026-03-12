import { Module } from '@nestjs/common';
import { CabinSecuritySearchTrainingsController } from './cabin-security-search-trainings.controller.js';
import { CabinSecuritySearchTrainingsService } from './cabin-security-search-trainings.service.js';

@Module({
  controllers: [CabinSecuritySearchTrainingsController],
  providers: [CabinSecuritySearchTrainingsService],
})
export class CabinSecuritySearchTrainingsModule {}
