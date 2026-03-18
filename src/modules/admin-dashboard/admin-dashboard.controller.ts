import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  AdminDashboardAuditRecordsQueryDto,
  AdminDashboardOverviewQueryDto,
} from './dto/admin-dashboard-query.dto.js';
import { AdminDashboardService } from './admin-dashboard.service.js';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('admin-dashboard')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminDashboardOverviewQueryDto,
  ) {
    return this.adminDashboardService.getOverview(user, query);
  }

  @Get('audit-records')
  getAuditRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminDashboardAuditRecordsQueryDto,
  ) {
    return this.adminDashboardService.getAuditRecords(user, query);
  }
}
