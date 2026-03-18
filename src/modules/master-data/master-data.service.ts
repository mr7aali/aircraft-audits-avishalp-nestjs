import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateAircraftTypeDto,
  CreateCleanTypeDto,
  CreateGateDto,
  CreateStationDto,
  UpdateAircraftTypeDto,
  UpdateCleanTypeDto,
  UpdateGateDto,
  UpdateStationDto,
} from './dto/manage-master-data.dto.js';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  getCleanTypes(includeInactive = false) {
    return this.prisma.cleanType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  createCleanType(dto: CreateCleanTypeDto) {
    return this.prisma.cleanType.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCleanType(id: string, dto: UpdateCleanTypeDto) {
    await this.ensureExists('cleanType', id, 'Clean type');
    return this.prisma.cleanType.update({
      where: { id },
      data: {
        ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });
  }

  getAircraftTypes(includeInactive = false) {
    return this.prisma.aircraftType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  createAircraftType(dto: CreateAircraftTypeDto) {
    return this.prisma.aircraftType.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateAircraftType(id: string, dto: UpdateAircraftTypeDto) {
    await this.ensureExists('aircraftType', id, 'Aircraft type');
    return this.prisma.aircraftType.update({
      where: { id },
      data: {
        ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });
  }

  getCabinQualityChecklistItems() {
    return this.prisma.cabinQualityChecklistItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getLavSafetyChecklistItems() {
    return this.prisma.lavSafetyChecklistItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getSecuritySearchAreas() {
    return this.prisma.securitySearchArea.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getStations(includeInactive = false) {
    return this.prisma.station.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ code: 'asc' }],
    });
  }

  createStation(dto: CreateStationDto) {
    return this.prisma.station.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        airportCode: dto.airportCode?.trim().toUpperCase() || null,
        name: dto.name.trim(),
        timezone: dto.timezone.trim(),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateStation(id: string, dto: UpdateStationDto) {
    await this.ensureExists('station', id, 'Station');
    return this.prisma.station.update({
      where: { id },
      data: {
        ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.airportCode != null
          ? { airportCode: dto.airportCode.trim().toUpperCase() || null }
          : {}),
        ...(dto.name != null ? { name: dto.name.trim() } : {}),
        ...(dto.timezone != null ? { timezone: dto.timezone.trim() } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });
  }

  getGates(stationId: string, includeInactive = false) {
    if (!stationId.trim()) {
      throw new BadRequestException('stationId is required');
    }

    return this.prisma.gate.findMany({
      where: {
        stationId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        station: true,
      },
      orderBy: [{ gateCode: 'asc' }],
    });
  }

  async createGate(dto: CreateGateDto) {
    await this.ensureExists('station', dto.stationId, 'Station');
    return this.prisma.gate.create({
      data: {
        stationId: dto.stationId,
        gateCode: dto.gateCode.trim().toUpperCase(),
        name: dto.name?.trim() || null,
        isActive: dto.isActive ?? true,
      },
      include: {
        station: true,
      },
    });
  }

  async updateGate(id: string, dto: UpdateGateDto) {
    await this.ensureExists('gate', id, 'Gate');
    if (dto.stationId) {
      await this.ensureExists('station', dto.stationId, 'Station');
    }

    return this.prisma.gate.update({
      where: { id },
      data: {
        ...(dto.stationId != null ? { stationId: dto.stationId } : {}),
        ...(dto.gateCode != null
          ? { gateCode: dto.gateCode.trim().toUpperCase() }
          : {}),
        ...(dto.name != null ? { name: dto.name.trim() || null } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
      include: {
        station: true,
      },
    });
  }

  private async ensureExists(
    model: 'cleanType' | 'aircraftType' | 'station' | 'gate',
    id: string,
    label: string,
  ) {
    let entity: { id: string } | null = null;

    switch (model) {
      case 'cleanType':
        entity = await this.prisma.cleanType.findUnique({
          where: { id },
          select: { id: true },
        });
        break;
      case 'aircraftType':
        entity = await this.prisma.aircraftType.findUnique({
          where: { id },
          select: { id: true },
        });
        break;
      case 'station':
        entity = await this.prisma.station.findUnique({
          where: { id },
          select: { id: true },
        });
        break;
      case 'gate':
        entity = await this.prisma.gate.findUnique({
          where: { id },
          select: { id: true },
        });
        break;
    }

    if (!entity) {
      throw new NotFoundException(`${label} not found`);
    }
  }
}
