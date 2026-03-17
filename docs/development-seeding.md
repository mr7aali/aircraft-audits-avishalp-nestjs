# Development Database Seeding Guide

This guide covers the local development database flow for this project: infrastructure startup, Prisma migration, seeding, default login users, station selection, and common recovery steps.

## Scope

This document is for local development only.

- Do not use the seeded users or passwords in production.
- The seed is designed to be re-runnable. Most records are created with Prisma `upsert`, so running the seed again updates the same development records instead of duplicating them.

## Working directory

All commands in this guide assume PowerShell opened in the backend project root:

```powershell
cd d:\app-dev\aircraft\aircraft-audits-avishalp-nestjs
```

If you run commands from the monorepo root instead, prefix them with the backend path or change into the backend directory first.

## What the seed creates

Running `yarn prisma:seed` populates the development database with:

- Core roles: `VP`, `GM`, `DM`, `SUP`, `ALL`, `EMPLOYEE`, `HR_ADMIN`
- Application modules and role-module permissions
- Stations:
  - `JFK` (`John F. Kennedy`)
  - `LAX` (`Los Angeles Intl`)
- Gates for each station: `A1`, `A2`, `B1`
- Master data:
  - clean types
  - cabin quality checklist items
  - lav safety checklist items
  - cabin security search areas
- Development users with station access and roles
- Shift definitions for each station: `MORNING`, `EVENING`, `NIGHT`
- Shift occurrences for the current day at seed time
- A sample direct chat between `sup.user` and `employee.user`

## Important local service credentials

These are the default development values from [`.env.example`](../.env.example) and [`docker-compose.yml`](../docker-compose.yml). If your local `.env` differs, the values in `.env` take precedence at runtime.

### PostgreSQL

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database | `station_audit` |
| Username | `postgres` |
| Password | `postgres` |
| Prisma URL | `postgresql://postgres:postgres@localhost:5432/station_audit?schema=public` |

### Redis

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `6379` |
| Password | empty / not set |

### MailHog

| Field | Value |
| --- | --- |
| SMTP host | `localhost` |
| SMTP port | `1025` |
| Web UI | `http://localhost:8025` |
| Login | none |

### MinIO

| Field | Value |
| --- | --- |
| API endpoint | `http://localhost:9000` |
| Console | `http://localhost:9001` |
| Access key | `minioadmin` |
| Secret key | `minioadmin` |

## Standard development seed flow

### 1. Install dependencies

```powershell
yarn install
```

### 2. Create the local environment file

If `.env` does not exist yet:

```powershell
Copy-Item .env.example .env
```

Important variables for the seed flow:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `REDIS_*`
- `MAIL_*`
- `STORAGE_*`

The default database URL in [`.env.example`](../.env.example) already matches the Docker PostgreSQL container.

### 3. Start local infrastructure

```powershell
yarn docker:up
```

This starts:

- PostgreSQL
- Redis
- MailHog
- MinIO

If this is the first run, wait a few seconds for PostgreSQL to become healthy before running Prisma commands.

### 4. Generate the Prisma client

```powershell
yarn prisma:generate
```

### 5. Apply migrations

```powershell
yarn prisma:migrate
```

This script runs `prisma migrate dev`, which is the development migration flow defined in [`package.json`](../package.json).

### 6. Seed the database

```powershell
yarn prisma:seed
```

This runs the configured seed entry from [`prisma/seed.ts`](../prisma/seed.ts).

### 7. Start the API

```powershell
yarn start:dev
```

Useful local URLs:

- Swagger: `http://localhost:3000/api/docs`
- MailHog UI: `http://localhost:8025`
- MinIO Console: `http://localhost:9001`

## Fast recovery and reset commands

### Re-run only the seed

Use this when the schema is already present and you only want to restore the development records:

```powershell
yarn prisma:seed
```

### Reset the database from scratch

Use this when the schema or data is broken and you want a clean local database:

```powershell
yarn db:reset
```

Notes:

- This is destructive. All local database data will be lost.
- The script is defined as `prisma migrate reset --force`.
- Prisma resets the database, reapplies migrations, and then runs the configured seed because `package.json` defines a Prisma seed command.
- You only need to run `yarn prisma:seed` again after `yarn db:reset` if you intentionally skipped the seed or want to re-run it once more.

## Seeded application login credentials

The seed hashes the same development password for all sample users:

| Field | Value |
| --- | --- |
| Password for all seeded users | `Password@123` |

### Default users

| User ID | Email | Role | Default station | Extra access | Notes |
| --- | --- | --- | --- | --- | --- |
| `vp.user` | `vp.user@example.com` | `VP` | `JFK` | none | Full operational access at JFK |
| `sup.user` | `sup.user@example.com` | `SUP` | `JFK` | `LAX` | Best account to test station switching |
| `employee.user` | `employee.user@example.com` | `EMPLOYEE` | `JFK` | none | Limited role, useful for employee scenarios |
| `hr.user` | `hr.user@example.com` | `HR_ADMIN` | `JFK` | none | Useful for feedback and employee 1:1 access checks |
| `gm.user` | `gm.user@example.com` | `GM` | `LAX` | none | Full operational access at LAX |

## Important login behavior

There are two easy mistakes during development:

1. The login endpoint expects `userId`, not email.
2. Most operational endpoints require an active station after login.

That means:

