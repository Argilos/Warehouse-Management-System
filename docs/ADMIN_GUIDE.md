# Administrator Guide

This guide covers system administration, role management, audit logging, and configuration settings for administrators.

---

## 1. Role-Based Access Control (RBAC) Management

Administrators can grant or revoke roles for system users:
- **Admin**: Complete system access including audit logs, role editing, and DB settings.
- **Warehouse Manager**: Full control over assets, toolboxes, service orders, calibrations, and issuing.
- **Warehouse Employee**: Tool check-in/out, QR scanning, damage reporting, and custody views.
- **Power User**: External project assignments, approval overrides, and special transactions.

### Creating & Managing Users:
1. Go to **User Management**.
2. Click **Add System User**.
3. Fill in user credentials and select target **Role**.
4. Toggle active status as needed.

---

## 2. Audit Trail & Log Monitoring

Every critical system action is automatically recorded in an immutable audit trail:
- Navigate to **Audit Logs**.
- Filter logs by:
  - **User**: Who performed the action.
  - **Entity**: Asset, Employee, Service Order, Calibration.
  - **Action**: Create, Update, Delete, Status Change, Issue, Return.
- View exact `oldValues` vs `newValues` JSON diffs.

---

## 3. Financial Depreciation Configuration

Configure system-wide depreciation rates under **System Settings**:
- Default straight-line depreciation percentage (5%, 10%, custom).
- Automatic annual valuation trigger schedules.
- Valuation report export format parameters.

---

## 4. Supabase & Storage Bucket Maintenance

Ensure Supabase connection parameters and storage policies remain healthy:
- Check bucket status under **System Settings** -> **Supabase Integration Status**.
- Verify public/authenticated read access rules for uploaded asset manuals and calibration certificates.
