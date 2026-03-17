import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

interface ZonedDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

@Injectable()
export class ShiftContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCurrentShiftOccurrenceId(
    stationId: string,
    at = new Date(),
  ): Promise<string | null> {
    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: {
        id: true,
        timezone: true,
        shiftDefinitions: {
          where: { isActive: true },
          orderBy: { startsLocalMinutes: 'asc' },
          select: {
            id: true,
            startsLocalMinutes: true,
            endsLocalMinutes: true,
          },
        },
      },
    });

    if (!station || !station.shiftDefinitions.length) {
      return null;
    }

    const localParts = this.getZonedDateParts(at, station.timezone);
    const localMinutes = localParts.hour * 60 + localParts.minute;
    const shiftDefinition = station.shiftDefinitions.find((definition) =>
      this.isWithinShift(
        definition.startsLocalMinutes,
        definition.endsLocalMinutes,
        localMinutes,
      ),
    );

    if (!shiftDefinition) {
      return null;
    }

    const businessDate = new Date(
      Date.UTC(localParts.year, localParts.month - 1, localParts.day),
    );

    const occurrence = await this.prisma.shiftOccurrence.findUnique({
      where: {
        stationId_shiftDefinitionId_businessDate: {
          stationId,
          shiftDefinitionId: shiftDefinition.id,
          businessDate,
        },
      },
      select: { id: true },
    });

    return occurrence?.id ?? null;
  }

  private isWithinShift(
    startsLocalMinutes: number,
    endsLocalMinutes: number,
    currentLocalMinutes: number,
  ): boolean {
    if (startsLocalMinutes === endsLocalMinutes) {
      return true;
    }

    if (startsLocalMinutes < endsLocalMinutes) {
      return (
        currentLocalMinutes >= startsLocalMinutes &&
        currentLocalMinutes < endsLocalMinutes
      );
    }

    return (
      currentLocalMinutes >= startsLocalMinutes ||
      currentLocalMinutes < endsLocalMinutes
    );
  }

  private getZonedDateParts(date: Date, timezone: string): ZonedDateParts {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, Number(part.value)]),
    );

    return {
      year: values.year,
      month: values.month,
      day: values.day,
      hour: values.hour,
      minute: values.minute,
    };
  }
}
