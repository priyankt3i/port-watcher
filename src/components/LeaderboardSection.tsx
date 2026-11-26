import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  GitCommitHorizontal,
  Minus,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import type { GpuTarget, TrackedRepo } from '../types/telemetry';
import { formatRelativeTime, getGpuShortLabel } from '../utils/telemetryLogic';
import { RepoAvatar } from './RepoAvatar';

interface LeaderboardSectionProps {
  repos: TrackedRepo[];
  selectedRepoId: string | null;
  onSelectRepo: (repoId: string) => void;
  onToggleStar: (repoId: string) => void;
  onOpenUpdateBenchmark: (repo: TrackedRepo) => void;
  onRemoveRepo: (repoId: string) => void;
  onOpenAddRepo: () => void;
}

type GpuFilter = 'all' | GpuTarget;
type SortKey = 'rank' | 'fps' | 'stars' | 'ram';

const GPU_TEXT_COLOR: Record<GpuTarget, string> = {
  'AMD RDNA3/4': 'text-rose-300',
  'NVIDIA Ada/Blackwell': 'text-emerald-300',
  'Multi-Vendor / Vulkan': 'text-cyan-300',
};

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
  const [gpuFilter, setGpuFilter] = useState<GpuFilter>('all');
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('rank');
  const [openMenuRepoId, setOpenMenuRepoId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuRepoId) return;
    const handleOutside = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenMenuRepoId(null);
        setConfirmDeleteId(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuRepoId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [openMenuRepoId]);

  const filtered = repos
    .filter((repo) => {
      if (gpuFilter !== 'all' && repo.gpuTarget !== gpuFilter) return false;
      if (watchlistOnly && !repo.starred) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          repo.fullName.toLowerCase().includes(q) ||
          (repo.latestCommit?.message.toLowerCase().includes(q) ?? false) ||
          repo.gpuTarget.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'fps') {
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
      if (sortBy === 'ram') {
        if (a.ramFootprintGb === null && b.ramFootprintGb === null) return a.rank - b.rank;
        if (a.ramFootprintGb === null) return 1;
        if (b.ramFootprintGb === null) return -1;
        return a.ramFootprintGb - b.ramFootprintGb;
      }
      return a.rank - b.rank;
    });

  const renderRankDelta = (delta: number) => {
    if (delta > 0) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold text-emerald-400 tabular-nums"
          title={`Moved up ${delta}`}
        >
          <ArrowUp className="w-3 h-3" aria-hidden="true" />
          +{delta}
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-[11px] font-mono font-semibold text-rose-400 tabular-nums"
          title={`Moved down ${Math.abs(delta)}`}
        >
          <ArrowDown className="w-3 h-3" aria-hidden="true" />
          {delta}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[11px] font-mono text-slate-600" title="Rank unchanged">
        <Minus className="w-3 h-3" aria-hidden="true" />
      </span>
    );
  };

  const renderRowMenu = (repo: TrackedRepo) => {
    const isOpen = openMenuRepoId === repo.id;
    const isConfirming = confirmDeleteId === repo.id;

    return (
      <div className="relative" ref={isOpen ? menuContainerRef : undefined}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenuRepoId(isOpen ? null : repo.id);
            setConfirmDeleteId(null);
          }}
          aria-label={`Actions for ${repo.fullName}`}
          aria-expanded={isOpen}
          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1D2535] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {isOpen && (
          <div
            role="menu"
            className="absolute right-0 mt-1 w-52 rounded-md bg-[#161D2B] border border-[#2A364D] shadow-2xl shadow-black/70 py-1 z-40"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuRepoId(null);
                onOpenUpdateBenchmark(repo);
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-[#1F293B] flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              Update Benchmark Scores
            </button>

            <a
              role="menuitem"
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpenMenuRepoId(null)}
              className="w-full px-3 py-2 text-left text-xs text-slate-200 hover:bg-[#1F293B] flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              Open on GitHub
            </a>

            <div className="my-1 border-t border-[#242F44]" />

            {!isConfirming ? (
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirmDeleteId(repo.id)}
                className="w-full px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                Remove from Race
              </button>
            ) : (
              <div className="px-3 py-2 bg-rose-500/10">
                <p className="text-[11px] text-rose-200 mb-2">Remove {repo.name}?</p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenuRepoId(null);
                      setConfirmDeleteId(null);
                      onRemoveRepo(repo.id);
                    }}
                    className="flex-1 px-2 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 text-[11px] font-semibold cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex-1 px-2 py-1 rounded border border-[#2E3A52] text-slate-300 text-[11px] hover:bg-[#1E2636] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <section
      aria-label="Compatibility Race Leaderboard"
      className="bg-[#131822] border border-[#1E2636] rounded-lg overflow-hidden"
    >
      {/* Toolbar */}
      <div className="px-4 py-3.5 border-b border-[#1E2636] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-100">
              Active Race Leaderboard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any contender row to open live milestone calibration, commit velocity, and regressions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="leaderboard-sort" className="text-xs text-slate-400 whitespace-nowrap">
              Sort:
            </label>
            <select
              id="leaderboard-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-[#0D1119] border border-[#253044] rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="rank">Playability Rank</option>
              <option value="fps">Average FPS</option>
              <option value="stars">GitHub Stars</option>
              <option value="ram">Lowest RAM (GB)</option>
            </select>
          </div>
        </div>

        {/* Search + GPU Filter Segmented Control */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search
              className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter repo or commit..."
              aria-label="Filter repositories"
              className="w-full bg-[#0D1119] border border-[#242F44] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div
              role="group"
              aria-label="GPU Architecture Filter"
              className="inline-flex items-center p-0.5 rounded-md bg-[#0D1119] border border-[#1E2636]"
            >
              {(
                [
                  { value: 'all', label: 'All GPUs' },
                  { value: 'AMD RDNA3/4', label: 'AMD RDNA3/4' },
                  { value: 'NVIDIA Ada/Blackwell', label: 'NVIDIA' },
                  { value: 'Multi-Vendor / Vulkan', label: 'Vulkan' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGpuFilter(opt.value)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    gpuFilter === opt.value
                      ? 'bg-[#1D2638] text-slate-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setWatchlistOnly((v) => !v)}
              aria-pressed={watchlistOnly}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                watchlistOnly
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-[#0D1119] border-[#242F44] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${watchlistOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              Starred
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-200">No matching repositories found</p>
          <p className="text-xs text-slate-400 mt-1">
            Adjust your GPU or search filters, or register a new contender to track.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {(searchQuery || gpuFilter !== 'all' || watchlistOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setGpuFilter('all');
                  setWatchlistOnly(false);
                }}
                className="px-3 py-1.5 rounded-md border border-[#2B374E] text-xs font-medium text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAddRepo}
              className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06130D] text-xs font-semibold cursor-pointer"
            >
              + Track Repo
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop High-Density Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E2636] bg-[#0F141E] text-[11px] font-mono text-slate-400">
                  <th className="py-2.5 pl-4 pr-2 font-medium whitespace-nowrap">Rank</th>
                  <th className="py-2.5 px-2.5 font-medium whitespace-nowrap">Repository & Target</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap w-40">Playability</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">FPS / 1% Low</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">RAM</th>
                  <th className="py-2.5 px-3 font-medium text-right whitespace-nowrap">Stars</th>
                  <th className="py-2.5 px-3 font-medium whitespace-nowrap">Latest Commit</th>
                  <th className="py-2.5 pl-2 pr-3 font-medium text-right w-10">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A2231]">
                {filtered.map((repo) => {
                  const isLeader = repo.rank === 1;
                  const isSelected = selectedRepoId === repo.id;
                  return (
                    <tr
                      key={repo.id}
                      onClick={() => onSelectRepo(repo.id)}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/8'
                          : isLeader
                            ? 'bg-emerald-500/[0.03] hover:bg-[#18202F]'
                            : 'hover:bg-[#171E2C]'
                      }`}
                    >
                      {/* Rank & Delta */}
                      <td className="py-3 pl-4 pr-2 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono text-xs font-bold tabular-nums w-5 ${
                              isLeader ? 'text-emerald-400' : 'text-slate-300'
                            }`}
                          >
                            #{repo.rank}
                          </span>
                          {renderRankDelta(repo.rankDelta)}
                        </div>
                      </td>

                      {/* Repo + Star + GPU */}
                      <td className="py-3 px-2.5 align-middle">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStar(repo.id);
                            }}
                            aria-label={
                              repo.starred
                                ? `Remove ${repo.fullName} from watchlist`
                                : `Add ${repo.fullName} to watchlist`
                            }
                            aria-pressed={repo.starred}
                            className="p-1 -ml-1 rounded text-slate-500 hover:text-amber-300 transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                repo.starred ? 'fill-amber-400 text-amber-400' : ''
                              }`}
                            />
                          </button>
                          <RepoAvatar
                            owner={repo.owner}
                            avatarUrl={repo.avatarUrl}
                            gpuTarget={repo.gpuTarget}
                            size="md"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectRepo(repo.id);
                              }}
                              className="text-left text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate block max-w-[215px] cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
                            >
                              {repo.fullName}
                            </button>
                            <div className="flex items-center gap-1.5 text-[11px] mt-0.5 whitespace-nowrap">
                              <span className={`font-mono ${GPU_TEXT_COLOR[repo.gpuTarget]}`}>
                                {getGpuShortLabel(repo.gpuTarget)}
                              </span>
                              {repo.regressions.some((r) => !r.resolved && r.severity === 'critical') && (
                                <>
                                  <span aria-hidden="true" className="text-slate-600">
                                    ·
                                  </span>
                                  <span className="text-amber-400 font-mono">1 critical</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Playability Score Bar */}
                      <td className="py-3 px-2.5 align-middle whitespace-nowrap">
                        {repo.playabilityScore !== null && repo.milestones !== null ? (
                          <>
                            <div className="flex items-center justify-between gap-2 text-xs font-mono mb-1.5 w-28">
                              <span
                                className={`font-semibold tabular-nums ${
                                  isLeader ? 'text-emerald-300' : 'text-slate-100'
                                }`}
                              >
                                {repo.playabilityScore}%
                              </span>
                              <span className="text-[10px] text-slate-400 tabular-nums">
                                {repo.milestones.bootAndRender}/50
                              </span>
                            </div>
                            <div className="h-1.5 w-28 rounded-sm bg-[#1E2636] overflow-hidden">
                              <div
                                className={`h-full rounded-sm transition-all duration-300 ${
                                  isLeader
                                    ? 'bg-emerald-400'
                                    : repo.playabilityScore >= 65
                                      ? 'bg-cyan-400'
                                      : 'bg-amber-400'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, repo.playabilityScore))}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="font-mono text-xs text-slate-500">N/A</div>
                        )}
                      </td>

                      {/* Average FPS & 1% Lows */}
                      <td className="py-3 px-2.5 align-middle text-right font-mono tabular-nums whitespace-nowrap">
                        {repo.avgFps !== null ? (
                          <>
                            <div className="text-xs font-semibold text-slate-100">
                              {repo.avgFps.toFixed(1)}{' '}
                              <span className="text-[10px] font-normal text-slate-400">FPS</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              1% {repo.onePercentLowFps !== null ? repo.onePercentLowFps.toFixed(1) : 'N/A'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xs text-slate-500">N/A</div>
                            <div className="text-[11px] text-slate-600 mt-0.5">1% N/A</div>
                          </>
                        )}
                      </td>

                      {/* RAM Footprint */}
                      <td className="py-3 px-2.5 align-middle text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        {repo.ramFootprintGb !== null ? (
                          <span className="text-slate-300">
                            {repo.ramFootprintGb.toFixed(1)}{' '}
                            <span className="text-[10px] text-slate-500">GB</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>

                      {/* GitHub Stars */}
                      <td className="py-3 px-2.5 align-middle text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        {repo.stars !== null ? (
                          <span className="text-slate-300">{repo.stars.toLocaleString()}</span>
                        ) : repo.syncStatus === 'pending' ? (
                          <span className="text-slate-500">...</span>
                        ) : (
                          <span className="text-slate-500">N/A</span>
                        )}
                      </td>

                      {/* Latest Commit */}
                      <td className="py-3 px-2.5 align-middle max-w-[235px]">
                        {repo.latestCommit ? (
                          <>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono whitespace-nowrap">
                              <GitCommitHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                              <span className="text-cyan-300 shrink-0">{repo.latestCommit.sha}</span>
                              <span aria-hidden="true" className="text-slate-600">
                                ·
                              </span>
                              <span className="text-slate-400 shrink-0 tabular-nums">
                                {formatRelativeTime(repo.latestCommit.timestamp)}
                              </span>
                            </div>
                            <p
                              className="text-xs text-slate-300 truncate mt-0.5"
                              title={repo.latestCommit.message}
                            >
                              {repo.latestCommit.message}
                            </p>
                          </>
                        ) : repo.syncStatus === 'pending' ? (
                          <span className="font-mono text-xs text-slate-500">Syncing GitHub...</span>
                        ) : (
                          <div className="min-w-0">
                            <span className="font-mono text-xs text-slate-500">N/A</span>
                            {repo.syncError && (
                              <p
                                className="text-[11px] font-mono text-amber-400/80 truncate mt-0.5"
                                title={repo.syncError}
                              >
                                {repo.syncError}
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 pl-2 pr-3 align-middle text-right">
                        {renderRowMenu(repo)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Structured Cards */}
          <div className="lg:hidden divide-y divide-[#1E2636]">
            {filtered.map((repo) => {
              const isLeader = repo.rank === 1;
              return (
                <div
                  key={repo.id}
                  className={`p-4 ${isLeader ? 'bg-emerald-500/[0.03]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex flex-col items-center w-8 shrink-0">
                        <span
                          className={`font-mono text-xs font-bold tabular-nums ${
                            isLeader ? 'text-emerald-400' : 'text-slate-300'
                          }`}
                        >
                          #{repo.rank}
                        </span>
                        {renderRankDelta(repo.rankDelta)}
                      </div>
                      <RepoAvatar
                        owner={repo.owner}
                        avatarUrl={repo.avatarUrl}
                        gpuTarget={repo.gpuTarget}
                        size="md"
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectRepo(repo.id)}
                          className="text-left text-sm font-semibold text-slate-100 hover:text-cyan-300 truncate block max-w-[200px] cursor-pointer"
                        >
                          {repo.fullName}
                        </button>
                        <div className="flex items-center gap-1.5 text-xs font-mono mt-0.5">
                          <span className={GPU_TEXT_COLOR[repo.gpuTarget]}>
                            {getGpuShortLabel(repo.gpuTarget)}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">
                            ·
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            {repo.stars !== null ? `${repo.stars.toLocaleString()} ★` : 'N/A ★'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleStar(repo.id)}
                        aria-label={
                          repo.starred
                            ? `Remove ${repo.fullName} from watchlist`
                            : `Add ${repo.fullName} to watchlist`
                        }
                        className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-amber-300 cursor-pointer"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            repo.starred ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>
                      {renderRowMenu(repo)}
                    </div>
                  </div>

                  {/* Mobile Telemetry Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Playability Score</span>
                      <span className={`font-semibold tabular-nums ${repo.playabilityScore !== null ? 'text-slate-100' : 'text-slate-500'}`}>
                        {repo.playabilityScore !== null ? `${repo.playabilityScore}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-sm bg-[#1E2636] overflow-hidden">
                      {repo.playabilityScore !== null && (
                        <div
                          className={`h-full rounded-sm ${
                            isLeader ? 'bg-emerald-400' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(2, repo.playabilityScore))}%` }}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-mono tabular-nums">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Avg FPS</span>
                      <span className={repo.avgFps !== null ? 'text-slate-100 font-semibold' : 'text-slate-500'}>
                        {repo.avgFps !== null ? repo.avgFps.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">1% Low</span>
                      <span className={repo.onePercentLowFps !== null ? 'text-slate-200' : 'text-slate-500'}>
                        {repo.onePercentLowFps !== null ? repo.onePercentLowFps.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">RAM</span>
                      <span className={repo.ramFootprintGb !== null ? 'text-slate-200' : 'text-slate-500'}>
                        {repo.ramFootprintGb !== null ? `${repo.ramFootprintGb.toFixed(1)} GB` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectRepo(repo.id)}
                    className="mt-3 w-full text-left pt-2.5 border-t border-[#1E2636] flex items-center justify-between gap-2 text-xs cursor-pointer"
                  >
                    {repo.latestCommit ? (
                      <>
                        <span className="font-mono text-cyan-300 shrink-0">{repo.latestCommit.sha}</span>
                        <span className="text-slate-300 truncate flex-1">{repo.latestCommit.message}</span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {formatRelativeTime(repo.latestCommit.timestamp)}
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-slate-500 truncate">
                        {repo.syncStatus === 'pending'
                          ? 'Syncing live commits from GitHub...'
                          : repo.syncError
                            ? `Commit: N/A (${repo.syncError})`
                            : 'Latest commit: N/A'}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
