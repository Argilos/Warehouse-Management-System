import React, { useState } from 'react';
import { Asset } from '../../types';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/depreciation';
import { 
  Package, QrCode, Clock, Wrench, Gauge, FileText, 
  MapPin, Tag
} from 'lucide-react';

interface Props {
  asset: Asset | null;
  onClose: () => void;
}

export const AssetPersonalCardModal: React.FC<Props> = ({ asset, onClose }) => {
  const { 
    transactions, serviceOrders, calibrations, 
    setSelectedAssetForQRLabel 
  } = useWarehouseStore();

  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'maintenance' | 'calibration' | 'docs'>('info');

  if (!asset) return null;

  const assetTransactions = transactions.filter(t => t.assetId === asset.id);
  const assetServiceOrders = serviceOrders.filter(s => s.assetId === asset.id);
  const assetCalibrations = calibrations.filter(c => c.assetId === asset.id);

  return (
    <Modal isOpen={!!asset} onClose={onClose} title={`Asset 360° Profile: ${asset.name}`} maxWidth="max-w-4xl">
      <div className="space-y-5">
        
        {/* Top Profile Header Summary Card */}
        <div className="p-4 rounded-xl bg-surface-50 border border-surface-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-600 flex items-center justify-center text-white font-extrabold text-lg shadow-sm">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                  {asset.assetNumber}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  asset.status === 'ISSUED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {asset.status}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-800 mt-1">{asset.name}</h3>
              <p className="text-xs text-slate-400">{asset.manufacturer} • {asset.model} • SN: {asset.serialNumber}</p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              setSelectedAssetForQRLabel(asset);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-surface-100 text-brand-700 border border-surface-200 rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <QrCode className="w-4 h-4 text-brand-600" />
            <span>Print QR Tag</span>
          </button>
        </div>

        {/* 360 Profile Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-surface-200 overflow-x-auto pb-2">
          {[
            { id: 'info', label: 'Basic Info & Financials', icon: <Tag className="w-3.5 h-3.5" /> },
            { id: 'history', label: `Custody History (${assetTransactions.length})`, icon: <Clock className="w-3.5 h-3.5" /> },
            { id: 'maintenance', label: `Repairs (${assetServiceOrders.length})`, icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'calibration', label: `Calibrations (${assetCalibrations.length})`, icon: <Gauge className="w-3.5 h-3.5" /> },
            { id: 'docs', label: 'Manuals & Specs', icon: <FileText className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-surface-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Basic Info & Financials */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            <div className="space-y-3 bg-surface-50 p-4 rounded-xl border border-surface-200">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">General Specifications</h4>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Category:</span>
                  <span className="font-semibold text-slate-800">{asset.category}</span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Current Location:</span>
                  <span className="font-semibold text-brand-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-brand-600" /> {asset.location}
                  </span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Internal QR Identifier:</span>
                  <span className="font-mono text-slate-800">{asset.qrCode}</span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Current Custody Holder:</span>
                  <span className="font-semibold text-emerald-700">{asset.holderEmployeeName || 'Stored in Warehouse'}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">Description:</span>
                  <p className="text-slate-600 bg-white p-2.5 rounded border border-surface-200 leading-relaxed">
                    {asset.description || 'No detailed description provided.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-surface-50 p-4 rounded-xl border border-surface-200">
              <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Financial & Valuation</h4>
              <div className="space-y-2 text-slate-700">
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Purchase Date:</span>
                  <span>{asset.purchaseDate}</span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Initial Acquisition Cost:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(asset.purchasePrice)}</span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Annual Depreciation Rate:</span>
                  <span className="font-semibold text-amber-700">{asset.depreciationRate}% Straight-Line</span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Current Depreciated Book Value:</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatCurrency(asset.currentValue)}</span>
                </div>
                <div className="flex justify-between border-b border-surface-200 pb-1.5">
                  <span className="text-slate-400">Supplier Vendor:</span>
                  <span>{asset.supplierName || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Custody History */}
        {activeTab === 'history' && (
          <div className="space-y-2 text-xs">
            {assetTransactions.length === 0 ? (
              <p className="text-slate-400 p-6 text-center">No previous checkout or transfer history recorded.</p>
            ) : (
              assetTransactions.map((trx) => (
                <div key={trx.id} className="p-3 bg-surface-50 border border-surface-200 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{trx.employeeName || 'System Action'}</span>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {trx.transactionType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{trx.notes || 'Standard transaction'}</p>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <p>{new Date(trx.transactionDate).toLocaleDateString()}</p>
                    <p className="text-slate-500">By: {trx.performedByName}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Maintenance */}
        {activeTab === 'maintenance' && (
          <div className="space-y-2 text-xs">
            {assetServiceOrders.length === 0 ? (
              <p className="text-slate-400 p-6 text-center">No maintenance or repair service orders logged.</p>
            ) : (
              assetServiceOrders.map((srv) => (
                <div key={srv.id} className="p-3.5 bg-surface-50 border border-surface-200 rounded-lg space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-800">{srv.supplierName}</span>
                    <span className="text-amber-700">{formatCurrency(srv.repairCost)}</span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{srv.problemDescription}</p>
                  {srv.replacedParts && <p className="text-[10px] text-slate-400">Parts: {srv.replacedParts}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Calibration */}
        {activeTab === 'calibration' && (
          <div className="space-y-2 text-xs">
            {assetCalibrations.length === 0 ? (
              <p className="text-slate-400 p-6 text-center">No calibration records on file for this asset.</p>
            ) : (
              assetCalibrations.map((cal) => (
                <div key={cal.id} className="p-3.5 bg-surface-50 border border-surface-200 rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800">Cert #: {cal.certificateNumber}</span>
                    <p className="text-slate-500 text-[11px]">Provider: {cal.providerName}</p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold text-[10px]">
                      {cal.result}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1">Next: {cal.nextCalibrationDate}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 5: Documents */}
        {activeTab === 'docs' && (
          <div className="p-6 bg-surface-50 border border-surface-200 rounded-xl text-center space-y-3">
            <FileText className="w-8 h-8 text-brand-600 mx-auto" />
            <p className="text-xs text-slate-700 font-medium">Digital Attachments & Operating Manuals</p>
            <div className="flex justify-center gap-3">
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Simulated PDF View: User Manual"); }} className="px-3 py-1.5 bg-white hover:bg-surface-100 border border-surface-200 text-brand-700 rounded text-xs font-medium">
                Download User Manual.pdf
              </a>
              <a href="#" onClick={(e) => { e.preventDefault(); alert("Simulated PDF View: Purchase Invoice"); }} className="px-3 py-1.5 bg-white hover:bg-surface-100 border border-surface-200 text-brand-700 rounded text-xs font-medium">
                Purchase Invoice.pdf
              </a>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};
