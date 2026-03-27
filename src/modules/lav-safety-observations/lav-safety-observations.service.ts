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
import { CreateLavSafetyObservationDto } from './dto/create-lav-safety-observation.dto.js';
import { ListLavSafetyObservationsDto } from './dto/list-lav-safety-observations.dto.js';
import { ShiftContextService } from '../../common/services/shift-context.service.js';

@Injectable()
export class LavSafetyObservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shiftContextService: ShiftContextService,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateLavSafetyObservationDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const resolvedShiftOccurrenceId =
      dto.shiftOccurrenceId ??
      (await this.shiftContextService.resolveCurrentShiftOccurrenceId(
        user.activeStationId,
      ));

    const [stationAccess, gate, checklistItems] = await Promise.all([
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
      this.prisma.lavSafetyChecklistItem.findMany({
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
    if (dto.responses.length !== checklistItems.length) {
      throw new BadRequestException(
        `Checklist requires ${checklistItems.length} responses`,
      );
    }

    const expectedChecklistIds = new Set(checklistItems.map((item) => item.id));
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

    const observation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.lavSafetyObservation.create({
        data: {
          stationId: user.activeStationId!,
          shiftOccurrenceId: resolvedShiftOccurrenceId,
          gateId: dto.gateId,
          auditorUserId: user.id,
          auditorNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
          auditorRoleSnapshot: stationAccess.role.name,
          gateCodeSnapshot: gate.gateCode,
          driverName: dto.driverName,
          shipNumber: dto.shipNumber,
          otherFindings: dto.otherFindings,
          additionalNotes: dto.additionalNotes,
          signatureFileId: dto.signatureFileId,
          status: 'SUBMITTED',
        },
      });

      for (const response of dto.responses) {
        const createdResponse = await tx.lavSafetyObservationResponse.create({
          data: {
            observationId: created.id,
            checklistItemId: response.checklistItemId,
            response: response.response,
          },
        });

        if (response.imageFileIds?.length) {
          await tx.lavSafetyObservationResponseFile.createMany({
            data: response.imageFileIds.map((fileId, index) => ({
              responseId: createdResponse.id,
              fileId,
              sortOrder: index,
            })),
          });
        }
      }

      if (dto.generalPictureFileIds?.length) {
        await tx.lavSafetyObservationFile.createMany({
          data: dto.generalPictureFileIds.map((fileId, index) => ({
            observationId: created.id,
            fileId,
            sortOrder: index,
          })),
        });
      }

      return created;
    });

    return this.getById(user, observation.id);
  }

  async list(user: AuthenticatedUser, query: ListLavSafetyObservationsDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }
    const where: Prisma.LavSafetyObservationWhereInput = {
      stationId: user.activeStationId,
      ...(query.fromDate || query.toDate
        ? {
            observedAt: {
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
      ...(query.driverName
        ? {
            driverName: {
              contains: query.driverName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.gateId ? { gateId: query.gateId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.lavSafetyObservation.findMany({
        where,
        orderBy: { observedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          files: {
            take: 3,
            include: { file: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.lavSafetyObservation.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => ({
        id: item.id,
        observedAt: item.observedAt,
        auditorName: item.auditorNameSnapshot,
        gateCode: item.gateCodeSnapshot,
        driverName: item.driverName,
        shipNumber: item.shipNumber,
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
    const observation = await this.prisma.lavSafetyObservation.findFirst({
      where: {
        id,
        stationId: user.activeStationId,
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
    if (!observation) {
      throw new NotFoundException('LAV safety observation not found');
    }
    return observation;
  }
}

