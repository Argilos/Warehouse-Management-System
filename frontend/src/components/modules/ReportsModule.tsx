import React from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { formatCurrency } from '../../utils/depreciation';
import { exportToCSV } from '../../utils/exportUtils';
import { useLanguageStore } from '../../store/useLanguageStore';
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const { assets, transactions } = useWarehouseStore();
  const { t } = useLanguageStore();

  const totalAcquisitionCost = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
  const totalDepreciation = totalAcquisitionCost - totalCurrentValue;

  const handleExportAssetsCSV = () => {
    const data = assets.map(a => ({
      AssetNumber: a.assetNumber,
      QRCode: a.qrCode,
      Name: a.name,
      Category: t(a.category),
      Manufacturer: a.manufacturer,
      Model: a.model,
      SerialNumber: a.serialNumber,
      Status: t(a.status),
      Location: a.location,
      PurchaseDate: a.purchaseDate,
      PurchasePrice: a.purchasePrice,
      DepreciationRate: `${a.depreciationRate}%`,
      CurrentBookValue: a.currentValue,
      CurrentHolder: a.holderEmployeeName || t('Warehouse Storage'),
    }));
    exportToCSV('Warehouse_Fleet_Assets_Valuation_Report', data);
  };

  const handleExportMovementCSV = () => {
    const data = transactions.map(trx => ({
      TransactionID: trx.id,
      Date: trx.transactionDate,
      Type: t(trx.transactionType),
      Asset: trx.assetName,
      AssetNumber: trx.assetNumber,
      Employee: trx.employeeName || t('N/A'),
      Project: trx.projectName || t('N/A'),
      PerformedBy: trx.performedByName,
      Notes: trx.notes || '',
    }));
    exportToCSV('Warehouse_Asset_Movement_History', data);
  };

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-brand-600" />
            <span>{t('Financial Depreciation & Fleet Reports Engine')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Straight-line asset valuation schedules, transaction movements, and one-click Excel/CSV report exports.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportAssetsCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t('Export Asset Valuation CSV')}</span>
          </button>

          <button
            onClick={handleExportMovementCSV}
            className="btn-primary"
          >
            <Download className="w-4 h-4" />
            <span>{t('Export Movement Log CSV')}</span>
          </button>
        </div>
      </div>

      {/* Financial Valuation Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Total Acquisition Cost')}</p>
          <h3 className="text-2xl font-extrabold text-slate-800 mt-1.5">{formatCurrency(totalAcquisitionCost)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{t('Initial fleet purchase investment')}</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Fleet Net Book Value')}</p>
          <h3 className="text-2xl font-extrabold text-emerald-600 mt-1.5">{formatCurrency(totalCurrentValue)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{t('Depreciated asset value on balance sheet')}</p>
        </div>

        <div className="glass-card p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Accumulated Depreciation')}</p>
          <h3 className="text-2xl font-extrabold text-amber-600 mt-1.5">{formatCurrency(totalDepreciation)}</h3>
          <p className="text-[11px] text-slate-400 mt-1">{t('Straight-line depreciation write-off')}</p>
        </div>
      </div>

      {/* Comprehensive Asset Valuation Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('Detailed Asset Valuation & Depreciation Breakdown')}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Asset Number')}</th>
                <th className="px-4 py-3 font-semibold">{t('Asset Name')}</th>
                <th className="px-4 py-3 font-semibold">{t('Category')}</th>
                <th className="px-4 py-3 font-semibold">{t('Purchase Date')}</th>
                <th className="px-4 py-3 font-semibold">{t('Acquisition Cost')}</th>
                <th className="px-4 py-3 font-semibold">{t('Depreciation Rate')}</th>
                <th className="px-4 py-3 font-semibold">{t('Current Book Value')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    {t('No assets available to display report data.')}
                  </td>
                </tr>
              ) : (
                assets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600">{ast.assetNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{ast.name}</td>
                    <td className="px-4 py-3 text-slate-500">{t(ast.category)}</td>
                    <td className="px-4 py-3 text-slate-400">{ast.purchaseDate}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(ast.purchasePrice)}</td>
                    <td className="px-4 py-3 text-amber-700 font-medium">{ast.depreciationRate}% / {t('year')}</td>
                    <td className="px-4 py-3 font-extrabold text-emerald-600">{formatCurrency(ast.currentValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
