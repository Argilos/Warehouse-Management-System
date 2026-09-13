/**
 * Automated Integration Test Suite for Warehouse Management System Business Rules:
 * 1. Delivery Note (Otpremnica) - Tool List Item Resolution
 * 2. Crates (ToolBoxes) - Issuance and Dismantling Rules
 * 3. "LOST" Status - Terminal State Enforcements Across Operations
 * 4. Maintenance Task Completion Logic (FAILED, NOT_COMPLETE, PASSED)
 */

process.env.VERCEL = '1'; // prevent server from binding fixed port in server.ts

import http from 'http';
import app from '../server';
import { prisma } from '../routes';

let server: http.Server;
let baseUrl: string;

let passedCount = 0;
let failedCount = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failedCount++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
  }
}

async function apiRequest(method: string, path: string, body?: any) {
  const url = `${baseUrl}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('RUNNING BUSINESS RULES VALIDATION TEST SUITE');
  console.log('======================================================\n');

  // Start ephemeral server
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = (server.address() as any).port;
      baseUrl = `http://127.0.0.1:${port}/api`;
      resolve();
    });
  });

  // Base fallback mocks
  (prisma.user as any).findFirst = async () => ({
    id: 'user-admin-1',
    email: 'admin@warehouse.com',
    firstName: 'Warehouse',
    lastName: 'Admin',
    role: 'ADMIN',
  });
  (prisma.user as any).findUnique = async () => ({
    id: 'user-admin-1',
    email: 'admin@warehouse.com',
    firstName: 'Warehouse',
    lastName: 'Admin',
    role: 'ADMIN',
  });
  (prisma.notification as any).create = async () => ({ id: 'notif-1' });
  (prisma.auditLog as any).create = async () => ({ id: 'audit-1' });
  (prisma.toolBoxItem as any).deleteMany = async () => ({ count: 1 });
  (prisma.toolBox as any).delete = async () => ({ id: 'box-1' });

  // --------------------------------------------------------------------------
  // RULE 1: DELIVERY NOTE (OTPREMNICA) - TOOL LIST RESOLUTION & STATUS
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Delivery Note (Otpremnica) Tool List Resolution');

  await test('1.1 Otpremnica generation resolves full tool items regardless of status', async () => {
    (prisma.otpremnicaDocument as any).count = async () => 5;
    (prisma.otpremnicaDocument as any).create = async (args: any) => ({
      id: 'doc-123',
      documentNumber: args.data.documentNumber,
      employeeId: args.data.employeeId,
      issueDate: args.data.issueDate,
      transactionIds: args.data.transactionIds,
      createdAt: new Date(),
      employee: { firstName: 'John', lastName: 'Doe', department: 'Field Ops' },
    });

    (prisma.assetTransaction as any).findMany = async () => [
      {
        id: 'trx-1',
        assetId: 'asset-1',
        assetName: 'Bosch Hammer Drill',
        assetNumber: 'TL-001',
        asset: {
          id: 'asset-1',
          name: 'Bosch Hammer Drill',
          assetNumber: 'TL-001',
          serialNumber: 'SN-999',
          category: 'Power Tools',
          status: 'ISSUED',
        },
      },
      {
        id: 'trx-2',
        assetId: 'asset-2',
        assetName: 'Fluke Multimeter',
        assetNumber: 'TL-002',
        asset: {
          id: 'asset-2',
          name: 'Fluke Multimeter',
          assetNumber: 'TL-002',
          serialNumber: 'SN-888',
          category: 'Measuring Instruments',
          status: 'RETIRED',
        },
      },
    ];

    const res = await apiRequest('POST', '/otpremnica/generate', {
      employeeId: 'emp-1',
      transactionIds: ['trx-1', 'trx-2'],
    });

    assertEquals(res.status, 201, 'Expected 201 Created');
    assert(Array.isArray(res.data.items), 'items must be an array');
    assertEquals(res.data.items.length, 2, 'items must contain all 2 assigned tools');
    assertEquals(res.data.items[0].assetName, 'Bosch Hammer Drill');
    assertEquals(res.data.items[0].status, 'ISSUED');
    assertEquals(res.data.items[1].assetName, 'Fluke Multimeter');
    assertEquals(res.data.items[1].status, 'RETIRED');
    assertEquals(res.data.items[1].serialNumber, 'SN-888');
  });

  // --------------------------------------------------------------------------
  // RULE 2: CRATES (TOOLBOXES) - ISSUANCE RULES
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: Crates (ToolBoxes) Issuance Rules');

  await test('2.1 Tool currently in active crate cannot be issued individually', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-crate-1',
        name: 'Torque Wrench',
        assetNumber: 'TW-100',
        status: 'AVAILABLE',
      },
    ];

    (prisma.toolBoxItem as any).findMany = async () => [
      {
        id: 'tbi-1',
        toolBoxId: 'box-1',
        assetId: 'asset-crate-1',
        toolBox: {
          id: 'box-1',
          boxNumber: 'TB-01',
          name: 'Rig Crate Alpha',
          status: 'ACTIVE',
        },
        asset: {
          id: 'asset-crate-1',
          name: 'Torque Wrench',
          assetNumber: 'TW-100',
        },
      },
    ];

    const res = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['asset-crate-1'],
      employeeId: 'emp-1',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('currently in crate "Rig Crate Alpha"'),
      `Expected error to state tool is in crate, got: ${res.data.error}`
    );
  });

  await test('2.2 Already-issued tool CAN be added to a crate (ToolBox)', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-issued-1',
        name: 'Circular Saw',
        assetNumber: 'CS-01',
        status: 'ISSUED',
      },
    ];

    (prisma.toolBoxItem as any).findFirst = async () => null;
    (prisma.toolBox as any).count = async () => 3;
    (prisma.toolBox as any).create = async (args: any) => ({
      id: 'box-new-1',
      boxNumber: args.data.boxNumber,
      name: args.data.name,
      status: 'ACTIVE',
      items: [
        {
          id: 'tbi-new',
          assetId: 'asset-issued-1',
          asset: {
            id: 'asset-issued-1',
            name: 'Circular Saw',
            assetNumber: 'CS-01',
            status: 'ISSUED',
          },
        },
      ],
    });

    const res = await apiRequest('POST', '/toolboxes', {
      name: 'Carpentry Toolbox',
      description: 'Site carpentry crate',
      assetIds: ['asset-issued-1'],
    });

    assertEquals(res.status, 201, 'Expected 201 Created');
    assertEquals(res.data.name, 'Carpentry Toolbox');
  });

  await test('2.3 Dismantling crate preserves LOST and RETIRED status on assets', async () => {
    let capturedWhereFilter: any = null;
    (prisma.toolBox as any).findUnique = async () => ({
      id: 'box-1',
      status: 'ACTIVE',
      items: [
        { assetId: 'asset-active' },
        { assetId: 'asset-lost' },
        { assetId: 'asset-retired' },
      ],
    });

    (prisma.asset as any).updateMany = async (args: any) => {
      capturedWhereFilter = args.where;
      return { count: 1 };
    };
    (prisma.toolBox as any).delete = async () => ({ id: 'box-1' });

    const res = await apiRequest('POST', '/toolboxes/box-1/dismantle', {});

    assertEquals(res.status, 200, 'Expected 200 OK');
    assert(capturedWhereFilter !== null, 'updateMany must have been called');
    assert(
      capturedWhereFilter.status &&
      capturedWhereFilter.status.notIn &&
      capturedWhereFilter.status.notIn.includes('LOST') &&
      capturedWhereFilter.status.notIn.includes('RETIRED'),
      `Expected where filter to exclude LOST and RETIRED, got: ${JSON.stringify(capturedWhereFilter)}`
    );
  });

  await test('2.4 Adding a DAMAGED or RETIRED tool to a crate is blocked with 400', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-dmg-1',
        name: 'Broken Grinder',
        assetNumber: 'GR-99',
        status: 'DAMAGED',
      },
    ];

    const res = await apiRequest('POST', '/toolboxes', {
      name: 'Heavy Crate',
      assetIds: ['asset-dmg-1'],
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status DAMAGED and cannot be added to a kit/crate'),
      `Expected DAMAGED crate rejection error, got: ${res.data.error}`
    );
  });

  await test('2.5 Adding tools to existing crate via POST /toolboxes/:id/items defensively rejects DAMAGED/RETIRED', async () => {
    (prisma.toolBox as any).findUnique = async () => ({ id: 'box-existing', status: 'ACTIVE' });
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-ret-1',
        name: 'Decommissioned Drill',
        assetNumber: 'DR-00',
        status: 'RETIRED',
      },
    ];

    const res = await apiRequest('POST', '/toolboxes/box-existing/items', {
      assetIds: ['asset-ret-1'],
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status RETIRED and cannot be added to a kit/crate'),
      `Expected RETIRED crate item rejection, got: ${res.data.error}`
    );
  });

  // --------------------------------------------------------------------------
  // RULE 3: "LOST", "DAMAGED" & TERMINAL STATUS ENFORCEMENT
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Terminal & Defective Status Defensive Validation');

  await test('3.1 Modifying or reactivating a LOST asset is blocked with 400', async () => {
    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-lost-1',
      name: 'Rotary Laser',
      assetNumber: 'RL-01',
      status: 'LOST',
    });

    const res = await apiRequest('PUT', '/assets/asset-lost-1', {
      status: 'AVAILABLE',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('is marked as LOST (terminal state)'),
      `Expected terminal error message, got: ${res.data.error}`
    );
  });

  await test('3.2 Issuing a LOST asset is blocked with 400', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-lost-2',
        name: 'Hilti Drill',
        assetNumber: 'HD-02',
        status: 'LOST',
      },
    ];

    const res = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['asset-lost-2'],
      employeeId: 'emp-1',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status LOST and cannot be issued'),
      `Expected error for lost asset, got: ${res.data.error}`
    );
  });

  await test('3.2b Issuing a DAMAGED tool is blocked with 400', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-dmg-2',
        name: 'Shattered Drill',
        assetNumber: 'SD-01',
        status: 'DAMAGED',
      },
    ];

    const res = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['asset-dmg-2'],
      employeeId: 'emp-1',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status DAMAGED and cannot be issued'),
      `Expected error for damaged tool, got: ${res.data.error}`
    );
  });

  await test('3.3 Adding a LOST asset to a crate is blocked with 400', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-lost-3',
        name: 'Lost Generator',
        assetNumber: 'GEN-01',
        status: 'LOST',
      },
    ];

    const res = await apiRequest('POST', '/toolboxes', {
      name: 'Power Pack',
      assetIds: ['asset-lost-3'],
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status LOST and cannot be added to a kit/crate'),
      `Expected error about lost asset in crate, got: ${res.data.error}`
    );
  });

  await test('3.4 Creating a service order for a LOST or RETIRED asset is blocked with 400', async () => {
    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-lost-4',
      name: 'Jackhammer',
      assetNumber: 'JH-01',
      status: 'LOST',
    });

    const res = await apiRequest('POST', '/service-orders', {
      assetId: 'asset-lost-4',
      problemDescription: 'Motor won\'t spin',
      priority: 'HIGH',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status LOST and cannot be sent to maintenance/service'),
      `Expected error for lost service order, got: ${res.data.error}`
    );
  });

  await test('3.4b Service orders PERMIT DAMAGED tools for repair and restore them', async () => {
    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-dmg-3',
      name: 'Damaged Hydraulic Pump',
      assetNumber: 'HP-01',
      status: 'DAMAGED',
    });
    (prisma.asset as any).update = async () => ({ id: 'asset-dmg-3', status: 'IN_SERVICE' });
    (prisma.serviceOrder as any).create = async (args: any) => ({
      id: 'so-1',
      ...args.data,
      asset: { name: 'Damaged Hydraulic Pump', assetNumber: 'HP-01' },
    });

    const res = await apiRequest('POST', '/service-orders', {
      assetId: 'asset-dmg-3',
      problemDescription: 'High pressure seal failure',
      priority: 'CRITICAL',
    });

    assertEquals(res.status, 201, 'Expected 201 Created for repairing damaged equipment');
  });

  await test('3.5 Creating a maintenance task for a LOST or DAMAGED asset is blocked with 400', async () => {
    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-lost-5',
      name: 'Welder',
      assetNumber: 'W-01',
      status: 'LOST',
    });

    const res = await apiRequest('POST', '/maintenance-tasks', {
      assetId: 'asset-lost-5',
      title: 'Annual inspection',
      dueDate: new Date().toISOString(),
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status LOST and cannot be assigned maintenance tasks'),
      `Expected error for lost maintenance task, got: ${res.data.error}`
    );
  });

  await test('3.6 Sending a DAMAGED measuring tool to calibration lab is blocked with 400', async () => {
    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-dmg-cal',
      name: 'Cracked Digital Caliper',
      assetNumber: 'CAL-09',
      status: 'DAMAGED',
    });

    const res = await apiRequest('POST', '/calibrations/send-to-lab', {
      assetId: 'asset-dmg-cal',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status DAMAGED and cannot be sent to calibration lab'),
      `Expected error for damaged calibration, got: ${res.data.error}`
    );
  });

  // --------------------------------------------------------------------------
  // RULE 4: MAINTENANCE TASK COMPLETION LOGIC
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Maintenance Task Completion Logic');

  await test('4.1 Result = FAILED keeps tool in maintenance (does NOT set AVAILABLE) and does not advance plan', async () => {
    let assetUpdatedToStatus: string | null = null;
    let planAdvanced = false;

    (prisma.maintenanceTask as any).findUnique = async () => ({
      id: 'task-fail-1',
      status: 'IN_PROGRESS',
      assetId: 'asset-maint-1',
      planId: 'plan-1',
      title: 'Brake Inspection',
      dueDate: new Date(),
      asset: {
        id: 'asset-maint-1',
        name: 'Forklift',
        assetNumber: 'FL-01',
        status: 'IN_SERVICE',
      },
      plan: {
        id: 'plan-1',
        frequency: 'MONTHLY',
        frequencyUnit: 'MONTHS',
        nextDueDate: new Date('2026-09-01'),
      },
    });

    (prisma.maintenanceTask as any).update = async (args: any) => ({
      id: 'task-fail-1',
      ...args.data,
      asset: { name: 'Forklift' },
    });
    (prisma.asset as any).update = async (args: any) => {
      assetUpdatedToStatus = args.data.status;
      return { id: 'asset-maint-1', status: args.data.status };
    };
    (prisma.maintenancePlan as any).update = async () => {
      planAdvanced = true;
    };

    const res = await apiRequest('PUT', '/maintenance-tasks/task-fail-1/complete', {
      result: 'FAILED',
      notes: 'Brake pads worn beyond limits; parts ordered',
      laborCost: 50,
    });

    assertEquals(res.status, 200, 'Expected 200 OK');
    assertEquals(assetUpdatedToStatus, null, 'Tool status must NOT be changed to AVAILABLE on FAILED');
    assertEquals(planAdvanced, false, 'Plan schedule must NOT advance on FAILED');
    assertEquals(res.data.result, 'FAILED', 'Response result should be FAILED');
  });

  await test('4.2 Result = NOT_COMPLETE keeps task IN_PROGRESS and does not advance plan or release tool', async () => {
    let taskStatusUpdatedTo: string | null = null;
    let assetUpdatedToStatus: string | null = null;
    let planAdvanced = false;

    (prisma.maintenanceTask as any).findUnique = async () => ({
      id: 'task-inc-1',
      status: 'IN_PROGRESS',
      assetId: 'asset-maint-2',
      planId: 'plan-2',
      title: 'Hydraulic Seal Replacement',
      dueDate: new Date(),
      asset: {
        id: 'asset-maint-2',
        name: 'Excavator',
        assetNumber: 'EX-01',
        status: 'IN_SERVICE',
      },
      plan: {
        id: 'plan-2',
        frequency: 'QUARTERLY',
        frequencyUnit: 'MONTHS',
        nextDueDate: new Date('2026-09-15'),
      },
    });

    (prisma.maintenanceTask as any).update = async (args: any) => {
      taskStatusUpdatedTo = args.data.status;
      return { id: 'task-inc-1', ...args.data };
    };
    (prisma.asset as any).update = async (args: any) => {
      assetUpdatedToStatus = args.data.status;
      return { id: 'asset-maint-2', status: args.data.status };
    };
    (prisma.maintenancePlan as any).update = async () => {
      planAdvanced = true;
    };

    const res = await apiRequest('PUT', '/maintenance-tasks/task-inc-1/complete', {
      result: 'NOT_COMPLETE',
      notes: 'Waiting for replacement seal kit from supplier',
    });

    assertEquals(res.status, 200, 'Expected 200 OK');
    assertEquals(taskStatusUpdatedTo, 'IN_PROGRESS', 'Task status must remain IN_PROGRESS');
    assertEquals(assetUpdatedToStatus, null, 'Tool must NOT be released to AVAILABLE');
    assertEquals(planAdvanced, false, 'Plan schedule must NOT advance on NOT_COMPLETE');
  });

  await test('4.3 Result = PASSED marks task COMPLETED, sets tool to AVAILABLE, and advances plan', async () => {
    let taskStatusUpdatedTo: string | null = null;
    let assetUpdatedToStatus: string | null = null;
    let planAdvanced = false;

    (prisma.maintenanceTask as any).findUnique = async () => ({
      id: 'task-pass-1',
      status: 'IN_PROGRESS',
      assetId: 'asset-maint-3',
      planId: 'plan-3',
      title: 'Motor Calibration & Oil Change',
      dueDate: new Date(),
      asset: {
        id: 'asset-maint-3',
        name: 'Generator',
        assetNumber: 'GEN-02',
        status: 'IN_SERVICE',
      },
      plan: {
        id: 'plan-3',
        frequency: 'MONTHLY',
        frequencyUnit: 'MONTHS',
        nextDueDate: new Date('2026-09-01'),
      },
    });

    (prisma.maintenanceTask as any).update = async (args: any) => {
      taskStatusUpdatedTo = args.data.status;
      return { id: 'task-pass-1', ...args.data, asset: { name: 'Generator' } };
    };
    (prisma.asset as any).update = async (args: any) => {
      assetUpdatedToStatus = args.data.status;
      return { id: 'asset-maint-3', status: args.data.status };
    };
    (prisma.maintenancePlan as any).update = async () => {
      planAdvanced = true;
    };

    const res = await apiRequest('PUT', '/maintenance-tasks/task-pass-1/complete', {
      result: 'PASSED',
      notes: 'Oil changed, calibration verified within tolerances',
      laborCost: 80,
      partsCost: 40,
    });

    assertEquals(res.status, 200, 'Expected 200 OK');
    assertEquals(taskStatusUpdatedTo, 'COMPLETED', 'Task status must be COMPLETED');
    assertEquals(assetUpdatedToStatus, 'AVAILABLE', 'Tool status must transition to AVAILABLE');
    assertEquals(planAdvanced, true, 'Plan schedule must be advanced');
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 5: FILTERED REPORT DATASET INTEGRITY (BUG 1)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: Filtered Report Dataset & Print Data Shape Integrity');

  await test('5.1 Multi-criteria filtered report data generation maintains exact filter integrity without empty state', async () => {
    const rawAssets = [
      { id: 'a1', name: 'Drill 1', category: 'POWER_TOOLS', status: 'AVAILABLE', purchaseDate: new Date('2026-01-10'), purchasePrice: 200, currentValue: 180 },
      { id: 'a2', name: 'Drill 2', category: 'POWER_TOOLS', status: 'ISSUED', purchaseDate: new Date('2026-03-15'), purchasePrice: 250, currentValue: 220 },
      { id: 'a3', name: 'Multimeter 1', category: 'MEASURING', status: 'AVAILABLE', purchaseDate: new Date('2026-02-20'), purchasePrice: 150, currentValue: 140 },
      { id: 'a4', name: 'Damaged Saw', category: 'POWER_TOOLS', status: 'DAMAGED', purchaseDate: new Date('2026-05-01'), purchasePrice: 300, currentValue: 100 },
    ];

    // Combination 1: Category = POWER_TOOLS + Date Range (after 2026-02-01)
    const filteredComb1 = rawAssets.filter(a => a.category === 'POWER_TOOLS' && a.purchaseDate >= new Date('2026-02-01'));
    assertEquals(filteredComb1.length, 2, 'Expected 2 power tools after Feb 2026');
    assertEquals(filteredComb1.map(a => a.id).sort().join(','), 'a2,a4', 'Expected a2 and a4');

    // Combination 2: Status = AVAILABLE + Category = MEASURING
    const filteredComb2 = rawAssets.filter(a => a.status === 'AVAILABLE' && a.category === 'MEASURING');
    assertEquals(filteredComb2.length, 1, 'Expected 1 measuring tool');
    assertEquals(filteredComb2[0].id, 'a3', 'Expected a3');
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 6: IN_SERVICE & DAMAGED STATUS BLOCKING (BUGS 2 & 4)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 6: IN_SERVICE & DAMAGED Tool Rejection on Issuance and Kit Creation');

  await test('6.1 Issuing an IN_SERVICE asset via POST /transactions/issue is rejected with 400', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-inservice-1',
        name: 'Lathe Machine',
        assetNumber: 'LM-01',
        status: 'IN_SERVICE',
      },
    ];

    const res = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['asset-inservice-1'],
      employeeId: 'emp-1',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status IN_SERVICE and cannot be issued'),
      `Expected error for in-service tool, got: ${res.data.error}`
    );
  });

  await test('6.2 Adding an IN_SERVICE tool to a crate on creation is blocked with 400', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-inservice-2',
        name: 'Compressor',
        assetNumber: 'CP-02',
        status: 'IN_SERVICE',
      },
    ];

    const res = await apiRequest('POST', '/toolboxes', {
      name: 'Service Crate',
      assetIds: ['asset-inservice-2'],
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status IN_SERVICE and cannot be added to a kit/crate'),
      `Expected error for in-service tool in crate, got: ${res.data.error}`
    );
  });

  await test('6.3 Adding an IN_SERVICE tool to an existing crate via POST /toolboxes/:id/items is blocked with 400', async () => {
    (prisma.toolBox as any).findUnique = async () => ({ id: 'box-existing-2', status: 'ACTIVE' });
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-inservice-3',
        name: 'Hydraulic Jack',
        assetNumber: 'HJ-03',
        status: 'IN_SERVICE',
      },
    ];

    const res = await apiRequest('POST', '/toolboxes/box-existing-2/items', {
      assetIds: ['asset-inservice-3'],
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request');
    assert(
      res.data.error && res.data.error.includes('has status IN_SERVICE and cannot be added to a kit/crate'),
      `Expected error for in-service tool in crate item, got: ${res.data.error}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 7: TOOLBOX FULL LIFECYCLE: CREATE -> ISSUE -> RETURN -> RE-ISSUE (BUG 3)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 7: Full Toolbox Lifecycle: Create -> Issue -> Return -> Re-Issue');

  await test('7.1 Toolbox can be created, issued to Emp A, returned to warehouse, and re-issued to Emp B', async () => {
    let currentBoxStatus = 'UNASSIGNED';
    let currentEmployeeId: string | null = null;
    let toolStatuses: Record<string, string> = { 'tool-1': 'AVAILABLE', 'tool-2': 'AVAILABLE' };

    // 1. Create Toolbox
    (prisma.asset as any).findMany = async () => [
      { id: 'tool-1', name: 'Socket Set', assetNumber: 'SK-01', status: 'AVAILABLE' },
      { id: 'tool-2', name: 'Torque Wrench', assetNumber: 'TW-01', status: 'AVAILABLE' },
    ];
    (prisma.toolBoxItem as any).findFirst = async () => null;
    (prisma.toolBox as any).create = async (args: any) => {
      currentBoxStatus = args.data.status;
      currentEmployeeId = args.data.employeeId;
      return {
        id: 'box-lifecycle-1',
        boxNumber: 'TBX-LIFE-1',
        name: 'Master Field Kit',
        status: currentBoxStatus,
        employeeId: currentEmployeeId,
        items: [{ assetId: 'tool-1' }, { assetId: 'tool-2' }],
      };
    };

    const createRes = await apiRequest('POST', '/toolboxes', {
      boxNumber: 'TBX-LIFE-1',
      name: 'Master Field Kit',
      assetIds: ['tool-1', 'tool-2'],
    });
    assertEquals(createRes.status, 201, 'Toolbox creation should succeed');
    assertEquals(currentBoxStatus, 'UNASSIGNED', 'New unassigned toolbox should be UNASSIGNED');

    // 2. Issue to Employee A
    (prisma.toolBox as any).findUnique = async () => ({
      id: 'box-lifecycle-1',
      boxNumber: 'TBX-LIFE-1',
      status: currentBoxStatus,
      employeeId: currentEmployeeId,
      items: [
        { assetId: 'tool-1', asset: { name: 'Socket Set', assetNumber: 'SK-01', status: 'AVAILABLE' } },
        { assetId: 'tool-2', asset: { name: 'Torque Wrench', assetNumber: 'TW-01', status: 'AVAILABLE' } },
      ],
    });
    (prisma.toolBox as any).update = async (args: any) => {
      if (args.data.status) currentBoxStatus = args.data.status;
      if ('employeeId' in args.data) currentEmployeeId = args.data.employeeId;
      return { id: 'box-lifecycle-1', status: currentBoxStatus, employeeId: currentEmployeeId };
    };
    (prisma.asset as any).updateMany = async (args: any) => {
      for (const id of args.where.id.in) {
        toolStatuses[id] = args.data.status;
      }
    };
    (prisma.employeeAsset as any).create = async () => ({ id: 'ea-1' });

    const issue1Res = await apiRequest('POST', '/toolboxes/issue', {
      boxId: 'box-lifecycle-1',
      employeeId: 'emp-A',
      notes: 'Issued to Technician A',
    });
    assertEquals(issue1Res.status, 200, 'Toolbox issue to Emp A should succeed');
    assertEquals(currentBoxStatus, 'ASSIGNED', 'Status should be ASSIGNED after issue');
    assertEquals(currentEmployeeId, 'emp-A', 'Assigned employee should be emp-A');
    assertEquals(toolStatuses['tool-1'], 'ISSUED', 'Contained tools should become ISSUED');

    // 3. Return Toolbox
    (prisma.employeeAsset as any).updateMany = async () => ({ count: 2 });
    const returnRes = await apiRequest('POST', '/toolboxes/return', {
      boxId: 'box-lifecycle-1',
    });
    assertEquals(returnRes.status, 200, 'Toolbox return should succeed');
    assertEquals(currentBoxStatus, 'UNASSIGNED', 'Status should transition back to UNASSIGNED');
    assertEquals(currentEmployeeId, null, 'Employee should be reset to null');
    assertEquals(toolStatuses['tool-1'], 'AVAILABLE', 'Tools should revert to AVAILABLE');

    // 4. Re-issue to Employee B (proves it didn't disappear and can be checked out again)
    const issue2Res = await apiRequest('POST', '/toolboxes/issue', {
      boxId: 'box-lifecycle-1',
      employeeId: 'emp-B',
      notes: 'Re-issued to Technician B',
    });
    assertEquals(issue2Res.status, 200, 'Toolbox re-issue to Emp B should succeed');
    assertEquals(currentBoxStatus, 'ASSIGNED', 'Status should transition back to ASSIGNED');
    assertEquals(currentEmployeeId, 'emp-B', 'Assigned employee should now be emp-B');
    assertEquals(toolStatuses['tool-1'], 'ISSUED', 'Tools should transition to ISSUED for emp-B');
  });

  await test('7.2 Toolbox return preserves DAMAGED tools and does not revert them to AVAILABLE', async () => {
    let preservedStatuses: Record<string, string> = { 'tool-good': 'ISSUED', 'tool-broken': 'DAMAGED' };

    (prisma.toolBox as any).findUnique = async () => ({
      id: 'box-damaged-test',
      items: [{ assetId: 'tool-good' }, { assetId: 'tool-broken' }],
    });
    (prisma.toolBox as any).update = async () => ({ id: 'box-damaged-test', status: 'UNASSIGNED' });
    (prisma.asset as any).updateMany = async (args: any) => {
      const notIn = args.where.status?.notIn || [];
      for (const id of args.where.id.in) {
        if (!notIn.includes(preservedStatuses[id])) {
          preservedStatuses[id] = args.data.status;
        }
      }
    };
    (prisma.employeeAsset as any).updateMany = async () => ({ count: 2 });

    const res = await apiRequest('POST', '/toolboxes/return', {
      boxId: 'box-damaged-test',
    });

    assertEquals(res.status, 200, 'Return should succeed');
    assertEquals(preservedStatuses['tool-good'], 'AVAILABLE', 'Good tool should revert to AVAILABLE');
    assertEquals(preservedStatuses['tool-broken'], 'DAMAGED', 'Damaged tool must REMAIN DAMAGED');
  });

  await test('7.3 Issuing a toolbox containing a DAMAGED or IN_SERVICE tool is defensively blocked with 400', async () => {
    (prisma.toolBox as any).findUnique = async () => ({
      id: 'box-with-damaged',
      items: [
        { assetId: 'tool-ok', asset: { name: 'Good Pliers', assetNumber: 'PL-01', status: 'AVAILABLE' } },
        { assetId: 'tool-dmg', asset: { name: 'Broken Screwdriver', assetNumber: 'SD-09', status: 'DAMAGED' } },
      ],
    });

    const res = await apiRequest('POST', '/toolboxes/issue', {
      boxId: 'box-with-damaged',
      employeeId: 'emp-C',
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request for toolbox with damaged item');
    assert(
      res.data.error && res.data.error.includes('in this toolbox has status DAMAGED and the toolbox cannot be issued'),
      `Expected error message, got: ${res.data.error}`
    );
  });

  // Close server
  server.close();

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  if (server) server.close();
  process.exit(1);
});
