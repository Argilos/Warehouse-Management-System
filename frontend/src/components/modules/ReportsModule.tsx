import React, { useState, useMemo } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { formatCurrency } from '../../utils/depreciation';
import { exportToCSV } from '../../utils/exportUtils';
import { exportReportPDF, exportOtpremnicaPDF } from '../../utils/pdfReportGenerator';
import { ReportCategoryPreset, ReportFilterCriteria, OtpremnicaDocument } from '../../types';
import { OtpremnicaModal } from './OtpremnicaModal';
import {
  FileText, Download, Printer, Filter, RotateCcw, Search,
  Calendar, User, FolderKanban, Tag, ShieldAlert, CheckCircle2,
  Wrench, Gauge, PackageCheck, Layers, FileSpreadsheet, Eye, Sparkles,
  ChevronDown, ChevronRight, Box
} from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const {
    assets, employees, projects, suppliers, toolBoxes, serviceOrders,
    calibrations, transactions, inventoryChecks, otpremnicaDocuments,
    activeRole, addAuditLog
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [activePreset, setActivePreset] = useState<ReportCategoryPreset>('ALL_ASSETS');

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');
  const [selectedManufacturer, setSelectedManufacturer] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedTransactionType, setSelectedTransactionType] = useState('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Otpremnica for modal viewing
  const [selectedOtpremnica, setSelectedOtpremnica] = useState<OtpremnicaDocument | null>(null);
  const [isOtpremnicaOpen, setIsOtpremnicaOpen] = useState(false);
  const [expandedDocIds, setExpandedDocIds] = useState<Set<string>>(new Set());

  const toggleDocExpanded = (docId: string) => {
    setExpandedDocIds(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Helper to format Date into YYYY-MM-DD input string
  const formatDateInput = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to compute preset dates
  const getPresetDates = (preset: string): { start: string; end: string } => {
    const now = new Date();
    switch (preset) {
      case 'TODAY': {
        const dStr = formatDateInput(now);
        return { start: dStr, end: dStr };
      }
      case 'LAST_7_DAYS': {
        const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
        return { start: formatDateInput(past), end: formatDateInput(now) };
      }
      case 'LAST_30_DAYS': {
        const past = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
        return { start: formatDateInput(past), end: formatDateInput(now) };
      }
      case 'THIS_MONTH': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: formatDateInput(startOfMonth), end: formatDateInput(now) };
      }
      case 'LAST_MONTH': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: formatDateInput(startOfLastMonth), end: formatDateInput(endOfLastMonth) };
      }
      case 'THIS_YEAR': {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return { start: formatDateInput(startOfYear), end: formatDateInput(now) };
      }
      default:
        return { start: '', end: '' };
    }
  };

  // Helper to update URL search parameters without page reload
  const updateUrlDateRange = (preset: string, start: string, end: string) => {
    try {
      const url = new URL(window.location.href);
      if (preset && preset !== 'ALL') {
        url.searchParams.set('datePreset', preset);
      } else {
        url.searchParams.delete('datePreset');
      }

      if (start) {
        url.searchParams.set('startDate', start);
      } else {
        url.searchParams.delete('startDate');
      }

      if (end) {
        url.searchParams.set('endDate', end);
      } else {
        url.searchParams.delete('endDate');
      }

      window.history.replaceState({}, '', url.toString());
    } catch {
      // safe fallback if not in standard browser context
    }
  };

  // Synchronize state with URL search parameters (load on mount and on popstate back/forward)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPreset = params.get('datePreset') as any;
    const urlStart = params.get('startDate');
    const urlEnd = params.get('endDate');

    if (urlPreset) {
      setDateRangePreset(urlPreset);
      if (!urlStart && !urlEnd && urlPreset !== 'ALL' && urlPreset !== 'CUSTOM') {
        const computed = getPresetDates(urlPreset);
        setStartDate(computed.start);
        setEndDate(computed.end);
      }
    }
    if (urlStart) {
      setStartDate(urlStart);
    }
    if (urlEnd) {
      setEndDate(urlEnd);
    }

    const handlePopState = () => {
      const p = new URLSearchParams(window.location.search);
      const popPreset = (p.get('datePreset') as any) || 'ALL';
      const popStart = p.get('startDate') || '';
      const popEnd = p.get('endDate') || '';
      setDateRangePreset(popPreset);
      setStartDate(popStart);
      setEndDate(popEnd);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handlers for date range changes
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset as any);
    if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
      updateUrlDateRange('ALL', '', '');
    } else if (preset === 'CUSTOM') {
      updateUrlDateRange('CUSTOM', startDate, endDate);
    } else {
      const dates = getPresetDates(preset);
      setStartDate(dates.start);
      setEndDate(dates.end);
      updateUrlDateRange(preset, dates.start, dates.end);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setDateRangePreset('CUSTOM');
    updateUrlDateRange('CUSTOM', val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setDateRangePreset('CUSTOM');
    updateUrlDateRange('CUSTOM', startDate, val);
  };

  const isDateRangeInvalid = useMemo(() => {
    if (!startDate || !endDate) return false;
    return new Date(startDate).getTime() > new Date(endDate).getTime();
  }, [startDate, endDate]);

  // Categories & Manufacturers Options
  const categories = useMemo(() => Array.from(new Set(assets.map(a => a.category))), [assets]);
  const manufacturers = useMemo(() => Array.from(new Set(assets.map(a => a.manufacturer))), [assets]);
  const locations = useMemo(() => Array.from(new Set(assets.map(a => a.location))), [assets]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedEmployeeId('ALL');
    setSelectedProjectId('ALL');
    setSelectedSupplierId('ALL');
    setSelectedManufacturer('ALL');
    setSelectedLocation('ALL');
    setSelectedTransactionType('ALL');
    setDateRangePreset('ALL');
    setStartDate('');
    setEndDate('');
    updateUrlDateRange('ALL', '', '');
  };

  // Filter Computation Logic for Date Presets & Custom Range
  const checkDateInRange = (dateStr?: string | Date | null) => {
    if (!dateStr) return false;
    if (dateRangePreset === 'ALL' && !startDate && !endDate) return true;

    const itemDate = new Date(dateStr).getTime();
    if (isNaN(itemDate)) return true;

    if (startDate) {
      const startBoundary = new Date(`${startDate}T00:00:00.000`).getTime();
      if (itemDate < startBoundary) return false;
    }

    if (endDate) {
      const endBoundary = new Date(`${endDate}T23:59:59.999`).getTime();
      if (itemDate > endBoundary) return false;
    }

    return true;
  };

  // Map of employeeId -> Set of assetIds/assetNumbers from transaction history
  const employeeAssetMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    transactions.forEach((t) => {
      if (t.employeeId) {
        if (!map.has(t.employeeId)) {
          map.set(t.employeeId, new Set<string>());
        }
        const set = map.get(t.employeeId)!;
        if (t.assetId) set.add(t.assetId);
        if (t.assetNumber) set.add(t.assetNumber);
      }
    });
    return map;
  }, [transactions]);

  // Filtered Assets Computation
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query || (
        a.name.toLowerCase().includes(query) ||
        a.assetNumber.toLowerCase().includes(query) ||
        a.serialNumber.toLowerCase().includes(query) ||
        a.qrCode.toLowerCase().includes(query)
      );

      const matchesCat = selectedCategory === 'ALL' || a.category === selectedCategory;
      const matchesStat = selectedStatus === 'ALL' || a.status === selectedStatus;

      let matchesEmp = true;
      if (selectedEmployeeId !== 'ALL') {
        const empAssets = employeeAssetMap.get(selectedEmployeeId);
        const isHistoricalBorrower = empAssets ? (empAssets.has(a.id) || empAssets.has(a.assetNumber)) : false;
        matchesEmp = a.holderEmployeeId === selectedEmployeeId || isHistoricalBorrower;
      } else if (activePreset === 'ASSETS_BY_EMPLOYEE') {
        const hasAnyHistory = Array.from(employeeAssetMap.values()).some((set) => set.has(a.id) || set.has(a.assetNumber));
        matchesEmp = Boolean(a.holderEmployeeId || hasAnyHistory);
      }

      const matchesSupp = selectedSupplierId === 'ALL' || a.supplierId === selectedSupplierId;
      const matchesManuf = selectedManufacturer === 'ALL' || a.manufacturer === selectedManufacturer;
      const matchesLoc = selectedLocation === 'ALL' || a.location === selectedLocation;
      const matchesDate = checkDateInRange(a.purchaseDate);

      // Preset specific constraints
      if (activePreset === 'ISSUED_ASSETS' && a.status !== 'ISSUED') return false;
      if (activePreset === 'DAMAGED_ASSETS' && a.status !== 'DAMAGED') return false;
      if (activePreset === 'MISSING_ASSETS' && a.status !== 'MISSING' && a.status !== 'LOST') return false;

      return matchesQuery && matchesCat && matchesStat && matchesEmp && matchesSupp && matchesManuf && matchesLoc && matchesDate;
    });
  }, [
    assets, activePreset, searchQuery, selectedCategory, selectedStatus,
    selectedEmployeeId, selectedSupplierId, selectedManufacturer, selectedLocation,
    dateRangePreset, startDate, endDate, employeeAssetMap
  ]);

  // Filtered Transactions Computation
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query || (
        t.assetName.toLowerCase().includes(query) ||
        t.assetNumber.toLowerCase().includes(query) ||
        (t.employeeName && t.employeeName.toLowerCase().includes(query)) ||
        (t.projectName && t.projectName.toLowerCase().includes(query))
      );

      const matchesEmp = selectedEmployeeId === 'ALL' || t.employeeId === selectedEmployeeId;
      const matchesProj = selectedProjectId === 'ALL' || t.projectId === selectedProjectId;
      const matchesType = selectedTransactionType === 'ALL' || t.transactionType === selectedTransactionType;
      const matchesDate = checkDateInRange(t.transactionDate);

      return matchesQuery && matchesEmp && matchesProj && matchesType && matchesDate;
    });
  }, [transactions, searchQuery, selectedEmployeeId, selectedProjectId, selectedTransactionType, dateRangePreset, startDate, endDate]);

  // Filtered Otpremnica Documents Computation
  const filteredOtpremnica = useMemo(() => {
    return otpremnicaDocuments.filter((doc) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery = !query || (
        doc.documentNumber.toLowerCase().includes(query) ||
        (doc.employeeName && doc.employeeName.toLowerCase().includes(query)) ||
        (doc.projectName && doc.projectName.toLowerCase().includes(query)) ||
        (doc.notes && doc.notes.toLowerCase().includes(query))
      );
      const matchesEmp = selectedEmployeeId === 'ALL' || doc.employeeId === selectedEmployeeId;
      const matchesProj = selectedProjectId === 'ALL' || doc.projectId === selectedProjectId;
      const matchesDate = checkDateInRange(doc.issueDate || doc.createdAt);
      return matchesQuery && matchesEmp && matchesProj && matchesDate;
    });
  }, [otpremnicaDocuments, searchQuery, selectedEmployeeId, selectedProjectId, dateRangePreset, startDate, endDate]);

  // Summary Metrics
  const totalOriginalVal = filteredAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
  const totalCurrentVal = filteredAssets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalLostVal = filteredAssets
    .filter(a => a.status === 'LOST' || a.status === 'MISSING')
    .reduce((sum, a) => sum + (a.currentValue ?? a.purchasePrice ?? 0), 0);

  // Active Filter Summary Labels (for both export and printable view)
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (searchQuery) labels.push(`${t('Search')}: "${searchQuery}"`);
    if (selectedCategory !== 'ALL') labels.push(`${t('Category')}: ${selectedCategory}`);
    if (selectedStatus !== 'ALL') labels.push(`${t('Status')}: ${selectedStatus}`);
    if (selectedEmployeeId !== 'ALL') {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) labels.push(`${t('Employee')}: ${emp.firstName} ${emp.lastName}`);
    }
    if (selectedProjectId !== 'ALL') {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj) labels.push(`${t('Project')}: ${proj.name}`);
    }
    if (selectedLocation !== 'ALL') labels.push(`${t('Location')}: ${selectedLocation}`);

    if (dateRangePreset !== 'ALL' || startDate || endDate) {
      let dateDesc = '';
      if (startDate && endDate) {
        dateDesc = `${startDate} ${t('to')} ${endDate}`;
      } else if (startDate) {
        dateDesc = `${t('From')} ${startDate}`;
      } else if (endDate) {
        dateDesc = `${t('Until')} ${endDate}`;
      }
      const presetLabel = dateRangePreset !== 'CUSTOM' ? t(dateRangePreset.replace(/_/g, ' ')) : t('Custom Range');
      labels.push(`${t('Date Range')}: ${dateDesc ? `${dateDesc} (${presetLabel})` : presetLabel}`);
    }

    if (activePreset === 'ASSET_MOVEMENT_HISTORY' && selectedTransactionType !== 'ALL') {
      labels.push(`${t('Action')}: ${selectedTransactionType}`);
    }
    return labels;
  }, [searchQuery, selectedCategory, selectedStatus, selectedEmployeeId, selectedProjectId, selectedLocation, dateRangePreset, startDate, endDate, activePreset, selectedTransactionType, employees, projects, t]);

  // Export PDF
  const handleExportPDF = () => {
    const currentCount = activePreset === 'ASSET_MOVEMENT_HISTORY'
      ? filteredTransactions.length
      : activePreset === 'OTPREMNICA_ARCHIVE'
        ? filteredOtpremnica.length
        : filteredAssets.length;

    addAuditLog('Report', activePreset, 'PDF_EXPORTED', { preset: activePreset, recordCount: currentCount });

    if (activePreset === 'OTPREMNICA_ARCHIVE') {
      const columns = [
        { header: 'Document No.', dataKey: 'documentNumber' },
        { header: 'Date', dataKey: 'issueDate' },
        { header: 'Employee', dataKey: 'employeeName' },
        { header: 'Department', dataKey: 'employeeDepartment' },
        { header: 'Project', dataKey: 'projectName' },
        { header: 'Items Count', dataKey: 'itemsCount' },
        { header: 'Issued By', dataKey: 'createdByName' },
      ];
      const data = filteredOtpremnica.map((doc) => ({
        ...doc,
        itemsCount: (doc.items || []).length,
        employeeName: doc.employeeName || '—',
        employeeDepartment: doc.employeeDepartment || 'Field Ops',
        projectName: doc.projectName || 'General Issue',
        createdByName: doc.createdByName || 'Warehouse Manager',
      }));
      exportReportPDF('Otpremnice Equipment Handover Archive Report', columns, data, activeFilterLabels);
      return;
    }

    if (activePreset === 'ASSET_MOVEMENT_HISTORY') {
      const columns = [
        { header: 'Date & Time', dataKey: 'transactionDate' },
        { header: 'Action', dataKey: 'transactionType' },
        { header: 'Asset Code', dataKey: 'assetNumber' },
        { header: 'Asset Name', dataKey: 'assetName' },
        { header: 'Employee', dataKey: 'employeeName' },
        { header: 'Project', dataKey: 'projectName' },
        { header: 'Performed By', dataKey: 'performedByName' },
      ];
      const data = filteredTransactions.map(t => ({
        ...t,
        transactionDate: new Date(t.transactionDate).toLocaleString(),
        employeeName: t.employeeName || '—',
        projectName: t.projectName || '—',
      }));
      exportReportPDF('Asset Movement History Report', columns, data, activeFilterLabels);
      return;
    }

    const columns = [
      { header: 'Asset ID', dataKey: 'assetNumber' },
      { header: 'Asset Name', dataKey: 'name' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Manufacturer / Model', dataKey: 'model' },
      { header: 'Serial Number', dataKey: 'serialNumber' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Location', dataKey: 'location' },
      { header: 'Holder / Employee', dataKey: 'holderEmployeeName' },
      { header: 'Acquisition ($)', dataKey: 'purchasePrice' },
      { header: 'Book Value ($)', dataKey: 'currentValue' },
    ];

    const data = filteredAssets.map(a => ({
      ...a,
      model: `${a.manufacturer} ${a.model}`,
      holderEmployeeName: a.holderEmployeeName || 'Warehouse Stock',
      purchasePrice: formatCurrency(a.purchasePrice),
      currentValue: formatCurrency(a.currentValue),
    }));

    exportReportPDF(`${t(activePreset.replace(/_/g, ' '))} Report`, columns, data, activeFilterLabels);
  };

  // Export CSV
  const handleExportCSV = () => {
    addAuditLog('Report', activePreset, 'CSV_EXPORTED', { preset: activePreset });

    if (activePreset === 'OTPREMNICA_ARCHIVE') {
      const data = filteredOtpremnica.map((doc) => ({
        DocumentNumber: doc.documentNumber,
        IssueDate: doc.issueDate,
        Employee: doc.employeeName || 'N/A',
        Department: doc.employeeDepartment || 'Field Ops',
        Project: doc.projectName || 'General Issue',
        ItemsCount: (doc.items || []).length,
        IssuedBy: doc.createdByName || 'Warehouse Manager',
        Notes: doc.notes || '',
      }));
      exportToCSV('Otpremnice_Archive_Report', data);
      return;
    }

    if (activePreset === 'ASSET_MOVEMENT_HISTORY') {
      const data = filteredTransactions.map(trx => ({
        TransactionID: trx.id,
        Date: trx.transactionDate,
        Type: trx.transactionType,
        AssetNumber: trx.assetNumber,
        AssetName: trx.assetName,
        Employee: trx.employeeName || 'N/A',
        Project: trx.projectName || 'N/A',
        PerformedBy: trx.performedByName,
        Notes: trx.notes || '',
      }));
      exportToCSV('Asset_Movement_History_Report', data);
      return;
    }

    const data = filteredAssets.map(a => ({
      AssetNumber: a.assetNumber,
      QRCode: a.qrCode,
      Name: a.name,
      Category: a.category,
      Manufacturer: a.manufacturer,
      Model: a.model,
      SerialNumber: a.serialNumber,
      Status: a.status,
      Location: a.location,
      Holder: a.holderEmployeeName || 'Warehouse Storage',
      PurchaseDate: a.purchaseDate,
      AcquisitionPrice: a.purchasePrice,
      BookValue: a.currentValue,
    }));
    exportToCSV(`Warehouse_${activePreset}_Report`, data);
  };

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5 no-print">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-600" />
            <span>{t('Reports & Document Management Center')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Generate real database reports, custom multi-criteria filtered schedule audits, printable A4 Otpremnice, and vector PDFs.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => window.print()} className="px-3.5 py-2 bg-white border border-surface-200 text-slate-700 hover:bg-surface-100 rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all">
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{t('Print Report')}</span>
          </button>

          <button onClick={handleExportCSV} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all">
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('Export CSV')}</span>
          </button>

          <button onClick={handleExportPDF} className="btn-primary">
            <Download className="w-4 h-4" />
            <span>{t('Export Vector PDF')}</span>
          </button>
        </div>
      </div>

      {/* Report Categories Tab Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-surface-200 scrollbar-none no-print">
        {[
          { id: 'ALL_ASSETS', label: t('All Assets Register'), icon: PackageCheck },
          { id: 'ASSETS_BY_EMPLOYEE', label: t('Assets by Employee'), icon: User },
          { id: 'ASSETS_BY_PROJECT', label: t('Assets by Project'), icon: FolderKanban },
          { id: 'ASSET_MOVEMENT_HISTORY', label: t('Asset Movement History'), icon: Layers },
          { id: 'ISSUED_ASSETS', label: t('Issued Assets'), icon: CheckCircle2 },
          { id: 'DAMAGED_ASSETS', label: t('Damaged Assets'), icon: Wrench },
          { id: 'MISSING_ASSETS', label: t('Missing Assets'), icon: ShieldAlert },
          { id: 'FINANCIAL_DEPRECIATION', label: t('Financial Depreciation'), icon: FileSpreadsheet },
          { id: 'OTPREMNICA_ARCHIVE', label: t('Otpremnice Archive'), icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePreset === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePreset(tab.id as ReportCategoryPreset)}
              className={`px-3 py-2 rounded-lg font-bold text-xs whitespace-nowrap flex items-center gap-2 border transition-all ${isActive ? 'bg-brand-600 text-white border-brand-600 shadow-sm' : 'bg-white text-slate-600 border-surface-200 hover:bg-surface-100'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Advanced Combinable Filter Toolbar */}
      <div className="glass-panel p-4 space-y-3 no-print">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-brand-600" />
            <span>{t('Advanced Multi-Criteria Report Filters')}</span>
          </h3>

          <button onClick={handleResetFilters} className="text-xs text-slate-500 hover:text-brand-600 flex items-center gap-1 font-medium">
            <RotateCcw className="w-3 h-3" />
            <span>{t('Reset Filters')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* Global Text Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Search (Name / ID / S/N / QR)')}</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Type keywords...')}
                className="w-full bg-white border border-surface-200 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:border-brand-400"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Category')}</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="ALL">{t('All Categories')}</option>
              {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Status')}</label>
            <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="ALL">{t('All Statuses')}</option>
              <option value="AVAILABLE">{t('AVAILABLE')}</option>
              <option value="ISSUED">{t('ISSUED')}</option>
              <option value="IN_SERVICE">{t('IN SERVICE')}</option>
              <option value="IN_CALIBRATION">{t('IN CALIBRATION')}</option>
              <option value="DAMAGED">{t('DAMAGED')}</option>
              <option value="LOST">{t('LOST')}</option>
              <option value="MISSING">{t('MISSING')}</option>
              <option value="RETIRED">{t('RETIRED')}</option>
            </select>
          </div>

          {/* Employee Custody Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Assigned Employee')}</label>
            <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="ALL">{t('All Employees')}</option>
              {employees.map((emp) => (<option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Project / Job Site')}</label>
            <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="ALL">{t('All Projects')}</option>
              {projects.map((proj) => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Warehouse Location')}</label>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
              <option value="ALL">{t('All Locations')}</option>
              {locations.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}
            </select>
          </div>

          {/* Date Range Controls */}
          <div className="space-y-1.5 sm:col-span-2 md:col-span-2 lg:col-span-2 bg-slate-50/70 p-2.5 rounded-lg border border-surface-200">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand-600" />
                <span>{t('Date Range Filter')}</span>
              </label>
              {(dateRangePreset !== 'ALL' || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => handlePresetChange('ALL')}
                  className="text-[10px] text-brand-600 hover:text-brand-800 font-semibold"
                >
                  {t('Clear Date Range')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <select
                  value={dateRangePreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-400 font-medium"
                >
                  <option value="ALL">{t('All Time')}</option>
                  <option value="TODAY">{t('Today')}</option>
                  <option value="LAST_7_DAYS">{t('Last 7 Days')}</option>
                  <option value="LAST_30_DAYS">{t('Last 30 Days')}</option>
                  <option value="THIS_MONTH">{t('This Month')}</option>
                  <option value="LAST_MONTH">{t('Last Month')}</option>
                  <option value="THIS_YEAR">{t('This Year')}</option>
                  <option value="CUSTOM">{t('Custom Range')}</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  aria-label={t('Start Date')}
                  title={t('Start Date')}
                  className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-400 ${
                    isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-surface-200'
                  }`}
                />
              </div>

              <div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  aria-label={t('End Date')}
                  title={t('End Date')}
                  className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-400 ${
                    isDateRangeInvalid ? 'border-rose-400 bg-rose-50/50' : 'border-surface-200'
                  }`}
                />
              </div>
            </div>

            {/* Quick Presets Pills */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] text-slate-400 font-medium mr-1">{t('Quick Presets')}:</span>
              {[
                { id: 'ALL', label: t('All Time') },
                { id: 'LAST_7_DAYS', label: t('Last 7 Days') },
                { id: 'LAST_30_DAYS', label: t('Last 30 Days') },
                { id: 'THIS_MONTH', label: t('This Month') },
                { id: 'THIS_YEAR', label: t('This Year') },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetChange(p.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                    dateRangePreset === p.id
                      ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-2xs'
                      : 'bg-white border-surface-200 text-slate-500 hover:bg-surface-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {isDateRangeInvalid && (
              <p className="text-[11px] text-rose-600 font-semibold flex items-center gap-1 mt-1">
                <span>⚠️</span>
                <span>{t('Start date cannot be after end date')}</span>
              </p>
            )}
          </div>

          {/* Transaction Type Filter */}
          {activePreset === 'ASSET_MOVEMENT_HISTORY' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Transaction Action')}</label>
              <select value={selectedTransactionType} onChange={(e) => setSelectedTransactionType(e.target.value)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
                <option value="ALL">{t('All Actions')}</option>
                <option value="ISSUE">{t('ISSUE')}</option>
                <option value="RETURN">{t('RETURN')}</option>
                <option value="TRANSFER">{t('TRANSFER')}</option>
                <option value="MAINTENANCE_SEND">{t('MAINTENANCE SEND')}</option>
                <option value="CALIBRATION_SEND">{t('CALIBRATION SEND')}</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* PRINTABLE REPORT SECTION */}
      <div id="printable-report" className="printable-area space-y-5">
        {/* Printable-only Official Report Header */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {t('Enterprise Warehouse Management')}
              </h1>
              <h2 className="text-sm font-bold text-slate-700 mt-0.5">
                {t(activePreset.replace(/_/g, ' '))} {t('Report')}
              </h2>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>{t('Date')}: <span className="font-semibold text-slate-900">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
              <p>{t('Records')}: <span className="font-bold text-slate-900">
                {activePreset === 'ASSET_MOVEMENT_HISTORY' ? filteredTransactions.length : activePreset === 'OTPREMNICA_ARCHIVE' ? filteredOtpremnica.length : filteredAssets.length}
              </span></p>
            </div>
          </div>

          {/* Applied Filters Summary Banner */}
          <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-900 uppercase text-[10px] mr-1">{t('Applied Filters')}:</span>
            {activeFilterLabels.length > 0 ? (
              activeFilterLabels.map((f, i) => (
                <span key={i} className="inline-flex items-center bg-white px-2 py-0.5 rounded border border-slate-300 font-medium text-slate-800 text-[10px]">
                  {f}
                </span>
              ))
            ) : (
              <span className="text-slate-500 italic text-[10px]">{t('All Records (No filters applied)')}</span>
            )}
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Filtered Record Count')}</p>
            <h3 className="text-xl font-extrabold text-slate-800 mt-1">
              {activePreset === 'ASSET_MOVEMENT_HISTORY' ? filteredTransactions.length : activePreset === 'OTPREMNICA_ARCHIVE' ? filteredOtpremnica.length : filteredAssets.length}
            </h3>
          </div>

          <div className="glass-card p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Total Acquisition Value')}</p>
            <h3 className="text-xl font-extrabold text-blue-600 mt-1">{formatCurrency(totalOriginalVal)}</h3>
          </div>

          <div className="glass-card p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Net Active Book Value')}</p>
            <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(totalCurrentVal - totalLostVal)}</h3>
          </div>

          <div className="glass-card p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Lost Fleet Value (Written Off)')}</p>
            <h3 className={`text-xl font-extrabold mt-1 ${totalLostVal > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
              {formatCurrency(totalLostVal)}
            </h3>
          </div>
        </div>

        {/* MAIN DATA PREVIEW TABLE */}
        {activePreset === 'OTPREMNICA_ARCHIVE' ? (
          /* OTPREMNICE ARCHIVE VIEW */
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{t('Otpremnica Equipment Handover Archive')} ({filteredOtpremnica.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-3 py-3 w-8"></th>
                    <th className="px-3 py-3 font-semibold">{t('Document No.')}</th>
                    <th className="px-3 py-3 font-semibold">{t('Date')}</th>
                    <th className="px-3 py-3 font-semibold">{t('Employee')}</th>
                    <th className="px-3 py-3 font-semibold">{t('Project')}</th>
                    <th className="px-3 py-3 font-semibold">{t('Assigned Equipment & Tools')}</th>
                    <th className="px-3 py-3 font-semibold">{t('Issued By')}</th>
                    <th className="px-3 py-3 text-right font-semibold">{t('Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-slate-700">
                  {filteredOtpremnica.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        <p>{t('No Otpremnica handover receipts generated yet.')}</p>
                        {(dateRangePreset !== 'ALL' || startDate || endDate) && (
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            {t('No records found matching selected date range and criteria.')}
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredOtpremnica.map((doc) => {
                      const isExpanded = expandedDocIds.has(doc.id);
                      const items = doc.items || [];

                      return (
                        <React.Fragment key={doc.id}>
                          <tr className="hover:bg-surface-50 transition-colors">
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => toggleDocExpanded(doc.id)}
                                className="p-1 hover:bg-surface-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                                title={isExpanded ? t('Collapse tool details') : t('Expand tool details')}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4 text-brand-600" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-3 py-3 font-mono font-bold text-brand-600">
                              <span className="cursor-pointer hover:underline" onClick={() => toggleDocExpanded(doc.id)}>
                                {doc.documentNumber}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{doc.issueDate}</td>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-slate-800">{doc.employeeName || 'N/A'}</div>
                              <div className="text-[10px] text-slate-400">{doc.employeeDepartment || 'Field Ops'}</div>
                            </td>
                            <td className="px-3 py-3 text-slate-600">{doc.projectName || t('General Issue')}</td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap items-center gap-1.5 max-w-xs">
                                <span className="px-2 py-0.5 bg-brand-50 border border-brand-200 text-brand-700 rounded-full text-[10px] font-bold">
                                  {items.length} {t('items')}
                                </span>
                                {items.slice(0, 2).map((item, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] truncate max-w-[120px]">
                                    {item.assetName}
                                  </span>
                                ))}
                                {items.length > 2 && (
                                  <button
                                    onClick={() => toggleDocExpanded(doc.id)}
                                    className="text-[10px] text-brand-600 hover:text-brand-800 font-semibold"
                                  >
                                    +{items.length - 2} more
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{doc.createdByName || 'Warehouse Manager'}</td>
                            <td className="px-3 py-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedOtpremnica(doc);
                                    setIsOtpremnicaOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded border border-brand-100 text-[11px] font-medium flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{t('View & Print')}</span>
                                </button>
                                <button
                                  onClick={() => exportOtpremnicaPDF(doc)}
                                  className="p-1 bg-surface-100 hover:bg-surface-200 text-slate-600 rounded border border-surface-200"
                                  title={t('Download PDF')}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Tools List Details Row */}
                          {isExpanded && (
                            <tr className="bg-surface-50/70 border-y border-surface-200">
                              <td colSpan={8} className="px-6 py-4">
                                <div className="space-y-3 bg-white p-4 rounded-lg border border-surface-200 shadow-sm">
                                  <div className="flex items-center justify-between border-b border-surface-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-brand-600" />
                                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                                        {t('Assigned Tools & Equipment List')} — {doc.documentNumber} ({items.length} {t('items')})
                                      </h4>
                                    </div>
                                    {doc.notes && (
                                      <div className="text-[11px] text-slate-500 italic max-w-md truncate">
                                        <span className="font-semibold text-slate-600">{t('Notes')}:</span> {doc.notes}
                                      </div>
                                    )}
                                  </div>

                                  {items.length === 0 ? (
                                    <p className="text-center py-3 text-slate-400 text-xs">
                                      {t('No equipment items recorded on this delivery note.')}
                                    </p>
                                  ) : (
                                    <table className="w-full text-left text-xs border border-surface-200 rounded">
                                      <thead>
                                        <tr className="bg-surface-100 text-[10px] uppercase tracking-wider text-slate-600 font-bold border-b border-surface-200">
                                          <th className="px-3 py-1.5">{t('Asset Code')}</th>
                                          <th className="px-3 py-1.5">{t('Asset Name')}</th>
                                          <th className="px-3 py-1.5">{t('Serial Number')}</th>
                                          <th className="px-3 py-1.5">{t('Category')}</th>
                                          <th className="px-3 py-1.5">{t('Status')}</th>
                                          <th className="px-3 py-1.5 text-right">{t('Quantity')}</th>
                                          <th className="px-3 py-1.5">{t('Notes')}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-surface-100 text-slate-700">
                                        {items.map((it, idx) => (
                                          <tr key={idx} className="hover:bg-surface-50">
                                            <td className="px-3 py-2 font-mono font-bold text-brand-600">{it.assetNumber}</td>
                                            <td className="px-3 py-2 font-semibold text-slate-800">{it.assetName}</td>
                                            <td className="px-3 py-2 font-mono text-slate-500">{it.serialNumber || '—'}</td>
                                            <td className="px-3 py-2 text-slate-600">{it.category || 'Tool'}</td>
                                            <td className="px-3 py-2">
                                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                it.status === 'ISSUED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                it.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                it.status === 'DAMAGED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                it.status === 'LOST' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                'bg-slate-100 text-slate-700 border border-slate-200'
                                              }`}>
                                                {it.status || 'ISSUED'}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-slate-800">{it.quantity || 1}</td>
                                            <td className="px-3 py-2 text-[11px] text-slate-400 italic">{it.notes || '—'}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activePreset === 'ASSET_MOVEMENT_HISTORY' ? (
          /* ASSET MOVEMENT LOG TABLE */
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{t('Asset Movement & Loan History')} ({filteredTransactions.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 font-semibold">{t('Date & Time')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Action')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Asset Code')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Asset Name')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Employee')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Project')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Performed By')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        <p>{t('No movement history records found matching selected filters.')}</p>
                        {(dateRangePreset !== 'ALL' || startDate || endDate) && (
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            {t('No records found matching selected date range and criteria.')}
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((trx) => (
                      <tr key={trx.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-3 text-slate-400">{new Date(trx.transactionDate).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${trx.transactionType === 'ISSUE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                            {trx.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-brand-600">{trx.assetNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{trx.assetName}</td>
                        <td className="px-4 py-3 text-slate-600">{trx.employeeName || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{trx.projectName || '—'}</td>
                        <td className="px-4 py-3 text-slate-500">{trx.performedByName}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ASSET REGISTER TABLE PREVIEW */
          <div className="glass-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">{t('Report Data Preview')} ({filteredAssets.length} {t('records')})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3 font-semibold">{t('Asset Code')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Asset Name')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Category')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Location')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Current Custody / Holder')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Acquisition Cost')}</th>
                    <th className="px-4 py-3 font-semibold">{t('Book Value')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 text-slate-700">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        <p>{t('No assets found matching the selected report criteria.')}</p>
                        {(dateRangePreset !== 'ALL' || startDate || endDate) && (
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">
                            {t('No records found matching selected date range and criteria.')}
                          </p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((ast) => (
                      <tr key={ast.id} className="hover:bg-surface-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-brand-600">{ast.assetNumber}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{ast.name}</td>
                        <td className="px-4 py-3 text-slate-500">{ast.category}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${ast.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : ast.status === 'ISSUED' ? 'bg-blue-50 text-blue-700 border-blue-200' : ast.status === 'MISSING' || ast.status === 'LOST' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                            {ast.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{ast.location}</td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {selectedEmployeeId !== 'ALL' ? (
                            ast.holderEmployeeId === selectedEmployeeId ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {t('Currently Issued')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {t('Previously Rented')} ({ast.holderEmployeeName || t('Warehouse Storage')})
                              </span>
                            )
                          ) : (
                            ast.holderEmployeeName || t('Warehouse Storage')
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-800 font-semibold">{formatCurrency(ast.purchasePrice)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{formatCurrency(ast.currentValue)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Otpremnica Document Preview Modal */}
      <OtpremnicaModal
        isOpen={isOtpremnicaOpen}
        onClose={() => setIsOtpremnicaOpen(false)}
        otpremnica={selectedOtpremnica}
      />

    </div>
  );
};
