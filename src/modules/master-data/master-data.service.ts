import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  getCleanTypes() {
    return this.prisma.cleanType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  getCabinQualityChecklistItems() {
    return this.prisma.cabinQualityChecklistItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getLavSafetyChecklistItems() {
    return this.prisma.lavSafetyChecklistItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getSecuritySearchAreas() {
    return this.prisma.securitySearchArea.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  getGates(stationId: string) {
    return this.prisma.gate.findMany({
      where: {
        stationId,
        isActive: true,
      },
      orderBy: [{ gateCode: 'asc' }],
    });
  }
}
