import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateLavSafetyObservationDto } from './dto/create-lav-safety-observation.dto.js';
import { ListLavSafetyObservationsDto } from './dto/list-lav-safety-observations.dto.js';
import { LavSafetyObservationsService } from './lav-safety-observations.service.js';

@ApiTags('LAV Safety Observations')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('lav-safety-observations')
export class LavSafetyObservationsController {
  constructor(
    private readonly lavSafetyObservationsService: LavSafetyObservationsService,
  ) {}

  @Get()
  @RequirePermission(MODULE_CODES.LAV_SAFETY_OBSERVATION, 'list')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLavSafetyObservationsDto,
  ) {
    return this.lavSafetyObservationsService.list(user, query);
  }

  @Get(':id')
  @RequirePermission(MODULE_CODES.LAV_SAFETY_OBSERVATION, 'view')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.lavSafetyObservationsService.getById(user, id);
  }

  @Post()
  @RequirePermission(MODULE_CODES.LAV_SAFETY_OBSERVATION, 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLavSafetyObservationDto,
  ) {
    return this.lavSafetyObservationsService.create(user, dto);
  }
}
