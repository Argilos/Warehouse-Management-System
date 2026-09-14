// Express Routes for Warehouse Asset and Employee Management
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const prisma = new PrismaClient();
const router = Router();

// Helper to format dates cleanly or fallback
const parseDate = (d?: string | Date) => (d ? new Date(d) : new Date());

export interface DateRangeResult {
  filter?: { gte?: Date; lte?: Date };
  error?: string;
}

export function parseDateRangeFilter(req: Request): DateRangeResult {
  const { startDate, endDate } = req.query;
  if (!startDate && !endDate) {
    return {};
  }

  let start: Date | undefined;
  let end: Date | undefined;

  if (startDate) {
    const sStr = String(startDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(sStr)) {
      start = new Date(`${sStr}T00:00:00.000Z`);
    } else {
      start = new Date(sStr);
    }
    if (isNaN(start.getTime())) {
      return { error: `Invalid startDate format: "${startDate}". Expected YYYY-MM-DD or valid ISO date.` };
    }
  }

  if (endDate) {
    const eStr = String(endDate).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(eStr)) {
      end = new Date(`${eStr}T23:59:59.999Z`);
    } else {
      end = new Date(eStr);
    }
    if (isNaN(end.getTime())) {
      return { error: `Invalid endDate format: "${endDate}". Expected YYYY-MM-DD or valid ISO date.` };
    }
  }

  if (start && end && start > end) {
    return { error: 'startDate cannot be after endDate' };
  }

  const dateClause: { gte?: Date; lte?: Date } = {};
  if (start) dateClause.gte = start;
  if (end) dateClause.lte = end;

  return { filter: dateClause };
}

interface ToolboxKitInfo {
  id: string;
  boxNumber: string;
  name: string;
  toolCount: number;
}

export function formatOtpremnicaItems(doc: any, trxById: Map<string, any>, transactionsRawFallback?: any[]) {
  const items: any[] = [];

  // Check if doc was a toolbox kit issuance
  if (doc.notes && doc.notes.includes('[TOOLBOX KIT:')) {
    const kitMatch = doc.notes.match(/\[TOOLBOX KIT:\s*([^\s-]+)\s*-\s*([^\]]+)\]/);
    if (kitMatch) {
      const boxNum = kitMatch[1].trim();
      const boxName = kitMatch[2].trim();
      items.push({
        assetId: `kit-${doc.id}`,
        assetNumber: boxNum,
        assetName: `[KIT] ${boxName}`,
        serialNumber: boxNum,
        category: 'ToolBox Kit',
        status: 'ASSIGNED',
        quantity: 1,
        notes: `Master Tool Box Kit`,
      });
    }
  }

  let toolItems: any[] = [];
  if (doc.transactionIds && doc.transactionIds.length > 0) {
    toolItems = doc.transactionIds
      .map((tid: string) => trxById.get(tid))
      .filter((t: any) => t && t.asset)
      .map((t: any) => ({
        assetId: t.asset.id,
        assetNumber: t.asset.assetNumber,
        assetName: t.asset.name,
        serialNumber: t.asset.serialNumber,
        category: t.asset.category,
        status: t.asset.status,
        quantity: 1,
        notes: t.notes || undefined,
      }));
  }

  // Fallback for legacy documents where transactionIds were not recorded
  if (toolItems.length === 0 && doc.employeeId && transactionsRawFallback) {
    const docDate = doc.issueDate ? new Date(doc.issueDate).toISOString().slice(0, 10) : '';
    toolItems = transactionsRawFallback
      .filter((t: any) =>
        t.employeeId === doc.employeeId &&
        t.transactionType === 'ISSUE' &&
        t.asset &&
        (!docDate || (t.transactionDate && new Date(t.transactionDate).toISOString().slice(0, 10) === docDate))
      )
      .map((t: any) => ({
        assetId: t.asset.id,
        assetNumber: t.asset.assetNumber,
        assetName: t.asset.name,
        serialNumber: t.asset.serialNumber,
        category: t.asset.category,
        status: t.asset.status,
        quantity: 1,
        notes: t.notes || undefined,
      }));
  }

  items.push(...toolItems);
  return items;
}

