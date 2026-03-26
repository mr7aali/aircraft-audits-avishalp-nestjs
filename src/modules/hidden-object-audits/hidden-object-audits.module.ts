import { Module } from '@nestjs/common';
import { HiddenObjectAuditsController } from './hidden-object-audits.controller.js';
import { HiddenObjectAuditsService } from './hidden-object-audits.service.js';

@Module({
  controllers: [HiddenObjectAuditsController],
  providers: [HiddenObjectAuditsService],
})
export class HiddenObjectAuditsModule {}
