import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Employee } from '../../types';
import { Modal } from '../common/Modal';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Users, Plus, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const EmployeeModule: React.FC = () => {
  const {
    employees, assets, addEmployee, activeRole
  } = useWarehouseStore();
  const { t } = useLanguageStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClearanceEmp, setSelectedClearanceEmp] = useState<Employee | null>(null);

  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Field Operations',
    position: 'Field Engineer',
    hireDate: new Date().toISOString().slice(0, 10),
  });

  const handleOpenAddModal = () => {
    const randId = Math.floor(100 + Math.random() * 900);
    setFormData({
      employeeNumber: `EMP-9${randId}`,
      firstName: '',
      lastName: '',
      email: '',
      phone: '+1 (555) 019-9922',
      department: 'Field Operations',
      position: 'Field Specialist',
      hireDate: new Date().toISOString().slice(0, 10),
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployee({
      ...formData,
      status: 'ACTIVE',
    });
    setIsAddModalOpen(false);
  };

  const getEmployeeAssets = (empId: string) => {
    return assets.filter(a => a.holderEmployeeId === empId);
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <span>{t('Employee Custody Directory & HR Clearance')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Manage company employees, track tool custody accountability, and generate digital exit clearance certificates.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER') && (
          <button onClick={handleOpenAddModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>{t('Add New Employee')}</span>
          </button>
        )}
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.length === 0 ? (
          <div className="col-span-full glass-panel p-8 text-center text-slate-400 text-xs">
            {t('No employees registered yet. Click "Add New Employee" to register team members.')}
          </div>
        ) : (
          employees.map((emp) => {
            const empHeldAssets = getEmployeeAssets(emp.id);

            return (
              <div key={emp.id} className="glass-card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                      {emp.employeeNumber}
                    </span>
                    <h3 className="font-bold text-base text-slate-800 mt-1.5">{emp.firstName} {emp.lastName}</h3>
                    <p className="text-xs text-slate-500">{t(emp.position)} • {t(emp.department)}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${emp.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                    {t(emp.status)}
                  </span>
                </div>

                <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>{t('Contact:')}</span>
                    <span className="text-slate-800 font-medium">{emp.phone}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>{t('Assigned Assets Held:')}</span>
                    <span className={`font-bold ${empHeldAssets.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {empHeldAssets.length} {t('Tools')}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-100 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedClearanceEmp(emp)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-50 hover:bg-brand-50 text-brand-700 border border-surface-200 hover:border-brand-200 rounded-lg text-xs font-semibold transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t('Generate Exit Clearance')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Exit Clearance Modal */}
      <Modal
        isOpen={!!selectedClearanceEmp}
        onClose={() => setSelectedClearanceEmp(null)}
        title={`${t('HR Exit Clearance Report:')} ${selectedClearanceEmp?.firstName} ${selectedClearanceEmp?.lastName}`}
      >
        {selectedClearanceEmp && (() => {
          const heldAssets = getEmployeeAssets(selectedClearanceEmp.id);
          const isCleared = heldAssets.length === 0;

          return (
            <div className="space-y-5 text-xs">
              <div className={`p-4 rounded-xl border text-center space-y-2 ${isCleared ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                {isCleared ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-extrabold text-base text-emerald-900">{t('CLEARANCE APPROVED')}</h4>
                    <p className="text-xs text-emerald-700">
                      {t('Employee has returned all company-owned tools, measuring devices, and equipment. No outstanding custody obligations on file.')}
                    </p>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
                    <h4 className="font-extrabold text-base text-rose-900">{t('CLEARANCE BLOCKED')}</h4>
                    <p className="text-xs text-rose-700">
                      {t('Employee currently holds')} {heldAssets.length} {t('unreturned equipment items in custody. All tools must be returned before HR sign-off.')}
                    </p>
                  </>
                )}
              </div>

              {!isCleared && (
                <div>
                  <h4 className="font-bold text-slate-700 uppercase text-[11px] mb-2">{t('Unreturned Equipment Items')}</h4>
                  <div className="space-y-2">
                    {heldAssets.map((ast) => (
                      <div key={ast.id} className="p-3 bg-surface-50 border border-surface-200 rounded-lg flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-slate-800">{ast.name}</span>
                          <span className="font-mono text-[10px] text-slate-400 block">{ast.assetNumber}</span>
                        </div>
                        <span className="text-rose-600 font-bold">{t('Unreturned')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
                <button
                  onClick={() => alert(`Simulated Printable PDF Certificate for ${selectedClearanceEmp.firstName} ${selectedClearanceEmp.lastName}`)}
                  className="btn-primary"
                >
                  {t('Print Official Clearance Form')}
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add Employee Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={t('Register New Employee')}>
        <form onSubmit={handleSubmitAdd} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('Employee Number ID')}</label>
              <input
                type="text"
                required
                value={formData.employeeNumber}
                onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                className={inputClass + ' font-mono'}
              />
            </div>
            <div>
              <label className={labelClass}>{t('First Name')}</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Last Name')}</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Email Address')}</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Phone Number')}</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t('Department')}</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className={inputClass}
              >
                <option value="Field Operations">{t('Field Operations')}</option>
                <option value="Maintenance & Service">{t('Maintenance & Service')}</option>
                <option value="Civil Construction">{t('Civil Construction')}</option>
                <option value="Quality Assurance">{t('Quality Assurance')}</option>
                <option value="Warehouse & Logistics">{t('Warehouse & Logistics')}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-ghost">
              {t('Cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('Register Employee')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