export async function createOtpremnicaDocumentHelper({
  employeeId,
  projectId,
  transactionIds,
  notes,
  createdById,
  toolboxKitInfo,
}: {
  employeeId: string;
  projectId?: string;
  transactionIds: string[];
  notes?: string;
  createdById?: string;
  toolboxKitInfo?: ToolboxKitInfo;
}) {
  let user = createdById ? await prisma.user.findUnique({ where: { id: createdById } }) : await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'admin@warehouse.com', firstName: 'System', lastName: 'Admin', role: 'ADMIN' },
    });
  }

  const currentYear = new Date().getFullYear();
  const count = await prisma.otpremnicaDocument.count();
  const seqNum = String(count + 1).padStart(4, '0');
  const documentNumber = `OTP-${currentYear}-${seqNum}`;

  let docNotes = notes || null;
  if (toolboxKitInfo) {
    const kitPrefix = `[TOOLBOX KIT: ${toolboxKitInfo.boxNumber} - ${toolboxKitInfo.name}]`;
    docNotes = docNotes ? `${kitPrefix} ${docNotes}` : kitPrefix;
  }

  const doc = await prisma.otpremnicaDocument.create({
    data: {
      documentNumber,
      employeeId,
      projectId: projectId || null,
      createdById: user.id,
      issueDate: new Date(),
      notes: docNotes,
      transactionIds: transactionIds || [],
    },
    include: { employee: true, project: true, createdBy: true },
  });

  const transactions = (transactionIds && transactionIds.length > 0) ? await prisma.assetTransaction.findMany({
    where: { id: { in: transactionIds } },
    include: { asset: true },
  }) : [];

  const items: any[] = [];

  if (toolboxKitInfo) {
    items.push({
      assetId: toolboxKitInfo.id,
      assetNumber: toolboxKitInfo.boxNumber,
      assetName: `[KIT] ${toolboxKitInfo.name}`,
      serialNumber: toolboxKitInfo.boxNumber,
      category: 'ToolBox Kit',
      status: 'ASSIGNED',
      quantity: 1,
      isKitHeader: true,
      notes: `Tool Box Kit with ${toolboxKitInfo.toolCount} component tools`,
    });
  }

  transactions.forEach((t: any) => {
    if (t.asset) {
      items.push({
        assetId: t.asset.id,
        assetNumber: t.asset.assetNumber,
        assetName: t.asset.name,
        serialNumber: t.asset.serialNumber,
        category: t.asset.category,
        status: t.asset.status,
        quantity: 1,
        notes: t.notes || undefined,
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      entity: 'OtpremnicaDocument',
      entityId: doc.id,
      action: 'OTPREMNICA_GENERATED',
      newValues: { documentNumber, employeeId, projectId, transactionCount: transactionIds.length },
    },
  });

  return {
    id: doc.id,
    documentNumber: doc.documentNumber,
    employeeId: doc.employeeId,
    employeeName: doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : undefined,
    employeeNumber: doc.employee?.employeeNumber || undefined,
    employeeDepartment: doc.employee?.department || undefined,
    projectId: doc.projectId || undefined,
    projectName: doc.project?.name || undefined,
    projectCode: doc.project?.projectCode || undefined,
    createdById: doc.createdById,
    createdByName: doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : undefined,
    issueDate: doc.issueDate ? (doc.issueDate instanceof Date ? doc.issueDate.toISOString().slice(0, 10) : new Date(doc.issueDate).toISOString().slice(0, 10)) : new Date().toISOString().slice(0, 10),
    notes: doc.notes || undefined,
    transactionIds: doc.transactionIds || [],
    items,
    createdAt: doc.createdAt ? (doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString()) : new Date().toISOString(),
  };
}


// ─── INITIAL HYDRATION / DASHBOARD ───────────────────────────────────────────
router.get('/initial-data', async (req: Request, res: Response) => {
  try {
    const [
      users,
      employees,
      suppliers,
      projects,
      assetsRaw,
      toolBoxesRaw,
      serviceOrdersRaw,
      calibrationsRaw,
      transactionsRaw,
      inventoryChecksRaw,
      notificationsRaw,
      auditLogsRaw,
      maintenancePlansRaw,
      maintenanceTasksRaw,
      otpremnicaDocsRaw,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.employee.findMany({
        include: { _count: { select: { employeeAssets: { where: { returnedDate: null } } } } },
      }),
      prisma.supplier.findMany({
        include: { _count: { select: { assets: true } } },
      }),
      prisma.project.findMany({
        include: { _count: { select: { transactions: true } } },
      }),
      prisma.asset.findMany({
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        include: {
          supplier: true,
          employeeAssets: {
            where: { returnedDate: null },
            include: { employee: true },
            take: 1,
          },
          serviceOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
          calibrations: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.toolBox.findMany({
        include: {
          employee: true,
          items: { include: { asset: true } },
        },
      }),
      prisma.serviceOrder.findMany({
        include: { asset: true, supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.calibrationRecord.findMany({
        include: { asset: true, provider: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.assetTransaction.findMany({
        include: { asset: true, employee: true, performedBy: true, project: true },
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.inventoryCheck.findMany({
        include: { performedBy: true, items: { include: { asset: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.maintenancePlan.findMany({
        include: { asset: true, responsible: true, tasks: { orderBy: { createdAt: 'desc' } } },
        orderBy: { nextDueDate: 'asc' },
      }),
      prisma.maintenanceTask.findMany({
        include: { asset: true, plan: true, assignedTo: true },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.otpremnicaDocument.findMany({
        include: { employee: true, project: true, createdBy: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let notifications = notificationsRaw;
    if (notifications.length === 0) {
      let firstUser = users.length > 0 ? users[0] : null;
      if (!firstUser) {
        firstUser = await prisma.user.create({
          data: { email: 'admin@warehouse.com', firstName: 'System', lastName: 'Admin', role: 'ADMIN' }
        });
      }

      await prisma.notification.createMany({
        data: [
          {
            userId: firstUser.id,
            type: 'SERVICE',
            title: 'Equipment Damage Dispatched to Repair',
            message: 'DeWalt Rotary Hammer Drill (AST-POW-001) reported damaged with slipping chuck mechanism and dispatched to Bosch Repair Services.',
            isRead: false,
            entityType: 'SERVICE_ORDER',
            entityId: null,
          },
          {
            userId: firstUser.id,
            type: 'CALIBRATION',
            title: 'Calibration Expiration Warning (Due in 14 Days)',
            message: 'Fluke 87V Digital Multimeter (AST-MEAS-004) precision calibration expires on 2026-09-01. Please schedule vendor testing.',
            isRead: false,
            entityType: 'CALIBRATION',
            entityId: null,
          },
          {
            userId: firstUser.id,
            type: 'OVERDUE',
            title: 'Overdue Equipment Loan Alert',
            message: 'Bosch Angle Grinder 4.5 inch (AST-POW-012) issued to John Doe is past its expected return date (2026-08-10).',
            isRead: false,
            entityType: 'ASSET',
            entityId: null,
          },
        ]
      });

      notifications = await prisma.notification.findMany({ orderBy: { createdAt: 'desc' } });
    }

    // Automated 30-day calibration expiration & overdue loan scanners
    const now = new Date();
    const targetUser = users.length > 0 ? users[0] : null;

    if (targetUser) {
      const dueAssetMap = new Map<string, { assetName: string; certNum: string; nextCalibrationDate: Date }>();

      for (const cal of calibrationsRaw as any[]) {
        if (cal.assetId && cal.nextCalibrationDate && cal.asset && !dueAssetMap.has(cal.assetId)) {
          dueAssetMap.set(cal.assetId, {
            assetName: cal.asset.name,
            certNum: cal.certificateNumber || cal.asset.assetNumber,
            nextCalibrationDate: new Date(cal.nextCalibrationDate),
          });
        }
      }

      for (const asset of assetsRaw as any[]) {
        if (asset.nextCalibrationDate && !dueAssetMap.has(asset.id)) {
          dueAssetMap.set(asset.id, {
            assetName: asset.name,
            certNum: `CERT-${asset.assetNumber}`,
            nextCalibrationDate: new Date(asset.nextCalibrationDate),
          });
        }
      }

      for (const [assetId, item] of Array.from(dueAssetMap.entries())) {
        const diffDays = (item.nextCalibrationDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays >= 0 && diffDays <= 30) {
          const exists = notifications.some(
            (n: any) =>
              n.type === 'CALIBRATION' &&
              n.title.includes('Expiration Warning') &&
              (n.message.includes(item.assetName) || n.message.includes(item.certNum))
          );
          if (!exists) {
            const daysLeft = Math.ceil(diffDays);
            const createdNotif = await prisma.notification.create({
              data: {
                userId: targetUser.id,
                type: 'CALIBRATION',
                title: `Calibration Expiration Warning (${item.assetName})`,
                message: `Precision calibration for ${item.assetName} (${item.certNum}) expires on ${item.nextCalibrationDate.toISOString().slice(0, 10)} (due in ${daysLeft} days).`,
                isRead: false,
                entityType: 'ASSET',
                entityId: assetId,
              },
            });
            notifications.unshift(createdNotif);
          }
        }
      }

      for (const trx of transactionsRaw as any[]) {
        if (trx.transactionType === 'ISSUE' && trx.returnDate && trx.asset?.status === 'ISSUED') {
          const retDate = new Date(trx.returnDate);
          if (retDate < now) {
            const assetNum = trx.asset.assetNumber;
            const exists = notifications.some((n: any) => n.message.includes(assetNum));
            if (!exists) {
              const empName = trx.employee ? `${trx.employee.firstName} ${trx.employee.lastName}` : 'Field Worker';
              const createdNotif = await prisma.notification.create({
                data: {
                  userId: targetUser.id,
                  type: 'OVERDUE',
                  title: `Overdue Loan Alert (${trx.asset.name})`,
                  message: `Equipment ${trx.asset.name} (${assetNum}) issued to ${empName} was expected back on ${retDate.toISOString().slice(0, 10)} and is past due.`,
                  isRead: false,
                  entityType: 'ASSET',
                  entityId: trx.assetId,
                },
              });
              notifications.unshift(createdNotif);
            }
          }
        }
      }
    }

    // Format assets for frontend interface expectations
    const assets = assetsRaw.map((a: any) => {
      const currentHolder = a.employeeAssets[0]?.employee;
      const lastService = a.serviceOrders[0];
      const lastCal = a.calibrations[0];
      return {
        id: a.id,
        assetNumber: a.assetNumber,
        qrCode: a.qrCode,
        barcode: a.barcode || undefined,
        name: a.name,
        description: a.description || undefined,
        category: a.category,
        manufacturer: a.manufacturer,
        model: a.model,
        serialNumber: a.serialNumber,
        status: a.status,
        location: a.location,
        purchaseDate: a.purchaseDate.toISOString().slice(0, 10),
        purchasePrice: a.purchasePrice,
        currentValue: a.currentValue,
        depreciationRate: a.depreciationRate,
        supplierId: a.supplierId || undefined,
        supplierName: a.supplier?.companyName || undefined,
        holderEmployeeId: currentHolder?.id || undefined,
        holderEmployeeName: currentHolder ? `${currentHolder.firstName} ${currentHolder.lastName}` : undefined,
        lastServiceDate: lastService?.receivedDate?.toISOString().slice(0, 10) || undefined,
        nextCalibrationDate: lastCal?.nextCalibrationDate?.toISOString().slice(0, 10) || undefined,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      };
    });

    const formattedEmployees = employees.map((e: any) => ({
      id: e.id,
      employeeNumber: e.employeeNumber,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone,
      department: e.department,
      position: e.position,
      status: e.status,
      hireDate: e.hireDate.toISOString().slice(0, 10),
      terminationDate: e.terminationDate?.toISOString().slice(0, 10) || undefined,
      assignedAssetCount: e._count.employeeAssets,
    }));

    const formattedSuppliers = suppliers.map((s: any) => ({
      id: s.id,
      companyName: s.companyName,
      contactPerson: s.contactPerson,
      phone: s.phone,
      email: s.email,
      address: s.address,
      services: s.services || undefined,
      activeAssetCount: s._count.assets,
    }));

    const formattedProjects = projects.map((p: any) => ({
      id: p.id,
      projectCode: p.projectCode,
      name: p.name,
      client: p.client,
      department: p.department,
      status: p.status,
      startDate: p.startDate.toISOString().slice(0, 10),
      endDate: p.endDate?.toISOString().slice(0, 10) || undefined,
      location: p.location || undefined,
      assignedAssetCount: p._count.transactions,
    }));

    const formattedToolBoxes = toolBoxesRaw.map((tb: any) => ({
      id: tb.id,
      boxNumber: tb.boxNumber,
      qrCode: `QR-${tb.boxNumber}`,
      name: tb.name,
      employeeId: tb.employeeId || undefined,
      employeeName: tb.employee ? `${tb.employee.firstName} ${tb.employee.lastName}` : undefined,
      status: tb.status,
      assignedDate: tb.assignedDate?.toISOString().slice(0, 10) || undefined,
      items: tb.items.map((i: any) => ({
        id: i.asset.id,
        assetNumber: i.asset.assetNumber,
        qrCode: i.asset.qrCode,
        barcode: i.asset.barcode || undefined,
        name: i.asset.name,
        category: i.asset.category,
        manufacturer: i.asset.manufacturer,
        model: i.asset.model,
        serialNumber: i.asset.serialNumber,
        status: i.asset.status,
        location: i.asset.location,
        purchaseDate: i.asset.purchaseDate.toISOString().slice(0, 10),
        purchasePrice: i.asset.purchasePrice,
        currentValue: i.asset.currentValue,
        depreciationRate: i.asset.depreciationRate,
        createdAt: i.asset.createdAt.toISOString(),
        updatedAt: i.asset.updatedAt.toISOString(),
      })),
      lastInspectedDate: tb.updatedAt.toISOString().slice(0, 10),
    }));

    const formattedServiceOrders = serviceOrdersRaw.map((s: any) => ({
      id: s.id,
      assetId: s.assetId,
      assetName: s.asset.name,
      assetNumber: s.asset.assetNumber,
      supplierId: s.supplierId || undefined,
      supplierName: s.supplier?.companyName || undefined,
      problemDescription: s.problemDescription,
      sentDate: s.sentDate.toISOString().slice(0, 10),
      receivedDate: s.receivedDate?.toISOString().slice(0, 10) || undefined,
      repairCost: s.repairCost || 0,
      replacedParts: s.replacedParts || undefined,
      status: s.status,
    }));

    const formattedCalibrations = calibrationsRaw.map((c: any) => ({
      id: c.id,
      assetId: c.assetId,
      assetName: c.asset.name,
      assetNumber: c.asset.assetNumber,
      providerId: c.providerId || undefined,
      providerName: c.provider?.companyName || 'Authorized Calibrator',
      calibrationDate: c.calibrationDate.toISOString().slice(0, 10),
      nextCalibrationDate: c.nextCalibrationDate.toISOString().slice(0, 10),
      certificateNumber: c.certificateNumber,
      result: c.result,
      documentUrl: c.documentUrl || undefined,
      notes: c.notes || undefined,
    }));

    const formattedTransactions = transactionsRaw.map((t: any) => ({
      id: t.id,
      assetId: t.assetId,
      assetName: t.asset.name,
      assetNumber: t.asset.assetNumber,
      employeeId: t.employeeId || undefined,
      employeeName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : undefined,
      transactionType: t.transactionType,
      transactionDate: t.transactionDate.toISOString(),
      returnDate: t.returnDate?.toISOString().slice(0, 10) || undefined,
      performedById: t.performedById,
      performedByName: `${t.performedBy.firstName} ${t.performedBy.lastName}`,
      notes: t.notes || undefined,
      projectId: t.projectId || undefined,
      projectName: t.project?.name || undefined,
    }));

    const formattedInventoryChecks = inventoryChecksRaw.map((ic: any) => ({
      id: ic.id,
      checkNumber: ic.checkNumber,
      title: ic.title,
      performedById: ic.performedById,
      performedByName: `${ic.performedBy.firstName} ${ic.performedBy.lastName}`,
      checkDate: ic.checkDate.toISOString().slice(0, 10),
      status: ic.status,
      totalAssets: ic.totalAssets,
      verifiedAssets: ic.verifiedAssets,
      missingAssets: ic.missingAssets,
      damagedAssets: ic.damagedAssets,
      notes: ic.notes || undefined,
    }));

    const formattedAuditLogs = auditLogsRaw.map((l: any) => ({
      id: l.id,
      userId: l.userId,
      userName: `${l.user.firstName} ${l.user.lastName}`,
      userRole: l.user.role,
      entity: l.entity,
      entityId: l.entityId,
      action: l.action,
      oldValues: (l.oldValues as any) || undefined,
      newValues: (l.newValues as any) || undefined,
      createdAt: l.createdAt.toISOString(),
    }));

    // ─── AUTOMATED PREVENTIVE MAINTENANCE SCANNER & DEDUPLICATION ─────────────
    let tasksList = [...maintenanceTasksRaw];

    for (const plan of maintenancePlansRaw as any[]) {
      if (plan.status === 'ACTIVE' && plan.nextDueDate) {
        const nextDate = new Date(plan.nextDueDate);
        const diffDays = (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24);

        // Deduplication Check: Check if an active (PENDING or IN_PROGRESS) task already exists for this plan
        const hasActiveTask = tasksList.some(
          (t: any) => t.planId === plan.id && (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
        );

        if (!hasActiveTask && diffDays <= 30) {
          const randNum = Math.floor(100 + Math.random() * 900);
          const taskNumber = `PM-${now.getFullYear()}-${randNum}`;
          const newTask = await prisma.maintenanceTask.create({
            data: {
              taskNumber,
              planId: plan.id,
              assetId: plan.assetId,
              title: plan.name,
              type: plan.type,
              priority: plan.priority,
              dueDate: plan.nextDueDate,
              assignedToId: plan.responsibleId || null,
              checklistProgress: plan.checklist || undefined,
              status: 'PENDING',
            },
            include: { asset: true, plan: true, assignedTo: true },
          });
          tasksList.unshift(newTask);
        }
      }
    }

    if (targetUser) {
      for (const task of tasksList as any[]) {
        if (task.status === 'PENDING' || task.status === 'IN_PROGRESS') {
          const dueDate = new Date(task.dueDate);
          const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
          if (diffDays <= 30) {
            const exists = notifications.some((n: any) => n.type === 'SERVICE' && n.message.includes(task.taskNumber));
            if (!exists) {
              let title = `Preventive Maintenance Alert: ${task.asset?.name || task.title}`;
              let message = `Preventive maintenance (${task.title}) for ${task.asset?.name} [${task.taskNumber}] is due on ${dueDate.toISOString().slice(0, 10)}.`;
              if (diffDays < 0) {
                const daysOverdue = Math.abs(Math.floor(diffDays));
                message = `OVERDUE: Preventive maintenance (${task.title}) for ${task.asset?.name} [${task.taskNumber}] is overdue by ${daysOverdue} days!`;
              } else if (Math.floor(diffDays) === 0) {
                message = `DUE TODAY: Preventive maintenance (${task.title}) for ${task.asset?.name} [${task.taskNumber}] is due today.`;
              }
              const createdNotif = await prisma.notification.create({
                data: {
                  userId: targetUser.id,
                  type: 'SERVICE',
                  title,
                  message,
                  isRead: false,
                  entityType: 'MAINTENANCE_TASK',
                  entityId: task.id,
                },
              });
              notifications.unshift(createdNotif);
            }
          }
        }
      }
    }

    const formattedUsers = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      phone: u.phone || undefined,
      active: u.active,
      createdAt: u.createdAt.toISOString(),
    }));

    const formattedMaintenancePlans = maintenancePlansRaw.map((mp: any) => ({
      id: mp.id,
      assetId: mp.assetId,
      assetName: mp.asset.name,
      assetNumber: mp.asset.assetNumber,
      assetCategory: mp.asset.category,
      name: mp.name,
      description: mp.description || undefined,
      type: mp.type,
      priority: mp.priority,
      frequency: mp.frequency,
      frequencyUnit: mp.frequencyUnit,
      firstDueDate: mp.firstDueDate.toISOString().slice(0, 10),
      lastCompletedDate: mp.lastCompletedDate?.toISOString().slice(0, 10) || undefined,
      nextDueDate: mp.nextDueDate.toISOString().slice(0, 10),
      responsibleId: mp.responsibleId || undefined,
      responsibleName: mp.responsible ? `${mp.responsible.firstName} ${mp.responsible.lastName}` : undefined,
      estimatedDurationMinutes: mp.estimatedDurationMinutes || 60,
      estimatedCost: mp.estimatedCost || 0,
      status: mp.status,
      instructions: mp.instructions || undefined,
      checklist: (mp.checklist as any) || undefined,
      requiredParts: mp.requiredParts || undefined,
      createdById: mp.createdById || undefined,
      createdAt: mp.createdAt.toISOString(),
      updatedAt: mp.updatedAt.toISOString(),
    }));

    const formattedMaintenanceTasks = tasksList.map((mt: any) => ({
      id: mt.id,
      taskNumber: mt.taskNumber,
      planId: mt.planId || undefined,
      planName: mt.plan?.name || undefined,
      assetId: mt.assetId,
      assetName: mt.asset?.name || 'Equipment',
      assetNumber: mt.asset?.assetNumber || 'AST-000',
      assetSerialNumber: mt.asset?.serialNumber || undefined,
      assetCategory: mt.asset?.category || undefined,
      title: mt.title,
      type: mt.type,
      priority: mt.priority,
      dueDate: mt.dueDate.toISOString().slice(0, 10),
      assignedToId: mt.assignedToId || undefined,
      assignedToName: mt.assignedTo ? `${mt.assignedTo.firstName} ${mt.assignedTo.lastName}` : undefined,
      status: mt.status,
      startedAt: mt.startedAt?.toISOString() || undefined,
      completedAt: mt.completedAt?.toISOString() || undefined,
      actualDurationMinutes: mt.actualDurationMinutes || undefined,
      laborCost: mt.laborCost || 0,
      partsCost: mt.partsCost || 0,
      totalCost: mt.totalCost || 0,
      result: mt.result || undefined,
      notes: mt.notes || undefined,
      checklistProgress: (mt.checklistProgress as any) || undefined,
      overrideReason: mt.overrideReason || undefined,
      createdById: mt.createdById || undefined,
      createdAt: mt.createdAt.toISOString(),
      updatedAt: mt.updatedAt.toISOString(),
    }));

    const trxById = new Map<string, any>();
    (transactionsRaw || []).forEach((t: any) => {
      trxById.set(t.id, t);
    });

    const formattedOtpremnicaDocs = (otpremnicaDocsRaw || []).map((doc: any) => {
      const items = formatOtpremnicaItems(doc, trxById, transactionsRaw);

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        employeeId: doc.employeeId,
        employeeName: doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : undefined,
        employeeNumber: doc.employee?.employeeNumber || undefined,
        employeeDepartment: doc.employee?.department || undefined,
        projectId: doc.projectId || undefined,
        projectName: doc.project?.name || undefined,
        projectCode: doc.project?.projectCode || undefined,
        createdById: doc.createdById,
        createdByName: doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : undefined,
        issueDate: doc.issueDate.toISOString().slice(0, 10),
        notes: doc.notes || undefined,
        transactionIds: doc.transactionIds || [],
        items,
        createdAt: doc.createdAt.toISOString(),
      };
    });

    res.json({
      users: formattedUsers,
      employees: formattedEmployees,
      suppliers: formattedSuppliers,
      projects: formattedProjects,
      assets,
      toolBoxes: formattedToolBoxes,
      serviceOrders: formattedServiceOrders,
      calibrations: formattedCalibrations,
      transactions: formattedTransactions,
      inventoryChecks: formattedInventoryChecks,
      notifications,
      auditLogs: formattedAuditLogs,
      maintenancePlans: formattedMaintenancePlans,
      maintenanceTasks: formattedMaintenanceTasks,
      otpremnicaDocuments: formattedOtpremnicaDocs,
    });
  } catch (error) {
    console.error('Error fetching initial data:', error);
    res.status(500).json({ error: 'Failed to fetch initial data' });
  }
});

// ─── ASSETS ──────────────────────────────────────────────────────────────────
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const { filter: dateFilter, error: dateError } = parseDateRangeFilter(req);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const where: any = {};
    if (dateFilter) {
      where.purchaseDate = dateFilter;
    }
    if (req.query.status && req.query.status !== 'ALL') {
      where.status = String(req.query.status);
    }
    if (req.query.category && req.query.category !== 'ALL') {
      where.category = String(req.query.category);
    }

    const assets = await prisma.asset.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      include: {
        supplier: true,
        employeeAssets: {
          where: { returnedDate: null },
          include: { employee: true },
          take: 1,
        },
        serviceOrders: { orderBy: { createdAt: 'desc' }, take: 1 },
        calibrations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/assets', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newAsset = await prisma.asset.create({
      data: {
        assetNumber: body.assetNumber || `AST-${Date.now()}`,
        qrCode: body.qrCode || `QR-${Date.now()}`,
        barcode: body.barcode || null,
        name: body.name,
        description: body.description || null,
        category: body.category,
        manufacturer: body.manufacturer,
        model: body.model,
        serialNumber: body.serialNumber || `SN-${Date.now()}`,
        status: body.status || 'AVAILABLE',
        location: body.location || 'Main Storage',
        purchaseDate: parseDate(body.purchaseDate),
        purchasePrice: Number(body.purchasePrice) || 0,
        currentValue: Number(body.currentValue) || Number(body.purchasePrice) || 0,
        depreciationRate: Number(body.depreciationRate) || 5,
        supplierId: body.supplierId || null,
      },
    });
    res.status(201).json(newAsset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.put('/assets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existingAsset = await prisma.asset.findUnique({ where: { id } });
    if (!existingAsset) return res.status(404).json({ error: 'Asset not found' });

    // Terminal LOST status enforcement
    if (existingAsset.status === 'LOST') {
      return res.status(400).json({
        error: `Asset "${existingAsset.name}" is marked as LOST (terminal state). No further actions or status transitions are permitted.`
      });
    }

    const dataToUpdate: any = { ...body };
    delete dataToUpdate.id;
    delete dataToUpdate.holderEmployeeId;
    delete dataToUpdate.holderEmployeeName;
    delete dataToUpdate.supplierName;
    delete dataToUpdate.lastServiceDate;
    delete dataToUpdate.nextCalibrationDate;

    if (body.purchaseDate) dataToUpdate.purchaseDate = parseDate(body.purchaseDate);
    if (body.purchasePrice) dataToUpdate.purchasePrice = Number(body.purchasePrice);
    if (body.currentValue) dataToUpdate.currentValue = Number(body.currentValue);
    if (body.depreciationRate) dataToUpdate.depreciationRate = Number(body.depreciationRate);

    const updated = await prisma.asset.update({
      where: { id },
      data: dataToUpdate,
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: error.message || 'Failed to update asset' });
  }
});

router.delete('/assets/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.asset.delete({ where: { id } });
    res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ─── TRANSACTIONS (ISSUING & RETURN) ─────────────────────────────────────────
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { filter: dateFilter, error: dateError } = parseDateRangeFilter(req);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const { employeeId, projectId, transactionType, assetId } = req.query;
    const where: any = {};
    if (dateFilter) {
      where.transactionDate = dateFilter;
    }
    if (employeeId && employeeId !== 'ALL') {
      where.employeeId = String(employeeId);
    }
    if (projectId && projectId !== 'ALL') {
      where.projectId = String(projectId);
    }
    if (transactionType && transactionType !== 'ALL') {
      where.transactionType = String(transactionType);
    }
    if (assetId) {
      where.assetId = String(assetId);
    }

    const transactions = await prisma.assetTransaction.findMany({
      where,
      include: { asset: true, employee: true, performedBy: true, project: true },
      orderBy: { transactionDate: 'desc' },
    });

    const formatted = transactions.map((t: any) => ({
      id: t.id,
      assetId: t.assetId,
      assetName: t.asset ? t.asset.name : '',
      assetNumber: t.asset ? t.asset.assetNumber : '',
      employeeId: t.employeeId || undefined,
      employeeName: t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : undefined,
      transactionType: t.transactionType,
      transactionDate: t.transactionDate ? (t.transactionDate instanceof Date ? t.transactionDate.toISOString() : new Date(t.transactionDate).toISOString()) : new Date().toISOString(),
      returnDate: t.returnDate ? (t.returnDate instanceof Date ? t.returnDate.toISOString().slice(0, 10) : new Date(t.returnDate).toISOString().slice(0, 10)) : undefined,
      performedById: t.performedById,
      performedByName: t.performedBy ? `${t.performedBy.firstName} ${t.performedBy.lastName}` : 'Warehouse Staff',
      notes: t.notes || undefined,
      projectId: t.projectId || undefined,
      projectName: t.project?.name || undefined,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch transactions' });
  }
});

router.post('/transactions/issue', async (req: Request, res: Response) => {
  try {
    const { assetIds, employeeId, projectId, expectedReturnDate, notes, performedById } = req.body;

    const targetIds = (assetIds || []) as string[];
    if (targetIds.length === 0) {
      return res.status(400).json({ error: 'No assets specified for issuance' });
    }

    // 1. Guard against non-issuable status (LOST, MISSING, DAMAGED, IN_SERVICE, IN_CALIBRATION, RETIRED)
    const targetAssets = await prisma.asset.findMany({
      where: { id: { in: targetIds } },
    });

    const nonIssuableStatuses = new Set(['LOST', 'MISSING', 'DAMAGED', 'IN_SERVICE', 'IN_CALIBRATION', 'RETIRED']);
    for (const ast of targetAssets) {
      const statusUpper = (ast.status || '').toUpperCase();
      if (nonIssuableStatuses.has(statusUpper)) {
        return res.status(400).json({
          error: `Tool "${ast.name}" (${ast.assetNumber}) has status ${ast.status} and cannot be issued.`
        });
      }
    }

    // 2. Guard against active Crate assignment
    // A tool currently assigned to a crate MUST NOT be issued via a new/separate delivery note
    const crateItems = await prisma.toolBoxItem.findMany({
      where: { assetId: { in: targetIds } },
      include: { toolBox: true, asset: true },
    });

    if (crateItems.length > 0) {
      const item = crateItems[0];
      const toolName = item.asset?.name || 'Tool';
      const toolNum = item.asset?.assetNumber || item.assetId;
      const crateName = item.toolBox?.name || 'Crate';
      const crateNum = item.toolBox?.boxNumber || item.toolBoxId;
      return res.status(400).json({
        error: `Tool "${toolName}" (${toolNum}) is currently in crate "${crateName}" (${crateNum}) and cannot be issued individually until it is returned or the crate is dismantled.`
      });
    }

    let user = performedById ? await prisma.user.findUnique({ where: { id: performedById } }) : null;
    if (!user) {
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@warehouse.com',
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN',
          },
        });
      }
    }

    const createdTransactions = [];

    for (const assetId of targetIds) {
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: 'ISSUED' },
      });

      await prisma.employeeAsset.updateMany({
        where: { assetId, returnedDate: null },
        data: { returnedDate: new Date() },
      });

      if (employeeId) {
        await prisma.employeeAsset.create({
          data: {
            employeeId,
            assetId,
            assignmentType: 'TEMPORARY',
            assignedDate: new Date(),
            notes,
          },
        });
      }

      const trx = await prisma.assetTransaction.create({
        data: {
          assetId,
          employeeId: employeeId || null,
          projectId: projectId || null,
          transactionType: 'ISSUE',
          transactionDate: new Date(),
          returnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
          performedById: user.id,
          notes,
        },
        include: { asset: true, employee: true, project: true, performedBy: true },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'OVERDUE',
          title: `Equipment Loan Issued: ${trx.asset.name}`,
          message: `${trx.asset.name} (${trx.asset.assetNumber}) issued to ${trx.employee ? `${trx.employee.firstName} ${trx.employee.lastName}` : 'Field Staff'} until ${expectedReturnDate || 'Expected Return Date'}.`,
          isRead: false,
          entityType: 'ASSET',
          entityId: trx.assetId,
        },
      });

      createdTransactions.push(trx);
    }

    // Automatically generate Otpremnica Delivery Note for this issuance
    let otpremnicaDoc: any = null;
    if (employeeId && createdTransactions.length > 0) {
      otpremnicaDoc = await createOtpremnicaDocumentHelper({
        employeeId,
        projectId: projectId || undefined,
        transactionIds: createdTransactions.map((t: any) => t.id),
        notes,
        createdById: user.id,
      });

      if (otpremnicaDoc) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'OTPREMNICA',
            title: `Delivery Note Generated: ${otpremnicaDoc.documentNumber}`,
            message: `Delivery Note (Otpremnica) ${otpremnicaDoc.documentNumber} generated for ${createdTransactions.length} equipment item(s).`,
            isRead: false,
            entityType: 'OTPREMNICA',
            entityId: otpremnicaDoc.id,
          },
        });
      }
    }

    res.status(201).json({
      transactions: createdTransactions,
      otpremnica: otpremnicaDoc,
    });
  } catch (error) {
    console.error('Error issuing assets:', error);
    res.status(500).json({ error: 'Failed to issue assets' });
  }
});

router.post('/transactions/return', async (req: Request, res: Response) => {
  try {
    const { assetId, condition, notes, performedById } = req.body;

    let user = performedById ? await prisma.user.findUnique({ where: { id: performedById } }) : null;
    if (!user) {
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@warehouse.com',
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN',
          },
        });
      }
    }

    const targetAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!targetAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Determine target status: DAMAGED, LOST, or AVAILABLE
    let newStatus: 'AVAILABLE' | 'DAMAGED' | 'LOST' = 'AVAILABLE';
    if (condition === 'DAMAGED') {
      newStatus = 'DAMAGED';
    } else if (condition === 'LOST') {
      newStatus = 'LOST';
    }

    const activeAssignment = await prisma.employeeAsset.findFirst({
      where: { assetId, returnedDate: null },
    });

    const empId = activeAssignment?.employeeId;

    await prisma.employeeAsset.updateMany({
      where: { assetId, returnedDate: null },
      data: { returnedDate: new Date(), condition: condition || 'GOOD' },
    });

    await prisma.asset.update({
      where: { id: assetId },
      data: { status: newStatus },
    });

    let returnTrxNotes = notes || `Condition on return: ${condition}`;
    if (condition === 'LOST') {
      returnTrxNotes = notes ? `[MARKED LOST ON RETURN] ${notes}` : 'Equipment reported lost/missing during return inspection.';
    } else if (condition === 'DAMAGED') {
      returnTrxNotes = notes ? `[RETURNED DAMAGED] ${notes}` : 'Equipment returned in damaged condition requiring service repair.';
    }

    const trx = await prisma.assetTransaction.create({
      data: {
        assetId,
        employeeId: empId || null,
        transactionType: 'RETURN',
        transactionDate: new Date(),
        performedById: user.id,
        notes: returnTrxNotes,
      },
      include: { asset: true, employee: true, performedBy: true },
    });

    // Atomically create reactive maintenance service order and maintenance task if DAMAGED
    let autoServiceOrder: any = null;
    let autoMaintenanceTask: any = null;

    if (newStatus === 'DAMAGED') {
      autoServiceOrder = await prisma.serviceOrder.create({
        data: {
          assetId,
          problemDescription: `Auto-generated reactive service order from damaged tool return (Return Trx ID: ${trx.id}). Notes: ${notes || 'Returned in damaged condition.'}`,
          status: 'PENDING',
          sentDate: new Date(),
        },
        include: { asset: true },
      });

      const now = new Date();
      const randNum = Math.floor(100 + Math.random() * 900);
      const taskNumber = `RM-${now.getFullYear()}-${randNum}`;
      autoMaintenanceTask = await prisma.maintenanceTask.create({
        data: {
          taskNumber,
          assetId,
          title: `Reactive Maintenance: Damaged Return - ${targetAsset.name} (${targetAsset.assetNumber})`,
          type: 'REACTIVE',
          priority: 'HIGH',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'PENDING',
          notes: `Auto-generated reactive repair task from damaged tool return (Return Trx ID: ${trx.id}). Inspection remarks: ${notes || 'Tool returned damaged.'}`,
        },
        include: { asset: true },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SERVICE',
          title: `Equipment Returned Damaged: ${targetAsset.name}`,
          message: `${targetAsset.name} (${targetAsset.assetNumber}) was returned damaged. Reactive Service Order & Maintenance Task automatically logged.`,
          isRead: false,
          entityType: 'SERVICE_ORDER',
          entityId: autoServiceOrder.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          entity: 'ServiceOrder',
          entityId: autoServiceOrder.id,
          action: 'REACTIVE_SERVICE_ORDER_AUTO_CREATED_ON_RETURN',
          newValues: { assetId, returnTransactionId: trx.id, taskNumber },
        },
      });
    } else if (newStatus === 'LOST') {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'OVERDUE',
          title: `Equipment Reported Lost on Return: ${targetAsset.name}`,
          message: `${targetAsset.name} (${targetAsset.assetNumber}) was reported lost/missing during equipment return. Asset value written off.`,
          isRead: false,
          entityType: 'ASSET',
          entityId: targetAsset.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          entity: 'Asset',
          entityId: assetId,
          action: 'ASSET_MARKED_LOST_ON_RETURN',
          newValues: { assetId, returnTransactionId: trx.id, previousStatus: targetAsset.status },
        },
      });
    }

    res.status(201).json({
      ...trx,
      serviceOrder: autoServiceOrder,
      maintenanceTask: autoMaintenanceTask,
    });
  } catch (error) {
    console.error('Error returning asset:', error);
    res.status(500).json({ error: 'Failed to return asset' });
  }
});

