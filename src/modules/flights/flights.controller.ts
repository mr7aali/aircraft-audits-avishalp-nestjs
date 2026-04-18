import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { ListStationFlightsDto } from './dto/list-station-flights.dto.js';
import { FlightsService } from './flights.service.js';

@ApiTags('Flights')
@ApiBearerAuth()
@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Get('active')
  @RequireActiveStation()
  getActiveFlights(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListStationFlightsDto,
  ): Promise<Record<string, unknown>> {
    return this.flightsService.getActiveFlightsForStation(user, query);
  }
}
