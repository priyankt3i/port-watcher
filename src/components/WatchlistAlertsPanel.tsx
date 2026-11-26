import { useState } from 'react';
import { Bell, Plus, Star, Trash2 } from 'lucide-react';
import type { AlertConditionType, AlertRule, GpuTarget, TrackedRepo } from '../types/telemetry';

interface WatchlistAlertsPanelProps {
  repos: TrackedRepo[];
  rules: AlertRule[];
  onSelectRepo: (repoId: string) => void;
  onToggleStar: (repoId: string) => void;
  onToggleRule: (ruleId: string) => void;
  onDeleteRule: (ruleId: string) => void;
  onAddRule: (rule: Omit<AlertRule, 'id' | 'triggeredCount'>) => void;
}

export function WatchlistAlertsPanel({
  repos,
  rules,
  onSelectRepo,
  onToggleStar,
  onToggleRule,
  onDeleteRule,
  onAddRule,
}: WatchlistAlertsPanelProps) {
  const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist'>('alerts');
  const [showBuilder, setShowBuilder] = useState(false);

  const [conditionType, setConditionType] = useState<AlertConditionType>('gpu_fps_gt');
  const [gpuTarget, setGpuTarget] = useState<GpuTarget>('NVIDIA Ada/Blackwell');
  const [repoId, setRepoId] = useState<string>(repos[0]?.id ?? '');
  const [threshold, setThreshold] = useState<string>('20');

  const starredRepos = repos.filter((r) => r.starred).sort((a, b) => a.rank - b.rank);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const numericThreshold = Number(threshold);

    if (conditionType === 'new_leader') {
      onAddRule({
        label: 'Alert on any New Rank #1 Leader',
        conditionType: 'new_leader',
        enabled: true,
      });
    } else if (conditionType === 'gpu_fps_gt') {
      if (Number.isNaN(numericThreshold) || numericThreshold <= 0) return;
      onAddRule({
        label: `Notify when any ${gpuTarget} repo exceeds ${numericThreshold} FPS`,
        conditionType: 'gpu_fps_gt',
        gpuTarget,
        threshold: numericThreshold,
        enabled: true,
      });
    } else if (conditionType === 'gpu_score_gt') {
      if (Number.isNaN(numericThreshold) || numericThreshold <= 0 || numericThreshold > 100) return;
      onAddRule({
        label: `Notify when any ${gpuTarget} repo exceeds ${numericThreshold}% score`,
        conditionType: 'gpu_score_gt',
        gpuTarget,
        threshold: numericThreshold,
        enabled: true,
      });
    } else if (conditionType === 'repo_score_gt') {
      const target = repos.find((r) => r.id === (repoId || repos[0]?.id));
      if (!target || Number.isNaN(numericThreshold) || numericThreshold <= 0 || numericThreshold > 100) return;
      onAddRule({
        label: `Notify when ${target.fullName} exceeds ${numericThreshold}% score`,
        conditionType: 'repo_score_gt',
        repoId: target.id,
        threshold: numericThreshold,
        enabled: true,
      });
    }

    setShowBuilder(false);
  };

  return (
    <section
      id="watchlist"
      aria-label="Custom Watchlist and Alert Rules"
      className="scroll-mt-24 rounded-[22px] bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-[#1E2636] shadow-[0_10px_30px_-18px_rgba(15,23,42,0.1)] dark:shadow-none overflow-hidden flex flex-col"
    >
      <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E2636] flex items-center justify-between gap-2">
        <div
          role="tablist"
          aria-label="Watchlist and Alert Rules"
          className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-[#0D1119] border border-slate-200/70 dark:border-[#1E2636]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'alerts'}
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'alerts'
                ? 'bg-white dark:bg-[#1D2638] text-[#0D0E14] dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Alert Rules ({rules.filter((r) => r.enabled).length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'watchlist'}
            onClick={() => setActiveTab('watchlist')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'watchlist'
                ? 'bg-white dark:bg-[#1D2638] text-[#0D0E14] dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Watchlist ({starredRepos.length})
          </button>
        </div>

        {activeTab === 'alerts' && (
          <button
            type="button"
            onClick={() => setShowBuilder((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#253044] bg-white dark:bg-[#0E131D] text-xs font-semibold text-pink-600 dark:text-pink-400 hover:border-pink-400 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Rule
          </button>
        )}
      </div>

      {activeTab === 'alerts' ? (
        <div className="flex-1">
          {showBuilder && (
            <form
              onSubmit={handleCreateRule}
              className="p-5 bg-slate-50 dark:bg-[#0E131D] border-b border-slate-100 dark:border-[#1E2636] space-y-3"
            >
              <div>
                <label
                  htmlFor="rule-type"
                  className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1"
                >
                  Trigger Condition
                </label>
                <select
                  id="rule-type"
                  value={conditionType}
                  onChange={(e) => setConditionType(e.target.value as AlertConditionType)}
                  className="w-full bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#253044] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="gpu_fps_gt">GPU Architecture exceeds FPS</option>
                  <option value="gpu_score_gt">GPU Architecture exceeds Playability %</option>
                  <option value="repo_score_gt">Specific Repo exceeds Playability %</option>
                  <option value="new_leader">Any New Rank #1 Leader</option>
                </select>
              </div>

              {(conditionType === 'gpu_fps_gt' || conditionType === 'gpu_score_gt') && (
                <div>
                  <label
                    htmlFor="rule-gpu"
                    className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Target GPU
                  </label>
                  <select
                    id="rule-gpu"
                    value={gpuTarget}
                    onChange={(e) => setGpuTarget(e.target.value as GpuTarget)}
                    className="w-full bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#253044] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="NVIDIA Ada/Blackwell">NVIDIA Ada/Blackwell</option>
                    <option value="AMD RDNA3/4">AMD RDNA3/4</option>
                    <option value="Multi-Vendor / Vulkan">Multi-Vendor / Vulkan</option>
                  </select>
                </div>
              )}

              {conditionType === 'repo_score_gt' && (
                <div>
                  <label
                    htmlFor="rule-repo"
                    className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Repository
                  </label>
                  <select
                    id="rule-repo"
                    value={repoId || repos[0]?.id || ''}
                    onChange={(e) => setRepoId(e.target.value)}
                    className="w-full bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#253044] rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {repos.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {conditionType !== 'new_leader' && (
                <div>
                  <label
                    htmlFor="rule-threshold"
                    className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1"
                  >
                    Threshold ({conditionType === 'gpu_fps_gt' ? 'FPS' : 'Playability %'})
                  </label>
                  <input
                    id="rule-threshold"
                    type="number"
                    min={1}
                    max={conditionType === 'gpu_fps_gt' ? 240 : 100}
                    step={conditionType === 'gpu_fps_gt' ? '0.5' : '1'}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    required
                    className="w-full bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#253044] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
                  className="px-3 py-1.5 rounded-full text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#0D0E14] dark:bg-white text-white dark:text-[#0D0E14] text-xs font-semibold cursor-pointer"
                >
                  Save Rule
                </button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-[#1A2231]">
            {rules.length === 0 ? (
              <div className="px-5 py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No custom alert rules configured. Create a rule to get notified on FPS or rank milestones.
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-[#171E2C]/60 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Bell
                        className={`w-3.5 h-3.5 shrink-0 ${
                          rule.enabled
                            ? 'text-pink-500 dark:text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`text-xs font-semibold leading-snug ${
                          rule.enabled
                            ? 'text-slate-800 dark:text-slate-200'
                            : 'text-slate-400 dark:text-slate-500 line-through'
                        }`}
                      >
                        {rule.label}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-slate-400 dark:text-slate-500 tabular-nums pl-5.5">
                      {rule.enabled ? 'Armed' : 'Paused'} · Fired {rule.triggeredCount}x
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={`Toggle rule: ${rule.label}`}
                      onClick={() => onToggleRule(rule.id)}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                        rule.enabled
                          ? 'bg-gradient-to-r from-pink-500 to-orange-500'
                          : 'bg-slate-200 dark:bg-[#253044]'
                      }`}
                    >
                      <span
                        className={`block w-3.5 h-3.5 rounded-full bg-white shadow-xs transition-transform absolute top-[3px] ${
                          rule.enabled ? 'translate-x-[19px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      aria-label={`Delete rule: ${rule.label}`}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-[#1A2231]">
          {starredRepos.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              Star any repository in the leaderboard to pin it to your priority watchlist.
            </div>
          ) : (
            starredRepos.map((repo) => (
              <div
                key={repo.id}
                className="px-5 py-3.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 dark:hover:bg-[#171E2C]/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onSelectRepo(repo.id)}
                  className="min-w-0 text-left flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-pink-600 dark:text-pink-400 tabular-nums">
                      #{repo.rank}
                    </span>
                    <span className="text-xs font-bold text-[#0D0E14] dark:text-slate-100 hover:text-pink-600 dark:hover:text-pink-400 truncate">
                      {repo.fullName}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {repo.playabilityScore !== null ? `${repo.playabilityScore}% score` : 'Score: N/A'} ·{' '}
                    {repo.avgFps !== null ? `${repo.avgFps.toFixed(1)} FPS` : 'FPS: N/A'} ·{' '}
                    {repo.ramFootprintGb !== null ? `${repo.ramFootprintGb.toFixed(1)} GB` : 'RAM: N/A'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStar(repo.id)}
                  aria-label={`Unstar ${repo.fullName}`}
                  className="p-1.5 text-amber-500 hover:text-slate-400 cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
