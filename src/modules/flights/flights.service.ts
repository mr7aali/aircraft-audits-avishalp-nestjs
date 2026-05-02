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
type ProviderFlightsPayload = {
  arrivals: ExternalFlightRecord[];
  departures: ExternalFlightRecord[];
};

interface RedisClientLike {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode: 'EX',
    ttlSeconds: number,
  ): Promise<unknown>;
  disconnect(): void;
}

interface FlightView {
  id: string;
  direction: 'arrival' | 'departure';
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
  providerStationCode: string;
  windowStart: string;
  windowEnd: string;
}

interface MemoryCacheEntry {
  value: CachedStationFlights;
  expiresAtMs: number;
}

@Injectable()
export class FlightsService implements OnModuleDestroy {
  private readonly logger = new Logger(FlightsService.name);
  private readonly memoryCache = new Map<string, MemoryCacheEntry>();
  private readonly inFlightRequests = new Map<
    string,
    Promise<CachedStationFlights>
  >();
  private redisClientPromise: Promise<RedisClientLike | null> | null = null;
  private readonly iataToIcao: Record<string, string> = {
    JFK: 'KJFK',
    LAX: 'KLAX',
    ORD: 'KORD',
    ATL: 'KATL',
    DFW: 'KDFW',
    DEN: 'KDEN',
    SFO: 'KSFO',
    SEA: 'KSEA',
    LAS: 'KLAS',
    MIA: 'KMIA',
    CLT: 'KCLT',
    PHX: 'KPHX',
    IAH: 'KIAH',
    MCO: 'KMCO',
    EWR: 'KEWR',
    MSP: 'KMSP',
    DTW: 'KDTW',
    BOS: 'KBOS',
    PHL: 'KPHL',
    LGA: 'KLGA',
    BWI: 'KBWI',
    SLC: 'KSLC',
    SAN: 'KSAN',
    IAD: 'KIAD',
    DCA: 'KDCA',
    MDW: 'KMDW',
    HNL: 'PHNL',
    ANC: 'PANC',
    PDX: 'KPDX',
    STL: 'KSTL',
    LHR: 'EGLL',
    LGW: 'EGKK',
    STN: 'EGSS',
    LTN: 'EGGW',
    MAN: 'EGCC',
    EDI: 'EGPH',
    CDG: 'LFPG',
    ORY: 'LFPO',
    AMS: 'EHAM',
    FRA: 'EDDF',
    MUC: 'EDDM',
    BER: 'EDDB',
    MAD: 'LEMD',
    BCN: 'LEBL',
    FCO: 'LIRF',
    MXP: 'LIMC',
    ZRH: 'LSZH',
    VIE: 'LOWW',
    CPH: 'EKCH',
    ARN: 'ESSA',
    HEL: 'EFHK',
    OSL: 'ENGM',
    LIS: 'LPPT',
    DUB: 'EIDW',
    ATH: 'LGAV',
    IST: 'LTFM',
    SAW: 'LTFJ',
    BRU: 'EBBR',
    WAW: 'EPWA',
    PRG: 'LKPR',
    BUD: 'LHBP',
    OTP: 'LROP',
    SOF: 'LBSF',
    DXB: 'OMDB',
    AUH: 'OMAA',
    DOH: 'OTHH',
    KWI: 'OKBK',
    BAH: 'OBBI',
    AMM: 'OJAI',
    BEY: 'OLBA',
    TLV: 'LLBG',
    RUH: 'OERK',
    JED: 'OEJN',
    MCT: 'OOMS',
    SIN: 'WSSS',
    KUL: 'WMKK',
    BKK: 'VTBS',
    HKG: 'VHHH',
    ICN: 'RKSI',
    NRT: 'RJAA',
    HND: 'RJTT',
    PEK: 'ZBAA',
    PVG: 'ZSPD',
    CAN: 'ZGGG',
    CTU: 'ZUUU',
    XIY: 'ZLXY',
    DEL: 'VIDP',
    BOM: 'VABB',
    MAA: 'VOMM',
    HYD: 'VOHS',
    BLR: 'VOBL',
    CCU: 'VECC',
    CGP: 'VGEG',
    DAC: 'VGHS',
    CMB: 'VCBI',
    KTM: 'VNKT',
    MNL: 'RPLL',
    CGK: 'WIII',
    DPS: 'WADD',
    KHI: 'OPKC',
    LHE: 'OPLA',
    ISB: 'OPIS',
    ZYL: 'VGSY',
    CXB: 'VGCB',
    JSR: 'VGJR',
    BZL: 'VGBR',
    RJH: 'VGRJ',
    CAI: 'HECA',
    JNB: 'FAOR',
    CPT: 'FACT',
    NBO: 'HKJK',
    ADD: 'HAAB',
    LOS: 'DNMM',
    ACC: 'DGAA',
    CMN: 'GMMN',
    TUN: 'DTTA',
    ALG: 'DAAG',
    YYZ: 'CYYZ',
    YVR: 'CYVR',
    YUL: 'CYUL',
    YYC: 'CYYC',
    YEG: 'CYEG',
    GRU: 'SBGR',
    BOG: 'SKBO',
    LIM: 'SPIM',
    SCL: 'SCEL',
    EZE: 'SAEZ',
    MEX: 'MMMX',
    SYD: 'YSSY',
    MEL: 'YMML',
    BNE: 'YBBN',
    AKL: 'NZAA',
  };

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
        airportCode: true,
        name: true,
        timezone: true,
        isActive: true,
      },
    });

    if (!station || !station.isActive) {
      throw new ForbiddenException('Active station is unavailable');
    }

    const stationCode = station.code.trim().toUpperCase();
    const providerStationCode = this.resolveIcaoCode(
      station.airportCode || stationCode,
    );
    const timeWindow = this.buildProviderTimeWindow(station.timezone);
    const cacheKey = `flights:active:v2:${stationCode}:${providerStationCode}`;
    const cached =
      query.forceRefresh === true
        ? null
        : await this.getCachedFlights(cacheKey);

    if (cached) {
      return this.toClientResponse(cached, 'cache');
    }

    const fresh = await this.loadFreshFlights(cacheKey, {
      stationId: station.id,
      stationCode,
      providerStationCode,
      stationName: station.name,
      timezone: station.timezone,
      windowStart: timeWindow.startStr,
      windowEnd: timeWindow.endStr,
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
      providerStationCode: string;
      windowStart: string;
      windowEnd: string;
    },
  ) {
    const existing = this.inFlightRequests.get(cacheKey);
    if (existing) {
      return existing;
    }

    const request = (async () => {
      const rawFlights = await this.fetchProviderFlights({
        icaoCode: context.providerStationCode,
        windowStart: context.windowStart,
        windowEnd: context.windowEnd,
      });
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

  private async fetchProviderFlights({
    icaoCode,
    windowStart,
    windowEnd,
  }: {
    icaoCode: string;
    windowStart: string;
    windowEnd: string;
  }): Promise<ProviderFlightsPayload> {
    const apiKey =
      this.configService.get<string>('aerodatabox.apiKey', { infer: true }) ??
      '';
    if (!apiKey.trim()) {
      throw new ServiceUnavailableException(
        'Flight provider is not configured on the server',
      );
    }

    const baseUrl =
      this.configService.get<string>('aerodatabox.baseUrl', {
        infer: true,
      }) ?? 'https://aerodatabox.p.rapidapi.com/flights/airports/icao';
    const rapidApiHost =
      this.configService.get<string>('aerodatabox.host', { infer: true }) ??
      'aerodatabox.p.rapidapi.com';
    const configuredTimeoutMs = this.configService.get<number>(
      'flights.providerTimeoutMs',
      {
        infer: true,
      },
    );
    const timeoutMs = Number.isFinite(Number(configuredTimeoutMs))
      ? Number(configuredTimeoutMs)
      : 15000;

    const url = new URL(
      `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(
        icaoCode,
      )}/${encodeURIComponent(windowStart)}/${encodeURIComponent(windowEnd)}`,
    );
    url.searchParams.set('withLeg', 'true');
    url.searchParams.set('direction', 'Both');
    url.searchParams.set('withCancelled', 'false');
    url.searchParams.set('withCodeshared', 'true');
    url.searchParams.set('withCargo', 'false');
    url.searchParams.set('withPrivate', 'false');

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'x-rapidapi-host': rapidApiHost.trim(),
          'x-rapidapi-key': apiKey.trim(),
        },
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

    if (typeof payload !== 'object' || payload === null) {
      throw new BadGatewayException(
        'Flight provider returned an invalid payload',
      );
    }

    const responsePayload = payload as Record<string, unknown>;
    return {
      arrivals: Array.isArray(responsePayload.arrivals)
        ? (responsePayload.arrivals as ExternalFlightRecord[])
        : [],
      departures: Array.isArray(responsePayload.departures)
        ? (responsePayload.departures as ExternalFlightRecord[])
        : [],
    };
  }

  private normalizeFlights(
    rawFlights: ProviderFlightsPayload,
    context: {
      stationId: string;
      stationCode: string;
      stationName: string;
      timezone: string;
      providerStationCode: string;
      windowStart: string;
      windowEnd: string;
    },
  ): CachedStationFlights {
    const mappedFlights = [
      ...rawFlights.arrivals.map((entry) =>
        this.mapAeroDataBoxFlight(entry, 'arrival', context),
      ),
      ...rawFlights.departures.map((entry) =>
        this.mapAeroDataBoxFlight(entry, 'departure', context),
      ),
    ].filter((entry): entry is FlightView => entry != null);

    const deduplicated = new Map<string, FlightView>();
    for (const flight of mappedFlights) {
      if (!flight.id.trim()) {
        continue;
      }
      if (!deduplicated.has(flight.id)) {
        deduplicated.set(flight.id, flight);
      }
    }

    const flights = [...deduplicated.values()];
    const arrivals = flights.filter((flight) => flight.direction === 'arrival');
    const departures = flights.filter(
      (flight) => flight.direction === 'departure',
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
      providerStationCode: context.providerStationCode,
      windowStart: context.windowStart,
      windowEnd: context.windowEnd,
    };
  }

  private mapAeroDataBoxFlight(
    entry: ExternalFlightRecord,
    direction: 'arrival' | 'departure',
    context: {
      stationCode: string;
      stationName: string;
      providerStationCode: string;
    },
  ): FlightView {
    const airline = this.asRecord(entry.airline);
    const departure = this.asRecord(entry.departure);
    const arrival = this.asRecord(entry.arrival);
    const aircraft = this.asRecord(entry.aircraft);
    const departureAirport = this.asRecord(departure.airport);
    const arrivalAirport = this.asRecord(arrival.airport);

    const flightNumber =
      this.asString(entry.number) || this.asString(entry.iataNumber) || 'N/A';
    const departureTime =
      this.parseDateTime(this.extractProviderTime(departure.scheduledTime)) ??
      this.parseDateTime(this.extractProviderTime(departure.revisedTime)) ??
      this.parseDateTime(this.extractProviderTime(departure.runwayTime));
    const arrivalTime =
      this.parseDateTime(this.extractProviderTime(arrival.scheduledTime)) ??
      this.parseDateTime(this.extractProviderTime(arrival.revisedTime)) ??
      this.parseDateTime(this.extractProviderTime(arrival.runwayTime));

    const aircraftRegistration =
      this.asString(aircraft.reg) ||
      this.asString(aircraft.registration) ||
      this.asString(aircraft.tail) ||
      this.asString(aircraft.number) ||
      this.asString(entry.reg) ||
      this.asString(entry.registration);
    const shipNumber =
      this.asString(aircraft.modeS) ||
      this.asString(aircraft.modes) ||
      this.asString(aircraft.mode_s) ||
      this.asString(aircraft.icao24) ||
      this.asString(aircraft.hex) ||
      this.asString(aircraft.serialNo) ||
      this.asString(entry.modeS) ||
      this.asString(entry.icao24) ||
      this.asString(entry.hex) ||
      aircraftRegistration ||
      'N/A';
    const status = this.normalizeAeroDataBoxStatus(entry, direction);
    const anchor = direction === 'arrival' ? arrivalTime : departureTime;
    const departureIata = this.resolveAirportCode({
      airport: departureAirport,
      direction,
      stationSide: 'departure',
      context,
    });
    const arrivalIata = this.resolveAirportCode({
      airport: arrivalAirport,
      direction,
      stationSide: 'arrival',
      context,
    });
    const departureGate =
      this.asString(departure.gate) || this.asString(arrival.gate) || '—';
    const arrivalGate =
      this.asString(arrival.gate) || this.asString(departure.gate) || '—';
    const departureTerminal =
      this.asString(departure.terminal) || this.asString(arrival.terminal) || '—';
    const arrivalTerminal =
      this.asString(arrival.terminal) || this.asString(departure.terminal) || '—';

    return {
      id: [
        direction,
        flightNumber.replace(/\s+/g, ''),
        anchor ?? this.asString(entry.id) ?? '',
      ].join('|'),
      direction,
      airlineName: this.asString(airline.name) || 'Unknown Airline',
      flightNumber,
      departureAirport:
        this.asString(departureAirport.name) ||
        (direction === 'departure' ? context.stationName : '—'),
      departureIata,
      departureTime,
      departureTerminal,
      departureGate,
      arrivalAirport:
        this.asString(arrivalAirport.name) ||
        (direction === 'arrival' ? context.stationName : '—'),
      arrivalIata,
      arrivalTime,
      arrivalTerminal,
      arrivalGate,
      status,
      shipNumber,
    };
  }

  private resolveAirportCode({
    airport,
    direction,
    stationSide,
    context,
  }: {
    airport: ExternalFlightRecord;
    direction: 'arrival' | 'departure';
    stationSide: 'arrival' | 'departure';
    context: {
      stationCode: string;
      providerStationCode: string;
    };
  }) {
    const iata = this.asString(airport.iata);
    const icao = this.asString(airport.icao);
    if (iata) {
      return iata;
    }
    if (icao && icao.toUpperCase() !== context.providerStationCode) {
      return icao;
    }
    if (direction === stationSide) {
      return context.stationCode;
    }
    return icao || '—';
  }

  private normalizeAeroDataBoxStatus(
    entry: ExternalFlightRecord,
    direction: 'arrival' | 'departure',
  ) {
    const rawStatus = this.asString(entry.status).toLowerCase();
    const departure = this.asRecord(entry.departure);
    const arrival = this.asRecord(entry.arrival);
    const landedAt =
      this.extractProviderTime(arrival.runwayTime) ||
      this.extractProviderTime(arrival.actualTime);
    const departedAt =
      this.extractProviderTime(departure.runwayTime) ||
      this.extractProviderTime(departure.actualTime);

    if (rawStatus.includes('cancel')) {
      return 'cancelled';
    }
    if (rawStatus.includes('delay')) {
      return 'delayed';
    }
    if (rawStatus.includes('land') || rawStatus.includes('arrived')) {
      return 'landed';
    }
    if (
      rawStatus.includes('ground') ||
      rawStatus.includes('boarding') ||
      rawStatus.includes('taxi')
    ) {
      return 'on-ground';
    }
    if (
      rawStatus.includes('depart') ||
      rawStatus.includes('airborne') ||
      rawStatus.includes('en-route')
    ) {
      return 'departed';
    }
    if (direction === 'arrival' && landedAt) {
      return 'on-ground';
    }
    if (direction === 'departure' && departedAt) {
      return 'departed';
    }
    return direction === 'arrival' ? 'approaching' : 'scheduled';
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
      providerStationCode: payload.providerStationCode,
      windowStart: payload.windowStart,
      windowEnd: payload.windowEnd,
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
        this.logger.warn(
          'Redis client initialization failed, using memory cache',
        );
        return null;
      }
    })();

    return this.redisClientPromise;
  }

  private getCacheTtlSeconds() {
    const configuredValue = this.configService.get<number>(
      'flights.cacheTtlSeconds',
      {
        infer: true,
      },
    );
    const configured = Number(configuredValue);
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

  private resolveIcaoCode(stationCode: string) {
    const normalized = stationCode.trim().toUpperCase();
    if (normalized.length === 4) {
      return normalized;
    }
    return this.iataToIcao[normalized] ?? normalized;
  }

  private buildProviderTimeWindow(timezone: string) {
    const now = new Date();
    const start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const end = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    return {
      startStr: this.formatDateTimeForProvider(start, timezone),
      endStr: this.formatDateTimeForProvider(end, timezone),
    };
  }

  private formatDateTimeForProvider(value: Date, timezone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(value)
      .reduce<Record<string, string>>((accumulator, part) => {
        if (part.type !== 'literal') {
          accumulator[part.type] = part.value;
        }
        return accumulator;
      }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  }

  private extractProviderTime(value: unknown) {
    if (typeof value === 'string') {
      return value;
    }

    const record = this.asRecord(value);
    return this.asString(record.local) || this.asString(record.utc) || null;
  }

  private parseDateTime(value: unknown) {
    const raw = this.asString(value);
    if (!raw) {
      return null;
    }

    const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const parsed = new Date(normalized);
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
