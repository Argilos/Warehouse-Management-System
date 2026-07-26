import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/depreciation';
import { Wrench, Plus } from 'lucide-react';

export const MaintenanceModule: React.FC = () => {
  const { 
    serviceOrders, assets, suppliers, createServiceOrder, completeServiceOrder, activeRole 
  } = useWarehouseStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [problemDescription, setProblemDescription] = useState('');

  const [completeModalId, setCompleteModalId] = useState<string | null>(null);
  const [repairCost, setRepairCost] = useState<number>(100);
  const [replacedParts, setReplacedParts] = useState<string>('Standard seal replacement');

  const handleOpenCreateModal = () => {
    if (assets.length > 0) setSelectedAssetId(assets[0].id);
    if (suppliers.length > 0) setSelectedSupplierId(suppliers[0].id);
    setProblemDescription('');
    setIsModalOpen(true);
  };

  const handleSubmitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createServiceOrder(selectedAssetId, selectedSupplierId, problemDescription);
    setIsModalOpen(false);
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
            <span>Maintenance, Repairs & Service Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log equipment breakdown reports, track repairs with supplier vendors, and record repair invoices.
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER' || activeRole === 'POWER_USER') && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Service Repair Order</span>
          </button>
        )}
      </div>

      {/* Service Orders Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">Active & Historical Service Orders</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">Order ID</th>
                <th className="px-4 py-3 font-semibold">Asset Equipment</th>
                <th className="px-4 py-3 font-semibold">Service Vendor Supplier</th>
                <th className="px-4 py-3 font-semibold">Problem Description</th>
                <th className="px-4 py-3 font-semibold">Sent Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Repair Cost</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {serviceOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                    No service orders registered.
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
                    <td className="px-4 py-3 text-slate-600">{srv.supplierName || 'Internal Workshop'}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{srv.problemDescription}</td>
                    <td className="px-4 py-3 text-slate-400">{srv.sentDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        srv.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {srv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{formatCurrency(srv.repairCost)}</td>
                    <td className="px-4 py-3 text-right">
                      {srv.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setCompleteModalId(srv.id);
                            setRepairCost(srv.repairCost || 150);
                            setReplacedParts(srv.replacedParts || '');
                          }}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] transition-all"
                        >
                          Complete Order
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Service Repair Order">
        <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Select Asset Equipment</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className={inputClass}
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.assetNumber}) - {a.status}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Service Supplier Repair Vendor</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className={inputClass}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.companyName} ({s.services})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Detailed Problem Breakdown Description</label>
            <textarea
              rows={3}
              required
              placeholder="Describe malfunction, broken parts, or preventative oil change required..."
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold shadow-sm">
              Dispatch Service Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Order Modal */}
      <Modal isOpen={!!completeModalId} onClose={() => setCompleteModalId(null)} title="Mark Service Order as Completed">
        <form onSubmit={handleSubmitComplete} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Total Repair Cost ($)</label>
            <input
              type="number"
              required
              value={repairCost}
              onChange={(e) => setRepairCost(parseFloat(e.target.value) || 0)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Replaced Spare Parts & Work Performed</label>
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
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              Complete & Re-Activate Asset
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