// ─── EMPLOYEES ───────────────────────────────────────────────────────────────
router.get('/employees', async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany();
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.post('/employees', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newEmp = await prisma.employee.create({
      data: {
        employeeNumber: body.employeeNumber || `EMP-${Date.now()}`,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        department: body.department,
        position: body.position,
        status: body.status || 'ACTIVE',
        hireDate: parseDate(body.hireDate),
      },
    });
    res.status(201).json(newEmp);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const dataToUpdate: any = { ...body };
    delete dataToUpdate.id;
    delete dataToUpdate.assignedAssetCount;

    if (body.hireDate) dataToUpdate.hireDate = parseDate(body.hireDate);
    if (body.terminationDate) dataToUpdate.terminationDate = parseDate(body.terminationDate);

    const updated = await prisma.employee.update({
      where: { id },
      data: dataToUpdate,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// ─── SUPPLIERS ───────────────────────────────────────────────────────────────
router.get('/suppliers', async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newSupplier = await prisma.supplier.create({
      data: {
        companyName: body.companyName,
        contactPerson: body.contactPerson,
        phone: body.phone,
        email: body.email,
        address: body.address,
        services: body.services || null,
      },
    });
    res.status(201).json(newSupplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier' });
  }
});

// ─── PROJECTS ────────────────────────────────────────────────────────────────
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projects = await prisma.project.findMany();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/projects', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newProject = await prisma.project.create({
      data: {
        projectCode: body.projectCode || `PRJ-${Date.now()}`,
        name: body.name,
        client: body.client,
        department: body.department,
        status: body.status || 'ACTIVE',
        startDate: parseDate(body.startDate),
        endDate: body.endDate ? parseDate(body.endDate) : null,
        location: body.location || null,
      },
    });
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// ─── TOOL BOXES ──────────────────────────────────────────────────────────────
router.get('/toolboxes', async (req: Request, res: Response) => {
  try {
    const toolboxes = await prisma.toolBox.findMany({
      include: { employee: true, items: { include: { asset: true } } },
    });
    res.json(toolboxes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch toolboxes' });
  }
});

router.post('/toolboxes', async (req: Request, res: Response) => {
  try {
    const { boxNumber, name, employeeId, assetIds } = req.body;

    const ids = (assetIds || []) as string[];
    if (ids.length > 0) {
      // 1. Validate that no tool is marked LOST, MISSING, DAMAGED, IN_SERVICE, IN_CALIBRATION, or RETIRED
      const selectedAssets = await prisma.asset.findMany({
        where: { id: { in: ids } },
      });

      for (const ast of selectedAssets) {
        const statusUpper = (ast.status || '').toUpperCase();
        if (statusUpper !== 'AVAILABLE') {
          return res.status(400).json({
            error: `Tool "${ast.name}" (${ast.assetNumber}) has status ${ast.status} and cannot be added to a kit/crate. Only AVAILABLE tools can be packed.`
          });
        }
      }

      // 2. Validate that none of the tools are already inside an active crate
      const existingInCrate = await prisma.toolBoxItem.findFirst({
        where: { assetId: { in: ids } },
        include: { toolBox: true, asset: true },
      });

      if (existingInCrate) {
        const toolName = existingInCrate.asset?.name || 'Tool';
        const boxName = existingInCrate.toolBox?.name || 'Crate';
        return res.status(400).json({
          error: `Tool "${toolName}" is already packed inside crate "${boxName}". It cannot be added to another crate.`
        });
      }
    }

    // Already-issued tools are permitted into a crate
    const newBox = await prisma.toolBox.create({
      data: {
        boxNumber,
        name,
        employeeId: employeeId || null,
        status: employeeId ? 'ASSIGNED' : 'UNASSIGNED',
        assignedDate: employeeId ? new Date() : null,
        items: {
          create: ids.map((astId: string) => ({ assetId: astId })),
        },
      },
      include: { employee: true, items: { include: { asset: true } } },
    });
    res.status(201).json(newBox);
  } catch (error: any) {
    console.error('Error creating toolbox:', error);
    res.status(500).json({ error: error.message || 'Failed to create toolbox' });
  }
});

router.post('/toolboxes/:id/items', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assetIds } = req.body;

    const box = await prisma.toolBox.findUnique({ where: { id } });
    if (!box) return res.status(404).json({ error: 'ToolBox not found' });

    const ids = (assetIds || []) as string[];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'No tools specified to add to toolbox' });
    }

    const selectedAssets = await prisma.asset.findMany({
      where: { id: { in: ids } },
    });

    for (const ast of selectedAssets) {
      const statusUpper = (ast.status || '').toUpperCase();
      if (statusUpper !== 'AVAILABLE') {
        return res.status(400).json({
          error: `Tool "${ast.name}" (${ast.assetNumber}) has status ${ast.status} and cannot be added to a kit/crate. Only AVAILABLE tools can be packed.`
        });
      }
    }

    const existingInCrate = await prisma.toolBoxItem.findFirst({
      where: { assetId: { in: ids } },
      include: { toolBox: true, asset: true },
    });

    if (existingInCrate) {
      const toolName = existingInCrate.asset?.name || 'Tool';
      const boxName = existingInCrate.toolBox?.name || 'Crate';
      return res.status(400).json({
        error: `Tool "${toolName}" is already packed inside crate "${boxName}". It cannot be added to another crate.`
      });
    }

    await prisma.toolBoxItem.createMany({
      data: ids.map((astId: string) => ({ toolBoxId: id, assetId: astId })),
    });

    const updatedBox = await prisma.toolBox.findUnique({
      where: { id },
      include: { employee: true, items: { include: { asset: true } } },
    });

    res.status(200).json(updatedBox);
  } catch (error: any) {
    console.error('Error adding items to toolbox:', error);
    res.status(500).json({ error: error.message || 'Failed to add items to toolbox' });
  }
});

