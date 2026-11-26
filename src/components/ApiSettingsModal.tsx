import { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, X } from 'lucide-react';
import type { ApiSettings, PollingIntervalSeconds, RateLimitInfo } from '../types/telemetry';

interface ApiSettingsModalProps {
  isOpen: boolean;
  settings: ApiSettings;
  rateLimit: RateLimitInfo | null;
  onClose: () => void;
  onSave: (next: Partial<ApiSettings>) => void;
  onResetAllData: () => void;
}

export function ApiSettingsModal({
  isOpen,
  settings,
  rateLimit,
  onClose,
  onSave,
  onResetAllData,
}: ApiSettingsModalProps) {
  const [pat, setPat] = useState(settings.githubPat);
  const [showPat, setShowPat] = useState(false);
  const [intervalSec, setIntervalSec] = useState<PollingIntervalSeconds>(
    settings.pollingIntervalSeconds
  );
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPat(settings.githubPat);
    setIntervalSec(settings.pollingIntervalSeconds);
    setShowPat(false);
    setConfirmReset(false);
  }, [isOpen, settings]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      githubPat: pat.trim(),
      pollingIntervalSeconds: intervalSec,
    });
    onClose();
  };

  const resetTimeText = rateLimit?.resetAt
    ? new Date(rateLimit.resetAt * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="GitHub API Settings"
    >
      <div
        className="fixed inset-0 bg-slate-950/55 dark:bg-black/75"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-[24px] bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#253044] shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1E2636] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0D0E14] dark:text-white">
              GitHub API Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure rate-limit authentication and live polling cadence.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GitHub API Settings"
            className="w-8 h-8 rounded-full inline-flex items-center justify-center text-slate-500 hover:text-[#0D0E14] dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1E2636] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label
              htmlFor="github-pat-input"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
            >
              GitHub Personal Access Token (Optional)
            </label>
            <div className="relative">
              <KeyRound
                className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="github-pat-input"
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                className="w-full bg-slate-50 dark:bg-[#0B0E14] border border-slate-200 dark:border-[#253044] rounded-xl pl-9 pr-10 py-2.5 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => setShowPat((v) => !v)}
                aria-label={showPat ? 'Hide token' : 'Show token'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Upgrades GitHub REST API quota from 60 to 5,000 req/hr. Stored locally in your browser via <code className="font-mono text-slate-700 dark:text-slate-300">localStorage</code>.
              </span>
            </p>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
              Live API Polling Interval
            </span>
            <div
              role="radiogroup"
              aria-label="Polling Interval"
              className="grid grid-cols-3 gap-2"
            >
              {(
                [
                  { sec: 30, label: '30 sec' },
                  { sec: 60, label: '1 min' },
                  { sec: 300, label: '5 min' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.sec}
                  type="button"
                  role="radio"
                  aria-checked={intervalSec === opt.sec}
                  onClick={() => setIntervalSec(opt.sec)}
                  className={`py-2 rounded-xl border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    intervalSec === opt.sec
                      ? 'bg-[#0D0E14] dark:bg-white border-[#0D0E14] dark:border-white text-white dark:text-[#0D0E14]'
                      : 'bg-slate-50 dark:bg-[#0B0E14] border-slate-200 dark:border-[#253044] text-slate-600 dark:text-slate-400 hover:text-[#0D0E14] dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0E131D] border border-slate-100 dark:border-[#1E2636] px-4 py-3 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span>X-RateLimit-Remaining</span>
              <span className="text-[#0D0E14] dark:text-slate-100 font-semibold tabular-nums">
                {rateLimit && rateLimit.remaining !== null && rateLimit.limit !== null
                  ? `${rateLimit.remaining} / ${rateLimit.limit}`
                  : pat.trim()
                    ? '5,000 / hr (authenticated)'
                    : '60 / hr (unauthenticated)'}
              </span>
            </div>
            {resetTimeText && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                <span>Window resets at</span>
                <span className="tabular-nums">{resetTimeText}</span>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E2636] flex items-center justify-between gap-2">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear Local Cache
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetAllData();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-slate-200 dark:border-[#253044] text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#0D0E14] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-full bg-[#0D0E14] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0D0E14] text-xs font-semibold cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
