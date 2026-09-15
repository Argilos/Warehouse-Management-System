import * as XLSX from 'xlsx';
import { Asset, AssetStatus } from '../types';

export interface RawImportRow {
  name?: string;
  assetNumber?: string;
  serialNumber?: string;
  category?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  purchaseDate?: string;
  purchasePrice?: number | string;
  description?: string;
  barcode?: string;
  currentValue?: number | string;
  depreciationRate?: number | string;
  status?: string;
  supplierId?: string;
  // Any other columns that might be present
  [key: string]: any;
}

export type ValidationStatus = 'VALID' | 'WARNING' | 'ERROR';

export interface ValidatedImportRow {
  rowNumber: number;
  status: ValidationStatus;
  messages: string[];
  data: {
    name: string;
    assetNumber: string;
    serialNumber: string;
    category: string;
    manufacturer: string;
    model: string;
    location: string;
    purchaseDate: string;
    purchasePrice: number;
    description?: string;
    barcode?: string;
    currentValue?: number;
    depreciationRate: number;
    status: AssetStatus;
    supplierId?: string;
  };
  original: RawImportRow;
}

export const VALID_IMPORT_STATUSES: AssetStatus[] = [
  'AVAILABLE',
  'DAMAGED',
  'IN_SERVICE',
  'IN_CALIBRATION',
  'RETIRED',
];

export const CATEGORY_OPTIONS = [
  'Power Tools',
  'Hand Tools',
  'Measuring Equipment',
  'Heavy Machinery',
  'Safety Gear',
  'Welding Equipment',
  'Electrical',
  'Hydraulics',
  'Office & IT',
  'Other',
];

/**
 * Normalizes Excel date input which can be an Excel serial number, Date object, or date string.
 */
