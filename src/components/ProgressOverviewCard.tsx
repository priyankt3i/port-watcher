import type { GlobalTelemetryStats, TrackedRepo } from '../types/telemetry';

interface ProgressOverviewCardProps {
  stats: GlobalTelemetryStats;
  repos: TrackedRepo[];
  onSelectRepo: (repoId: string) => void;
}

const MILESTONE_MARKERS = [
  { pct: 0, label: 'Groundwork' },
  { pct: 10, label: 'Exe runs' },
  { pct: 20, label: 'First frame' },
  { pct: 30, label: 'Main menu' },
  { pct: 40, label: 'In world' },
  { pct: 50, label: 'Playable' },
  { pct: 100, label: 'Complete' },
];

function getFurthestMilestoneLabel(score: number | null): string {
  if (score === null) return 'N/A';
  if (score >= 95) return 'Complete';
  if (score >= 50) return 'Playable';
  if (score >= 40) return 'In world';
  if (score >= 30) return 'Main menu';
  if (score >= 20) return 'First frame';
  if (score >= 10) return 'Exe runs';
  return 'Groundwork';
}

export function ProgressOverviewCard({
  stats,
  repos,
  onSelectRepo,
}: ProgressOverviewCardProps) {
  const benchmarkedRepos = repos
    .filter((r) => r.playabilityScore !== null)
    .sort((a, b) => (b.playabilityScore ?? 0) - (a.playabilityScore ?? 0));

  const liveTopRepos = repos
    .filter((r) => r.syncStatus === 'live')
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 6);

  const fillPct = stats.highestScore !== null ? Math.min(100, Math.max(0, stats.highestScore)) : 0;

  return (
    <section
      aria-label="Global telemetry statistics"
      className="relative z-10 -mt-16 sm:-mt-20 mx-2 sm:mx-6 rounded-[24px] bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-[#1E2636] shadow-[0_20px_50px_-20px_rgba(15,23,42,0.14)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] p-6 sm:p-8"
    >
      {/* Top Row: Giant Focal Progress Figure + 4 Metric Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-10 items-center">
        <div>
          <p className="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400">
            Overall progress · closest benchmarked effort to playable
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            {stats.highestScore !== null ? (
              <>
                <span className="font-display text-6xl sm:text-7xl font-extrabold tracking-[-0.04em] tabular-nums bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                  {stats.highestScore}
                </span>
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-pink-500">
                  %
                </span>
              </>
            ) : (
              <span className="font-display text-5xl sm:text-6xl font-extrabold tracking-[-0.03em] text-slate-300 dark:text-slate-600">
                N/A
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {stats.leaderFullName ? (
              <>
                Current leader:{' '}
                <button
                  type="button"
                  onClick={() => {
                    const leader = repos.find((r) => r.fullName === stats.leaderFullName);
                    if (leader) onSelectRepo(leader.id);
                  }}
                  className="font-semibold text-[#0D0E14] dark:text-white underline decoration-slate-300 dark:decoration-slate-600 underline-offset-4 hover:decoration-pink-500 cursor-pointer"
                >
                  {stats.leaderFullName}
                </button>{' '}
                <span className="text-slate-500 dark:text-slate-400">
                  {stats.leaderScore !== null
                    ? `at ${stats.leaderScore}% weighted score.`
                    : stats.leaderStars !== null
                      ? `(${stats.leaderStars.toLocaleString()} GitHub stars · no benchmarks logged yet).`
                      : '(awaiting live sync).'}
                </span>
              </>
            ) : (
              'Awaiting live GitHub sync or first logged benchmark.'
            )}
          </p>
        </div>

        {/* 4 Clean Sub-Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1119] border border-slate-100 dark:border-[#1B2232] px-4 py-3.5 min-w-[120px]">
            <div className="font-display text-lg sm:text-xl font-bold text-[#0D0E14] dark:text-white tabular-nums">
              {getFurthestMilestoneLabel(stats.highestScore)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Furthest milestone
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1119] border border-slate-100 dark:border-[#1B2232] px-4 py-3.5 min-w-[120px]">
            <div className="font-display text-lg sm:text-xl font-bold text-[#0D0E14] dark:text-white tabular-nums">
              {stats.peakFps !== null ? `${stats.peakFps.toFixed(1)} FPS` : 'N/A'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" title={stats.peakFpsRepo ?? 'No FPS logged'}>
              {stats.peakFpsRepo ? stats.peakFpsRepo.split('/')[1] : 'Peak FPS'}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1119] border border-slate-100 dark:border-[#1B2232] px-4 py-3.5 min-w-[120px]">
            <div className="font-display text-lg sm:text-xl font-bold text-[#0D0E14] dark:text-white tabular-nums">
              {stats.liveSyncedCount} / {stats.activeReposCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live on GitHub
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1119] border border-slate-100 dark:border-[#1B2232] px-4 py-3.5 min-w-[120px]">
            <div className="font-display text-lg sm:text-xl font-bold text-[#0D0E14] dark:text-white tabular-nums">
              {stats.activeReposCount}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Efforts tracked
            </div>
          </div>
        </div>
      </div>

      {/* Visual Milestone Race Track Bar + Contender Avatars */}
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-[#1E2636]">
        {/* Contender Avatar Pins above track */}
        {benchmarkedRepos.length > 0 ? (
          <div className="relative h-12 mb-2">
            {benchmarkedRepos.slice(0, 6).map((repo, idx) => {
              const leftPct = Math.min(96, Math.max(3, repo.playabilityScore ?? 0));
              const initials = repo.owner.slice(0, 2).toUpperCase();
              return (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => onSelectRepo(repo.id)}
                  style={{ left: `${leftPct}%`, zIndex: 20 - idx }}
                  title={`${repo.fullName} — ${repo.playabilityScore}%`}
                  className="absolute bottom-0 -translate-x-1/2 group cursor-pointer focus-visible:outline-2 focus-visible:outline-pink-500 rounded-full"
                >
                  {repo.avatarUrl ? (
                    <img
                      src={repo.avatarUrl}
                      alt={repo.fullName}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-white dark:ring-[#131822] shadow-md group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 text-white text-[11px] font-mono font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#131822] shadow-md group-hover:scale-110 transition-transform">
                      {initials}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center -space-x-2">
              {liveTopRepos.map((repo) => (
                <button
                  key={repo.id}
                  type="button"
                  onClick={() => onSelectRepo(repo.id)}
                  title={`${repo.fullName} — click to log benchmark or calibrate milestones`}
                  className="relative hover:z-20 hover:scale-110 transition-transform cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-pink-500"
                >
                  {repo.avatarUrl ? (
                    <img
                      src={repo.avatarUrl}
                      alt={repo.fullName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-[#131822] shadow-sm"
                    />
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-mono font-bold flex items-center justify-center ring-2 ring-white dark:ring-[#131822]">
                      {repo.owner.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              No milestone scores logged yet — click any contender to calibrate or record real FPS.
            </span>
          </div>
        )}

        {/* Segmented Progress Bar */}
        <div
          role="progressbar"
          aria-label="Highest recorded playability score"
          aria-valuenow={stats.highestScore ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-4 rounded-full bg-slate-100 dark:bg-[#1B2233] overflow-hidden"
        >
          {fillPct > 0 && (
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 transition-[width] duration-300"
              style={{ width: `${fillPct}%` }}
            />
          )}
          {/* Crisp segment divider ticks at 10%, 20%, 30%, 40%, 50% */}
          {[10, 20, 30, 40, 50].map((tick) => (
            <span
              key={tick}
              aria-hidden="true"
              style={{ left: `${tick}%` }}
              className="absolute top-0 bottom-0 w-[2px] bg-white dark:bg-[#131822]"
            />
          ))}
        </div>

        {/* Milestone Labels below track */}
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-2 text-[11px]">
          {MILESTONE_MARKERS.map((m) => {
            const reached = stats.highestScore !== null && stats.highestScore >= m.pct && m.pct > 0;
            return (
              <div
                key={m.pct}
                className={m.pct === 100 ? 'sm:text-right' : ''}
              >
                <div
                  className={`font-mono font-semibold tabular-nums ${
                    reached
                      ? 'text-pink-600 dark:text-pink-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {m.pct}%
                </div>
                <div
                  className={`font-medium mt-0.5 truncate ${
                    reached
                      ? 'text-[#0D0E14] dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {m.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
