import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { useLanguageStore } from '../../store/useLanguageStore';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { ToolBox } from '../../types';
import { exportToolboxInventorySheetPDF } from '../../utils/pdfReportGenerator';
import { Printer, CheckCircle2, AlertTriangle, FileText, ClipboardList, ShieldAlert } from 'lucide-react';

interface ToolboxInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolBox: ToolBox | null;
}

export const ToolboxInventoryModal: React.FC<ToolboxInventoryModalProps> = ({
  isOpen,
  onClose,
  toolBox,
}) => {
  const { t } = useLanguageStore();
  const { startToolboxInventory, verifyInventoryItem, completeInventoryCheck, currentUser } = useWarehouseStore();

  const [activeCheck, setActiveCheck] = useState<any | null>(null);
  const [itemConditions, setItemConditions] = useState<Record<string, 'GOOD' | 'DAMAGED' | 'MISSING'>>({});
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auditStep, setAuditStep] = useState<'START' | 'INSPECT' | 'SUMMARY'>('START');

  useEffect(() => {
    if (toolBox && isOpen) {
      setAuditStep('START');
      setActiveCheck(null);
      const initialConditions: Record<string, 'GOOD' | 'DAMAGED' | 'MISSING'> = {};
      const initialCounts: Record<string, number> = {};
      toolBox.items.forEach(item => {
        initialConditions[item.id] = 'GOOD';
        initialCounts[item.id] = 1;
      });
      setItemConditions(initialConditions);
      setItemCounts(initialCounts);
    }
  }, [toolBox, isOpen]);

  if (!toolBox) return null;

  const handleStartInventory = async () => {
    setIsSubmitting(true);
    try {
      const check = await startToolboxInventory(toolBox.id);
      setActiveCheck(check);
      setAuditStep('INSPECT');
    } catch (err) {
      console.error('Failed to start toolbox inventory:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintSheet = () => {
    exportToolboxInventorySheetPDF(toolBox, toolBox.items);
  };

  const handleConditionChange = (assetId: string, cond: 'GOOD' | 'DAMAGED' | 'MISSING') => {
    setItemConditions(prev => ({ ...prev, [assetId]: cond }));
    if (cond === 'MISSING') {
      setItemCounts(prev => ({ ...prev, [assetId]: 0 }));
    } else {
      setItemCounts(prev => ({ ...prev, [assetId]: 1 }));
    }
  };

  const handleCountChange = (assetId: string, count: number) => {
    setItemCounts(prev => ({ ...prev, [assetId]: count }));
    if (count === 0) {
      setItemConditions(prev => ({ ...prev, [assetId]: 'MISSING' }));
    }
  };

  const handleCompleteInventory = async () => {
    if (!activeCheck) return;
    setIsSubmitting(true);
    try {
      for (const item of toolBox.items) {
        const cond = itemConditions[item.id] || 'GOOD';
        await verifyInventoryItem(activeCheck.id, item.id, cond);
      }
      await completeInventoryCheck(activeCheck.id);
      setAuditStep('SUMMARY');
    } catch (err) {
      console.error('Failed to complete toolbox inventory audit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const missingCount = Object.values(itemConditions).filter(c => c === 'MISSING').length;
  const damagedCount = Object.values(itemConditions).filter(c => c === 'DAMAGED').length;
  const verifiedCount = toolBox.items.length - missingCount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${t('Inventurni list')} / ${t('Toolbox Inventory Audit')}: ${toolBox.name}`}>
      <div className="space-y-5 text-xs">

        {/* Workflow Progress Bar */}
        <div className="grid grid-cols-3 gap-2 bg-surface-100 p-1.5 rounded-lg border border-surface-200 text-center font-bold text-[11px]">
          <div className={`py-1.5 rounded ${auditStep === 'START' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'}`}>
            1. {t('Start Audit')}
          </div>
          <div className={`py-1.5 rounded ${auditStep === 'INSPECT' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'}`}>
            2. {t('Physical Inspection')}
          </div>
          <div className={`py-1.5 rounded ${auditStep === 'SUMMARY' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'}`}>
            3. {t('Audit Result')}
          </div>
        </div>

        {/* STEP 1: START INVENTORY & GENERATE SHEET */}
        {auditStep === 'START' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-brand-50 border border-brand-200 rounded-full flex items-center justify-center mx-auto text-brand-600">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-800">{t('Initialize Physical Stock Audit for Toolbox')}</h3>
              <p className="text-slate-500 mt-1 max-w-md mx-auto">
                {t('This will create an official inventory record (INV-KIT-2026-XXX) and allow printing a physical inspection sheet with an intentionally blank count column for warehouse staff.')}
              </p>
            </div>

            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200 text-left space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('Toolbox Kit:')}</span>
                <span className="font-bold text-slate-800">{toolBox.name} ({toolBox.boxNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('Assigned Technician:')}</span>
                <span className="font-semibold text-slate-800">{toolBox.employeeName || t('Unassigned')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('Expected Component Count:')}</span>
                <span className="font-bold text-brand-600">{toolBox.items.length} {t('items')}</span>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <button onClick={handlePrintSheet} className="btn-secondary flex items-center gap-2">
                <Printer className="w-4 h-4" />
                <span>{t('Print Blank Inventory Sheet (PDF)')}</span>
              </button>

              <button
                onClick={handleStartInventory}
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? t('Starting Audit...') : t('Start Stock Audit')}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PHYSICAL INSPECTION & RESULTS ENTRY */}
        {auditStep === 'INSPECT' && activeCheck && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-surface-50 p-3 rounded-lg border border-surface-200">
              <div>
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                  {activeCheck.checkNumber}
                </span>
                <span className="font-semibold text-slate-800 ml-2">{toolBox.name}</span>
              </div>
              <button onClick={handlePrintSheet} className="px-3 py-1.5 bg-white border border-surface-200 text-slate-700 hover:bg-surface-100 rounded font-semibold text-xs flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>{t('Print Sheet')}</span>
              </button>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                {t('Toolbox Component Inspection & Verification')} ({toolBox.items.length} {t('components')})
              </h4>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {toolBox.items.map((item) => {
                  const cond = itemConditions[item.id] || 'GOOD';
                  const count = itemCounts[item.id] !== undefined ? itemCounts[item.id] : 1;
                  const diff = count - 1; // Expected is 1 per toolbox component

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cond === 'MISSING' ? 'bg-rose-50 border-rose-200' : cond === 'DAMAGED' ? 'bg-amber-50 border-amber-200' : 'bg-white border-surface-200'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{item.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">({item.assetNumber})</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{item.category} • {item.serialNumber || 'No S/N'}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Physical Count Input */}
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 text-[11px]">{t('Actual:')}</span>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            value={count}
                            onChange={(e) => handleCountChange(item.id, parseInt(e.target.value) || 0)}
                            className="w-12 text-center bg-white border border-surface-200 rounded py-1 text-xs font-bold text-slate-800"
                          />
                        </div>

                        {/* Discrepancy indicator */}
                        {diff < 0 && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px]">
                            {diff} ({t('Missing')})
                          </span>
                        )}

                        {/* Condition Selector */}
                        <div className="flex items-center gap-1 bg-surface-100 p-1 rounded border border-surface-200">
                          <button
                            type="button"
                            onClick={() => handleConditionChange(item.id, 'GOOD')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${cond === 'GOOD' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            {t('GOOD')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConditionChange(item.id, 'DAMAGED')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${cond === 'DAMAGED' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            {t('DAMAGED')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConditionChange(item.id, 'MISSING')}
                            className={`px-2 py-1 rounded text-[10px] font-bold ${cond === 'MISSING' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                          >
                            {t('MISSING')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-100">
              <div className="text-[11px] text-slate-500">
                {missingCount > 0 ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <ShieldAlert className="w-4 h-4" />
                    {missingCount} {t('missing item(s) detected. Missing tools will be deducted from fleet assets.')}
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('All toolbox items verified intact.')}
                  </span>
                )}
              </div>

              <button
                onClick={handleCompleteInventory}
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? t('Completing...') : t('Complete Inventory Audit')}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: AUDIT COMPLETE SUMMARY */}
        {auditStep === 'SUMMARY' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-800">{t('Toolbox Inventory Completed')}</h3>
              <p className="text-slate-500 mt-1">{t('Audit results successfully calculated and archived in database history.')}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-[10px] text-emerald-700 font-bold uppercase">{t('Verified')}</p>
                <p className="text-xl font-extrabold text-emerald-800 mt-1">{verifiedCount} / {toolBox.items.length}</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[10px] text-amber-700 font-bold uppercase">{t('Damaged')}</p>
                <p className="text-xl font-extrabold text-amber-800 mt-1">{damagedCount}</p>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-[10px] text-rose-700 font-bold uppercase">{t('Missing')}</p>
                <p className="text-xl font-extrabold text-rose-800 mt-1">{missingCount}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-100 flex justify-center">
              <button onClick={onClose} className="btn-primary">
                {t('Close Audit')}
              </button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
