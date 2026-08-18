import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Modal } from '../common/Modal';
import { Asset } from '../../types';
import {
  QrCode, Camera, ArrowLeftRight, Wrench, ShieldAlert,
  CheckCircle2, ArrowRight, RefreshCw, Sparkles, User, FolderOpen
} from 'lucide-react';

export const QRScannerModule: React.FC = () => {
  const {
    assets, employees, projects, activeRole, returnAsset,
    issueAssets, createServiceOrder, setSelectedAssetFor360
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Inline Checkout Modal state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutEmployeeId, setCheckoutEmployeeId] = useState('');
  const [checkoutProjectId, setCheckoutProjectId] = useState('');
  const [checkoutReturnDate, setCheckoutReturnDate] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleScanSuccess = (decodedText: string) => {
    let code = decodedText;
    if (decodedText.includes('code=')) {
      code = decodedText.split('code=')[1]?.split('&')[0] || decodedText;
    }

    setScannedResult(code);
    const found = assets.find((a) => a.qrCode === code || a.assetNumber === code);
    setMatchedAsset(found || null);
    setActionSuccessMsg(null);

    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => setIsScanningCamera(false)).catch(console.error);
    }
  };

  const startCameraStream = async () => {
    setCameraError(null);
    setIsScanningCamera(true);
    try {
      const html5Qrcode = new Html5Qrcode('qr-reader-container');
      html5QrcodeRef.current = html5Qrcode;
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScanSuccess,
        () => { }
      );
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || t('Camera permission denied or camera not found on this device.'));
      setIsScanningCamera(false);
    }
  };

  const stopCameraStream = () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      html5QrcodeRef.current.stop().then(() => setIsScanningCamera(false)).catch(console.error);
    } else {
      setIsScanningCamera(false);
    }
  };

  // Inline Return Modal state
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnCondition, setReturnCondition] = useState('GOOD');
  const [returnNotes, setReturnNotes] = useState('');

  const handleOpenReturnModal = () => {
    setReturnCondition('GOOD');
    setReturnNotes('');
    setIsReturnModalOpen(true);
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedAsset) return;
    setIsSubmitting(true);
    try {
      await returnAsset(
        matchedAsset.id,
        returnCondition,
        returnNotes || t('Returned via mobile QR scan action')
      );
      const newStatus = returnCondition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';
      setActionSuccessMsg(`✓ ${matchedAsset.name} ${t('successfully returned to warehouse.')}`);
      setMatchedAsset({ ...matchedAsset, status: newStatus, holderEmployeeId: undefined, holderEmployeeName: undefined });
      setIsReturnModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportDamage = (ast: Asset) => {
    const desc = prompt(t('Describe tool damage or malfunction:'), t('Broken housing / erratic motor output'));
    if (desc) {
      createServiceOrder(ast.id, ast.supplierId || '', desc);
      setActionSuccessMsg(`✓ ${t('Damage reported. Service Order created for')} ${ast.name}.`);
      setMatchedAsset({ ...ast, status: 'IN_SERVICE' });
    }
  };

  const handleOpenCheckoutModal = () => {
    setCheckoutEmployeeId(employees[0]?.id || '');
    setCheckoutProjectId('');
    setCheckoutReturnDate(
      new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
    );
    setCheckoutNotes('');
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedAsset || !checkoutEmployeeId) return;
    setIsSubmitting(true);
    try {
      await issueAssets(
        [matchedAsset.id],
        checkoutEmployeeId,
        checkoutProjectId || undefined,
        checkoutReturnDate || undefined,
        checkoutNotes || undefined
      );
      const emp = employees.find(em => em.id === checkoutEmployeeId);
      const empName = emp ? `${emp.firstName} ${emp.lastName}` : checkoutEmployeeId;
      setActionSuccessMsg(`✓ ${matchedAsset.name} ${t('successfully issued to')} ${empName}.`);
      setMatchedAsset({ ...matchedAsset, status: 'ISSUED', holderEmployeeId: checkoutEmployeeId, holderEmployeeName: empName });
      setIsCheckoutModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Module Title */}
      <div className="glass-panel p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-600" />
            <span>{t('Mobile QR Scanner & Field Operations')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Scan physical equipment QR codes using your device camera or test with quick simulation tokens below.')}
          </p>
        </div>
      </div>

      {/* Camera & Scanner Launcher Section */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!isScanningCamera ? (
            <button onClick={startCameraStream} className="btn-primary">
              <Camera className="w-4 h-4" />
              <span>{t('Start Camera Stream QR Scan')}</span>
            </button>
          ) : (
            <button
              onClick={stopCameraStream}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t('Stop Camera Reader')}</span>
            </button>
          )}
        </div>

        {isScanningCamera && (
          <div className="flex justify-center">
            <div id="qr-reader-container" className="w-full max-w-sm border-2 border-brand-500 rounded-xl overflow-hidden shadow-panel bg-black" />
          </div>
        )}

        {cameraError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs text-center space-y-1">
            <ShieldAlert className="w-5 h-5 mx-auto text-red-600" />
            <p className="font-semibold">{t('Camera Access Warning')}</p>
            <p className="text-[11px] text-red-600">{cameraError}</p>
            <p className="text-[10px] text-slate-400 mt-2">{t('Use the Desktop Simulation shortcuts below for quick testing without camera hardware.')}</p>
          </div>
        )}

        {/* Desktop Simulation Quick Scanner Bar */}
        <div className="pt-4 border-t border-surface-200 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-medium">{t('Desktop Demo Shortcuts (Click to simulate scanning physical QR tag):')}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {assets.length === 0 ? (
              <p className="text-xs text-slate-400">{t('No registered assets available to scan.')}</p>
            ) : (
              assets.map((ast) => (
                <button
                  key={ast.id}
                  onClick={() => handleScanSuccess(ast.qrCode)}
                  className="px-3 py-1.5 bg-surface-50 hover:bg-brand-50 text-brand-700 rounded-lg text-xs font-mono border border-surface-200 hover:border-brand-200 transition-all"
                >
                  {ast.qrCode} ({ast.name.slice(0, 14)}...)
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 font-bold hover:underline">
            {t('Dismiss')}
          </button>
        </div>
      )}

      {/* Scanned Asset Action Profile Card */}
      {scannedResult && (
        <div className="glass-panel p-6 space-y-5 border-2 border-brand-200">
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded text-[10px] font-mono font-bold">
                {t('SCANNED QR TOKEN')}
              </span>
              <span className="font-mono text-xs text-slate-800 font-bold">{scannedResult}</span>
            </div>
            <button
              onClick={() => { setScannedResult(null); setMatchedAsset(null); setActionSuccessMsg(null); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              {t('Clear Result')}
            </button>
          </div>

          {matchedAsset ? (
            <div className="space-y-5">

              {/* Asset Header Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-600">{matchedAsset.assetNumber}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${matchedAsset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        matchedAsset.status === 'ISSUED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                      {t(matchedAsset.status)}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-800 mt-1">{matchedAsset.name}</h3>
                  <p className="text-xs text-slate-500">{t(matchedAsset.category)} • {t('Location:')} {matchedAsset.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase">{t('Current Custody')}</p>
                  <p className="font-bold text-emerald-700 text-xs">{matchedAsset.holderEmployeeName || t('Stored in Warehouse')}</p>
                </div>
              </div>

              {/* Dynamic Action Buttons */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {t('Available Field Actions')} ({activeRole.replace('_', ' ')})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

                  <button
                    onClick={() => setSelectedAssetFor360(matchedAsset)}
                    className="p-3 bg-surface-50 hover:bg-surface-100 border border-surface-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>{t('View 360° Profile')}</span>
                    <ArrowRight className="w-4 h-4 text-brand-600" />
                  </button>

                  {matchedAsset.status === 'ISSUED' && (
                    <button
                      onClick={handleOpenReturnModal}
                      className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-sm"
                    >
                      <span>{t('Return Tool to Warehouse')}</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {matchedAsset.status === 'AVAILABLE' && (
                    <button
                      onClick={handleOpenCheckoutModal}
                      className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-sm"
                    >
                      <span>{t('Checkout / Issue Tool')}</span>
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleReportDamage(matchedAsset)}
                    className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>{t('Report Damage / Repair')}</span>
                    <Wrench className="w-4 h-4" />
                  </button>

                </div>
              </div>

            </div>
          ) : (
            <div className="p-6 text-center text-red-600 space-y-2">
              <ShieldAlert className="w-8 h-8 mx-auto text-red-500" />
              <p className="font-bold text-sm">{t('Asset Not Found in Warehouse Database')}</p>
              <p className="text-xs text-slate-400">{t('The scanned token')} "{scannedResult}" {t('does not correspond to an active equipment record.')}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Inline Checkout Modal ── */}
      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        title={`${t('Checkout / Issue Tool')} — ${matchedAsset?.name || ''}`}
      >
        <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">

          {/* Asset recap */}
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg flex items-center gap-3">
            <QrCode className="w-5 h-5 text-brand-600 flex-shrink-0" />
            <div>
              <p className="font-extrabold text-slate-800 text-sm">{matchedAsset?.name}</p>
              <p className="text-[11px] text-brand-700 font-mono">{matchedAsset?.assetNumber} • {matchedAsset?.qrCode}</p>
            </div>
          </div>

          {/* Employee picker */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {t('Issue To Employee')}</span>
            </label>
            <select
              required
              value={checkoutEmployeeId}
              onChange={(e) => setCheckoutEmployeeId(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('-- Select Employee --')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} — {emp.position}
                </option>
              ))}
            </select>
          </div>

          {/* Project picker (optional) */}
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1"><FolderOpen className="w-3.5 h-3.5" /> {t('Assign to Project (optional)')}</span>
            </label>
            <select
              value={checkoutProjectId}
              onChange={(e) => setCheckoutProjectId(e.target.value)}
              className={inputClass}
            >
              <option value="">{t('No Project — General Use')}</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.projectCode} — {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Return date */}
          <div>
            <label className={labelClass}>{t('Expected Return Date')}</label>
            <input
              type="date"
              value={checkoutReturnDate}
              onChange={(e) => setCheckoutReturnDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>{t('Notes (optional)')}</label>
            <input
              type="text"
              placeholder={t('Job site, purpose, or special instructions...')}
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button
              type="button"
              onClick={() => setIsCheckoutModalOpen(false)}
              className="btn-ghost"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !checkoutEmployeeId}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isSubmitting ? t('Issuing...') : t('Confirm Issue')}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Inline Return Modal ── */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`${t('Return Tool to Warehouse')} — ${matchedAsset?.name || ''}`}
      >
        <form onSubmit={handleReturnSubmit} className="space-y-4 text-xs">

          {/* Asset & Custody Recap */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <p className="font-extrabold text-slate-800 text-sm">{matchedAsset?.name}</p>
              <p className="text-[11px] text-emerald-800 font-mono">{matchedAsset?.assetNumber} • {matchedAsset?.qrCode}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">{t('Current Custody')}</span>
              <span className="font-bold text-emerald-700 text-xs">{matchedAsset?.holderEmployeeName || t('Field Assignment')}</span>
            </div>
          </div>

          {/* Returned Condition Grade */}
          <div>
            <label className={labelClass}>{t('Returned Tool Condition Grade')}</label>
            <select
              value={returnCondition}
              onChange={(e) => setReturnCondition(e.target.value)}
              className={inputClass}
            >
              <option value="GOOD">{t('GOOD (Excellent condition, clean)')}</option>
              <option value="MINOR_WEAR">{t('MINOR WEAR (Standard field wear)')}</option>
              <option value="DAMAGED">{t('DAMAGED (Requires service order repair)')}</option>
            </select>
          </div>

          {/* Return Notes */}
          <div>
            <label className={labelClass}>{t('Return Notes / Inspection Remarks')}</label>
            <textarea
              rows={3}
              placeholder={t('e.g. All accessories present. Cleaned and returned to warehouse storage.')}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(false)}
              className="btn-ghost"
            >
              {t('Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? t('Processing...') : t('Process Return')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
