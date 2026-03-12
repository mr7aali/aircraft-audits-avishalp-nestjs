import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateCabinQualityAuditDto } from './dto/create-cabin-quality-audit.dto.js';
import { ListCabinQualityAuditsDto } from './dto/list-cabin-quality-audits.dto.js';
import { CabinQualityAuditsService } from './cabin-quality-audits.service.js';

@ApiTags('Cabin Quality Audits')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('cabin-quality-audits')
export class CabinQualityAuditsController {
  constructor(
    private readonly cabinQualityAuditsService: CabinQualityAuditsService,
  ) {}

  @Get()
  @RequirePermission(MODULE_CODES.CABIN_QUALITY_AUDIT, 'list')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCabinQualityAuditsDto,
  ) {
    return this.cabinQualityAuditsService.list(user, query);
  }

  @Get(':id')
  @RequirePermission(MODULE_CODES.CABIN_QUALITY_AUDIT, 'view')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cabinQualityAuditsService.getById(user, id);
  }

  @Post()
  @RequirePermission(MODULE_CODES.CABIN_QUALITY_AUDIT, 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCabinQualityAuditDto,
  ) {
    return this.cabinQualityAuditsService.create(user, dto);
  }
}
