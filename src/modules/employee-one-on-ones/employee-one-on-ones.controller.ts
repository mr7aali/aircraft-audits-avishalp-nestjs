import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateEmployeeOneOnOneDto } from './dto/create-employee-one-on-one.dto.js';
import { ListEmployeeOneOnOnesDto } from './dto/list-employee-one-on-ones.dto.js';
import { EmployeeOneOnOnesService } from './employee-one-on-ones.service.js';

@ApiTags('Employee 1:1')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('employee-one-on-ones')
export class EmployeeOneOnOnesController {
  constructor(
    private readonly employeeOneOnOnesService: EmployeeOneOnOnesService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEmployeeOneOnOnesDto,
  ) {
    return this.employeeOneOnOnesService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.employeeOneOnOnesService.getById(user, id);
  }

  @Post()
  @RequirePermission(MODULE_CODES.EMPLOYEE_ONE_ON_ONE, 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeOneOnOneDto,
  ) {
    return this.employeeOneOnOnesService.create(user, dto);
  }
}
