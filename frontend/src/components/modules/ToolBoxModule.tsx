import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { Package, Plus, User } from 'lucide-react';

export const ToolBoxModule: React.FC = () => {
  const { 
    toolBoxes, assets, employees, createToolBox, activeRole 
  } = useWarehouseStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [boxNumber, setBoxNumber] = useState('');
  const [name, setName] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  const handleOpenCreateModal = () => {
    const randId = Math.floor(10 + Math.random() * 90);
    setBoxNumber(`TBX-KIT-${randId}`);
    setName(`Master Service Toolkit #${randId}`);
    setSelectedEmployeeId(employees[0]?.id || '');
    setSelectedAssetIds([]);
    setIsModalOpen(true);
  };

  const handleToggleAsset = (id: string) => {
    setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createToolBox(boxNumber, name, selectedAssetIds, selectedEmployeeId || undefined);
    setIsModalOpen(false);
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            <span>Tool Box & Equipment Kit Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Assemble permanent tool kits, assign toolboxes to technician vans, and conduct periodic kit component audits.
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER') && (
          <button onClick={handleOpenCreateModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>Assemble New Tool Box Kit</span>
          </button>
        )}
      </div>

      {/* Tool Box Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {toolBoxes.length === 0 ? (
          <div className="col-span-full glass-panel p-8 text-center text-slate-400 text-xs">
            No tool boxes assembled yet. Click "Assemble New Tool Box Kit" to create kits.
          </div>
        ) : (
          toolBoxes.map((tb) => (
            <div key={tb.id} className="glass-card p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {tb.boxNumber}
                  </span>
                  <h3 className="font-bold text-base text-slate-800 mt-1.5">{tb.name}</h3>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  tb.status === 'ASSIGNED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {tb.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-700 bg-surface-50 p-2.5 rounded-lg border border-surface-200">
                <User className="w-4 h-4 text-brand-600" />
                <span className="text-slate-500">Technician:</span>
                <span className="font-semibold text-slate-800">{tb.employeeName || 'Unassigned'}</span>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Included Tools ({tb.items.length})
                </p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {tb.items.map((item) => (
                    <div key={item.id} className="text-xs p-2 bg-surface-50 rounded border border-surface-200 flex items-center justify-between">
                      <span className="text-slate-800 font-medium">{item.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.assetNumber}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-surface-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Inspected: {tb.lastInspectedDate || 'Not inspected'}</span>
                <button
                  onClick={() => alert(`Tool Box Kit ${tb.boxNumber} inspection logged clean.`)}
                  className="px-2.5 py-1 bg-surface-100 hover:bg-brand-50 text-brand-700 border border-surface-200 rounded font-medium transition-all"
                >
                  Log Kit Audit
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Assemble Tool Box Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assemble New Tool Box Kit">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Tool Box Kit Identifier Number</label>
            <input
              type="text"
              required
              value={boxNumber}
              onChange={(e) => setBoxNumber(e.target.value)}
              className={inputClass + ' font-mono'}
            />
          </div>

          <div>
            <label className={labelClass}>Tool Box Package Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Assign Custody to Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={inputClass}
            >
              <option value="">Unassigned (Stored in Warehouse)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.department})</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Select Component Tools to Pack into Kit ({selectedAssetIds.length} packed)</label>
            <div className="max-h-48 overflow-y-auto bg-surface-50 border border-surface-200 rounded-lg p-2 space-y-1">
              {assets.map((ast) => {
                const isPacked = selectedAssetIds.includes(ast.id);
                return (
                  <div
                    key={ast.id}
                    onClick={() => handleToggleAsset(ast.id)}
                    className={`p-2 rounded cursor-pointer flex items-center justify-between border transition-all ${
                      isPacked ? 'bg-brand-50 border-brand-300 text-brand-900' : 'bg-white border-surface-200 text-slate-700 hover:bg-surface-100'
                    }`}
                  >
                    <div>
                      <span className="font-semibold">{ast.name}</span>
                      <span className="font-mono text-[10px] text-slate-400 block">{ast.assetNumber}</span>
                    </div>
                    <input type="checkbox" checked={isPacked} readOnly className="text-brand-600 rounded" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Assemble Tool Box Kit
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
