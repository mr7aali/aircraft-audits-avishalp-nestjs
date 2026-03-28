import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
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
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListLavSafetyObservationsDto,
  ) {
    return this.lavSafetyObservationsService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.lavSafetyObservationsService.getById(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLavSafetyObservationDto,
  ) {
    return this.lavSafetyObservationsService.create(user, dto);
  }
}
