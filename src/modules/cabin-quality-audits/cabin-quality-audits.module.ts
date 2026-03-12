import { Module } from '@nestjs/common';
import { CabinQualityAuditsController } from './cabin-quality-audits.controller.js';
import { CabinQualityAuditsService } from './cabin-quality-audits.service.js';

@Module({
  controllers: [CabinQualityAuditsController],
  providers: [CabinQualityAuditsService],
})
export class CabinQualityAuditsModule {}