router.post('/toolboxes/issue', async (req: Request, res: Response) => {
  try {
    const { boxId, employeeId, projectId, expectedReturnDate, notes, performedById } = req.body;

    const box = await prisma.toolBox.findUnique({
      where: { id: boxId },
      include: { items: { include: { asset: true } } },
    });
    if (!box) return res.status(404).json({ error: 'ToolBox not found' });

    // Defensive check: ensure no component tool in the toolbox is DAMAGED, IN_SERVICE, IN_CALIBRATION, LOST, MISSING, or RETIRED
    const nonIssuableStatuses = new Set(['LOST', 'MISSING', 'DAMAGED', 'IN_SERVICE', 'IN_CALIBRATION', 'RETIRED']);
    for (const item of box.items) {
      const ast = item.asset;
      if (ast) {
        const statusUpper = (ast.status || '').toUpperCase();
        if (nonIssuableStatuses.has(statusUpper)) {
          return res.status(400).json({
            error: `Tool "${ast.name}" (${ast.assetNumber}) in this toolbox has status ${ast.status} and the toolbox cannot be issued.`
          });
        }
      }
    }

    let user = performedById ? await prisma.user.findUnique({ where: { id: performedById } }) : null;
    if (!user) {
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@warehouse.com',
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN',
          },
        });
      }
    }

    const updatedBox = await prisma.toolBox.update({
      where: { id: boxId },
      data: {
        status: 'ASSIGNED',
        employeeId,
        assignedDate: new Date(),
      },
    });

    const assetIds = box.items.map((i) => i.assetId);
    const createdTrxs: any[] = [];

    if (assetIds.length > 0) {
      await prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: 'ISSUED' },
      });

      for (const item of box.items) {
        const assetId = item.assetId;
        await prisma.employeeAsset.updateMany({
          where: { assetId, returnedDate: null },
          data: { returnedDate: new Date() },
        });

        await prisma.employeeAsset.create({
          data: {
            employeeId,
            assetId,
            assignmentType: 'TOOLBOX_KIT',
            assignedDate: new Date(),
            condition: 'EXCELLENT',
            notes: notes ? `Issued in Tool Box ${box.name} (${box.boxNumber}) - ${notes}` : `Issued in Tool Box ${box.name} (${box.boxNumber})`,
          },
        });

        const trx = await prisma.assetTransaction.create({
          data: {
            assetId,
            employeeId: employeeId || null,
            projectId: projectId || null,
            transactionType: 'ISSUE',
            transactionDate: new Date(),
            returnDate: expectedReturnDate ? new Date(expectedReturnDate) : null,
            performedById: user.id,
            notes: notes ? `Issued in Tool Box Kit: ${box.name} (${box.boxNumber}) - ${notes}` : `Issued in Tool Box Kit: ${box.name} (${box.boxNumber})`,
          },
          include: { asset: true, employee: true, project: true, performedBy: true },
        });
        createdTrxs.push(trx);
      }
    }

    // Auto-generate Otpremnica Document for this toolbox issuance
    let otpremnicaDoc: any = null;
    if (employeeId) {
      otpremnicaDoc = await createOtpremnicaDocumentHelper({
        employeeId,
        projectId: projectId || undefined,
        transactionIds: createdTrxs.map(t => t.id),
        notes,
        createdById: user.id,
        toolboxKitInfo: {
          id: box.id,
          boxNumber: box.boxNumber,
          name: box.name,
          toolCount: box.items.length,
        },
      });
    }

    if (user) {
      const targetEmployee = employeeId ? await prisma.employee.findUnique({ where: { id: employeeId } }) : null;
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'TOOLBOX',
          title: `Tool Box Issued: ${box.name}`,
          message: `Tool Box kit ${box.name} (${box.boxNumber}) containing ${box.items.length} tools issued${targetEmployee ? ` to ${targetEmployee.firstName} ${targetEmployee.lastName}` : ''}.`,
          isRead: false,
          entityType: 'TOOLBOX',
          entityId: box.id,
        },
      });
    }

    res.json({
      message: 'ToolBox issued successfully',
      toolBox: updatedBox,
      transactions: createdTrxs,
      otpremnica: otpremnicaDoc,
    });
  } catch (error) {
    console.error('Error issuing toolbox:', error);
    res.status(500).json({ error: 'Failed to issue toolbox' });
  }
});

