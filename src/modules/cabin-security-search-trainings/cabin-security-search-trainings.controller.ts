import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { CreateCabinSecuritySearchTrainingDto } from './dto/create-cabin-security-search-training.dto.js';
import { ListCabinSecuritySearchTrainingsDto } from './dto/list-cabin-security-search-trainings.dto.js';
import { CabinSecuritySearchTrainingsService } from './cabin-security-search-trainings.service.js';

@ApiTags('Cabin Security Search Trainings')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('cabin-security-search-trainings')
export class CabinSecuritySearchTrainingsController {
  constructor(
    private readonly cabinSecuritySearchTrainingsService: CabinSecuritySearchTrainingsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCabinSecuritySearchTrainingsDto,
  ) {
    return this.cabinSecuritySearchTrainingsService.list(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cabinSecuritySearchTrainingsService.getById(user, id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCabinSecuritySearchTrainingDto,
  ) {
    return this.cabinSecuritySearchTrainingsService.create(user, dto);
  }
}
