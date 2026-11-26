import { useState } from 'react';
import {
  BellRing,
  Gauge,
  GitCommitHorizontal,
  PlusCircle,
  Trophy,
} from 'lucide-react';
import type { FeedEvent, FeedFilter } from '../types/telemetry';
import { formatRelativeTime } from '../utils/telemetryLogic';

interface LiveFeedPanelProps {
  events: FeedEvent[];
  onSelectRepo: (repoId: string) => void;
}

const FILTERS: { value: FeedFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'commit', label: 'Commits' },
  { value: 'lead_change', label: 'Lead Changes' },
  { value: 'benchmark', label: 'Benchmarks' },
  { value: 'new_repo', label: 'New Repos' },
];

export function LiveFeedPanel({ events, onSelectRepo }: LiveFeedPanelProps) {
  const [filter, setFilter] = useState<FeedFilter>('all');

  const filteredEvents = events.filter((evt) => {
    if (filter === 'all') return true;
    return evt.type === filter;
  });

  const renderEventMeta = (type: FeedEvent['type']) => {
    switch (type) {
      case 'lead_change':
        return {
          icon: Trophy,
          accent: 'text-emerald-600 dark:text-emerald-400',
          label: 'Lead Change',
        };
      case 'commit':
        return {
          icon: GitCommitHorizontal,
          accent: 'text-pink-600 dark:text-cyan-400',
          label: 'Commit',
        };
      case 'new_repo':
        return {
          icon: PlusCircle,
          accent: 'text-violet-600 dark:text-violet-400',
          label: 'New Repo',
        };
      case 'benchmark':
        return {
          icon: Gauge,
          accent: 'text-orange-600 dark:text-amber-400',
          label: 'Benchmark',
        };
      case 'alert':
        return {
          icon: BellRing,
          accent: 'text-amber-600 dark:text-amber-300',
          label: 'Alert Rule',
        };
    }
  };

  return (
    <section
      id="changes"
      aria-label="Live GitHub Commit and Telemetry Feed"
      className="scroll-mt-24 rounded-[22px] bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-[#1E2636] shadow-[0_12px_36px_-18px_rgba(15,23,42,0.1)] dark:shadow-none p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-sm font-extrabold tracking-wider text-slate-500 dark:text-slate-400">
            What changed
          </h2>
          <span className="font-mono text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {filteredEvents.length} live {filteredEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {/* Clean Segmented Filter Tabs */}
        <div
          role="group"
          aria-label="Filter telemetry feed"
          className="inline-flex flex-nowrap items-center max-w-full overflow-x-auto p-1 rounded-full bg-slate-100 dark:bg-[#0D1119] border border-slate-200/70 dark:border-[#1E2636] gap-0.5"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === f.value
                  ? 'bg-white dark:bg-[#1D2638] text-[#0D0E14] dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Horizontal Editorial Change Cards */}
      {filteredEvents.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 dark:bg-[#0D1119] border border-dashed border-slate-200 dark:border-[#242F44] px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
          No {filter === 'all' ? 'telemetry' : filter.replace('_', ' ')} events recorded yet. Live GitHub commits and logged benchmarks appear here automatically.
        </div>
      ) : (
        <div className="flex gap-3.5 overflow-x-auto pb-2 snap-x">
          {filteredEvents.slice(0, 16).map((evt) => {
            const { icon: Icon, accent, label } = renderEventMeta(evt.type);
            return (
              <article
                key={evt.id}
                onClick={() => onSelectRepo(evt.repoId)}
                className="snap-start shrink-0 w-[300px] sm:w-[330px] rounded-2xl bg-slate-50/90 dark:bg-[#0E131D] hover:bg-slate-100/80 dark:hover:bg-[#171E2E] border border-slate-200/70 dark:border-[#1E2636] p-4 transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${accent}`}>
                      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      {label}
                    </span>
                    <span className="text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
                      {formatRelativeTime(evt.timestamp)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0D0E14] dark:text-slate-100 truncate">
                      {evt.repoFullName}
                    </span>
                    {evt.meta && (
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                        {evt.meta}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed line-clamp-2">
                    {evt.title}
                  </p>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 truncate">
                  {evt.detail}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
