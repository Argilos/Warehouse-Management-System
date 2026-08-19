import React from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import {
  LayoutDashboard, PackageCheck, QrCode, ArrowLeftRight, Package,
  Wrench, CalendarClock, Gauge, Users, Building2, Briefcase, ClipboardCheck,
  BarChart3, ShieldCheck, Settings, History
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, activeRole } = useWarehouseStore();
  const { t } = useLanguageStore();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, category: 'Core' },
    { id: 'assets', label: 'Asset Management', icon: <PackageCheck className="w-4 h-4" />, category: 'Core' },
    { id: 'qr-scan', label: 'QR Mobile Access', icon: <QrCode className="w-4 h-4" />, category: 'Operations' },
    { id: 'issuing', label: 'Issue & Return Tools', icon: <ArrowLeftRight className="w-4 h-4" />, category: 'Operations' },
    { id: 'toolboxes', label: 'Tool Boxes (Kits)', icon: <Package className="w-4 h-4" />, category: 'Operations' },
    { id: 'maintenance', label: 'Reactive Maintenance', icon: <Wrench className="w-4 h-4" />, category: 'Services' },
    { id: 'preventive-maintenance', label: 'Preventive Maintenance', icon: <CalendarClock className="w-4 h-4" />, category: 'Services' },
    { id: 'calibration', label: 'Calibration Tracking', icon: <Gauge className="w-4 h-4" />, category: 'Services' },
    { id: 'employees', label: 'Employee Directory', icon: <Users className="w-4 h-4" />, category: 'People & Vendors' },
    { id: 'suppliers', label: 'Supplier Vendors', icon: <Building2 className="w-4 h-4" />, category: 'People & Vendors' },
    { id: 'projects', label: 'Project Allocations', icon: <Briefcase className="w-4 h-4" />, category: 'People & Vendors' },
    { id: 'inventory', label: 'Physical Audit Check', icon: <ClipboardCheck className="w-4 h-4" />, category: 'Reports & Audit' },
    { id: 'reports', label: 'Financial & Analytics', icon: <BarChart3 className="w-4 h-4" />, category: 'Reports & Audit' },
    { id: 'users', label: 'User RBAC Matrix', icon: <ShieldCheck className="w-4 h-4" />, category: 'Admin' },
    { id: 'settings', label: 'System Settings', icon: <Settings className="w-4 h-4" />, category: 'Admin' },
    { id: 'audit-logs', label: 'Audit Log Trail', icon: <History className="w-4 h-4" />, category: 'Admin' },
  ];

  const isEmployeeRole = activeRole === 'WAREHOUSE_EMPLOYEE';

  const categories = ['Core', 'Operations', 'Services', 'People & Vendors', 'Reports & Audit', 'Admin'];

  return (
    <aside className="w-60 bg-white border-r border-surface-200 flex flex-col flex-shrink-0 min-h-[calc(100vh-5.5rem)] shadow-sm">
      <div className="p-3 space-y-5 overflow-y-auto">
        {categories.map((category) => {
          const items = navigationItems.filter(item => item.category === category);
          if (category === 'Admin' && isEmployeeRole) return null;

          return (
            <div key={category}>
              <p className="px-3 mb-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {t(category)}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${isActive
                          ? 'bg-brand-600 text-white shadow-glow'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-surface-100'
                        }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>
                        {item.icon}
                      </span>
                      <span>{t(item.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
