import { Radio, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { ApiSettings, GlobalTelemetryStats, RateLimitInfo, TrackedRepo } from '../types/telemetry';
import { formatRelativeTime } from '../utils/telemetryLogic';

interface HeroSectionProps {
  stats: GlobalTelemetryStats;
  repos: TrackedRepo[];
  settings: ApiSettings;
  rateLimit: RateLimitInfo | null;
  isSyncing: boolean;
  onToggleSimulation: () => void;
  onManualRefresh: () => void;
  onOpenSettings: () => void;
}

function getHonestVerdict(highestScore: number | null): {
  headline: string;
  subline: string;
} {
  if (highestScore === null) {
    return {
      headline: 'Awaiting benchmarks.',
      subline:
        'Live GitHub repositories are syncing below, with zero fabricated scores. Log verified FPS or milestone results on any contender to score the race.',
    };
  }
  if (highestScore >= 85) {
    return {
      headline: 'Mostly.',
      subline:
        'Verified benchmark telemetry shows playable progress across major game systems. Explore individual repository builds and live GitHub commits below.',
    };
  }
  if (highestScore >= 50) {
    return {
      headline: 'Playable.',
      subline:
        'At least one tracked effort has logged Playable-tier benchmark scores. Inspect live commit velocity, FPS metrics, and regressions below.',
    };
  }
  if (highestScore >= 20) {
    return {
      headline: 'Booting.',
      subline:
        'Tracked efforts have logged early boot and rendering milestones, though full gameplay remains in active development.',
    };
  }
  return {
    headline: 'Not yet.',
    subline:
      'Active reverse-engineering and translation layer groundwork is underway across public GitHub repositories.',
  };
}

export function HeroSection({
  stats,
  repos,
  settings,
  rateLimit,
  isSyncing,
  onToggleSimulation,
  onManualRefresh,
  onOpenSettings,
}: HeroSectionProps) {
  const verdict = getHonestVerdict(stats.highestScore);

  // Find the most recent real GitHub commit across all synced repos
  const latestCommitRepo = repos
    .filter((r) => r.latestCommit?.timestamp)
    .sort(
      (a, b) =>
        Date.parse(b.latestCommit!.timestamp) - Date.parse(a.latestCommit!.timestamp)
    )[0];

  const totalStars = repos.reduce((acc, r) => acc + (r.stars ?? 0), 0);
  const hasLiveStars = repos.some((r) => r.stars !== null);

  return (
    <section
      id="top"
      aria-label="PortWatch Live Overview"
      className="relative rounded-[28px] overflow-hidden bg-[#090D16] text-white shadow-[0_24px_60px_-24px_rgba(9,13,22,0.55)]"
    >
      {/* Full-Bleed Vice City Dusk Skyline Backdrop */}
      <img
        src="/src/assets/images/hero_vice_skyline_1795656371454.jpg"
        alt="Twilight Miami coastal skyline overlooking calm bay water"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center opacity-80 select-none pointer-events-none"
      />

      {/* Measured Contrast Scrim: keeps left editorial headline >12:1 legible while letting skyline glow on right */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#070B14]/92 via-[#0A0F1D]/74 to-[#0A0F1D]/45"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#070B14]/90 via-transparent to-[#070B14]/35"
      />

      {/* Hero Foreground Grid */}
      <div className="relative z-10 px-6 sm:px-10 lg:px-14 pt-10 sm:pt-14 pb-28 sm:pb-32 grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(310px,0.85fr)] gap-8 lg:gap-10 items-start">
        {/* Left Editorial Statement */}
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-300/90 mb-5">
            <span className="font-mono tracking-wide text-pink-300">
              {settings.simulationMode ? 'Simulation Mode' : 'Live GitHub Telemetry'}
            </span>
            <span aria-hidden="true" className="text-white/30">
              ·
            </span>
            <span className="tabular-nums">
              {stats.liveSyncedCount} of {stats.activeReposCount} repos live on GitHub
            </span>
            {hasLiveStars && (
              <>
                <span aria-hidden="true" className="text-white/30">
                  ·
                </span>
                <span className="tabular-nums">
                  {totalStars.toLocaleString()} combined stars
                </span>
              </>
            )}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-[62px] font-extrabold leading-[0.98] tracking-[-0.035em] text-white">
            Does GTA VI run on PC yet?
          </h1>

          <p className="font-display text-3xl sm:text-4xl lg:text-[52px] font-extrabold leading-[1.06] tracking-[-0.03em] mt-2 bg-gradient-to-r from-amber-300 via-orange-400 to-pink-400 bg-clip-text text-transparent">
            {verdict.headline}
          </p>

          <p className="mt-5 text-sm sm:text-base text-slate-200/90 leading-relaxed max-w-xl">
            {verdict.subline}
          </p>
        </div>

        {/* Right Frosted Telemetry Cards */}
        <div className="space-y-3.5 lg:mt-2">
          {/* Card 1: Real-Time GitHub Pulse */}
          <div className="rounded-2xl bg-[#0B111C]/78 backdrop-blur-md border border-white/15 p-5 shadow-lg">
            <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-300">
              <span className="text-emerald-300 font-semibold">
                {settings.simulationMode ? 'SIMULATION ENGINE' : 'GITHUB REST FEED'}
              </span>
              <span className="tabular-nums text-slate-400">
                {isSyncing
                  ? 'Polling…'
                  : rateLimit && rateLimit.remaining !== null && rateLimit.limit !== null
                    ? `${rateLimit.remaining}/${rateLimit.limit} req`
                    : `Every ${settings.pollingIntervalSeconds}s`}
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-3 border-t border-white/10 pt-3.5">
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {stats.liveSyncedCount}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Public live</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {latestCommitRepo?.latestCommit?.timestamp
                    ? formatRelativeTime(latestCommitRepo.latestCommit.timestamp)
                    : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Latest push</div>
              </div>
              <div>
                <div className="font-mono text-xl sm:text-2xl font-bold text-white tabular-nums">
                  {stats.peakFps !== null ? `${stats.peakFps.toFixed(1)}` : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Peak FPS</div>
              </div>
            </div>

            {latestCommitRepo?.latestCommit && (
              <p className="mt-3.5 pt-3 border-t border-white/10 text-xs text-slate-300 truncate">
                <span className="font-mono text-cyan-300 mr-1.5">
                  {latestCommitRepo.latestCommit.sha}
                </span>
                <span className="text-white font-medium mr-1.5">
                  {latestCommitRepo.name}:
                </span>
                <span className="text-slate-300/90">
                  {latestCommitRepo.latestCommit.message}
                </span>
              </p>
            )}
          </div>

          {/* Card 2: Compact Control Bar for Live Mode / Sim Mode / API Settings */}
          <div className="rounded-2xl bg-[#0B111C]/72 backdrop-blur-md border border-white/12 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={settings.simulationMode}
              onClick={onToggleSimulation}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                settings.simulationMode
                  ? 'bg-amber-400/20 text-amber-200 border border-amber-400/40'
                  : 'bg-white/10 text-slate-200 hover:bg-white/15 border border-white/10'
              }`}
              title="Toggle offline simulation mode for testing lead changes & alerts"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{settings.simulationMode ? 'Simulation On' : 'Live API Mode'}</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onManualRefresh}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-200 bg-white/8 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer whitespace-nowrap"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Token</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
