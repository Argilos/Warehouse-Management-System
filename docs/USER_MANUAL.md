# Operational User Manual

Welcome to the **Warehouse Asset, Tool, and Employee Management System**. This guide explains daily workflows for warehouse operators, field employees, and managers.

---

## 1. Quick Start: Mobile QR Scanning

### Scanning a Tool QR Code on Mobile
1. Open the application on your smartphone browser or mobile tablet.
2. Tap the blue **Scan QR Code** button in the top header or main menu.
3. Grant camera permissions when prompted.
4. Point your camera at the QR label attached to the tool or equipment.
5. The system will automatically detect the QR code and display the **Asset Information Screen**.

### Alternative Quick Entry
If camera scanning is unavailable or lighting is dim:
- Tap **Upload QR Image** to pick a photo from your gallery.
- Or type the **Asset ID / QR Code** directly into the search bar (e.g., `QR-POW-2026-0001`).

---

## 2. Tool Issuing & Return Workflow

### How to Issue Equipment to an Employee
1. Navigate to **Tool Issuing & Returning** -> Click **Issue Equipment**.
2. Select the target **Employee** from the dropdown list.
3. (Optional) Select the **Project / Job Site** where the equipment will be used.
4. Select one or multiple tools by scanning their QR codes or choosing from the list.
5. Set an **Expected Return Date**.
6. Click **Confirm Issuing**. The system generates a digital receipt and updates tool status to `ISSUED`.

### How to Return Equipment
1. Navigate to **Tool Issuing & Returning** -> Click **Return Tool**.
2. Scan the tool's QR code or select from active loans.
3. Select tool condition: **Good**, **Needs Minor Repair**, or **Damaged**.
4. Add return notes if damaged or missing accessories.
5. Click **Process Return**. Tool status reverts to `AVAILABLE` (or `DAMAGED`).

---

## 3. Managing Tool Boxes (Kits)

Tool boxes are pre-packaged sets of tools assigned as a unit (e.g., "Master Plumbing Kit #02"):
1. Go to **Tool Box Management**.
2. Click **Create Tool Box**.
3. Name the box and assign tools by scanning or selecting from the catalog.
4. Assign the entire toolbox to an employee or job site.
5. Perform periodic kit audits to verify all included hand tools are present.

---

## 4. Reporting Damaged Equipment & Service Orders

If a tool malfunctions or breaks down during use:
1. Scan the tool's QR code on your mobile device.
2. Tap **Report Damage / Request Service**.
3. Enter a detailed problem description.
4. The Warehouse Manager receives a notification and converts the report into a **Service Order** dispatched to the repair supplier.

---

## 5. Employee Clearance Checklist

When an employee transfers departments or leaves the company:
1. Open **Employee Management** -> Select Employee Profile.
2. Click **Generate Exit Clearance Report**.
3. The system scans active custody records.
4. If all assigned tools, toolboxes, and equipment are returned, a green **CLEARANCE APPROVED** badge is rendered for HR.
