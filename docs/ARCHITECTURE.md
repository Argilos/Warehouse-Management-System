# Technical Architecture & API Documentation

## 1. System Overview

The **Enterprise Warehouse Asset, Tool, and Employee Management System** is built on a modern decoupled web architecture designed for low-latency field usage, offline QR scan resiliency, and enterprise scalability.

### Architecture Highlights:
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, `html5-qrcode` engine, `qrcode` npm tag generator.
- **State Management**: Zustand global store with persistence + TanStack Query cache.
- **Backend Architecture**: REST API design with Node.js Express controllers + Prisma ORM.
- **Database**: Supabase PostgreSQL with RLS policies, automated trigger functions, and Supabase Storage buckets.
- **Deployment**: Coolify PaaS + Multi-stage Docker containerization.

---

## 2. QR Code Mobile Engine & Deep Linking

Every physical tool in the warehouse is tagged with a secure QR code encoding an HTTP URL:

`https://warehouse.company.com/scan?code=QR-CAT-2026-0042`

When scanned by any mobile phone:
1. The camera stream captures the payload.
2. The frontend routes to `/scan` which decodes the payload token `QR-CAT-2026-0042`.
3. The system queries asset specifications and renders the **Mobile QR Action Screen** optimized for field operations with direct buttons for:
   - Tool Checkout / Issuing
   - Tool Return
   - Reporting Damage
   - Maintenance Request
   - Transfer to Project

---

## 3. Financial Asset Depreciation Model

The system implements automated straight-line asset depreciation:

$$\text{Annual Depreciation} = \text{Purchase Price} \times \left( \frac{\text{Depreciation Rate \%}}{100} \right)$$

$$\text{Current Value} = \max\left(0, \text{Purchase Price} - (\text{Annual Depreciation} \times \text{Years Elapsed})\right)$$

Supported depreciation presets:
- **5% Per Annum**: Heavy machinery, stationary compressors, generators.
- **10% Per Annum**: Power tools, battery drills, impact drivers.
- **20% / Custom**: Electronics, laptop diagnostics, mobile devices.

---

## 4. REST API Endpoint Specifications

### Asset Management (`/api/assets`)
- `GET /api/assets` - List all assets with search, category, and status filters.
- `GET /api/assets/:id` - Fetch 360° asset personal card (history, calibrations, services).
- `POST /api/assets` - Create a new asset record and generate unique QR code.
- `PUT /api/assets/:id` - Update asset specifications or location.
- `DELETE /api/assets/:id` - Retire/archive asset.

### Tool Issuing (`/api/transactions`)
- `POST /api/transactions/issue` - Issue single or bulk assets to an employee/project.
- `POST /api/transactions/return` - Return assets with condition assessment and notes.

### Maintenance & Service (`/api/service-orders`)
- `POST /api/service-orders` - Dispatch asset to service provider.
- `PUT /api/service-orders/:id/complete` - Mark service as completed, log repair costs and invoice.

### Calibration (`/api/calibrations`)
- `POST /api/calibrations` - Record calibration test result and upload certificate.
- `GET /api/calibrations/due` - List assets with calibration due within 30 days.

---

## 5. Security & Permission Matrix (RBAC)

| Feature / Module            | Admin | Warehouse Manager | Warehouse Employee | Power User |
| --------------------------- | :---: | :---------------: | :----------------: | :--------: |
| Asset Creation & Edit       |  YES  |        YES        |         NO         |    READ    |
| QR Scanning & Search        |  YES  |        YES        |        YES         |    YES     |
| Issue & Return Equipment    |  YES  |        YES        |        YES         |    YES     |
| Maintenance & Service Orders|  YES  |        YES        |    Report Only     |    YES     |
| Calibration Records         |  YES  |        YES        |        READ        |    READ    |
| Employee Exit Clearance     |  YES  |        YES        |         NO         |     NO     |
| System User Management      |  YES  |        NO         |         NO         |     NO     |
| Audit Trail Access          |  YES  |        NO         |         NO         |     NO     |
