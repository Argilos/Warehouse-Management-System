import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { Building2, Plus, Phone, Mail, MapPin } from 'lucide-react';

export const SupplierModule: React.FC = () => {
  const { suppliers, addSupplier, activeRole } = useWarehouseStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('+1 (800) 555-0199');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [services, setServices] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSupplier({ companyName, contactPerson, phone, email, address, services });
    setIsModalOpen(false);
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-600" />
            <span>Supplier & Equipment Repair Vendor Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage tool manufacturers, calibration laboratories, and equipment service suppliers.
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER') && (
          <button
            onClick={() => {
              setCompanyName(''); setContactPerson(''); setEmail(''); setAddress(''); setServices('');
              setIsModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Register Vendor Supplier</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suppliers.length === 0 ? (
          <div className="col-span-full glass-panel p-8 text-center text-slate-400 text-xs">
            No suppliers registered yet. Click "Register Vendor Supplier" to add suppliers.
          </div>
        ) : (
          suppliers.map((sup) => (
            <div key={sup.id} className="glass-card p-5 space-y-3">
              <h3 className="font-bold text-base text-slate-800">{sup.companyName}</h3>
              <p className="text-xs text-brand-700 font-semibold">{sup.services || 'General Tool Supplier'}</p>

              <div className="space-y-2 text-xs text-slate-600 bg-surface-50 p-3 rounded-lg border border-surface-200">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Contact:</span>
                  <span className="font-semibold text-slate-800">{sup.contactPerson}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.email}</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-surface-200">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-500">{sup.address}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Vendor Supplier">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>Company Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact Person</label>
            <input
              type="text"
              required
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Services Provided</label>
            <input
              type="text"
              placeholder="e.g. Precision Calibration, Heavy Equipment Repairs"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Register Supplier
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
