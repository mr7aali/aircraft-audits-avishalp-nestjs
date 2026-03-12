import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
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
  @RequirePermission(MODULE_CODES.CABIN_SECURITY_SEARCH_TRAINING, 'list')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCabinSecuritySearchTrainingsDto,
  ) {
    return this.cabinSecuritySearchTrainingsService.list(user, query);
  }

  @Get(':id')
  @RequirePermission(MODULE_CODES.CABIN_SECURITY_SEARCH_TRAINING, 'view')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.cabinSecuritySearchTrainingsService.getById(user, id);
  }

  @Post()
  @RequirePermission(MODULE_CODES.CABIN_SECURITY_SEARCH_TRAINING, 'create')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCabinSecuritySearchTrainingDto,
  ) {
    return this.cabinSecuritySearchTrainingsService.create(user, dto);
  }
}
