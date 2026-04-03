import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateAircraftTypeDto,
  AircraftSeatMapDto,
  CreateCleanTypeDto,
  CreateFleetAircraftDto,
  CreateGateDto,
  CreateLavSafetyChecklistItemDto,
  CreateStationDto,
  UpdateAircraftSeatMapDto,
  UpdateAircraftTypeDto,
  UpdateCleanTypeDto,
  UpdateFleetAircraftDto,
  UpdateGateDto,
  UpdateLavSafetyChecklistItemDto,
  UpdateStationDto,
} from './dto/manage-master-data.dto.js';

const defaultCabinQualityAreaWeights = {
  lav: 25,
  galley: 20,
  main_cabin: 18,
  first_class: 15,
  comfort: 12,
  other: 10,
} as const;

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

  async deleteCleanType(id: string) {
    await this.ensureExists('cleanType', id, 'Clean type');
    return this.deleteWithReferenceGuard('Clean type', () =>
      this.prisma.cleanType.delete({
        where: { id },
      }),
    );
  }

  getAircraftTypes(includeInactive = false) {
    return this.prisma.aircraftType
      .findMany({
        where: includeInactive ? undefined : { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      })
      .then((records) =>
        records.map((record) => this.mapAircraftTypeRecord(record)),
      );
  }

  createAircraftType(dto: CreateAircraftTypeDto) {
    return this.prisma.aircraftType
      .create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          sortOrder: dto.sortOrder ?? 0,
          isActive: dto.isActive ?? true,
        },
      })
      .then((record) => this.mapAircraftTypeRecord(record));
  }

  getFleetAircraft(includeInactive = false) {
    return this.prisma.fleetAircraft.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        aircraftType: true,
      },
      orderBy: [{ shipNumber: 'asc' }],
    });
  }

  async updateAircraftType(id: string, dto: UpdateAircraftTypeDto) {
    await this.ensureExists('aircraftType', id, 'Aircraft type');
    return this.prisma.aircraftType
      .update({
        where: { id },
        data: {
          ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
          ...(dto.name != null ? { name: dto.name.trim() } : {}),
          ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
        },
      })
      .then((record) => this.mapAircraftTypeRecord(record));
  }

  async createFleetAircraft(dto: CreateFleetAircraftDto) {
    await this.ensureExists(
      'aircraftType',
      dto.aircraftTypeId,
      'Aircraft type',
    );
    return this.prisma.fleetAircraft.create({
      data: {
        shipNumber: this.normalizeShipNumber(dto.shipNumber),
        displayName: dto.displayName?.trim() || null,
        aircraftTypeId: dto.aircraftTypeId,
        isActive: dto.isActive ?? true,
      },
      include: {
        aircraftType: true,
      },
    });
  }

  async updateFleetAircraft(id: string, dto: UpdateFleetAircraftDto) {
    await this.ensureExists('fleetAircraft', id, 'Fleet aircraft');
    if (dto.aircraftTypeId) {
      await this.ensureExists(
        'aircraftType',
        dto.aircraftTypeId,
        'Aircraft type',
      );
    }

    return this.prisma.fleetAircraft.update({
      where: { id },
      data: {
        ...(dto.shipNumber != null
          ? { shipNumber: this.normalizeShipNumber(dto.shipNumber) }
          : {}),
        ...(dto.displayName != null
          ? { displayName: dto.displayName.trim() || null }
          : {}),
        ...(dto.aircraftTypeId != null
          ? { aircraftTypeId: dto.aircraftTypeId }
          : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
      include: {
        aircraftType: true,
      },
    });
  }

  async deleteAircraftType(id: string) {
    await this.ensureExists('aircraftType', id, 'Aircraft type');
    return this.deleteWithReferenceGuard('Aircraft type', () =>
      this.prisma.aircraftType
        .delete({
          where: { id },
        })
        .then((record) => this.mapAircraftTypeRecord(record)),
    );
  }

  async deleteFleetAircraft(id: string) {
    await this.ensureExists('fleetAircraft', id, 'Fleet aircraft');
    return this.deleteWithReferenceGuard('Fleet aircraft', () =>
      this.prisma.fleetAircraft.delete({
        where: { id },
      }),
    );
  }

  async updateAircraftSeatMap(id: string, dto: UpdateAircraftSeatMapDto) {
    await this.ensureExists('aircraftType', id, 'Aircraft type');
    this.validateAircraftSeatMap(dto.seatMap);

    return this.prisma.aircraftType
      .update({
        where: { id },
        data: {
          seatMapJson: this.normalizeAircraftSeatMap(dto.seatMap),
        },
      })
      .then((record) => this.mapAircraftTypeRecord(record));
  }

  getCabinQualityChecklistItems() {
    return this.prisma.cabinQualityChecklistItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getLavSafetyChecklistItems(includeInactive = false) {
    return this.prisma.lavSafetyChecklistItem.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  createLavSafetyChecklistItem(dto: CreateLavSafetyChecklistItemDto) {
    return this.prisma.lavSafetyChecklistItem.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        label: dto.label.trim(),
        description: dto.description?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateLavSafetyChecklistItem(
    id: string,
    dto: UpdateLavSafetyChecklistItemDto,
  ) {
    await this.ensureExists(
      'lavSafetyChecklistItem',
      id,
      'LAV safety checklist item',
    );
    return this.prisma.lavSafetyChecklistItem.update({
      where: { id },
      data: {
        ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.label != null ? { label: dto.label.trim() } : {}),
        ...(dto.description != null
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.sortOrder != null ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive != null ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteLavSafetyChecklistItem(id: string) {
    await this.ensureExists(
      'lavSafetyChecklistItem',
      id,
      'LAV safety checklist item',
    );

    const existingResponses =
      await this.prisma.lavSafetyObservationResponse.count({
        where: { checklistItemId: id },
      });

    if (existingResponses > 0) {
      return this.prisma.lavSafetyChecklistItem.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.deleteWithReferenceGuard('LAV safety checklist item', () =>
      this.prisma.lavSafetyChecklistItem.delete({
        where: { id },
      }),
    );
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

  async deleteStation(id: string) {
    await this.ensureExists('station', id, 'Station');
    return this.deleteWithReferenceGuard('Station', () =>
      this.prisma.station.delete({
        where: { id },
      }),
    );
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

  async deleteGate(id: string) {
    await this.ensureExists('gate', id, 'Gate');
    return this.deleteWithReferenceGuard('Gate', () =>
      this.prisma.gate.delete({
        where: { id },
      }),
    );
  }

  private async ensureExists(
    model:
      | 'cleanType'
      | 'aircraftType'
      | 'fleetAircraft'
      | 'station'
      | 'gate'
      | 'lavSafetyChecklistItem',
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
      case 'fleetAircraft':
        entity = await this.prisma.fleetAircraft.findUnique({
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
      case 'lavSafetyChecklistItem':
        entity = await this.prisma.lavSafetyChecklistItem.findUnique({
          where: { id },
          select: { id: true },
        });
        break;
    }

    if (!entity) {
      throw new NotFoundException(`${label} not found`);
    }
  }

  private async deleteWithReferenceGuard<T>(
    label: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        throw new ConflictException(
          `${label} cannot be deleted because it is currently in use.`,
        );
      }

      throw error;
    }
  }

  private mapAircraftTypeRecord<
    T extends {
      seatMapJson?: Prisma.JsonValue | null;
    },
  >(record: T) {
    const { seatMapJson, ...rest } = record;
    return {
      ...rest,
      seatMap: seatMapJson ?? null,
    };
  }

  private normalizeShipNumber(value: string) {
    return value.trim().toUpperCase();
  }

  private validateAircraftSeatMap(seatMap: AircraftSeatMapDto) {
    seatMap.sections.forEach((section, sectionIndex) => {
      if (section.endRow < section.startRow) {
        throw new BadRequestException(
          `Section ${sectionIndex + 1} must end after it starts`,
        );
      }

      this.validateAircraftSeatMapAmenities(
        section.amenitiesBefore,
        `Section ${sectionIndex + 1} pre-row amenities`,
      );
      this.validateAircraftSeatMapAmenities(
        section.amenitiesAfter,
        `Section ${sectionIndex + 1} post-row amenities`,
      );
    });
  }

  private validateAircraftSeatMapAmenities(
    amenities:
      | {
          leftSvg?: string;
          leftId?: string;
          rightSvg?: string;
          rightId?: string;
          customLabel?: string;
          centerOnly?: boolean;
        }[]
      | undefined,
    label: string,
  ) {
    if (!amenities?.length) {
      return;
    }

    amenities.forEach((amenity, amenityIndex) => {
      const hasLeftSvg = amenity.leftSvg?.trim().length;
      const hasLeftId = amenity.leftId?.trim().length;
      const hasRightSvg = amenity.rightSvg?.trim().length;
      const hasRightId = amenity.rightId?.trim().length;
      const hasCustomLabel = amenity.customLabel?.trim().length;

      if (Boolean(hasLeftSvg) !== Boolean(hasLeftId)) {
        throw new BadRequestException(
          `${label} row ${amenityIndex + 1} must include both left icon and left id`,
        );
      }

      if (Boolean(hasRightSvg) !== Boolean(hasRightId)) {
        throw new BadRequestException(
          `${label} row ${amenityIndex + 1} must include both right icon and right id`,
        );
      }

      if (!hasLeftSvg && !hasRightSvg && !hasCustomLabel) {
        throw new BadRequestException(
          `${label} row ${amenityIndex + 1} must define at least one amenity or custom label`,
        );
      }
    });
  }

  private normalizeAircraftSeatMap(
    seatMap: AircraftSeatMapDto,
  ): Prisma.InputJsonValue {
    const areaWeights = {
      ...defaultCabinQualityAreaWeights,
      ...(seatMap.areaWeights ?? {}),
    };

    return {
      hasFirstClassArc: seatMap.hasFirstClassArc ?? false,
      areaWeights,
      sections: seatMap.sections.map((section) => ({
        name: section.name.trim(),
        startRow: section.startRow,
        endRow: section.endRow,
        leftCols: section.leftCols
          .map((column) => column.trim().toUpperCase())
          .filter((column) => column.length > 0),
        rightCols: section.rightCols
          .map((column) => column.trim().toUpperCase())
          .filter((column) => column.length > 0),
        areaType: section.areaType ?? 'main_cabin',
        hasExitBefore: section.hasExitBefore ?? false,
        hasExitAfter: section.hasExitAfter ?? false,
        ...(section.amenitiesBefore?.length
          ? {
              amenitiesBefore: section.amenitiesBefore.map((amenity) =>
                this.normalizeAircraftSeatMapAmenity(amenity),
              ),
            }
          : {}),
        ...(section.amenitiesAfter?.length
          ? {
              amenitiesAfter: section.amenitiesAfter.map((amenity) =>
                this.normalizeAircraftSeatMapAmenity(amenity),
              ),
            }
          : {}),
        ...(section.skipRows?.length
          ? {
              skipRows: [...new Set(section.skipRows)].sort((a, b) => a - b),
            }
          : {}),
      })),
    };
  }

  private normalizeAircraftSeatMapAmenity(amenity: {
    leftSvg?: string;
    leftId?: string;
    rightSvg?: string;
    rightId?: string;
    customLabel?: string;
    centerOnly?: boolean;
  }) {
    return {
      ...(amenity.leftSvg?.trim() && amenity.leftId?.trim()
        ? {
            leftSvg: amenity.leftSvg.trim(),
            leftId: amenity.leftId.trim(),
          }
        : {}),
      ...(amenity.rightSvg?.trim() && amenity.rightId?.trim()
        ? {
            rightSvg: amenity.rightSvg.trim(),
            rightId: amenity.rightId.trim(),
          }
        : {}),
      ...(amenity.customLabel?.trim()
        ? { customLabel: amenity.customLabel.trim() }
        : {}),
      ...(amenity.centerOnly ? { centerOnly: true } : {}),
    };
  }
}
