import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service.js';

@ApiTags('Master Data')
@ApiBearerAuth()
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('clean-types')
  getCleanTypes() {
    return this.masterDataService.getCleanTypes();
  }

  @Get('cabin-quality-checklist-items')
  getCabinQualityChecklistItems() {
    return this.masterDataService.getCabinQualityChecklistItems();
  }

  @Get('lav-safety-checklist-items')
  getLavSafetyChecklistItems() {
    return this.masterDataService.getLavSafetyChecklistItems();
  }

  @Get('security-search-areas')
  getSecuritySearchAreas() {
    return this.masterDataService.getSecuritySearchAreas();
  }

  @Get('gates')
  @ApiQuery({ name: 'stationId', required: true })
  getGates(@Query('stationId') stationId: string) {
    return this.masterDataService.getGates(stationId);
  }
}
