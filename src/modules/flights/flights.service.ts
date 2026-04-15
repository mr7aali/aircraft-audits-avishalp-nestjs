import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthenticatedUser } from '../../common/types/authenticated-user.type.js';
import { ListStationFlightsDto } from './dto/list-station-flights.dto.js';

type ExternalFlightRecord = Record<string, unknown>;

interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
  disconnect(): void;
}

interface FlightView {
  airlineName: string;
  flightNumber: string;
  departureAirport: string;
  departureIata: string;
  departureTime: string | null;
  departureTerminal: string;
  departureGate: string;
  arrivalAirport: string;
  arrivalIata: string;
  arrivalTime: string | null;
  arrivalTerminal: string;
  arrivalGate: string;
  status: string;
  shipNumber: string;
}

interface CachedStationFlights {
  stationId: string;
  stationCode: string;
  stationName: string;
  timezone: string;
  fetchedAt: string;
  expiresAt: string;
  arrivals: FlightView[];
  departures: FlightView[];
  totalFlights: number;
}

interface MemoryCacheEntry {
  value: CachedStationFlights;
  expiresAtMs: number;
}

@Injectable()
export class FlightsService implements OnModuleDestroy {
  private readonly logger = new Logger(FlightsService.name);
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private readonly inFlightRequests = new Map<string, Promise<CachedStationFlights>>();
  private redisClientPromise: Promise<RedisClientLike | null> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleDestroy() {
    const redis = await this.redisClientPromise;
    redis?.disconnect();
  }

  async getActiveFlightsForStation(
    user: AuthenticatedUser,
    query: ListStationFlightsDto,
  ): Promise<Record<string, unknown>> {
    const stationId = user.activeStationId?.trim();
    if (!stationId) {
      throw new ForbiddenException('No active station selected');
    }

    const station = await this.prisma.station.findUnique({
      where: { id: stationId },
      select: {
        id: true,
        code: true,
        name: true,
        timezone: true,
        isActive: true,
      },
    });

    if (!station || !station.isActive) {
      throw new ForbiddenException('Active station is unavailable');
    }

    const stationCode = station.code.trim().toUpperCase();
    const limit = this.resolveLimit(query.limit);
    const cacheKey = `flights:active:${stationCode}:limit:${limit}`;
    const cached =
      query.forceRefresh === true ? null : await this.getCachedFlights(cacheKey);

    if (cached) {
      return this.toClientResponse(cached, 'cache');
    }

    const fresh = await this.loadFreshFlights(cacheKey, {
      stationId: station.id,
      stationCode,
      stationName: station.name,
      timezone: station.timezone,
      limit,
    });

    return this.toClientResponse(fresh, 'origin');
  }

  private async loadFreshFlights(
    cacheKey: string,
    context: {
      stationId: string;
      stationCode: string;
      stationName: string;
      timezone: string;
      limit: number;
    },
  ) {
    const existing = this.inFlightRequests.get(cacheKey);
    if (existing) {
      return existing;
    }

    const request = (async () => {
      const rawFlights = await this.fetchProviderFlights(
        context.stationCode,
        context.limit,
      );
      const cached = this.normalizeFlights(rawFlights, context);
      await this.setCachedFlights(cacheKey, cached);
      return cached;
    })();

    this.inFlightRequests.set(cacheKey, request);

    try {
      return await request;
    } finally {
      if (this.inFlightRequests.get(cacheKey) === request) {
        this.inFlightRequests.delete(cacheKey);
      }
    }
  }

  private async fetchProviderFlights(stationCode: string, limit: number) {
    const activeStatus =
      this.configService.get<string>('aviationstack.activeStatus', {
        infer: true,
      }) ?? 'active';

    const firstAttempt = await this.requestProvider({
      stationCode,
      limit,
      flightStatus: activeStatus.trim() || undefined,
    });

    if (firstAttempt.length > 0) {
      return firstAttempt;
    }

    return this.requestProvider({ stationCode, limit });
  }

  private async requestProvider({
    stationCode,
    limit,
    flightStatus,
  }: {
    stationCode: string;
    limit: number;
    flightStatus?: string;
  }) {
    const apiKey =
      this.configService.get<string>('aviationstack.apiKey', { infer: true }) ??
      '';
    if (!apiKey.trim()) {
      throw new ServiceUnavailableException(
        'Flight provider is not configured on the server',
      );
    }

    const baseUrl =
      this.configService.get<string>('aviationstack.baseUrl', {
        infer: true,
      }) ?? 'http://api.aviationstack.com/v1/flights';
    const timeoutMs =
      this.configService.get<number>('flights.providerTimeoutMs', {
        infer: true,
      }) ?? 15000;

    const url = new URL(baseUrl);
    url.searchParams.set('access_key', apiKey.trim());
    url.searchParams.set('arr_iata', stationCode);
    url.searchParams.set('limit', String(limit));

    if ((flightStatus?.trim().length ?? 0) > 0) {
      url.searchParams.set('flight_status', flightStatus!.trim());
    }

    let response: Response;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new BadGatewayException('Unable to reach the flight provider');
    }

