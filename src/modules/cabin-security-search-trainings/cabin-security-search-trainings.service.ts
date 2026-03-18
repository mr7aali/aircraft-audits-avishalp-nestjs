import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PassFail } from '../../generated/prisma/enums.js';
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

    const resolvedShiftOccurrenceId =
      dto.shiftOccurrenceId ??
      (await this.shiftContextService.resolveCurrentShiftOccurrenceId(
        user.activeStationId,
      ));

    const [stationAccess, gate, areas] = await Promise.all([
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
    ]);

    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }
    if (!gate || gate.stationId !== user.activeStationId) {
      throw new BadRequestException('Invalid gate for active station');
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
}