router.post('/toolboxes/return', async (req: Request, res: Response) => {
  try {
    const { boxId } = req.body;

    const box = await prisma.toolBox.findUnique({
      where: { id: boxId },
      include: { items: true },
    });
    if (!box) return res.status(404).json({ error: 'ToolBox not found' });

    await prisma.toolBox.update({
      where: { id: boxId },
      data: {
        status: 'UNASSIGNED',
        employeeId: null,
        assignedDate: null,
      },
    });

    const assetIds = box.items.map((i) => i.assetId);
    if (assetIds.length > 0) {
      // Only set AVAILABLE for tools that are not DAMAGED, LOST, or RETIRED
      await prisma.asset.updateMany({
        where: {
          id: { in: assetIds },
          status: { notIn: ['LOST', 'RETIRED', 'DAMAGED'] }
        },
        data: { status: 'AVAILABLE' },
      });

      await prisma.employeeAsset.updateMany({
        where: { assetId: { in: assetIds }, returnedDate: null },
        data: { returnedDate: new Date() },
      });
    }

    res.json({ message: 'ToolBox returned successfully' });
  } catch (error) {
    console.error('Error returning toolbox:', error);
    res.status(500).json({ error: 'Failed to return toolbox' });
  }
});

router.post('/toolboxes/:id/dismantle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const box = await prisma.toolBox.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!box) return res.status(404).json({ error: 'ToolBox not found' });

    const assetIds = box.items.map((i) => i.assetId);

    // Remove toolbox items
    await prisma.toolBoxItem.deleteMany({
      where: { toolBoxId: id },
    });

    // Mark contained assets AVAILABLE (unless LOST, RETIRED, or DAMAGED)
    if (assetIds.length > 0) {
      await prisma.asset.updateMany({
        where: {
          id: { in: assetIds },
          status: { notIn: ['LOST', 'RETIRED', 'DAMAGED'] },
        },
        data: { status: 'AVAILABLE' },
      });

      await prisma.employeeAsset.updateMany({
        where: { assetId: { in: assetIds }, returnedDate: null },
        data: { returnedDate: new Date() },
      });
    }

    // Delete the ToolBox
    await prisma.toolBox.delete({
      where: { id },
    });

    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'TOOLBOX',
          title: `Tool Box Dismantled: ${box.name}`,
          message: `Tool Box kit ${box.name} (${box.boxNumber}) was dismantled and tools released to general inventory.`,
          isRead: false,
          entityType: 'TOOLBOX',
          entityId: id,
        },
      });
    }

    res.json({ message: 'ToolBox dismantled successfully' });
  } catch (error) {
    console.error('Error dismantling toolbox:', error);
    res.status(500).json({ error: 'Failed to dismantle toolbox' });
  }
});

