import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  AdminDashboardAuditDetailQueryDto,
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
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_OVERVIEW, 'read')
  getOverview(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminDashboardOverviewQueryDto,
  ) {
    return this.adminDashboardService.getOverview(user, query);
  }

  @Get('audit-records')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_AUDIT_OPERATIONS, 'read')
  getAuditRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminDashboardAuditRecordsQueryDto,
  ) {
    return this.adminDashboardService.getAuditRecords(user, query);
  }

  @Get('audit-detail')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_AUDIT_OPERATIONS, 'read')
  getAuditDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdminDashboardAuditDetailQueryDto,
  ) {
    return this.adminDashboardService.getAuditDetail(user, query);
  }
}
