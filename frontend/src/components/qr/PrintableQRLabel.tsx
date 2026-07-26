import React, { useEffect, useState } from 'react';
import { Asset } from '../../types';
import { generateQRCodeDataUrl, buildAssetQRDeepLink } from '../../utils/qrGenerator';
import { Printer, X } from 'lucide-react';

interface PrintableQRLabelProps {
  asset: Asset;
  onClose: () => void;
}

export const PrintableQRLabel: React.FC<PrintableQRLabelProps> = ({ asset, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const deepLink = buildAssetQRDeepLink(asset.qrCode);
    generateQRCodeDataUrl(deepLink).then(setQrDataUrl);
  }, [asset]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="font-bold text-sm text-slate-200">Asset QR Identification Tag</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-glow transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Label Tag</span>
          </button>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Area */}
      <div id="printable-qr-container" className="flex justify-center p-6">
        <div className="w-72 bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-4 shadow-lg text-center font-sans">
          <div className="border-b-2 border-slate-900 pb-2 mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Company Warehouse Asset</p>
            <h3 className="font-extrabold text-base text-slate-900 truncate">{asset.name}</h3>
            <p className="text-xs font-mono text-slate-700 font-bold">{asset.assetNumber}</p>
          </div>

          {/* QR Code Canvas Render */}
          <div className="my-2 flex justify-center">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Asset QR Tag" className="w-44 h-44 object-contain border border-slate-300 p-1 rounded" />
            ) : (
              <div className="w-44 h-44 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-300 text-[10px] space-y-0.5 text-slate-700">
            <p><span className="font-semibold">Serial:</span> {asset.serialNumber}</p>
            <p><span className="font-semibold">Category:</span> {asset.category}</p>
            <p className="font-mono text-[9px] text-slate-500 truncate mt-1">Ref: {asset.qrCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
