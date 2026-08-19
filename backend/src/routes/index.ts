// Express Routes for Warehouse Asset and Employee Management
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();
const router = Router();

// Helper to format dates cleanly or fallback
const parseDate = (d?: string | Date) => (d ? new Date(d) : new Date());

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
          },
          {
            userId: firstUser.id,
            type: 'CALIBRATION',
            title: 'Calibration Expiration Warning (Due in 14 Days)',
            message: 'Fluke 87V Digital Multimeter (AST-MEAS-004) precision calibration expires on 2026-09-01. Please schedule vendor testing.',
            isRead: false,
          },
          {
            userId: firstUser.id,
            type: 'OVERDUE',
            title: 'Overdue Equipment Loan Alert',
            message: 'Bosch Angle Grinder 4.5 inch (AST-POW-012) issued to John Doe is past its expected return date (2026-08-10).',
            isRead: false,
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

      for (const item of Array.from(dueAssetMap.values())) {
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
    });
  } catch (error) {
    console.error('Error fetching initial data:', error);
    res.status(500).json({ error: 'Failed to fetch initial data' });
  }
});

// ─── ASSETS ──────────────────────────────────────────────────────────────────
router.get('/assets', async (req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({ orderBy: { createdAt: 'desc' } });
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
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
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
router.post('/transactions/issue', async (req: Request, res: Response) => {
  try {
    const { assetIds, employeeId, projectId, expectedReturnDate, notes, performedById } = req.body;

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

    for (const assetId of assetIds as string[]) {
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
        },
      });

      createdTransactions.push(trx);
    }

    res.status(201).json(createdTransactions);
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

    const newStatus = condition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';

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

    const trx = await prisma.assetTransaction.create({
      data: {
        assetId,
        employeeId: empId || null,
        transactionType: 'RETURN',
        transactionDate: new Date(),
        performedById: user.id,
        notes: notes || `Condition on return: ${condition}`,
      },
      include: { asset: true, employee: true, performedBy: true },
    });

    res.status(201).json(trx);
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

    const newBox = await prisma.toolBox.create({
      data: {
        boxNumber,
        name,
        employeeId: employeeId || null,
        status: employeeId ? 'ASSIGNED' : 'UNASSIGNED',
        assignedDate: employeeId ? new Date() : null,
        items: {
          create: (assetIds || []).map((astId: string) => ({ assetId: astId })),
        },
      },
      include: { employee: true, items: { include: { asset: true } } },
    });
    res.status(201).json(newBox);
  } catch (error) {
    console.error('Error creating toolbox:', error);
    res.status(500).json({ error: 'Failed to create toolbox' });
  }
});

router.post('/toolboxes/issue', async (req: Request, res: Response) => {
  try {
    const { boxId, employeeId, notes } = req.body;

    const box = await prisma.toolBox.findUnique({
      where: { id: boxId },
      include: { items: true },
    });
    if (!box) return res.status(404).json({ error: 'ToolBox not found' });

    await prisma.toolBox.update({
      where: { id: boxId },
      data: {
        status: 'ASSIGNED',
        employeeId,
        assignedDate: new Date(),
      },
    });

    const assetIds = box.items.map((i) => i.assetId);
    if (assetIds.length > 0) {
      await prisma.asset.updateMany({
        where: { id: { in: assetIds } },
        data: { status: 'ISSUED' },
      });

      for (const assetId of assetIds) {
        await prisma.employeeAsset.create({
          data: {
            employeeId,
            assetId,
            assignmentType: 'TOOLBOX_KIT',
            assignedDate: new Date(),
            condition: 'EXCELLENT',
            notes: notes || `Issued in Tool Box ${box.boxNumber}`,
          },
        });
      }
    }

    res.json({ message: 'ToolBox issued successfully' });
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
      await prisma.asset.updateMany({
        where: { id: { in: assetIds } },
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

    // Mark contained assets AVAILABLE
    if (assetIds.length > 0) {
      await prisma.asset.updateMany({
        where: { id: { in: assetIds } },
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

    res.json({ message: 'ToolBox dismantled successfully' });
  } catch (error) {
    console.error('Error dismantling toolbox:', error);
    res.status(500).json({ error: 'Failed to dismantle toolbox' });
  }
});

// ─── SERVICE ORDERS ──────────────────────────────────────────────────────────
router.get('/service-orders', async (req: Request, res: Response) => {
  try {
    const orders = await prisma.serviceOrder.findMany({
      include: { asset: true, supplier: true },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch service orders' });
  }
});

router.post('/service-orders', async (req: Request, res: Response) => {
  try {
    const { assetId, supplierId, problemDescription } = req.body;

    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'IN_SERVICE' },
    });

    const newOrder = await prisma.serviceOrder.create({
      data: {
        assetId,
        supplierId: supplierId || null,
        problemDescription,
        sentDate: new Date(),
        status: 'SENT',
      },
      include: { asset: true, supplier: true },
    });

    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'SERVICE',
          title: `Repair Service Dispatched: ${newOrder.asset.name}`,
          message: `Equipment ${newOrder.asset.assetNumber} reported damaged and dispatched for repair. Description: ${problemDescription}`,
          isRead: false,
        },
      });
    }

    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Error creating service order:', error);
    res.status(500).json({ error: 'Failed to create service order' });
  }
});

router.put('/service-orders/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { repairCost, replacedParts } = req.body;

    const order = await prisma.serviceOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        repairCost: Number(repairCost) || 0,
        replacedParts: replacedParts || null,
        receivedDate: new Date(),
      },
    });

    await prisma.asset.update({
      where: { id: order.assetId },
      data: { status: 'AVAILABLE' },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete service order' });
  }
});

// ─── CALIBRATION RECORDS ─────────────────────────────────────────────────────
router.get('/calibrations', async (req: Request, res: Response) => {
  try {
    const calibrations = await prisma.calibrationRecord.findMany({
      include: { asset: true, provider: true },
    });
    res.json(calibrations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calibrations' });
  }
});

router.post('/calibrations/send-to-lab', async (req: Request, res: Response) => {
  try {
    const { assetId } = req.body;
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'IN_CALIBRATION' },
    });
    res.json(updatedAsset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send tool to calibration lab' });
  }
});

router.post('/calibrations', async (req: Request, res: Response) => {
  try {
    const body = req.body;
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

    const updatedTask = await prisma.maintenanceTask.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        actualDurationMinutes: Number(actualDurationMinutes) || 60,
        laborCost: Number(laborCost) || 0,
        partsCost: Number(partsCost) || 0,
        totalCost,
        result,
        notes,
        checklistProgress: checklistProgress || undefined,
        overrideReason: overrideReason || null,
      },
      include: { asset: true, plan: true, assignedTo: true },
    });

    const nextAssetStatus = result === 'FAILED' ? 'DAMAGED' : 'AVAILABLE';
    await prisma.asset.update({
      where: { id: task.assetId },
      data: { status: nextAssetStatus },
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
          message: `Maintenance task [${task.taskNumber}] completed with result ${result}. Total Cost: €${totalCost.toFixed(2)}.`,
          isRead: false,
        },
      });

      if (overrideReason) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            entity: 'MaintenanceTask',
            entityId: task.id,
            action: 'CHECKLIST_OVERRIDE_COMPLETED',
            newValues: { result, totalCost, overrideReason },
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

export default router;
