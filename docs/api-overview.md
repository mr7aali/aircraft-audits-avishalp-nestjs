# API Overview

Base URL prefix: `/api`

## Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/forgot-password/request`
- `POST /auth/forgot-password/confirm`
- `POST /auth/forgot-uid/request`
- `GET /auth/no-email-access-message`

## Station Context
- `GET /stations/my`
- `POST /stations/select`
- `GET /stations/active`

## Master Data
- `GET /master-data/clean-types`
- `GET /master-data/cabin-quality-checklist-items`
- `GET /master-data/lav-safety-checklist-items`
- `GET /master-data/security-search-areas`
- `GET /master-data/gates?stationId=...`

## Files
- `POST /files/upload` (`multipart/form-data`)
- `GET /files/:id`
- `GET /files/:id/download-url`
- `GET /files/:id/content`

## Operational Modules
- Cabin Quality Audit: `GET/GET:id/POST /cabin-quality-audits`
- LAV Safety Observation: `GET/GET:id/POST /lav-safety-observations`
- Cabin Security Search Training: `GET/GET:id/POST /cabin-security-search-trainings`
- End Of Shift Report: `GET/GET:id/POST /end-of-shift-reports`
- Employee 1:1: `GET/GET:id/POST /employee-one-on-ones`
- Employee search: `GET /employees/search?q=...`
- Feedback: `POST /feedback`, `GET /feedback`, `GET /feedback/my`

## Chat REST
- `GET /chat/conversations?tab=all|unread|groups|favorite&q=...`
- `POST /chat/conversations/direct`
- `POST /chat/conversations/group`
- `GET /chat/conversations/:id`
- `GET /chat/conversations/:id/messages?cursor=...&limit=...`
- `PATCH /chat/conversations/:id/favorite`
- `PATCH /chat/conversations/:id/mute`
- `POST /chat/conversations/:id/messages`
- `POST /chat/messages/:id/read`
- `POST /chat/messages/:id/delivered`
- `POST /chat/polls/:messageId/votes`

## Chat WebSocket
Namespace: `/chat`

Client events:
- `conversation.join`
- `typing.start`
- `typing.stop`

Server events:
- `message.created`
- `message.delivered`
- `message.read`
- `conversation.updated`
- `presence.updated`
- `typing.started`
- `typing.stopped`

## Health
- `GET /health/live`
- `GET /health/ready`

