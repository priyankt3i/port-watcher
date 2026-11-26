import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  Terminal,
} from 'lucide-react';
import type { ApiSettings, AppNotification, RateLimitInfo } from '../types/telemetry';
import { formatRelativeTime } from '../utils/telemetryLogic';

interface TopHeaderProps {
  settings: ApiSettings;
  rateLimit: RateLimitInfo | null;
  isSyncing: boolean;
  notifications: AppNotification[];
  browserPermission: NotificationPermission | 'unsupported';
  onOpenAddRepo: () => void;
  onOpenSettings: () => void;
  onToggleSimulation: () => void;
  onManualRefresh: () => void;
  onToggleBrowserNotifications: () => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
}

export function TopHeader({
  settings,
  rateLimit,
  isSyncing,
  notifications,
  browserPermission,
  onOpenAddRepo,
  onOpenSettings,
  onToggleSimulation,
  onManualRefresh,
  onToggleBrowserNotifications,
  onMarkAllNotificationsRead,
  onClearNotifications,
}: TopHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [notifOpen]);

  return (
    <header className="sticky top-0 z-30 bg-[#0B0E14]/95 backdrop-blur-md border-b border-[#1E2636]">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand + Live Telemetry Status & Data Source Mode */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-md bg-emerald-500/12 border border-emerald-500/30 flex items-center justify-center text-emerald-400"
            >
              <Terminal className="w-4 h-4" />
            </span>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap">
              PortWatch Live
            </h1>
          </div>

          <span
            aria-label="Live telemetry active"
            className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-mono font-semibold tracking-wider text-emerald-300 whitespace-nowrap shrink-0"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            LIVE TELEMETRY
          </span>

          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-slate-400 whitespace-nowrap shrink-0 pl-1">
            <span className={settings.simulationMode ? 'text-amber-300' : 'text-cyan-300'}>
              {settings.simulationMode ? 'Mode: Simulation' : 'Mode: Live GitHub API'}
            </span>
            {!settings.simulationMode &&
              rateLimit &&
              rateLimit.remaining !== null &&
              rateLimit.limit !== null && (
              <>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="tabular-nums text-slate-400">
                  API Quota: {rateLimit.remaining}/{rateLimit.limit}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right: Mission Control Action Bar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Simulation Mode Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={settings.simulationMode}
            onClick={onToggleSimulation}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              settings.simulationMode
                ? 'bg-amber-500/12 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
                : 'bg-[#131822] border-[#253044] text-slate-300 hover:border-slate-500 hover:text-slate-100'
            }`}
            title="Toggle Live Simulation Mode (auto-injects realistic commit events & score updates every 8-12s)"
          >
            <Radio className={`w-3.5 h-3.5 ${settings.simulationMode ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline">
              {settings.simulationMode ? 'Sim On' : 'Sim Off'}
            </span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isSyncing}
            aria-label="Manual Refresh"
            title={
              settings.simulationMode
                ? 'Inject immediate simulated telemetry event'
                : 'Poll GitHub REST API now'
            }
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#253044] bg-[#131822] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          {/* GitHub API Settings Gear */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="GitHub API Settings"
            title="GitHub API Settings (Personal Access Token & polling interval)"
            className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#253044] bg-[#131822] text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Notifications Bell & Popover */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              aria-expanded={notifOpen}
              title="Notifications & Browser Push Alerts"
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#253044] bg-[#131822] text-slate-300 hover:text-slate-100 hover:border-slate-500 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded bg-emerald-500 text-[#07110C] font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications panel"
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-[#131822] border border-[#253044] shadow-2xl shadow-black/60 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-[#1E2636] flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearNotifications}
                        className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Browser Push Notification Toggle */}
                <div className="px-4 py-3 bg-[#0F141D] border-b border-[#1E2636] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200">Browser Push Notifications</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {browserPermission === 'unsupported'
                        ? 'Not supported in this browser'
                        : browserPermission === 'denied'
                          ? 'Blocked in browser site settings'
                          : settings.browserNotificationsEnabled && browserPermission === 'granted'
                            ? 'Enabled for lead changes & custom alerts'
                            : 'Request permission for desktop alerts'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.browserNotificationsEnabled && browserPermission === 'granted'}
                    disabled={browserPermission === 'unsupported'}
                    onClick={onToggleBrowserNotifications}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                      settings.browserNotificationsEnabled && browserPermission === 'granted'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#131822] border-[#253044] text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {settings.browserNotificationsEnabled && browserPermission === 'granted' ? (
                      <>
                        <Bell className="w-3 h-3" />
                        On
                      </>
                    ) : (
                      <>
                        <BellOff className="w-3 h-3" />
                        Enable
                      </>
                    )}
                  </button>
                </div>

                {/* Notification List */}
                <div className="max-h-72 overflow-y-auto divide-y divide-[#1E2636]">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-400">
                      No alert notifications yet. Lead changes, new contenders, and triggered rules appear here.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`px-4 py-3 text-xs ${item.read ? 'opacity-70' : 'bg-[#171E2C]/60'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`font-semibold ${
                              item.variant === 'emerald'
                                ? 'text-emerald-300'
                                : item.variant === 'amber'
                                  ? 'text-amber-300'
                                  : 'text-cyan-300'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500 shrink-0 tabular-nums">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-300 mt-1 leading-relaxed">{item.body}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA: + Track Repo */}
          <button
            type="button"
            onClick={onOpenAddRepo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06130D] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Track Repo</span>
          </button>
        </div>
      </div>

      {/* Compact sub-strip on smaller screens showing current Data Mode */}
      <div className="xl:hidden border-t border-[#18202E] bg-[#0D1119] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className={settings.simulationMode ? 'text-amber-300' : 'text-cyan-300'}>
          {settings.simulationMode ? 'Mode: Simulation (auto-tick 8-12s)' : 'Mode: Live GitHub API'}
        </span>
        {!settings.simulationMode &&
          rateLimit &&
          rateLimit.remaining !== null &&
          rateLimit.limit !== null && (
          <span className="tabular-nums">
            Quota: {rateLimit.remaining}/{rateLimit.limit}
          </span>
        )}
      </div>
    </header>
  );
}