export function normalizeExcelDate(val: any): string | null {
  if (!val) return null;

  if (typeof val === 'number') {
    // Excel epoch starts 1899-12-30 (due to 1900 leap year bug in Lotus/Excel)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = excelEpoch.getTime() + val * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }

  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  const str = String(val).trim();
  // Check for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00Z');
    if (!isNaN(d.getTime())) return str;
  }

  // Check for DD.MM.YYYY or DD/MM/YYYY
  const partsDmy = str.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (partsDmy) {
    const day = partsDmy[1].padStart(2, '0');
    const month = partsDmy[2].padStart(2, '0');
    const year = partsDmy[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback try Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Downloads the standardized multi-sheet Excel template for asset bulk import.
 * Explicitly does NOT include any QR code column, and includes an instructions sheet.
 */
export function downloadAssetExcelTemplate(): void {
  const sampleData = [
    {
      'Asset Name *': 'Bosch Professional Cordless Drill GSR 18V',
      'Asset Number *': 'AST-1001',
      'Serial Number *': 'SN-BSH-88219',
      'Category *': 'Power Tools',
      'Manufacturer *': 'Bosch',
      'Model *': 'GSR 18V-55',
      'Location *': 'Warehouse Rack A-01',
      'Purchase Date * (YYYY-MM-DD)': '2025-01-15',
      'Purchase Price *': 189.99,
      'Description': '18V Brushless heavy-duty drill driver with 2x 4.0Ah batteries',
      'Barcode': '3165140952873',
      'Current Value': 189.99,
      'Depreciation Rate (%)': 10,
      'Status': 'AVAILABLE',
      'Supplier ID': '',
    },
    {
      'Asset Name *': 'Fluke 87V Industrial Multimeter',
      'Asset Number *': 'AST-1002',
      'Serial Number *': 'SN-FLK-44201',
      'Category *': 'Measuring Equipment',
      'Manufacturer *': 'Fluke',
      'Model *': '87V MAX',
      'Location *': 'Calibration Lab Shelf B',
      'Purchase Date * (YYYY-MM-DD)': '2024-06-20',
      'Purchase Price *': 495.50,
      'Description': 'True-rms industrial digital multimeter with temperature probe',
      'Barcode': '0095969098732',
      'Current Value': 445.95,
      'Depreciation Rate (%)': 5,
      'Status': 'AVAILABLE',
      'Supplier ID': '',
    },
    {
      'Asset Name *': 'Hilti Rotary Hammer TE 30-AVR',
      'Asset Number *': 'AST-1003',
      'Serial Number *': 'SN-HLT-99381',
      'Category *': 'Power Tools',
      'Manufacturer *': 'Hilti',
      'Model *': 'TE 30-AVR 230V',
      'Location *': 'Warehouse Rack C-04',
      'Purchase Date * (YYYY-MM-DD)': '2023-11-10',
      'Purchase Price *': 680.00,
      'Description': 'SDS Plus combihammer for drilling and light chiseling in concrete',
      'Barcode': '',
      'Current Value': 578.00,
      'Depreciation Rate (%)': 10,
      'Status': 'IN_SERVICE',
      'Supplier ID': '',
    },
  ];

  const instructions = [
    {
      'Field Name': 'Asset Name *',
      'Required?': 'YES',
      'Format / Type': 'Text (up to 150 chars)',
      'Description & Rules': 'Descriptive title of the tool or equipment.',
    },
    {
      'Field Name': 'Asset Number *',
      'Required?': 'YES',
      'Format / Type': 'Text / Unique identifier',
      'Description & Rules': 'Must be unique across the entire inventory (e.g. AST-1001). Used for tracking and QR linking.',
    },
    {
      'Field Name': 'Serial Number *',
      'Required?': 'YES',
      'Format / Type': 'Text / Unique',
      'Description & Rules': 'Manufacturer serial number stamped on the equipment. Must be unique.',
    },
    {
      'Field Name': 'Category *',
      'Required?': 'YES',
      'Format / Type': 'Text (Suggested categories)',
      'Description & Rules': 'Power Tools, Hand Tools, Measuring Equipment, Heavy Machinery, Safety Gear, Welding Equipment, Electrical, Hydraulics, Office & IT, Other',
    },
    {
      'Field Name': 'Manufacturer *',
      'Required?': 'YES',
      'Format / Type': 'Text',
      'Description & Rules': 'Brand or manufacturer (e.g., Bosch, DeWalt, Fluke, Makita, Hilti).',
    },
    {
      'Field Name': 'Model *',
      'Required?': 'YES',
      'Format / Type': 'Text',
      'Description & Rules': 'Specific model number or name (e.g., GSR 18V-55, DCD996).',
    },
    {
      'Field Name': 'Location *',
      'Required?': 'YES',
      'Format / Type': 'Text',
      'Description & Rules': 'Physical shelf, rack, or room (e.g. Rack A-01, Calibration Lab, Tool Crib).',
    },
    {
      'Field Name': 'Purchase Date *',
      'Required?': 'YES',
      'Format / Type': 'YYYY-MM-DD or Excel Date',
      'Description & Rules': 'Date the asset was acquired. Example: 2025-01-15.',
    },
    {
      'Field Name': 'Purchase Price *',
      'Required?': 'YES',
      'Format / Type': 'Decimal Number (> 0)',
      'Description & Rules': 'Original cost in your default currency (e.g. 189.99). Do not include currency symbols.',
    },
    {
      'Field Name': 'Description',
      'Required?': 'NO',
      'Format / Type': 'Text',
      'Description & Rules': 'Technical specs, included accessories, or condition notes.',
    },
    {
      'Field Name': 'Barcode',
      'Required?': 'NO',
      'Format / Type': 'Text / EAN / UPC',
      'Description & Rules': 'Optional external manufacturer or retail barcode.',
    },
    {
      'Field Name': 'Current Value',
      'Required?': 'NO',
      'Format / Type': 'Decimal Number',
      'Description & Rules': 'Book value. If left blank, defaults to Purchase Price.',
    },
    {
      'Field Name': 'Depreciation Rate (%)',
      'Required?': 'NO',
      'Format / Type': 'Decimal Number',
      'Description & Rules': 'Annual straight-line depreciation rate. Defaults to 5 (5% per year) if omitted.',
    },
    {
      'Field Name': 'Status',
      'Required?': 'NO',
      'Format / Type': 'Text (Preset Enum)',
      'Description & Rules': 'Valid values: AVAILABLE, DAMAGED, IN_SERVICE, IN_CALIBRATION, RETIRED. Defaults to AVAILABLE.',
    },
    {
      'Field Name': 'Supplier ID',
      'Required?': 'NO',
      'Format / Type': 'UUID or Text',
      'Description & Rules': 'Optional database ID of the vendor or supplier.',
    },
    {
      'Field Name': 'QR CODE (SYSTEM AUTOMATED)',
      'Required?': 'DO NOT INCLUDE',
      'Format / Type': 'AUTOMATIC',
      'Description & Rules': 'IMPORTANT: QR Codes are automatically generated by the Warehouse System upon import. Do NOT add a QR Code column; any QR column in uploaded files will be ignored.',
    },
  ];

  const wb = XLSX.utils.book_new();

  // 1. Template sheet
  const wsTemplate = XLSX.utils.json_to_sheet(sampleData);
  // Column widths
  wsTemplate['!cols'] = [
    { wch: 35 }, // Asset Name
    { wch: 16 }, // Asset Number
    { wch: 20 }, // Serial Number
    { wch: 22 }, // Category
    { wch: 18 }, // Manufacturer
    { wch: 20 }, // Model
    { wch: 25 }, // Location
    { wch: 28 }, // Purchase Date
    { wch: 18 }, // Purchase Price
    { wch: 45 }, // Description
    { wch: 18 }, // Barcode
    { wch: 16 }, // Current Value
    { wch: 22 }, // Depreciation Rate
    { wch: 16 }, // Status
    { wch: 20 }, // Supplier ID
  ];
  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Asset Inventory Template');

  // 2. Instructions sheet
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 30 },
    { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Valid Values');

  // Write and trigger browser download
  XLSX.writeFile(wb, 'Asset_Import_Template.xlsx');
}

/**
 * Normalizes header keys to standard property names.
 * Silently ignores any header matching QR code columns.
 */
function normalizeHeaderKey(rawHeader: string): string | null {
  const clean = rawHeader.toLowerCase().trim().replace(/[*_]/g, ' ').replace(/\s+/g, ' ');

  // Silently drop any QR-related header
  if (/^qr\b|^qr code|^qrcode/i.test(clean)) {
    return null;
  }

  if (/^asset\s*name/i.test(clean) || clean === 'name') return 'name';
  if (/^asset\s*num/i.test(clean) || clean === 'assetnumber' || clean === 'asset_num') return 'assetNumber';
  if (/^serial\s*num/i.test(clean) || clean === 'serialnumber' || clean === 'serial_num' || clean === 'sn') return 'serialNumber';
  if (/^cat/i.test(clean)) return 'category';
  if (/^manuf/i.test(clean) || clean === 'brand' || clean === 'make') return 'manufacturer';
  if (/^model/i.test(clean)) return 'model';
  if (/^loc/i.test(clean) || clean === 'shelf' || clean === 'storage') return 'location';
  if (/^purchase\s*date/i.test(clean) || clean === 'bought_date' || clean === 'acquisition_date') return 'purchaseDate';
  if (/^purchase\s*price/i.test(clean) || clean === 'price' || clean === 'cost') return 'purchasePrice';
  if (/^desc/i.test(clean) || clean === 'notes') return 'description';
  if (/^bar/i.test(clean) || clean === 'ean' || clean === 'upc') return 'barcode';
  if (/^current\s*val/i.test(clean) || clean === 'book_value') return 'currentValue';
  if (/^deprec/i.test(clean)) return 'depreciationRate';
  if (/^stat/i.test(clean) || clean === 'condition') return 'status';
  if (/^supp/i.test(clean) || clean === 'vendor') return 'supplierId';

  return clean;
}

/**
 * Parses an uploaded Excel or CSV file buffer into raw objects.
 * Silently ignores any column matching QR code.
 */
export async function parseAssetExcelFile(file: File): Promise<RawImportRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('Workbook contains no sheets.');
  }

  const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  return rawJson.map((row) => {
    const normalizedRow: RawImportRow = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeHeaderKey(key);
      if (normalizedKey) {
        normalizedRow[normalizedKey] = value;
      }
    }
    return normalizedRow;
  });
}

