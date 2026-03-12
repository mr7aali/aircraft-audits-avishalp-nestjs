import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';

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

    const stations = accesses.map((entry) => ({
      stationId: entry.stationId,
      stationCode: entry.station.code,
      stationName: entry.station.name,
      timezone: entry.station.timezone,
      roleCode: entry.role.code,
      roleName: entry.role.name,
      isDefault: entry.isDefault,
    }));

    return {
      stations,
      autoSelectSuggested: stations.length === 1,
    };
  }

  async selectStation(user: AuthenticatedUser, stationId: string) {
    const access = await this.prisma.userStationAccess.findUnique({
      where: {
        userId_stationId: {
          userId: user.id,
          stationId,
        },
      },
      include: {
        station: true,
        role: true,
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
        role: true,
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
    };
  }
}
