# AeroDataBox Flight API Usage

## Purpose

The mobile audit tab does not call RapidAPI directly. Flutter calls the NestJS backend route:

```text
GET /api/flights/active
```

The backend resolves the authenticated user's active station, calls AeroDataBox, normalizes the response, caches it, and returns two lists:

```json
{
  "arrivals": [],
  "departures": [],
  "cache": {}
}
```

## Provider Endpoint

```text
GET https://aerodatabox.p.rapidapi.com/flights/airports/icao/{icao}/{start}/{end}
```

Example:

```text
https://aerodatabox.p.rapidapi.com/flights/airports/icao/KJFK/2026-04-19T08:33/2026-04-19T14:33?withLeg=true&direction=Both&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false
```

## Headers

```text
x-rapidapi-host: aerodatabox.p.rapidapi.com
x-rapidapi-key: configured in AERODATABOX_RAPIDAPI_KEY
```

The API key is stored only on the backend in `.env`. It should not be added to Flutter.

## Path Parameters

| Parameter | Example | Description |
| --- | --- | --- |
| `icao` | `KJFK` | ICAO airport code. The backend converts active station IATA codes such as `JFK` to ICAO codes such as `KJFK`. |
| `start` | `2026-04-19T08:33` | Start of the requested local airport time window. |
| `end` | `2026-04-19T14:33` | End of the requested local airport time window. |

## Query Parameters

| Parameter | Value | Reason |
| --- | --- | --- |
| `withLeg` | `true` | Includes departure and arrival leg details. |
| `direction` | `Both` | Returns both arrivals and departures in one provider call. |
| `withCancelled` | `false` | Excludes cancelled flights from the audit list. |
| `withCodeshared` | `true` | Keeps codeshare records available. |
| `withCargo` | `false` | Excludes cargo flights. |
| `withPrivate` | `false` | Excludes private flights. |

## Time Window

The backend builds a rolling 12-hour window around the server's current time:

```text
start = now - 6 hours
end   = now + 6 hours
```

The dates are formatted in the active station timezone from the database, for example `America/New_York` for JFK:

```text
YYYY-MM-DDTHH:mm
```

The backend returns the actual window used as:

```json
{
  "windowStart": "2026-04-19T08:33",
  "windowEnd": "2026-04-19T14:33"
}
```

## Caching

The backend cache key is based on the active station and resolved ICAO code:

```text
flights:active:v2:{stationCode}:{icaoCode}
```

Default TTL:

```text
FLIGHTS_CACHE_TTL_SECONDS=300
```

That means repeated Flutter refreshes reuse the backend cache for about 5 minutes instead of calling RapidAPI every time. Redis is used when enabled; otherwise the service falls back to in-memory cache.

## Normalized Fields Returned To Flutter

Each flight is mapped into the app's existing flight shape:

| Field | Source |
| --- | --- |
| `direction` | Backend assigns `arrival` or `departure` based on provider bucket. |
| `flightNumber` | `number` or `iataNumber`. |
| `airlineName` | `airline.name`. |
| `departureIata` | `departure.airport.iata`, `departure.airport.icao`, or active station code for station-side departures. |
| `arrivalIata` | `arrival.airport.iata`, `arrival.airport.icao`, or active station code for station-side arrivals. |
| `departureTime` | scheduled, revised, or runway departure time. |
| `arrivalTime` | scheduled, revised, or runway arrival time. |
| `departureGate` / `arrivalGate` | Provider gate value when available; otherwise `—`. |
| `shipNumber` | Mode-S/ICAO24/hex when available, then registration fallback. |

If AeroDataBox does not provide a gate, the backend returns `—`. This avoids showing `N/A` as if it were a real gate assignment.
