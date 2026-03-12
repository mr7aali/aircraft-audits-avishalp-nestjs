import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StationsService } from './stations.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { SelectStationDto } from './dto/select-station.dto.js';

@ApiTags('Stations')
@ApiBearerAuth()
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get('my')
  async getMyStations(@CurrentUser() user: AuthenticatedUser) {
    return this.stationsService.getMyStations(user);
  }

  @Post('select')
  async selectStation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelectStationDto,
  ) {
    return this.stationsService.selectStation(user, dto.stationId);
  }

  @Get('active')
  async getActiveStation(@CurrentUser() user: AuthenticatedUser) {
    return this.stationsService.getActiveStation(user);
  }
}
