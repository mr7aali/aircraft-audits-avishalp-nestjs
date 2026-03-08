/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "RecoveryType" AS ENUM ('PASSWORD_RESET', 'UID_RECOVERY');

-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('REQUESTED', 'SENT', 'COMPLETED', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditRecordStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "YesNoNa" AS ENUM ('YES', 'NO', 'NA');

-- CreateEnum
CREATE TYPE "PassFail" AS ENUM ('PASS', 'FAIL');

-- CreateEnum
CREATE TYPE "DelayType" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "RatingScale" AS ENUM ('VERY_POOR', 'POOR', 'FAIR', 'GOOD', 'VERY_GOOD');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP');

-- CreateEnum
CREATE TYPE "ConversationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT', 'VIDEO', 'LOCATION', 'CONTACT', 'POLL', 'EVENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AttachmentKind" AS ENUM ('IMAGE', 'AUDIO', 'DOCUMENT', 'VIDEO');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CURRENT', 'LIVE', 'SEARCHED');

-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VIDEO', 'VOICE');

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropTable
DROP TABLE "Post";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "uid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "profileImageFileId" UUID,
    "publishedAt" TIMESTAMP(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stations" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "airportCode" TEXT,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gates" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "gateCode" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_station_access" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_station_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_modules" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "app_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_module_access" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "moduleId" UUID NOT NULL,
    "canList" BOOLEAN NOT NULL DEFAULT false,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "role_module_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_definitions" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsLocalMinutes" INTEGER NOT NULL,
    "endsLocalMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shift_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_occurrences" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "shiftDefinitionId" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clean_types" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "clean_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" TEXT,
    "fileCategory" "FileCategory" NOT NULL,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "encryptedAtRest" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "activeStationId" UUID,
    "refreshTokenHash" TEXT NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_recovery_requests" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "requestedEmail" TEXT NOT NULL,
    "recoveryType" "RecoveryType" NOT NULL,
    "tokenHash" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "status" "RecoveryStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_recovery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_notifications" (
    "id" UUID NOT NULL,
    "requestId" UUID,
    "userId" UUID,
    "emailTo" TEXT NOT NULL,
    "templateCode" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "payloadJson" JSONB,
    "providerMessageId" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "attemptedUid" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_quality_checklist_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cabin_quality_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_quality_audits" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "shiftOccurrenceId" UUID,
    "gateId" UUID NOT NULL,
    "cleanTypeId" UUID NOT NULL,
    "auditorUserId" UUID NOT NULL,
    "auditorNameSnapshot" TEXT NOT NULL,
    "auditorRoleSnapshot" TEXT NOT NULL,
    "gateCodeSnapshot" TEXT NOT NULL,
    "cleanTypeSnapshot" TEXT NOT NULL,
    "auditAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "otherFindings" TEXT,
    "additionalNotes" TEXT,
    "signatureFileId" UUID NOT NULL,
    "status" "AuditRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabin_quality_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_quality_audit_responses" (
    "id" UUID NOT NULL,
    "auditId" UUID NOT NULL,
    "checklistItemId" UUID NOT NULL,
    "response" "YesNoNa" NOT NULL,

    CONSTRAINT "cabin_quality_audit_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_quality_audit_response_files" (
    "responseId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cabin_quality_audit_response_files_pkey" PRIMARY KEY ("responseId","fileId")
);

-- CreateTable
CREATE TABLE "cabin_quality_audit_files" (
    "auditId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cabin_quality_audit_files_pkey" PRIMARY KEY ("auditId","fileId")
);

-- CreateTable
CREATE TABLE "lav_safety_checklist_items" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "lav_safety_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_safety_observations" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "shiftOccurrenceId" UUID,
    "gateId" UUID NOT NULL,
    "auditorUserId" UUID NOT NULL,
    "auditorNameSnapshot" TEXT NOT NULL,
    "auditorRoleSnapshot" TEXT NOT NULL,
    "gateCodeSnapshot" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "driverName" TEXT NOT NULL,
    "shipNumber" TEXT NOT NULL,
    "otherFindings" TEXT,
    "additionalNotes" TEXT,
    "signatureFileId" UUID NOT NULL,
    "status" "AuditRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lav_safety_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_safety_observation_responses" (
    "id" UUID NOT NULL,
    "observationId" UUID NOT NULL,
    "checklistItemId" UUID NOT NULL,
    "response" "PassFail" NOT NULL,

    CONSTRAINT "lav_safety_observation_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lav_safety_observation_response_files" (
    "responseId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lav_safety_observation_response_files_pkey" PRIMARY KEY ("responseId","fileId")
);

-- CreateTable
CREATE TABLE "lav_safety_observation_files" (
    "observationId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lav_safety_observation_files_pkey" PRIMARY KEY ("observationId","fileId")
);

-- CreateTable
CREATE TABLE "security_search_areas" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "security_search_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_security_search_trainings" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "shiftOccurrenceId" UUID,
    "gateId" UUID NOT NULL,
    "auditorUserId" UUID NOT NULL,
    "auditorNameSnapshot" TEXT NOT NULL,
    "auditorRoleSnapshot" TEXT NOT NULL,
    "gateCodeSnapshot" TEXT NOT NULL,
    "trainingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipNumber" TEXT NOT NULL,
    "otherFindings" TEXT,
    "additionalNotes" TEXT,
    "overallResult" "PassFail" NOT NULL,
    "status" "AuditRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabin_security_search_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_security_search_training_results" (
    "id" UUID NOT NULL,
    "trainingId" UUID NOT NULL,
    "areaId" UUID NOT NULL,
    "areaLabelSnapshot" TEXT NOT NULL,
    "result" "PassFail" NOT NULL,

    CONSTRAINT "cabin_security_search_training_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabin_security_search_training_result_files" (
    "resultId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cabin_security_search_training_result_files_pkey" PRIMARY KEY ("resultId","fileId")
);

-- CreateTable
CREATE TABLE "cabin_security_search_training_files" (
    "trainingId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "cabin_security_search_training_files_pkey" PRIMARY KEY ("trainingId","fileId")
);

-- CreateTable
CREATE TABLE "end_of_shift_reports" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "shiftOccurrenceId" UUID,
    "supervisorUserId" UUID NOT NULL,
    "supervisorNameSnapshot" TEXT NOT NULL,
    "supervisorRoleSnapshot" TEXT NOT NULL,
    "reportAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lavObservationCompleted" BOOLEAN NOT NULL,
    "lavObservationReason" TEXT,
    "cabinQualityCompleted" BOOLEAN NOT NULL,
    "cabinQualityReason" TEXT,
    "callOffs" INTEGER NOT NULL,
    "tardyEarlyOut" INTEGER NOT NULL,
    "overtimeHours" INTEGER NOT NULL,
    "overtimeMinutes" INTEGER NOT NULL,
    "overtimeReason" TEXT,
    "delaysTaken" BOOLEAN NOT NULL,
    "delayCount" INTEGER,
    "additionalNotes" TEXT,
    "status" "AuditRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "end_of_shift_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_of_shift_report_delays" (
    "id" UUID NOT NULL,
    "reportId" UUID NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "delayCodeAlpha" TEXT NOT NULL,
    "delayCodeNumber" INTEGER NOT NULL,
    "delayType" "DelayType" NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "end_of_shift_report_delays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_of_shift_report_files" (
    "reportId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "end_of_shift_report_files_pkey" PRIMARY KEY ("reportId","fileId")
);

-- CreateTable
CREATE TABLE "employee_one_on_ones" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "leaderUserId" UUID NOT NULL,
    "employeeUserId" UUID NOT NULL,
    "leaderNameSnapshot" TEXT NOT NULL,
    "leaderRoleSnapshot" TEXT NOT NULL,
    "employeeNameSnapshot" TEXT NOT NULL,
    "meetingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discussionText" TEXT,
    "discussionAudioFileId" UUID,
    "additionalNote" TEXT,
    "employeeRefusedToSign" BOOLEAN NOT NULL DEFAULT false,
    "employeeSignatureFileId" UUID,
    "leaderSignatureFileId" UUID NOT NULL,
    "status" "AuditRecordStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_one_on_ones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_feedback" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "userNameSnapshot" TEXT NOT NULL,
    "userRoleSnapshot" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallSatisfaction" "RatingScale" NOT NULL,
    "easeOfUse" "RatingScale" NOT NULL,
    "appPerformance" "RatingScale" NOT NULL,
    "usabilityIssues" TEXT,
    "missingFeatures" TEXT,
    "performanceIssues" TEXT,

    CONSTRAINT "app_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" UUID NOT NULL,
    "conversationType" "ConversationType" NOT NULL,
    "stationId" UUID,
    "createdByUserId" UUID NOT NULL,
    "title" TEXT,
    "directPairKey" TEXT,
    "avatarFileId" UUID,
    "lastMessageId" UUID,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversation_participants" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "memberRole" "ConversationMemberRole" NOT NULL DEFAULT 'MEMBER',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "lastReadMessageId" UUID,
    "lastReadAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "chat_conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "encryptedPayload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_receipts" (
    "messageId" UUID NOT NULL,
    "recipientUserId" UUID NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "chat_message_receipts_pkey" PRIMARY KEY ("messageId","recipientUserId")
);

-- CreateTable
CREATE TABLE "chat_message_files" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "attachmentKind" "AttachmentKind" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chat_message_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_polls" (
    "messageId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "allowMultipleAnswers" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_polls_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "chat_poll_options" (
    "id" UUID NOT NULL,
    "pollMessageId" UUID NOT NULL,
    "optionText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chat_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_poll_votes" (
    "id" UUID NOT NULL,
    "optionId" UUID NOT NULL,
    "voterUserId" UUID NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_events" (
    "messageId" UUID NOT NULL,
    "eventName" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "locationText" TEXT,
    "callType" "CallType",
    "callLinkUrl" TEXT,
    "reminderOffsetMinutes" INTEGER,
    "allowGuests" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chat_events_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "chat_locations" (
    "messageId" UUID NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "addressText" TEXT,
    "liveExpiresAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "chat_locations_pkey" PRIMARY KEY ("messageId")
);

-- CreateTable
CREATE TABLE "chat_contacts" (
    "messageId" UUID NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,

    CONSTRAINT "chat_contacts_pkey" PRIMARY KEY ("messageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_uid_key" ON "users"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_firstName_lastName_idx" ON "users"("firstName", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "stations_code_key" ON "stations"("code");

-- CreateIndex
CREATE INDEX "gates_stationId_idx" ON "gates"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "gates_stationId_gateCode_key" ON "gates"("stationId", "gateCode");

-- CreateIndex
CREATE INDEX "user_station_access_stationId_roleId_idx" ON "user_station_access"("stationId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "user_station_access_userId_stationId_key" ON "user_station_access"("userId", "stationId");

-- CreateIndex
CREATE UNIQUE INDEX "app_modules_code_key" ON "app_modules"("code");

-- CreateIndex
CREATE UNIQUE INDEX "role_module_access_roleId_moduleId_key" ON "role_module_access"("roleId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_definitions_stationId_code_key" ON "shift_definitions"("stationId", "code");

-- CreateIndex
CREATE INDEX "shift_occurrences_stationId_businessDate_idx" ON "shift_occurrences"("stationId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "shift_occurrences_stationId_shiftDefinitionId_businessDate_key" ON "shift_occurrences"("stationId", "shiftDefinitionId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "clean_types_code_key" ON "clean_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "files_storageKey_key" ON "files"("storageKey");

-- CreateIndex
CREATE INDEX "files_uploadedByUserId_idx" ON "files"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "files_fileCategory_scanStatus_idx" ON "files"("fileCategory", "scanStatus");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refreshTokenHash_key" ON "auth_sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_expiresAt_idx" ON "auth_sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "auth_sessions_activeStationId_idx" ON "auth_sessions"("activeStationId");

-- CreateIndex
CREATE UNIQUE INDEX "account_recovery_requests_tokenHash_key" ON "account_recovery_requests"("tokenHash");

-- CreateIndex
CREATE INDEX "account_recovery_requests_requestedEmail_createdAt_idx" ON "account_recovery_requests"("requestedEmail", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "email_notifications_providerMessageId_key" ON "email_notifications"("providerMessageId");

-- CreateIndex
CREATE INDEX "email_notifications_userId_status_idx" ON "email_notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "login_audit_logs_attemptedUid_createdAt_idx" ON "login_audit_logs"("attemptedUid", "createdAt");

-- CreateIndex
CREATE INDEX "login_audit_logs_userId_createdAt_idx" ON "login_audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cabin_quality_checklist_items_code_key" ON "cabin_quality_checklist_items"("code");

-- CreateIndex
CREATE INDEX "cabin_quality_audits_stationId_auditAt_idx" ON "cabin_quality_audits"("stationId", "auditAt");

-- CreateIndex
CREATE INDEX "cabin_quality_audits_auditorUserId_idx" ON "cabin_quality_audits"("auditorUserId");

-- CreateIndex
CREATE INDEX "cabin_quality_audits_gateId_idx" ON "cabin_quality_audits"("gateId");

-- CreateIndex
CREATE INDEX "cabin_quality_audits_status_idx" ON "cabin_quality_audits"("status");

-- CreateIndex
CREATE INDEX "cabin_quality_audit_responses_checklistItemId_idx" ON "cabin_quality_audit_responses"("checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "cabin_quality_audit_responses_auditId_checklistItemId_key" ON "cabin_quality_audit_responses"("auditId", "checklistItemId");

-- CreateIndex
CREATE INDEX "cabin_quality_audit_response_files_fileId_idx" ON "cabin_quality_audit_response_files"("fileId");

-- CreateIndex
CREATE INDEX "cabin_quality_audit_files_fileId_idx" ON "cabin_quality_audit_files"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "lav_safety_checklist_items_code_key" ON "lav_safety_checklist_items"("code");

-- CreateIndex
CREATE INDEX "lav_safety_observations_stationId_observedAt_idx" ON "lav_safety_observations"("stationId", "observedAt");

-- CreateIndex
CREATE INDEX "lav_safety_observations_auditorUserId_idx" ON "lav_safety_observations"("auditorUserId");

-- CreateIndex
CREATE INDEX "lav_safety_observations_driverName_idx" ON "lav_safety_observations"("driverName");

-- CreateIndex
CREATE INDEX "lav_safety_observations_status_idx" ON "lav_safety_observations"("status");

-- CreateIndex
CREATE INDEX "lav_safety_observation_responses_checklistItemId_idx" ON "lav_safety_observation_responses"("checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "lav_safety_observation_responses_observationId_checklistIte_key" ON "lav_safety_observation_responses"("observationId", "checklistItemId");

-- CreateIndex
CREATE INDEX "lav_safety_observation_response_files_fileId_idx" ON "lav_safety_observation_response_files"("fileId");

-- CreateIndex
CREATE INDEX "lav_safety_observation_files_fileId_idx" ON "lav_safety_observation_files"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "security_search_areas_code_key" ON "security_search_areas"("code");

-- CreateIndex
CREATE INDEX "cabin_security_search_trainings_stationId_trainingAt_idx" ON "cabin_security_search_trainings"("stationId", "trainingAt");

-- CreateIndex
CREATE INDEX "cabin_security_search_trainings_auditorUserId_idx" ON "cabin_security_search_trainings"("auditorUserId");

-- CreateIndex
CREATE INDEX "cabin_security_search_trainings_overallResult_idx" ON "cabin_security_search_trainings"("overallResult");

-- CreateIndex
CREATE INDEX "cabin_security_search_trainings_status_idx" ON "cabin_security_search_trainings"("status");

-- CreateIndex
CREATE INDEX "cabin_security_search_training_results_areaId_idx" ON "cabin_security_search_training_results"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "cabin_security_search_training_results_trainingId_areaId_key" ON "cabin_security_search_training_results"("trainingId", "areaId");

-- CreateIndex
CREATE INDEX "cabin_security_search_training_result_files_fileId_idx" ON "cabin_security_search_training_result_files"("fileId");

-- CreateIndex
CREATE INDEX "cabin_security_search_training_files_fileId_idx" ON "cabin_security_search_training_files"("fileId");

-- CreateIndex
CREATE INDEX "end_of_shift_reports_stationId_reportAt_idx" ON "end_of_shift_reports"("stationId", "reportAt");

-- CreateIndex
CREATE INDEX "end_of_shift_reports_supervisorUserId_idx" ON "end_of_shift_reports"("supervisorUserId");

-- CreateIndex
CREATE INDEX "end_of_shift_reports_delaysTaken_idx" ON "end_of_shift_reports"("delaysTaken");

-- CreateIndex
CREATE INDEX "end_of_shift_reports_status_idx" ON "end_of_shift_reports"("status");

-- CreateIndex
CREATE INDEX "end_of_shift_report_delays_delayCodeAlpha_delayCodeNumber_idx" ON "end_of_shift_report_delays"("delayCodeAlpha", "delayCodeNumber");

-- CreateIndex
CREATE INDEX "end_of_shift_report_delays_delayType_idx" ON "end_of_shift_report_delays"("delayType");

-- CreateIndex
CREATE UNIQUE INDEX "end_of_shift_report_delays_reportId_sequenceNo_key" ON "end_of_shift_report_delays"("reportId", "sequenceNo");

-- CreateIndex
CREATE INDEX "end_of_shift_report_files_fileId_idx" ON "end_of_shift_report_files"("fileId");

-- CreateIndex
CREATE INDEX "employee_one_on_ones_stationId_meetingAt_idx" ON "employee_one_on_ones"("stationId", "meetingAt");

-- CreateIndex
CREATE INDEX "employee_one_on_ones_leaderUserId_idx" ON "employee_one_on_ones"("leaderUserId");

-- CreateIndex
CREATE INDEX "employee_one_on_ones_employeeUserId_idx" ON "employee_one_on_ones"("employeeUserId");

-- CreateIndex
CREATE INDEX "employee_one_on_ones_status_idx" ON "employee_one_on_ones"("status");

-- CreateIndex
CREATE INDEX "app_feedback_stationId_submittedAt_idx" ON "app_feedback"("stationId", "submittedAt");

-- CreateIndex
CREATE INDEX "app_feedback_submittedByUserId_idx" ON "app_feedback"("submittedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_directPairKey_key" ON "chat_conversations"("directPairKey");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_lastMessageId_key" ON "chat_conversations"("lastMessageId");

-- CreateIndex
CREATE INDEX "chat_conversations_conversationType_lastMessageAt_idx" ON "chat_conversations"("conversationType", "lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_conversations_createdByUserId_idx" ON "chat_conversations"("createdByUserId");

-- CreateIndex
CREATE INDEX "chat_conversation_participants_userId_isFavorite_idx" ON "chat_conversation_participants"("userId", "isFavorite");

-- CreateIndex
CREATE INDEX "chat_conversation_participants_conversationId_idx" ON "chat_conversation_participants"("conversationId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversation_participants_conversationId_userId_key" ON "chat_conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_senderUserId_createdAt_idx" ON "chat_messages"("senderUserId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_message_receipts_recipientUserId_readAt_idx" ON "chat_message_receipts"("recipientUserId", "readAt");

-- CreateIndex
CREATE INDEX "chat_message_files_messageId_sortOrder_idx" ON "chat_message_files"("messageId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "chat_message_files_messageId_fileId_key" ON "chat_message_files"("messageId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_poll_options_pollMessageId_sortOrder_key" ON "chat_poll_options"("pollMessageId", "sortOrder");

-- CreateIndex
CREATE INDEX "chat_poll_votes_voterUserId_idx" ON "chat_poll_votes"("voterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_poll_votes_optionId_voterUserId_key" ON "chat_poll_votes"("optionId", "voterUserId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profileImageFileId_fkey" FOREIGN KEY ("profileImageFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gates" ADD CONSTRAINT "gates_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_station_access" ADD CONSTRAINT "user_station_access_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_station_access" ADD CONSTRAINT "user_station_access_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_station_access" ADD CONSTRAINT "user_station_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_module_access" ADD CONSTRAINT "role_module_access_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_module_access" ADD CONSTRAINT "role_module_access_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "app_modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_definitions" ADD CONSTRAINT "shift_definitions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_occurrences" ADD CONSTRAINT "shift_occurrences_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_occurrences" ADD CONSTRAINT "shift_occurrences_shiftDefinitionId_fkey" FOREIGN KEY ("shiftDefinitionId") REFERENCES "shift_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_activeStationId_fkey" FOREIGN KEY ("activeStationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_recovery_requests" ADD CONSTRAINT "account_recovery_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "account_recovery_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_audit_logs" ADD CONSTRAINT "login_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audits" ADD CONSTRAINT "cabin_quality_audits_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audits" ADD CONSTRAINT "cabin_quality_audits_shiftOccurrenceId_fkey" FOREIGN KEY ("shiftOccurrenceId") REFERENCES "shift_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audits" ADD CONSTRAINT "cabin_quality_audits_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audits" ADD CONSTRAINT "cabin_quality_audits_cleanTypeId_fkey" FOREIGN KEY ("cleanTypeId") REFERENCES "clean_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audits" ADD CONSTRAINT "cabin_quality_audits_auditorUserId_fkey" FOREIGN KEY ("auditorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audits" ADD CONSTRAINT "cabin_quality_audits_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audit_responses" ADD CONSTRAINT "cabin_quality_audit_responses_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "cabin_quality_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audit_responses" ADD CONSTRAINT "cabin_quality_audit_responses_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "cabin_quality_checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audit_response_files" ADD CONSTRAINT "cabin_quality_audit_response_files_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "cabin_quality_audit_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audit_response_files" ADD CONSTRAINT "cabin_quality_audit_response_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audit_files" ADD CONSTRAINT "cabin_quality_audit_files_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "cabin_quality_audits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_quality_audit_files" ADD CONSTRAINT "cabin_quality_audit_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observations" ADD CONSTRAINT "lav_safety_observations_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observations" ADD CONSTRAINT "lav_safety_observations_shiftOccurrenceId_fkey" FOREIGN KEY ("shiftOccurrenceId") REFERENCES "shift_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observations" ADD CONSTRAINT "lav_safety_observations_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observations" ADD CONSTRAINT "lav_safety_observations_auditorUserId_fkey" FOREIGN KEY ("auditorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observations" ADD CONSTRAINT "lav_safety_observations_signatureFileId_fkey" FOREIGN KEY ("signatureFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observation_responses" ADD CONSTRAINT "lav_safety_observation_responses_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "lav_safety_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observation_responses" ADD CONSTRAINT "lav_safety_observation_responses_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "lav_safety_checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observation_response_files" ADD CONSTRAINT "lav_safety_observation_response_files_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "lav_safety_observation_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observation_response_files" ADD CONSTRAINT "lav_safety_observation_response_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observation_files" ADD CONSTRAINT "lav_safety_observation_files_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "lav_safety_observations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lav_safety_observation_files" ADD CONSTRAINT "lav_safety_observation_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_trainings" ADD CONSTRAINT "cabin_security_search_trainings_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_trainings" ADD CONSTRAINT "cabin_security_search_trainings_shiftOccurrenceId_fkey" FOREIGN KEY ("shiftOccurrenceId") REFERENCES "shift_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_trainings" ADD CONSTRAINT "cabin_security_search_trainings_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "gates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_trainings" ADD CONSTRAINT "cabin_security_search_trainings_auditorUserId_fkey" FOREIGN KEY ("auditorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_training_results" ADD CONSTRAINT "cabin_security_search_training_results_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "cabin_security_search_trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_training_results" ADD CONSTRAINT "cabin_security_search_training_results_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "security_search_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_training_result_files" ADD CONSTRAINT "cabin_security_search_training_result_files_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "cabin_security_search_training_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_training_result_files" ADD CONSTRAINT "cabin_security_search_training_result_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_training_files" ADD CONSTRAINT "cabin_security_search_training_files_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "cabin_security_search_trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabin_security_search_training_files" ADD CONSTRAINT "cabin_security_search_training_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_of_shift_reports" ADD CONSTRAINT "end_of_shift_reports_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_of_shift_reports" ADD CONSTRAINT "end_of_shift_reports_shiftOccurrenceId_fkey" FOREIGN KEY ("shiftOccurrenceId") REFERENCES "shift_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_of_shift_reports" ADD CONSTRAINT "end_of_shift_reports_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_of_shift_report_delays" ADD CONSTRAINT "end_of_shift_report_delays_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "end_of_shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_of_shift_report_files" ADD CONSTRAINT "end_of_shift_report_files_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "end_of_shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_of_shift_report_files" ADD CONSTRAINT "end_of_shift_report_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_one_on_ones" ADD CONSTRAINT "employee_one_on_ones_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_one_on_ones" ADD CONSTRAINT "employee_one_on_ones_leaderUserId_fkey" FOREIGN KEY ("leaderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_one_on_ones" ADD CONSTRAINT "employee_one_on_ones_employeeUserId_fkey" FOREIGN KEY ("employeeUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_one_on_ones" ADD CONSTRAINT "employee_one_on_ones_discussionAudioFileId_fkey" FOREIGN KEY ("discussionAudioFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_one_on_ones" ADD CONSTRAINT "employee_one_on_ones_employeeSignatureFileId_fkey" FOREIGN KEY ("employeeSignatureFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_one_on_ones" ADD CONSTRAINT "employee_one_on_ones_leaderSignatureFileId_fkey" FOREIGN KEY ("leaderSignatureFileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_feedback" ADD CONSTRAINT "app_feedback_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_feedback" ADD CONSTRAINT "app_feedback_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_avatarFileId_fkey" FOREIGN KEY ("avatarFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversation_participants" ADD CONSTRAINT "chat_conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversation_participants" ADD CONSTRAINT "chat_conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversation_participants" ADD CONSTRAINT "chat_conversation_participants_lastReadMessageId_fkey" FOREIGN KEY ("lastReadMessageId") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_receipts" ADD CONSTRAINT "chat_message_receipts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_receipts" ADD CONSTRAINT "chat_message_receipts_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_files" ADD CONSTRAINT "chat_message_files_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message_files" ADD CONSTRAINT "chat_message_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_polls" ADD CONSTRAINT "chat_polls_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_poll_options" ADD CONSTRAINT "chat_poll_options_pollMessageId_fkey" FOREIGN KEY ("pollMessageId") REFERENCES "chat_polls"("messageId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_poll_votes" ADD CONSTRAINT "chat_poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "chat_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_poll_votes" ADD CONSTRAINT "chat_poll_votes_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_events" ADD CONSTRAINT "chat_events_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_locations" ADD CONSTRAINT "chat_locations_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_contacts" ADD CONSTRAINT "chat_contacts_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
