import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  AccessControlListQueryDto,
  AssignUserRoleDto,
  CreateAccessUserDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './dto/access-control.dto.js';
import { AccessControlService } from './access-control.service.js';

@ApiTags('Access Control')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('access-control')
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('roles')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'read')
  listRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AccessControlListQueryDto,
  ) {
    return this.accessControlService.listRoles(user, query.search);
  }

  @Post('roles')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'write')
  createRole(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.accessControlService.createRole(dto, user);
  }

  @Patch('roles/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'edit')
  updateRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.accessControlService.updateRole(id, dto, user);
  }

  @Get('users')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'read')
  listUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AccessControlListQueryDto,
  ) {
    return this.accessControlService.listUsers(user, query.search);
  }

  @Post('users')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'write')
  createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAccessUserDto,
  ) {
    return this.accessControlService.createUser(dto, user);
  }

  @Patch('users/:id/role')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'edit')
  assignUserRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AssignUserRoleDto,
  ) {
    return this.accessControlService.assignUserRole(user, id, dto.roleId);
  }

  @Get('modules')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'read')
  listModules(@Query() query: AccessControlListQueryDto) {
    return this.accessControlService.listModules(query.systemType);
  }

  @Get('roles/:id/permissions')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'read')
  getRolePermissions(
    @Param('id') id: string,
    @Query() query: AccessControlListQueryDto,
  ) {
    return this.accessControlService.getRolePermissions(id, query.systemType);
  }

  @Put('roles/:id/permissions')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT, 'edit')
  updateRolePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.accessControlService.updateRolePermissions(id, dto, user);
  }
}
