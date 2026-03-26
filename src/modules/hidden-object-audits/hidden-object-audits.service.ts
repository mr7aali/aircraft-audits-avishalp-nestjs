import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client/client.js';
import {
  HiddenObjectAuditStatus,
  HiddenObjectLocationStatus,
  HiddenObjectLocationType,
} from '../../generated/prisma-client/enums.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ShiftContextService } from '../../common/services/shift-context.service.js';
import {
  ConfirmHiddenObjectLocationDto,
  CreateHiddenObjectAuditDto,
} from './dto/create-hidden-object-audit.dto.js';
import { ListHiddenObjectAuditsDto } from './dto/list-hidden-object-audits.dto.js';

type SeatMapSection = {
  name?: unknown;
  areaType?: unknown;
  startRow?: unknown;
  endRow?: unknown;
  leftCols?: unknown;
  rightCols?: unknown;
  skipRows?: unknown;
  amenitiesBefore?: unknown;
  amenitiesAfter?: unknown;
};

type SeatMapAmenity = {
  leftId?: unknown;
  rightId?: unknown;
  customLabel?: unknown;
};

type LocationCandidate = {
  locationCode: string;
  locationLabel: string;
  sectionLabel: string;
  locationType: HiddenObjectLocationType;
};

@Injectable()
export class HiddenObjectAuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftContextService: ShiftContextService,
  ) {}

  async list(user: AuthenticatedUser, query: ListHiddenObjectAuditsDto) {
    const stationId = this.getStationId(user);
    const where: Prisma.HiddenObjectAuditSessionWhereInput = {
      stationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.shipNumber
        ? {
            shipNumberSnapshot: {
              contains: this.normalizeShipNumber(query.shipNumber),
            },
          }
        : {}),
      ...(query.auditorName
        ? {
            auditorNameSnapshot: {
              contains: query.auditorName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.fromDate || query.toDate
        ? {
            sessionAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.hiddenObjectAuditSession.findMany({
        where,
        orderBy: { sessionAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          locations: true,
        },
      }),
      this.prisma.hiddenObjectAuditSession.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => {
        const counts = this.buildStatusCounts(item.locations);
        return {
          id: item.id,
          sessionAt: item.sessionAt,
          auditorName: item.auditorNameSnapshot,
          shipNumber: item.shipNumberSnapshot,
          aircraftTypeName: item.aircraftTypeNameSnapshot,
          status: item.status,
          objectsToHideCount: item.objectsToHideCount,
          counts,
        };
      }),
      total,
      query,
    );
  }

  async getById(user: AuthenticatedUser, id: string) {
    const stationId = this.getStationId(user);
    const session = await this.prisma.hiddenObjectAuditSession.findFirst({
      where: {
        id,
        stationId,
      },
      include: {
        aircraftType: true,
        fleetAircraft: {
          include: {
            aircraftType: true,
          },
        },
        locations: {
          include: {
            files: {
              orderBy: { sortOrder: 'asc' },
            },
          },
          orderBy: [{ sectionLabel: 'asc' }, { locationCode: 'asc' }],
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Hidden object audit not found');
    }

    const counts = this.buildStatusCounts(session.locations);

    return {
      id: session.id,
      sessionAt: session.sessionAt,
      status: session.status,
      setupCompletedAt: session.setupCompletedAt,
      activatedAt: session.activatedAt,
      closedAt: session.closedAt,
      shipNumber: session.shipNumberSnapshot,
      aircraftType: {
        id: session.aircraftTypeId,
        name: session.aircraftTypeNameSnapshot,
        seatMap: session.aircraftType.seatMapJson ?? null,
      },
      fleetAircraft: {
        id: session.fleetAircraft.id,
        shipNumber: session.fleetAircraft.shipNumber,
        displayName: session.fleetAircraft.displayName,
      },
      auditor: {
        name: session.auditorNameSnapshot,
        role: session.auditorRoleSnapshot,
      },
      objectsToHideCount: session.objectsToHideCount,
      counts,
      canActivate:
        session.status === HiddenObjectAuditStatus.SETUP &&
        counts.total > 0 &&
        counts.orange === 0,
      canClose: session.status === HiddenObjectAuditStatus.ACTIVE,
      locations: session.locations.map((location) => ({
        id: location.id,
        locationCode: location.locationCode,
        locationLabel: location.locationLabel,
        sectionLabel: location.sectionLabel,
        locationType: location.locationType,
        status: location.status,
        subLocation: location.subLocation,
        hiddenConfirmedAt: location.hiddenConfirmedAt,
        foundAt: location.foundAt,
        foundByName: location.foundByNameSnapshot,
        photoFileIds: location.files.map((entry) => entry.fileId),
        subLocationOptions: this.getSubLocationOptions(
          location.locationType,
          location.locationCode,
        ),
      })),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateHiddenObjectAuditDto) {
    const stationId = this.getStationId(user);
    const shipNumber = this.normalizeShipNumber(dto.shipNumber);
    const resolvedShiftOccurrenceId =
      dto.shiftOccurrenceId ??
      (await this.shiftContextService.resolveCurrentShiftOccurrenceId(stationId));

    const [stationAccess, fleetAircraft, aircraftType] = await Promise.all([
      this.prisma.userStationAccess.findUnique({
        where: {
          userId_stationId: {
            userId: user.id,
            stationId,
          },
        },
        include: {
          role: true,
          user: true,
        },
      }),
      this.prisma.fleetAircraft.findFirst({
        where: {
          shipNumber,
          isActive: true,
        },
        include: {
          aircraftType: true,
        },
      }),
      this.prisma.aircraftType.findFirst({
        where: {
          id: dto.aircraftTypeId,
          isActive: true,
        },
      }),
    ]);

    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }
    if (!fleetAircraft) {
      throw new BadRequestException('Ship number is not registered in the fleet registry');
    }
    if (!aircraftType) {
      throw new BadRequestException('Selected aircraft type is not available');
    }
    if (fleetAircraft.aircraftTypeId !== aircraftType.id) {
      throw new BadRequestException(
        'Selected aircraft type does not match the fleet registry for this ship number',
      );
    }

    const candidates = this.extractLocationCandidates(aircraftType.seatMapJson);
    if (dto.numberOfObjectsToHide > candidates.length) {
      throw new BadRequestException(
        `Only ${candidates.length} hide locations are available for the selected aircraft type`,
      );
    }

    const selectedLocations = this.pickRandomCandidates(
      candidates,
      dto.numberOfObjectsToHide,
    );

    const created = await this.prisma.$transaction(async (tx) => {
      const session = await tx.hiddenObjectAuditSession.create({
        data: {
          stationId,
          shiftOccurrenceId: resolvedShiftOccurrenceId,
          auditorUserId: user.id,
          auditorNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
          auditorRoleSnapshot: stationAccess.role.name,
          aircraftTypeId: aircraftType.id,
          aircraftTypeNameSnapshot: aircraftType.name,
          fleetAircraftId: fleetAircraft.id,
          shipNumberSnapshot: fleetAircraft.shipNumber,
          objectsToHideCount: dto.numberOfObjectsToHide,
          status: HiddenObjectAuditStatus.SETUP,
        },
      });

      await tx.hiddenObjectAuditLocation.createMany({
        data: selectedLocations.map((location) => ({
          sessionId: session.id,
          locationCode: location.locationCode,
          locationLabel: location.locationLabel,
          sectionLabel: location.sectionLabel,
          locationType: location.locationType,
          status: HiddenObjectLocationStatus.ORANGE,
        })),
      });

      return session;
    });

    return this.getById(user, created.id);
  }

  async confirmLocation(
    user: AuthenticatedUser,
    sessionId: string,
    locationId: string,
    dto: ConfirmHiddenObjectLocationDto,
  ) {
    const stationId = this.getStationId(user);

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.hiddenObjectAuditSession.findFirst({
        where: {
          id: sessionId,
          stationId,
        },
        include: {
          locations: {
            where: { id: locationId },
          },
        },
      });

      if (!session) {
        throw new NotFoundException('Hidden object audit not found');
      }
      if (session.status !== HiddenObjectAuditStatus.SETUP) {
        throw new BadRequestException(
          'Locations can only be confirmed while the audit is in setup',
        );
      }

      const location = session.locations[0];
      if (!location) {
        throw new NotFoundException('Hidden object location not found');
      }
      if (
        location.status !== HiddenObjectLocationStatus.ORANGE &&
        location.status !== HiddenObjectLocationStatus.BLUE
      ) {
        throw new BadRequestException(
          'This location is already finalized and cannot be updated',
        );
      }

      await this.assertFilesExist(tx, dto.photoFileIds);

      await tx.hiddenObjectAuditLocation.update({
        where: { id: location.id },
        data: {
          subLocation: dto.subLocation.trim(),
          status: HiddenObjectLocationStatus.BLUE,
          hiddenConfirmedAt: new Date(),
        },
      });

      await tx.hiddenObjectAuditLocationFile.deleteMany({
        where: { locationId: location.id },
      });

      await tx.hiddenObjectAuditLocationFile.createMany({
        data: dto.photoFileIds.map((fileId, index) => ({
          locationId: location.id,
          fileId,
          sortOrder: index,
        })),
      });
    });

    return this.getById(user, sessionId);
  }

  async activate(user: AuthenticatedUser, sessionId: string) {
    const stationId = this.getStationId(user);
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.hiddenObjectAuditSession.findFirst({
        where: {
          id: sessionId,
          stationId,
        },
        include: {
          locations: true,
        },
      });

      if (!session) {
        throw new NotFoundException('Hidden object audit not found');
      }
      if (session.status !== HiddenObjectAuditStatus.SETUP) {
        throw new BadRequestException('Only setup audits can be activated');
      }
      if (!session.locations.length) {
        throw new BadRequestException('No hide locations were generated for this audit');
      }
      if (
        session.locations.some(
          (location) => location.status !== HiddenObjectLocationStatus.BLUE,
        )
      ) {
        throw new BadRequestException(
          'Every designated location must be confirmed with a photo before activation',
        );
      }

      const now = new Date();
      await tx.hiddenObjectAuditSession.update({
        where: { id: session.id },
        data: {
          status: HiddenObjectAuditStatus.ACTIVE,
          setupCompletedAt: session.setupCompletedAt ?? now,
          activatedAt: now,
        },
      });
    });

    return this.getById(user, sessionId);
  }

  async markFound(
    user: AuthenticatedUser,
    sessionId: string,
    locationId: string,
  ) {
    const stationId = this.getStationId(user);

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.hiddenObjectAuditSession.findFirst({
        where: {
          id: sessionId,
          stationId,
        },
        include: {
          locations: {
            where: { id: locationId },
          },
        },
      });

      if (!session) {
        throw new NotFoundException('Hidden object audit not found');
      }
      if (session.status !== HiddenObjectAuditStatus.ACTIVE) {
        throw new BadRequestException('Only active audits can be updated as found');
      }

      const location = session.locations[0];
      if (!location) {
        throw new NotFoundException('Hidden object location not found');
      }
      if (location.status === HiddenObjectLocationStatus.GREEN) {
        return;
      }
      if (location.status === HiddenObjectLocationStatus.RED) {
        throw new BadRequestException('This location is already finalized as not found');
      }
      if (location.status !== HiddenObjectLocationStatus.BLUE) {
        throw new BadRequestException('This location is not ready to be marked as found');
      }

      const userRecord = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          firstName: true,
          lastName: true,
        },
      });

      await tx.hiddenObjectAuditLocation.update({
        where: { id: location.id },
        data: {
          status: HiddenObjectLocationStatus.GREEN,
          foundAt: new Date(),
          foundByUserId: user.id,
          foundByNameSnapshot: userRecord
            ? `${userRecord.firstName} ${userRecord.lastName}`
            : undefined,
        },
      });
    });

    return this.getById(user, sessionId);
  }

  async close(user: AuthenticatedUser, sessionId: string) {
    const stationId = this.getStationId(user);

    await this.prisma.$transaction(async (tx) => {
      const session = await tx.hiddenObjectAuditSession.findFirst({
        where: {
          id: sessionId,
          stationId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!session) {
        throw new NotFoundException('Hidden object audit not found');
      }
      if (session.status !== HiddenObjectAuditStatus.ACTIVE) {
        throw new BadRequestException('Only active audits can be closed');
      }

      await tx.hiddenObjectAuditLocation.updateMany({
        where: {
          sessionId: session.id,
          status: HiddenObjectLocationStatus.BLUE,
        },
        data: {
          status: HiddenObjectLocationStatus.RED,
        },
      });

      await tx.hiddenObjectAuditSession.update({
        where: { id: session.id },
        data: {
          status: HiddenObjectAuditStatus.CLOSED,
          closedAt: new Date(),
        },
      });
    });

    return this.getById(user, sessionId);
  }

  private getStationId(user: AuthenticatedUser) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    return user.activeStationId;
  }

  private normalizeShipNumber(value: string) {
    return value.trim().toUpperCase();
  }

  private buildStatusCounts(
    locations: Array<{ status: HiddenObjectLocationStatus }>,
  ) {
    return {
      total: locations.length,
      orange: locations.filter(
        (location) => location.status === HiddenObjectLocationStatus.ORANGE,
      ).length,
      blue: locations.filter(
        (location) => location.status === HiddenObjectLocationStatus.BLUE,
      ).length,
      green: locations.filter(
        (location) => location.status === HiddenObjectLocationStatus.GREEN,
      ).length,
      red: locations.filter(
        (location) => location.status === HiddenObjectLocationStatus.RED,
      ).length,
    };
  }

  private getSubLocationOptions(
    type: HiddenObjectLocationType,
    locationCode: string,
  ) {
    const normalizedCode = locationCode.trim().toLowerCase();

    switch (type) {
      case HiddenObjectLocationType.SEAT:
        return [
          'Under Seat',
          'Seat Pocket',
          'Overhead Bin',
          'Armrest',
          'Tray Table',
          'Seat Cushion',
        ];
      case HiddenObjectLocationType.GALLEY:
        return [
          'Drawer',
          'Storage Compartment',
          'Equipment Bay',
          'Service Cart Slot',
          'Counter Panel',
        ];
      case HiddenObjectLocationType.LAV:
        return [
          'Under Sink',
          'Trash Slot',
          'Mirror Cabinet',
          'Shelf',
          'Counter Edge',
        ];
      case HiddenObjectLocationType.JUMP_SEAT:
        return [
          'Seat Cushion',
          'Seat Pocket',
          'Under Seat',
          'Side Compartment',
        ];
      case HiddenObjectLocationType.ZONE:
      default:
        if (normalizedCode.includes('closet')) {
          return [
            'Upper Shelf',
            'Lower Shelf',
            'Door Pocket',
            'Floor Area',
          ];
        }
        return [
          'General Storage Area',
          'Panel Space',
          'Shelf',
          'Compartment',
        ];
    }
  }

  private async assertFilesExist(
    tx: Prisma.TransactionClient,
    fileIds: string[],
  ) {
    const uniqueFileIds = [...new Set(fileIds)];
    const files = await tx.file.findMany({
      where: {
        id: { in: uniqueFileIds },
      },
      select: { id: true },
    });

    if (files.length !== uniqueFileIds.length) {
      throw new BadRequestException('One or more uploaded photos could not be found');
    }
  }

  private pickRandomCandidates(
    candidates: LocationCandidate[],
    count: number,
  ) {
    const shuffled = [...candidates];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [
        shuffled[swapIndex],
        shuffled[index],
      ];
    }
    return shuffled.slice(0, count);
  }

  private extractLocationCandidates(seatMapJson: Prisma.JsonValue | null) {
    if (!seatMapJson || typeof seatMapJson !== 'object' || Array.isArray(seatMapJson)) {
      throw new BadRequestException(
        'The selected aircraft type does not have a valid seat map configuration',
      );
    }

    const rawSections = Array.isArray((seatMapJson as Record<string, unknown>).sections)
      ? ((seatMapJson as Record<string, unknown>).sections as SeatMapSection[])
      : [];

    if (!rawSections.length) {
      throw new BadRequestException(
        'The selected aircraft type does not have any configured hide locations',
      );
    }

    const candidates: LocationCandidate[] = [];
    const seen = new Set<string>();

    for (const rawSection of rawSections) {
      const sectionLabel =
        this.asString(rawSection.name) ||
        this.deriveSectionLabelFromAreaType(this.asString(rawSection.areaType)) ||
        'Cabin Section';
      const startRow = this.asInt(rawSection.startRow);
      const endRow = this.asInt(rawSection.endRow);
      const leftCols = this.asStringList(rawSection.leftCols);
      const rightCols = this.asStringList(rawSection.rightCols);
      const skipRows = new Set(this.asIntList(rawSection.skipRows));

      this.appendAmenityCandidates(
        rawSection.amenitiesBefore,
        sectionLabel,
        candidates,
        seen,
      );

      const hasSeatRows =
        startRow != null &&
        endRow != null &&
        startRow > 0 &&
        endRow >= startRow &&
        (leftCols.length > 0 || rightCols.length > 0);

      if (hasSeatRows) {
        for (let row = startRow; row <= endRow; row += 1) {
          if (skipRows.has(row)) {
            continue;
          }

          for (const col of [...leftCols, ...rightCols]) {
            this.pushCandidate(
              {
                locationCode: `${row}${col}`,
                locationLabel: `Seat ${row}${col}`,
                sectionLabel,
                locationType: HiddenObjectLocationType.SEAT,
              },
              candidates,
              seen,
            );
          }
        }
      }

      this.appendAmenityCandidates(
        rawSection.amenitiesAfter,
        sectionLabel,
        candidates,
        seen,
      );
    }

    if (!candidates.length) {
      throw new BadRequestException(
        'The selected aircraft type does not expose any selectable hide locations',
      );
    }

    return candidates;
  }

  private appendAmenityCandidates(
    rawAmenities: unknown,
    fallbackSectionLabel: string,
    candidates: LocationCandidate[],
    seen: Set<string>,
  ) {
    if (!Array.isArray(rawAmenities)) {
      return;
    }

    for (const rawAmenity of rawAmenities as SeatMapAmenity[]) {
      const locationIds = [
        this.asString(rawAmenity.leftId),
        this.asString(rawAmenity.rightId),
        this.asString(rawAmenity.customLabel),
      ].filter((value): value is string => Boolean(value));

      for (const locationCode of locationIds) {
        const locationType = this.inferLocationType(locationCode);
        this.pushCandidate(
          {
            locationCode,
            locationLabel: this.formatZoneLabel(locationCode),
            sectionLabel:
              this.deriveAmenitySectionLabel(locationCode) || fallbackSectionLabel,
            locationType,
          },
          candidates,
          seen,
        );
      }
    }
  }

  private pushCandidate(
    candidate: LocationCandidate,
    candidates: LocationCandidate[],
    seen: Set<string>,
  ) {
    const key = candidate.locationCode.trim().toUpperCase();
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    candidates.push(candidate);
  }

  private inferLocationType(locationCode: string) {
    if (/^\d+[A-Z]+$/i.test(locationCode.trim())) {
      return HiddenObjectLocationType.SEAT;
    }

    const normalized = locationCode.trim().toLowerCase();
    if (normalized.includes('galley')) {
      return HiddenObjectLocationType.GALLEY;
    }
    if (normalized.includes('lav')) {
      return HiddenObjectLocationType.LAV;
    }
    if (normalized.includes('jump')) {
      return HiddenObjectLocationType.JUMP_SEAT;
    }
    return HiddenObjectLocationType.ZONE;
  }

  private deriveSectionLabelFromAreaType(areaType?: string | null) {
    switch ((areaType ?? '').trim().toLowerCase()) {
      case 'first_class':
        return 'First Class';
      case 'comfort':
        return 'Comfort+';
      case 'main_cabin':
        return 'Main Cabin';
      default:
        return null;
    }
  }

  private deriveAmenitySectionLabel(locationCode: string) {
    const normalized = locationCode.trim().toLowerCase();
    if (normalized.includes('galley')) {
      return normalized.includes('aft')
        ? 'Rear Galley'
        : normalized.includes('fwd')
          ? 'Front Galley'
          : 'Galley';
    }
    if (normalized.includes('lav')) {
      if (normalized.includes('aft')) {
        return 'Aft Lav';
      }
      if (normalized.includes('mid')) {
        return 'Mid Lav';
      }
      if (normalized.includes('fwd')) {
        return 'Forward Lav';
      }
      return 'Lav';
    }
    return null;
  }

  private formatZoneLabel(locationCode: string) {
    return locationCode
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private asString(value: unknown) {
    const normalized = value?.toString().trim();
    return normalized ? normalized : null;
  }

  private asStringList(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as string[];
    }

    return value
      .map((entry) => entry?.toString().trim().toUpperCase())
      .filter((entry): entry is string => Boolean(entry));
  }

  private asInt(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value.trim(), 10);
      return Number.isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private asIntList(value: unknown) {
    if (!Array.isArray(value)) {
      return [] as number[];
    }

    return value
      .map((entry) => this.asInt(entry))
      .filter((entry): entry is number => entry != null);
  }
}

