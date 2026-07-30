import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { CalibrationResult } from '../../types';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Gauge, Plus, AlertTriangle, FileText } from 'lucide-react';

export const CalibrationModule: React.FC = () => {
  const {
    calibrations, assets, suppliers, addCalibrationRecord, activeRole
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [calibrationDate, setCalibrationDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextCalibrationDate, setNextCalibrationDate] = useState(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [certificateNumber, setCertificateNumber] = useState('');
  const [result, setResult] = useState<CalibrationResult>('PASS');
  const [notes, setNotes] = useState('');

  const measuringAssets = assets.filter((a) => a.category === 'Measuring Devices' || a.name.toLowerCase().includes('multimeter') || a.name.toLowerCase().includes('laser') || a.name.toLowerCase().includes('micrometer'));

  const handleOpenModal = () => {
    const randCert = Math.floor(1000 + Math.random() * 9000);
    setCertificateNumber(`CERT-FLK-2026-${randCert}`);
    if (measuringAssets.length > 0) setSelectedAssetId(measuringAssets[0].id);
    if (suppliers.length > 0) setProviderId(suppliers[0].id);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ast = assets.find(a => a.id === selectedAssetId);
    const sup = suppliers.find(s => s.id === providerId);

    addCalibrationRecord({
      assetId: selectedAssetId,
      assetName: ast?.name || '',
      assetNumber: ast?.assetNumber || '',
      providerId,
      providerName: sup?.companyName || 'Fluke Calibration',
      calibrationDate,
      nextCalibrationDate,
      certificateNumber,
      result,
      notes,
    });

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
            <Gauge className="w-5 h-5 text-purple-600" />
            <span>{t('Precision Calibration Tracking System')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Monitor calibration certificates, test accuracy results, vendor compliance, and 30-day expiration alerts for measuring devices.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER' || activeRole === 'POWER_USER') && (
          <button
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Record Calibration Certificate')}</span>
          </button>
        )}
      </div>

      {/* Calibration Registry Table */}
      <div className="glass-panel p-5 space-y-4">
        <h3 className="font-bold text-sm text-slate-800">{t('Calibration Test Records & Expirations')}</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 font-semibold">{t('Certificate #')}</th>
                <th className="px-4 py-3 font-semibold">{t('Equipment Instrument')}</th>
                <th className="px-4 py-3 font-semibold">{t('Calibration Provider')}</th>
                <th className="px-4 py-3 font-semibold">{t('Test Date')}</th>
                <th className="px-4 py-3 font-semibold">{t('Next Due Date')}</th>
                <th className="px-4 py-3 font-semibold">{t('Outcome')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 text-slate-700">
              {calibrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                    {t('No calibration records registered yet.')}
                  </td>
                </tr>
              ) : (
                calibrations.map((cal) => {
                  const nextDate = new Date(cal.nextCalibrationDate);
                  const diffDays = (nextDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                  const isExpiringSoon = diffDays >= 0 && diffDays <= 30;

                  return (
                    <tr key={cal.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-purple-700">{cal.certificateNumber}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {cal.assetName}
                        <span className="font-mono text-[10px] text-slate-400 block">{cal.assetNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{cal.providerName}</td>
                      <td className="px-4 py-3 text-slate-400">{cal.calibrationDate}</td>
                      <td className="px-4 py-3 font-bold">
                        <span className={isExpiringSoon ? 'text-red-600 flex items-center gap-1' : 'text-slate-600'}>
                          {isExpiringSoon && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
                          {cal.nextCalibrationDate}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${cal.result === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {t(cal.result)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => alert(`Simulated Certificate Download: ${cal.certificateNumber}.pdf`)}
                          className="p-1.5 bg-surface-100 hover:bg-surface-200 text-slate-600 rounded border border-surface-200"
                          title={t("Download Certificate PDF")}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calibration Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('Record Calibration Certificate')}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>{t('Select Precision Measuring Instrument')}</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className={inputClass}
            >
              {measuringAssets.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.assetNumber}) - {a.location}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t('Calibration Vendor Provider')}</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className={inputClass}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.companyName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('Certificate Number')}</label>
              <input
                type="text"
                required
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                className={inputClass + ' font-mono'}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Test Result Outcome')}</label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as CalibrationResult)}
                className={inputClass}
              >
                <option value="PASS">{t('PASS (Within Tolerance)')}</option>
                <option value="CONDITIONAL">{t('CONDITIONAL (Minor offset noted)')}</option>
                <option value="FAIL">{t('FAIL (Out of tolerance - Quarantined)')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('Calibration Date')}</label>
              <input
                type="date"
                required
                value={calibrationDate}
                onChange={(e) => setCalibrationDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Next Calibration Due Date')}</label>
              <input
                type="date"
                required
                value={nextCalibrationDate}
                onChange={(e) => setNextCalibrationDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('Inspector Notes & Tolerance Ratings')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              {t('Cancel')}
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              {t('Record Calibration Certificate')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
