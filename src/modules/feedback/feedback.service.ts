import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { CreateFeedbackDto } from './dto/create-feedback.dto.js';
import { ListFeedbackDto } from './dto/list-feedback.dto.js';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, dto: CreateFeedbackDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException(
        'Active station is required to submit feedback',
      );
    }
    const stationAccess = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId: user.activeStationId,
        },
      },
      include: { role: true, user: true },
    });
    if (!stationAccess) {
      throw new ForbiddenException('No station access');
    }
    const created = await this.prisma.appFeedback.create({
      data: {
        stationId: user.activeStationId,
        submittedByUserId: user.id,
        userNameSnapshot: `${stationAccess.user.firstName} ${stationAccess.user.lastName}`,
        userRoleSnapshot: stationAccess.role.name,
        overallSatisfaction: dto.overallSatisfaction,
        easeOfUse: dto.easeOfUse,
        appPerformance: dto.appPerformance,
        usabilityIssues: dto.usabilityIssues,
        missingFeatures: dto.missingFeatures,
        performanceIssues: dto.performanceIssues,
      },
    });

    return {
      id: created.id,
      message: 'Thank you for your feedback.',
    };
  }

  async list(user: AuthenticatedUser, query: ListFeedbackDto) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }
    const where: Prisma.AppFeedbackWhereInput = {
      stationId: user.activeStationId,
      ...(query.fromDate || query.toDate
        ? {
            submittedAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...(query.userName
        ? {
            userNameSnapshot: {
              contains: query.userName,
              mode: 'insensitive',
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.appFeedback.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.appFeedback.count({ where }),
    ]);
    return buildPaginatedResult(items, total, query);
  }

  async myFeedback(user: AuthenticatedUser, query: ListFeedbackDto) {
    const where: Prisma.AppFeedbackWhereInput = {
      submittedByUserId: user.id,
      ...(query.fromDate || query.toDate
        ? {
            submittedAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.appFeedback.findMany({
        where,
        orderBy: { submittedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.appFeedback.count({ where }),
    ]);
    return buildPaginatedResult(items, total, query);
  }
}