- Login with `vp.user`, not `vp.user@example.com`
- After login, call `GET /api/stations/my`
- Then call `POST /api/stations/select`
- Only after station selection should you call station-scoped operational endpoints

Chat endpoints are the main exception because chat is not station-scoped in this backend.

## Login and station-selection flow

### API response envelope

Most endpoints in this backend are wrapped by the global response interceptor.

That means successful responses usually look like this shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "...": "..."
  }
}
```

For `201` responses, the message is usually `Created successfully`.

### Step 1. Log in

Endpoint:

```text
POST /api/auth/login
```

Request body example:

```json
{
  "userId": "sup.user",
  "password": "Password@123",
  "rememberMe": false
}
```

Sample `curl`:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"sup.user\",\"password\":\"Password@123\",\"rememberMe\":false}"
```

Successful response shape:

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Created successfully",
  "data": {
    "accessToken": "<jwt>",
    "refreshToken": "<opaque-token>",
    "accessTokenExpiresIn": "30m",
    "refreshTokenExpiresAt": "2026-03-27T10:15:00.000Z"
  }
}
```

### Step 2. Check assigned stations

Endpoint:

```text
GET /api/stations/my
```

Header:

```text
Authorization: Bearer <accessToken>
```

Sample `curl`:

```bash
curl http://localhost:3000/api/stations/my \
  -H "Authorization: Bearer <accessToken>"
```

Expected behavior:

- Users with one station will get `autoSelectSuggested: true`
- `sup.user` will receive both `JFK` and `LAX`
- You need the `stationId` value from `data.stations[*].stationId` for the next step

Sample success shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Success",
  "data": {
    "stations": [
      {
        "stationId": "<station-id>",
        "stationCode": "JFK",
        "stationName": "John F. Kennedy",
        "timezone": "America/New_York",
        "roleCode": "SUP",
        "roleName": "Supervisor",
        "isDefault": true
      }
    ],
    "autoSelectSuggested": false
  }
}
```

### Step 3. Select the active station

Endpoint:

```text
POST /api/stations/select
```

Request body:

```json
{
  "stationId": "<stationId-from-/stations/my>"
}
```

Sample `curl`:

```bash
curl -X POST http://localhost:3000/api/stations/select \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d "{\"stationId\":\"<stationId>\"}"
```

### Step 4. Confirm the active station

Endpoint:

```text
GET /api/stations/active
```

Sample `curl`:

```bash
curl http://localhost:3000/api/stations/active \
  -H "Authorization: Bearer <accessToken>"
```

Once this returns a station object, station-scoped endpoints can be used normally.

### Optional auth endpoints after login

- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Refresh request example:

```json
{
  "refreshToken": "<refreshToken>"
}
```

Logout request example:

```json
{
  "refreshToken": "<refreshToken>"
}
```

## Seed data notes that matter during testing

### Stations and roles

- `JFK` and `LAX` are both seeded as active stations
- `sup.user` has access to both stations and is the easiest account for testing station switching
- `gm.user` is the cleanest account for LAX-specific tests

### Master data

The seed loads enough master data to exercise these modules without manual setup:

- Cabin Quality Audit
- LAV Safety Observation
- Cabin Security Search Training
- End of Shift Report
- Feedback
- Chat

### Shift occurrences

Shift occurrences are created using the current date when the seed runs. If your tests depend on "today's" shift data and the data looks stale, re-run:

```powershell
yarn prisma:seed
```

## Troubleshooting

### `DATABASE_URL is required for seeding`

Cause:

- `.env` is missing
- `DATABASE_URL` is blank in the current shell environment

Fix:

```powershell
Copy-Item .env.example .env
```

Then verify `DATABASE_URL` exists in `.env`.

### Prisma cannot connect to PostgreSQL

Cause:

- Docker services are not running
- Port `5432` is already occupied by another PostgreSQL instance

Fix:

```powershell
yarn docker:up
docker ps
```

If another local PostgreSQL instance is using port `5432`, either stop it or change the port mapping and `DATABASE_URL`.

### Login fails with `Invalid User ID or Password`

Check these first:

- Use `userId`, not email
- Use `Password@123`
- Make sure the seed completed successfully
- Re-run `yarn prisma:seed` if needed

### Operational endpoints fail with `Active station is required`

Cause:

- Login succeeded, but the current auth session has no selected station

Fix:

1. `GET /api/stations/my`
2. `POST /api/stations/select`
3. Retry the original request

### Prisma client types look stale

Fix:

```powershell
yarn prisma:generate
```

### Email recovery flows appear to do nothing

Recovery emails are sent to MailHog in local development:

- UI: `http://localhost:8025`

## Source files behind this flow

If you need to change the behavior later, these are the primary files:

- [`package.json`](../package.json)
- [`prisma/seed.ts`](../prisma/seed.ts)
- [`.env.example`](../.env.example)
- [`docker-compose.yml`](../docker-compose.yml)
- [`src/modules/auth/auth.controller.ts`](../src/modules/auth/auth.controller.ts)
- [`src/modules/auth/auth.service.ts`](../src/modules/auth/auth.service.ts)
- [`src/modules/auth/dto/login.dto.ts`](../src/modules/auth/dto/login.dto.ts)
- [`src/modules/stations/stations.controller.ts`](../src/modules/stations/stations.controller.ts)
- [`src/modules/stations/stations.service.ts`](../src/modules/stations/stations.service.ts)
