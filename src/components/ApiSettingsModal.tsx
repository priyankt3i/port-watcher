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

  const resetTimeText =
    rateLimit?.resetAt
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
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-lg bg-[#131822] border border-[#253044] shadow-2xl shadow-black/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E2636] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-50">GitHub API Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure rate-limit authentication and live polling cadence.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close GitHub API Settings"
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1E2636] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* GitHub PAT */}
          <div>
            <label htmlFor="github-pat-input" className="block text-xs font-medium text-slate-200 mb-1.5">
              GitHub Personal Access Token (Optional)
            </label>
            <div className="relative">
              <KeyRound
                className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="github-pat-input"
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md pl-8 pr-9 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowPat((v) => !v)}
                aria-label={showPat ? 'Hide token' : 'Show token'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                Upgrades GitHub REST API quota from 60 to 5,000 req/hr. Stored locally in your browser via <code className="font-mono text-slate-300">localStorage</code>.
              </span>
            </p>
          </div>

          {/* Polling Interval */}
          <div>
            <span className="block text-xs font-medium text-slate-200 mb-2">
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
                  className={`py-2 rounded-md border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    intervalSec === opt.sec
                      ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                      : 'bg-[#0B0E14] border-[#253044] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rate Limit Status Readout */}
          <div className="rounded-md bg-[#0F141D] border border-[#1E2636] px-3.5 py-3 text-xs font-mono">
            <div className="flex items-center justify-between text-slate-400">
              <span>X-RateLimit-Remaining</span>
              <span className="text-slate-100 font-semibold tabular-nums">
                {rateLimit && rateLimit.remaining !== null && rateLimit.limit !== null
                  ? `${rateLimit.remaining} / ${rateLimit.limit}`
                  : pat.trim()
                    ? '5,000 / hr (authenticated)'
                    : '60 / hr (unauthenticated)'}
              </span>
            </div>
            {resetTimeText && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>Window resets at</span>
                <span className="tabular-nums">{resetTimeText}</span>
              </div>
            )}
          </div>

          {/* Clear Local Cache */}
          <div className="pt-3 border-t border-[#1E2636] flex items-center justify-between gap-2">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300 cursor-pointer"
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
                  className="px-2.5 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-semibold cursor-pointer"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-md border border-[#253044] text-xs font-medium text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06130D] text-xs font-semibold cursor-pointer"
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