/**
 * Validates parsed asset rows against business rules:
 * - Checks required fields
 * - Validates date format & number ranges
 * - Validates status (AVAILABLE, DAMAGED, IN_SERVICE, IN_CALIBRATION, RETIRED)
 * - Identifies in-file duplicate asset numbers and serial numbers
 * - Compares with existing assets in database
 */
export function validateAssetRows(
  rows: RawImportRow[],
  existingAssets: Asset[],
  updateDuplicates: boolean = false
): ValidatedImportRow[] {
  const existingAssetNumMap = new Map<string, Asset>();
  const existingSerialMap = new Map<string, Asset>();

  existingAssets.forEach((a) => {
    if (a.assetNumber) existingAssetNumMap.set(a.assetNumber.trim().toUpperCase(), a);
    if (a.serialNumber) existingSerialMap.set(a.serialNumber.trim().toUpperCase(), a);
  });

  const fileAssetNums = new Set<string>();
  const fileSerialNums = new Set<string>();

  return rows.map((raw, index) => {
    const rowNum = index + 2; // Accounting for 1-based header row
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract & trim fields
    const name = String(raw.name || '').trim();
    const assetNumber = String(raw.assetNumber || '').trim();
    const serialNumber = String(raw.serialNumber || '').trim();
    const category = String(raw.category || '').trim();
    const manufacturer = String(raw.manufacturer || '').trim();
    const model = String(raw.model || '').trim();
    const location = String(raw.location || '').trim();
    const description = raw.description ? String(raw.description).trim() : undefined;
    const barcode = raw.barcode ? String(raw.barcode).trim() : undefined;
    const supplierId = raw.supplierId ? String(raw.supplierId).trim() : undefined;

    // Required checks
    if (!name) errors.push('Asset Name is required');
    if (!assetNumber) errors.push('Asset Number is required');
    if (!serialNumber) errors.push('Serial Number is required');
    if (!category) errors.push('Category is required');
    if (!manufacturer) errors.push('Manufacturer is required');
    if (!model) errors.push('Model is required');
    if (!location) errors.push('Location is required');

    // Date validation
    const rawPurchaseDate = raw.purchaseDate;
    let normalizedDate = normalizeExcelDate(rawPurchaseDate);
    if (!rawPurchaseDate) {
      errors.push('Purchase Date is required');
      normalizedDate = new Date().toISOString().slice(0, 10);
    } else if (!normalizedDate) {
      errors.push(`Invalid Purchase Date format: "${rawPurchaseDate}". Expected YYYY-MM-DD`);
      normalizedDate = new Date().toISOString().slice(0, 10);
    }

    // Number validations
    let purchasePrice = 0;
    if (raw.purchasePrice === undefined || raw.purchasePrice === '') {
      errors.push('Purchase Price is required');
    } else {
      purchasePrice = Number(String(raw.purchasePrice).replace(/[^0-9.-]+/g, ''));
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        errors.push('Purchase Price must be a non-negative number');
      }
    }

    let currentValue: number | undefined;
    if (raw.currentValue !== undefined && raw.currentValue !== '') {
      currentValue = Number(String(raw.currentValue).replace(/[^0-9.-]+/g, ''));
      if (isNaN(currentValue) || currentValue < 0) {
        errors.push('Current Value must be a non-negative number');
      }
    } else {
      currentValue = purchasePrice;
    }

    let depreciationRate = 5;
    if (raw.depreciationRate !== undefined && raw.depreciationRate !== '') {
      depreciationRate = Number(String(raw.depreciationRate).replace(/[^0-9.-]+/g, ''));
      if (isNaN(depreciationRate) || depreciationRate < 0 || depreciationRate > 100) {
        errors.push('Depreciation Rate must be a percentage between 0 and 100');
      }
    }

    // Status validation
    let status: AssetStatus = 'AVAILABLE';
    if (raw.status && String(raw.status).trim()) {
      const normalizedStatus = String(raw.status).trim().toUpperCase().replace(/[\s-]+/g, '_') as AssetStatus;
      if (VALID_IMPORT_STATUSES.includes(normalizedStatus)) {
        status = normalizedStatus;
      } else {
        errors.push(`Invalid status "${raw.status}". Permitted: ${VALID_IMPORT_STATUSES.join(', ')}`);
      }
    }

    // In-file duplicate checking
    const upperAssetNum = assetNumber.toUpperCase();
    const upperSerialNum = serialNumber.toUpperCase();

    if (upperAssetNum) {
      if (fileAssetNums.has(upperAssetNum)) {
        errors.push(`Duplicate Asset Number "${assetNumber}" found multiple times within this file`);
      } else {
        fileAssetNums.add(upperAssetNum);
      }
    }

    if (upperSerialNum) {
      if (fileSerialNums.has(upperSerialNum)) {
        errors.push(`Duplicate Serial Number "${serialNumber}" found multiple times within this file`);
      } else {
        fileSerialNums.add(upperSerialNum);
      }
    }

    // Database duplicate check
    if (upperAssetNum && existingAssetNumMap.has(upperAssetNum)) {
      if (updateDuplicates) {
        warnings.push(`Asset Number "${assetNumber}" already exists: will UPDATE existing record`);
      } else {
        errors.push(`Asset Number "${assetNumber}" already exists in the system (Duplicate)`);
      }
    }

    if (upperSerialNum && existingSerialMap.has(upperSerialNum) && !updateDuplicates) {
      errors.push(`Serial Number "${serialNumber}" already exists in the system`);
    }

    let validationStatus: ValidationStatus = 'VALID';
    if (errors.length > 0) {
      validationStatus = 'ERROR';
    } else if (warnings.length > 0) {
      validationStatus = 'WARNING';
    }

    return {
      rowNumber: rowNum,
      status: validationStatus,
      messages: errors.length > 0 ? errors : warnings,
      data: {
        name,
        assetNumber,
        serialNumber,
        category,
        manufacturer,
        model,
        location,
        purchaseDate: normalizedDate,
        purchasePrice,
        description,
        barcode,
        currentValue,
        depreciationRate,
        status,
        supplierId,
      },
      original: raw,
    };
  });
}

/**
 * Exports failed rows into an Excel file with an added "Validation Errors" column.
 */
export function exportFailedRowsToExcel(failedRows: ValidatedImportRow[]): void {
  const exportData = failedRows.map((row) => ({
    'Row #': row.rowNumber,
    'Validation Errors': row.messages.join('; '),
    ...row.original,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, 'Failed Import Rows');
  XLSX.writeFile(wb, `Import_Errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
