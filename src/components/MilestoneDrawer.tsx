import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Gauge,
  GitBranch,
  GitCommitHorizontal,
  Plus,
  RotateCcw,
  Star,
  X,
} from 'lucide-react';
import type { MilestoneScores, RegressionItem, TrackedRepo } from '../types/telemetry';
import {
  createEmptyMilestones,
  formatRelativeTime,
  MILESTONE_LIMITS,
} from '../utils/telemetryLogic';

interface MilestoneDrawerProps {
  repo: TrackedRepo | null;
  onClose: () => void;
  onUpdateMilestones: (repoId: string, nextMilestones: MilestoneScores | null) => void;
  onToggleStar: (repoId: string) => void;
  onOpenBenchmarkModal: (repo: TrackedRepo) => void;
  onToggleRegressionResolved: (repoId: string, regressionId: string) => void;
  onAddRegression: (
    repoId: string,
    regression: Omit<RegressionItem, 'id' | 'reportedAt' | 'resolved'>
  ) => void;
}

const MILESTONE_KEYS: (keyof MilestoneScores)[] = [
  'bootAndRender',
  'worldAndFoliage',
  'lightingAndShaders',
  'audioAndPhysics',
  'framePacingAndStability',
];

export function MilestoneDrawer({
  repo,
  onClose,
  onUpdateMilestones,
  onToggleStar,
  onOpenBenchmarkModal,
  onToggleRegressionResolved,
  onAddRegression,
}: MilestoneDrawerProps) {
  const [baselineMilestones, setBaselineMilestones] = useState<MilestoneScores | null>(null);
  const [baselineRepoId, setBaselineRepoId] = useState<string | null>(null);
  const [showAddReg, setShowAddReg] = useState(false);
  const [regTitle, setRegTitle] = useState('');
  const [regSubsystem, setRegSubsystem] = useState('Lighting & Shaders');
  const [regSeverity, setRegSeverity] = useState<'warning' | 'critical'>('warning');

  useEffect(() => {
    if (repo && repo.id !== baselineRepoId) {
      setBaselineMilestones(repo.milestones ? { ...repo.milestones } : null);
      setBaselineRepoId(repo.id);
      setShowAddReg(false);
      setRegTitle('');
    }
    if (!repo) {
      setBaselineRepoId(null);
      setBaselineMilestones(null);
    }
  }, [repo, baselineRepoId]);

  useEffect(() => {
    if (!repo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [repo, onClose]);

  if (!repo) return null;

  const isDirty =
    (repo.milestones === null) !== (baselineMilestones === null) ||
    (repo.milestones !== null &&
      baselineMilestones !== null &&
      MILESTONE_KEYS.some((k) => repo.milestones![k] !== baselineMilestones[k]));

  const velocity = repo.commitVelocity14d;
  const totalCommits14d = velocity ? velocity.reduce((acc, n) => acc + n, 0) : null;
  const maxDailyCommits = velocity ? Math.max(1, ...velocity) : 1;
  const initials = repo.owner.slice(0, 2).toUpperCase();

  const handleSliderChange = (key: keyof MilestoneScores, value: number) => {
    const base = repo.milestones ?? createEmptyMilestones();
    onUpdateMilestones(repo.id, {
      ...base,
      [key]: value,
    });
  };

  const handleAddRegressionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = regTitle.trim();
    if (!cleaned) return;
    onAddRegression(repo.id, {
      title: cleaned,
      subsystem: regSubsystem,
      severity: regSeverity,
    });
    setRegTitle('');
    setShowAddReg(false);
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-950/50 dark:bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Milestone breakdown for ${repo.fullName}`}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-[#0E131C] border-l border-slate-200 dark:border-[#242F42] h-full overflow-y-auto flex flex-col shadow-2xl"
      >
        {/* Top Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0E131C]/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 dark:border-[#1E2636] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            {repo.avatarUrl ? (
              <img
                src={repo.avatarUrl}
                alt={`${repo.owner} avatar`}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-[#243047] shrink-0"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#192131] border border-slate-200 dark:border-[#253044] flex items-center justify-center font-mono text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0"
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="font-bold text-pink-600 dark:text-pink-400 tabular-nums">
                  Rank #{repo.rank}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span className="text-slate-500 dark:text-cyan-300 truncate">{repo.gpuTarget}</span>
              </div>
              <h2 className="font-display text-lg font-bold text-[#0D0E14] dark:text-white truncate mt-0.5">
                {repo.fullName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {repo.description ??
                  (repo.syncError ? `GitHub: ${repo.syncError}` : 'Description: N/A')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close milestone breakdown drawer"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-[#242F42] bg-white dark:bg-[#131822] text-slate-500 dark:text-slate-400 hover:text-[#0D0E14] dark:hover:text-white inline-flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 flex-1">
          {/* Quick Actions & Metadata Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-[#1E2636]">
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {repo.defaultBranch ?? 'N/A'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {repo.stars !== null ? `${repo.stars.toLocaleString()} stars` : 'stars: N/A'}
              </span>
              <span aria-hidden="true">·</span>
              <span>{repo.openIssues !== null ? `${repo.openIssues} issues` : 'issues: N/A'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleStar(repo.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer ${
                  repo.starred
                    ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-[#131822] border-slate-200 dark:border-[#253044] text-slate-700 dark:text-slate-300 hover:border-slate-400'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${repo.starred ? 'fill-amber-400 text-amber-500' : ''}`} />
                {repo.starred ? 'Watching' : 'Watch'}
              </button>

              <button
                type="button"
                onClick={() => onOpenBenchmarkModal(repo)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D0E14] dark:bg-white text-white dark:text-[#0D0E14] text-xs font-semibold cursor-pointer"
              >
                <Gauge className="w-3.5 h-3.5" />
                Log Benchmark
              </button>

              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${repo.fullName} on GitHub`}
                className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-[#253044] bg-white dark:bg-[#131822] text-slate-600 dark:text-slate-300 hover:text-[#0D0E14] dark:hover:text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Telemetry Readout Row */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-[#131822] border border-slate-100 dark:border-[#1E2636] rounded-2xl p-4">
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Weighted Score</div>
              <div
                data-testid="drawer-playability-score"
                className="font-display text-2xl font-extrabold tabular-nums mt-0.5"
              >
                {repo.playabilityScore !== null ? (
                  <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    {repo.playabilityScore}%
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">N/A</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Avg / 1% Low</div>
              <div
                className={`text-lg font-mono font-bold tabular-nums mt-1 ${
                  repo.avgFps !== null
                    ? 'text-[#0D0E14] dark:text-cyan-300'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {repo.avgFps !== null ? (
                  <>
                    {repo.avgFps.toFixed(1)}
                    <span className="text-xs text-slate-400 font-normal">
                      {' '}
                      / {repo.onePercentLowFps !== null ? repo.onePercentLowFps.toFixed(1) : 'N/A'}
                    </span>
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">RAM Footprint</div>
              <div
                className={`text-lg font-mono font-bold tabular-nums mt-1 ${
                  repo.ramFootprintGb !== null
                    ? 'text-[#0D0E14] dark:text-slate-100'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {repo.ramFootprintGb !== null ? (
                  <>
                    {repo.ramFootprintGb.toFixed(1)}
                    <span className="text-xs text-slate-400 font-normal ml-1">GB</span>
                  </>
                ) : (
                  'N/A'
                )}
              </div>
            </div>
          </div>

          {/* 5 Weighted Milestone Sliders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-bold text-[#0D0E14] dark:text-slate-100">
                  Interactive Milestone Breakdown
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {repo.milestones
                    ? 'Adjust category scores live based on real test results.'
                    : 'Not benchmarked yet (N/A). Move any slider to record a score.'}
                </p>
              </div>
              {isDirty && (
                <button
                  type="button"
                  onClick={() => onUpdateMilestones(repo.id, baselineMilestones)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-pink-600 dark:text-amber-300 hover:underline cursor-pointer whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-[#131822] border border-slate-100 dark:border-[#1E2636] rounded-2xl p-4 space-y-4">
              {MILESTONE_KEYS.map((key) => {
                const meta = MILESTONE_LIMITS[key];
                const rawVal = repo.milestones ? repo.milestones[key] : null;
                const val = rawVal ?? 0;
                const pct = Math.round((val / meta.max) * 100);
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label
                        htmlFor={`drawer-slider-${key}`}
                        className="font-medium text-slate-700 dark:text-slate-200"
                      >
                        {meta.label}
                      </label>
                      <span className="font-mono text-slate-500 dark:text-slate-300 tabular-nums">
                        {rawVal !== null ? (
                          <>
                            <strong className="text-pink-600 dark:text-pink-400">{rawVal}</strong> /{' '}
                            {meta.max} pts ({pct}%)
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">
                            N/A / {meta.max} pts
                          </span>
                        )}
                      </span>
                    </div>
                    <input
                      id={`drawer-slider-${key}`}
                      type="range"
                      min={0}
                      max={meta.max}
                      step={1}
                      value={val}
                      onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                      className="w-full telemetry-slider"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commit Velocity (14 Days) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0D0E14] dark:text-slate-100">
                Commit Velocity (14d)
              </h3>
              <span className="font-mono text-xs text-pink-600 dark:text-cyan-300 tabular-nums">
                {totalCommits14d !== null
                  ? `${totalCommits14d} commits · ${(totalCommits14d / 14).toFixed(1)}/day`
                  : 'N/A'}
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-[#131822] border border-slate-100 dark:border-[#1E2636] rounded-2xl p-4">
              {velocity ? (
                <>
                  <div
                    className="grid grid-cols-14 gap-1.5 items-end h-20"
                    aria-label="14-day daily commit counts bar chart"
                  >
                    {velocity.map((count, i) => {
                      const hPct =
                        count === 0 ? 5 : Math.max(14, Math.round((count / maxDailyCommits) * 100));
                      return (
                        <div key={i} className="flex flex-col items-center justify-end h-full group">
                          <div
                            className={`w-full rounded-t-sm transition-colors ${
                              count === 0
                                ? 'bg-slate-200 dark:bg-[#1E2636]'
                                : 'bg-gradient-to-t from-violet-500 to-pink-500'
                            }`}
                            style={{ height: `${hPct}%` }}
                            title={`Day ${i + 1}: ${count} commits`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    <span>14d ago</span>
                    <span>7d ago</span>
                    <span>Today</span>
                  </div>
                </>
              ) : (
                <div className="py-5 text-center font-mono text-xs text-slate-400 dark:text-slate-500">
                  {repo.syncStatus === 'pending'
                    ? 'Fetching live commit history from GitHub…'
                    : 'Commit velocity: N/A'}
                </div>
              )}

              {repo.recentCommits.length > 0 ? (
                <div className="mt-3.5 pt-3.5 border-t border-slate-200/70 dark:border-[#1E2636] space-y-2.5">
                  {repo.recentCommits.slice(0, 5).map((c) => (
                    <div key={`${c.sha}-${c.timestamp}`} className="flex items-start gap-2 text-xs">
                      <GitCommitHorizontal
                        className="w-3.5 h-3.5 text-pink-500 dark:text-cyan-400 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-800 dark:text-slate-200 hover:text-pink-600 dark:hover:text-cyan-300 leading-snug truncate block font-medium"
                            title={c.message}
                          >
                            {c.message}
                          </a>
                        ) : (
                          <p
                            className="text-slate-800 dark:text-slate-200 leading-snug truncate font-medium"
                            title={c.message}
                          >
                            {c.message}
                          </p>
                        )}
                        <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <span className="text-pink-600 dark:text-cyan-300">{c.sha}</span> ·{' '}
                          {c.author} · {formatRelativeTime(c.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-[#1E2636] text-xs font-mono text-slate-400 text-center">
                  Recent commits: N/A
                </div>
              )}
            </div>
          </div>

          {/* Known Regressions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-[#0D0E14] dark:text-slate-100">
                Known Regressions ({repo.regressions.filter((r) => !r.resolved).length} open)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddReg((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-pink-600 dark:text-amber-300 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddReg ? 'Cancel' : 'Log Regression'}
              </button>
            </div>

            {showAddReg && (
              <form
                onSubmit={handleAddRegressionSubmit}
                className="bg-slate-50 dark:bg-[#131822] border border-slate-200 dark:border-[#253044] rounded-2xl p-4 space-y-2.5"
              >
                <input
                  type="text"
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  placeholder="Describe regression (e.g. RT shadows crash in rain)"
                  aria-label="Regression description"
                  required
                  className="w-full rounded-xl bg-white dark:bg-[#0B0E14] border border-slate-200 dark:border-[#253044] px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-pink-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={regSubsystem}
                    onChange={(e) => setRegSubsystem(e.target.value)}
                    aria-label="Affected subsystem"
                    className="rounded-xl bg-white dark:bg-[#0B0E14] border border-slate-200 dark:border-[#253044] px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="Boot & Render">Boot & Render</option>
                    <option value="World & Foliage">World & Foliage</option>
                    <option value="Lighting & Shaders">Lighting & Shaders</option>
                    <option value="Audio & Physics">Audio & Physics</option>
                    <option value="Frame Pacing">Frame Pacing</option>
                  </select>
                  <select
                    value={regSeverity}
                    onChange={(e) => setRegSeverity(e.target.value as 'warning' | 'critical')}
                    aria-label="Regression severity"
                    className="rounded-xl bg-white dark:bg-[#0B0E14] border border-slate-200 dark:border-[#253044] px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-full bg-[#0D0E14] dark:bg-white text-white dark:text-[#0D0E14] text-xs font-semibold cursor-pointer"
                  >
                    Add Regression
                  </button>
                </div>
              </form>
            )}

            <div className="bg-slate-50 dark:bg-[#131822] border border-slate-100 dark:border-[#1E2636] rounded-2xl divide-y divide-slate-200/70 dark:divide-[#1E2636]">
              {repo.regressions.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 dark:text-slate-400 text-center">
                  No open regressions reported for this branch.
                </div>
              ) : (
                repo.regressions.map((reg) => (
                  <div key={reg.id} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        {reg.resolved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Resolved
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              reg.severity === 'critical'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-amber-600 dark:text-amber-300'
                            }`}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            {reg.severity === 'critical' ? 'Critical' : 'Warning'}
                          </span>
                        )}
                        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                          ·
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">{reg.subsystem}</span>
                      </div>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          reg.resolved
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {reg.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleRegressionResolved(repo.id, reg.id)}
                      className="px-3 py-1 rounded-full border border-slate-200 dark:border-[#253044] bg-white dark:bg-[#0B0E14] text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-emerald-500 shrink-0 cursor-pointer"
                    >
                      {reg.resolved ? 'Reopen' : 'Resolve'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
