import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Asset } from '../../types';
import { 
  QrCode, Camera, ArrowLeftRight, Wrench, ShieldAlert, 
  CheckCircle2, ArrowRight, RefreshCw, Sparkles
} from 'lucide-react';

export const QRScannerModule: React.FC = () => {
  const { 
    assets, activeRole, returnAsset, 
    createServiceOrder, setSelectedAssetFor360, setActiveModule 
  } = useWarehouseStore();

  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

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
        () => {}
      );
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Camera permission denied or camera not found on this device.');
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

  const handleQuickReturn = (ast: Asset) => {
    returnAsset(ast.id, 'GOOD', 'Returned via mobile QR scan action');
    setActionSuccessMsg(`Asset ${ast.name} successfully returned to warehouse storage.`);
    setMatchedAsset({ ...ast, status: 'AVAILABLE', holderEmployeeId: undefined, holderEmployeeName: undefined });
  };

  const handleReportDamage = (ast: Asset) => {
    const desc = prompt('Describe tool damage or malfunction:', 'Broken housing / erratic motor output');
    if (desc) {
      createServiceOrder(ast.id, ast.supplierId || '', desc);
      setActionSuccessMsg(`Damage reported for ${ast.name}. Service Order created.`);
      setMatchedAsset({ ...ast, status: 'IN_SERVICE' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      
      {/* Module Title */}
      <div className="glass-panel p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-600" />
            <span>Mobile QR Scanner & Field Operations</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan physical equipment QR codes using your device camera or test with quick simulation tokens below.
          </p>
        </div>
      </div>

      {/* Camera & Scanner Launcher Section */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {!isScanningCamera ? (
            <button onClick={startCameraStream} className="btn-primary">
              <Camera className="w-4 h-4" />
              <span>Start Camera Stream QR Scan</span>
            </button>
          ) : (
            <button
              onClick={stopCameraStream}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Stop Camera Reader</span>
            </button>
          )}
        </div>

        {/* Video Canvas Container */}
        {isScanningCamera && (
          <div className="flex justify-center">
            <div id="qr-reader-container" className="w-full max-w-sm border-2 border-brand-500 rounded-xl overflow-hidden shadow-panel bg-black" />
          </div>
        )}

        {cameraError && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs text-center space-y-1">
            <ShieldAlert className="w-5 h-5 mx-auto text-red-600" />
            <p className="font-semibold">Camera Access Warning</p>
            <p className="text-[11px] text-red-600">{cameraError}</p>
            <p className="text-[10px] text-slate-400 mt-2">Use the Desktop Simulation shortcuts below for quick testing without camera hardware.</p>
          </div>
        )}

        {/* Desktop Simulation Quick Scanner Bar */}
        <div className="pt-4 border-t border-surface-200 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-medium">Desktop Demo Shortcuts (Click to simulate scanning physical QR tag):</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            {assets.length === 0 ? (
              <p className="text-xs text-slate-400">No registered assets available to scan.</p>
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
            Dismiss
          </button>
        </div>
      )}

      {/* Scanned Asset Action Profile Card */}
      {scannedResult && (
        <div className="glass-panel p-6 space-y-5 border-2 border-brand-200">
          <div className="flex items-center justify-between border-b border-surface-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded text-[10px] font-mono font-bold">
                SCANNED QR TOKEN
              </span>
              <span className="font-mono text-xs text-slate-800 font-bold">{scannedResult}</span>
            </div>
            <button
              onClick={() => { setScannedResult(null); setMatchedAsset(null); }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear Result
            </button>
          </div>

          {matchedAsset ? (
            <div className="space-y-5">
              
              {/* Asset Header Info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-surface-50 rounded-xl border border-surface-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-600">{matchedAsset.assetNumber}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                      matchedAsset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      matchedAsset.status === 'ISSUED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {matchedAsset.status}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-800 mt-1">{matchedAsset.name}</h3>
                  <p className="text-xs text-slate-500">{matchedAsset.category} • Location: {matchedAsset.location}</p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase">Current Custody</p>
                  <p className="font-bold text-emerald-700 text-xs">{matchedAsset.holderEmployeeName || 'Stored in Warehouse'}</p>
                </div>
              </div>

              {/* Dynamic Action Buttons */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Available Field Actions ({activeRole.replace('_', ' ')})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  
                  <button
                    onClick={() => setSelectedAssetFor360(matchedAsset)}
                    className="p-3 bg-surface-50 hover:bg-surface-100 border border-surface-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>View 360° Profile</span>
                    <ArrowRight className="w-4 h-4 text-brand-600" />
                  </button>

                  {matchedAsset.status === 'ISSUED' && (
                    <button
                      onClick={() => handleQuickReturn(matchedAsset)}
                      className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-sm"
                    >
                      <span>Return Tool to Warehouse</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {matchedAsset.status === 'AVAILABLE' && (
                    <button
                      onClick={() => setActiveModule('issuing')}
                      className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold flex items-center justify-between transition-all shadow-sm"
                    >
                      <span>Checkout / Issue Tool</span>
                      <ArrowLeftRight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleReportDamage(matchedAsset)}
                    className="p-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center justify-between transition-all"
                  >
                    <span>Report Damage / Repair</span>
                    <Wrench className="w-4 h-4" />
                  </button>

                </div>
              </div>

            </div>
          ) : (
            <div className="p-6 text-center text-red-600 space-y-2">
              <ShieldAlert className="w-8 h-8 mx-auto text-red-500" />
              <p className="font-bold text-sm">Asset Not Found in Warehouse Database</p>
              <p className="text-xs text-slate-400">The scanned token "{scannedResult}" does not correspond to an active equipment record.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
