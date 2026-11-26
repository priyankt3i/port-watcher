import { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Gauge,
  GitCommitHorizontal,
  GitFork,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import type { GpuTarget, TrackedRepo } from '../types/telemetry';
import { formatRelativeTime } from '../utils/telemetryLogic';

interface LeaderboardSectionProps {
  repos: TrackedRepo[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onToggleStar: (repoId: string) => void;
  onOpenUpdateBenchmark: (repo: TrackedRepo) => void;
  onRemoveRepo: (repoId: string) => void;
  onOpenAddRepo: () => void;
}

type SortKey = 'rank' | 'avgFps' | 'stars' | 'ramFootprintGb';

const MILESTONE_SEGMENTS = [
  { key: 'bootAndRender' as const, label: 'Boot & Render', max: 50 },
  { key: 'worldAndFoliage' as const, label: 'World & Foliage', max: 15 },
  { key: 'lightingAndShaders' as const, label: 'Lighting & Shaders', max: 15 },
  { key: 'audioAndPhysics' as const, label: 'Audio & Physics', max: 10 },
  { key: 'framePacingAndStability' as const, label: 'Frame Pacing', max: 10 },
];

function getGpuAccent(gpu: GpuTarget): string {
  switch (gpu) {
    case 'AMD RDNA3/4':
      return 'text-rose-600 dark:text-rose-400';
    case 'NVIDIA Ada/Blackwell':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'Multi-Vendor / Vulkan':
      return 'text-violet-600 dark:text-cyan-400';
  }
}

function getShortGpuLabel(gpu: GpuTarget): string {
  switch (gpu) {
    case 'AMD RDNA3/4':
      return 'AMD RDNA3/4';
    case 'NVIDIA Ada/Blackwell':
      return 'NVIDIA Ada/BW';
    case 'Multi-Vendor / Vulkan':
      return 'Vulkan Multi';
  }
}

function getStageLabel(score: number | null): string {
  if (score === null) return 'Unbenchmarked';
  if (score >= 95) return 'Complete';
  if (score >= 50) return 'Playable';
  if (score >= 40) return 'In world';
  if (score >= 30) return 'Main menu';
  if (score >= 20) return 'First frame';
  if (score >= 10) return 'Exe runs';
  return 'Groundwork';
}

export function LeaderboardSection({
  repos,
  selectedRepoId,
  onSelectRepo,
  onToggleStar,
  onOpenUpdateBenchmark,
  onRemoveRepo,
  onOpenAddRepo,
}: LeaderboardSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [gpuFilter, setGpuFilter] = useState<'ALL' | GpuTarget>('ALL');
  const [onlyStarred, setOnlyStarred] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [showUnavailable, setShowUnavailable] = useState(true);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return repos
      .filter((r) => {
        if (gpuFilter !== 'ALL' && r.gpuTarget !== gpuFilter) return false;
        if (onlyStarred && !r.starred) return false;
        if (q) {
          const matchesName = r.fullName.toLowerCase().includes(q);
          const matchesDesc = (r.description ?? '').toLowerCase().includes(q);
          const matchesCommit = (r.latestCommit?.message ?? '').toLowerCase().includes(q);
          if (!matchesName && !matchesDesc && !matchesCommit) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'avgFps') {
          if (a.avgFps === null && b.avgFps === null) return a.rank - b.rank;
          if (a.avgFps === null) return 1;
          if (b.avgFps === null) return -1;
          return b.avgFps - a.avgFps;
        }
        if (sortBy === 'stars') {
          if (a.stars === null && b.stars === null) return a.rank - b.rank;
          if (a.stars === null) return 1;
          if (b.stars === null) return -1;
          return b.stars - a.stars;
        }
        if (sortBy === 'ramFootprintGb') {
          if (a.ramFootprintGb === null && b.ramFootprintGb === null) return a.rank - b.rank;
          if (a.ramFootprintGb === null) return 1;
          if (b.ramFootprintGb === null) return -1;
          return a.ramFootprintGb - b.ramFootprintGb;
        }
        return a.rank - b.rank;
      });
  }, [repos, searchQuery, gpuFilter, onlyStarred, sortBy]);

  // Separate reachable/pending/benchmarked repos from unavailable (404/error with no benchmarks)
  const activeContenders = useMemo(
    () =>
      filteredAndSorted.filter(
        (r) => r.syncStatus !== 'error' || r.playabilityScore !== null || r.avgFps !== null
      ),
    [filteredAndSorted]
  );

  const unavailableRepos = useMemo(
    () =>
      filteredAndSorted.filter(
        (r) => r.syncStatus === 'error' && r.playabilityScore === null && r.avgFps === null
      ),
    [filteredAndSorted]
  );

  const renderRepoCard = (repo: TrackedRepo, dimmed = false) => {
    const isSelected = selectedRepoId === repo.id;
    const initials = repo.owner.slice(0, 2).toUpperCase();
    const totalCommits14d = repo.commitVelocity14d
      ? repo.commitVelocity14d.reduce((a, b) => a + b, 0)
      : null;

    return (
      <article
        key={repo.id}
        data-repo-card={repo.id}
        onClick={() => onSelectRepo(repo.id)}
        className={`group rounded-[22px] border transition-all cursor-pointer p-5 sm:p-6 ${
          isSelected
            ? 'bg-pink-50/40 dark:bg-[#171E30] border-pink-400/70 dark:border-pink-500/50 shadow-[0_12px_36px_-16px_rgba(236,72,153,0.2)]'
            : dimmed
              ? 'bg-white/75 dark:bg-[#111620] border-slate-200/70 dark:border-[#1B2232] hover:border-slate-300 dark:hover:border-slate-700'
              : 'bg-white dark:bg-[#131822] border-slate-200/80 dark:border-[#1E2636] hover:border-slate-300 dark:hover:border-slate-600 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.1)] dark:shadow-none'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-start gap-4 sm:gap-5">
          {/* Left: Giant Rank + Avatar + Title + Unboxed Metadata */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            {/* Rank Column */}
            <div className="w-10 sm:w-12 shrink-0 pt-0.5 text-center">
              <div
                className={`font-display text-2xl sm:text-3xl font-extrabold leading-none tabular-nums ${
                  repo.rank === 1 && !dimmed
                    ? 'bg-gradient-to-b from-pink-500 to-orange-500 bg-clip-text text-transparent'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              >
                {repo.rank}
              </div>
              {repo.rankDelta > 0 && (
                <div className="mt-1 inline-flex items-center font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="w-3 h-3" />+{repo.rankDelta}
                </div>
              )}
              {repo.rankDelta < 0 && (
                <div className="mt-1 inline-flex items-center font-mono text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <ArrowDownRight className="w-3 h-3" />
                  {repo.rankDelta}
                </div>
              )}
            </div>

            {/* Avatar */}
            {repo.avatarUrl ? (
              <img
                src={repo.avatarUrl}
                alt={`${repo.owner} GitHub avatar`}
                referrerPolicy="no-referrer"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-200 dark:border-[#243047] shrink-0 bg-slate-100 dark:bg-[#0D1119]"
              />
            ) : (
              <div
                aria-hidden="true"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 dark:bg-[#192131] border border-slate-200 dark:border-[#253044] flex items-center justify-center font-mono text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0"
              >
                {initials}
              </div>
            )}

            {/* Repo Heading & Unboxed Metadata */}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0D0E14] dark:text-white tracking-tight truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                  {repo.name}
                </h3>
                <span className="font-mono text-xs text-slate-400 dark:text-slate-500 truncate">
                  {repo.fullName}
                </span>
              </div>

              {/* Clean Unboxed Metadata Row (Zero Pills) */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className={`font-semibold ${getGpuAccent(repo.gpuTarget)}`}>
                  {getShortGpuLabel(repo.gpuTarget)}
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                  ·
                </span>
                <span className="font-mono tabular-nums">
                  {repo.stars !== null
                    ? `${repo.stars.toLocaleString()} stars`
                    : repo.syncStatus === 'pending'
                      ? 'Syncing stars…'
                      : 'Stars N/A'}
                </span>
                {repo.forks !== undefined && repo.forks !== null && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <GitFork className="w-3 h-3" aria-hidden="true" />
                      {repo.forks.toLocaleString()}
                    </span>
                  </>
                )}
                {repo.license && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="font-mono">{repo.license}</span>
                  </>
                )}
                {totalCommits14d !== null && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                      ·
                    </span>
                    <span className="font-mono tabular-nums">
                      {totalCommits14d} commits / 14d
                    </span>
                  </>
                )}
              </div>

              {/* Real Description or Honest Status */}
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                {repo.description
                  ? repo.description
                  : repo.syncStatus === 'error'
                    ? repo.syncError || 'Repository not found or private on GitHub.'
                    : repo.syncStatus === 'pending'
                      ? 'Fetching live repository description and commits from GitHub…'
                      : 'No repository description provided on GitHub.'}
              </p>
            </div>
          </div>

          {/* Right: Big Editorial Playability Score + FPS / RAM Readouts */}
          <div className="flex lg:flex-col items-baseline lg:items-end justify-between lg:justify-start gap-4 lg:gap-1.5 shrink-0 pl-14 lg:pl-0">
            <div className="text-left lg:text-right">
              <div className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums leading-none">
                {repo.playabilityScore !== null ? (
                  <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                    {repo.playabilityScore}%
                  </span>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600">N/A</span>
                )}
              </div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                {getStageLabel(repo.playabilityScore)}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 lg:mt-1.5">
              <span>
                <span className="text-slate-400 dark:text-slate-500 mr-1">FPS</span>
                {repo.avgFps !== null ? repo.avgFps.toFixed(1) : 'N/A'}
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
                ·
              </span>
              <span>
                <span className="text-slate-400 dark:text-slate-500 mr-1">RAM</span>
                {repo.ramFootprintGb !== null ? `${repo.ramFootprintGb.toFixed(1)}G` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 5-Category Segmented Milestone Bar */}
        <div className="mt-5 pl-0 sm:pl-16">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-1.5">
            {MILESTONE_SEGMENTS.map((seg) => {
              const val = repo.milestones ? repo.milestones[seg.key] : null;
              const pct = val !== null ? Math.round((val / seg.max) * 100) : 0;
              return (
                <div key={seg.key}>
                  <div className="h-1.5 rounded-full bg-slate-100 dark:bg-[#1B2233] overflow-hidden">
                    {pct > 0 && (
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 via-pink-500 to-orange-400"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 truncate">
                      {seg.label}
                    </span>
                    <span className="font-mono text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                      {val !== null ? `${val}/${seg.max}` : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Latest Real GitHub Commit + Crisp Row Actions */}
        <div
          className="mt-4 pt-3.5 border-t border-slate-100 dark:border-[#1B2334] sm:ml-16 flex flex-wrap items-center justify-between gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Latest Commit */}
          <div className="min-w-0 flex-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <GitCommitHorizontal className="w-3.5 h-3.5 shrink-0 text-pink-500 dark:text-cyan-400" />
            {repo.latestCommit ? (
              <div className="min-w-0 flex items-center gap-2 truncate">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                  {repo.latestCommit.sha}
                </span>
                <span className="truncate text-slate-600 dark:text-slate-300">
                  {repo.latestCommit.message}
                </span>
                <span className="text-slate-400 dark:text-slate-500 shrink-0 font-mono text-[11px] tabular-nums">
                  · {formatRelativeTime(repo.latestCommit.timestamp)}
                </span>
              </div>
            ) : repo.syncStatus === 'pending' ? (
              <span className="font-mono">Syncing commits…</span>
            ) : (
              <span className="font-mono text-slate-400 dark:text-slate-500">
                Latest commit: N/A
              </span>
            )}
          </div>

          {/* Interactive Actions */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto sm:shrink-0">
            <button
              type="button"
              onClick={() => onToggleStar(repo.id)}
              aria-label={
                repo.starred
                  ? `Remove ${repo.fullName} from watchlist`
                  : `Add ${repo.fullName} to watchlist`
              }
              title={repo.starred ? 'Watchlisted' : 'Add to watchlist'}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors cursor-pointer ${
                repo.starred
                  ? 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-500'
                  : 'border-slate-200 dark:border-[#232D42] text-slate-400 hover:text-amber-500 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${repo.starred ? 'fill-amber-400' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => onOpenUpdateBenchmark(repo)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#253044] bg-white dark:bg-[#0E131D] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Gauge className="w-3.5 h-3.5 text-pink-500 dark:text-cyan-400" />
              Log Benchmark
            </button>

            <button
              type="button"
              onClick={() => onSelectRepo(repo.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-[#253044] bg-slate-50 dark:bg-[#192131] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#212C42] transition-colors cursor-pointer whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Details
            </button>

            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0D0E14] hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-[#0D0E14] text-xs font-semibold transition-colors whitespace-nowrap"
            >
              GitHub
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={() => onRemoveRepo(repo.id)}
              aria-label={`Remove ${repo.fullName} from race`}
              title="Remove from Race"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-transparent text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section id="race" aria-label="Compatibility Race Leaderboard" className="scroll-mt-24 space-y-5">
      {/* Editorial Section Header + Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Leaderboard
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] text-[#0D0E14] dark:text-white mt-1">
            The race
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
            Public GitHub repositories synced live via REST API. Click any contender to calibrate weighted milestones, inspect commit velocity, or record real benchmark telemetry.
          </p>
        </div>

        {/* Compact Filter + Sort Controls */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
          {/* Segmented GPU Filter */}
          <div
            role="group"
            aria-label="GPU Architecture Filter"
            className="inline-flex items-center p-1 rounded-full bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#1E2636]"
          >
            {(
              [
                { value: 'ALL', label: 'All' },
                { value: 'AMD RDNA3/4', label: 'AMD' },
                { value: 'NVIDIA Ada/Blackwell', label: 'NVIDIA' },
                { value: 'Multi-Vendor / Vulkan', label: 'Vulkan' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGpuFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  gpuFilter === opt.value
                    ? 'bg-[#0D0E14] dark:bg-white text-white dark:text-[#0D0E14]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-[#0D0E14] dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOnlyStarred((v) => !v)}
            aria-pressed={onlyStarred}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
              onlyStarred
                ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-[#131822] border-slate-200 dark:border-[#1E2636] text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
            Watchlist
          </button>

          <select
            id="leaderboard-sort"
            aria-label="Sort repositories"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#1E2636] rounded-full px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            <option value="rank">Sort: Rank</option>
            <option value="stars">Sort: GitHub Stars</option>
            <option value="avgFps">Sort: Average FPS</option>
            <option value="ramFootprintGb">Sort: Lowest RAM</option>
          </select>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tracked repositories or commits…"
          aria-label="Filter repositories"
          className="w-full bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#1E2636] rounded-full pl-10 pr-4 py-2 text-sm text-[#0D0E14] dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-pink-500 transition-colors"
        />
      </div>

      {/* Empty State */}
      {filteredAndSorted.length === 0 ? (
        <div className="rounded-[22px] bg-white dark:bg-[#131822] border border-slate-200 dark:border-[#1E2636] px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No tracked repositories match your current filters.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setGpuFilter('ALL');
                setOnlyStarred(false);
              }}
              className="px-4 py-2 rounded-full border border-slate-200 dark:border-[#253044] text-xs font-medium text-slate-700 dark:text-slate-300 hover:border-slate-400 cursor-pointer"
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={onOpenAddRepo}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#0D0E14] dark:bg-white text-white dark:text-[#0D0E14] text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Track Repo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Public GitHub Contenders */}
          {activeContenders.map((repo) => renderRepoCard(repo, false))}

          {/* Unavailable / Private Repositories (HTTP 404 or API Error) */}
          {unavailableRepos.length > 0 && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowUnavailable((v) => !v)}
                aria-expanded={showUnavailable}
                className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0D0E14] dark:hover:text-white transition-colors mb-3 cursor-pointer"
              >
                {showUnavailable ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>
                  Unavailable or private on GitHub ({unavailableRepos.length})
                </span>
              </button>

              {showUnavailable && (
                <div className="space-y-3">
                  {unavailableRepos.map((repo) => renderRepoCard(repo, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
