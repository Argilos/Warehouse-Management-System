import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { CreateServiceOrderModal } from './CreateServiceOrderModal';
import { formatCurrency } from '../../utils/depreciation';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Wrench, Plus, Send } from 'lucide-react';

export const MaintenanceModule: React.FC = () => {
  const {
    serviceOrders, assets, suppliers, completeServiceOrder, activeRole
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dispatchModalOrderId, setDispatchModalOrderId] = useState<string | null>(null);
  const [dispatchModalAssetId, setDispatchModalAssetId] = useState<string | undefined>(undefined);
  const [dispatchModalDesc, setDispatchModalDesc] = useState<string | undefined>(undefined);

  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [repairCost, setRepairCost] = useState<number>(100);
  const [replacedParts, setReplacedParts] = useState<string>('Standard seal replacement');

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleOpenDispatchModal = (srv: any) => {
    setDispatchModalOrderId(srv.id);
    setDispatchModalAssetId(srv.assetId);
    setDispatchModalDesc(srv.problemDescription);
  };

  const handleSubmitComplete = (e: React.FormEvent) => {
    e.preventDefault();
    if (completeModalId) {
      completeServiceOrder(completeModalId, repairCost, replacedParts);
      setCompleteModalId(null);
    }
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            <span>{t('Maintenance, Repairs & Service Management')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Log equipment breakdown reports, track repairs with supplier vendors, and record repair invoices.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER' || activeRole === 'POWER_USER') && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Create Service Repair Order')}</span>
          </button>
        )}
      </div>

      {/* Service Orders Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('Active & Historical Service Orders')}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Order ID')}</th>
                <th className="px-4 py-3 font-semibold">{t('Asset Equipment')}</th>
                <th className="px-4 py-3 font-semibold">{t('Service Vendor Supplier')}</th>
                <th className="px-4 py-3 font-semibold">{t('Problem Description')}</th>
                <th className="px-4 py-3 font-semibold">{t('Sent Date')}</th>
                <th className="px-4 py-3 font-semibold">{t('Status')}</th>
                <th className="px-4 py-3 font-semibold">{t('Repair Cost')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {serviceOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    {t('No service orders registered.')}
                  </td>
                </tr>
              ) : (
                serviceOrders.map((srv) => (
                  <tr key={srv.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600">{srv.id}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {srv.assetName}
                      <span className="font-mono text-[10px] text-slate-400 block">{srv.assetNumber}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{srv.supplierName || t('Internal Workshop')}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{srv.problemDescription}</td>
                    <td className="px-4 py-3 text-slate-400">{srv.sentDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        srv.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        srv.status === 'PENDING' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {t(srv.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(srv.repairCost)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {srv.status === 'PENDING' && (
                          <button
                            onClick={() => handleOpenDispatchModal(srv)}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] transition-all flex items-center gap-1 shadow-sm"
                          >
                            <Send className="w-3 h-3 text-amber-600" />
                            <span>{t('Dispatch Service Order')}</span>
                          </button>
                        )}
                        {srv.status !== 'COMPLETED' && (
                          <button
                            onClick={() => {
                              setCompleteModalId(srv.id);
                              setRepairCost(srv.repairCost || 150);
                              setReplacedParts(srv.replacedParts || '');
                            }}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] transition-all"
                          >
                            {t('Complete Order')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Service Order Modal */}
      <CreateServiceOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Dispatch Pending Service Order Modal */}
      {dispatchModalOrderId && (
        <CreateServiceOrderModal
          isOpen={!!dispatchModalOrderId}
          onClose={() => {
            setDispatchModalOrderId(null);
            setDispatchModalAssetId(undefined);
            setDispatchModalDesc(undefined);
          }}
          existingServiceOrderId={dispatchModalOrderId}
          preselectedAssetId={dispatchModalAssetId}
          preselectedDescription={dispatchModalDesc}
        />
      )}

      {/* Complete Order Modal */}
      <Modal isOpen={!!completeModalId} onClose={() => setCompleteModalId(null)} title={t('Mark Service Order as Completed')}>
        <form onSubmit={handleSubmitComplete} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>{t('Total Repair Cost ($)')}</label>
            <input
              type="number"
              required
              value={repairCost}
              onChange={(e) => setRepairCost(parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('Replaced Spare Parts & Work Performed')}</label>
            <textarea
              rows={3}
              required
              value={replacedParts}
              onChange={(e) => setReplacedParts(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setCompleteModalId(null)} className="btn-ghost">
              {t('Cancel')}
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              {t('Complete & Re-Activate Asset')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
