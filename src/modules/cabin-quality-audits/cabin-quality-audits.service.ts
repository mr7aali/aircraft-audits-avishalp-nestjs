import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateCabinQualityAuditDto } from './dto/create-cabin-quality-audit.dto.js';
import { ListCabinQualityAuditsDto } from './dto/list-cabin-quality-audits.dto.js';
import { ShiftContextService } from '../../common/services/shift-context.service.js';

@Injectable()
export class CabinQualityAuditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftContextService: ShiftContextService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateCabinQualityAuditDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const resolvedShiftOccurrenceId =
      dto.shiftOccurrenceId ??
      (await this.shiftContextService.resolveCurrentShiftOccurrenceId(
        user.activeStationId,
      ));

    const [stationAccess, gate, cleanType, checklistItems] = await Promise.all([
      this.prisma.userStationAccess.findUnique({
        where: {
          userId_stationId: {
            userId: user.id,
            stationId: user.activeStationId,
          },
        },
        include: { role: true, station: true, user: true },
      }),
      this.prisma.gate.findUnique({ where: { id: dto.gateId } }),
      this.prisma.cleanType.findUnique({ where: { id: dto.cleanTypeId } }),
      this.prisma.cabinQualityChecklistItem.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }
    if (!gate || gate.stationId !== user.activeStationId) {
      throw new BadRequestException('Invalid gate for active station');
    }
    if (!cleanType || !cleanType.isActive) {
      throw new BadRequestException('Invalid clean type');
    }

    const expectedChecklistIds = new Set(checklistItems.map((item) => item.id));
    if (dto.responses.length !== checklistItems.length) {
      throw new BadRequestException(
        `Checklist requires ${checklistItems.length} responses`,
      );
    }
    const uniqueResponseItemIds = new Set(
      dto.responses.map((item) => item.checklistItemId),
    );
    if (uniqueResponseItemIds.size !== dto.responses.length) {
      throw new BadRequestException(
        'Duplicate checklist item responses are not allowed',
      );
    }
    for (const response of dto.responses) {
      if (!expectedChecklistIds.has(response.checklistItemId)) {
        throw new BadRequestException('Invalid checklist item in response');
      }
    }

    const audit = await this.prisma.$transaction(async (tx) => {
      const detailedResultsJson =
        dto.areaResults == null
          ? undefined
          : (dto.areaResults.map((area) => ({
              areaId: area.areaId.trim(),
              sectionLabel: area.sectionLabel.trim(),
              checkItems: area.checkItems.map((checkItem) => ({
                itemName: checkItem.itemName.trim(),
                status: checkItem.status,
                imageFileIds: checkItem.imageFileIds ?? [],
                hashtags: (checkItem.hashtags ?? [])
                  .map((tag) => tag.trim())
                  .filter((tag) => tag.length > 0),
              })),
            })) as Prisma.InputJsonValue);

      const created = await tx.cabinQualityAudit.create({
        data: {
          stationId: user.activeStationId!,
          shiftOccurrenceId: resolvedShiftOccurrenceId,
          gateId: gate.id,
          cleanTypeId: cleanType.id,
          auditorUserId: user.id,
          auditorNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
          auditorRoleSnapshot: stationAccess.role.name,
          gateCodeSnapshot: gate.gateCode,
          cleanTypeSnapshot: cleanType.name,
          detailedResultsJson,
          otherFindings: dto.otherFindings,
          additionalNotes: this.buildStoredAdditionalNotes(dto),
          signatureFileId: dto.signatureFileId,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      for (const response of dto.responses) {
        const createdResponse = await tx.cabinQualityAuditResponse.create({
          data: {
            auditId: created.id,
            checklistItemId: response.checklistItemId,
            response: response.response,
          },
        });

        if (response.imageFileIds?.length) {
          await tx.cabinQualityAuditResponseFile.createMany({
            data: response.imageFileIds.map((fileId, index) => ({
              responseId: createdResponse.id,
              fileId,
              sortOrder: index,
            })),
          });
        }
      }

      if (dto.generalPictureFileIds?.length) {
        await tx.cabinQualityAuditFile.createMany({
          data: dto.generalPictureFileIds.map((fileId, index) => ({
            auditId: created.id,
            fileId,
            sortOrder: index,
          })),
        });
      }

      return created;
    });

    return this.getById(user, audit.id);
  }

  async list(user: AuthenticatedUser, query: ListCabinQualityAuditsDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const where: Prisma.CabinQualityAuditWhereInput = {
      stationId: user.activeStationId,
      auditorUserId: user.id,
      ...(query.fromDate || query.toDate
        ? {
            auditAt: {
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
      ...(query.gateId ? { gateId: query.gateId } : {}),
      ...(query.cleanTypeId ? { cleanTypeId: query.cleanTypeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.cabinQualityAudit.findMany({
        where,
        orderBy: { auditAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          gate: true,
          cleanType: true,
          files: {
            include: {
              file: true,
            },
            take: 3,
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.cabinQualityAudit.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => ({
        ...this.parseAuditMetadata(item.additionalNotes),
        id: item.id,
        auditAt: item.auditAt,
        auditorName: item.auditorNameSnapshot,
        auditorRole: item.auditorRoleSnapshot,
        gateCode: item.gateCodeSnapshot,
        cleanType: item.cleanTypeSnapshot,
        status: item.status,
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

    const audit = await this.prisma.cabinQualityAudit.findFirst({
      where: {
        id,
        stationId: user.activeStationId,
        auditorUserId: user.id,
      },
      include: {
        responses: {
          include: {
            checklistItem: true,
            files: { include: { file: true }, orderBy: { sortOrder: 'asc' } },
          },
          orderBy: { checklistItem: { sortOrder: 'asc' } },
        },
        files: {
          include: { file: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException('Cabin quality audit not found');
    }

    return {
      ...audit,
      ...this.parseAuditMetadata(audit.additionalNotes),
    };
  }

  private buildStoredAdditionalNotes(dto: CreateCabinQualityAuditDto) {
    const metadataLines = [
      `Ship Number: ${dto.shipNumber.trim()}`,
      `Flight Number: ${dto.flightNumber.trim()}`,
    ];

    const noteBody = dto.additionalNotes?.trim() ?? '';
    const noteSegments =
      noteBody.length > 0 ? [...metadataLines, noteBody] : metadataLines;

    const combined = noteSegments.join('\n');
    return combined.length === 0 ? null : combined;
  }

  private parseAuditMetadata(additionalNotes?: string | null) {
    let shipNumber = '';
    let flightNumber = '';

    for (const rawLine of (additionalNotes ?? '').split('\n')) {
      const line = rawLine.trim();
      if (line.startsWith('Ship Number:')) {
        shipNumber = line.substring('Ship Number:'.length).trim();
        continue;
      }
      if (line.startsWith('Flight Number:')) {
        flightNumber = line.substring('Flight Number:'.length).trim();
      }
    }

    return {
      shipNumber,
      flightNumber,
    };
  }
}