    if (!response.ok) {
      throw new BadGatewayException(
        `Flight provider request failed with status ${response.status}`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new BadGatewayException('Flight provider returned invalid JSON');
    }

    if (
      typeof payload === 'object' &&
      payload !== null &&
      'error' in payload &&
      payload.error
    ) {
      const providerError = payload.error as Record<string, unknown>;
      const message =
        typeof providerError.message === 'string' &&
        providerError.message.trim().length > 0
          ? providerError.message.trim()
          : 'Flight provider returned an error';
      throw new BadGatewayException(message);
    }

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('data' in payload) ||
      !Array.isArray((payload as { data?: unknown }).data)
    ) {
      throw new BadGatewayException('Flight provider returned an invalid payload');
    }

    return (payload as { data: ExternalFlightRecord[] }).data;
  }

  private normalizeFlights(
    rawFlights: ExternalFlightRecord[],
    context: {
      stationId: string;
      stationCode: string;
      stationName: string;
      timezone: string;
    },
  ): CachedStationFlights {
    const mappedFlights = rawFlights
      .map((entry) => this.mapExternalFlight(entry))
      .filter((entry): entry is FlightView => entry != null);

    const deduplicated = new Map<string, FlightView>();
    for (const flight of mappedFlights) {
      const flightNumber = flight.flightNumber.trim();
      if (!flightNumber) {
        continue;
      }
      if (!deduplicated.has(flightNumber)) {
        deduplicated.set(flightNumber, flight);
      }
    }

    const stationCode = context.stationCode.trim().toUpperCase();
    const flights = [...deduplicated.values()];
    const arrivals = flights.filter(
      (flight) => flight.arrivalIata.trim().toUpperCase() === stationCode,
    );
    const departures = flights.filter(
      (flight) => flight.departureIata.trim().toUpperCase() === stationCode,
    );

    this.sortFlightsByTime(arrivals, (flight) => flight.arrivalTime);
    this.sortFlightsByTime(departures, (flight) => flight.departureTime);

    const fetchedAt = new Date();
    const expiresAt = new Date(
      fetchedAt.getTime() + this.getCacheTtlSeconds() * 1000,
    );

    return {
      stationId: context.stationId,
      stationCode: context.stationCode,
      stationName: context.stationName,
      timezone: context.timezone,
      fetchedAt: fetchedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      arrivals,
      departures,
      totalFlights: arrivals.length + departures.length,
    };
  }

  private mapExternalFlight(entry: ExternalFlightRecord): FlightView {
    const airline = this.asRecord(entry.airline);
    const flight = this.asRecord(entry.flight);
    const departure = this.asRecord(entry.departure);
    const arrival = this.asRecord(entry.arrival);
    const aircraft = this.asRecord(entry.aircraft);

    const flightIata = this.asString(flight.iata);
    const flightIcao = this.asString(flight.icao);
    const flightNumber = flightIata || flightIcao || 'N/A';

    return {
      airlineName: this.asString(airline.name) || 'Unknown Airline',
      flightNumber,
      departureAirport: this.asString(departure.airport) || 'N/A',
      departureIata: this.asString(departure.iata) || 'N/A',
      departureTime: this.parseDateTime(departure.scheduled),
      departureTerminal: this.asString(departure.terminal) || 'N/A',
      departureGate: this.asString(departure.gate) || 'N/A',
      arrivalAirport: this.asString(arrival.airport) || 'N/A',
      arrivalIata: this.asString(arrival.iata) || 'N/A',
      arrivalTime: this.parseDateTime(arrival.scheduled),
      arrivalTerminal: this.asString(arrival.terminal) || 'N/A',
      arrivalGate: this.asString(arrival.gate) || 'N/A',
      status: this.asString(entry.flight_status) || 'unknown',
      shipNumber: this.asString(aircraft.registration) || 'N/A',
    };
  }

  private sortFlightsByTime(
    flights: FlightView[],
    selector: (flight: FlightView) => string | null,
  ) {
    flights.sort((left, right) => {
      const leftActive = left.status.trim().toLowerCase() === 'active';
      const rightActive = right.status.trim().toLowerCase() === 'active';

      if (leftActive && !rightActive) {
        return -1;
      }
      if (!leftActive && rightActive) {
        return 1;
      }

      const leftTime = selector(left);
      const rightTime = selector(right);
      if (!leftTime && !rightTime) {
        return 0;
      }
      if (!leftTime) {
        return 1;
      }
      if (!rightTime) {
        return -1;
      }
      return leftTime.localeCompare(rightTime);
    });
  }

  private toClientResponse(
    payload: CachedStationFlights,
    source: 'cache' | 'origin',
  ) {
    const ttlSeconds = this.getCacheTtlSeconds();
    const remainingSeconds = this.getRemainingSeconds(payload.expiresAt);

    return {
      stationId: payload.stationId,
      stationCode: payload.stationCode,
      stationName: payload.stationName,
      timezone: payload.timezone,
      arrivals: payload.arrivals,
      departures: payload.departures,
      totalFlights: payload.totalFlights,
      cache: {
        source,
        ttlSeconds,
        remainingSeconds,
        fetchedAt: payload.fetchedAt,
        expiresAt: payload.expiresAt,
        serverTime: new Date().toISOString(),
      },
    };
  }

  private async getCachedFlights(cacheKey: string) {
    const redis = await this.getRedisClient();

    if (redis) {
      try {
        const raw = await redis.get(cacheKey);
        if (raw) {
          return JSON.parse(raw) as CachedStationFlights;
        }
      } catch {
        this.logger.warn(
          `Redis read failed for ${cacheKey}, falling back to memory cache`,
        );
      }
    }

    const memoryEntry = this.memoryCache.get(cacheKey);
    if (!memoryEntry) {
      return null;
    }

    if (memoryEntry.expiresAtMs <= Date.now()) {
      this.memoryCache.delete(cacheKey);
      return null;
    }

    return memoryEntry.value;
  }

  private async setCachedFlights(
    cacheKey: string,
    payload: CachedStationFlights,
  ) {
    const ttlSeconds = this.getCacheTtlSeconds();
    this.memoryCache.set(cacheKey, {
      value: payload,
      expiresAtMs: Date.now() + ttlSeconds * 1000,
    });

    const redis = await this.getRedisClient();
    if (!redis) {
      return;
    }

    try {
      await redis.set(cacheKey, JSON.stringify(payload), 'EX', ttlSeconds);
    } catch {
      this.logger.warn(
        `Redis write failed for ${cacheKey}, using in-memory cache only`,
      );
    }
  }

  private async getRedisClient(): Promise<RedisClientLike | null> {
    if (this.redisClientPromise) {
      return this.redisClientPromise;
    }

    const redisEnabled = this.configService.get<boolean>('redis.enabled', {
      infer: true,
    });
    if (!redisEnabled) {
      this.redisClientPromise = Promise.resolve(null);
      return this.redisClientPromise;
    }

    this.redisClientPromise = (async () => {
      try {
        const RedisModule = await import('ioredis');
        const RedisCtor = RedisModule.default as unknown as new (
          options: Record<string, unknown>,
        ) => RedisClientLike;

        return new RedisCtor({
          host: this.configService.get<string>('redis.host', { infer: true }),
          port: this.configService.get<number>('redis.port', { infer: true }),
          password:
            this.configService.get<string>('redis.password', { infer: true }) ||
            undefined,
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
      } catch {
        this.logger.warn('Redis client initialization failed, using memory cache');
        return null;
      }
    })();

    return this.redisClientPromise;
  }

  private getCacheTtlSeconds() {
    const configured = this.configService.get<number>('flights.cacheTtlSeconds', {
      infer: true,
    });
    if (!configured || !Number.isFinite(configured)) {
      return 300;
    }
    return Math.max(60, Math.trunc(configured));
  }

  private getRemainingSeconds(expiresAtIso: string) {
    const expiresAtMs = Date.parse(expiresAtIso);
    if (Number.isNaN(expiresAtMs)) {
      return this.getCacheTtlSeconds();
    }

    const remainingMs = Math.max(0, expiresAtMs - Date.now());
    return Math.max(0, Math.ceil(remainingMs / 1000));
  }

  private resolveLimit(limit?: number) {
    if (limit && Number.isFinite(limit)) {
      return Math.min(Math.max(Math.trunc(limit), 1), 100);
    }

    const configured = this.configService.get<number>('flights.providerLimit', {
      infer: true,
    });
    if (!configured || !Number.isFinite(configured)) {
      return 100;
    }
    return Math.min(Math.max(Math.trunc(configured), 1), 100);
  }

  private parseDateTime(value: unknown) {
    const raw = this.asString(value);
    if (!raw) {
      return null;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed.toISOString();
  }

  private asString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private asRecord(value: unknown): ExternalFlightRecord {
    return typeof value === 'object' && value !== null
      ? (value as ExternalFlightRecord)
      : {};
  }
}
