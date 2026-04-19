# Live Ground Board

## Purpose

`Live_ground_board.html` is a standalone client-side operations board for watching airport movement activity in near real time. It renders inbound and outbound flights as cards, exposes a per-flight audit panel, and falls back to demo data when no API key is supplied.

## API Used

### Flight data provider

- Provider: AeroDataBox via RapidAPI
- Base host: `https://aerodatabox.p.rapidapi.com`
- Endpoint used:

```text
GET /flights/airports/icao/{icao}/{from}/{to}
```

### Request headers

```http
x-rapidapi-host: aerodatabox.p.rapidapi.com
x-rapidapi-key: <your RapidAPI key>
```

### Query parameters

- `withLeg=true`
- `direction=Both`
- `withCancelled=false`
- `withCodeshared=true`
- `withCargo=false`
- `withPrivate=false`

### Example request

```text
https://aerodatabox.p.rapidapi.com/flights/airports/icao/VGHS/2026-04-19T09:00/2026-04-19T15:00?withLeg=true&direction=Both&withCancelled=false&withCodeshared=true&withCargo=false&withPrivate=false
```

## Frontend Approach

### 1. Single-file client app

The page is intentionally self-contained:

- HTML for layout
- CSS for the board UI
- Vanilla JavaScript for data loading, normalization, filtering, and live refresh

This makes it easy to open locally, test quickly, or hand off without wiring it into the NestJS app first.

### 2. Airport code normalization

The UI accepts either:

- 3-letter IATA codes such as `JFK`
- 4-letter ICAO codes such as `KJFK`

An internal lookup table converts common IATA inputs into ICAO before calling AeroDataBox, because the endpoint requires ICAO airport identifiers.

### 3. Time window construction

The board builds an explicit `{from}` and `{to}` window from:

- selected date
- selected start time
- selected end time

If the end time is earlier than the start time, the code treats the range as an overnight window and rolls the end date forward by one day. The `Now +/-3h` quick action also uses a real six-hour rolling window and keeps the displayed date aligned with the start of that range.

### 4. Response normalization

The AeroDataBox response is normalized into a UI-friendly flight model:

- `_direction`: `arrival` or `departure`
- `_status`: `approaching`, `landed`, `on-ground`, or `departed`
- `_landedAt`
- `_departedAt`
- `_scheduledArr`
- `_scheduledDep`
- `_arrDelay`
- `_depDelay`
- route and aircraft metadata

This abstraction lets the rest of the page render from a consistent object shape instead of juggling raw API nesting everywhere.

### 5. Status model

The page applies different rules for arrivals and departures:

- Arrivals use `approaching` before touchdown.
- Arrivals use `landed` after touchdown.
- Arrivals use `on-ground` when the API reports ground or taxi states.
- Departures use `on-ground` until an outbound actual or runway departure time exists.
- Departures use `departed` once that outbound time is available.

This avoids a previous bug where arrivals could be mislabeled as departed because arrival timestamps were being reused as outbound departure timestamps.

### 6. Safe rendering

Flight and raw-response fields are rendered into `innerHTML`, so the page now escapes API-derived text before inserting it. That prevents HTML/script injection through airline names, airport names, registration values, or raw JSON.

### 7. Demo fallback

If no RapidAPI key is entered, the page switches to a local demo dataset. Demo mode still updates the board periodically so the UI remains explorable without external credentials.

## Audit Fixes Applied

The code review and repair pass fixed these issues:

- Corrected origin/destination mapping for both arrivals and departures.
- Stopped treating arrival timestamps as outbound departure timestamps.
- Made the audit timeline direction-aware so departures no longer show an arrival-style flow.
- Fixed fallback text paths where `"Pending"` never appeared because `fmt()` always returned a truthy placeholder.
- Fixed demo mode stop behavior so `Stop` clears both live and demo refresh timers.
- Fixed time-window handling for overnight ranges and the `Now +/-3h` shortcut.
- Escaped API-driven text before injecting it into HTML.
- Preserved audit-panel behavior when a previously selected flight disappears after refresh.

## Known Data Limits

Some turnaround details cannot always be inferred from a single AeroDataBox arrival/departure response:

- An arrival record does not always include the next outbound leg from the same aircraft.
- A departure record does not inherently tell you when that aircraft previously landed at the same airport.

Because of that, the board shows a `Next Leg` placeholder when no linked outbound movement is present instead of inventing turnaround data.

## Browser APIs Used

- `fetch()` for HTTP requests
- `setInterval()` for live refresh
- `Date` for window building and timestamp formatting
- DOM APIs such as `querySelectorAll`, `getElementById`, and `addEventListener`

## Operational Notes

- Without an API key, the board runs in demo mode only.
- With an API key, live refresh polls every 30 seconds.
- Demo mode refreshes every 10 seconds.
