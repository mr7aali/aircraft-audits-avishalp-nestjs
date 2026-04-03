-- CreateEnum
CREATE TYPE "SystemType" AS ENUM ('APP', 'ADMIN_DASHBOARD');

-- AlterTable
ALTER TABLE "roles"
ADD COLUMN "description" TEXT;

-- AlterTable
ALTER TABLE "app_modules"
ADD COLUMN "description" TEXT,
ADD COLUMN "routePath" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "systemType" "SystemType" NOT NULL DEFAULT 'APP';

-- AlterTable
ALTER TABLE "role_module_access"
ADD COLUMN "canRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canWrite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canEdit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canDelete" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing access rules into the new CRUD fields.
UPDATE "role_module_access"
SET
  "canRead" = COALESCE("canList", false) OR COALESCE("canView", false),
  "canWrite" = COALESCE("canCreate", false),
  "canEdit" = COALESCE("canCreate", false),
  "canDelete" = COALESCE("canCreate", false);
