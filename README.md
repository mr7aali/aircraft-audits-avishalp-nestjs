# Station Audit Platform Backend

Production-focused NestJS backend for station-scoped operations, employee workflows, feedback, and chat.

## Stack
- NestJS 11 + TypeScript (ESM)
- Prisma ORM + PostgreSQL
- JWT access + refresh-token sessions
- Redis + BullMQ (notifications queue and realtime support hooks)
- Swagger/OpenAPI
- Socket.IO gateway for chat events/presence
- Local/S3-compatible storage adapter abstraction

## Implemented Modules
- Auth and account recovery
- Station selection and station-scoped access
- Master data
- Files/media upload and retrieval
- Cabin Quality Audit
- LAV Safety Observation
- Cabin Security Search Training
- End of Shift Report
- Employee 1:1
- Feedback
- Chat (REST + WebSocket)
- Health

## Required Docs
- [Implementation Plan](docs/implementation-plan.md)
- [Build Log](docs/build-log.md)
- [Decisions](docs/decisions.md)
- [API Overview](docs/api-overview.md)
- [Development Seeding Guide](docs/development-seeding.md)
- [RBAC Matrix](docs/rbac-matrix.md)
- [Data Model](docs/data-model.md)
- [Chat Encryption Boundary](docs/chat-encryption-boundary.md)
- [Collection Instructions](docs/postman-or-bruno-collection.md)

## Local Setup
1. Install dependencies:
```bash
yarn install
```
2. Configure environment:
```bash
cp .env.example .env
```
3. Start infrastructure (Postgres/Redis/MailHog/MinIO):
```bash
yarn docker:up
```
4. Generate Prisma client:
```bash
yarn prisma:generate
```
5. Apply migrations:
```bash
yarn prisma:migrate
```
6. Seed data:
```bash
yarn prisma:seed
```
7. Run app:
```bash
yarn start:dev
```

Full local setup, seed data, default login users, and station-selection flow:
- [Development Seeding Guide](docs/development-seeding.md)

Swagger: `http://localhost:3000/api/docs`

MailHog UI: `http://localhost:8025`

## Commands
- `yarn build`
- `yarn lint`
- `yarn test`
- `yarn test:e2e`
- `yarn prisma:validate`
- `yarn prisma:generate`
- `yarn prisma:migrate`
- `yarn prisma:seed`
- `yarn db:reset`

## Environment Variables
See `.env.example` for full list. Core values:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_TTL` (default `30m`)
- `JWT_REFRESH_TTL` (default `14d`)
- `JWT_REMEMBER_ME_TTL` (default `60d`)
- `REDIS_*`
- `MAIL_*`
- `STORAGE_DRIVER` (`cloudinary`, `local`, or `s3`)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_FOLDER` (optional)
- `MAX_UPLOAD_BYTES` (default `104857600`)

## Seeded Sample Users
Password for all users: `Password@123`

Full credential details, role/station mapping, and login flow:
- [Development Seeding Guide](docs/development-seeding.md)

- `vp.user` / `vp.user@example.com`
- `sup.user` / `sup.user@example.com`
- `employee.user` / `employee.user@example.com`
- `hr.user` / `hr.user@example.com`
- `gm.user` / `gm.user@example.com`

## Key Security and Behavior Notes
- Passwords are hashed with Argon2.
- Refresh tokens are stored server-side as SHA-256 hashes in `auth_sessions`.
- Login failure responses use generic message: `Invalid User ID or Password`.
- Auth and recovery endpoints are throttled.
- Station-scoped modules require active selected station.
- Submitted operational records are immutable through API surface (no update endpoints).
- File uploads are size-limited to 100MB and stored outside PostgreSQL.
- Cloudinary is the recommended shared media backend for images and signatures.
- Employee 1:1 reads are restricted to leader/employee/HR admin.

## Chat Encryption Boundary
- Backend stores `encryptedPayload` and safe metadata previews only.
- Backend does not decrypt user message content.
- Full E2EE key management and client decryption remain client responsibilities.

## Validation Status (Current Workspace)
- `yarn build` ✅
- `yarn lint` ✅
- `yarn test` ✅
- `yarn test:e2e` ✅
- `yarn prisma:validate` ✅
- `npx prisma migrate deploy` ✅ (validated against reachable local PostgreSQL instance)
- `npx prisma db seed` ✅ (validated against reachable local PostgreSQL instance)
