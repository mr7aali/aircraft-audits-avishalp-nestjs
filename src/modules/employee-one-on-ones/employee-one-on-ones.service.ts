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
import { CreateEmployeeOneOnOneDto } from './dto/create-employee-one-on-one.dto.js';
import { ListEmployeeOneOnOnesDto } from './dto/list-employee-one-on-ones.dto.js';

@Injectable()
export class EmployeeOneOnOnesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateEmployeeOneOnOneDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }
    this.validateDto(dto);

    const [stationAccess, employee] = await Promise.all([
      this.prisma.userStationAccess.findUnique({
        where: {
          userId_stationId: {
            userId: user.id,
            stationId: user.activeStationId,
          },
        },
        include: { role: true, user: true },
      }),
      this.prisma.user.findUnique({
        where: { id: dto.employeeUserId },
      }),
    ]);
    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }
    if (!employee || employee.status !== 'ACTIVE') {
      throw new BadRequestException('Invalid employee');
    }

    if (dto.discussionAudioFileId) {
      const audioFile = await this.prisma.file.findUnique({
        where: { id: dto.discussionAudioFileId },
      });
      if (!audioFile) {
        throw new BadRequestException('Invalid discussion audio file');
      }
      // Duration validation hook: enforce when duration metadata exists.
      // For v1, metadata field may be absent in development.
    }

    const created = await this.prisma.employeeOneOnOne.create({
      data: {
        stationId: user.activeStationId,
        leaderUserId: user.id,
        employeeUserId: employee.id,
        leaderNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
        leaderRoleSnapshot: stationAccess.role.name,
        employeeNameSnapshot: `${employee.firstName} ${employee.lastName}`,
        discussionText: dto.discussionText,
        discussionAudioFileId: dto.discussionAudioFileId,
        additionalNote: dto.additionalNote,
        employeeRefusedToSign: dto.employeeRefusedToSign,
        employeeSignatureFileId: dto.employeeSignatureFileId,
        leaderSignatureFileId: dto.leaderSignatureFileId,
        status: 'SUBMITTED',
      },
    });
    return this.getById(user, created.id);
  }

  async list(user: AuthenticatedUser, query: ListEmployeeOneOnOnesDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    const hrAdmin = await this.isHrAdmin(user.id, user.activeStationId);
    const where: Prisma.EmployeeOneOnOneWhereInput = {
      stationId: user.activeStationId,
      ...(query.fromDate || query.toDate
        ? {
            meetingAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.employeeName
        ? {
            employeeNameSnapshot: {
              contains: query.employeeName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(query.leaderName
        ? {
            leaderNameSnapshot: {
              contains: query.leaderName,
              mode: 'insensitive',
            },
          }
        : {}),
      ...(!hrAdmin
        ? {
            OR: [{ leaderUserId: user.id }, { employeeUserId: user.id }],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.employeeOneOnOne.findMany({
        where,
        orderBy: { meetingAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.employeeOneOnOne.count({ where }),
    ]);

    return buildPaginatedResult(items, total, query);
  }

  async getById(user: AuthenticatedUser, id: string) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }
    const record = await this.prisma.employeeOneOnOne.findFirst({
      where: {
        id,
        stationId: user.activeStationId,
      },
      include: {
        discussionAudioFile: true,
        employeeSignatureFile: true,
        leaderSignatureFile: true,
      },
    });
    if (!record) {
      throw new NotFoundException('Employee 1:1 record not found');
    }

    const hrAdmin = await this.isHrAdmin(user.id, user.activeStationId);
    if (
      !hrAdmin &&
      record.leaderUserId !== user.id &&
      record.employeeUserId !== user.id
    ) {
      throw new ForbiddenException('Not allowed to view this record');
    }

    return record;
  }

  private validateDto(dto: CreateEmployeeOneOnOneDto) {
    if (!dto.discussionText?.trim() && !dto.discussionAudioFileId) {
      throw new BadRequestException(
        'At least one of discussionText or discussionAudioFileId is required',
      );
    }
    if (!dto.employeeRefusedToSign && !dto.employeeSignatureFileId) {
      throw new BadRequestException(
        'employeeSignatureFileId is required when employeeRefusedToSign is false',
      );
    }
    if (dto.employeeRefusedToSign && dto.employeeSignatureFileId) {
      throw new BadRequestException(
        'employeeSignatureFileId must be omitted when employeeRefusedToSign is true',
      );
    }
  }

  private async isHrAdmin(userId: string, stationId: string): Promise<boolean> {
    const access = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId,
          stationId,
        },
      },
      include: { role: true },
    });
    return access?.role.code === 'HR_ADMIN';
  }
}

