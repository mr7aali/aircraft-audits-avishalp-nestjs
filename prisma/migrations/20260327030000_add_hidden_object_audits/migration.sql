-- CreateEnum
CREATE TYPE "HiddenObjectAuditStatus" AS ENUM ('SETUP', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "HiddenObjectLocationStatus" AS ENUM ('ORANGE', 'BLUE', 'GREEN', 'RED');

-- CreateEnum
CREATE TYPE "HiddenObjectLocationType" AS ENUM ('SEAT', 'GALLEY', 'LAV', 'JUMP_SEAT', 'ZONE');

-- CreateTable
CREATE TABLE "fleet_aircraft" (
    "id" UUID NOT NULL,
    "shipNumber" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "aircraftTypeId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fleet_aircraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_object_audit_sessions" (
    "id" UUID NOT NULL,
    "stationId" UUID NOT NULL,
    "shiftOccurrenceId" UUID,
    "auditorUserId" UUID NOT NULL,
    "auditorNameSnapshot" TEXT NOT NULL,
    "auditorRoleSnapshot" TEXT NOT NULL,
    "aircraftTypeId" UUID NOT NULL,
    "aircraftTypeNameSnapshot" TEXT NOT NULL,
    "fleetAircraftId" UUID NOT NULL,
    "shipNumberSnapshot" TEXT NOT NULL,
    "objectsToHideCount" INTEGER NOT NULL,
    "sessionAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "setupCompletedAt" TIMESTAMPTZ(3),
    "activatedAt" TIMESTAMPTZ(3),
    "closedAt" TIMESTAMPTZ(3),
    "status" "HiddenObjectAuditStatus" NOT NULL DEFAULT 'SETUP',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hidden_object_audit_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_object_audit_locations" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "locationCode" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "sectionLabel" TEXT NOT NULL,
    "locationType" "HiddenObjectLocationType" NOT NULL,
    "status" "HiddenObjectLocationStatus" NOT NULL DEFAULT 'ORANGE',
    "subLocation" TEXT,
    "hiddenConfirmedAt" TIMESTAMPTZ(3),
    "foundAt" TIMESTAMPTZ(3),
    "foundByUserId" UUID,
    "foundByNameSnapshot" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "hidden_object_audit_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hidden_object_audit_location_files" (
    "locationId" UUID NOT NULL,
    "fileId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hidden_object_audit_location_files_pkey" PRIMARY KEY ("locationId","fileId")
);

-- CreateIndex
CREATE UNIQUE INDEX "fleet_aircraft_shipNumber_key" ON "fleet_aircraft"("shipNumber");

-- CreateIndex
CREATE INDEX "fleet_aircraft_aircraftTypeId_idx" ON "fleet_aircraft"("aircraftTypeId");

-- CreateIndex
CREATE INDEX "hidden_object_audit_sessions_stationId_sessionAt_idx" ON "hidden_object_audit_sessions"("stationId", "sessionAt");

-- CreateIndex
CREATE INDEX "hidden_object_audit_sessions_auditorUserId_idx" ON "hidden_object_audit_sessions"("auditorUserId");

-- CreateIndex
CREATE INDEX "hidden_object_audit_sessions_status_idx" ON "hidden_object_audit_sessions"("status");

-- CreateIndex
CREATE INDEX "hidden_object_audit_sessions_aircraftTypeId_idx" ON "hidden_object_audit_sessions"("aircraftTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "hidden_object_audit_locations_sessionId_locationCode_key" ON "hidden_object_audit_locations"("sessionId", "locationCode");

-- CreateIndex
CREATE INDEX "hidden_object_audit_locations_sessionId_status_idx" ON "hidden_object_audit_locations"("sessionId", "status");

-- CreateIndex
CREATE INDEX "hidden_object_audit_locations_foundByUserId_idx" ON "hidden_object_audit_locations"("foundByUserId");

-- CreateIndex
CREATE INDEX "hidden_object_audit_location_files_fileId_idx" ON "hidden_object_audit_location_files"("fileId");

-- AddForeignKey
ALTER TABLE "fleet_aircraft" ADD CONSTRAINT "fleet_aircraft_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "aircraft_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_sessions" ADD CONSTRAINT "hidden_object_audit_sessions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_sessions" ADD CONSTRAINT "hidden_object_audit_sessions_shiftOccurrenceId_fkey" FOREIGN KEY ("shiftOccurrenceId") REFERENCES "shift_occurrences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_sessions" ADD CONSTRAINT "hidden_object_audit_sessions_auditorUserId_fkey" FOREIGN KEY ("auditorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_sessions" ADD CONSTRAINT "hidden_object_audit_sessions_aircraftTypeId_fkey" FOREIGN KEY ("aircraftTypeId") REFERENCES "aircraft_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_sessions" ADD CONSTRAINT "hidden_object_audit_sessions_fleetAircraftId_fkey" FOREIGN KEY ("fleetAircraftId") REFERENCES "fleet_aircraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_locations" ADD CONSTRAINT "hidden_object_audit_locations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "hidden_object_audit_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_locations" ADD CONSTRAINT "hidden_object_audit_locations_foundByUserId_fkey" FOREIGN KEY ("foundByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_location_files" ADD CONSTRAINT "hidden_object_audit_location_files_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "hidden_object_audit_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hidden_object_audit_location_files" ADD CONSTRAINT "hidden_object_audit_location_files_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
