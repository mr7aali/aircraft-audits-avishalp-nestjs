ALTER TABLE "account_recovery_requests"
ADD COLUMN "verificationCodeHash" TEXT;

CREATE INDEX "account_recovery_requests_requestedEmail_recoveryType_status_createdAt_idx"
ON "account_recovery_requests"("requestedEmail", "recoveryType", "status", "createdAt");
