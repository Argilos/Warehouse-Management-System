-- Supabase Row Level Security (RLS) Policies
-- Enterprise Warehouse Asset Management System

-- Enable RLS on all tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_boxes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tool_box_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "calibration_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_check_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- 1. Assets Table Policies
CREATE POLICY "Public Read Access for Scanned Assets"
    ON "assets" FOR SELECT
    USING (true);

CREATE POLICY "Managers and Admins Full Access to Assets"
    ON "assets" FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('ADMIN', 'WAREHOUSE_MANAGER', 'POWER_USER')
    );

-- 2. Employees Table Policies
CREATE POLICY "Authenticated Users Read Employees"
    ON "employees" FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Admin & Manager Employee Mutate"
    ON "employees" FOR ALL
    USING (
        auth.jwt() ->> 'role' IN ('ADMIN', 'WAREHOUSE_MANAGER')
    );

-- 3. Asset Transactions Policies
CREATE POLICY "All Users Read Transactions"
    ON "asset_transactions" FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Warehouse Staff Create Transactions"
    ON "asset_transactions" FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_EMPLOYEE', 'POWER_USER')
    );

-- 4. Notifications Policy
CREATE POLICY "Users Read Own Notifications"
    ON "notifications" FOR SELECT
    USING (userId = auth.uid()::text);

-- 5. Audit Logs Policy
CREATE POLICY "Admins Read Audit Logs"
    ON "audit_logs" FOR SELECT
    USING (auth.jwt() ->> 'role' = 'ADMIN');
