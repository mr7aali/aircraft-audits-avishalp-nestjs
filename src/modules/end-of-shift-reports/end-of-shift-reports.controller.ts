import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateEndOfShiftReportDto } from './dto/create-end-of-shift-report.dto.js';
import { ListEndOfShiftReportsDto } from './dto/list-end-of-shift-reports.dto.js';
import { EndOfShiftReportsService } from './end-of-shift-reports.service.js';

@ApiTags('End Of Shift Reports')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('end-of-shift-reports')
export class EndOfShiftReportsController {
  constructor(
    private readonly endOfShiftReportsService: EndOfShiftReportsService,
  ) {}

  @Get()
  @RequirePermission(MODULE_CODES.END_OF_SHIFT_REPORT, 'list')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListEndOfShiftReportsDto,
  ) {
    return this.endOfShiftReportsService.list(user, query);
  }

  @Get(':id')
  @RequirePermission(MODULE_CODES.END_OF_SHIFT_REPORT, 'view')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.endOfShiftReportsService.getById(user, id);
  }

  @Post()
  @RequirePermission(MODULE_CODES.END_OF_SHIFT_REPORT, 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEndOfShiftReportDto,
  ) {
    return this.endOfShiftReportsService.create(user, dto);
  }
}
