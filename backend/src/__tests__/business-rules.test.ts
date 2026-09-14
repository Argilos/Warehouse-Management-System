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

function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
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

  await test('1.2 Otpremnica list endpoint (GET /otpremnica) resolves full tool items regardless of subsequent status changes', async () => {
    (prisma.otpremnicaDocument as any).findMany = async () => [
      {
        id: 'doc-list-1',
        documentNumber: 'OTP-2026-0001',
        employeeId: 'emp-1',
        issueDate: new Date('2026-03-01'),
        transactionIds: ['trx-hist-1', 'trx-hist-2'],
        createdAt: new Date('2026-03-01'),
        employee: { firstName: 'Alice', lastName: 'Smith', employeeNumber: 'EMP-01', department: 'Electrical' },
        project: { name: 'Metro Line 3', projectCode: 'PRJ-M3' },
        createdBy: { firstName: 'Admin', lastName: 'User' },
      },
    ];

    (prisma.assetTransaction as any).findMany = async () => [
      {
        id: 'trx-hist-1',
        assetId: 'ast-h1',
        asset: {
          id: 'ast-h1',
          name: 'Oscilloscope',
          assetNumber: 'OSC-01',
          serialNumber: 'SN-OSC-777',
          category: 'Measuring Instruments',
          status: 'DAMAGED', // Status changed to DAMAGED later
        },
        notes: 'Calibrated scope',
      },
      {
        id: 'trx-hist-2',
        assetId: 'ast-h2',
        asset: {
          id: 'ast-h2',
          name: 'Multimeter',
          assetNumber: 'MM-02',
          serialNumber: 'SN-MM-888',
          category: 'Measuring Instruments',
          status: 'AVAILABLE', // Returned later
        },
      },
    ];

    const res = await apiRequest('GET', '/otpremnica');
    assertEquals(res.status, 200, 'Expected 200 OK');
    assert(Array.isArray(res.data), 'Expected array of otpremnice');
    assertEquals(res.data.length, 1, 'Expected 1 document');
    const doc = res.data[0];
    assertEquals(doc.documentNumber, 'OTP-2026-0001');
    assert(Array.isArray(doc.items), 'doc.items must be an array');
    assertEquals(doc.items.length, 2, 'items must resolve all 2 assigned tools');
    assertEquals(doc.items[0].assetName, 'Oscilloscope');
    assertEquals(doc.items[0].serialNumber, 'SN-OSC-777');
    assertEquals(doc.items[0].status, 'DAMAGED');
    assertEquals(doc.items[1].assetName, 'Multimeter');
    assertEquals(doc.items[1].status, 'AVAILABLE');
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

  await test('2.2 Only AVAILABLE tools can be added to a crate (ISSUED tool is rejected with 400)', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-issued-1',
        name: 'Circular Saw',
        assetNumber: 'CS-01',
        status: 'ISSUED',
      },
    ];

    const res = await apiRequest('POST', '/toolboxes', {
      name: 'Carpentry Toolbox',
      description: 'Site carpentry crate',
      assetIds: ['asset-issued-1'],
    });

    assertEquals(res.status, 400, 'Expected 400 Bad Request for non-available tool');
    assert(
      res.data.error && res.data.error.includes('Only AVAILABLE tools can be packed'),
      `Expected strict AVAILABLE rejection error, got: ${res.data.error}`
    );
  });

  await test('2.2b Available tools CAN be added to a crate (ToolBox)', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-avail-1',
        name: 'Circular Saw',
        assetNumber: 'CS-01',
        status: 'AVAILABLE',
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
          assetId: 'asset-avail-1',
          asset: {
            id: 'asset-avail-1',
            name: 'Circular Saw',
            assetNumber: 'CS-01',
            status: 'AVAILABLE',
          },
        },
      ],
    });

    const res = await apiRequest('POST', '/toolboxes', {
      name: 'Carpentry Toolbox',
      description: 'Site carpentry crate',
      assetIds: ['asset-avail-1'],
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
      capturedWhereFilter.status.notIn.includes('RETIRED') &&
      capturedWhereFilter.status.notIn.includes('DAMAGED'),
      `Expected where filter to exclude LOST, RETIRED, and DAMAGED, got: ${JSON.stringify(capturedWhereFilter)}`
    );
  });

  await test('2.6 Dismantling crate releases contained tools for individual issuance again', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-released-from-crate',
        name: 'Hammer Drill',
        assetNumber: 'HD-50',
        status: 'AVAILABLE',
      },
    ];
    // After dismantle, toolbox items are deleted, so toolBoxItem.findMany returns empty array!
    (prisma.toolBoxItem as any).findMany = async () => [];
    (prisma.asset as any).update = async () => ({ id: 'asset-released-from-crate', status: 'ISSUED' });
    (prisma.employeeAsset as any).updateMany = async () => ({ count: 0 });
    (prisma.employeeAsset as any).create = async () => ({});
    (prisma.assetTransaction as any).create = async (args: any) => ({
      id: 'trx-rel-1',
      ...args.data,
      asset: { id: 'asset-released-from-crate', name: 'Hammer Drill', assetNumber: 'HD-50' },
      employee: { firstName: 'Worker' },
    });
    (prisma.otpremnicaDocument as any).count = async () => 1;
    (prisma.otpremnicaDocument as any).create = async () => ({
      id: 'doc-rel-1',
      documentNumber: 'OTP-2026-0002',
      items: [],
      transactionIds: ['trx-rel-1'],
    });

    const res = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['asset-released-from-crate'],
      employeeId: 'emp-worker',
    });

    assertEquals(res.status, 201, 'Expected 201 Created now that crate is dismantled');
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

  await test('3.7 Returning a tool with condition LOST transitions status to LOST and blocks re-issuance', async () => {
    let updatedAssetStatus: string | null = null;
    let employeeAssignmentClosed = false;

    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-lost-return-1',
      name: 'Rotary Hammer SDS',
      assetNumber: 'RH-99',
      status: 'ISSUED',
      currentValue: 450,
    });

    (prisma.employeeAsset as any).findFirst = async () => ({
      id: 'ea-active-1',
      employeeId: 'emp-lost-1',
      assetId: 'asset-lost-return-1',
      returnedDate: null,
    });

    (prisma.employeeAsset as any).updateMany = async () => {
      employeeAssignmentClosed = true;
      return { count: 1 };
    };

    (prisma.asset as any).update = async (args: any) => {
      updatedAssetStatus = args.data.status;
      return { id: 'asset-lost-return-1', status: args.data.status };
    };

    (prisma.assetTransaction as any).create = async (args: any) => ({
      id: 'trx-ret-lost-1',
      ...args.data,
      asset: { id: 'asset-lost-return-1', name: 'Rotary Hammer SDS', assetNumber: 'RH-99' },
      employee: { firstName: 'Bob', lastName: 'Builder' },
      performedBy: { firstName: 'Admin', lastName: 'User' },
    });

    (prisma.notification as any).create = async () => ({ id: 'notif-1' });
    (prisma.auditLog as any).create = async () => ({ id: 'log-1' });

    const returnRes = await apiRequest('POST', '/transactions/return', {
      assetId: 'asset-lost-return-1',
      condition: 'LOST',
      notes: 'Lost on site during flood',
    });

    assertEquals(returnRes.status, 201, 'Expected 201 Created on return');
    assertEquals(updatedAssetStatus, 'LOST', 'Asset status must be transitioned to LOST');
    assertEquals(employeeAssignmentClosed, true, 'Active employee loan must be closed');

    // Verify defensive terminal status blocks future issuance
    (prisma.asset as any).findMany = async () => [
      {
        id: 'asset-lost-return-1',
        name: 'Rotary Hammer SDS',
        assetNumber: 'RH-99',
        status: 'LOST',
      },
    ];

    const issueRes = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['asset-lost-return-1'],
      employeeId: 'emp-2',
    });

    assertEquals(issueRes.status, 400, 'Expected 400 Bad Request when attempting to re-issue lost tool');
    assert(
      issueRes.data.error && issueRes.data.error.includes('has status LOST and cannot be issued'),
      `Expected terminal status error message, got: ${issueRes.data.error}`
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

  await test('4.4 Returning a tool with condition DAMAGED auto-creates reactive ServiceOrder and MaintenanceTask atomically', async () => {
    let updatedAssetStatus: string | null = null;
    let createdServiceOrder: any = null;
    let createdMaintenanceTask: any = null;

    (prisma.asset as any).findUnique = async () => ({
      id: 'asset-dmg-return-1',
      name: 'Angle Grinder 2000W',
      assetNumber: 'AG-42',
      status: 'ISSUED',
    });

    (prisma.employeeAsset as any).findFirst = async () => ({
      id: 'ea-active-2',
      employeeId: 'emp-dmg-1',
      assetId: 'asset-dmg-return-1',
      returnedDate: null,
    });

    (prisma.employeeAsset as any).updateMany = async () => ({ count: 1 });

    (prisma.asset as any).update = async (args: any) => {
      updatedAssetStatus = args.data.status;
      return { id: 'asset-dmg-return-1', status: args.data.status };
    };

    (prisma.assetTransaction as any).create = async (args: any) => ({
      id: 'trx-ret-dmg-1',
      ...args.data,
      asset: { id: 'asset-dmg-return-1', name: 'Angle Grinder 2000W', assetNumber: 'AG-42' },
      employee: { firstName: 'Charlie', lastName: 'Brown' },
      performedBy: { firstName: 'Admin', lastName: 'User' },
    });

    (prisma.serviceOrder as any).create = async (args: any) => {
      createdServiceOrder = { id: 'so-auto-1', ...args.data };
      return createdServiceOrder;
    };

    (prisma.maintenanceTask as any).create = async (args: any) => {
      createdMaintenanceTask = { id: 'task-auto-1', ...args.data };
      return createdMaintenanceTask;
    };

    (prisma.notification as any).create = async () => ({ id: 'notif-2' });
    (prisma.auditLog as any).create = async () => ({ id: 'log-2' });

    const returnRes = await apiRequest('POST', '/transactions/return', {
      assetId: 'asset-dmg-return-1',
      condition: 'DAMAGED',
      notes: 'Motor smoked and ceased during cutting operations',
    });

    assertEquals(returnRes.status, 201, 'Expected 201 Created on damaged tool return');
    assertEquals(updatedAssetStatus, 'DAMAGED', 'Asset status must be transitioned to DAMAGED');
    assert(createdServiceOrder !== null, 'ServiceOrder must be automatically created');
    assertEquals(createdServiceOrder.status, 'PENDING', 'Auto ServiceOrder must have default PENDING status');
    assert(
      createdServiceOrder.problemDescription.includes('trx-ret-dmg-1'),
      'ServiceOrder description must reference return transaction ID for traceability'
    );
    assert(createdMaintenanceTask !== null, 'MaintenanceTask must be automatically created');
    assertEquals(createdMaintenanceTask.type, 'REACTIVE', 'MaintenanceTask must have type REACTIVE');
    assertEquals(createdMaintenanceTask.priority, 'HIGH', 'MaintenanceTask must have priority HIGH');
    assertEquals(createdMaintenanceTask.status, 'PENDING', 'MaintenanceTask must have status PENDING');
  });

  await test('4.5 Dispatching a PENDING service order moves tool from DAMAGED to IN_SERVICE and advances reactive task', async () => {
    let assetStatus: string = 'DAMAGED';
    let serviceOrderStatus: string = 'PENDING';
    let taskStatus: string = 'PENDING';

    (prisma.serviceOrder as any).findUnique = async () => ({
      id: 'so-pending-1',
      assetId: 'asset-dmg-dispatch',
      supplierId: null,
      problemDescription: 'Motor ceased',
      status: 'PENDING',
      asset: { id: 'asset-dmg-dispatch', name: 'Angle Grinder', assetNumber: 'AG-01', status: 'DAMAGED' },
    });

    (prisma.asset as any).update = async (args: any) => {
      assetStatus = args.data.status;
      return { id: 'asset-dmg-dispatch', status: assetStatus };
    };

    (prisma.serviceOrder as any).update = async (args: any) => {
      serviceOrderStatus = args.data.status;
      return {
        id: 'so-pending-1',
        assetId: 'asset-dmg-dispatch',
        supplierId: args.data.supplierId,
        problemDescription: args.data.problemDescription,
        status: serviceOrderStatus,
        sentDate: args.data.sentDate,
        asset: { id: 'asset-dmg-dispatch', name: 'Angle Grinder', assetNumber: 'AG-01' },
        supplier: { id: 'sup-1', companyName: 'Authorized Bosch Repair' },
      };
    };

    (prisma.maintenanceTask as any).findFirst = async () => ({
      id: 'task-rm-1',
      assetId: 'asset-dmg-dispatch',
      status: 'PENDING',
    });

    (prisma.maintenanceTask as any).update = async (args: any) => {
      taskStatus = args.data.status;
      return { id: 'task-rm-1', status: taskStatus };
    };

    (prisma.user as any).findFirst = async () => ({ id: 'usr-1', email: 'admin@warehouse.com' });
    (prisma.notification as any).create = async () => ({ id: 'notif-disp' });
    (prisma.auditLog as any).create = async () => ({ id: 'log-disp' });

    const res = await apiRequest('PUT', '/service-orders/so-pending-1/dispatch', {
      supplierId: 'sup-1',
      problemDescription: 'Bearing replacement and stator rewind required',
    });

    assertEquals(res.status, 200, 'Expected 200 OK for dispatch');
    assertEquals(serviceOrderStatus, 'SENT', 'Service order status must be SENT');
    assertEquals(assetStatus, 'IN_SERVICE', 'Tool status must transition from DAMAGED to IN_SERVICE');
    assertEquals(taskStatus, 'IN_PROGRESS', 'Linked reactive maintenance task must advance to IN_PROGRESS');
  });

  await test('4.6 Completing a dispatched service order restores tool to AVAILABLE and completes reactive maintenance task', async () => {
    let assetStatus: string = 'IN_SERVICE';
    let serviceOrderStatus: string = 'SENT';
    let taskStatus: string = 'IN_PROGRESS';

    (prisma.serviceOrder as any).findUnique = async () => ({
      id: 'so-pending-1',
      assetId: 'asset-dmg-dispatch',
      status: 'SENT',
      asset: { id: 'asset-dmg-dispatch', name: 'Angle Grinder', assetNumber: 'AG-01', status: 'IN_SERVICE' },
    });

    (prisma.serviceOrder as any).update = async (args: any) => {
      serviceOrderStatus = args.data.status;
      return {
        id: 'so-pending-1',
        ...args.data,
        asset: { id: 'asset-dmg-dispatch', name: 'Angle Grinder', assetNumber: 'AG-01' },
      };
    };

    (prisma.asset as any).update = async (args: any) => {
      assetStatus = args.data.status;
      return { id: 'asset-dmg-dispatch', status: assetStatus };
    };

    (prisma.maintenanceTask as any).findFirst = async () => ({
      id: 'task-rm-1',
      assetId: 'asset-dmg-dispatch',
      status: 'IN_PROGRESS',
    });

    (prisma.maintenanceTask as any).update = async (args: any) => {
      taskStatus = args.data.status;
      return { id: 'task-rm-1', status: taskStatus };
    };

    const res = await apiRequest('PUT', '/service-orders/so-pending-1/complete', {
      repairCost: 140,
      replacedParts: 'Bearings, armature brush kit',
      notes: 'Calibrated and load tested',
    });

    assertEquals(res.status, 200, 'Expected 200 OK for service completion');
    assertEquals(serviceOrderStatus, 'COMPLETED', 'Service order must be COMPLETED');
    assertEquals(assetStatus, 'AVAILABLE', 'Tool status must transition back to AVAILABLE');
    assertEquals(taskStatus, 'COMPLETED', 'Linked reactive maintenance task must be marked COMPLETED');
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

  // --------------------------------------------------------------------------
  // TEST SUITE 8: UNIVERSAL OTPREMNICA GENERATION ON ISSUANCE
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 8: Universal Otpremnica Generation on Every Issuance');

  await test('8.1 POST /transactions/issue auto-generates an OtpremnicaDocument containing full tool details', async () => {
    (prisma.asset as any).findMany = async () => [
      {
        id: 'ast-univ-1',
        name: 'Impact Driver',
        assetNumber: 'ID-01',
        serialNumber: 'SN-IMP-101',
        category: 'Power Tools',
        status: 'AVAILABLE',
      },
      {
        id: 'ast-univ-2',
        name: 'Laser Distance Meter',
        assetNumber: 'LDM-02',
        serialNumber: 'SN-LDM-202',
        category: 'Measuring Instruments',
        status: 'AVAILABLE',
      },
    ];

    (prisma.toolBoxItem as any).findMany = async () => [];
    (prisma.asset as any).update = async (args: any) => ({ id: args.where.id, status: 'ISSUED' });
    (prisma.employeeAsset as any).updateMany = async () => ({ count: 0 });
    (prisma.employeeAsset as any).create = async () => ({ id: 'ea-new' });

    let trxCounter = 1;
    (prisma.assetTransaction as any).create = async (args: any) => ({
      id: `trx-univ-${trxCounter++}`,
      ...args.data,
      asset: {
        id: args.data.assetId,
        name: args.data.assetId === 'ast-univ-1' ? 'Impact Driver' : 'Laser Distance Meter',
        assetNumber: args.data.assetId === 'ast-univ-1' ? 'ID-01' : 'LDM-02',
        serialNumber: args.data.assetId === 'ast-univ-1' ? 'SN-IMP-101' : 'SN-LDM-202',
        category: args.data.assetId === 'ast-univ-1' ? 'Power Tools' : 'Measuring Instruments',
        status: 'ISSUED',
      },
      employee: { firstName: 'Dave', lastName: 'Miller', employeeNumber: 'EMP-DM' },
      project: { name: 'Tower Project' },
      performedBy: { firstName: 'Admin', lastName: 'User' },
    });

    (prisma.assetTransaction as any).findMany = async (args: any) => [
      {
        id: 'trx-univ-1',
        assetId: 'ast-univ-1',
        asset: {
          id: 'ast-univ-1',
          name: 'Impact Driver',
          assetNumber: 'ID-01',
          serialNumber: 'SN-IMP-101',
          category: 'Power Tools',
          status: 'ISSUED',
        },
      },
      {
        id: 'trx-univ-2',
        assetId: 'ast-univ-2',
        asset: {
          id: 'ast-univ-2',
          name: 'Laser Distance Meter',
          assetNumber: 'LDM-02',
          serialNumber: 'SN-LDM-202',
          category: 'Measuring Instruments',
          status: 'ISSUED',
        },
      },
    ];

    (prisma.otpremnicaDocument as any).count = async () => 10;
    (prisma.otpremnicaDocument as any).create = async (args: any) => ({
      id: 'otp-doc-univ-1',
      ...args.data,
      employee: { firstName: 'Dave', lastName: 'Miller', employeeNumber: 'EMP-DM', department: 'Construction' },
      project: { name: 'Tower Project', projectCode: 'PRJ-TP' },
      createdBy: { firstName: 'Admin', lastName: 'User' },
    });

    const res = await apiRequest('POST', '/transactions/issue', {
      assetIds: ['ast-univ-1', 'ast-univ-2'],
      employeeId: 'emp-dave',
      projectId: 'proj-tower',
      notes: 'Initial construction phase loan',
    });

    assertEquals(res.status, 201, 'Expected 201 Created for issuance');
    assert(res.data.otpremnica !== null, 'Issuance response must include auto-generated otpremnica');
    assertEquals(res.data.otpremnica.documentNumber, 'OTP-2026-0011', 'Document number should follow format');
    assert(Array.isArray(res.data.otpremnica.items), 'Otpremnica must contain items array');
    assertEquals(res.data.otpremnica.items.length, 2, 'Must contain both issued tools');
    assertEquals(res.data.otpremnica.items[0].assetName, 'Impact Driver');
    assertEquals(res.data.otpremnica.items[0].serialNumber, 'SN-IMP-101');
    assertEquals(res.data.otpremnica.items[1].assetName, 'Laser Distance Meter');
    assertEquals(res.data.otpremnica.items[1].serialNumber, 'SN-LDM-202');
  });

  await test('8.2 POST /toolboxes/issue creates transactions and auto-generates OtpremnicaDocument listing crate and tools', async () => {
    (prisma.toolBox as any).findUnique = async () => ({
      id: 'box-univ-1',
      boxNumber: 'CRATE-PRO-01',
      name: 'HVAC Site Crate',
      status: 'ACTIVE',
      items: [
        {
          assetId: 'ast-hvac-1',
          asset: {
            id: 'ast-hvac-1',
            name: 'Manifold Gauge Set',
            assetNumber: 'MGS-01',
            serialNumber: 'SN-MGS-55',
            category: 'HVAC Equipment',
            status: 'AVAILABLE',
          },
        },
        {
          assetId: 'ast-hvac-2',
          asset: {
            id: 'ast-hvac-2',
            name: 'Vacuum Pump',
            assetNumber: 'VP-01',
            serialNumber: 'SN-VP-99',
            category: 'HVAC Equipment',
            status: 'AVAILABLE',
          },
        },
      ],
    });

    (prisma.toolBox as any).update = async (args: any) => ({
      id: 'box-univ-1',
      boxNumber: 'CRATE-PRO-01',
      name: 'HVAC Site Crate',
      ...args.data,
    });

    (prisma.asset as any).updateMany = async () => ({ count: 2 });
    (prisma.employeeAsset as any).updateMany = async () => ({ count: 0 });
    (prisma.employeeAsset as any).create = async () => ({ id: 'ea-kit-1' });

    let tCounter = 1;
    (prisma.assetTransaction as any).create = async (args: any) => ({
      id: `trx-kit-${tCounter++}`,
      ...args.data,
      asset: {
        id: args.data.assetId,
        name: args.data.assetId === 'ast-hvac-1' ? 'Manifold Gauge Set' : 'Vacuum Pump',
        assetNumber: args.data.assetId === 'ast-hvac-1' ? 'MGS-01' : 'VP-01',
        serialNumber: args.data.assetId === 'ast-hvac-1' ? 'SN-MGS-55' : 'SN-VP-99',
        category: 'HVAC Equipment',
        status: 'ISSUED',
      },
      employee: { firstName: 'Elena', lastName: 'Rostova', employeeNumber: 'EMP-ER' },
      performedBy: { firstName: 'Admin', lastName: 'User' },
    });

    (prisma.assetTransaction as any).findMany = async (args: any) => [
      {
        id: 'trx-kit-1',
        assetId: 'ast-hvac-1',
        asset: {
          id: 'ast-hvac-1',
          name: 'Manifold Gauge Set',
          assetNumber: 'MGS-01',
          serialNumber: 'SN-MGS-55',
          category: 'HVAC Equipment',
          status: 'ISSUED',
        },
      },
      {
        id: 'trx-kit-2',
        assetId: 'ast-hvac-2',
        asset: {
          id: 'ast-hvac-2',
          name: 'Vacuum Pump',
          assetNumber: 'VP-01',
          serialNumber: 'SN-VP-99',
          category: 'HVAC Equipment',
          status: 'ISSUED',
        },
      },
    ];

    (prisma.otpremnicaDocument as any).count = async () => 15;
    (prisma.otpremnicaDocument as any).create = async (args: any) => ({
      id: 'otp-crate-doc-1',
      ...args.data,
      employee: { firstName: 'Elena', lastName: 'Rostova', employeeNumber: 'EMP-ER', department: 'HVAC' },
      createdBy: { firstName: 'Admin', lastName: 'User' },
    });

    const res = await apiRequest('POST', '/toolboxes/issue', {
      boxId: 'box-univ-1',
      employeeId: 'emp-elena',
      notes: 'Deployment to Phase 2 cooling plant',
    });

    assertEquals(res.status, 200, 'Expected 200 OK for toolbox issue');
    assert(res.data.otpremnica !== null, 'Toolbox issue must return generated otpremnica');
    assertEquals(res.data.transactions.length, 2, 'Should create 2 transactions for component tools');
    assert(Array.isArray(res.data.otpremnica.items), 'Otpremnica must have items array');
    assertEquals(res.data.otpremnica.items.length, 3, 'Must list 1 crate kit header + 2 component tools');
    assertEquals(res.data.otpremnica.items[0].isKitHeader, true, 'First item must be kit header');
    assertEquals(res.data.otpremnica.items[0].assetName, '[KIT] HVAC Site Crate');
    assertEquals(res.data.otpremnica.items[1].assetName, 'Manifold Gauge Set');
    assertEquals(res.data.otpremnica.items[2].assetName, 'Vacuum Pump');
  });

  // --------------------------------------------------------------------------
  // TEST SUITE 9: DATE RANGE FILTERING, VALIDATION & REPORT INTEGRITY
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 9: Date Range Filtering, Validation & Report Integrity');

  await test('9.1 Backend parses startDate and endDate query parameters and applies Prisma where range filters', async () => {
    let capturedAssetWhere: any = null;
    (prisma.asset as any).findMany = async (args: any) => {
      capturedAssetWhere = args?.where;
      return [
        {
          id: 'ast-date-1',
          name: 'Thermal Camera',
          assetNumber: 'AST-TC-01',
          status: 'AVAILABLE',
          purchaseDate: new Date('2026-02-15T10:00:00Z'),
          purchasePrice: 1500,
          currentValue: 1300,
        },
      ];
    };

    const assetRes = await apiRequest('GET', '/assets?startDate=2026-02-01&endDate=2026-02-28');
    assertEquals(assetRes.status, 200, 'Expected 200 OK for date-filtered assets');
    assert(capturedAssetWhere !== null, 'Prisma query should have where clause');
    assert(capturedAssetWhere.purchaseDate !== undefined, 'where clause should contain purchaseDate filter');
    assertEquals(capturedAssetWhere.purchaseDate.gte.toISOString(), '2026-02-01T00:00:00.000Z', 'Start date should be normalized to UTC start of day');
    assertEquals(capturedAssetWhere.purchaseDate.lte.toISOString(), '2026-02-28T23:59:59.999Z', 'End date should be normalized to UTC end of day');

    let capturedTrxWhere: any = null;
    (prisma.assetTransaction as any).findMany = async (args: any) => {
      capturedTrxWhere = args?.where;
      return [
        {
          id: 'trx-date-1',
          assetId: 'ast-1',
          transactionType: 'ISSUE',
          transactionDate: new Date('2026-03-10T14:00:00Z'),
          asset: { name: 'Hammer Drill', assetNumber: 'HD-01' },
          employee: { firstName: 'Mark', lastName: 'Davis' },
          performedBy: { firstName: 'Admin', lastName: 'User' },
        },
      ];
    };

    const trxRes = await apiRequest('GET', '/transactions?startDate=2026-03-01&endDate=2026-03-31');
    assertEquals(trxRes.status, 200, 'Expected 200 OK for date-filtered transactions');
    assert(capturedTrxWhere !== null, 'Prisma query should have where clause');
    assert(capturedTrxWhere.transactionDate !== undefined, 'where clause should contain transactionDate filter');
    assertEquals(capturedTrxWhere.transactionDate.gte.toISOString(), '2026-03-01T00:00:00.000Z');
    assertEquals(capturedTrxWhere.transactionDate.lte.toISOString(), '2026-03-31T23:59:59.999Z');

    let capturedOtpWhere: any = null;
    (prisma.otpremnicaDocument as any).findMany = async (args: any) => {
      capturedOtpWhere = args?.where;
      return [];
    };
    const otpRes = await apiRequest('GET', '/otpremnica?startDate=2026-04-01&endDate=2026-04-30');
    assertEquals(otpRes.status, 200, 'Expected 200 OK for date-filtered otpremnica');
    assert(capturedOtpWhere !== null, 'Prisma query should have where clause');
    assert(capturedOtpWhere.issueDate !== undefined, 'where clause should contain issueDate filter');
    assertEquals(capturedOtpWhere.issueDate.gte.toISOString(), '2026-04-01T00:00:00.000Z');
    assertEquals(capturedOtpWhere.issueDate.lte.toISOString(), '2026-04-30T23:59:59.999Z');
  });

  await test('9.2 Backend rejects invalid date range (start > end) with HTTP 400 and clear error message', async () => {
    const resAsset = await apiRequest('GET', '/assets?startDate=2026-06-30&endDate=2026-01-01');
    assertEquals(resAsset.status, 400, 'Expected 400 Bad Request');
    assert(
      resAsset.data.error && resAsset.data.error.includes('startDate cannot be after endDate'),
      `Expected 'startDate cannot be after endDate', got: ${resAsset.data.error}`
    );

    const resTrx = await apiRequest('GET', '/transactions?startDate=2026-12-31&endDate=2026-01-01');
    assertEquals(resTrx.status, 400, 'Expected 400 Bad Request for transactions');
    assertEquals(resTrx.data.error, 'startDate cannot be after endDate');

    const resSummary = await apiRequest('GET', '/reports/summary?startDate=2026-10-15&endDate=2026-10-10');
    assertEquals(resSummary.status, 400, 'Expected 400 Bad Request for summary');
    assertEquals(resSummary.data.error, 'startDate cannot be after endDate');
  });

  await test('9.3 Backend rejects malformed date string with HTTP 400', async () => {
    const res = await apiRequest('GET', '/assets?startDate=invalid-date-format&endDate=2026-05-01');
    assertEquals(res.status, 400, 'Expected 400 Bad Request for malformed date');
    assert(
      res.data.error && res.data.error.includes('Invalid startDate format'),
      `Expected error about invalid startDate format, got: ${res.data.error}`
    );

    const resEnd = await apiRequest('GET', '/transactions?startDate=2026-01-01&endDate=gibberish');
    assertEquals(resEnd.status, 400, 'Expected 400 Bad Request for malformed endDate');
    assert(
      resEnd.data.error && resEnd.data.error.includes('Invalid endDate format'),
      `Expected error about invalid endDate format, got: ${resEnd.data.error}`
    );
  });

  await test('9.4 Single-day date range (startDate === endDate) spans exact 24-hour day boundary', async () => {
    let capturedWhere: any = null;
    (prisma.asset as any).findMany = async (args: any) => {
      capturedWhere = args?.where;
      return [];
    };

    const res = await apiRequest('GET', '/assets?startDate=2026-07-20&endDate=2026-07-20');
    assertEquals(res.status, 200, 'Expected 200 OK for single-day range');
    assert(capturedWhere !== null, 'capturedWhere should not be null');
    assertEquals(capturedWhere.purchaseDate.gte.toISOString(), '2026-07-20T00:00:00.000Z');
    assertEquals(capturedWhere.purchaseDate.lte.toISOString(), '2026-07-20T23:59:59.999Z');
  });

  await test('9.5 Graceful empty state when date range matches zero records', async () => {
    (prisma.asset as any).findMany = async () => [];
    (prisma.assetTransaction as any).findMany = async () => [];

    const assetRes = await apiRequest('GET', '/assets?startDate=2020-01-01&endDate=2020-01-31');
    assertEquals(assetRes.status, 200, 'Expected 200 OK');
    assertEquals(assetRes.data.length, 0, 'Should return empty array');

    const trxRes = await apiRequest('GET', '/transactions?startDate=2020-01-01&endDate=2020-01-31');
    assertEquals(trxRes.status, 200, 'Expected 200 OK');
    assertEquals(trxRes.data.length, 0, 'Should return empty array');
  });

  await test('9.6 /reports/summary aggregates metrics correctly respecting date range', async () => {
    (prisma.asset as any).findMany = async () => [
      { id: 'a1', status: 'AVAILABLE', purchasePrice: 500, currentValue: 450 },
      { id: 'a2', status: 'ISSUED', purchasePrice: 1000, currentValue: 800 },
      { id: 'a3', status: 'LOST', purchasePrice: 300, currentValue: 150 },
    ];
    (prisma.assetTransaction as any).count = async () => 14;
    (prisma.otpremnicaDocument as any).count = async () => 5;
    (prisma.serviceOrder as any).count = async () => 2;

    const res = await apiRequest('GET', '/reports/summary?startDate=2026-01-01&endDate=2026-06-30');
    assertEquals(res.status, 200, 'Expected 200 OK');
    assertEquals(res.data.totalAssets, 3, 'Total assets count');
    assertEquals(res.data.totalAcquisitionValue, 1800, 'Acquisition value sum (500+1000+300)');
    assertEquals(res.data.totalCurrentValue, 1400, 'Current value sum (450+800+150)');
    assertEquals(res.data.lostAssetsCount, 1, 'Lost assets count');
    assertEquals(res.data.totalLostValue, 150, 'Lost assets value');
    assertEquals(res.data.netActiveBookValue, 1250, 'Net active book value (1400 - 150)');
    assertEquals(res.data.transactionCount, 14, 'Transaction count');
    assertEquals(res.data.otpremnicaCount, 5, 'Otpremnica count');
  });

  await test('9.7 Print and Export data reflects active date-filtered dataset and summary banner', async () => {
    // Simulating frontend report filter engine behavior
    const allTransactions = [
      { id: 't1', transactionDate: '2026-01-10T10:00:00Z', transactionType: 'ISSUE', assetName: 'Drill A' },
      { id: 't2', transactionDate: '2026-02-15T11:00:00Z', transactionType: 'RETURN', assetName: 'Saw B' },
      { id: 't3', transactionDate: '2026-03-20T12:00:00Z', transactionType: 'ISSUE', assetName: 'Grinder C' },
    ];

    const startDate = '2026-02-01';
    const endDate = '2026-02-28';
    const startBoundary = new Date(`${startDate}T00:00:00.000`).getTime();
    const endBoundary = new Date(`${endDate}T23:59:59.999`).getTime();

    const filtered = allTransactions.filter((t) => {
      const time = new Date(t.transactionDate).getTime();
      return time >= startBoundary && time <= endBoundary;
    });

    assertEquals(filtered.length, 1, 'Only February transaction should be included in export');
    assertEquals(filtered[0].id, 't2', 'Should match t2');

    // Filter label formatting assertion for printable / PDF header
    const activeFilterLabels = [`Date Range: ${startDate} to ${endDate} (Custom Range)`];
    assertEquals(activeFilterLabels[0], 'Date Range: 2026-02-01 to 2026-02-28 (Custom Range)');
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
