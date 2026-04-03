import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import {
  ACCESS_CONTROL_MODULES,
  MODULE_CODES,
  SYSTEM_TYPES,
  type SystemType,
} from '../../common/constants/module-codes.js';
import {
  CreateRoleDto,
  UpdateRoleDto,
  UpdateRolePermissionsDto,
} from './dto/access-control.dto.js';
import { UserStatus } from '../../generated/prisma-client/enums.js';

type RoleWithAccessCounts = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  stationAccesses: Array<{ userId: string }>;
  moduleAccesses: Array<{
    canRead: boolean;
    canWrite: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canList: boolean;
    canView: boolean;
    canCreate: boolean;
    module: {
      code: string;
      name: string;
      systemType: SystemType;
    };
  }>;
};

@Injectable()
export class AccessControlService implements OnModuleInit {
  private readonly protectedRoleCodes = new Set([
    'VP',
    'GM',
    'DM',
    'SUP',
    'ALL',
    'EMPLOYEE',
    'HR_ADMIN',
  ]);

  private readonly defaultDashboardRoleCodes = [
    'VP',
    'GM',
    'DM',
    'SUP',
    'ALL',
    'HR_ADMIN',
  ];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncModuleCatalog();
    await this.ensureDefaultDashboardPermissions();
  }

  async listRoles(user: AuthenticatedUser, search?: string) {
    const stationId = this.getStationId(user);
    const normalizedSearch = search?.trim();

    const roles = await this.prisma.role.findMany({
      where: normalizedSearch
        ? {
            OR: [
              { name: { contains: normalizedSearch, mode: 'insensitive' } },
              { code: { contains: normalizedSearch.toUpperCase() } },
              {
                description: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
      include: {
        stationAccesses: {
          where: {
            stationId,
            isActive: true,
          },
          select: {
            userId: true,
          },
        },
        moduleAccesses: {
          include: {
            module: {
              select: {
                code: true,
                name: true,
                systemType: true,
              },
            },
          },
        },
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });

    return {
      roles: roles.map((role) => this.mapRoleSummary(role)),
    };
  }

  async createRole(dto: CreateRoleDto, user: AuthenticatedUser) {
    await this.getStationId(user);

    const name = dto.name.trim();
    const code = await this.resolveRoleCode(dto.code, name);

    try {
      const role = await this.prisma.role.create({
        data: {
          code,
          name,
          description: dto.description?.trim() || null,
          isActive: dto.isActive ?? true,
        },
        include: {
          stationAccesses: {
            select: {
              userId: true,
            },
          },
          moduleAccesses: {
            include: {
              module: {
                select: {
                  code: true,
                  name: true,
                  systemType: true,
                },
              },
            },
          },
        },
      });

      return this.mapRoleSummary(role);
    } catch (error: unknown) {
      this.handleUniqueConstraint(error, 'Role code already exists');
      throw error;
    }
  }

  async updateRole(id: string, dto: UpdateRoleDto, user: AuthenticatedUser) {
    await this.getStationId(user);

    const existing = await this.prisma.role.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    const data: {
      name?: string;
      code?: string;
      description?: string | null;
      isActive?: boolean;
    } = {};

    if (dto.name != null) {
      data.name = dto.name.trim();
    }

    if (dto.code != null) {
      data.code = await this.resolveRoleCode(
        dto.code,
        dto.name ?? existing.code,
        id,
      );
    }

    if (dto.description != null) {
      data.description = dto.description.trim() || null;
    }

    if (dto.isActive != null) {
      data.isActive = dto.isActive;
    }

    try {
      const role = await this.prisma.role.update({
        where: { id },
        data,
        include: {
          stationAccesses: {
            select: {
              userId: true,
            },
          },
          moduleAccesses: {
            include: {
              module: {
                select: {
                  code: true,
                  name: true,
                  systemType: true,
                },
              },
            },
          },
        },
      });

      return this.mapRoleSummary(role);
    } catch (error: unknown) {
      this.handleUniqueConstraint(error, 'Role code already exists');
      throw error;
    }
  }

  async listUsers(user: AuthenticatedUser, search?: string) {
    const stationId = this.getStationId(user);
    const normalizedSearch = search?.trim();

    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        ...(normalizedSearch
          ? {
              OR: [
                {
                  firstName: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  lastName: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  uid: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: normalizedSearch,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        uid: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        stationAccesses: {
          where: {
            stationId,
          },
          include: {
            role: {
              select: {
                id: true,
                code: true,
                name: true,
                isActive: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: 300,
    });

    return {
      users: users.map((entry) => {
        const access =
          entry.stationAccesses.length > 0 ? entry.stationAccesses[0] : null;

        return {
          id: entry.id,
          uid: entry.uid,
          email: entry.email,
          firstName: entry.firstName,
          lastName: entry.lastName,
          fullName: '${entry.firstName} ${entry.lastName}'.trim(),
          status: entry.status,
          roleId: access?.roleId,
          roleCode: access?.role.code,
          roleName: access?.role.name,
          isRoleActive: access?.role.isActive ?? false,
          isAssigned: access != null && access.isActive,
          isDefault: access?.isDefault ?? false,
        };
      }),
    };
  }

  async assignUserRole(
    actor: AuthenticatedUser,
    targetUserId: string,
    roleId: string,
    isDefault?: boolean,
  ) {
    const stationId = this.getStationId(actor);

    const [targetUser, role] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          uid: true,
        },
      }),
      this.prisma.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      }),
    ]);

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (!role || !role.isActive) {
      throw new NotFoundException('Role not found');
    }

    const existing = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: targetUserId,
          stationId,
        },
      },
    });

    const shouldBeDefault =
      isDefault ??
      existing?.isDefault ??
      !(await this.prisma.userStationAccess.findFirst({
        where: {
          userId: targetUserId,
          isActive: true,
        },
        select: {
          id: true,
        },
      }));

    await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.userStationAccess.updateMany({
          where: {
            userId: targetUserId,
            NOT: {
              stationId,
            },
          },
          data: {
            isDefault: false,
          },
        });
      }

      await tx.userStationAccess.upsert({
        where: {
          userId_stationId: {
            userId: targetUserId,
            stationId,
          },
        },
        update: {
          roleId,
          isActive: true,
          isDefault: shouldBeDefault,
        },
        create: {
          userId: targetUserId,
          stationId,
          roleId,
          isActive: true,
          isDefault: shouldBeDefault,
        },
      });
    });

    return {
      id: targetUser.id,
      uid: targetUser.uid,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      fullName: '${targetUser.firstName} ${targetUser.lastName}'.trim(),
      roleId: role.id,
      roleCode: role.code,
      roleName: role.name,
      isAssigned: true,
      isDefault: shouldBeDefault,
      isRoleActive: role.isActive,
    };
  }

  async listModules(systemType?: SystemType) {
    const modules = await this.prisma.appModule.findMany({
      where: systemType ? { systemType } : undefined,
      orderBy: [{ systemType: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });

    return {
      systems: this.groupModulesBySystem(modules),
    };
  }

  async getRolePermissions(roleId: string, systemType?: SystemType) {
    const [role, modules, accesses] = await Promise.all([
      this.prisma.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          isActive: true,
        },
      }),
      this.prisma.appModule.findMany({
        where: systemType ? { systemType } : undefined,
        orderBy: [{ systemType: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.roleModuleAccess.findMany({
        where: {
          roleId,
        },
        include: {
          module: true,
        },
      }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const accessByCode = new Map(
      accesses.map((item) => [item.module.code, item] as const),
    );

    return {
      role: {
        id: role.id,
        code: role.code,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isSystemRole: this.protectedRoleCodes.has(role.code),
      },
      systems: this.groupModulesBySystem(
        modules.map((module) => {
          const access = accessByCode.get(module.code);

          return {
            ...module,
            permissions: {
              canRead:
                access?.canRead || access?.canList || access?.canView || false,
              canWrite: access?.canWrite || access?.canCreate || false,
              canEdit: access?.canEdit || access?.canCreate || false,
              canDelete: access?.canDelete || access?.canCreate || false,
            },
          };
        }),
      ),
    };
  }

  async updateRolePermissions(
    roleId: string,
    dto: UpdateRolePermissionsDto,
    user: AuthenticatedUser,
  ) {
    await this.getStationId(user);

    const [role, modules] = await Promise.all([
      this.prisma.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
        },
      }),
      this.prisma.appModule.findMany({
        where: {
          code: {
            in: dto.permissions.map((item) => item.moduleCode),
          },
        },
        select: {
          id: true,
          code: true,
        },
      }),
    ]);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const moduleByCode = new Map(
      modules.map((module) => [module.code, module] as const),
    );

    for (const item of dto.permissions) {
      if (!moduleByCode.has(item.moduleCode)) {
        throw new NotFoundException(
          `Module ${item.moduleCode} does not exist in the catalog`,
        );
      }
    }

    await this.prisma.$transaction(
      dto.permissions.map((item) => {
        const module = moduleByCode.get(item.moduleCode)!;
        return this.prisma.roleModuleAccess.upsert({
          where: {
            roleId_moduleId: {
              roleId,
              moduleId: module.id,
            },
          },
          update: {
            canRead: item.canRead,
            canWrite: item.canWrite,
            canEdit: item.canEdit,
            canDelete: item.canDelete,
            canList: item.canRead,
            canView: item.canRead,
            canCreate: item.canWrite,
          },
          create: {
            roleId,
            moduleId: module.id,
            canRead: item.canRead,
            canWrite: item.canWrite,
            canEdit: item.canEdit,
            canDelete: item.canDelete,
            canList: item.canRead,
            canView: item.canRead,
            canCreate: item.canWrite,
          },
        });
      }),
    );

    return this.getRolePermissions(roleId);
  }

  private async syncModuleCatalog() {
    for (const definition of ACCESS_CONTROL_MODULES) {
      await this.prisma.appModule.upsert({
        where: {
          code: definition.code,
        },
        update: {
          name: definition.name,
          description: definition.description ?? null,
          routePath: definition.routePath ?? null,
          sortOrder: definition.sortOrder,
          systemType: definition.systemType,
        },
        create: {
          code: definition.code,
          name: definition.name,
          description: definition.description ?? null,
          routePath: definition.routePath ?? null,
          sortOrder: definition.sortOrder,
          systemType: definition.systemType,
        },
      });
    }
  }

  private async ensureDefaultDashboardPermissions() {
    const roles = await this.prisma.role.findMany({
      where: {
        code: {
          in: this.defaultDashboardRoleCodes,
        },
      },
      select: {
        id: true,
        code: true,
      },
    });

    const modules = await this.prisma.appModule.findMany({
      where: {
        systemType: SYSTEM_TYPES.ADMIN_DASHBOARD,
      },
      select: {
        id: true,
        code: true,
      },
    });

    for (const role of roles) {
      for (const module of modules) {
        const elevatedCrud =
          module.code === MODULE_CODES.ADMIN_DASHBOARD_MASTER_DATA ||
          module.code === MODULE_CODES.ADMIN_DASHBOARD_ROLE_MANAGEMENT;

        await this.prisma.roleModuleAccess.upsert({
          where: {
            roleId_moduleId: {
              roleId: role.id,
              moduleId: module.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            moduleId: module.id,
            canRead: true,
            canWrite: elevatedCrud,
            canEdit: elevatedCrud,
            canDelete: elevatedCrud,
            canList: true,
            canView: true,
            canCreate: elevatedCrud,
          },
        });
      }
    }
  }

  private mapRoleSummary(role: RoleWithAccessCounts) {
    const systemSummary = {
      appModules: 0,
      adminDashboardModules: 0,
    };

    for (const access of role.moduleAccesses) {
      if (
        access.canRead ||
        access.canWrite ||
        access.canEdit ||
        access.canDelete ||
        access.canList ||
        access.canView ||
        access.canCreate
      ) {
        if (access.module.systemType === SYSTEM_TYPES.ADMIN_DASHBOARD) {
          systemSummary.adminDashboardModules += 1;
        } else {
          systemSummary.appModules += 1;
        }
      }
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      isSystemRole: this.protectedRoleCodes.has(role.code),
      userCount: role.stationAccesses.length,
      moduleCounts: systemSummary,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private groupModulesBySystem(
    modules: Array<
      | {
          code: string;
          name: string;
          description: string | null;
          routePath: string | null;
          sortOrder: number;
          systemType: SystemType;
        }
      | ({
          code: string;
          name: string;
          description: string | null;
          routePath: string | null;
          sortOrder: number;
          systemType: SystemType;
        } & {
          permissions: {
            canRead: boolean;
            canWrite: boolean;
            canEdit: boolean;
            canDelete: boolean;
          };
        })
    >,
  ) {
    const grouped = new Map<
      SystemType,
      Array<
        | {
            code: string;
            name: string;
            description: string | null;
            routePath: string | null;
            sortOrder: number;
            systemType: SystemType;
          }
        | ({
            code: string;
            name: string;
            description: string | null;
            routePath: string | null;
            sortOrder: number;
            systemType: SystemType;
          } & {
            permissions: {
              canRead: boolean;
              canWrite: boolean;
              canEdit: boolean;
              canDelete: boolean;
            };
          })
      >
    >();

    for (const module of modules) {
      const bucket = grouped.get(module.systemType) ?? [];
      bucket.push(module);
      grouped.set(module.systemType, bucket);
    }

    return Array.from(grouped.entries()).map(([systemType, entries]) => ({
      systemType,
      label:
        systemType === SYSTEM_TYPES.ADMIN_DASHBOARD
          ? 'Admin Dashboard'
          : 'Mobile App',
      modules: entries,
    }));
  }

  private getStationId(user: AuthenticatedUser) {
    if (!user.activeStationId) {
      throw new NotFoundException(
        'An active station is required for access control management',
      );
    }

    return user.activeStationId;
  }

  private async resolveRoleCode(
    preferredCode: string | undefined,
    fallbackName: string,
    currentRoleId?: string,
  ) {
    const desiredBase = this.normalizeRoleCode(
      preferredCode?.trim() || fallbackName,
    );

    let candidate = desiredBase;
    let suffix = 1;

    while (true) {
      const existing = await this.prisma.role.findFirst({
        where: {
          code: candidate,
          ...(currentRoleId
            ? {
                NOT: {
                  id: currentRoleId,
                },
              }
            : {}),
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
      candidate = `${desiredBase}_${suffix}`;
    }
  }

  private normalizeRoleCode(value: string) {
    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return normalized.length > 0 ? normalized : 'CUSTOM_ROLE';
  }

  private handleUniqueConstraint(error: unknown, fallbackMessage: string) {
    if (
      typeof error === 'object' &&
      error != null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(fallbackMessage);
    }
  }
}
