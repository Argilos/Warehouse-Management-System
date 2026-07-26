-- Initial Database Migration for Supabase PostgreSQL
-- Enterprise Warehouse Asset, Tool, and Employee Management System

-- Create Enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE', 'POWER_USER');
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'ISSUED', 'IN_SERVICE', 'IN_CALIBRATION', 'RETIRED', 'DAMAGED', 'LOST');
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TERMINATED');
CREATE TYPE "ServiceStatus" AS ENUM ('PENDING', 'SENT', 'IN_REPAIR', 'COMPLETED', 'CANCELLED');
CREATE TYPE "CalibrationResult" AS ENUM ('PASS', 'FAIL', 'CONDITIONAL');
CREATE TYPE "TransactionType" AS ENUM ('ISSUE', 'RETURN', 'TRANSFER', 'MAINTENANCE_SEND', 'MAINTENANCE_RETURN', 'CALIBRATION_SEND', 'CALIBRATION_RETURN', 'RETIREMENT', 'INVENTORY_CHECK');

-- Create Tables
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WAREHOUSE_EMPLOYEE',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "companyName" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "services" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "assets" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "assetNumber" TEXT NOT NULL UNIQUE,
    "qrCode" TEXT NOT NULL UNIQUE,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL UNIQUE,
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "purchasePrice" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "depreciationRate" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "supplierId" TEXT REFERENCES "suppliers"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "employees" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeNumber" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "hireDate" TIMESTAMP(3) NOT NULL,
    "terminationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "projectCode" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "client" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "asset_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "assetId" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
    "employeeId" TEXT REFERENCES "employees"("id") ON DELETE SET NULL,
    "transactionType" "TransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnDate" TIMESTAMP(3),
    "performedById" TEXT NOT NULL REFERENCES "users"("id"),
    "notes" TEXT,
    "projectId" TEXT REFERENCES "projects"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "employee_assets" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "employeeId" TEXT NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "assetId" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
    "assignmentType" TEXT NOT NULL DEFAULT 'TEMPORARY',
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedDate" TIMESTAMP(3),
    "condition" TEXT NOT NULL DEFAULT 'EXCELLENT',
    "notes" TEXT
);

CREATE TABLE "tool_boxes" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "boxNumber" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "employeeId" TEXT REFERENCES "employees"("id") ON DELETE SET NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "tool_box_items" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "toolBoxId" TEXT NOT NULL REFERENCES "tool_boxes"("id") ON DELETE CASCADE,
    "assetId" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "assetId" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
    "supplierId" TEXT REFERENCES "suppliers"("id") ON DELETE SET NULL,
    "problemDescription" TEXT NOT NULL,
    "sentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedDate" TIMESTAMP(3),
    "repairCost" DOUBLE PRECISION DEFAULT 0.0,
    "replacedParts" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "calibration_records" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "assetId" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE CASCADE,
    "providerId" TEXT REFERENCES "suppliers"("id") ON DELETE SET NULL,
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3) NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "result" "CalibrationResult" NOT NULL DEFAULT 'PASS',
    "documentUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "inventory_checks" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "checkNumber" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "performedById" TEXT NOT NULL REFERENCES "users"("id"),
    "checkDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalAssets" INT NOT NULL DEFAULT 0,
    "verifiedAssets" INT NOT NULL DEFAULT 0,
    "missingAssets" INT NOT NULL DEFAULT 0,
    "damagedAssets" INT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "inventory_check_items" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "inventoryCheckId" TEXT NOT NULL REFERENCES "inventory_checks"("id") ON DELETE CASCADE,
    "assetId" TEXT NOT NULL REFERENCES "assets"("id") ON DELETE RESTRICT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "scannedAt" TIMESTAMP(3)
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INT,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL REFERENCES "users"("id"),
    "assetId" TEXT REFERENCES "assets"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "users"("id"),
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Triggers for Audit Logging & Auto Depreciation
CREATE OR REPLACE FUNCTION log_asset_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO "audit_logs" ("id", "userId", "entity", "entityId", "action", "oldValues", "newValues", "createdAt")
        VALUES (
            gen_random_uuid()::text,
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            'Asset',
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER asset_status_audit_trigger
AFTER UPDATE ON "assets"
FOR EACH ROW
EXECUTE FUNCTION log_asset_status_change();
