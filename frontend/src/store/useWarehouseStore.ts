import { create } from 'zustand';
import {
  Asset, Employee, Supplier, Project, ToolBox, ServiceOrder,
  CalibrationRecord, User, AppNotification, AuditLog, InventoryCheck,
  AssetTransaction, UserRole, AssetStatus
} from '../types';
import { calculateCurrentAssetValue } from '../utils/depreciation';
import { apiFetch } from '../lib/apiClient';

const STUB_USER: User = {
  id: '',
  email: '',
  firstName: 'User',
  lastName: '',
  role: 'WAREHOUSE_MANAGER',
  active: true,
  createdAt: new Date().toISOString(),
};

interface WarehouseStore {
  // Current session state
  currentUser: User;
  activeRole: UserRole;
  activeModule: string;
  globalSearch: string;
  selectedAssetFor360: Asset | null;
  selectedAssetForQRLabel: Asset | null;

  // Entities state
  users: User[];
  employees: Employee[];
  suppliers: Supplier[];
  projects: Project[];
  assets: Asset[];
  toolBoxes: ToolBox[];
  serviceOrders: ServiceOrder[];
  calibrations: CalibrationRecord[];
  transactions: AssetTransaction[];
  inventoryChecks: InventoryCheck[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];

  // Actions
  fetchInitialData: () => Promise<void>;
  setActiveModule: (module: string) => void;
  setGlobalSearch: (query: string) => void;
  setActiveRole: (role: UserRole) => void;
  setSelectedAssetFor360: (asset: Asset | null) => void;
  setSelectedAssetForQRLabel: (asset: Asset | null) => void;

