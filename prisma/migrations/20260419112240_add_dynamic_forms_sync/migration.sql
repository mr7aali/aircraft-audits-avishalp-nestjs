-- CreateEnum
CREATE TYPE "DynamicFormTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "dynamic_form_templates" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "updatedByUserId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "formType" TEXT NOT NULL,
    "status" "DynamicFormTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 0,
    "schemaJson" JSONB NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dynamic_form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dynamic_form_submissions" (
    "id" UUID NOT NULL,
    "templateId" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "submittedByRole" TEXT,
    "answersJson" JSONB NOT NULL,
    "score" DECIMAL(8,2),
    "metadataJson" JSONB,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynamic_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dynamic_form_templates_stationId_status_updatedAt_idx" ON "dynamic_form_templates"("stationId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "dynamic_form_templates_createdByUserId_updatedAt_idx" ON "dynamic_form_templates"("createdByUserId", "updatedAt");

-- CreateIndex
CREATE INDEX "dynamic_form_submissions_templateId_submittedAt_idx" ON "dynamic_form_submissions"("templateId", "submittedAt");

-- CreateIndex
CREATE INDEX "dynamic_form_submissions_stationId_submittedAt_idx" ON "dynamic_form_submissions"("stationId", "submittedAt");

-- CreateIndex
CREATE INDEX "dynamic_form_submissions_submittedByUserId_submittedAt_idx" ON "dynamic_form_submissions"("submittedByUserId", "submittedAt");

-- AddForeignKey
ALTER TABLE "dynamic_form_templates" ADD CONSTRAINT "dynamic_form_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_templates" ADD CONSTRAINT "dynamic_form_templates_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_templates" ADD CONSTRAINT "dynamic_form_templates_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submissions" ADD CONSTRAINT "dynamic_form_submissions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submissions" ADD CONSTRAINT "dynamic_form_submissions_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dynamic_form_submissions" ADD CONSTRAINT "dynamic_form_submissions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "dynamic_form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
