import { Module } from '@nestjs/common';
import { DynamicFormsController } from './dynamic-forms.controller.js';
import { DynamicFormsService } from './dynamic-forms.service.js';

@Module({
  controllers: [DynamicFormsController],
  providers: [DynamicFormsService],
})
export class DynamicFormsModule {}
