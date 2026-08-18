import React from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { StatCard } from '../common/StatCard';
import { formatCurrency } from '../../utils/depreciation';
import {
  PackageCheck, CheckCircle2, ArrowLeftRight, Wrench, Gauge,
  DollarSign, AlertTriangle, Clock, QrCode, ShieldAlert, ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend
} from 'recharts';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
  IN_SERVICE: 'bg-amber-50 text-amber-700 border-amber-200',
  IN_CALIBRATION: 'bg-purple-50 text-purple-700 border-purple-200',
  RETIRED: 'bg-slate-100 text-slate-500 border-slate-200',
  DAMAGED: 'bg-red-50 text-red-700 border-red-200',
  LOST: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const DashboardModule: React.FC = () => {
  const {
    assets, serviceOrders, calibrations, transactions, employees,
    setActiveModule, setSelectedAssetFor360
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const totalAssetsCount = assets.length;
  const availableCount = assets.filter(a => a.status === 'AVAILABLE').length;
  const issuedCount = assets.filter(a => a.status === 'ISSUED').length;
  const serviceCount = assets.filter(a => a.status === 'IN_SERVICE').length;
  const calibrationCount = assets.filter(a => a.status === 'IN_CALIBRATION').length;
  const retiredCount = assets.filter(a => a.status === 'RETIRED').length;

  const totalOriginalValue = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
  const totalCurrentValue = assets.reduce((sum, a) => sum + a.currentValue, 0);

  const statusPieData = [
    { name: t('AVAILABLE'), value: availableCount, color: '#10b981' },
    { name: t('ISSUED'), value: issuedCount, color: '#3b82f6' },
    { name: t('IN SERVICE'), value: serviceCount, color: '#f59e0b' },
    { name: t('IN CALIBRATION'), value: calibrationCount, color: '#8b5cf6' },
    { name: t('RETIRED'), value: retiredCount, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const categoriesMap: Record<string, number> = {};
  assets.forEach(a => { categoriesMap[a.category] = (categoriesMap[a.category] || 0) + 1; });
  const categoryBarData = Object.keys(categoriesMap).map(cat => ({ name: cat, count: categoriesMap[cat] }));

  const latestCalByAssetId = new Map<string, typeof calibrations[0]>();
  calibrations.forEach((cal) => {
    const existing = latestCalByAssetId.get(cal.assetId);
    if (!existing) {
      latestCalByAssetId.set(cal.assetId, cal);
    } else {
      const existingDate = new Date(existing.nextCalibrationDate || existing.calibrationDate).getTime();
      const currentDate = new Date(cal.nextCalibrationDate || cal.calibrationDate).getTime();
      if (currentDate > existingDate) {
        latestCalByAssetId.set(cal.assetId, cal);
      }
    }
  });

  const expiringCalibrations = Array.from(latestCalByAssetId.values()).filter(c => {
    const diffDays = (new Date(c.nextCalibrationDate).getTime() - Date.now()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 30;
  });

  return (
    <div className="space-y-5">

      {/* Hero Banner */}
      <div className="glass-panel p-6 bg-gradient-to-r from-brand-700 to-brand-500 border-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {t('Warehouse Fleet Command Center')}
            <span className="px-2 py-0.5 text-xs bg-white/20 text-white rounded-full border border-white/30">
              {t('Live Overview')}
            </span>
          </h2>
          <p className="text-xs text-brand-100 mt-1">
            {t('Real-time digital custody, preventative maintenance, calibration alerts, and asset depreciation.')}
          </p>
        </div>
        <button
          onClick={() => setActiveModule('qr-scan')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white text-brand-700 hover:bg-brand-50 rounded-xl font-bold text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap"
        >
          <QrCode className="w-4 h-4" />
          {t('Launch QR Camera Reader')}
        </button>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('Total Fleet Assets')}
          value={totalAssetsCount}
          subtitle={`${t('Acquisition:')} ${formatCurrency(totalOriginalValue)}`}
          icon={<PackageCheck className="w-5 h-5" />}
          accentColor="from-blue-600 to-indigo-600"
        />
        <StatCard
          title={t('Available in Stock')}
          value={availableCount}
          subtitle={`${Math.round((availableCount / (totalAssetsCount || 1)) * 100)}% ${t('ready for checkout')}`}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accentColor="from-emerald-500 to-teal-500"
        />
        <StatCard
          title={t('Issued Equipment')}
          value={issuedCount}
          subtitle={t('Currently checked out in field')}
          icon={<ArrowLeftRight className="w-5 h-5" />}
          accentColor="from-cyan-500 to-blue-500"
        />
        <StatCard
          title={t('Fleet Book Value')}
          value={formatCurrency(totalCurrentValue)}
          subtitle={`${t('Depreciation:')} ${formatCurrency(totalOriginalValue - totalCurrentValue)}`}
          icon={<DollarSign className="w-5 h-5" />}
          accentColor="from-amber-500 to-orange-500"
        />
      </div>

      {/* Alert Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Service Orders */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-surface-200">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-800">{t('Active Service & Repair Orders')}</h3>
            </div>
            <button onClick={() => setActiveModule('maintenance')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
              {t('View All')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {serviceOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">{t('No active service orders')}</p>
            ) : (
              serviceOrders.slice(0, 3).map((srv) => (
                <div key={srv.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{srv.assetName}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{srv.problemDescription}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold text-[10px] uppercase">
                    {t(srv.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Calibration Alerts */}
        <div className="glass-panel p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-surface-200">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-500" />
              <h3 className="font-bold text-sm text-slate-800">{t('Calibration Due (Next 30 Days)')}</h3>
            </div>
            <button onClick={() => setActiveModule('calibration')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
              {t('Manage')} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {expiringCalibrations.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-lg text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs text-emerald-700">{t('All instruments are fully calibrated.')}</p>
              </div>
            ) : (
              expiringCalibrations.map((cal) => (
                <div key={cal.id} className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{cal.assetName}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t('Cert:')} {cal.certificateNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-red-600 block">{t('Due:')} {cal.nextCalibrationDate}</span>
                    <span className="text-[10px] text-slate-400">{cal.providerName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-panel p-5">
          <h3 className="font-bold text-sm text-slate-800 mb-4">{t('Asset Status Distribution')}</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155' }} />
                <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="font-bold text-sm text-slate-800 mb-4">{t('Equipment by Category')}</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} barCategoryGap="30%">
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px', color: '#334155' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Assets Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">{t('Recent Asset Register')}</h3>
          <button onClick={() => setActiveModule('assets')} className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium">
            {t('View All')} <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Asset No.')}</th>
                <th className="px-4 py-3 font-semibold">{t('Name')}</th>
                <th className="px-4 py-3 font-semibold">{t('Category')}</th>
                <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                <th className="px-4 py-3 font-semibold">{t('Holder')}</th>
                <th className="px-4 py-3 font-semibold">{t('Book Value')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('Action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {assets.slice(0, 6).map((ast) => (
                <tr key={ast.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-brand-600 font-semibold text-[11px]">{ast.assetNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{ast.name}</td>
                  <td className="px-4 py-3 text-slate-500">{ast.category}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_STYLES[ast.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {ast.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{ast.holderEmployeeName || 'Warehouse'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(ast.currentValue)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedAssetFor360(ast)}
                      className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded border border-brand-100 font-medium text-[11px] transition-all"
                    >
                      {t('360° Profile')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {assets.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">{t('No assets registered yet.')}</p>
          )}
        </div>
      </div>

    </div>
  );
};
