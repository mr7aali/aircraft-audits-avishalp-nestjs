import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { SystemType } from '../../generated/prisma-client/enums.js';

@Injectable()
export class StationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyStations(user: AuthenticatedUser) {
    await this.ensureSingleDefaultAccess(user.id);

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

    return {
      stations,
      autoSelectSuggested: accesses.length === 1,
    };
  }

  async selectStation(user: AuthenticatedUser, stationId: string) {
    await this.ensureSingleDefaultAccess(user.id);

    const access = await this.prisma.userStationAccess.findUnique({
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
      throw new ForbiddenException(
        'Station is not assigned to the authenticated user',
      );
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
    await this.ensureSingleDefaultAccess(user.id);

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

    if (!access || !access.isActive || !session.activeStation.isActive) {
      await this.prisma.authSession.update({
        where: { id: user.sessionId },
        data: { activeStationId: null },
      });
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

  private async ensureSingleDefaultAccess(userId: string) {
    const accesses = await this.prisma.userStationAccess.findMany({
      where: {
        userId,
        isActive: true,
        station: {
          isActive: true,
        },
      },
      select: {
        stationId: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (accesses.length === 0) {
      return;
    }

    if (accesses.length === 1) {
      if (accesses[0].isDefault) {
        return;
      }

      await this.prisma.userStationAccess.update({
        where: {
          userId_stationId: {
            userId,
            stationId: accesses[0].stationId,
          },
        },
        data: {
          isDefault: true,
        },
      });
      return;
    }

    const defaultCount = accesses.filter((entry) => entry.isDefault).length;

    if (defaultCount === 1) {
      return;
    }

    const defaultStationId =
      accesses.find((entry) => entry.isDefault)?.stationId ?? accesses[0].stationId;

    await this.prisma.$transaction([
      this.prisma.userStationAccess.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isDefault: false,
        },
      }),
      this.prisma.userStationAccess.update({
        where: {
          userId_stationId: {
            userId,
            stationId: defaultStationId,
          },
        },
        data: {
          isDefault: true,
        },
      }),
    ]);
  }
}
