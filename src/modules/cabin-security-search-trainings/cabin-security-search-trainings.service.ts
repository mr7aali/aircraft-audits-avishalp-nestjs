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
  PassFail,
} from '../../generated/prisma-client/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateCabinSecuritySearchTrainingDto } from './dto/create-cabin-security-search-training.dto.js';
import { ListCabinSecuritySearchTrainingsDto } from './dto/list-cabin-security-search-trainings.dto.js';
import { ShiftContextService } from '../../common/services/shift-context.service.js';
import { randomUUID } from 'crypto';

type ResolvedSecuritySearchArea = {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

type ResolvedAreaEntry = {
  area: ResolvedSecuritySearchArea;
  result: CreateCabinSecuritySearchTrainingDto['areaResults'][number];
};

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

type HiddenObjectLocationCandidate = {
  locationCode: string;
  locationLabel: string;
  sectionLabel: string;
  locationType: HiddenObjectLocationType;
};

@Injectable()
export class CabinSecuritySearchTrainingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftContextService: ShiftContextService,
  ) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateCabinSecuritySearchTrainingDto,
  ) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const normalizedShipNumber = this.normalizeShipNumber(dto.shipNumber);

    const resolvedShiftOccurrenceId =
      dto.shiftOccurrenceId ??
      (await this.shiftContextService.resolveCurrentShiftOccurrenceId(
        user.activeStationId,
      ));

    const [stationAccess, gate, areas, hiddenObjectAudit] = await Promise.all([
      this.prisma.userStationAccess.findUnique({
        where: {
          userId_stationId: {
            userId: user.id,
            stationId: user.activeStationId,
          },
        },
        include: { role: true, user: true },
      }),
      this.prisma.gate.findUnique({ where: { id: dto.gateId } }),
      this.prisma.securitySearchArea.findMany({
        where: { isActive: true },
      }),
      dto.hiddenObjectAuditId
        ? this.prisma.hiddenObjectAuditSession.findFirst({
            where: {
              id: dto.hiddenObjectAuditId,
              stationId: user.activeStationId,
            },
            select: {
              id: true,
              status: true,
              shipNumberSnapshot: true,
              aircraftType: {
                select: {
                  seatMapJson: true,
                },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }
    if (!gate || gate.stationId !== user.activeStationId) {
      throw new BadRequestException('Invalid gate for active station');
    }
    if (hiddenObjectAudit) {
      if (hiddenObjectAudit.status !== HiddenObjectAuditStatus.ACTIVE) {
        throw new BadRequestException(
          'The linked hidden object audit is not active',
        );
      }
      if (
        this.normalizeShipNumber(hiddenObjectAudit.shipNumberSnapshot) !==
        normalizedShipNumber
      ) {
        throw new BadRequestException(
          'The linked hidden object audit does not match the selected ship number',
        );
      }
    } else if (dto.hiddenObjectAuditId) {
      throw new BadRequestException('Linked hidden object audit was not found');
    }
    const uniqueAreaKeys = new Set(
      dto.areaResults.map((item) =>
        item.areaId
          ? `id:${item.areaId}`
          : `label:${item.areaLabel?.trim().toLowerCase()}`,
      ),
    );
    if (uniqueAreaKeys.size !== dto.areaResults.length) {
      throw new BadRequestException('Duplicate areas are not allowed');
    }

    const overallResult = dto.areaResults.some(
      (entry) => entry.result === PassFail.FAIL,
    )
      ? PassFail.FAIL
      : PassFail.PASS;

    const training = await this.prisma.$transaction(async (tx) => {
      const detailedResultsJson =
        dto.detailedAreaResults == null
          ? undefined
          : (dto.detailedAreaResults.map((area) => ({
              areaId: area.areaId.trim(),
              sectionLabel: area.sectionLabel.trim(),
              imageFileIds: area.imageFileIds ?? [],
              checkItems: area.checkItems.map((checkItem) => ({
                itemName: checkItem.itemName.trim(),
                status: checkItem.status,
                imageFileIds: checkItem.imageFileIds ?? [],
                hashtags: (checkItem.hashtags ?? [])
                  .map((tag) => tag.trim())
                  .filter((tag) => tag.length > 0),
              })),
            })) as Prisma.InputJsonValue);

      const knownAreasById = new Map(areas.map((area) => [area.id, area]));
      const knownAreasByLabel = new Map(
        areas.map((area) => [area.label.trim().toLowerCase(), area]),
      );
      const resolvedAreaEntries: ResolvedAreaEntry[] = [];
      const now = new Date();

      for (const result of dto.areaResults) {
        const area = await this.resolveAreaForResult(
          tx,
          result,
          knownAreasById,
          knownAreasByLabel,
        );
        resolvedAreaEntries.push({ area, result });
      }

      const created = await tx.cabinSecuritySearchTraining.create({
        data: {
          stationId: user.activeStationId!,
          shiftOccurrenceId: resolvedShiftOccurrenceId,
          gateId: dto.gateId,
          auditorUserId: user.id,
          auditorNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
          auditorRoleSnapshot: stationAccess.role.name,
          gateCodeSnapshot: gate.gateCode,
          shipNumber: dto.shipNumber,
          detailedResultsJson,
          otherFindings: dto.otherFindings,
          additionalNotes: dto.additionalNotes,
          overallResult,
          status: 'SUBMITTED',
        },
      });

      for (const entry of resolvedAreaEntries) {
        const createdResult = await tx.cabinSecuritySearchTrainingResult.create(
          {
            data: {
              trainingId: created.id,
              areaId: entry.area.id,
              areaLabelSnapshot: entry.area.label,
              result: entry.result.result,
            },
          },
        );
        if (entry.result.imageFileIds?.length) {
          await tx.cabinSecuritySearchTrainingResultFile.createMany({
            data: entry.result.imageFileIds.map((fileId, index) => ({
              resultId: createdResult.id,
              fileId,
              sortOrder: index,
            })),
          });
        }
      }

      if (dto.generalPictureFileIds?.length) {
        await tx.cabinSecuritySearchTrainingFile.createMany({
          data: dto.generalPictureFileIds.map((fileId, index) => ({
            trainingId: created.id,
            fileId,
            sortOrder: index,
          })),
        });
      }

      if (hiddenObjectAudit) {
        const activeLocations = await tx.hiddenObjectAuditLocation.findMany({
          where: {
            sessionId: hiddenObjectAudit.id,
            status: HiddenObjectLocationStatus.BLUE,
          },
          select: {
            id: true,
            locationCode: true,
            locationLabel: true,
            sectionLabel: true,
            locationType: true,
          },
        });

        const locationIds = activeLocations.map((location) => location.id);
        const uniqueLocationIds = new Set(
          (dto.hiddenObjectLocationResults ?? []).map(
            (entry) => entry.locationId,
          ),
        );

        if (!locationIds.length) {
          throw new BadRequestException(
            'The linked hidden object audit does not have any active locations to search',
          );
        }
        if (!uniqueLocationIds.size) {
          throw new BadRequestException(
            'Hidden object search results are required for the linked audit',
          );
        }
        if (
          uniqueLocationIds.size !==
          (dto.hiddenObjectLocationResults ?? []).length
        ) {
          throw new BadRequestException(
            'Duplicate hidden object search results are not allowed',
          );
        }
        if (uniqueLocationIds.size !== locationIds.length) {
          throw new BadRequestException(
            'Every active hidden object location must be included in the cabin security search results',
          );
        }

        const missingLocationId = Array.from(uniqueLocationIds).find(
          (locationId) => !locationIds.includes(locationId),
        );
        if (missingLocationId) {
          throw new BadRequestException(
            'One or more hidden object locations do not belong to the linked audit',
          );
        }

        const foundLocationIds = (dto.hiddenObjectLocationResults ?? [])
          .filter((entry) => entry.found)
          .map((entry) => entry.locationId);

        if (foundLocationIds.length) {
          const updated = await tx.hiddenObjectAuditLocation.updateMany({
            where: {
              sessionId: hiddenObjectAudit.id,
              id: { in: foundLocationIds },
              status: HiddenObjectLocationStatus.BLUE,
            },
            data: {
              status: HiddenObjectLocationStatus.GREEN,
              foundAt: now,
              foundByUserId: user.id,
              foundByNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
            },
          });

          if (updated.count !== foundLocationIds.length) {
            throw new BadRequestException(
              'Unable to update all linked hidden object locations as found',
            );
          }
        }

        const activeAreaNames = new Set(
          activeLocations.map((location) =>
            this.normalizeAreaLabel(this.buildHiddenObjectAreaName(location)),
          ),
        );
        const activeLocationCodes = new Set(
          activeLocations.map((location) =>
            location.locationCode.trim().toUpperCase(),
          ),
        );
        const candidateByAreaName =
          this.buildHiddenObjectCandidateMapByAreaName(
            hiddenObjectAudit.aircraftType?.seatMapJson ?? null,
          );
        const unexpectedFoundEntries = resolvedAreaEntries.filter((entry) => {
          if (entry.result.result !== PassFail.PASS) {
            return false;
          }

          const normalizedAreaName = this.normalizeAreaLabel(entry.area.label);
          if (activeAreaNames.has(normalizedAreaName)) {
            return false;
          }

          const candidate = candidateByAreaName.get(normalizedAreaName);
          if (!candidate) {
            return false;
          }

          return !activeLocationCodes.has(
            candidate.locationCode.trim().toUpperCase(),
          );
        });

        for (const entry of unexpectedFoundEntries) {
          const candidate = candidateByAreaName.get(
            this.normalizeAreaLabel(entry.area.label),
          );
          if (!candidate) {
            continue;
          }

          const createdLocation = await tx.hiddenObjectAuditLocation.create({
            data: {
              sessionId: hiddenObjectAudit.id,
              locationCode: candidate.locationCode,
              locationLabel: candidate.locationLabel,
              sectionLabel: candidate.sectionLabel,
              locationType: candidate.locationType,
              status: HiddenObjectLocationStatus.PURPLE,
              foundAt: now,
              foundByUserId: user.id,
              foundByNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
            },
            select: {
              id: true,
            },
          });

          if (entry.result.imageFileIds?.length) {
            await tx.hiddenObjectAuditLocationFile.createMany({
              data: entry.result.imageFileIds.map((fileId, index) => ({
                locationId: createdLocation.id,
                fileId,
                sortOrder: index,
              })),
            });
          }
        }

        await tx.hiddenObjectAuditLocation.updateMany({
          where: {
            sessionId: hiddenObjectAudit.id,
            status: HiddenObjectLocationStatus.BLUE,
          },
          data: {
            status: HiddenObjectLocationStatus.RED,
          },
        });

        await tx.hiddenObjectAuditSession.update({
          where: { id: hiddenObjectAudit.id },
          data: {
            status: HiddenObjectAuditStatus.CLOSED,
            closedAt: now,
          },
        });
      }

      return created;
    });

    return this.getById(user, training.id);
  }

  async list(
    user: AuthenticatedUser,
    query: ListCabinSecuritySearchTrainingsDto,
  ) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const selectedResults = this.normalizeSelectedResults(query);
    const where: Prisma.CabinSecuritySearchTrainingWhereInput = {
      stationId: user.activeStationId,
      auditorUserId: user.id,
      ...(query.fromDate || query.toDate
        ? {
            trainingAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
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
      ...(selectedResults.length === 1
        ? { overallResult: selectedResults[0] }
        : {}),
      ...(query.gateId ? { gateId: query.gateId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.cabinSecuritySearchTraining.findMany({
        where,
        orderBy: { trainingAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          files: {
            include: { file: true },
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
        },
      }),
      this.prisma.cabinSecuritySearchTraining.count({ where }),
    ]);
    return buildPaginatedResult(
      items.map((item) => ({
        id: item.id,
        trainingAt: item.trainingAt,
        auditorName: item.auditorNameSnapshot,
        gateCode: item.gateCodeSnapshot,
        overallResult: item.overallResult,
        thumbnails: item.files.map((entry) => entry.fileId),
      })),
      total,
      query,
    );
  }

  async getById(user: AuthenticatedUser, id: string) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const training = await this.prisma.cabinSecuritySearchTraining.findFirst({
      where: {
        id,
        stationId: user.activeStationId,
        auditorUserId: user.id,
      },
      include: {
        results: {
          include: {
            area: true,
            files: { include: { file: true }, orderBy: { sortOrder: 'asc' } },
          },
        },
        files: {
          include: { file: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!training) {
      throw new NotFoundException('Cabin security search training not found');
    }
    return training;
  }

  private normalizeSelectedResults(query: ListCabinSecuritySearchTrainingsDto) {
    const values = new Set(
      [
        ...(query.results ?? []),
        ...(query.result ? [query.result] : []),
      ].filter(Boolean),
    );
    return Array.from(values);
  }

  private async resolveAreaForResult(
    tx: Prisma.TransactionClient,
    result: CreateCabinSecuritySearchTrainingDto['areaResults'][number],
    knownAreasById: Map<string, ResolvedSecuritySearchArea>,
    knownAreasByLabel: Map<string, ResolvedSecuritySearchArea>,
  ) {
    if (result.areaId) {
      const matched = knownAreasById.get(result.areaId);
      if (!matched) {
        throw new BadRequestException('Invalid selected area');
      }
      return matched;
    }

    const label = result.areaLabel?.trim();
    if (!label) {
      throw new BadRequestException(
        'Each area result must include areaId or areaLabel',
      );
    }

    const existing = knownAreasByLabel.get(label.toLowerCase());
    if (existing) {
      return existing;
    }

    const sortOrder = knownAreasByLabel.size + 1;
    const created = await tx.securitySearchArea.create({
      data: {
        code: this.buildAreaCode(label),
        label,
        sortOrder,
        isActive: true,
      },
    });

    knownAreasById.set(created.id, created);
    knownAreasByLabel.set(created.label.toLowerCase(), created);

    return created;
  }

  private buildAreaCode(label: string): string {
    const baseCode = label
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 50);

    return `${baseCode || 'AREA'}_${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private normalizeShipNumber(value: string): string {
    return value.trim().toUpperCase();
  }

  private normalizeAreaLabel(value: string): string {
    return value.trim().toLowerCase();
  }

  private buildHiddenObjectCandidateMapByAreaName(
    seatMapJson: Prisma.JsonValue | null,
  ) {
    const candidates = this.extractHiddenObjectCandidates(seatMapJson);
    return new Map(
      candidates.map((candidate) => [
        this.normalizeAreaLabel(this.buildHiddenObjectAreaName(candidate)),
        candidate,
      ]),
    );
  }

  private buildHiddenObjectAreaName(location: {
    locationCode: string;
    locationLabel: string;
    sectionLabel: string;
  }) {
    const locationCode = location.locationCode.trim();
    const upperLocationCode = locationCode.toUpperCase();

    const isSeatMapAddressable =
      /^\d+[A-Z]+$/i.test(locationCode) ||
      upperLocationCode.startsWith('LAV') ||
      upperLocationCode.startsWith('GALLEY') ||
      upperLocationCode.startsWith('JUMP SEAT') ||
      upperLocationCode === 'CLOSET';

    if (isSeatMapAddressable) {
      if (/^\d+[A-Z]+$/i.test(locationCode)) {
        return `Seat ${upperLocationCode}`;
      }

      return this.buildCabinSecurityAreaLabel(locationCode);
    }

    return location.locationLabel.trim() || location.sectionLabel.trim();
  }

  private buildCabinSecurityAreaLabel(locationCode: string) {
    const upperLocationCode = locationCode.trim().toUpperCase();

    if (upperLocationCode.startsWith('LAV') || upperLocationCode === 'CLOSET') {
      if (upperLocationCode.includes('FWD')) {
        return 'FWD LAV';
      }
      if (upperLocationCode.includes('MID L')) {
        return 'MID LAV L';
      }
      if (upperLocationCode.includes('MID R')) {
        return 'MID LAV R';
      }
      if (upperLocationCode.includes('AFT L')) {
        return 'AFT LAV L';
      }
      if (upperLocationCode.includes('AFT R')) {
        return 'AFT LAV R';
      }
      return locationCode.trim();
    }

    if (upperLocationCode.startsWith('GALLEY')) {
      return upperLocationCode.includes('FWD') ? 'Front Galley' : 'Rear Galley';
    }

    return locationCode.trim();
  }

  private extractHiddenObjectCandidates(seatMapJson: Prisma.JsonValue | null) {
    if (
      !seatMapJson ||
      typeof seatMapJson !== 'object' ||
      Array.isArray(seatMapJson)
    ) {
      return [] as HiddenObjectLocationCandidate[];
    }

    const rawSections = Array.isArray(
      (seatMapJson as Record<string, unknown>).sections,
    )
      ? ((seatMapJson as Record<string, unknown>).sections as SeatMapSection[])
      : [];
    if (!rawSections.length) {
      return [] as HiddenObjectLocationCandidate[];
    }

    const candidates: HiddenObjectLocationCandidate[] = [];
    const seen = new Set<string>();

    for (const rawSection of rawSections) {
      const sectionLabel =
        this.asString(rawSection.name) ||
        this.deriveSectionLabelFromAreaType(
          this.asString(rawSection.areaType),
        ) ||
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
            this.pushHiddenObjectCandidate(
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

    return candidates;
  }

  private appendAmenityCandidates(
    rawAmenities: unknown,
    fallbackSectionLabel: string,
    candidates: HiddenObjectLocationCandidate[],
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
        const locationType = this.inferHiddenObjectLocationType(locationCode);
        this.pushHiddenObjectCandidate(
          {
            locationCode,
            locationLabel: this.formatZoneLabel(locationCode),
            sectionLabel:
              this.deriveAmenitySectionLabel(locationCode) ||
              fallbackSectionLabel,
            locationType,
          },
          candidates,
          seen,
        );
      }
    }
  }

  private pushHiddenObjectCandidate(
    candidate: HiddenObjectLocationCandidate,
    candidates: HiddenObjectLocationCandidate[],
    seen: Set<string>,
  ) {
    const key = candidate.locationCode.trim().toUpperCase();
    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    candidates.push(candidate);
  }

  private inferHiddenObjectLocationType(locationCode: string) {
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
    return locationCode.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
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

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : null;
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
