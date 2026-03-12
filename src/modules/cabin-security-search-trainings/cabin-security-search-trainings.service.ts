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

@Injectable()
export class CabinSecuritySearchTrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    user: AuthenticatedUser,
    dto: CreateCabinSecuritySearchTrainingDto,
  ) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

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
    const validAreaIds = new Set(areas.map((area) => area.id));
    const uniqueAreaIds = new Set(dto.areaResults.map((item) => item.areaId));
    if (uniqueAreaIds.size !== dto.areaResults.length) {
      throw new BadRequestException('Duplicate areas are not allowed');
    }
    for (const result of dto.areaResults) {
      if (!validAreaIds.has(result.areaId)) {
        throw new BadRequestException('Invalid selected area');
      }
    }

    const overallResult = dto.areaResults.some(
      (entry) => entry.result === PassFail.FAIL,
    )
      ? PassFail.FAIL
      : PassFail.PASS;

    const training = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cabinSecuritySearchTraining.create({
        data: {
          stationId: user.activeStationId!,
          shiftOccurrenceId: dto.shiftOccurrenceId,
          gateId: dto.gateId,
          auditorUserId: user.id,
          auditorNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
          auditorRoleSnapshot: stationAccess.role.name,
          gateCodeSnapshot: gate.gateCode,
          shipNumber: dto.shipNumber,
          otherFindings: dto.otherFindings,
          additionalNotes: dto.additionalNotes,
          overallResult,
          status: 'SUBMITTED',
        },
      });

      for (const result of dto.areaResults) {
        const area = areas.find((item) => item.id === result.areaId)!;
        const createdResult = await tx.cabinSecuritySearchTrainingResult.create(
          {
            data: {
              trainingId: created.id,
              areaId: area.id,
              areaLabelSnapshot: area.label,
              result: result.result,
            },
          },
        );
        if (result.imageFileIds?.length) {
          await tx.cabinSecuritySearchTrainingResultFile.createMany({
            data: result.imageFileIds.map((fileId, index) => ({
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
      ...(query.result ? { overallResult: query.result } : {}),
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
}
