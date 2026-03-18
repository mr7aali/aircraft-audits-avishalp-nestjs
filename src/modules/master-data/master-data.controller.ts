import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import {
  CreateAircraftTypeDto,
  CreateCleanTypeDto,
  CreateGateDto,
  CreateStationDto,
  MasterDataListQueryDto,
  UpdateAircraftTypeDto,
  UpdateCleanTypeDto,
  UpdateGateDto,
  UpdateStationDto,
} from './dto/manage-master-data.dto.js';
import { MasterDataService } from './master-data.service.js';

@ApiTags('Master Data')
@ApiBearerAuth()
@RequireActiveStation()
@Controller('master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get('clean-types')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  getCleanTypes(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getCleanTypes(query.includeInactive);
  }

  @Post('clean-types')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  createCleanType(@Body() dto: CreateCleanTypeDto) {
    return this.masterDataService.createCleanType(dto);
  }

  @Patch('clean-types/:id')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  updateCleanType(@Param('id') id: string, @Body() dto: UpdateCleanTypeDto) {
    return this.masterDataService.updateCleanType(id, dto);
  }

  @Get('aircraft-types')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  getAircraftTypes(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getAircraftTypes(query.includeInactive);
  }

  @Post('aircraft-types')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  createAircraftType(@Body() dto: CreateAircraftTypeDto) {
    return this.masterDataService.createAircraftType(dto);
  }

  @Patch('aircraft-types/:id')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  updateAircraftType(
    @Param('id') id: string,
    @Body() dto: UpdateAircraftTypeDto,
  ) {
    return this.masterDataService.updateAircraftType(id, dto);
  }

  @Get('cabin-quality-checklist-items')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  getCabinQualityChecklistItems() {
    return this.masterDataService.getCabinQualityChecklistItems();
  }

  @Get('lav-safety-checklist-items')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  getLavSafetyChecklistItems() {
    return this.masterDataService.getLavSafetyChecklistItems();
  }

  @Get('security-search-areas')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  getSecuritySearchAreas() {
    return this.masterDataService.getSecuritySearchAreas();
  }

  @Get('stations')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  getStations(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getStations(query.includeInactive);
  }

  @Post('stations')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  createStation(@Body() dto: CreateStationDto) {
    return this.masterDataService.createStation(dto);
  }

  @Patch('stations/:id')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  updateStation(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.masterDataService.updateStation(id, dto);
  }

  @Get('gates')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'list')
  @ApiQuery({ name: 'stationId', required: true })
  getGates(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getGates(
      query.stationId ?? '',
      query.includeInactive,
    );
  }

  @Post('gates')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  createGate(@Body() dto: CreateGateDto) {
    return this.masterDataService.createGate(dto);
  }

  @Patch('gates/:id')
  @RequirePermission(MODULE_CODES.MASTER_DATA, 'create')
  updateGate(@Param('id') id: string, @Body() dto: UpdateGateDto) {
    return this.masterDataService.updateGate(id, dto);
  }
}
