import type { GlobalTelemetryStats } from '../types/telemetry';

interface GlobalStatsTickerProps {
  stats: GlobalTelemetryStats;
}

export function GlobalStatsTicker({ stats }: GlobalStatsTickerProps) {
  return (
    <section
      aria-label="Global telemetry statistics"
      className="bg-[#131822] border border-[#1E2636] rounded-lg overflow-hidden"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#1E2636]">
        {/* Current Leader */}
        <div className="px-4 py-3.5 min-w-0">
          <div className="text-xs font-medium text-slate-400">Current Leader</div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span
              className={`text-sm sm:text-base font-semibold truncate ${
                stats.leaderFullName ? 'text-emerald-300' : 'text-slate-400 font-mono'
              }`}
              title={stats.leaderFullName ?? 'N/A'}
            >
              {stats.leaderFullName ?? 'N/A'}
            </span>
          </div>
          <div className="mt-0.5 text-xs font-mono text-slate-400 truncate">
            {stats.leaderFullName
              ? stats.leaderScore !== null
                ? `${stats.leaderGpu} · Rank #1 (${stats.leaderScore}%)`
                : stats.leaderStars !== null
                  ? `${stats.leaderGpu} · ${stats.leaderStars.toLocaleString()} ★ (by stars)`
                  : `${stats.leaderGpu} · Rank #1`
              : stats.activeReposCount > 0
                ? 'Awaiting live GitHub sync or benchmark'
                : 'No active repos'}
          </div>
        </div>

        {/* Highest Playability Score */}
        <div className="px-4 py-3.5 min-w-0">
          <div className="text-xs font-medium text-slate-400">Highest Playability Score</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            {stats.highestScore !== null ? (
              <>
                <span className="text-xl sm:text-2xl font-mono font-bold text-slate-50 tabular-nums">
                  {stats.highestScore}
                </span>
                <span className="text-xs font-mono text-emerald-400">/ 100%</span>
              </>
            ) : (
              <span className="text-xl sm:text-2xl font-mono font-bold text-slate-500">N/A</span>
            )}
          </div>
          <div className="mt-0.5 text-xs font-mono text-slate-400">
            {stats.highestScore !== null ? '5-category weighted composite' : 'No benchmarks logged yet'}
          </div>
        </div>

        {/* Peak FPS Recorded */}
        <div className="px-4 py-3.5 min-w-0">
          <div className="text-xs font-medium text-slate-400">Peak FPS Recorded</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            {stats.peakFps !== null ? (
              <>
                <span className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 tabular-nums">
                  {stats.peakFps.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-400">AVG FPS</span>
              </>
            ) : (
              <span className="text-xl sm:text-2xl font-mono font-bold text-slate-500">N/A</span>
            )}
          </div>
          <div
            className="mt-0.5 text-xs font-mono text-slate-400 truncate"
            title={stats.peakFpsRepo ?? 'N/A'}
          >
            {stats.peakFpsRepo ? `Held by ${stats.peakFpsRepo}` : 'No FPS benchmarks logged yet'}
          </div>
        </div>

        {/* Active Repos Tracked */}
        <div className="px-4 py-3.5 min-w-0">
          <div className="text-xs font-medium text-slate-400">Active Repos Tracked</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              data-testid="active-repos-count"
              className="text-xl sm:text-2xl font-mono font-bold text-slate-50 tabular-nums"
            >
              {stats.activeReposCount}
            </span>
            <span className="text-xs font-mono text-slate-400">
              contenders ({stats.liveSyncedCount} live)
            </span>
          </div>
          <div className="mt-0.5 text-xs font-mono text-slate-400 tabular-nums">
            {stats.amdCount} AMD · {stats.nvidiaCount} NVIDIA · {stats.vulkanCount} Vulkan
          </div>
        </div>
      </div>
    </section>
  );
}
