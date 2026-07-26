// System-wide TypeScript Interfaces

export type UserRole = 'ADMIN' | 'WAREHOUSE_MANAGER' | 'WAREHOUSE_EMPLOYEE' | 'POWER_USER';

export type AssetStatus = 
  | 'AVAILABLE' 
  | 'ISSUED' 
  | 'IN_SERVICE' 
  | 'IN_CALIBRATION' 
  | 'RETIRED' 
  | 'DAMAGED' 
  | 'LOST';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED';

export type ServiceStatus = 'PENDING' | 'SENT' | 'IN_REPAIR' | 'COMPLETED' | 'CANCELLED';

export type CalibrationResult = 'PASS' | 'FAIL' | 'CONDITIONAL';

export type TransactionType = 
  | 'ISSUE' 
  | 'RETURN' 
  | 'TRANSFER' 
  | 'MAINTENANCE_SEND' 
  | 'MAINTENANCE_RETURN' 
  | 'CALIBRATION_SEND' 
  | 'CALIBRATION_RETURN' 
  | 'RETIREMENT' 
  | 'INVENTORY_CHECK';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface Asset {
  id: string;
  assetNumber: string;
  qrCode: string;
  barcode?: string;
  name: string;
  description?: string;
  category: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  location: string;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
  depreciationRate: number; // e.g. 5, 10
  supplierId?: string;
  supplierName?: string;
  holderEmployeeId?: string;
  holderEmployeeName?: string;
  lastServiceDate?: string;
  nextCalibrationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  status: EmployeeStatus;
  hireDate: string;
  terminationDate?: string;
  assignedAssetCount?: number;
}

export interface AssetTransaction {
  id: string;
  assetId: string;
  assetName: string;
  assetNumber: string;
  employeeId?: string;
  employeeName?: string;
  transactionType: TransactionType;
  transactionDate: string;
  returnDate?: string;
  performedById: string;
  performedByName: string;
  notes?: string;
  projectId?: string;
  projectName?: string;
  conditionOnReturn?: string;
}

export interface ToolBox {
  id: string;
  boxNumber: string;
  name: string;
  employeeId?: string;
  employeeName?: string;
  status: 'ASSIGNED' | 'UNASSIGNED' | 'INSPECTION_DUE';
  assignedDate?: string;
  items: Asset[];
  lastInspectedDate?: string;
}

export interface ServiceOrder {
  id: string;
  assetId: string;
  assetName: string;
  assetNumber: string;
  supplierId?: string;
  supplierName?: string;
  problemDescription: string;
  sentDate: string;
  receivedDate?: string;
  repairCost: number;
  replacedParts?: string;
  status: ServiceStatus;
  reportedBy?: string;
}

export interface CalibrationRecord {
  id: string;
  assetId: string;
  assetName: string;
  assetNumber: string;
  providerId?: string;
  providerName: string;
  calibrationDate: string;
  nextCalibrationDate: string;
  certificateNumber: string;
  result: CalibrationResult;
  documentUrl?: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  services?: string;
  activeAssetCount?: number;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  client: string;
  department: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  startDate: string;
  endDate?: string;
  location?: string;
  assignedAssetCount?: number;
}

export interface InventoryCheck {
  id: string;
  checkNumber: string;
  title: string;
  performedById: string;
  performedByName: string;
  checkDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'REVIEW_NEEDED';
  totalAssets: number;
  verifiedAssets: number;
  missingAssets: number;
  damagedAssets: number;
  notes?: string;
}

export interface InventoryCheckItem {
  id: string;
  inventoryCheckId: string;
  assetId: string;
  assetName: string;
  assetNumber: string;
  verified: boolean;
  condition: 'GOOD' | 'DAMAGED' | 'MISSING';
  notes?: string;
  scannedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'CALIBRATION' | 'SERVICE' | 'OVERDUE' | 'AUDIT';
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  entity: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  createdAt: string;
}
