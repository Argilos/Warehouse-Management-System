import React from 'react';
import { Settings, Database, ShieldCheck, HardDrive } from 'lucide-react';
import { useLanguageStore } from '../../store/useLanguageStore';

export const SettingsModule: React.FC = () => {
  const { t } = useLanguageStore();

  return (
    <div className="space-y-5 max-w-4xl mx-auto">

      <div className="glass-panel p-5">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-600" />
          <span>{t('System Settings & Supabase Integration Status')}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {t('Configure global warehouse parameters, Supabase storage buckets, and financial depreciation settings.')}
        </p>
      </div>

      <div className="glass-panel p-6 space-y-5">

        {/* Supabase Status Card */}
        <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-800">{t('Supabase PostgreSQL Connection')}</h3>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
              {t('CONNECTED & ONLINE')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('Database Provider')}</span>
              <p className="font-mono text-slate-800 font-medium">Supabase PostgreSQL v15.1</p>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('Row Level Security (RLS)')}</span>
              <p className="text-emerald-700 font-semibold">{t('15 Policies Active')}</p>
            </div>
          </div>
        </div>

        {/* Storage Buckets Config */}
        <div className="p-4 bg-surface-50 border border-surface-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-sm text-slate-800">{t('Supabase Storage Buckets')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {[
              { name: 'asset-documents', desc: t('Manuals, warranty receipts') },
              { name: 'service-documents', desc: t('Repair invoices & vendor POs') },
              { name: 'calibration-certificates', desc: t('PDF calibration certificates') },
              { name: 'inventory-documents', desc: t('Cycle check audit exports') },
            ].map((b, i) => (
              <div key={i} className="p-3 bg-white border border-surface-200 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-mono font-semibold text-brand-700 text-[11px]">{b.name}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{b.desc}</span>
                </div>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
