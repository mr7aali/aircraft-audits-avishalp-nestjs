-- Timezone hardening (TIMESTAMPTZ)
ALTER TABLE "roles" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "roles" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "publishedAt" TYPE TIMESTAMPTZ(3) USING "publishedAt" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "lockedUntil" TYPE TIMESTAMPTZ(3) USING "lockedUntil" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "lastSeenAt" TYPE TIMESTAMPTZ(3) USING "lastSeenAt" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "users" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "stations" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "stations" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "gates" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "gates" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "user_station_access" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "user_station_access" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "shift_occurrences" ALTER COLUMN "startsAt" TYPE TIMESTAMPTZ(3) USING "startsAt" AT TIME ZONE 'UTC';
ALTER TABLE "shift_occurrences" ALTER COLUMN "endsAt" TYPE TIMESTAMPTZ(3) USING "endsAt" AT TIME ZONE 'UTC';
ALTER TABLE "files" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "auth_sessions" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "auth_sessions" ALTER COLUMN "lastUsedAt" TYPE TIMESTAMPTZ(3) USING "lastUsedAt" AT TIME ZONE 'UTC';
ALTER TABLE "auth_sessions" ALTER COLUMN "revokedAt" TYPE TIMESTAMPTZ(3) USING "revokedAt" AT TIME ZONE 'UTC';
ALTER TABLE "auth_sessions" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "account_recovery_requests" ALTER COLUMN "expiresAt" TYPE TIMESTAMPTZ(3) USING "expiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "account_recovery_requests" ALTER COLUMN "consumedAt" TYPE TIMESTAMPTZ(3) USING "consumedAt" AT TIME ZONE 'UTC';
ALTER TABLE "account_recovery_requests" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "email_notifications" ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(3) USING "sentAt" AT TIME ZONE 'UTC';
ALTER TABLE "email_notifications" ALTER COLUMN "failedAt" TYPE TIMESTAMPTZ(3) USING "failedAt" AT TIME ZONE 'UTC';
ALTER TABLE "email_notifications" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "login_audit_logs" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_quality_audits" ALTER COLUMN "auditAt" TYPE TIMESTAMPTZ(3) USING "auditAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_quality_audits" ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_quality_audits" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_quality_audits" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "lav_safety_observations" ALTER COLUMN "observedAt" TYPE TIMESTAMPTZ(3) USING "observedAt" AT TIME ZONE 'UTC';
ALTER TABLE "lav_safety_observations" ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC';
ALTER TABLE "lav_safety_observations" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "lav_safety_observations" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_security_search_trainings" ALTER COLUMN "trainingAt" TYPE TIMESTAMPTZ(3) USING "trainingAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_security_search_trainings" ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_security_search_trainings" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "cabin_security_search_trainings" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "end_of_shift_reports" ALTER COLUMN "reportAt" TYPE TIMESTAMPTZ(3) USING "reportAt" AT TIME ZONE 'UTC';
ALTER TABLE "end_of_shift_reports" ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC';
ALTER TABLE "end_of_shift_reports" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "end_of_shift_reports" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "employee_one_on_ones" ALTER COLUMN "meetingAt" TYPE TIMESTAMPTZ(3) USING "meetingAt" AT TIME ZONE 'UTC';
ALTER TABLE "employee_one_on_ones" ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC';
ALTER TABLE "employee_one_on_ones" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "employee_one_on_ones" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "app_feedback" ALTER COLUMN "submittedAt" TYPE TIMESTAMPTZ(3) USING "submittedAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_conversations" ALTER COLUMN "lastMessageAt" TYPE TIMESTAMPTZ(3) USING "lastMessageAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_conversations" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_conversations" ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_conversation_participants" ALTER COLUMN "lastReadAt" TYPE TIMESTAMPTZ(3) USING "lastReadAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_conversation_participants" ALTER COLUMN "joinedAt" TYPE TIMESTAMPTZ(3) USING "joinedAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_conversation_participants" ALTER COLUMN "leftAt" TYPE TIMESTAMPTZ(3) USING "leftAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_messages" ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_messages" ALTER COLUMN "editedAt" TYPE TIMESTAMPTZ(3) USING "editedAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_messages" ALTER COLUMN "deletedAt" TYPE TIMESTAMPTZ(3) USING "deletedAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_message_receipts" ALTER COLUMN "deliveredAt" TYPE TIMESTAMPTZ(3) USING "deliveredAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_message_receipts" ALTER COLUMN "readAt" TYPE TIMESTAMPTZ(3) USING "readAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_poll_votes" ALTER COLUMN "votedAt" TYPE TIMESTAMPTZ(3) USING "votedAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_events" ALTER COLUMN "startAt" TYPE TIMESTAMPTZ(3) USING "startAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_events" ALTER COLUMN "endAt" TYPE TIMESTAMPTZ(3) USING "endAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_locations" ALTER COLUMN "liveExpiresAt" TYPE TIMESTAMPTZ(3) USING "liveExpiresAt" AT TIME ZONE 'UTC';
ALTER TABLE "chat_locations" ALTER COLUMN "lastUpdatedAt" TYPE TIMESTAMPTZ(3) USING "lastUpdatedAt" AT TIME ZONE 'UTC';

-- New pragmatic metadata columns
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "metadataJson" JSONB;
ALTER TABLE "files" ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER;
ALTER TABLE "chat_messages" ADD COLUMN IF NOT EXISTS "previewText" TEXT;

-- Search and uniqueness hardening
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_unique" ON "users" (LOWER("email"));
CREATE UNIQUE INDEX IF NOT EXISTS "users_uid_lower_unique" ON "users" (LOWER("uid"));
CREATE INDEX IF NOT EXISTS "users_full_name_trgm_idx" ON "users" USING GIN ((("firstName" || ' ' || "lastName")) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "lav_driver_name_trgm_idx" ON "lav_safety_observations" USING GIN ("driverName" gin_trgm_ops);

-- Business constraints
CREATE UNIQUE INDEX IF NOT EXISTS "cabin_quality_audits_station_shift_submitted_unique" ON "cabin_quality_audits" ("stationId", "shiftOccurrenceId") WHERE "shiftOccurrenceId" IS NOT NULL AND "status" = 'SUBMITTED';

-- Chat read/delivery lookup optimization
CREATE INDEX IF NOT EXISTS "chat_message_receipts_recipient_delivered_read_idx" ON "chat_message_receipts" ("recipientUserId", "deliveredAt", "readAt");
