import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Asset, AssetStatus } from '../../types';
import { Modal } from '../common/Modal';
import { formatCurrency } from '../../utils/depreciation';
import { 
  Package, Plus, Search, Filter, QrCode, Eye, Edit3, Trash2, 
  Grid, List, DollarSign, Tag, CheckCircle, RefreshCw 
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  ISSUED:         'bg-blue-50 text-blue-700 border-blue-200',
  IN_SERVICE:     'bg-amber-50 text-amber-700 border-amber-200',
  IN_CALIBRATION: 'bg-purple-50 text-purple-700 border-purple-200',
  RETIRED:        'bg-slate-100 text-slate-500 border-slate-200',
  DAMAGED:        'bg-red-50 text-red-700 border-red-200',
  LOST:           'bg-rose-50 text-rose-700 border-rose-200',
};

export const AssetManagementModule: React.FC = () => {
  const { 
    assets, suppliers, globalSearch, addAsset, updateAsset, deleteAsset, 
    setSelectedAssetFor360, setSelectedAssetForQRLabel, activeRole 
  } = useWarehouseStore();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    assetNumber: '',
    qrCode: '',
    serialNumber: '',
    category: 'Power Tools',
    manufacturer: '',
    model: '',
    location: 'Warehouse Rack A-01',
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchasePrice: 0,
    depreciationRate: 10,
    supplierId: '',
    description: '',
  });

  const canEdit = activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER';

  const filteredAssets = assets.filter((ast) => {
    const matchesSearch =
      ast.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
      ast.assetNumber.toLowerCase().includes(globalSearch.toLowerCase()) ||
      ast.qrCode.toLowerCase().includes(globalSearch.toLowerCase()) ||
      ast.serialNumber.toLowerCase().includes(globalSearch.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || ast.category === categoryFilter;
    const matchesStatus   = statusFilter === 'ALL'   || ast.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenCreateModal = () => {
    setEditingAsset(null);
    const randId = Math.floor(1000 + Math.random() * 9000);
    setFormData({
      name: '',
      assetNumber: `AST-EQP-${randId}`,
      qrCode: `QR-EQP-2026-${randId}`,
      serialNumber: `SN-${randId}-XYZ`,
      category: 'Power Tools',
      manufacturer: 'DeWalt',
      model: 'XR Series',
      location: 'Warehouse Rack A-01',
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchasePrice: 500,
      depreciationRate: 10,
      supplierId: suppliers[0]?.id || '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ast: Asset) => {
    setEditingAsset(ast);
    setFormData({
      name: ast.name,
      assetNumber: ast.assetNumber,
      qrCode: ast.qrCode,
      serialNumber: ast.serialNumber,
      category: ast.category,
      manufacturer: ast.manufacturer,
      model: ast.model,
      location: ast.location,
      purchaseDate: ast.purchaseDate,
      purchasePrice: ast.purchasePrice,
      depreciationRate: ast.depreciationRate,
      supplierId: ast.supplierId || '',
      description: ast.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === formData.supplierId);
    if (editingAsset) {
      updateAsset(editingAsset.id, { ...formData, supplierName: sup?.companyName });
    } else {
      addAsset({ ...formData, status: 'AVAILABLE', supplierName: sup?.companyName });
    }
    setIsModalOpen(false);
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const selectClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-600" />
            Asset & Tool Master Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage equipment, QR references, depreciation parameters, and warehouse locations.
          </p>
        </div>
        {canEdit && (
          <button onClick={handleOpenCreateModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            Register New Asset
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-surface-200 shadow-card text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-surface-50 border border-surface-200 text-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-400 text-xs"
            >
              <option value="ALL">All Categories</option>
              <option value="Power Tools">Power Tools</option>
              <option value="Measuring Devices">Measuring Devices</option>
              <option value="Compressors & Generators">Compressors & Generators</option>
              <option value="Heavy Equipment">Heavy Equipment</option>
              <option value="Hand Tools & Kits">Hand Tools & Kits</option>
            </select>
          </div>
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-50 border border-surface-200 text-slate-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-brand-400 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="ISSUED">ISSUED</option>
              <option value="IN_SERVICE">IN SERVICE</option>
              <option value="IN_CALIBRATION">IN CALIBRATION</option>
              <option value="RETIRED">RETIRED</option>
              <option value="DAMAGED">DAMAGED</option>
            </select>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-surface-100 p-1 rounded-lg border border-surface-200">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white text-brand-600 shadow-card' : 'text-slate-400 hover:text-slate-600'}`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white text-brand-600 shadow-card' : 'text-slate-400 hover:text-slate-600'}`}
            title="Grid Card View"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Asset Count */}
      <p className="text-xs text-slate-400 px-1">
        Showing <span className="font-semibold text-slate-600">{filteredAssets.length}</span> of <span className="font-semibold text-slate-600">{assets.length}</span> assets
      </p>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3 font-semibold">Asset Code</th>
                  <th className="px-4 py-3 font-semibold">QR / Serial</th>
                  <th className="px-4 py-3 font-semibold">Asset Name</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Book Value</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 text-slate-700">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                      No assets found. {canEdit && 'Click "Register New Asset" to add one.'}
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((ast) => (
                    <tr key={ast.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-brand-600 text-xs">{ast.assetNumber}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        <div>{ast.qrCode}</div>
                        <div className="text-[10px] text-slate-400">SN: {ast.serialNumber}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {ast.name}
                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">{ast.manufacturer} • {ast.model}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{ast.category}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${STATUS_STYLES[ast.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {ast.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{ast.location}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800">{formatCurrency(ast.currentValue)}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">Cost: {formatCurrency(ast.purchasePrice)}</span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedAssetFor360(ast)}
                          className="p-1.5 bg-surface-100 hover:bg-brand-50 text-brand-600 rounded border border-surface-200 hover:border-brand-200 transition-all"
                          title="360 Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSelectedAssetForQRLabel(ast)}
                          className="p-1.5 bg-surface-100 hover:bg-purple-50 text-purple-600 rounded border border-surface-200 hover:border-purple-200 transition-all"
                          title="Print QR Tag"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(ast)}
                              className="p-1.5 bg-surface-100 hover:bg-blue-50 text-blue-600 rounded border border-surface-200 hover:border-blue-200 transition-all"
                              title="Edit Asset"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Retire asset ${ast.name}?`)) deleteAsset(ast.id); }}
                              className="p-1.5 bg-surface-100 hover:bg-red-50 text-red-500 rounded border border-surface-200 hover:border-red-200 transition-all"
                              title="Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((ast) => (
            <div key={ast.id} className="glass-card p-5 space-y-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {ast.assetNumber}
                  </span>
                  <h3 className="font-bold text-sm text-slate-800 mt-1.5">{ast.name}</h3>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_STYLES[ast.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {ast.status}
                </span>
              </div>

              <p className="text-xs text-slate-500">{ast.category} • {ast.location}</p>

              <div className="pt-3 border-t border-surface-100 flex items-center justify-between text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase">Book Value</p>
                  <p className="font-bold text-emerald-600">{formatCurrency(ast.currentValue)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedAssetFor360(ast)}
                    className="px-2.5 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded border border-brand-100 text-[11px] font-medium"
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setSelectedAssetForQRLabel(ast)}
                    className="p-1.5 bg-surface-100 hover:bg-surface-200 text-slate-500 rounded border border-surface-200"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Asset Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAsset ? `Edit Asset: ${editingAsset.assetNumber}` : 'Register New Asset'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Asset Name</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inputClass} placeholder="e.g. Bosch Rotary Drill" />
            </div>
            <div>
              <label className={labelClass}>Asset Code</label>
              <input type="text" required value={formData.assetNumber} onChange={(e) => setFormData({ ...formData, assetNumber: e.target.value })} className={inputClass + ' font-mono'} />
            </div>
            <div>
              <label className={labelClass}>QR Code Token</label>
              <input type="text" required value={formData.qrCode} onChange={(e) => setFormData({ ...formData, qrCode: e.target.value })} className={inputClass + ' font-mono'} />
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input type="text" required value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} className={inputClass + ' font-mono'} />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className={selectClass}>
                <option>Power Tools</option>
                <option>Measuring Devices</option>
                <option>Compressors & Generators</option>
                <option>Heavy Equipment</option>
                <option>Hand Tools & Kits</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Manufacturer</label>
              <input type="text" required value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input type="text" required value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Location / Rack</label>
              <input type="text" required value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Purchase Date</label>
              <input type="date" required value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Purchase Cost ($)</label>
              <input type="number" required value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Annual Depreciation Rate</label>
              <select value={formData.depreciationRate} onChange={(e) => setFormData({ ...formData, depreciationRate: parseFloat(e.target.value) })} className={selectClass}>
                <option value={5}>5% — Heavy Equipment / Compressors</option>
                <option value={10}>10% — Power Tools / Hand Kits</option>
                <option value={20}>20% — Electronics / Diagnostics</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Supplier Vendor</label>
              <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })} className={selectClass}>
                <option value="">— No Supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description / Notes</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={inputClass}
              placeholder="Optional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingAsset ? 'Save Changes' : 'Register Asset'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
