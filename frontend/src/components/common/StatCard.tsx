import React from 'react';
import { useLanguageStore } from '../../store/useLanguageStore';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  accentColor?: string; // e.g. 'from-blue-600 to-indigo-600'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  accentColor = 'from-brand-600 to-brand-500',
}) => {
  const { t } = useLanguageStore();
  return (
    <div className="glass-card p-5 relative overflow-hidden group">
      {/* Subtle background gradient glow */}
      <div className={`absolute top-0 right-0 w-28 h-28 bg-gradient-to-br ${accentColor} opacity-[0.07] rounded-full blur-2xl group-hover:opacity-[0.12] transition-all duration-300 pointer-events-none`} />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{title}</p>
          <h4 className="text-2xl font-extrabold text-slate-800 mt-1.5 tracking-tight">{value}</h4>
          {subtitle && <p className="text-[11px] text-slate-400 mt-1 leading-snug">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-semibold">
              <span className={trendUp ? 'text-emerald-600' : 'text-red-500'}>
                {trendUp ? '↑' : '↓'} {trend}
              </span>
              <span className="text-slate-400 font-normal">{t('vs last month')}</span>
            </div>
          )}
        </div>

        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${accentColor} text-white shadow-sm flex-shrink-0 ml-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
};
