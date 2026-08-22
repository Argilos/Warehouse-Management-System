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
  Wrench, Gauge, PackageCheck, Layers, FileSpreadsheet, Eye, Sparkles
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
  };

  // Filter Computation Logic for Date Presets
  const checkDateInRange = (dateStr: string) => {
    if (dateRangePreset === 'ALL') return true;
    const itemDate = new Date(dateStr).getTime();
    const now = new Date();

    if (dateRangePreset === 'TODAY') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return itemDate >= todayStart;
    }
    if (dateRangePreset === 'LAST_7_DAYS') {
      return itemDate >= now.getTime() - 7 * 24 * 3600 * 1000;
    }
    if (dateRangePreset === 'LAST_30_DAYS') {
      return itemDate >= now.getTime() - 30 * 24 * 3600 * 1000;
    }
    if (dateRangePreset === 'THIS_MONTH') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return itemDate >= monthStart;
    }
    if (dateRangePreset === 'LAST_MONTH') {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).getTime();
      return itemDate >= lastMonthStart && itemDate <= lastMonthEnd;
    }
    if (dateRangePreset === 'THIS_YEAR') {
      const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
      return itemDate >= yearStart;
    }
    if (dateRangePreset === 'CUSTOM') {
      let valid = true;
      if (startDate) valid = valid && itemDate >= new Date(startDate).getTime();
      if (endDate) valid = valid && itemDate <= new Date(endDate).getTime() + 86400000;
      return valid;
    }
    return true;
  };

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
      const matchesEmp = selectedEmployeeId === 'ALL' || a.holderEmployeeId === selectedEmployeeId;
      const matchesSupp = selectedSupplierId === 'ALL' || a.supplierId === selectedSupplierId;
      const matchesManuf = selectedManufacturer === 'ALL' || a.manufacturer === selectedManufacturer;
      const matchesLoc = selectedLocation === 'ALL' || a.location === selectedLocation;
      const matchesDate = checkDateInRange(a.purchaseDate);

      // Preset specific constraints
      if (activePreset === 'ISSUED_ASSETS' && a.status !== 'ISSUED') return false;
      if (activePreset === 'DAMAGED_ASSETS' && a.status !== 'DAMAGED') return false;
      if (activePreset === 'MISSING_ASSETS' && a.status !== 'MISSING' && a.status !== 'LOST') return false;
      if (activePreset === 'ASSETS_BY_EMPLOYEE' && !a.holderEmployeeId) return false;

      return matchesQuery && matchesCat && matchesStat && matchesEmp && matchesSupp && matchesManuf && matchesLoc && matchesDate;
    });
  }, [
    assets, activePreset, searchQuery, selectedCategory, selectedStatus,
    selectedEmployeeId, selectedSupplierId, selectedManufacturer, selectedLocation,
    dateRangePreset, startDate, endDate
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

  // Summary Metrics
  const totalOriginalVal = filteredAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
  const totalCurrentVal = filteredAssets.reduce((sum, a) => sum + a.currentValue, 0);

  // Export PDF
  const handleExportPDF = () => {
    addAuditLog('Report', activePreset, 'PDF_EXPORTED', { preset: activePreset, recordCount: filteredAssets.length });

    const activeFilterLabels = [];
    if (searchQuery) activeFilterLabels.push(`Search: "${searchQuery}"`);
    if (selectedCategory !== 'ALL') activeFilterLabels.push(`Category: ${selectedCategory}`);
    if (selectedStatus !== 'ALL') activeFilterLabels.push(`Status: ${selectedStatus}`);
    if (selectedEmployeeId !== 'ALL') {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) activeFilterLabels.push(`Employee: ${emp.firstName} ${emp.lastName}`);
    }
    if (selectedProjectId !== 'ALL') {
      const proj = projects.find(p => p.id === selectedProjectId);
      if (proj) activeFilterLabels.push(`Project: ${proj.name}`);
    }
    if (dateRangePreset !== 'ALL') activeFilterLabels.push(`Date Range: ${dateRangePreset}`);

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-surface-200 scrollbar-none">
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
      <div className="glass-panel p-4 space-y-3">
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

          {/* Date Range Preset Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">{t('Date Range Preset')}</label>
            <select value={dateRangePreset} onChange={(e) => setDateRangePreset(e.target.value as any)} className="w-full bg-white border border-surface-200 rounded-lg px-2.5 py-1.5 text-xs outline-none">
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Filtered Record Count')}</p>
          <h3 className="text-xl font-extrabold text-slate-800 mt-1">
            {activePreset === 'ASSET_MOVEMENT_HISTORY' ? filteredTransactions.length : activePreset === 'OTPREMNICA_ARCHIVE' ? otpremnicaDocuments.length : filteredAssets.length}
          </h3>
        </div>

        <div className="glass-card p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Total Acquisition Value')}</p>
          <h3 className="text-xl font-extrabold text-blue-600 mt-1">{formatCurrency(totalOriginalVal)}</h3>
        </div>

        <div className="glass-card p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase">{t('Net Book Value')}</p>
          <h3 className="text-xl font-extrabold text-emerald-600 mt-1">{formatCurrency(totalCurrentVal)}</h3>
        </div>
      </div>

      {/* MAIN DATA PREVIEW TABLE */}
      {activePreset === 'OTPREMNICA_ARCHIVE' ? (
        /* OTPREMNICE ARCHIVE VIEW */
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800">{t('Otpremnica Equipment Handover Archive')} ({otpremnicaDocuments.length})</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">{t('Document No.')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Date')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Employee')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Department')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Project')}</th>
                  <th className="px-4 py-3 font-semibold">{t('Issued By')}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t('Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-slate-700">
                {otpremnicaDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      {t('No Otpremnica handover receipts generated yet.')}
                    </td>
                  </tr>
                ) : (
                  otpremnicaDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-brand-600">{doc.documentNumber}</td>
                      <td className="px-4 py-3 text-slate-500">{doc.issueDate}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{doc.employeeName || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-500">{doc.employeeDepartment || 'Field Ops'}</td>
                      <td className="px-4 py-3 text-slate-600">{doc.projectName || t('General Issue')}</td>
                      <td className="px-4 py-3 text-slate-500">{doc.createdByName || 'Warehouse Manager'}</td>
                      <td className="px-4 py-3 text-right">
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
                  ))
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
                      {t('No movement history records found matching selected filters.')}
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
                      {t('No assets found matching the selected report criteria.')}
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
                      <td className="px-4 py-3 text-slate-700 font-medium">{ast.holderEmployeeName || t('Warehouse Storage')}</td>
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

      {/* Otpremnica Document Preview Modal */}
      <OtpremnicaModal
        isOpen={isOtpremnicaOpen}
        onClose={() => setIsOtpremnicaOpen(false)}
        otpremnica={selectedOtpremnica}
      />

    </div>
  );
};
