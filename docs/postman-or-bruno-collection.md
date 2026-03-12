# API Collection Instructions

## Postman
1. Import Swagger JSON from `GET /api/docs-json` (or export from Swagger UI).
2. Create environment variables:
   - `baseUrl` = `http://localhost:3000/api`
   - `accessToken` = JWT access token from `/auth/login`
3. Set `Authorization: Bearer {{accessToken}}` for protected folders.

## Bruno
1. Generate requests from Swagger (`/api/docs`), or create requests manually using endpoint lists in `docs/api-overview.md`.
2. Define variables:
   - `baseUrl`
   - `accessToken`
3. Use header `Authorization: Bearer {{accessToken}}`.

## Suggested Request Order
1. `POST /auth/login`
2. `GET /stations/my`
3. `POST /stations/select`
4. Call operational create/list/view endpoints
5. Chat conversation + message flows

