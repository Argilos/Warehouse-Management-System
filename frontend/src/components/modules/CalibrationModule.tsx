import React, { useState, useEffect } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { CalibrationResult } from '../../types';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Gauge, Plus, AlertTriangle, FileText, Upload, CheckCircle2 } from 'lucide-react';

export const CalibrationModule: React.FC = () => {
  const {
    calibrations, assets, suppliers, addCalibrationRecord, fetchInitialData, activeRole
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [calibrationDate, setCalibrationDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextCalibrationDate, setNextCalibrationDate] = useState(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [certificateNumber, setCertificateNumber] = useState('');
  const [result, setResult] = useState<CalibrationResult>('PASS');
  const [notes, setNotes] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Fetch live data from backend API on component mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  const measuringAssets = assets.filter(
    (a) => a.category === 'Measuring Devices' ||
      a.status === 'IN_CALIBRATION' ||
      a.name.toLowerCase().includes('multimeter') ||
      a.name.toLowerCase().includes('laser') ||
      a.name.toLowerCase().includes('micrometer')
  );

  const handleOpenSubmitModal = (preselectedId?: string, certNo?: string) => {
    const randCert = certNo || `CERT-FLK-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    setCertificateNumber(randCert);
    const targetId = preselectedId || (assets.length > 0 ? assets[0].id : '');
    setSelectedAssetId(targetId);
    if (suppliers.length > 0) setProviderId(suppliers[0].id);
    setNotes('');
    setUploadedFileName(null);
    setIsSubmitModalOpen(true);
  };

  const setNextDatePreset = (daysToAdd: number) => {
    const targetDate = new Date(Date.now() + daysToAdd * 24 * 3600 * 1000);
    setNextCalibrationDate(targetDate.toISOString().slice(0, 10));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFileName(e.target.files[0].name);
    }
  };

  const handleSubmitCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    const ast = assets.find((a) => a.id === selectedAssetId);
    const sup = suppliers.find((s) => s.id === providerId);

    addCalibrationRecord({
      assetId: selectedAssetId,
      assetName: ast?.name || '',
      assetNumber: ast?.assetNumber || '',
      providerId,
      providerName: sup?.companyName || 'Fluke Calibration Services',
      calibrationDate,
      nextCalibrationDate,
      certificateNumber,
      result,
      documentUrl: uploadedFileName || `Certificate_${certificateNumber}.pdf`,
      notes: notes || t('Calibration test completed and certificate uploaded.'),
    });

    setIsSubmitModalOpen(false);
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  const now = new Date();

  // 1. Group calibrations by assetId to evaluate ONLY the latest calibration record for each asset
  const latestCalByAssetId = new Map<string, typeof calibrations[0]>();
  calibrations.forEach((cal) => {
    const existing = latestCalByAssetId.get(cal.assetId);
    if (!existing) {
      latestCalByAssetId.set(cal.assetId, cal);
    } else {
      const existingDate = new Date(existing.nextCalibrationDate || existing.calibrationDate).getTime();
      const currentDate = new Date(cal.nextCalibrationDate || cal.calibrationDate).getTime();
      if (currentDate > existingDate) {
        latestCalByAssetId.set(cal.assetId, cal);
      }
    }
  });

  // 2. Filter ONLY the latest records where nextCalibrationDate is <= 30 days away or overdue
  const recordsDue = Array.from(latestCalByAssetId.values()).filter((cal) => {
    if (!cal.nextCalibrationDate) return false;
    const nextDate = new Date(cal.nextCalibrationDate);
    const diffDays = (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diffDays <= 30;
  });

  // 3. Gather live assets with nextCalibrationDate due within 30 days or IN_CALIBRATION status
  const assetDueItems = assets
    .filter((a) => {
      if (a.nextCalibrationDate) {
        const nextDate = new Date(a.nextCalibrationDate);
        const diffDays = (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30 && a.status !== 'IN_CALIBRATION') return false;
        if (diffDays <= 30) return true;
      }
      return a.status === 'IN_CALIBRATION';
    })
    .map((a) => {
      const existingCal = latestCalByAssetId.get(a.id);
      if (existingCal) {
        const nextDate = new Date(existingCal.nextCalibrationDate);
        const diffDays = (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30 && a.status !== 'IN_CALIBRATION') return null;
        return existingCal;
      }
      return {
        id: `live-asset-cal-${a.id}`,
        assetId: a.id,
        assetName: a.name,
        assetNumber: a.assetNumber,
        providerName: a.supplierName || 'Fluke Calibration Services',
        calibrationDate: a.lastServiceDate || a.purchaseDate,
        nextCalibrationDate: a.nextCalibrationDate || new Date().toISOString().slice(0, 10),
        certificateNumber: `CERT-${a.assetNumber}`,
        result: 'PASS' as CalibrationResult,
        notes: a.status === 'IN_CALIBRATION' ? 'Tool currently in lab undergoing calibration.' : 'Calibration due date approaching.',
      };
    })
    .filter(Boolean) as typeof calibrations;

  // Combine and deduplicate by assetId, excluding any asset whose latest calibration is > 30 days in future
  const calibrationsDue30Days = Array.from(
    new Map(
      [...recordsDue, ...assetDueItems]
        .filter((item) => {
          if (!item.nextCalibrationDate) return false;
          const nextDate = new Date(item.nextCalibrationDate);
          const diffDays = (nextDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
          return diffDays <= 30;
        })
        .map((item) => [item.assetId, item])
    ).values()
  );

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
            {t('Showing tools due for calibration within 30 days. Full calibration history for each tool is accessible in Asset 360° Profile.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER' || activeRole === 'POWER_USER') && (
          <button
            onClick={() => handleOpenSubmitModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Record Calibration Certificate')}</span>
          </button>
        )}
      </div>

      {/* Calibration Registry Table */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800">{t('Tools Due for Calibration (Within 30 Days & Overdue)')}</h3>
          <span className="text-xs font-semibold px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {calibrationsDue30Days.length} {t('Action Required')}
          </span>
        </div>

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
              {calibrationsDue30Days.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-semibold text-slate-700 text-sm">{t('All measuring tools are up to date!')}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t('No tools are due for calibration in the next 30 days.')}</p>
                  </td>
                </tr>
              ) : (
                calibrationsDue30Days.map((cal) => {
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
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${cal.result === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            cal.result === 'CONDITIONAL' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-red-50 text-red-700 border-red-200'
                          }`}>
                          {t(cal.result)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenSubmitModal(cal.assetId, cal.certificateNumber)}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-semibold flex items-center gap-1 shadow-xs transition-all"
                            title={t('Submit Certificate & End Calibration')}
                          >
                            <CheckCircle2 className="w-3 h-3 text-white" />
                            <span>{t('End Calibration')}</span>
                          </button>
                          <button
                            onClick={() => alert(`Certificate Document: ${cal.documentUrl || cal.certificateNumber + '.pdf'}`)}
                            className="p-1.5 bg-surface-100 hover:bg-surface-200 text-purple-700 border border-surface-200 rounded text-[10px] font-medium"
                            title={t('View Certificate PDF')}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Certificate & End Calibration Form Modal */}
      <Modal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} title={t('Submit Certificate & End Calibration')}>
        <form onSubmit={handleSubmitCertificate} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>{t('Select Precision Measuring Instrument')}</label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className={inputClass}
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.assetNumber}) {a.status === 'IN_CALIBRATION' ? `[${t('IN CALIBRATION LAB')}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t('Calibration Vendor / Provider')}</label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className={inputClass}
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.companyName} ({s.services || 'Authorized Services'})</option>
              ))}
            </select>
          </div>

          {/* Certificate File Upload Field */}
          <div>
            <label className={labelClass}>{t('Submit Calibration Certificate Document (PDF / Image)')}</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer bg-surface-50 hover:bg-purple-50 border border-dashed border-purple-300 rounded-lg p-2.5 text-center flex items-center justify-center gap-2 text-purple-700 transition-all">
                <Upload className="w-4 h-4" />
                <span className="font-semibold">{uploadedFileName || t('Choose Certificate PDF / Image File')}</span>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {uploadedFileName && (
              <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {t('Attached:')} {uploadedFileName}
              </p>
            )}
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
                <option value="PASS">{t('PASS (Within Tolerance - Return to Available)')}</option>
                <option value="CONDITIONAL">{t('CONDITIONAL (Minor Offset - Return to Available)')}</option>
                <option value="FAIL">{t('FAIL (Out of Tolerance - Flag Damaged)')}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t('Calibration Test Date')}</label>
              <input
                type="date"
                required
                value={calibrationDate}
                onChange={(e) => setCalibrationDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-600">{t('Next Calibration Due Date')}</label>
              </div>
              <input
                type="date"
                required
                value={nextCalibrationDate}
                onChange={(e) => setNextCalibrationDate(e.target.value)}
                className={inputClass}
              />
              {/* Quick Preset Buttons for Next Calibration Date */}
              <div className="flex gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setNextDatePreset(180)}
                  className="px-2 py-0.5 bg-surface-100 hover:bg-purple-50 text-purple-700 border border-surface-200 rounded text-[10px] font-semibold"
                >
                  +6 {t('Months')}
                </button>
                <button
                  type="button"
                  onClick={() => setNextDatePreset(365)}
                  className="px-2 py-0.5 bg-surface-100 hover:bg-purple-50 text-purple-700 border border-surface-200 rounded text-[10px] font-semibold"
                >
                  +1 {t('Year')}
                </button>
                <button
                  type="button"
                  onClick={() => setNextDatePreset(730)}
                  className="px-2 py-0.5 bg-surface-100 hover:bg-purple-50 text-purple-700 border border-surface-200 rounded text-[10px] font-semibold"
                >
                  +2 {t('Years')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('Inspector Notes & Tolerance Ratings')}</label>
            <textarea
              rows={2}
              value={notes}
              placeholder={t('e.g. Calibrated to ISO 9001 standards. Torque variance < 0.2%')}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="btn-ghost">
              {t('Cancel')}
            </button>
            <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('Submit Certificate & End Calibration')}</span>
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};


