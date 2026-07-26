import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { 
  ArrowLeftRight, CheckCircle2
} from 'lucide-react';

export const ToolIssuingModule: React.FC = () => {
  const { 
    assets, employees, projects, transactions, issueAssets, returnAsset 
  } = useWarehouseStore();

  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState<string>('');

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [checkoutNotes, setCheckoutNotes] = useState<string>('');

  const [returnCondition, setReturnCondition] = useState<string>('GOOD');
  const [returnNotes, setReturnNotes] = useState<string>('');

  const availableAssets = assets.filter((a) => a.status === 'AVAILABLE');
  const issuedAssets = assets.filter((a) => a.status === 'ISSUED');

  const toggleAssetSelection = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirmIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId || selectedAssetIds.length === 0) {
      alert('Please select an employee and at least one equipment item to issue.');
      return;
    }

    issueAssets(selectedAssetIds, selectedEmployeeId, selectedProjectId || undefined, expectedReturnDate, checkoutNotes);
    setIsIssueModalOpen(false);
    setSelectedAssetIds([]);
    setCheckoutNotes('');
  };

  const handleConfirmReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForReturn) return;

    returnAsset(selectedAssetForReturn, returnCondition, returnNotes);
    setIsReturnModalOpen(false);
    setSelectedAssetForReturn('');
    setReturnNotes('');
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-brand-600" />
            <span>Tool Issuing & Returning Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Process tool checkouts to field staff, project allocations, condition verification on return, and digital receipts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (employees.length > 0) setSelectedEmployeeId(employees[0].id);
              setIsIssueModalOpen(true);
            }}
            className="btn-primary"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>Issue Equipment</span>
          </button>

          <button
            onClick={() => {
              if (issuedAssets.length > 0) setSelectedAssetForReturn(issuedAssets[0].id);
              setIsReturnModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Return Tool</span>
          </button>
        </div>
      </div>

      {/* Active Loans Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between">
          <span>Active Equipment Checked Out in Field ({issuedAssets.length})</span>
          <span className="text-xs font-normal text-slate-400">Total active custody loans</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">Asset Code</th>
                <th className="px-4 py-3 font-semibold">Equipment Name</th>
                <th className="px-4 py-3 font-semibold">Assigned Employee</th>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold">Location / Site</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {issuedAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No tools are currently checked out in the field.
                  </td>
                </tr>
              ) : (
                issuedAssets.map((ast) => (
                  <tr key={ast.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-brand-600">{ast.assetNumber}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{ast.name}</td>
                    <td className="px-4 py-3 text-emerald-700 font-medium">{ast.holderEmployeeName || 'N/A'}</td>
                    <td className="px-4 py-3 text-slate-500">Field Operations</td>
                    <td className="px-4 py-3 text-slate-600">{ast.location}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedAssetForReturn(ast.id);
                          setIsReturnModalOpen(true);
                        }}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-semibold text-[11px] transition-all"
                      >
                        Process Return
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Audit Log Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">Recent Issue & Return Transaction Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Transaction Type</th>
                <th className="px-4 py-3 font-semibold">Asset</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Project</th>
                <th className="px-4 py-3 font-semibold">Issued By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 6).map((trx) => (
                  <tr key={trx.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {new Date(trx.transactionDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                        trx.transactionType === 'ISSUE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {trx.transactionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{trx.assetName}</td>
                    <td className="px-4 py-3 text-slate-600">{trx.employeeName || 'Warehouse'}</td>
                    <td className="px-4 py-3 text-slate-500">{trx.projectName || 'Standard Issue'}</td>
                    <td className="px-4 py-3 text-slate-400">{trx.performedByName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Modal */}
      <Modal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} title="Issue Equipment to Employee">
        <form onSubmit={handleConfirmIssue} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Select Employee Recipient</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={inputClass}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName} ({e.employeeNumber}) - {e.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Assign to Project (Optional)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className={inputClass}
            >
              <option value="">No Specific Project (General Field Assignment)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectCode} - {p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Select Available Tools to Checkout ({selectedAssetIds.length} selected)</label>
            <div className="max-h-48 overflow-y-auto bg-surface-50 border border-surface-200 rounded-lg p-2 space-y-1">
              {availableAssets.length === 0 ? (
                <p className="text-slate-400 p-2 text-center">No available tools in warehouse storage.</p>
              ) : (
                availableAssets.map((ast) => {
                  const isSelected = selectedAssetIds.includes(ast.id);
                  return (
                    <div
                      key={ast.id}
                      onClick={() => toggleAssetSelection(ast.id)}
                      className={`p-2 rounded cursor-pointer flex items-center justify-between border transition-all ${
                        isSelected ? 'bg-brand-50 border-brand-300 text-brand-900' : 'bg-white border-surface-200 text-slate-700 hover:bg-surface-100'
                      }`}
                    >
                      <div>
                        <span className="font-semibold">{ast.name}</span>
                        <span className="font-mono text-[10px] text-slate-400 block">{ast.assetNumber} • {ast.location}</span>
                      </div>
                      <input type="checkbox" checked={isSelected} readOnly className="rounded text-brand-600" />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Expected Return Date</label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Issuing Notes / Included Accessories</label>
            <textarea
              rows={2}
              placeholder="e.g. Include 2 battery packs, charger, and carrying case."
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsIssueModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Confirm Tool Issue
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Process Equipment Return">
        <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Select Tool Being Returned</label>
            <select
              value={selectedAssetForReturn}
              onChange={(e) => setSelectedAssetForReturn(e.target.value)}
              className={inputClass}
            >
              {issuedAssets.map((ast) => (
                <option key={ast.id} value={ast.id}>
                  {ast.name} ({ast.assetNumber}) - Held by: {ast.holderEmployeeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Returned Tool Condition Grade</label>
            <select
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              className={inputClass}
            >
              <option value="GOOD">GOOD (Excellent condition, clean)</option>
              <option value="MINOR_WEAR">MINOR WEAR (Standard field wear)</option>
              <option value="DAMAGED">DAMAGED (Requires service order repair)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Return Notes / Inspection Remarks</label>
            <textarea
              rows={3}
              placeholder="e.g. All accessories present. Cleaned and returned to Rack B-04."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsReturnModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95">
              Process Return
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
