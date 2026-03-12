import { SetMetadata } from '@nestjs/common';
import { REQUIRE_ACTIVE_STATION_KEY } from '../constants/auth.constants.js';

export const RequireActiveStation = () =>
  SetMetadata(REQUIRE_ACTIVE_STATION_KEY, true);
