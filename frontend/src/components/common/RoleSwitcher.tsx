import React from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { UserRole } from '../../types';
import { Shield, UserCheck, Wrench, Zap } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { activeRole, setActiveRole } = useWarehouseStore();
  const { t } = useLanguageStore();

  const roles: { role: UserRole; label: string; icon: React.ReactNode; activeClass: string }[] = [
    {
      role: 'ADMIN',
      label: t('Administrator'),
      icon: <Shield className="w-3.5 h-3.5" />,
      activeClass: 'bg-purple-600 text-white border-purple-600',
    },
    {
      role: 'WAREHOUSE_MANAGER',
      label: t('Warehouse Manager'),
      icon: <UserCheck className="w-3.5 h-3.5" />,
      activeClass: 'bg-brand-600 text-white border-brand-600',
    },
    {
      role: 'WAREHOUSE_EMPLOYEE',
      label: t('Warehouse Employee'),
      icon: <Wrench className="w-3.5 h-3.5" />,
      activeClass: 'bg-emerald-600 text-white border-emerald-600',
    },
    {
      role: 'POWER_USER',
      label: t('Power User'),
      icon: <Zap className="w-3.5 h-3.5" />,
      activeClass: 'bg-amber-500 text-white border-amber-500',
    },
  ];

  return (
    <div className="flex items-center gap-2 bg-surface-50 p-1 rounded-lg border border-surface-200 text-xs">
      <span className="text-slate-400 font-medium hidden sm:inline px-2">{t('Role:')}</span>
      <div className="flex flex-wrap gap-1">
        {roles.map((item) => {
          const isActive = activeRole === item.role;
          return (
            <button
              key={item.role}
              onClick={() => setActiveRole(item.role)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-medium border ${isActive
                  ? `${item.activeClass} shadow-sm`
                  : 'border-surface-200 text-slate-500 hover:text-slate-700 hover:bg-surface-100'
                }`}
              title={`Switch role to ${item.label}`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