// ─── SERVICE ORDERS ──────────────────────────────────────────────────────────
router.get('/service-orders', async (req: Request, res: Response) => {
  try {
    const { filter: dateFilter, error: dateError } = parseDateRangeFilter(req);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const where: any = {};
    if (dateFilter) {
      where.createdAt = dateFilter;
    }
    if (req.query.status && req.query.status !== 'ALL') {
      where.status = String(req.query.status);
    }

    const orders = await prisma.serviceOrder.findMany({
      where,
      include: { asset: true, supplier: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service orders' });
  }
});

router.post('/service-orders', async (req: Request, res: Response) => {
  try {
    const { assetId, supplierId, problemDescription } = req.body;

    const existingAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!existingAsset) return res.status(404).json({ error: 'Asset not found' });
    // Note: DAMAGED tools legitimately enter service orders for repair and restoration.
    // Terminal and decommissioned tools (LOST, MISSING, RETIRED) cannot enter service.
    if (existingAsset.status === 'LOST' || existingAsset.status === 'RETIRED' || (existingAsset as any).status === 'MISSING') {
      return res.status(400).json({
        error: `Tool "${existingAsset.name}" has status ${existingAsset.status} and cannot be sent to maintenance/service.`
      });
    }

    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'IN_SERVICE' },
    });

    // Check if an existing PENDING service order exists for this asset (e.g. from damaged return)
    const pendingOrder = await prisma.serviceOrder.findFirst({
      where: { assetId, status: 'PENDING' },
    });

    let newOrder;
    if (pendingOrder) {
      newOrder = await prisma.serviceOrder.update({
        where: { id: pendingOrder.id },
        data: {
          supplierId: supplierId || null,
          problemDescription: problemDescription || pendingOrder.problemDescription,
          sentDate: new Date(),
          status: 'SENT',
        },
        include: { asset: true, supplier: true },
      });
    } else {
      newOrder = await prisma.serviceOrder.create({
        data: {
          assetId,
          supplierId: supplierId || null,
          problemDescription,
          sentDate: new Date(),
          status: 'SENT',
        },
        include: { asset: true, supplier: true },
      });
    }

    // Also advance any linked reactive maintenance task from PENDING to IN_PROGRESS
    const linkedTask = await prisma.maintenanceTask.findFirst({
      where: { assetId, status: 'PENDING' },
    });
    if (linkedTask) {
      await prisma.maintenanceTask.update({
        where: { id: linkedTask.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SERVICE',
          title: `Repair Service Dispatched: ${newOrder.asset.name}`,
          message: `Equipment ${newOrder.asset.assetNumber} reported damaged and dispatched for repair. Description: ${problemDescription}`,
          isRead: false,
          entityType: 'SERVICE_ORDER',
          entityId: newOrder.id,
        },
      });
    }

    res.status(201).json(newOrder);
  } catch (error: any) {
    console.error('Error creating service order:', error);
    res.status(500).json({ error: error.message || 'Failed to create service order' });
  }
});

router.put('/service-orders/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { supplierId, problemDescription } = req.body;

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!order) return res.status(404).json({ error: 'Service order not found' });

    await prisma.asset.update({
      where: { id: order.assetId },
      data: { status: 'IN_SERVICE' },
    });

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        supplierId: supplierId || null,
        problemDescription: problemDescription || order.problemDescription,
        sentDate: new Date(),
        status: 'SENT',
      },
      include: { asset: true, supplier: true },
    });

    // Advance any linked reactive maintenance task from PENDING to IN_PROGRESS
    const linkedTask = await prisma.maintenanceTask.findFirst({
      where: { assetId: order.assetId, status: 'PENDING' },
    });
    if (linkedTask) {
      await prisma.maintenanceTask.update({
        where: { id: linkedTask.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SERVICE',
          title: `Repair Service Dispatched: ${updated.asset.name}`,
          message: `Equipment ${updated.asset.assetNumber} dispatched for repair to ${updated.supplier?.companyName || 'Internal Workshop'}.`,
          isRead: false,
          entityType: 'SERVICE_ORDER',
          entityId: updated.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          entity: 'ServiceOrder',
          entityId: order.id,
          action: 'SERVICE_ORDER_DISPATCHED',
          newValues: { status: 'SENT', supplierId: updated.supplierId, assetStatus: 'IN_SERVICE' },
        },
      });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error dispatching service order:', error);
    res.status(500).json({ error: error.message || 'Failed to dispatch service order' });
  }
});

router.put('/service-orders/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { repairCost, replacedParts, notes } = req.body;

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!order) return res.status(404).json({ error: 'Service order not found' });

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        receivedDate: new Date(),
        repairCost: Number(repairCost) || 0,
        replacedParts,
      },
      include: { asset: true, supplier: true },
    });

    await prisma.asset.update({
      where: { id: order.assetId },
      data: { status: 'AVAILABLE' },
    });

    // Advance any linked reactive maintenance task from PENDING/IN_PROGRESS to COMPLETED
    const linkedTask = await prisma.maintenanceTask.findFirst({
      where: { assetId: order.assetId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    });
    if (linkedTask) {
      await prisma.maintenanceTask.update({
        where: { id: linkedTask.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: 'PASSED',
          laborCost: Number(repairCost) || 0,
          notes: notes ? `Service repair completed: ${notes}` : 'Service repair completed successfully.',
        },
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete service order' });
  }
});

// ─── CALIBRATION RECORDS ─────────────────────────────────────────────────────
router.get('/calibrations', async (req: Request, res: Response) => {
  try {
    const { filter: dateFilter, error: dateError } = parseDateRangeFilter(req);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const where: any = {};
    if (dateFilter) {
      where.calibrationDate = dateFilter;
    }
    if (req.query.result && req.query.result !== 'ALL') {
      where.result = String(req.query.result);
    }

    const calibrations = await prisma.calibrationRecord.findMany({
      where,
      include: { asset: true, provider: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(calibrations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calibrations' });
  }
});

router.post('/calibrations/send-to-lab', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.body;

    const existingAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!existingAsset) return res.status(404).json({ error: 'Asset not found' });
    if (existingAsset.status === 'LOST' || existingAsset.status === 'DAMAGED' || existingAsset.status === 'RETIRED' || existingAsset.status === 'IN_SERVICE' || (existingAsset as any).status === 'MISSING') {
      return res.status(400).json({
        error: `Tool "${existingAsset.name}" has status ${existingAsset.status} and cannot be sent to calibration lab.`
      });
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'IN_CALIBRATION' },
    });
    res.json(updatedAsset);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to send tool to calibration lab' });
  }
});

router.post('/calibrations', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const existingAsset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!existingAsset) return res.status(404).json({ error: 'Asset not found' });
    if (existingAsset.status === 'LOST' || existingAsset.status === 'DAMAGED' || existingAsset.status === 'RETIRED' || existingAsset.status === 'IN_SERVICE' || (existingAsset as any).status === 'MISSING') {
      return res.status(400).json({
        error: `Tool "${existingAsset.name}" has status ${existingAsset.status} and cannot be calibrated.`
      });
    }

    const newRecord = await prisma.calibrationRecord.create({
      data: {
        assetId: body.assetId,
        providerId: body.providerId || null,
        calibrationDate: parseDate(body.calibrationDate),
        nextCalibrationDate: parseDate(body.nextCalibrationDate),
        certificateNumber: body.certificateNumber || `CERT-${Date.now()}`,
        result: body.result || 'PASS',
        documentUrl: body.documentUrl || null,
        notes: body.notes || null,
      },
      include: { asset: true, provider: true },
    });

    const newStatus = body.result === 'FAIL' ? 'DAMAGED' : 'AVAILABLE';

    await prisma.asset.update({
      where: { id: body.assetId },
      data: { status: newStatus },
    });

    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'CALIBRATION',
          title: `Calibration Certificate Completed: ${newRecord.asset.name}`,
          message: `Certificate #${newRecord.certificateNumber} submitted for ${newRecord.asset.name} (${newRecord.result}). Next calibration due on ${newRecord.nextCalibrationDate.toISOString().slice(0, 10)}.`,
          isRead: false,
          entityType: 'CALIBRATION',
          entityId: newRecord.id,
        },
      });
    }

    res.status(201).json(newRecord);
  } catch (error) {
    console.error('Error creating calibration record:', error);
    res.status(500).json({ error: 'Failed to create calibration record' });
  }
});

