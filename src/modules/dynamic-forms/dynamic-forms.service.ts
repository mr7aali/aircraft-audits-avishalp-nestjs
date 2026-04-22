import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client/client.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateDynamicFormSubmissionDto,
  DynamicFormSubmissionListQueryDto,
  DynamicFormsTemplateListQueryDto,
  UpsertDynamicFormTemplateDto,
} from './dto/manage-dynamic-forms.dto.js';
import { DynamicFormTemplateStatus } from '../../generated/prisma-client/enums.js';

@Injectable()
export class DynamicFormsService {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(
    user: AuthenticatedUser,
    query: DynamicFormsTemplateListQueryDto,
  ) {
    const stationId = this.requireActiveStation(user);

    const where: Prisma.DynamicFormTemplateWhereInput = {
      stationId,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.status ? { status: query.status as any } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                title: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
              {
                category: {
                  contains: query.search.trim(),
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.dynamicFormTemplate.findMany({
        where,
        include: {
          createdByUser: true,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.dynamicFormTemplate.count({ where }),
    ]);

    return buildPaginatedResult(
      items.map((item) => this.mapTemplateSummary(item)),
      total,
      query,
    );
  }

  async getTemplateById(user: AuthenticatedUser, id: string) {
    const stationId = this.requireActiveStation(user);
    const template = await this.prisma.dynamicFormTemplate.findFirst({
      where: {
        id,
        stationId,
      },
      include: {
        createdByUser: true,
        updatedByUser: true,
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    return this.mapTemplateDetail(template);
  }

  async createTemplate(
    user: AuthenticatedUser,
    dto: UpsertDynamicFormTemplateDto,
  ) {
    const stationId = this.requireActiveStation(user);
    const normalized = this.normalizeTemplatePayload(dto);

    const created = await this.prisma.dynamicFormTemplate.create({
      data: {
        stationId,
        createdByUserId: user.id,
        updatedByUserId: user.id,
        title: normalized.title,
        description: normalized.description,
        category: normalized.category,
        formType: normalized.formType,
        status: normalized.status,
        version: 1,
        questionCount: normalized.questionCount,
        estimatedMinutes: normalized.estimatedMinutes,
        schemaJson: normalized.questions as Prisma.InputJsonValue,
        publishedAt: normalized.status === 'PUBLISHED' ? new Date() : null,
      },
      select: {
        id: true,
      },
    });

    return this.getTemplateById(user, created.id);
  }

  async updateTemplate(
    user: AuthenticatedUser,
    id: string,
    dto: UpsertDynamicFormTemplateDto,
  ) {
    const stationId = this.requireActiveStation(user);
    await this.ensureTemplateExists(id, stationId);

    const normalized = this.normalizeTemplatePayload(dto);
    const existing = await this.prisma.dynamicFormTemplate.findUnique({
      where: { id },
      select: { status: true, publishedAt: true, version: true },
    });

    const nextStatus = normalized.status;
    const shouldSetPublishedAt =
      nextStatus === 'PUBLISHED' &&
      (existing?.status !== 'PUBLISHED' || !existing.publishedAt);

    const updated = await this.prisma.dynamicFormTemplate.update({
      where: { id },
      data: {
        title: normalized.title,
        description: normalized.description,
        category: normalized.category,
        formType: normalized.formType,
        status: normalized.status,
        questionCount: normalized.questionCount,
        estimatedMinutes: normalized.estimatedMinutes,
        schemaJson: normalized.questions as Prisma.InputJsonValue,
        updatedByUserId: user.id,
        version: (existing?.version ?? 1) + 1,
        publishedAt: shouldSetPublishedAt ? new Date() : existing?.publishedAt,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });

    return this.getTemplateById(user, updated.id);
  }

  async archiveTemplate(user: AuthenticatedUser, id: string) {
    const stationId = this.requireActiveStation(user);
    await this.ensureTemplateExists(id, stationId);

    const updated = await this.prisma.dynamicFormTemplate.update({
      where: { id },
      data: {
        status: DynamicFormTemplateStatus.ARCHIVED,
        archivedAt: new Date(),
        updatedByUserId: user.id,
      },
      select: {
        id: true,
      },
    });

    return this.getTemplateById(user, updated.id);
  }

  async listPublishedTemplates(user: AuthenticatedUser) {
    const stationId = this.requireActiveStation(user);

    const items = await this.prisma.dynamicFormTemplate.findMany({
      where: {
        stationId,
        status: 'PUBLISHED',
        archivedAt: null,
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    return items.map((item) => this.mapPublishedTemplate(item));
  }

  async getPublishedTemplate(user: AuthenticatedUser, id: string) {
    const stationId = this.requireActiveStation(user);
    const template = await this.prisma.dynamicFormTemplate.findFirst({
      where: {
        id,
        stationId,
        status: 'PUBLISHED',
        archivedAt: null,
      },
    });

    if (!template) {
      throw new NotFoundException('Published form not found');
    }

    return this.mapPublishedTemplate(template);
  }

  async createSubmission(
    user: AuthenticatedUser,
    templateId: string,
    dto: CreateDynamicFormSubmissionDto,
  ) {
    const stationId = this.requireActiveStation(user);

    const [template, stationAccess] = await Promise.all([
      this.prisma.dynamicFormTemplate.findFirst({
        where: {
          id: templateId,
          stationId,
          status: 'PUBLISHED',
          archivedAt: null,
        },
      }),
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
    ]);

    if (!template) {
      throw new NotFoundException('Published form not found');
    }

    if (!stationAccess || !stationAccess.isActive) {
      throw new ForbiddenException('No station access');
    }

    const questions = this.ensureQuestionsArray(template.schemaJson);
    const requiredIds = questions
      .filter((question) => question.required === true)
      .map((question) => question.id)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    for (const id of requiredIds) {
      const value = dto.answers[id];
      const isMissing =
        value == null ||
        (typeof value === 'string' && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0);
      if (isMissing) {
        throw new BadRequestException(`Question ${id} is required`);
      }
    }

    const created = await this.prisma.dynamicFormSubmission.create({
      data: {
        templateId: template.id,
        stationId,
        submittedByUserId: user.id,
        submittedByName:
          `${stationAccess.user.firstName} ${stationAccess.user.lastName}`.trim(),
        submittedByRole: stationAccess.role.name,
        answersJson: dto.answers as Prisma.InputJsonValue,
        metadataJson: dto.metadata
          ? (dto.metadata as Prisma.InputJsonValue)
          : undefined,
      },
      include: {
        submittedByUser: true,
      },
    });

    return this.mapSubmission(created);
  }

  async listTemplateSubmissions(
    user: AuthenticatedUser,
    templateId: string,
    query: DynamicFormSubmissionListQueryDto,
  ) {
    const stationId = this.requireActiveStation(user);
    const template = await this.prisma.dynamicFormTemplate.findFirst({
      where: {
        id: templateId,
        stationId,
      },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }

    const where: Prisma.DynamicFormSubmissionWhereInput = {
      templateId,
      ...(query.search?.trim()
        ? {
            submittedByName: {
              contains: query.search.trim(),
              mode: 'insensitive',
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.dynamicFormSubmission.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.dynamicFormSubmission.count({ where }),
    ]);

    return {
      template: this.mapPublishedTemplate(template),
      ...buildPaginatedResult(
        items.map((item) => this.mapSubmission(item)),
        total,
        query,
      ),
    };
  }

  private requireActiveStation(user: AuthenticatedUser) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    return user.activeStationId;
  }

  private async ensureTemplateExists(id: string, stationId: string) {
    const template = await this.prisma.dynamicFormTemplate.findFirst({
      where: {
        id,
        stationId,
      },
      select: { id: true },
    });

    if (!template) {
      throw new NotFoundException('Form template not found');
    }
  }

  private normalizeTemplatePayload(dto: UpsertDynamicFormTemplateDto) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Title is required');
    }

    const questions = dto.questions.map((question, index) => {
      if (!question || typeof question !== 'object') {
        throw new BadRequestException(
          `Question at index ${index} must be an object`,
        );
      }
      return question;
    });

    const questionCount = questions.length;

    return {
      title,
      description: dto.description?.trim() || null,
      category: dto.category?.trim() || null,
      formType: dto.formType?.trim() || 'SURVEY',
      status:
        dto.status?.trim().toUpperCase() === DynamicFormTemplateStatus.PUBLISHED
          ? DynamicFormTemplateStatus.PUBLISHED
          : DynamicFormTemplateStatus.DRAFT,
      questions,
      questionCount,
      estimatedMinutes:
        dto.estimatedMinutes != null
          ? dto.estimatedMinutes
          : Math.max(1, Math.ceil(questionCount / 3)),
    };
  }

  private ensureQuestionsArray(value: Prisma.JsonValue) {
    if (!Array.isArray(value)) {
      throw new BadRequestException('Stored form schema is invalid');
    }

    return value as Array<Record<string, unknown>>;
  }

  private mapTemplateSummary(
    template: Prisma.DynamicFormTemplateGetPayload<{
      include: {
        createdByUser: true;
        _count: { select: { submissions: true } };
      };
    }>,
  ) {
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      category: template.category,
      formType: template.formType,
      status: template.status,
      version: template.version,
      questionCount: template.questionCount,
      estimatedMinutes: template.estimatedMinutes,
      publishedAt: template.publishedAt,
      archivedAt: template.archivedAt,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdByName: `${template.createdByUser.firstName} ${template.createdByUser.lastName}`.trim(),
      submissionCount: template._count.submissions,
    };
  }

  private mapTemplateDetail(
    template: Prisma.DynamicFormTemplateGetPayload<{
      include: {
        createdByUser: true;
        updatedByUser: true;
        _count: { select: { submissions: true } };
      };
    }>,
  ) {
    return {
      ...this.mapTemplateSummary({
        ...template,
        _count: template._count,
        createdByUser: template.createdByUser,
      } as Prisma.DynamicFormTemplateGetPayload<{
        include: {
          createdByUser: true;
          _count: { select: { submissions: true } };
        };
      }>),
      questions: this.ensureQuestionsArray(template.schemaJson),
      updatedByName: template.updatedByUser
        ? `${template.updatedByUser.firstName} ${template.updatedByUser.lastName}`.trim()
        : null,
    };
  }

  private mapPublishedTemplate(template: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    formType: string;
    status: string;
    questionCount: number;
    estimatedMinutes: number;
    schemaJson: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: template.id,
      title: template.title,
      description: template.description,
      category: template.category,
      formType: template.formType,
      status: template.status,
      questionCount: template.questionCount,
      estimatedMinutes: template.estimatedMinutes,
      questions: this.ensureQuestionsArray(template.schemaJson),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private mapSubmission(submission: {
    id: string;
    templateId: string;
    submittedByName: string;
    submittedByRole: string | null;
    answersJson: Prisma.JsonValue;
    metadataJson: Prisma.JsonValue | null;
    submittedAt: Date;
  }) {
    return {
      id: submission.id,
      templateId: submission.templateId,
      submittedByName: submission.submittedByName,
      submittedByRole: submission.submittedByRole,
      answers: submission.answersJson,
      metadata: submission.metadataJson,
      submittedAt: submission.submittedAt,
    };
  }
}
