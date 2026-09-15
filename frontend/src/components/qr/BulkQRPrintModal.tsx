import React, { useEffect, useState } from 'react';
import { Asset } from '../../types';
import { generateQRCodeDataUrl, buildAssetQRDeepLink } from '../../utils/qrGenerator';
import { Printer, X, CheckCircle2, Loader2 } from 'lucide-react';

interface BulkQRPrintModalProps {
  assets: Asset[];
  onClose: () => void;
}

interface AssetWithQR {
  asset: Asset;
  qrDataUrl: string;
}

export const BulkQRPrintModal: React.FC<BulkQRPrintModalProps> = ({ assets, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [itemsWithQr, setItemsWithQr] = useState<AssetWithQR[]>([]);

  useEffect(() => {
    let isCancelled = false;

    async function generateAll() {
      setLoading(true);
      const list: AssetWithQR[] = [];

      for (const a of assets) {
        const deepLink = buildAssetQRDeepLink(a.qrCode || `QR-${a.assetNumber}`);
        const qrDataUrl = await generateQRCodeDataUrl(deepLink);
        list.push({ asset: a, qrDataUrl });
      }

      if (!isCancelled) {
        setItemsWithQr(list);
        setLoading(false);
      }
    }

    generateAll();

    return () => {
      isCancelled = true;
    };
  }, [assets]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #bulk-qr-print-section, #bulk-qr-print-section * {
            visibility: visible;
          }
          #bulk-qr-print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .label-card {
            page-break-inside: avoid;
            break-inside: avoid;
            border: 2px solid #0f172a !important;
            box-shadow: none !important;
            margin-bottom: 12px;
          }
        }
      `}</style>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk QR Code Labels</h3>
              <p className="text-xs text-slate-400">
                Ready to print {assets.length} identification tags (standard 3-column sticker layout)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={loading}
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-xl text-sm transition-all shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>Print {assets.length} Labels</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              <p className="text-sm text-slate-400">Generating high-resolution QR tags...</p>
            </div>
          ) : (
            <div id="bulk-qr-print-section">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {itemsWithQr.map(({ asset, qrDataUrl }) => (
                  <div
                    key={asset.id || asset.assetNumber}
                    className="label-card bg-white text-slate-900 border-2 border-slate-900 rounded-xl p-4 shadow-sm text-center font-sans flex flex-col justify-between"
                  >
                    <div className="border-b-2 border-slate-900 pb-2 mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        Company Warehouse Asset
                      </p>
                      <h4 className="font-extrabold text-sm text-slate-900 truncate" title={asset.name}>
                        {asset.name}
                      </h4>
                      <p className="text-xs font-mono text-slate-800 font-bold">{asset.assetNumber}</p>
                    </div>

                    <div className="my-2 flex justify-center items-center">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`QR ${asset.assetNumber}`}
                          className="w-36 h-36 object-contain border border-slate-300 p-1 rounded bg-white"
                        />
                      ) : (
                        <div className="w-36 h-36 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                          QR Error
                        </div>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-300 text-[10px] space-y-0.5 text-slate-700 text-left">
                      <p className="truncate">
                        <span className="font-semibold text-slate-900">Serial:</span> {asset.serialNumber}
                      </p>
                      <p className="truncate">
                        <span className="font-semibold text-slate-900">Category:</span> {asset.category}
                      </p>
                      <p className="font-mono text-[9px] text-slate-500 truncate mt-1">
                        Ref: {asset.qrCode || `QR-${asset.assetNumber}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="no-print flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Labels formatted for standard adhesive sticker sheets (A4 / Letter 3-column layout)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
