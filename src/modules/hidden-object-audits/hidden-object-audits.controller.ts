import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  ConfirmHiddenObjectLocationDto,
  CreateHiddenObjectAuditDto,
} from './dto/create-hidden-object-audit.dto.js';
import { ListHiddenObjectAuditsDto } from './dto/list-hidden-object-audits.dto.js';
import { HiddenObjectAuditsService } from './hidden-object-audits.service.js';

@ApiTags('Hidden Object Audits')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('hidden-object-audits')
export class HiddenObjectAuditsController {
  constructor(
    private readonly hiddenObjectAuditsService: HiddenObjectAuditsService,
  ) {}

  @Get()
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'list')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListHiddenObjectAuditsDto,
  ) {
    return this.hiddenObjectAuditsService.list(user, query);
  }

  @Get(':id')
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'view')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hiddenObjectAuditsService.getById(user, id);
  }

  @Post()
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHiddenObjectAuditDto,
  ) {
    return this.hiddenObjectAuditsService.create(user, dto);
  }

  @Post(':id/locations/:locationId/confirm')
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'create')
  confirmLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() dto: ConfirmHiddenObjectLocationDto,
  ) {
    return this.hiddenObjectAuditsService.confirmLocation(
      user,
      id,
      locationId,
      dto,
    );
  }

  @Post(':id/activate')
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'create')
  activate(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hiddenObjectAuditsService.activate(user, id);
  }

  @Post(':id/locations/:locationId/found')
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'create')
  markFound(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    return this.hiddenObjectAuditsService.markFound(user, id, locationId);
  }

  @Post(':id/close')
  @RequirePermission(MODULE_CODES.HIDDEN_OBJECT_AUDIT, 'create')
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.hiddenObjectAuditsService.close(user, id);
  }
}
