import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCheck,
  Moon,
  Plus,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import type { ApiSettings, AppNotification, RateLimitInfo } from '../types/telemetry';
import { formatRelativeTime } from '../utils/telemetryLogic';

interface TopHeaderProps {
  theme: 'light' | 'dark';
  settings: ApiSettings;
  rateLimit: RateLimitInfo | null;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  notifications: AppNotification[];
  browserPermission: NotificationPermission | 'unsupported';
  onToggleTheme: () => void;
  onOpenAddRepo: () => void;
  onOpenSettings: () => void;
  onManualRefresh: () => void;
  onToggleBrowserNotifications: () => void;
  onMarkAllNotificationsRead: () => void;
  onClearNotifications: () => void;
}

const NAV_LINKS = [
  { href: '#race', label: 'Race' },
  { href: '#changes', label: 'Changes' },
  { href: '#history', label: 'History' },
  { href: '#watchlist', label: 'Watchlist' },
  { href: '#scoring', label: 'Scoring' },
];

export function TopHeader({
  theme,
  settings,
  rateLimit,
  isSyncing,
  lastSyncedAt,
  notifications,
  browserPermission,
  onToggleTheme,
  onOpenAddRepo,
  onOpenSettings,
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
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#0B0E14]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1E2636] transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          className="inline-flex items-center gap-2 sm:gap-2.5 whitespace-nowrap shrink-0 group focus-visible:outline-2 focus-visible:outline-pink-500 rounded-md"
        >
          <span
            aria-hidden="true"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full p-[3px] bg-gradient-to-tr from-violet-600 via-pink-500 to-orange-400 flex items-center justify-center shrink-0"
          >
            <span className="w-full h-full rounded-full bg-white dark:bg-[#0B0E14] block" />
          </span>
          <span className="font-display text-base sm:text-lg font-extrabold tracking-tight text-[#0D0E14] dark:text-white">
            PortWatch{' '}
            <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              Live
            </span>
          </span>
        </a>

        {/* Zone 2: Clean Single-Line Section Links */}
        <nav
          aria-label="Sections"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 hover:text-[#0D0E14] dark:hover:text-white transition-colors relative py-1 after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-gradient-to-r after:from-pink-500 after:to-orange-400 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Compact Live Status + Utility Controls + Primary Action */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quiet Live Sync Status (Unboxed text) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pr-2 whitespace-nowrap">
            {isSyncing ? (
              <span className="font-mono text-pink-600 dark:text-pink-400">Syncing…</span>
            ) : settings.simulationMode ? (
              <span className="font-mono text-amber-600 dark:text-amber-400">Sim mode</span>
            ) : (
              <span className="tabular-nums">
                {lastSyncedAt ? `Synced ${formatRelativeTime(lastSyncedAt)}` : 'Live GitHub'}
              </span>
            )}
            {!settings.simulationMode &&
              rateLimit &&
              rateLimit.remaining !== null &&
              rateLimit.limit !== null && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                    ·
                  </span>
                  <span className="font-mono text-[11px] tabular-nums">
                    {rateLimit.remaining}/{rateLimit.limit}
                  </span>
                </>
              )}
          </div>

          {/* Manual Refresh (hidden on narrow mobile since Hero has Sync action) */}
          <button
            type="button"
            onClick={onManualRefresh}
            disabled={isSyncing}
            aria-label="Manual Refresh"
            title={
              settings.simulationMode
                ? 'Inject simulated telemetry update'
                : 'Refresh live GitHub metadata now'
            }
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 dark:border-[#232D42] bg-white dark:bg-[#131822] text-slate-600 dark:text-slate-300 hover:text-[#0D0E14] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-pink-500' : ''}`} />
          </button>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 dark:border-[#232D42] bg-white dark:bg-[#131822] text-slate-600 dark:text-slate-300 hover:text-[#0D0E14] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* GitHub API Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="GitHub API Settings"
            title="GitHub API Settings (PAT & polling interval)"
            className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 dark:border-[#232D42] bg-white dark:bg-[#131822] text-slate-600 dark:text-slate-300 hover:text-[#0D0E14] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
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
              className="relative inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-200 dark:border-[#232D42] bg-white dark:bg-[#131822] text-slate-600 dark:text-slate-300 hover:text-[#0D0E14] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white font-mono text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="dialog"
                aria-label="Notifications panel"
                className="absolute -right-14 sm:right-0 mt-2.5 w-[min(calc(100vw-24px),24rem)] rounded-2xl bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#253044] shadow-2xl shadow-slate-900/15 dark:shadow-black/60 z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1E2636] flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Notifications
                  </span>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={onClearNotifications}
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Browser Push Notification Toggle */}
                <div className="px-4 py-3 bg-slate-50 dark:bg-[#0E131D] border-b border-slate-100 dark:border-[#1E2636] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Browser Push Alerts
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {browserPermission === 'unsupported'
                        ? 'Not supported in this browser'
                        : browserPermission === 'denied'
                          ? 'Blocked in browser site settings'
                          : settings.browserNotificationsEnabled && browserPermission === 'granted'
                            ? 'Enabled for lead changes & alert rules'
                            : 'Allow desktop notifications on alerts'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={
                      settings.browserNotificationsEnabled && browserPermission === 'granted'
                    }
                    disabled={browserPermission === 'unsupported'}
                    onClick={onToggleBrowserNotifications}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
                      settings.browserNotificationsEnabled && browserPermission === 'granted'
                        ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-[#131822] border-slate-200 dark:border-[#253044] text-slate-700 dark:text-slate-300 hover:border-slate-400'
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
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E2636]">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                      No alert notifications yet. Lead changes, new contenders, and triggered rules appear here.
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className={`px-4 py-3 text-xs ${
                          item.read ? 'opacity-65' : 'bg-pink-50/40 dark:bg-[#171E2C]/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`font-semibold ${
                              item.variant === 'emerald'
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : item.variant === 'amber'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-pink-700 dark:text-cyan-300'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0 tabular-nums">
                            {formatRelativeTime(item.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Primary CTA: Track Repo */}
          <button
            type="button"
            onClick={onOpenAddRepo}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#0D0E14] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0D0E14] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>
              Track<span className="hidden sm:inline"> Repo</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
