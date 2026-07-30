import React, { useState } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { Modal } from '../common/Modal';
import { useLanguageStore } from '../../store/useLanguageStore';
import { Briefcase, Plus, MapPin } from 'lucide-react';

export const ProjectModule: React.FC = () => {
  const { projects, addProject, activeRole } = useWarehouseStore();
  const { t } = useLanguageStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectCode, setProjectCode] = useState('');
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [department, setDepartment] = useState('Civil Construction');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');

  const handleOpenModal = () => {
    const randId = Math.floor(100 + Math.random() * 900);
    setProjectCode(`PRJ-2026-${randId}`);
    setName('');
    setClient('');
    setLocation('Job Site Station 4');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProject({ projectCode, name, client, department, status: 'ACTIVE', startDate, location });
    setIsModalOpen(false);
  };

  const inputClass = 'w-full bg-white border border-surface-200 text-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400';
  const labelClass = 'block text-xs font-semibold text-slate-600 mb-1';

  return (
    <div className="space-y-5">

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-600" />
            <span>{t('Project & Job Site Equipment Tracking')}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('Track equipment allocated across construction projects, transit infrastructure, and energy sites.')}
          </p>
        </div>

        {(activeRole === 'ADMIN' || activeRole === 'WAREHOUSE_MANAGER' || activeRole === 'POWER_USER') && (
          <button onClick={handleOpenModal} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span>{t('Create New Project')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.length === 0 ? (
          <div className="col-span-full glass-panel p-8 text-center text-slate-400 text-xs">
            {t('No active projects found. Click "Create New Project" to add projects.')}
          </div>
        ) : (
          projects.map((proj) => (
            <div key={proj.id} className="glass-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded border border-brand-100">
                    {proj.projectCode}
                  </span>
                  <h3 className="font-bold text-base text-slate-800 mt-1.5">{proj.name}</h3>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${proj.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                  {t(proj.status)}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-surface-50 p-3 rounded-lg border border-surface-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('Client:')}</span>
                  <span className="font-semibold text-slate-800">{proj.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('Department:')}</span>
                  <span>{t(proj.department)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('Start Date:')}</span>
                  <span>{proj.startDate}</span>
                </div>
                {proj.location && (
                  <div className="flex items-center gap-1 text-brand-700 pt-1 border-t border-surface-200 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-brand-600" />
                    <span>{proj.location}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('Create New Project')}>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className={labelClass}>{t('Project Code')}</label>
            <input
              type="text"
              required
              value={projectCode}
              onChange={(e) => setProjectCode(e.target.value)}
              className={inputClass + ' font-mono'}
            />
          </div>
          <div>
            <label className={labelClass}>{t('Project Name')}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('Client Name')}</label>
            <input
              type="text"
              required
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t('Location Site Address')}</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost">
              {t('Cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('Register Project')}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
