import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { RoleSwitcher } from './RoleSwitcher';
import { LanguageSelector } from './LanguageSelector';
import {
  QrCode, Bell, Search, Warehouse, ShieldAlert, Clock, User as UserIcon, X,
  Package, Users, Wrench, Box, Gauge, Folder, Building2, ChevronRight, FileText,
  CalendarClock
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser, activeRole, notifications, markNotificationAsRead,
    globalSearch, setGlobalSearch, setActiveModule, setSelectedAssetFor360,
    assets, employees, maintenanceTasks, maintenancePlans, toolBoxes,
    serviceOrders, calibrations, projects, suppliers
  } = useWarehouseStore();

  const { t } = useLanguageStore();

  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
        ' · ' +
        now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside & Escape key to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const query = globalSearch.trim().toLowerCase();

  // ─── SEARCH MATCHES ACROSS ALL APP ENTITIES ────────────────────────────────
  const matchingAssets = useMemo(() => {
    if (!query) return [];
    return assets.filter(a =>
      a.name.toLowerCase().includes(query) ||
      a.assetNumber.toLowerCase().includes(query) ||
      a.qrCode.toLowerCase().includes(query) ||
      a.serialNumber.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      a.location.toLowerCase().includes(query) ||
      a.manufacturer.toLowerCase().includes(query) ||
      a.model.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [assets, query]);

  const matchingEmployees = useMemo(() => {
    if (!query) return [];
    return employees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(query) ||
      e.employeeNumber.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.department.toLowerCase().includes(query) ||
      e.position.toLowerCase().includes(query)
    ).slice(0, 4);
  }, [employees, query]);

  const matchingTasks = useMemo(() => {
    if (!query) return [];
    return maintenanceTasks.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.taskNumber.toLowerCase().includes(query) ||
      (t.assetName && t.assetName.toLowerCase().includes(query)) ||
      (t.assetNumber && t.assetNumber.toLowerCase().includes(query))
    ).slice(0, 4);
  }, [maintenanceTasks, query]);

  const matchingPlans = useMemo(() => {
    if (!query) return [];
    return maintenancePlans.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.description && p.description.toLowerCase().includes(query)) ||
      p.type.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [maintenancePlans, query]);

  const matchingToolBoxes = useMemo(() => {
    if (!query) return [];
    return toolBoxes.filter(b =>
      b.name.toLowerCase().includes(query) ||
      b.boxNumber.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [toolBoxes, query]);

  const matchingServiceOrders = useMemo(() => {
    if (!query) return [];
    return serviceOrders.filter(s =>
      s.id.toLowerCase().includes(query) ||
      s.problemDescription.toLowerCase().includes(query) ||
      s.status.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [serviceOrders, query]);

  const matchingCalibrations = useMemo(() => {
    if (!query) return [];
    return calibrations.filter(c =>
      c.certificateNumber.toLowerCase().includes(query) ||
      (c.notes && c.notes.toLowerCase().includes(query))
    ).slice(0, 3);
  }, [calibrations, query]);

  const matchingProjects = useMemo(() => {
    if (!query) return [];
    return projects.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.projectCode.toLowerCase().includes(query) ||
      p.client.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [projects, query]);

  const matchingSuppliers = useMemo(() => {
    if (!query) return [];
    return suppliers.filter(s =>
      s.companyName.toLowerCase().includes(query) ||
      s.contactPerson.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query)
    ).slice(0, 3);
  }, [suppliers, query]);

  const totalResults =
    matchingAssets.length +
    matchingEmployees.length +
    matchingTasks.length +
    matchingPlans.length +
    matchingToolBoxes.length +
    matchingServiceOrders.length +
    matchingCalibrations.length +
    matchingProjects.length +
    matchingSuppliers.length;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleSelectAsset = (asset: any) => {
    setSelectedAssetFor360(asset);
    setShowSearchDropdown(false);
  };

  const handleNavigateModule = (moduleName: string) => {
    setActiveModule(moduleName);
    setShowSearchDropdown(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-surface-200 shadow-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Logo & Application Name */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveModule('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center shadow-sm">
              <Warehouse className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  EQUIP-TRACK
                </span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-brand-100 text-brand-700 border border-brand-200">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block leading-none mt-0.5">
                {t('header.subtitle')}
              </p>
            </div>
          </div>

          {/* QR Scanner Button */}
          <button
            onClick={() => setActiveModule('qr-scan')}
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-all active:scale-95 shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">{t('Scan Tool Qr')}</span>
          </button>

          {/* Global Search Bar & Interactive Overlay */}
          <div ref={searchContainerRef} className="flex-1 max-w-md relative hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('Search assets, employees, maintenance, boxes, codes...')}
                value={globalSearch}
                onFocus={() => setShowSearchDropdown(true)}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowSearchDropdown(true);
                }}
                className="w-full bg-surface-50 border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 text-slate-700 placeholder-slate-400 text-xs rounded-lg pl-9 pr-8 py-2 outline-none transition-all"
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-surface-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Floating Search Overlay Popup */}
            {showSearchDropdown && query.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-surface-200 rounded-xl shadow-2xl z-50 max-h-[75vh] overflow-y-auto divide-y divide-surface-100 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header info */}
                <div className="px-4 py-2.5 bg-surface-50 border-b border-surface-200 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t('Global Search Results')} ({totalResults})
                  </span>
                  <span className="text-[10px] text-slate-400">Esc to close</span>
                </div>

                {totalResults === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">{t('No items match')} "{globalSearch}"</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{t('Try searching by asset code, serial number, employee name, task or project.')}</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-3">
                    {/* Assets Group */}
                    {matchingAssets.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-brand-700 uppercase tracking-wider">
                          <Package className="w-3.5 h-3.5 text-brand-600" />
                          <span>{t('Assets')} ({matchingAssets.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingAssets.map(ast => (
                            <button
                              key={ast.id}
                              onClick={() => handleSelectAsset(ast)}
                              className="w-full text-left p-2 rounded-lg hover:bg-brand-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-brand-700 flex items-center gap-2">
                                  <span>{ast.name}</span>
                                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">{ast.assetNumber}</span>
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  SN: {ast.serialNumber} • {ast.category} • {ast.location}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Employees Group */}
                    {matchingEmployees.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                          <Users className="w-3.5 h-3.5 text-purple-600" />
                          <span>{t('Employees')} ({matchingEmployees.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingEmployees.map(emp => (
                            <button
                              key={emp.id}
                              onClick={() => handleNavigateModule('employees')}
                              className="w-full text-left p-2 rounded-lg hover:bg-purple-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 flex items-center gap-2">
                                  <span>{emp.firstName} {emp.lastName}</span>
                                  <span className="font-mono text-[10px] text-purple-600 bg-purple-100 px-1.5 rounded">{emp.employeeNumber}</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {emp.department} • {emp.position}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Maintenance Tasks Group */}
                    {matchingTasks.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                          <Wrench className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('Maintenance Tasks')} ({matchingTasks.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingTasks.map(task => (
                            <button
                              key={task.id}
                              onClick={() => handleNavigateModule('maintenance')}
                              className="w-full text-left p-2 rounded-lg hover:bg-amber-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-amber-700 flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-amber-700 bg-amber-100 px-1.5 rounded">{task.taskNumber}</span>
                                  <span>{task.title}</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Asset: {task.assetName || task.assetId} • Status: {task.status}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Maintenance Plans Group */}
                    {matchingPlans.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                          <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{t('Maintenance Recurrence Plans')} ({matchingPlans.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingPlans.map(plan => (
                            <button
                              key={plan.id}
                              onClick={() => handleNavigateModule('maintenance')}
                              className="w-full text-left p-2 rounded-lg hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                                  {plan.name}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Type: {plan.type} • Frequency: {plan.frequency} {plan.frequencyUnit}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tool Boxes Group */}
                    {matchingToolBoxes.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                          <Box className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t('Tool Boxes & Kits')} ({matchingToolBoxes.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingToolBoxes.map(box => (
                            <button
                              key={box.id}
                              onClick={() => handleNavigateModule('toolboxes')}
                              className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-emerald-700 bg-emerald-100 px-1.5 rounded">{box.boxNumber}</span>
                                  <span>{box.name}</span>
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Calibration Records Group */}
                    {matchingCalibrations.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-cyan-700 uppercase tracking-wider">
                          <Gauge className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{t('Calibration Certificates')} ({matchingCalibrations.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingCalibrations.map(cal => (
                            <button
                              key={cal.id}
                              onClick={() => handleNavigateModule('calibration')}
                              className="w-full text-left p-2 rounded-lg hover:bg-cyan-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-cyan-700 flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-cyan-700 bg-cyan-100 px-1.5 rounded">{cal.certificateNumber}</span>
                                  <span>Result: {cal.result}</span>
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-cyan-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Projects Group */}
                    {matchingProjects.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                          <Folder className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t('Projects')} ({matchingProjects.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingProjects.map(proj => (
                            <button
                              key={proj.id}
                              onClick={() => handleNavigateModule('projects')}
                              className="w-full text-left p-2 rounded-lg hover:bg-blue-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700 flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-1.5 rounded">{proj.projectCode}</span>
                                  <span>{proj.name}</span>
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Client: {proj.client}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suppliers Group */}
                    {matchingSuppliers.length > 0 && (
                      <div>
                        <div className="px-2 py-1 flex items-center gap-1.5 text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                          <Building2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>{t('Suppliers')} ({matchingSuppliers.length})</span>
                        </div>
                        <div className="space-y-1 mt-1">
                          {matchingSuppliers.map(sup => (
                            <button
                              key={sup.id}
                              onClick={() => handleNavigateModule('suppliers')}
                              className="w-full text-left p-2 rounded-lg hover:bg-rose-50 flex items-center justify-between group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-800 group-hover:text-rose-700">
                                  {sup.companyName}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Contact: {sup.contactPerson} ({sup.email})</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">

            <LanguageSelector />

            {/* Live Clock */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-slate-500 bg-surface-50 px-2.5 py-1.5 rounded-lg border border-surface-200">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>{timeStr}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg bg-surface-50 border border-surface-200 hover:border-brand-300 hover:bg-brand-50 text-slate-500 hover:text-brand-600 transition-all"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-surface-200 rounded-xl shadow-panel z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-50 border-b border-surface-200">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <span className="font-semibold text-xs text-slate-700">{t('header.systemAlerts')}</span>
                    </div>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-surface-100">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-400 text-center">{t('header.noNotifications')}</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3 text-xs cursor-pointer transition-colors ${n.isRead
                            ? 'bg-white text-slate-400'
                            : 'bg-brand-50 text-slate-700 hover:bg-brand-100'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-brand-700">{t(n.title)}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed text-[11px]">{t(n.message)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current User Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-50 border border-surface-200">
              <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.firstName?.[0] || 'U'}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-800 leading-tight">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-[10px] text-slate-400 font-mono capitalize">{t(activeRole)}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Role Switcher Bar */}
        <div className="pb-2 border-t border-surface-100 pt-2 flex items-center justify-between overflow-x-auto">
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
};
