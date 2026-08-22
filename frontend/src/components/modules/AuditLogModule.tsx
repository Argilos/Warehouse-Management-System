import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { History, Search } from 'lucide-react';

export const AuditLogModule: React.FC = () => {
  const { auditLogs } = useWarehouseStore();
  const { t } = useLanguageStore();
  const [search, setSearch] = useState('');

  const filteredLogs = auditLogs.filter(log =>
    log.userName.toLowerCase().includes(search.toLowerCase()) ||
    log.entity.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <span>{t('Immutable System Audit Trail Log')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Full forensic audit history tracking every asset modification, checkout, repair, calibration, and role change.')}
          </p>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('Search audit logs...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-surface-200 text-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('System Activity Trail')} ({filteredLogs.length} {t('events logged')})</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Timestamp')}</th>
                <th className="px-4 py-3 font-semibold">{t('Performed User')}</th>
                <th className="px-4 py-3 font-semibold">{t('Role')}</th>
                <th className="px-4 py-3 font-semibold">{t('Entity')}</th>
                <th className="px-4 py-3 font-semibold">{t('Action')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('Details Payload')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400 font-sans">
                    {t('No audit log events recorded yet.')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-sans font-semibold text-slate-800">{log.userName}</td>
                    <td className="px-4 py-3 text-[10px]">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-sans font-semibold">
                        {t(log.userRole)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-brand-600 font-semibold">{log.entity}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{log.action}</td>
                    <td className="px-4 py-3 text-right font-sans">
                      <button
                        onClick={() => alert(JSON.stringify(log.newValues || log.oldValues || {}, null, 2))}
                        className="px-2.5 py-1 bg-surface-100 hover:bg-surface-200 text-purple-700 rounded border border-surface-200 font-semibold text-[10px]"
                      >
                        {t('View JSON Payload')}
                      </button>
                    </td>
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
