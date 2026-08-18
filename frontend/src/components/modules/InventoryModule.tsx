import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { useLanguageStore } from '../../store/useLanguageStore';
import { ClipboardCheck, Plus, CheckCircle, Check } from 'lucide-react';

export const InventoryModule: React.FC = () => {
  const {
    inventoryChecks, assets, createInventoryCheck, verifyInventoryItem, completeInventoryCheck, activeRole
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState(t('Q3 Warehouse Physical Inventory Audit'));
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [itemConditions, setItemConditions] = useState<Record<string, 'GOOD' | 'DAMAGED' | 'MISSING'>>({});

  const handleStartAudit = (e: React.FormEvent) => {
    e.preventDefault();
    createInventoryCheck(title);
    setIsModalOpen(false);
  };

  const handleVerify = (assetId: string, condition: 'GOOD' | 'DAMAGED' | 'MISSING') => {
    setItemConditions(prev => ({ ...prev, [assetId]: condition }));
    if (selectedAuditId) {
      verifyInventoryItem(selectedAuditId, assetId, condition);
    }
  };

  const handleOpenAuditModal = (auditId: string) => {
    setSelectedAuditId(auditId);
    setItemConditions({});
  };

  const handleSubmitAudit = async () => {
    if (selectedAuditId) {
      await completeInventoryCheck(selectedAuditId);
      setSelectedAuditId(null);
    }
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            <span>{t('Physical Inventory Audit & Cycle Counts')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Conduct periodic warehouse floor inventory audits, verify tool presence by QR scan, and generate variance discrepancy reports.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Start New Inventory Audit Session')}</span>
          </button>
        )}
      </div>

      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('Physical Inventory Audit History')}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Audit Number')}</th>
                <th className="px-4 py-3 font-semibold">{t('Audit Title')}</th>
                <th className="px-4 py-3 font-semibold">{t('Date')}</th>
                <th className="px-4 py-3 font-semibold">{t('Auditor')}</th>
                <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                <th className="px-4 py-3 font-semibold">{t('Verified / Total')}</th>
                <th className="px-4 py-3 font-semibold">{t('Variances (Missing/Damaged)')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {inventoryChecks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    {t('No inventory audits created yet.')}
                  </td>
                </tr>
              ) : (
                inventoryChecks.map((chk) => (
                  <tr key={chk.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-mono font-bold text-emerald-700">{chk.checkNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{chk.title}</td>
                    <td className="px-4 py-3 text-slate-400">{chk.checkDate}</td>
                    <td className="px-4 py-3 text-slate-600">{chk.performedByName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${chk.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        {t(chk.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {chk.verifiedAssets} / {chk.totalAssets}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-amber-700 font-bold">{chk.damagedAssets} {t('Damaged')}</span>,{' '}
                      <span className="text-red-600 font-bold">{chk.missingAssets} {t('Missing')}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenAuditModal(chk.id)}
                        className="px-2.5 py-1 bg-surface-100 hover:bg-brand-50 text-brand-700 border border-surface-200 rounded font-semibold text-[11px]"
                      >
                        {t('Audit Checklist')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Checklist Modal */}
      <Modal isOpen={!!selectedAuditId} onClose={() => setSelectedAuditId(null)} title={t('Inventory Audit Checklist & Verification')}>
        <div className="space-y-4 text-xs">
          <p className="text-slate-500">{t('Select condition state for each tool scanned during this physical warehouse check:')}</p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {assets.map((ast) => {
              const selectedCondition = itemConditions[ast.id];

              return (
                <div key={ast.id} className="p-3 bg-surface-50 border border-surface-200 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-800">{ast.name}</span>
                    <span className="font-mono text-[10px] text-slate-400 block">{ast.assetNumber} • {t('Location:')} {ast.location}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleVerify(ast.id, 'GOOD')}
                      className={
                        selectedCondition === 'GOOD'
                          ? 'px-3 py-1.5 bg-emerald-600 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all ring-2 ring-emerald-300 scale-105'
                          : 'px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[10px] transition-all'
                      }
                    >
                      {selectedCondition === 'GOOD' && <Check className="w-3.5 h-3.5" />}
                      <span>{t('GOOD')}</span>
                    </button>
                    <button
                      onClick={() => handleVerify(ast.id, 'DAMAGED')}
                      className={
                        selectedCondition === 'DAMAGED'
                          ? 'px-3 py-1.5 bg-amber-600 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all ring-2 ring-amber-300 scale-105'
                          : 'px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded font-semibold text-[10px] transition-all'
                      }
                    >
                      {selectedCondition === 'DAMAGED' && <Check className="w-3.5 h-3.5" />}
                      <span>{t('DAMAGED')}</span>
                    </button>
                    <button
                      onClick={() => handleVerify(ast.id, 'MISSING')}
                      className={
                        selectedCondition === 'MISSING'
                          ? 'px-3 py-1.5 bg-red-600 text-white rounded font-bold text-[11px] shadow-sm flex items-center gap-1 transition-all ring-2 ring-red-300 scale-105'
                          : 'px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-semibold text-[10px] transition-all'
                      }
                    >
                      {selectedCondition === 'MISSING' && <Check className="w-3.5 h-3.5" />}
                      <span>{t('MISSING')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-surface-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              {t('Verified:')} <span className="font-bold text-slate-800">{Object.keys(itemConditions).length} / {assets.length} {t('items')}</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedAuditId(null)}
                className="btn-ghost"
              >
                {t('Close')}
              </button>
              <button
                type="button"
                onClick={handleSubmitAudit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{t('Submit & Finalize Audit')}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Start Audit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('Start New Inventory Audit Session')}>
        <form onSubmit={handleStartAudit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>{t('Audit Session Title')}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              {t('Cancel')}
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              {t('Launch Audit Session')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