// ─── INVENTORY AUDITS ────────────────────────────────────────────────────────
router.post('/inventory-checks', async (req: Request, res: Response) => {
  try {
    const { title, performedById } = req.body;

    let user = performedById ? await prisma.user.findUnique({ where: { id: performedById } }) : null;
    if (!user) {
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@warehouse.com',
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN',
          },
        });
      }
    }

    const count = await prisma.asset.count();

    const newCheck = await prisma.inventoryCheck.create({
      data: {
        checkNumber: `AUD-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        title,
        performedById: user.id,
        checkDate: new Date(),
        status: 'IN_PROGRESS',
        totalAssets: count,
      },
      include: { performedBy: true },
    });

    res.status(201).json(newCheck);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create inventory check' });
  }
});

router.post('/inventory-checks/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assetId, condition, notes } = req.body;

    const isDamaged = condition === 'DAMAGED';
    const isMissing = condition === 'MISSING';

    const existingItem = await prisma.inventoryCheckItem.findFirst({
      where: { inventoryCheckId: id, assetId },
    });

    if (existingItem) {
      await prisma.inventoryCheckItem.update({
        where: { id: existingItem.id },
        data: {
          verified: true,
          condition: condition || 'GOOD',
          notes,
          scannedAt: new Date(),
        },
      });
    } else {
      await prisma.inventoryCheckItem.create({
        data: {
          inventoryCheckId: id,
          assetId,
          verified: true,
          condition: condition || 'GOOD',
          notes,
          scannedAt: new Date(),
        },
      });
    }

    const [totalVerified, damagedCount, missingCount] = await Promise.all([
      prisma.inventoryCheckItem.count({ where: { inventoryCheckId: id, verified: true } }),
      prisma.inventoryCheckItem.count({ where: { inventoryCheckId: id, condition: 'DAMAGED' } }),
      prisma.inventoryCheckItem.count({ where: { inventoryCheckId: id, condition: 'MISSING' } }),
    ]);

    await prisma.inventoryCheck.update({
      where: { id },
      data: {
        verifiedAssets: totalVerified,
        damagedAssets: damagedCount,
        missingAssets: missingCount,
      },
    });

    if (isDamaged) {
      await prisma.asset.update({ where: { id: assetId }, data: { status: 'DAMAGED' } });
    } else if (isMissing) {
      await prisma.asset.update({ where: { id: assetId }, data: { status: 'LOST' } });
    } else {
      await prisma.asset.update({ where: { id: assetId }, data: { status: 'AVAILABLE' } });
    }

    res.json({ success: true, verifiedAssets: totalVerified, damagedAssets: damagedCount, missingAssets: missingCount });
  } catch (error) {
    console.error('Error verifying inventory item:', error);
    res.status(500).json({ error: 'Failed to verify inventory item' });
  }
});

router.put('/inventory-checks/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.inventoryCheck.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete inventory check' });
  }
});


// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
router.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────
router.post('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { userId, entity, entityId, action, newValues, oldValues } = req.body;

    let targetUserId = userId;
    let user = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId } }) : null;

    if (!user) {
      user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@warehouse.com',
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN',
          },
        });
      }
    }

    const log = await prisma.auditLog.create({
      data: {
        userId: user.id,
        entity,
        entityId,
        action,
        newValues: newValues || undefined,
        oldValues: oldValues || undefined,
      },
      include: { user: true },
    });

    res.status(201).json({
      id: log.id,
      userId: log.userId,
      userName: `${log.user.firstName} ${log.user.lastName}`,
      userRole: log.user.role,
      entity: log.entity,
      entityId: log.entityId,
      action: log.action,
      oldValues: (log.oldValues as any) || undefined,
      newValues: (log.newValues as any) || undefined,
      createdAt: log.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// Helper to calculate date-based recurrence interval safely
function addRecurrenceInterval(baseDate: Date, frequency: number, unit: string): Date {
  const d = new Date(baseDate.getTime());
  const freq = Number(frequency) || 1;
  const u = (unit || 'MONTHS').toUpperCase();

  switch (u) {
    case 'DAYS':
      d.setDate(d.getDate() + freq);
      break;
    case 'WEEKS':
      d.setDate(d.getDate() + freq * 7);
      break;
    case 'MONTHS': {
      const currentMonth = d.getMonth();
      d.setMonth(currentMonth + freq);
      if (d.getMonth() !== (currentMonth + freq) % 12) {
        d.setDate(0); // Set to last day of previous month for month-end boundary edge cases
      }
      break;
    }
    case 'YEARS': {
      d.setFullYear(d.getFullYear() + freq);
      break;
    }
    default:
      d.setMonth(d.getMonth() + freq);
  }
  return d;
}

// ─── PREVENTIVE MAINTENANCE PLANS ───────────────────────────────────────────
router.get('/maintenance-plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.maintenancePlan.findMany({
      include: { asset: true, responsible: true, tasks: { orderBy: { createdAt: 'desc' } } },
      orderBy: { nextDueDate: 'asc' },
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance plans' });
  }
});

router.post('/maintenance-plans', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const existingAsset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!existingAsset) return res.status(404).json({ error: 'Asset not found' });
    if (existingAsset.status === 'LOST' || existingAsset.status === 'DAMAGED' || existingAsset.status === 'RETIRED' || (existingAsset as any).status === 'MISSING') {
      return res.status(400).json({
        error: `Tool "${existingAsset.name}" has status ${existingAsset.status} and cannot be assigned a maintenance plan.`
      });
    }

    const firstDueDate = parseDate(body.firstDueDate);

    const newPlan = await prisma.maintenancePlan.create({
      data: {
        assetId: body.assetId,
        name: body.name,
        description: body.description || null,
        type: body.type || 'PREVENTIVE',
        priority: body.priority || 'MEDIUM',
        frequency: Number(body.frequency) || 6,
        frequencyUnit: body.frequencyUnit || 'MONTHS',
        firstDueDate,
        nextDueDate: firstDueDate,
        responsibleId: body.responsibleId || null,
        estimatedDurationMinutes: Number(body.estimatedDurationMinutes) || 60,
        estimatedCost: Number(body.estimatedCost) || 0.0,
        status: body.status || 'ACTIVE',
        instructions: body.instructions || null,
        checklist: body.checklist || undefined,
        requiredParts: body.requiredParts || null,
        createdById: body.createdById || null,
      },
      include: { asset: true, responsible: true },
    });

    const now = new Date();
    const diffDays = (firstDueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    if (diffDays <= 30) {
      const randNum = Math.floor(100 + Math.random() * 900);
      await prisma.maintenanceTask.create({
        data: {
          taskNumber: `PM-${now.getFullYear()}-${randNum}`,
          planId: newPlan.id,
          assetId: newPlan.assetId,
          title: newPlan.name,
          type: newPlan.type,
          priority: newPlan.priority,
          dueDate: firstDueDate,
          assignedToId: newPlan.responsibleId || null,
          checklistProgress: newPlan.checklist || undefined,
          status: 'PENDING',
        },
      });
    }

    res.status(201).json(newPlan);
  } catch (error: any) {
    console.error('Error creating maintenance plan:', error);
    res.status(500).json({ error: error.message || 'Failed to create maintenance plan' });
  }
});

router.put('/maintenance-plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const dataToUpdate: any = { ...body };
    delete dataToUpdate.id;
    delete dataToUpdate.assetName;
    delete dataToUpdate.assetNumber;
    delete dataToUpdate.assetCategory;
    delete dataToUpdate.responsibleName;

    if (body.firstDueDate) dataToUpdate.firstDueDate = parseDate(body.firstDueDate);
    if (body.nextDueDate) dataToUpdate.nextDueDate = parseDate(body.nextDueDate);
    if (body.frequency) dataToUpdate.frequency = Number(body.frequency);
    if (body.estimatedDurationMinutes) dataToUpdate.estimatedDurationMinutes = Number(body.estimatedDurationMinutes);
    if (body.estimatedCost) dataToUpdate.estimatedCost = Number(body.estimatedCost);

    const updatedPlan = await prisma.maintenancePlan.update({
      where: { id },
      data: dataToUpdate,
      include: { asset: true, responsible: true },
    });

    res.json(updatedPlan);
  } catch (error: any) {
    console.error('Error updating maintenance plan:', error);
    res.status(500).json({ error: error.message || 'Failed to update maintenance plan' });
  }
});

router.put('/maintenance-plans/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedPlan = await prisma.maintenancePlan.update({
      where: { id },
      data: { status },
      include: { asset: true, responsible: true },
    });

    res.json(updatedPlan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan status' });
  }
});

router.delete('/maintenance-plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.maintenancePlan.delete({ where: { id } });
    res.json({ success: true, message: 'Maintenance plan deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete maintenance plan' });
  }
});

// ─── PREVENTIVE MAINTENANCE TASKS ───────────────────────────────────────────
router.get('/maintenance-tasks', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.maintenanceTask.findMany({
      include: { asset: true, plan: true, assignedTo: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch maintenance tasks' });
  }
});

router.post('/maintenance-tasks', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const existingAsset = await prisma.asset.findUnique({ where: { id: body.assetId } });
    if (!existingAsset) return res.status(404).json({ error: 'Asset not found' });
    if (existingAsset.status === 'LOST' || existingAsset.status === 'DAMAGED' || existingAsset.status === 'RETIRED' || (existingAsset as any).status === 'MISSING') {
      return res.status(400).json({
        error: `Tool "${existingAsset.name}" has status ${existingAsset.status} and cannot be assigned maintenance tasks.`
      });
    }

    const now = new Date();
    const randNum = Math.floor(100 + Math.random() * 900);
    const taskNumber = body.taskNumber || `PM-${now.getFullYear()}-${randNum}`;

    const newTask = await prisma.maintenanceTask.create({
      data: {
        taskNumber,
        planId: body.planId || null,
        assetId: body.assetId,
        title: body.title,
        type: body.type || 'PREVENTIVE',
        priority: body.priority || 'MEDIUM',
        dueDate: parseDate(body.dueDate),
        assignedToId: body.assignedToId || null,
        checklistProgress: body.checklistProgress || undefined,
        status: body.status || 'PENDING',
      },
      include: { asset: true, plan: true, assignedTo: true },
    });

    res.status(201).json(newTask);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create maintenance task' });
  }
});

router.put('/maintenance-tasks/:id/start', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.maintenanceTask.findUnique({ where: { id }, include: { asset: true } });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.asset.status === 'LOST' || task.asset.status === 'DAMAGED' || task.asset.status === 'RETIRED' || (task.asset as any).status === 'MISSING') {
      return res.status(400).json({
        error: `Tool "${task.asset.name}" has status ${task.asset.status} and cannot be serviced.`
      });
    }

    await prisma.asset.update({
      where: { id: task.assetId },
      data: { status: 'IN_SERVICE' },
    });

    const updatedTask = await prisma.maintenanceTask.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
      include: { asset: true, plan: true, assignedTo: true },
    });

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Error starting maintenance task:', error);
    res.status(500).json({ error: error.message || 'Failed to start maintenance task' });
  }
});

router.put('/maintenance-tasks/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      actualDurationMinutes,
      laborCost,
      partsCost,
      result = 'PASS',
      notes,
      checklistProgress,
      overrideReason,
      completedById,
      status: reqStatus,
    } = req.body;

    const task = await prisma.maintenanceTask.findUnique({
      where: { id },
      include: { asset: true, plan: true },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const totalCost = (Number(laborCost) || 0) + (Number(partsCost) || 0);
    const now = new Date();
    const rawResult = String(result || 'PASS').toUpperCase();

    // 1) Result = NOT COMPLETE / INCOMPLETE
    // Keep the tool in the maintenance waiting list, keep task open/pending, do not advance tool status or plan schedule.
    if (rawResult === 'NOT_COMPLETE' || rawResult === 'INCOMPLETE' || reqStatus === 'PENDING' || reqStatus === 'IN_PROGRESS') {
      const updatedTask = await prisma.maintenanceTask.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          actualDurationMinutes: Number(actualDurationMinutes) || 0,
          laborCost: Number(laborCost) || 0,
          partsCost: Number(partsCost) || 0,
          totalCost,
          result: 'NOT_COMPLETE',
          notes,
          checklistProgress: checklistProgress || undefined,
          overrideReason: overrideReason || null,
        },
        include: { asset: true, plan: true, assignedTo: true },
      });
      return res.json(updatedTask);
    }

    // 2) Result = FAILED
    // Do NOT change the tool's status to anything issuable or "maintenance done".
    // Tool remains in the status it had before the maintenance attempt (e.g. IN_SERVICE).
    // Log the failed attempt on the task record for history/audit, but do not advance the tool's workflow status or plan schedule.
    if (rawResult === 'FAILED' || rawResult === 'FAIL') {
      const updatedTask = await prisma.maintenanceTask.update({
        where: { id },
        data: {
          status: 'FAILED',
          completedAt: now,
          actualDurationMinutes: Number(actualDurationMinutes) || 60,
          laborCost: Number(laborCost) || 0,
          partsCost: Number(partsCost) || 0,
          totalCost,
          result: 'FAILED',
          notes: notes || 'Maintenance inspection failed.',
          checklistProgress: checklistProgress || undefined,
          overrideReason: overrideReason || null,
        },
        include: { asset: true, plan: true, assignedTo: true },
      });

      const user = completedById ? await prisma.user.findUnique({ where: { id: completedById } }) : await prisma.user.findFirst();
      if (user) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'SERVICE',
            title: `Maintenance Failed: ${task.asset.name}`,
            message: `Maintenance task [${task.taskNumber}] for ${task.asset.name} was marked as FAILED. Tool remains out of service.`,
            isRead: false,
            entityType: 'MAINTENANCE_TASK',
            entityId: task.id,
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            entity: 'MaintenanceTask',
            entityId: task.id,
            action: 'MAINTENANCE_ATTEMPT_FAILED',
            newValues: { result: 'FAILED', totalCost, notes },
            oldValues: { status: task.status },
          },
        });
      }

      return res.json(updatedTask);
    }

    // 3) Result = PASSED / COMPLETED
    // Only a task explicitly marked COMPLETED/PASSED is allowed to move tool status back to AVAILABLE
    const updatedTask = await prisma.maintenanceTask.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        actualDurationMinutes: Number(actualDurationMinutes) || 60,
        laborCost: Number(laborCost) || 0,
        partsCost: Number(partsCost) || 0,
        totalCost,
        result: 'PASSED',
        notes,
        checklistProgress: checklistProgress || undefined,
        overrideReason: overrideReason || null,
      },
      include: { asset: true, plan: true, assignedTo: true },
    });

    await prisma.asset.update({
      where: { id: task.assetId },
      data: { status: 'AVAILABLE' },
    });

    if (task.planId && task.plan) {
      const nextDue = addRecurrenceInterval(now, task.plan.frequency, task.plan.frequencyUnit);
      await prisma.maintenancePlan.update({
        where: { id: task.planId },
        data: {
          lastCompletedDate: now,
          nextDueDate: nextDue,
        },
      });
    }

    const user = completedById ? await prisma.user.findUnique({ where: { id: completedById } }) : await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SERVICE',
          title: `Preventive Maintenance Completed: ${task.asset.name}`,
          message: `Maintenance task [${task.taskNumber}] completed successfully with result PASSED. Total Cost: €${totalCost.toFixed(2)}.`,
          isRead: false,
          entityType: 'MAINTENANCE_TASK',
          entityId: task.id,
        },
      });

      if (overrideReason) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            entity: 'MaintenanceTask',
            entityId: task.id,
            action: 'CHECKLIST_OVERRIDE_COMPLETED',
            newValues: { result: 'PASSED', totalCost, overrideReason },
            oldValues: { status: task.status },
          },
        });
      }
    }

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Error completing maintenance task:', error);
    res.status(500).json({ error: error.message || 'Failed to complete maintenance task' });
  }
});

// ─── OTPREMNICA / EQUIPMENT HANDOVER DOCUMENTS ─────────────────────────────
router.get('/otpremnica', async (req: Request, res: Response) => {
  try {
    const { filter: dateFilter, error: dateError } = parseDateRangeFilter(req);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const where: any = {};
    if (dateFilter) {
      where.issueDate = dateFilter;
    }
    if (req.query.employeeId && req.query.employeeId !== 'ALL') {
      where.employeeId = String(req.query.employeeId);
    }
    if (req.query.projectId && req.query.projectId !== 'ALL') {
      where.projectId = String(req.query.projectId);
    }

    const docs = await prisma.otpremnicaDocument.findMany({
      where,
      include: { employee: true, project: true, createdBy: true },
      orderBy: { createdAt: 'desc' },
    });

    const allTransactionIds = Array.from(new Set(docs.flatMap((d: any) => d.transactionIds || [])));
    const transactions = allTransactionIds.length > 0 ? await prisma.assetTransaction.findMany({
      where: { id: { in: allTransactionIds } },
      include: { asset: true },
    }) : [];

    // Fallback transactions for legacy documents
    const needsFallback = docs.some(d => !d.transactionIds || d.transactionIds.length === 0);
    const fallbackTransactions = needsFallback ? await prisma.assetTransaction.findMany({
      where: { transactionType: 'ISSUE' },
      include: { asset: true },
    }) : [];

    const trxById = new Map<string, any>();
    transactions.forEach((t: any) => trxById.set(t.id, t));

    const formattedDocs = docs.map((doc: any) => {
      const items = formatOtpremnicaItems(doc, trxById, fallbackTransactions);

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        employeeId: doc.employeeId,
        employeeName: doc.employee ? `${doc.employee.firstName} ${doc.employee.lastName}` : undefined,
        employeeNumber: doc.employee?.employeeNumber || undefined,
        employeeDepartment: doc.employee?.department || undefined,
        projectId: doc.projectId || undefined,
        projectName: doc.project?.name || undefined,
        projectCode: doc.project?.projectCode || undefined,
        createdById: doc.createdById,
        createdByName: doc.createdBy ? `${doc.createdBy.firstName} ${doc.createdBy.lastName}` : undefined,
        issueDate: doc.issueDate.toISOString().slice(0, 10),
        notes: doc.notes || undefined,
        transactionIds: doc.transactionIds || [],
        items,
        createdAt: doc.createdAt.toISOString(),
      };
    });

    res.json(formattedDocs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch otpremnica documents' });
  }
});

router.post('/otpremnica/generate', async (req: Request, res: Response) => {
  try {
    const { employeeId, projectId, transactionIds, notes, createdById } = req.body;

    // If transactionIds was empty, automatically find the latest unassigned ISSUE transactions for this employee
    let effectiveTransactionIds = (transactionIds || []) as string[];
    if (effectiveTransactionIds.length === 0 && employeeId) {
      const recentTrxs = await prisma.assetTransaction.findMany({
        where: {
          employeeId,
          transactionType: 'ISSUE',
          transactionDate: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        orderBy: { transactionDate: 'desc' },
      });
      effectiveTransactionIds = recentTrxs.map(t => t.id);
    }

    const doc = await createOtpremnicaDocumentHelper({
      employeeId,
      projectId,
      transactionIds: effectiveTransactionIds,
      notes,
      createdById,
    });

    const user = createdById ? await prisma.user.findUnique({ where: { id: createdById } }) : await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'OTPREMNICA',
          title: `Delivery Note Generated: ${doc.documentNumber}`,
          message: `Delivery Note (Otpremnica) ${doc.documentNumber} generated.`,
          isRead: false,
          entityType: 'OTPREMNICA',
          entityId: doc.id,
        },
      });
    }

    res.status(201).json(doc);
  } catch (error: any) {
    console.error('Error generating Otpremnica:', error);
    res.status(500).json({ error: error.message || 'Failed to generate Otpremnica document' });
  }
});

// ─── TOOLBOX INVENTORY AUDIT WORKFLOW ──────────────────────────────────────
router.post('/inventory-checks/toolbox/start', async (req: Request, res: Response) => {
  try {
    const { toolBoxId, title, performedById, notes } = req.body;

    const toolBox = await prisma.toolBox.findUnique({
      where: { id: toolBoxId },
      include: { items: { include: { asset: true } } },
    });

    if (!toolBox) {
      return res.status(404).json({ error: 'Toolbox not found' });
    }

    let user = performedById ? await prisma.user.findUnique({ where: { id: performedById } }) : await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'admin@warehouse.com', firstName: 'System', lastName: 'Admin', role: 'ADMIN' },
      });
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.inventoryCheck.count();
    const seqNum = String(count + 1).padStart(3, '0');
    const checkNumber = `INV-KIT-${currentYear}-${seqNum}`;

    const inventoryCheck = await prisma.inventoryCheck.create({
      data: {
        checkNumber,
        title: title || `Toolbox Audit: ${toolBox.name} (${toolBox.boxNumber})`,
        performedById: user.id,
        toolBoxId: toolBox.id,
        status: 'IN_PROGRESS',
        totalAssets: toolBox.items.length,
        notes: notes || null,
        items: {
          create: toolBox.items.map((item) => ({
            assetId: item.assetId,
            verified: false,
            condition: 'GOOD',
          })),
        },
      },
      include: { performedBy: true, toolBox: true, items: { include: { asset: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        entity: 'InventoryCheck',
        entityId: inventoryCheck.id,
        action: 'TOOLBOX_INVENTORY_STARTED',
        newValues: { checkNumber, toolBoxId: toolBox.id, toolBoxName: toolBox.name, itemCount: toolBox.items.length },
      },
    });

    res.status(201).json(inventoryCheck);
  } catch (error: any) {
    console.error('Error starting toolbox inventory:', error);
    res.status(500).json({ error: error.message || 'Failed to start toolbox inventory' });
  }
});

router.get('/toolboxes/:id/inventory-history', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const checks = await prisma.inventoryCheck.findMany({
      where: { toolBoxId: id },
      include: { performedBy: true, items: { include: { asset: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(checks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch toolbox inventory history' });
  }
});

// ─── REPORTS & ANALYTICS SUMMARY ──────────────────────────────────────────
router.get('/reports/summary', async (req: Request, res: Response) => {
  try {
    const { filter: dateFilter, error: dateError } = parseDateRangeFilter(req);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    const assetWhere: any = {};
    if (dateFilter) {
      assetWhere.purchaseDate = dateFilter;
    }

    const assets = await prisma.asset.findMany({
      where: assetWhere,
      select: {
        id: true,
        status: true,
        purchasePrice: true,
        currentValue: true,
      },
    });

    const totalAssets = assets.length;
    const totalAcquisitionValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
    const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
    const lostAssets = assets.filter(a => a.status === 'LOST' || (a.status as any) === 'MISSING');
    const totalLostValue = lostAssets.reduce((sum, a) => sum + (a.currentValue ?? a.purchasePrice ?? 0), 0);
    const netActiveBookValue = totalCurrentValue - totalLostValue;

    const trxWhere: any = {};
    if (dateFilter) {
      trxWhere.transactionDate = dateFilter;
    }
    const transactionCount = await prisma.assetTransaction.count({ where: trxWhere });

    const docWhere: any = {};
    if (dateFilter) {
      docWhere.issueDate = dateFilter;
    }
    const otpremnicaCount = await prisma.otpremnicaDocument.count({ where: docWhere });

    const soWhere: any = {};
    if (dateFilter) {
      soWhere.createdAt = dateFilter;
    }
    const serviceOrderCount = await prisma.serviceOrder.count({ where: soWhere });

    res.json({
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null,
      totalAssets,
      totalAcquisitionValue,
      totalCurrentValue,
      netActiveBookValue,
      lostAssetsCount: lostAssets.length,
      totalLostValue,
      transactionCount,
      otpremnicaCount,
      serviceOrderCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch report summary' });
  }
});

export default router;
