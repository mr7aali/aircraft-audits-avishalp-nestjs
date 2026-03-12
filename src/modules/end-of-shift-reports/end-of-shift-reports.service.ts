import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateEndOfShiftReportDto } from './dto/create-end-of-shift-report.dto.js';
import { ListEndOfShiftReportsDto } from './dto/list-end-of-shift-reports.dto.js';

@Injectable()
export class EndOfShiftReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateEndOfShiftReportDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }
    this.validateDto(dto);
    const stationAccess = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId: user.activeStationId,
        },
      },
      include: { role: true, user: true },
    });
    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.endOfShiftReport.create({
        data: {
          stationId: user.activeStationId!,
          shiftOccurrenceId: dto.shiftOccurrenceId,
          supervisorUserId: user.id,
          supervisorNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
          supervisorRoleSnapshot: stationAccess.role.name,
          lavObservationCompleted: dto.lavObservationCompleted,
          lavObservationReason: dto.lavObservationReason,
          cabinQualityCompleted: dto.cabinQualityCompleted,
          cabinQualityReason: dto.cabinQualityReason,
          callOffs: dto.callOffs,
          tardyEarlyOut: dto.tardyEarlyOut,
          overtimeHours: dto.overtimeHours,
          overtimeMinutes: dto.overtimeMinutes,
          overtimeReason: dto.overtimeReason,
          delaysTaken: dto.delaysTaken,
          delayCount: dto.delayCount,
          additionalNotes: dto.additionalNotes,
          status: 'SUBMITTED',
        },
      });

      if (dto.delaysTaken && dto.delays?.length) {
        await tx.endOfShiftReportDelay.createMany({
          data: dto.delays.map((entry) => ({
            reportId: created.id,
            sequenceNo: entry.sequenceNo,
            delayCodeAlpha: entry.delayCodeAlpha.toUpperCase(),
            delayCodeNumber: entry.delayCodeNumber,
            delayType: entry.delayType,
            reason: entry.reason,
          })),
        });
      }

      if (dto.additionalPictureFileIds?.length) {
        await tx.endOfShiftReportFile.createMany({
          data: dto.additionalPictureFileIds.map((fileId, index) => ({
            reportId: created.id,
            fileId,
            sortOrder: index,
          })),
        });
      }
      return created;
    });

    return this.getById(user, report.id);
  }

  async list(user: AuthenticatedUser, query: ListEndOfShiftReportsDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const where: Prisma.EndOfShiftReportWhereInput = {
      stationId: user.activeStationId,
      ...(query.fromDate || query.toDate
        ? {
            reportAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.supervisorName
        ? {
            supervisorNameSnapshot: {
              contains: query.supervisorName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(typeof query.overtimeHours === 'number'
        ? { overtimeHours: query.overtimeHours }
        : {}),
      ...(typeof query.overtimeMinutes === 'number'
        ? { overtimeMinutes: query.overtimeMinutes }
        : {}),
      ...(query.delayCodeAlpha ||
      typeof query.delayCodeNumber === 'number' ||
      query.delayType
        ? {
            delays: {
              some: {
                ...(query.delayCodeAlpha
                  ? { delayCodeAlpha: query.delayCodeAlpha.toUpperCase() }
                  : {}),
                ...(typeof query.delayCodeNumber === 'number'
                  ? { delayCodeNumber: query.delayCodeNumber }
                  : {}),
                ...(query.delayType ? { delayType: query.delayType } : {}),
              },
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.endOfShiftReport.findMany({
        where,
        orderBy: { reportAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          files: {
            include: { file: true },
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
          delays: true,
        },
      }),
      this.prisma.endOfShiftReport.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => ({
        id: item.id,
        reportAt: item.reportAt,
        supervisorName: item.supervisorNameSnapshot,
        lavObservationCompleted: item.lavObservationCompleted,
        cabinQualityCompleted: item.cabinQualityCompleted,
        delaysTaken: item.delaysTaken,
        delayCount: item.delayCount,
        overtimeHours: item.overtimeHours,
        overtimeMinutes: item.overtimeMinutes,
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
    const report = await this.prisma.endOfShiftReport.findFirst({
      where: {
        id,
        stationId: user.activeStationId,
      },
      include: {
        delays: { orderBy: { sequenceNo: 'asc' } },
        files: {
          include: { file: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!report) {
      throw new NotFoundException('End of shift report not found');
    }
    return report;
  }

  private validateDto(dto: CreateEndOfShiftReportDto): void {
    if (!dto.lavObservationCompleted && !dto.lavObservationReason?.trim()) {
      throw new BadRequestException(
        'lavObservationReason is required when lavObservationCompleted is false',
      );
    }
    if (!dto.cabinQualityCompleted && !dto.cabinQualityReason?.trim()) {
      throw new BadRequestException(
        'cabinQualityReason is required when cabinQualityCompleted is false',
      );
    }
    if (
      (dto.overtimeHours > 0 || dto.overtimeMinutes > 0) &&
      !dto.overtimeReason?.trim()
    ) {
      throw new BadRequestException(
        'overtimeReason is required when overtime is greater than zero',
      );
    }
    if (dto.delaysTaken) {
      if (!dto.delayCount || dto.delayCount < 1) {
        throw new BadRequestException(
          'delayCount is required when delaysTaken is true',
        );
      }
      if (!dto.delays?.length) {
        throw new BadRequestException(
          'At least one delay row is required when delaysTaken is true',
        );
      }
    }
  }
}
