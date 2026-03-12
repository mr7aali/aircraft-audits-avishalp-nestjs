# Architectural Decisions

## 2026-03-12
- Use Yarn as canonical package manager for commands and lockfile ownership.
- Use JSON token exchange for refresh flow (`/auth/refresh`) instead of cookie-only sessions.
- JWT lifetime defaults: access token 30 minutes, refresh 14 days, remember-me refresh 60 days.
- Chat scope is global-only in v1 (chat is not station-restricted).
- Keep E2EE-ready chat boundary by storing encrypted payload and safe preview metadata only.
- Use Prisma model-level timezone annotations (`@db.Timestamptz(3)`) plus SQL migration hardening to enforce timezone-aware datetimes.
- Use data-driven RBAC through `role_module_access` with guard-based enforcement rather than hardcoded role checks.
- Keep chat permission broad for authenticated users (no station requirement), while operational modules remain station-scoped.
- Implement queue-first mail notifications with BullMQ and fallback direct-send path when queueing is unavailable.
- Enforce immutable submitted records by API surface (create/list/view only for operational records, no update endpoints).
