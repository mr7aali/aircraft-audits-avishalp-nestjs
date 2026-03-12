# RBAC Matrix

Module permissions are data-driven via `app_modules` + `role_module_access`.

## Roles
- `VP`
- `GM`
- `DM`
- `SUP`
- `ALL`
- `EMPLOYEE`
- `HR_ADMIN`

## Effective Access (Seed Defaults)

### Cabin Quality Audit
- `VP`, `GM`, `DM`, `SUP`, `ALL`: list/view/create

### LAV Safety Observation
- `VP`, `GM`, `DM`, `SUP`, `ALL`: list/view/create

### Cabin Security Search Training
- `VP`, `GM`, `DM`, `SUP`, `ALL`: list/view/create

### End Of Shift Report
- `VP`, `GM`, `DM`, `SUP`, `ALL`: list/view/create

### Employee 1:1
- `VP`, `GM`, `DM`, `SUP`, `ALL`: create/list/view in matrix
- Record-level visibility guard applies on read:
  - leader who created
  - employee on record
  - `HR_ADMIN`

### Feedback
- Any authenticated user with active station can create
- Seed grants list/view/create to admin roles (`VP`, `GM`, `DM`, `SUP`, `ALL`, `HR_ADMIN`)

### Chat
- Authenticated users can use chat endpoints (global chat v1, no station scope)

### Master Data / Files / Stations
- Seed grants list/view/create access for all roles

## Guard Layers
- `AccessTokenGuard` (global): enforces JWT auth except `@Public`.
- `PermissionsGuard` (global): enforces module action checks when `@RequirePermission` is present.
- `@RequireActiveStation`: enforces selected station for station-scoped endpoints.

