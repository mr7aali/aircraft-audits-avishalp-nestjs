# Production Backend Implementation Plan

## Scope
Build a production-ready modular NestJS backend for station-scoped operational audits, employee feedback, and chat.

## Milestones
1. Foundation and docs
2. Prisma schema hardening, migrations, and seed data
3. Auth, sessions, station selection, and RBAC guards
4. Files, mail/notifications, master data, and health checks
5. Operational modules I: cabin quality, lav safety, security search, end-of-shift
6. Operational modules II: employee 1:1 and feedback
7. Chat REST + WebSocket + presence + receipts
8. Swagger, tests, Docker compose, README, and polish

## Validation Gates
- `yarn.cmd build`
- `yarn.cmd lint`
- `yarn.cmd prisma validate`
- `yarn.cmd prisma migrate dev`
- `yarn.cmd prisma db seed`
- `yarn.cmd test`
- `yarn.cmd test:e2e`