  // Asset Actions
  addAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => Promise<void>;
  updateAsset: (id: string, asset: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  // Issuing & Return Actions
  issueAssets: (assetIds: string[], employeeId: string, projectId?: string, expectedReturnDate?: string, notes?: string) => Promise<void>;
  returnAsset: (assetId: string, condition: string, notes?: string) => Promise<void>;

  // Maintenance Actions
  createServiceOrder: (assetId: string, supplierId: string, problemDescription: string) => Promise<void>;
  completeServiceOrder: (serviceOrderId: string, repairCost: number, replacedParts: string) => Promise<void>;

  // Calibration Actions
  addCalibrationRecord: (record: Omit<CalibrationRecord, 'id'>) => Promise<void>;
  sendToolToCalibration: (assetId: string) => Promise<void>;

  // Employee Actions
  addEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;

  // ToolBox Actions
  createToolBox: (boxNumber: string, name: string, assetIds: string[], employeeId?: string) => Promise<void>;

  // Supplier Actions
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;

  // Project Actions
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;

  // Inventory Audit Actions
  createInventoryCheck: (title: string) => Promise<void>;
  verifyInventoryItem: (checkId: string, assetId: string, condition: 'GOOD' | 'DAMAGED' | 'MISSING', notes?: string) => Promise<void>;
  completeInventoryCheck: (checkId: string) => Promise<void>;

  // Notification & Audit
  markNotificationAsRead: (id: string) => Promise<void>;
  addAuditLog: (entity: string, entityId: string, action: string, newValues?: any, oldValues?: any) => Promise<void>;
}

export const useWarehouseStore = create<WarehouseStore>((set, get) => ({
  currentUser: STUB_USER,
  activeRole: 'WAREHOUSE_MANAGER',
  activeModule: 'dashboard',
  globalSearch: '',
  selectedAssetFor360: null,
  selectedAssetForQRLabel: null,

  users: [],
  employees: [],
  suppliers: [],
  projects: [],
  assets: [],
  toolBoxes: [],
  serviceOrders: [],
  calibrations: [],
  transactions: [],
  inventoryChecks: [],
  notifications: [],
  auditLogs: [],

  fetchInitialData: async () => {
    try {
      const data = await apiFetch<any>('/initial-data');
      set({
        users: data.users || [],
        employees: data.employees || [],
        suppliers: data.suppliers || [],
        projects: data.projects || [],
        assets: data.assets || [],
        toolBoxes: data.toolBoxes || [],
        serviceOrders: data.serviceOrders || [],
        calibrations: data.calibrations || [],
        transactions: data.transactions || [],
        inventoryChecks: data.inventoryChecks || [],
        notifications: data.notifications || [],
        auditLogs: data.auditLogs || [],
        currentUser: data.users && data.users.length > 0 ? data.users[0] : STUB_USER,
      });
    } catch (error) {
      console.warn('Initial data load from backend API failed. Ensure backend server is running on port 5000.', error);
    }
  },

  setActiveModule: (module) => set({ activeModule: module }),
  setGlobalSearch: (query) => set({ globalSearch: query }),

  setActiveRole: (role) => {
    const user = get().users.find((u) => u.role === role) || {
      ...get().currentUser,
      role,
    };
    set({ activeRole: role, currentUser: user });
  },

  setSelectedAssetFor360: (asset) => set({ selectedAssetFor360: asset }),
  setSelectedAssetForQRLabel: (asset) => set({ selectedAssetForQRLabel: asset }),

  addAuditLog: async (entity, entityId, action, newValues, oldValues) => {
    const user = get().currentUser;
    try {
      const newLog = await apiFetch<AuditLog>('/audit-logs', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          entity,
          entityId,
          action,
          newValues,
          oldValues,
        }),
      });
      set((state) => ({ auditLogs: [newLog, ...state.auditLogs] }));
    } catch (err) {
      const fallbackLog: AuditLog = {
        id: `log-${Date.now()}`,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        userRole: user.role,
        entity,
        entityId,
        action,
        newValues,
        oldValues,
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ auditLogs: [fallbackLog, ...state.auditLogs] }));
    }
  },

  addAsset: async (assetData) => {
    const currentValue = calculateCurrentAssetValue(
      assetData.purchasePrice,
      assetData.purchaseDate,
      assetData.depreciationRate || 5
    );

    try {
      const createdAsset = await apiFetch<any>('/assets', {
        method: 'POST',
        body: JSON.stringify({ ...assetData, currentValue }),
      });
      set((state) => ({ assets: [createdAsset, ...state.assets] }));
      get().addAuditLog('Asset', createdAsset.id, 'CREATE_ASSET', { name: createdAsset.name });
    } catch (err) {
      console.error('Error in addAsset:', err);
    }
  },

  updateAsset: async (id, partialAsset) => {
    try {
      const updatedAsset = await apiFetch<any>(`/assets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(partialAsset),
      });

      set((state) => ({
        assets: state.assets.map((ast) => (ast.id === id ? { ...ast, ...updatedAsset } : ast)),
      }));
      get().addAuditLog('Asset', id, 'UPDATE_ASSET', partialAsset);
    } catch (err) {
      console.error('Error updating asset:', err);
    }
  },

  deleteAsset: async (id) => {
    try {
      await apiFetch(`/assets/${id}`, { method: 'DELETE' });
      set((state) => ({
        assets: state.assets.filter((ast) => ast.id !== id),
      }));
      get().addAuditLog('Asset', id, 'RETIRE_ASSET', { id });
    } catch (err) {
      console.error('Error deleting asset:', err);
    }
  },

  issueAssets: async (assetIds, employeeId, projectId, expectedReturnDate, notes) => {
    try {
      await apiFetch('/transactions/issue', {
        method: 'POST',
        body: JSON.stringify({
          assetIds,
          employeeId,
          projectId,
          expectedReturnDate,
          notes,
          performedById: get().currentUser.id,
        }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error issuing assets:', err);
    }
  },

  returnAsset: async (assetId, condition, notes) => {
    try {
      await apiFetch('/transactions/return', {
        method: 'POST',
        body: JSON.stringify({
          assetId,
          condition,
          notes,
          performedById: get().currentUser.id,
        }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error returning asset:', err);
    }
  },

  createServiceOrder: async (assetId, supplierId, problemDescription) => {
    try {
      await apiFetch('/service-orders', {
        method: 'POST',
        body: JSON.stringify({ assetId, supplierId, problemDescription }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error creating service order:', err);
    }
  },

  completeServiceOrder: async (serviceOrderId, repairCost, replacedParts) => {
    try {
      await apiFetch(`/service-orders/${serviceOrderId}/complete`, {
        method: 'PUT',
        body: JSON.stringify({ repairCost, replacedParts }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error completing service order:', err);
    }
  },

  addCalibrationRecord: async (recordData) => {
    try {
      await apiFetch('/calibrations', {
        method: 'POST',
        body: JSON.stringify(recordData),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error adding calibration record:', err);
    }
  },

  sendToolToCalibration: async (assetId) => {
    try {
      await apiFetch('/calibrations/send-to-lab', {
        method: 'POST',
        body: JSON.stringify({ assetId }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error sending tool to calibration:', err);
    }
  },

  addEmployee: async (employeeData) => {
    try {
      const created = await apiFetch<Employee>('/employees', {
        method: 'POST',
        body: JSON.stringify(employeeData),
      });
      set((state) => ({ employees: [...state.employees, created] }));
    } catch (err) {
      console.error('Error adding employee:', err);
    }
  },

  updateEmployee: async (id, partialEmp) => {
    try {
      const updated = await apiFetch<Employee>(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(partialEmp),
      });
      set((state) => ({
        employees: state.employees.map((e) => (e.id === id ? { ...e, ...updated } : e)),
      }));
    } catch (err) {
      console.error('Error updating employee:', err);
    }
  },

  createToolBox: async (boxNumber, name, assetIds, employeeId) => {
    try {
      await apiFetch('/toolboxes', {
        method: 'POST',
        body: JSON.stringify({ boxNumber, name, assetIds, employeeId }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error creating toolbox:', err);
    }
  },

  addSupplier: async (supplierData) => {
    try {
      const created = await apiFetch<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(supplierData),
      });
      set((state) => ({ suppliers: [...state.suppliers, created] }));
    } catch (err) {
      console.error('Error adding supplier:', err);
    }
  },

  addProject: async (projectData) => {
    try {
      const created = await apiFetch<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      });
      set((state) => ({ projects: [...state.projects, created] }));
    } catch (err) {
      console.error('Error adding project:', err);
    }
  },

  createInventoryCheck: async (title) => {
    try {
      await apiFetch('/inventory-checks', {
        method: 'POST',
        body: JSON.stringify({ title, performedById: get().currentUser.id }),
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error creating inventory check:', err);
    }
  },

  verifyInventoryItem: async (checkId, assetId, condition, notes) => {
    try {
      await apiFetch(`/inventory-checks/${checkId}/verify`, {
        method: 'POST',
        body: JSON.stringify({ assetId, condition, notes }),
      });
    } catch (err) {
      console.error('Error verifying inventory item:', err);
    }
  },

  completeInventoryCheck: async (checkId) => {
    try {
      await apiFetch(`/inventory-checks/${checkId}/complete`, {
        method: 'PUT',
      });
      await get().fetchInitialData();
    } catch (err) {
      console.error('Error completing inventory check:', err);
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      }));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  },
}));
