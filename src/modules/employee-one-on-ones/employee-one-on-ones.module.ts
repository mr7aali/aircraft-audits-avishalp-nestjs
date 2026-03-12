import { Module } from '@nestjs/common';
import { EmployeeOneOnOnesController } from './employee-one-on-ones.controller.js';
import { EmployeeOneOnOnesService } from './employee-one-on-ones.service.js';

@Module({
  controllers: [EmployeeOneOnOnesController],
  providers: [EmployeeOneOnOnesService],
})
export class EmployeeOneOnOnesModule {}
