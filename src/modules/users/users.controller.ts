import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('employees')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @RequireActiveStation()
  @ApiQuery({ name: 'q', required: true })
  async search(@Query('q') q: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.searchEmployees(
      q,
      user.activeStationId ?? undefined,
    );
  }
}
