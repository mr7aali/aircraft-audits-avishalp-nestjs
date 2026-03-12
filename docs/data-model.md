# Data Model Summary

Prisma schema is implemented in `prisma/schema.prisma`.

## Core Identity and Access
- `User`, `Role`, `Station`, `Gate`, `UserStationAccess`
- `AppModule`, `RoleModuleAccess`
- `AuthSession` (hashed refresh token, active station context)
- `AccountRecoveryRequest`, `LoginAuditLog`, `EmailNotification`

## Master Data
- `CleanType`
- `CabinQualityChecklistItem`
- `LavSafetyChecklistItem`
- `SecuritySearchArea`
- `ShiftDefinition`, `ShiftOccurrence`

## Files
- `File` with storage metadata, scan status, category
- Link tables for each module attachment relation

## Operational Modules
- Cabin quality: `CabinQualityAudit`, `CabinQualityAuditResponse`, link tables
- LAV safety: `LavSafetyObservation`, `LavSafetyObservationResponse`, link tables
- Security search: `CabinSecuritySearchTraining`, `CabinSecuritySearchTrainingResult`, link tables
- End of shift: `EndOfShiftReport`, `EndOfShiftReportDelay`, link table
- Employee 1:1: `EmployeeOneOnOne`
- Feedback: `AppFeedback`

## Chat
- `ChatConversation`, `ChatConversationParticipant`
- `ChatMessage`, `ChatMessageReceipt`, `ChatMessageFile`
- `ChatPoll`, `ChatPollOption`, `ChatPollVote`
- `ChatEvent`, `ChatLocation`, `ChatContact`

## Enums
Implemented enums include:
- `UserStatus`, `RecoveryType`, `RecoveryStatus`, `NotificationStatus`
- `FileCategory`, `ScanStatus`, `AuditRecordStatus`
- `YesNoNa`, `PassFail`, `DelayType`, `RatingScale`
- `ConversationType`, `ConversationMemberRole`, `MessageType`
- `AttachmentKind`, `LocationType`, `CallType`

## Indexes and Constraints
- Unique and composite constraints from requirements (user uid/email, gate station+code, role-module access, etc.)
- Added migration hardening:
  - partial unique index for one submitted cabin-quality audit per station+shift
  - lowercase uniqueness indexes on user email/uid
  - `pg_trgm` search indexes for user full-name and LAV driver name
  - receipt lookup optimization index

