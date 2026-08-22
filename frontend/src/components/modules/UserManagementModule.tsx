import React from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { ShieldCheck, Check } from 'lucide-react';
import { useLanguageStore } from '../../store/useLanguageStore';

export const UserManagementModule: React.FC = () => {
  const { users } = useWarehouseStore();
  const { t } = useLanguageStore();

  const permissionMatrix = [
    { module: t('Asset Creation & Editing'), admin: true, manager: true, employee: false, power: true },
    { module: t('QR Code Scanning & Search'), admin: true, manager: true, employee: true, power: true },
    { module: t('Issue & Return Equipment'), admin: true, manager: true, employee: true, power: true },
    { module: t('Tool Box Kit Assembly'), admin: true, manager: true, employee: false, power: true },
    { module: t('Service Order Dispatch & Repairs'), admin: true, manager: true, employee: false, power: true },
    { module: t('Precision Calibration Records'), admin: true, manager: true, employee: false, power: false },
    { module: t('Employee HR Exit Clearance'), admin: true, manager: true, employee: false, power: false },
    { module: t('Financial Depreciation Reports'), admin: true, manager: true, employee: false, power: true },
    { module: t('User Role Administration & Audit Logs'), admin: true, manager: false, employee: false, power: false },
  ];

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <span>{t('User Management & Role-Based Access Control (RBAC)')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Configure system users, assign access roles (Admin, Manager, Employee, Power User), and enforce permission boundaries.')}
          </p>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('Registered System Users')}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('User ID')}</th>
                <th className="px-4 py-3 font-semibold">{t('User Name')}</th>
                <th className="px-4 py-3 font-semibold">{t('Email Address')}</th>
                <th className="px-4 py-3 font-semibold">{t('System Role')}</th>
                <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                <th className="px-4 py-3 font-semibold">{t('Created Date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    {t('No users registered in system.')}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600">{u.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 font-bold">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase border ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          u.role === 'WAREHOUSE_MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            u.role === 'POWER_USER' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                        {t(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{t('ACTIVE')}</td>
                    <td className="px-4 py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Permission Matrix */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('System Permission Matrix')}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Module Feature')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('Administrator')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('Warehouse Manager')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('Warehouse Employee')}</th>
                <th className="px-4 py-3 text-center font-semibold">{t('Power User')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {permissionMatrix.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.module}</td>
                  <td className="px-4 py-3 text-center">
                    {item.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.manager ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.employee ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.power ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <span className="text-slate-300">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
