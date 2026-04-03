import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { SystemType } from '../../generated/prisma-client/enums.js';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStations(user: AuthenticatedUser) {
    const accesses = await this.prisma.userStationAccess.findMany({
      where: {
        userId: user.id,
        isActive: true,
        station: {
          isActive: true,
        },
      },
      include: {
        station: true,
        role: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    const primaryAccess =
      accesses.find((entry) => entry.isDefault) ??
      (accesses.length > 0 ? accesses[0] : null);
    const allActiveStations = await this.prisma.station.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    });

    const assignedStationIds = new Set(
      accesses.map((entry) => entry.stationId),
    );
    const stations = accesses.map((entry) => ({
      stationId: entry.stationId,
      stationCode: entry.station.code,
      stationName: entry.station.name,
      timezone: entry.station.timezone,
      roleCode: entry.role.code,
      roleName: entry.role.name,
      isDefault: entry.isDefault,
      isAssigned: true,
    }));

    if (primaryAccess) {
      for (const station of allActiveStations) {
        if (assignedStationIds.has(station.id)) {
          continue;
        }

        stations.push({
          stationId: station.id,
          stationCode: station.code,
          stationName: station.name,
          timezone: station.timezone,
          roleCode: primaryAccess.role.code,
          roleName: primaryAccess.role.name,
          isDefault: false,
          isAssigned: false,
        });
      }
    }

    return {
      stations,
      autoSelectSuggested:
        assignedStationIds.size == 1 && allActiveStations.length == 1,
    };
  }

  async selectStation(user: AuthenticatedUser, stationId: string) {
    let access = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId,
        },
      },
      include: {
        station: true,
        role: {
          include: {
            moduleAccesses: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    if (!access || !access.isActive || !access.station.isActive) {
      const primaryAccess = await this.prisma.userStationAccess.findFirst({
        where: {
          userId: user.id,
          isActive: true,
          station: {
            isActive: true,
          },
        },
        include: {
          role: true,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });

      const station = await this.prisma.station.findFirst({
        where: {
          id: stationId,
          isActive: true,
        },
      });

      if (!primaryAccess || !station) {
        throw new ForbiddenException(
          'Station is not assigned to the authenticated user',
        );
      }

      access = await this.prisma.userStationAccess.upsert({
        where: {
          userId_stationId: {
            userId: user.id,
            stationId,
          },
        },
        update: {
          roleId: primaryAccess.roleId,
          isActive: true,
        },
        create: {
          userId: user.id,
          stationId,
          roleId: primaryAccess.roleId,
          isDefault: false,
          isActive: true,
        },
        include: {
          station: true,
          role: {
            include: {
              moduleAccesses: {
                include: {
                  module: true,
                },
              },
            },
          },
        },
      });
    }

    await this.prisma.authSession.update({
      where: { id: user.sessionId },
      data: { activeStationId: stationId },
    });

    return {
      stationId: access.stationId,
      stationCode: access.station.code,
      stationName: access.station.name,
      roleCode: access.role.code,
      roleName: access.role.name,
      permissions: this.mapPermissions(access.role.moduleAccesses),
    };
  }

  async getActiveStation(user: AuthenticatedUser) {
    const session = await this.prisma.authSession.findUnique({
      where: { id: user.sessionId },
      include: {
        activeStation: true,
      },
    });

    if (!session?.activeStation) {
      return null;
    }

    const access = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId: session.activeStation.id,
        },
      },
      include: {
        role: {
          include: {
            moduleAccesses: {
              include: {
                module: true,
              },
            },
          },
        },
      },
    });

    if (!access) {
      return null;
    }

    return {
      stationId: session.activeStation.id,
      stationCode: session.activeStation.code,
      stationName: session.activeStation.name,
      timezone: session.activeStation.timezone,
      roleCode: access.role.code,
      roleName: access.role.name,
      permissions: this.mapPermissions(access.role.moduleAccesses),
    };
  }

  private mapPermissions(
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
        routePath: string | null;
      };
    }>,
  ) {
    return moduleAccesses
      .map((item) => ({
        moduleCode: item.module.code,
        moduleName: item.module.name,
        systemType: item.module.systemType,
        routePath: item.module.routePath,
        canRead: item.canRead || item.canList || item.canView,
        canWrite: item.canWrite || item.canCreate,
        canEdit: item.canEdit || item.canCreate,
        canDelete: item.canDelete || item.canCreate,
      }))
      .sort((left, right) => left.moduleName.localeCompare(right.moduleName));
  }
}
