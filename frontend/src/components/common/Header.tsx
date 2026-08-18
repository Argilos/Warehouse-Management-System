import React, { useState, useEffect } from 'react';
import { useWarehouseStore } from '../../store/useWarehouseStore';
import { useLanguageStore } from '../../store/useLanguageStore';
import { RoleSwitcher } from './RoleSwitcher';
import { LanguageSelector } from './LanguageSelector';
import {
  QrCode, Bell, Search, Warehouse, ShieldAlert, Clock, User as UserIcon, X
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser, activeRole, notifications, markNotificationAsRead,
    globalSearch, setGlobalSearch, setActiveModule
  } = useWarehouseStore();

  const { t } = useLanguageStore();

  const [timeStr, setTimeStr] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);

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

  const unreadCount = notifications.filter(n => !n.isRead).length;

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
            className="flex items-center gap-2 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold text-xs shadow-sm transition-all active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">{t('header.scanToolQr')}</span>
          </button>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-md hidden lg:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('header.searchPlaceholder')}
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full bg-surface-50 border border-surface-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 text-slate-700 placeholder-slate-400 text-xs rounded-lg pl-9 pr-4 py-2 outline-none transition-all"
              />
            </div>
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
                <p className="text-[10px] text-slate-400 font-mono capitalize">{activeRole.replace('_', ' ')}</p>
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
