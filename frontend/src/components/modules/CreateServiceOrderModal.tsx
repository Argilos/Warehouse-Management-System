import React, { useState, useEffect } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Modal } from '../common/Modal';
import { Wrench, Send, AlertTriangle } from 'lucide-react';

interface CreateServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAssetId?: string;
  preselectedDescription?: string;
  existingServiceOrderId?: string;
  onSuccess?: (order?: any) => void;
}

export const CreateServiceOrderModal: React.FC<CreateServiceOrderModalProps> = ({
  isOpen,
  onClose,
  preselectedAssetId,
  preselectedDescription,
  existingServiceOrderId,
  onSuccess,
}) => {
  const { assets, suppliers, serviceOrders, createServiceOrder, dispatchServiceOrder } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Eligible assets for repair: exclude LOST, MISSING, RETIRED
  const serviceableAssets = assets.filter(
    (a) => a.status !== 'LOST' && a.status !== 'MISSING' && a.status !== 'RETIRED'
  );

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (preselectedAssetId) {
        setSelectedAssetId(preselectedAssetId);
      } else if (serviceableAssets.length > 0 && !selectedAssetId) {
        setSelectedAssetId(serviceableAssets[0].id);
      }

      if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }

      if (preselectedDescription) {
        setProblemDescription(preselectedDescription);
      } else if (existingServiceOrderId) {
        const existingOrder = serviceOrders.find((so) => so.id === existingServiceOrderId);
        if (existingOrder) {
          setProblemDescription(existingOrder.problemDescription || '');
          if (existingOrder.supplierId) setSelectedSupplierId(existingOrder.supplierId);
          if (existingOrder.assetId) setSelectedAssetId(existingOrder.assetId);
        }
      } else {
        setProblemDescription('');
      }
    }
  }, [isOpen, preselectedAssetId, preselectedDescription, existingServiceOrderId, suppliers, serviceOrders]);

  const activeAsset = assets.find((a) => a.id === selectedAssetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId && !existingServiceOrderId) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let res;
      if (existingServiceOrderId) {
        res = await dispatchServiceOrder(existingServiceOrderId, selectedSupplierId, problemDescription);
      } else {
        res = await createServiceOrder(selectedAssetId, selectedSupplierId, problemDescription);
      }
      if (onSuccess) onSuccess(res);
      onClose();
    } catch (err: any) {
      console.error('Failed to submit service repair order:', err);
      setErrorMsg(err.message || t('Failed to create or dispatch service order'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingServiceOrderId ? t('Dispatch Service Repair Order') : t('Create Service Repair Order')}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Info Banner */}
        <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
          <Wrench className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-semibold text-xs text-amber-900">
              {existingServiceOrderId
                ? t('Dispatching Pending Service Order')
                : t('Service Repair Order Dispatch')}
            </p>
            <p className="text-[11px] text-amber-700 leading-normal">
              {t(
                'Dispatching this order assigns a certified vendor and transitions the equipment status to IN_SERVICE until repair completion.'
              )}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Asset Selection */}
        <div>
          <label className={labelClass}>{t('Select Asset Equipment')}</label>
          {preselectedAssetId && activeAsset ? (
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-xs">{activeAsset.name}</span>
                <span className="font-mono text-[10px] text-slate-500 block">
                  {activeAsset.assetNumber} {activeAsset.serialNumber ? `• SN: ${activeAsset.serialNumber}` : ''}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-bold text-[10px]">
                {t(activeAsset.status)}
              </span>
            </div>
          ) : (
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className={inputClass}
              required
            >
              {serviceableAssets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.assetNumber}) - {t(a.status)}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Repair Vendor Selection */}
        <div>
          <label className={labelClass}>{t('Service Supplier Repair Vendor')}</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className={inputClass}
          >
            <option value="">{t('Internal Workshop / General Maintenance')}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName} {s.services ? `(${s.services})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Problem Description */}
        <div>
          <label className={labelClass}>{t('Detailed Problem Breakdown Description')}</label>
          <textarea
            rows={3}
            required
            placeholder={t('Describe malfunction, broken parts, or required service...')}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-100">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={isSubmitting}>
            {t('Cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? t('Dispatching...') : t('Dispatch Service Order')}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
