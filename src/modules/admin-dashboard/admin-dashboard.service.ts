import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma-client/client.js';
import {
  HiddenObjectAuditStatus,
  HiddenObjectLocationStatus,
  PassFail,
  YesNoNa,
} from '../../generated/prisma-client/enums.js';
import { buildPaginatedResult } from '../../common/utils/pagination.util.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AdminAuditType,
  AdminDashboardAuditRecordsQueryDto,
  AdminDashboardOverviewQueryDto,
} from './dto/admin-dashboard-query.dto.js';

type AuditRecordItem = {
  id: string;
  auditType: AdminAuditType;
  title: string;
  occurredAt: Date;
  auditorName: string;
  gateCode: string;
  score: number;
  status: 'PASS' | 'FAIL' | 'SETUP' | 'ACTIVE';
  summary: string;
};

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    user: AuthenticatedUser,
    query: AdminDashboardOverviewQueryDto,
  ) {
    const stationId = this.getStationId(user);
    const [
      station,
      gateCount,
      cleanTypeCount,
      aircraftTypeCount,
      fleetAircraftCount,
      cabinQuality,
      cabinSecurity,
      hiddenObject,
      lavSafety,
    ] = await Promise.all([
      this.prisma.station.findUnique({ where: { id: stationId } }),
      this.prisma.gate.count({ where: { stationId, isActive: true } }),
      this.prisma.cleanType.count({ where: { isActive: true } }),
      this.prisma.aircraftType.count({ where: { isActive: true } }),
      this.prisma.fleetAircraft.count({ where: { isActive: true } }),
      this.prisma.cabinQualityAudit.findMany({
        where: this.buildCabinQualityWhere(stationId, query),
        include: { responses: true },
      }),
      this.prisma.cabinSecuritySearchTraining.findMany({
        where: this.buildCabinSecurityWhere(stationId, query),
        include: { results: true },
      }),
      this.prisma.hiddenObjectAuditSession.findMany({
        where: this.buildHiddenObjectWhere(stationId, query),
        include: { locations: true },
      }),
      this.prisma.lavSafetyObservation.findMany({
        where: this.buildLavSafetyWhere(stationId, query),
        include: { responses: true },
      }),
    ]);

    const records = [
      ...cabinQuality.map((item) => this.toCabinQualityRecord(item)),
      ...cabinSecurity.map((item) => this.toCabinSecurityRecord(item)),
      ...hiddenObject.map((item) => this.toHiddenObjectRecord(item)),
      ...lavSafety.map((item) => this.toLavSafetyRecord(item)),
    ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const trendByDate = new Map<
      string,
      {
        date: string;
        cabinQuality: number;
        cabinSecurity: number;
        hiddenObject: number;
        lavSafety: number;
      }
    >();

    for (const record of records) {
      const date = record.occurredAt.toISOString().slice(0, 10);
      const existing = trendByDate.get(date) ?? {
        date,
        cabinQuality: 0,
        cabinSecurity: 0,
        hiddenObject: 0,
        lavSafety: 0,
      };

      if (record.auditType === AdminAuditType.CABIN_QUALITY) {
        existing.cabinQuality += 1;
      } else if (record.auditType === AdminAuditType.CABIN_SECURITY) {
        existing.cabinSecurity += 1;
      } else if (record.auditType === AdminAuditType.HIDDEN_OBJECT) {
        existing.hiddenObject += 1;
      } else {
        existing.lavSafety += 1;
      }

      trendByDate.set(date, existing);
    }

    return {
      station,
      masterData: {
        gates: gateCount,
        cleanTypes: cleanTypeCount,
        aircraftTypes: aircraftTypeCount,
        fleetAircraft: fleetAircraftCount,
      },
      totals: {
        totalAudits: records.length,
        cabinQuality: cabinQuality.length,
        cabinSecurity: cabinSecurity.length,
        hiddenObject: hiddenObject.length,
        lavSafety: lavSafety.length,
      },
      compliance: {
        overallScore: this.averageScore(records.map((item) => item.score)),
        cabinQualityScore: this.averageScore(
          cabinQuality.map((item) => this.scoreCabinQuality(item.responses).score),
        ),
        cabinSecurityScore: this.averageScore(
          cabinSecurity.map((item) => this.scoreCabinSecurity(item.results).score),
        ),
        hiddenObjectScore: this.averageScore(
          hiddenObject.map((item) => this.scoreHiddenObject(item).score),
        ),
        lavSafetyScore: this.averageScore(
          lavSafety.map((item) => this.scoreLavSafety(item.responses).score),
        ),
      },
      attentionRequired: {
        total: records.filter((item) => item.status === 'FAIL').length,
        cabinQuality: cabinQuality.filter(
          (item) => this.scoreCabinQuality(item.responses).status === 'FAIL',
        ).length,
        cabinSecurity: cabinSecurity.filter(
          (item) => this.scoreCabinSecurity(item.results).status === 'FAIL',
        ).length,
        hiddenObject: hiddenObject.filter(
          (item) => this.scoreHiddenObject(item).status === 'FAIL',
        ).length,
        lavSafety: lavSafety.filter(
          (item) => this.scoreLavSafety(item.responses).status === 'FAIL',
        ).length,
      },
      trend: Array.from(trendByDate.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
      recentActivity: records.slice(0, 8),
    };
  }

  async getAuditRecords(
    user: AuthenticatedUser,
    query: AdminDashboardAuditRecordsQueryDto,
  ) {
    const stationId = this.getStationId(user);
    const records: AuditRecordItem[] = [];

    if (!query.auditType || query.auditType === AdminAuditType.CABIN_QUALITY) {
      const items = await this.prisma.cabinQualityAudit.findMany({
        where: this.buildCabinQualityWhere(stationId, query),
        include: { responses: true },
      });
      records.push(...items.map((item) => this.toCabinQualityRecord(item)));
    }

    if (!query.auditType || query.auditType === AdminAuditType.CABIN_SECURITY) {
      const items = await this.prisma.cabinSecuritySearchTraining.findMany({
        where: this.buildCabinSecurityWhere(stationId, query),
        include: { results: true },
      });
      records.push(...items.map((item) => this.toCabinSecurityRecord(item)));
    }

    if (!query.auditType || query.auditType === AdminAuditType.HIDDEN_OBJECT) {
      const items = await this.prisma.hiddenObjectAuditSession.findMany({
        where: this.buildHiddenObjectWhere(stationId, query),
        include: { locations: true },
      });
      records.push(...items.map((item) => this.toHiddenObjectRecord(item)));
    }

    if (!query.auditType || query.auditType === AdminAuditType.LAV_SAFETY) {
      const items = await this.prisma.lavSafetyObservation.findMany({
        where: this.buildLavSafetyWhere(stationId, query),
        include: { responses: true },
      });
      records.push(...items.map((item) => this.toLavSafetyRecord(item)));
    }

    const normalizedSearch = query.search?.trim().toLowerCase();
    const filtered = (normalizedSearch
      ? records.filter((item) =>
          [
            item.title,
            item.auditorName,
            item.gateCode,
            item.summary,
            item.status,
          ].some((value) => value.toLowerCase().includes(normalizedSearch)),
        )
      : records
    ).sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

    const start = (query.page - 1) * query.limit;
    const pageItems = filtered.slice(start, start + query.limit);

    return buildPaginatedResult(pageItems, filtered.length, query);
  }

  private getStationId(user: AuthenticatedUser) {
    if (!user.activeStationId) {
      throw new ForbiddenException('Active station is required');
    }

    return user.activeStationId;
  }

  private buildCabinQualityWhere(
    stationId: string,
    query: AdminDashboardOverviewQueryDto | AdminDashboardAuditRecordsQueryDto,
  ): Prisma.CabinQualityAuditWhereInput {
    return {
      stationId,
      ...(query.fromDate || query.toDate
        ? {
            auditAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...('gateId' in query && query.gateId ? { gateId: query.gateId } : {}),
    };
  }

  private buildCabinSecurityWhere(
    stationId: string,
    query: AdminDashboardOverviewQueryDto | AdminDashboardAuditRecordsQueryDto,
  ): Prisma.CabinSecuritySearchTrainingWhereInput {
    return {
      stationId,
      ...(query.fromDate || query.toDate
        ? {
            trainingAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...('gateId' in query && query.gateId ? { gateId: query.gateId } : {}),
    };
  }

  private buildLavSafetyWhere(
    stationId: string,
    query: AdminDashboardOverviewQueryDto | AdminDashboardAuditRecordsQueryDto,
  ): Prisma.LavSafetyObservationWhereInput {
    return {
      stationId,
      ...(query.fromDate || query.toDate
        ? {
            observedAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
      ...('gateId' in query && query.gateId ? { gateId: query.gateId } : {}),
    };
  }

  private buildHiddenObjectWhere(
    stationId: string,
    query: AdminDashboardOverviewQueryDto | AdminDashboardAuditRecordsQueryDto,
  ): Prisma.HiddenObjectAuditSessionWhereInput {
    return {
      stationId,
      ...(query.fromDate || query.toDate
        ? {
            sessionAt: {
              ...(query.fromDate ? { gte: new Date(query.fromDate) } : {}),
              ...(query.toDate ? { lte: new Date(query.toDate) } : {}),
            },
          }
        : {}),
    };
  }

  private toCabinQualityRecord(
    item: {
      id: string;
      auditAt: Date;
      auditorNameSnapshot: string;
      gateCodeSnapshot: string;
      cleanTypeSnapshot: string;
      responses: { response: YesNoNa }[];
    },
  ): AuditRecordItem {
    const result = this.scoreCabinQuality(item.responses);
    return {
      id: item.id,
      auditType: AdminAuditType.CABIN_QUALITY,
      title: 'Cabin Quality Audit',
      occurredAt: item.auditAt,
      auditorName: item.auditorNameSnapshot,
      gateCode: item.gateCodeSnapshot,
      score: result.score,
      status: result.status,
      summary: item.cleanTypeSnapshot,
    };
  }

  private toCabinSecurityRecord(
    item: {
      id: string;
      trainingAt: Date;
      auditorNameSnapshot: string;
      gateCodeSnapshot: string;
      shipNumber: string;
      results: { result: PassFail }[];
    },
  ): AuditRecordItem {
    const result = this.scoreCabinSecurity(item.results);
    return {
      id: item.id,
      auditType: AdminAuditType.CABIN_SECURITY,
      title: 'Cabin Security Search Training',
      occurredAt: item.trainingAt,
      auditorName: item.auditorNameSnapshot,
      gateCode: item.gateCodeSnapshot,
      score: result.score,
      status: result.status,
      summary: `Ship ${item.shipNumber}`,
    };
  }

  private toHiddenObjectRecord(
    item: {
      id: string;
      sessionAt: Date;
      status: HiddenObjectAuditStatus;
      auditorNameSnapshot: string;
      shipNumberSnapshot: string;
      aircraftTypeNameSnapshot: string;
      locations: { status: HiddenObjectLocationStatus }[];
    },
  ): AuditRecordItem {
    const result = this.scoreHiddenObject(item);
    return {
      id: item.id,
      auditType: AdminAuditType.HIDDEN_OBJECT,
      title: 'Hidden Object Audit',
      occurredAt: item.sessionAt,
      auditorName: item.auditorNameSnapshot,
      gateCode: 'N/A',
      score: result.score,
      status: result.displayStatus,
      summary: `${item.shipNumberSnapshot} • ${item.aircraftTypeNameSnapshot}`,
    };
  }

  private toLavSafetyRecord(
    item: {
      id: string;
      observedAt: Date;
      auditorNameSnapshot: string;
      gateCodeSnapshot: string;
      driverName: string;
      responses: { response: PassFail }[];
    },
  ): AuditRecordItem {
    const result = this.scoreLavSafety(item.responses);
    return {
      id: item.id,
      auditType: AdminAuditType.LAV_SAFETY,
      title: 'LAV Safety Observation',
      occurredAt: item.observedAt,
      auditorName: item.auditorNameSnapshot,
      gateCode: item.gateCodeSnapshot,
      score: result.score,
      status: result.status,
      summary: item.driverName,
    };
  }

  private scoreCabinQuality(
    responses: { response: YesNoNa }[],
  ): { score: number; status: 'PASS' | 'FAIL' } {
    const applicable = responses.filter((item) => item.response !== YesNoNa.NA);
    const passed = applicable.filter((item) => item.response === YesNoNa.YES).length;
    const failed = applicable.filter((item) => item.response === YesNoNa.NO).length;
    const status: 'PASS' | 'FAIL' = failed > 0 ? 'FAIL' : 'PASS';
    return {
      score:
        applicable.length === 0
          ? 100
          : Math.round((passed / applicable.length) * 100),
      status,
    };
  }

  private scoreCabinSecurity(
    results: { result: PassFail }[],
  ): { score: number; status: 'PASS' | 'FAIL' } {
    const passed = results.filter((item) => item.result === PassFail.PASS).length;
    const failed = results.filter((item) => item.result === PassFail.FAIL).length;
    const total = passed + failed;
    const status: 'PASS' | 'FAIL' = failed > 0 ? 'FAIL' : 'PASS';
    return {
      score: total === 0 ? 100 : Math.round((passed / total) * 100),
      status,
    };
  }

  private scoreLavSafety(
    responses: { response: PassFail }[],
  ): { score: number; status: 'PASS' | 'FAIL' } {
    const passed = responses.filter((item) => item.response === PassFail.PASS).length;
    const failed = responses.filter((item) => item.response === PassFail.FAIL).length;
    const total = passed + failed;
    const status: 'PASS' | 'FAIL' = failed > 0 ? 'FAIL' : 'PASS';
    return {
      score: total === 0 ? 100 : Math.round((passed / total) * 100),
      status,
    };
  }

  private scoreHiddenObject(item: {
    status: HiddenObjectAuditStatus;
    locations: { status: HiddenObjectLocationStatus }[];
  }): {
    score: number;
    status: 'PASS' | 'FAIL';
    displayStatus: 'PASS' | 'FAIL' | 'SETUP' | 'ACTIVE';
  } {
    const found = item.locations.filter(
      (location) => location.status === HiddenObjectLocationStatus.GREEN,
    ).length;
    const notFound = item.locations.filter(
      (location) => location.status === HiddenObjectLocationStatus.RED,
    ).length;
    const total = item.locations.length;
    const finalStatus: 'PASS' | 'FAIL' = notFound > 0 ? 'FAIL' : 'PASS';
    const displayStatus =
      item.status === HiddenObjectAuditStatus.CLOSED
        ? finalStatus
        : item.status === HiddenObjectAuditStatus.ACTIVE
          ? 'ACTIVE'
          : 'SETUP';

    return {
      score: total === 0 ? 0 : Math.round((found / total) * 100),
      status: finalStatus,
      displayStatus,
    };
  }

  private averageScore(scores: number[]) {
    if (scores.length === 0) {
      return 100;
    }

    return Math.round(
      scores.reduce((sum, score) => sum + score, 0) / scores.length,
    );
  }
}

