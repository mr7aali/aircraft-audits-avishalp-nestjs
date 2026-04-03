import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { MODULE_CODES } from '../../common/constants/module-codes.js';
import { RequireActiveStation } from '../../common/decorators/require-active-station.decorator.js';
import { RequirePermission } from '../../common/decorators/require-permission.decorator.js';
import {
  CreateAircraftTypeDto,
  CreateCleanTypeDto,
  CreateFleetAircraftDto,
  CreateGateDto,
  CreateLavSafetyChecklistItemDto,
  CreateStationDto,
  MasterDataListQueryDto,
  UpdateAircraftSeatMapDto,
  UpdateAircraftTypeDto,
  UpdateCleanTypeDto,
  UpdateFleetAircraftDto,
  UpdateGateDto,
  UpdateLavSafetyChecklistItemDto,
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
  getCleanTypes(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getCleanTypes(query.includeInactive);
  }

  @Post('clean-types')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'write')
  createCleanType(@Body() dto: CreateCleanTypeDto) {
    return this.masterDataService.createCleanType(dto);
  }

  @Patch('clean-types/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateCleanType(@Param('id') id: string, @Body() dto: UpdateCleanTypeDto) {
    return this.masterDataService.updateCleanType(id, dto);
  }

  @Delete('clean-types/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'delete')
  deleteCleanType(@Param('id') id: string) {
    return this.masterDataService.deleteCleanType(id);
  }

  @Get('aircraft-types')
  getAircraftTypes(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getAircraftTypes(query.includeInactive);
  }

  @Get('fleet-aircraft')
  getFleetAircraft(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getFleetAircraft(query.includeInactive);
  }

  @Post('aircraft-types')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'write')
  createAircraftType(@Body() dto: CreateAircraftTypeDto) {
    return this.masterDataService.createAircraftType(dto);
  }

  @Patch('aircraft-types/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateAircraftType(
    @Param('id') id: string,
    @Body() dto: UpdateAircraftTypeDto,
  ) {
    return this.masterDataService.updateAircraftType(id, dto);
  }

  @Delete('aircraft-types/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'delete')
  deleteAircraftType(@Param('id') id: string) {
    return this.masterDataService.deleteAircraftType(id);
  }

  @Post('fleet-aircraft')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'write')
  createFleetAircraft(@Body() dto: CreateFleetAircraftDto) {
    return this.masterDataService.createFleetAircraft(dto);
  }

  @Patch('fleet-aircraft/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateFleetAircraft(
    @Param('id') id: string,
    @Body() dto: UpdateFleetAircraftDto,
  ) {
    return this.masterDataService.updateFleetAircraft(id, dto);
  }

  @Delete('fleet-aircraft/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'delete')
  deleteFleetAircraft(@Param('id') id: string) {
    return this.masterDataService.deleteFleetAircraft(id);
  }

  @Patch('aircraft-types/:id/seat-map')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateAircraftSeatMap(
    @Param('id') id: string,
    @Body() dto: UpdateAircraftSeatMapDto,
  ) {
    return this.masterDataService.updateAircraftSeatMap(id, dto);
  }

  @Get('cabin-quality-checklist-items')
  getCabinQualityChecklistItems() {
    return this.masterDataService.getCabinQualityChecklistItems();
  }

  @Get('lav-safety-checklist-items')
  getLavSafetyChecklistItems(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getLavSafetyChecklistItems(
      query.includeInactive,
    );
  }

  @Post('lav-safety-checklist-items')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'write')
  createLavSafetyChecklistItem(@Body() dto: CreateLavSafetyChecklistItemDto) {
    return this.masterDataService.createLavSafetyChecklistItem(dto);
  }

  @Patch('lav-safety-checklist-items/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateLavSafetyChecklistItem(
    @Param('id') id: string,
    @Body() dto: UpdateLavSafetyChecklistItemDto,
  ) {
    return this.masterDataService.updateLavSafetyChecklistItem(id, dto);
  }

  @Delete('lav-safety-checklist-items/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'delete')
  deleteLavSafetyChecklistItem(@Param('id') id: string) {
    return this.masterDataService.deleteLavSafetyChecklistItem(id);
  }

  @Get('security-search-areas')
  getSecuritySearchAreas() {
    return this.masterDataService.getSecuritySearchAreas();
  }

  @Get('stations')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'read')
  getStations(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getStations(query.includeInactive);
  }

  @Post('stations')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'write')
  createStation(@Body() dto: CreateStationDto) {
    return this.masterDataService.createStation(dto);
  }

  @Patch('stations/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateStation(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.masterDataService.updateStation(id, dto);
  }

  @Delete('stations/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'delete')
  deleteStation(@Param('id') id: string) {
    return this.masterDataService.deleteStation(id);
  }

  @Get('gates')
  @ApiQuery({ name: 'stationId', required: true })
  getGates(@Query() query: MasterDataListQueryDto) {
    return this.masterDataService.getGates(
      query.stationId ?? '',
      query.includeInactive,
    );
  }

  @Post('gates')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'write')
  createGate(@Body() dto: CreateGateDto) {
    return this.masterDataService.createGate(dto);
  }

  @Patch('gates/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'edit')
  updateGate(@Param('id') id: string, @Body() dto: UpdateGateDto) {
    return this.masterDataService.updateGate(id, dto);
  }

  @Delete('gates/:id')
  @RequirePermission(MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA, 'delete')
  deleteGate(@Param('id') id: string) {
    return this.masterDataService.deleteGate(id);
  }
}
