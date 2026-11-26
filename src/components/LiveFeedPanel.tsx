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
  { value: 'lead_change', label: 'Lead Changes' },
  { value: 'commit', label: 'Commits' },
  { value: 'new_repo', label: 'New Repos' },
  { value: 'benchmark', label: 'Benchmarks' },
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
          accent: 'text-emerald-400',
          label: 'Lead Change',
        };
      case 'commit':
        return {
          icon: GitCommitHorizontal,
          accent: 'text-cyan-400',
          label: 'Commit',
        };
      case 'new_repo':
        return {
          icon: PlusCircle,
          accent: 'text-emerald-300',
          label: 'New Repo',
        };
      case 'benchmark':
        return {
          icon: Gauge,
          accent: 'text-amber-400',
          label: 'Benchmark',
        };
      case 'alert':
        return {
          icon: BellRing,
          accent: 'text-amber-300',
          label: 'Alert Rule',
        };
    }
  };

  return (
    <section
      aria-label="Live GitHub Commit and Telemetry Feed"
      className="bg-[#131822] border border-[#1E2636] rounded-lg overflow-hidden flex flex-col"
    >
      <div className="px-4 py-3.5 border-b border-[#1E2636]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-100">
            Live Commit & Telemetry Feed
          </h2>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {filteredEvents.length} events
          </span>
        </div>

        {/* Interactive Filter Tabs */}
        <div
          role="group"
          aria-label="Filter telemetry feed"
          className="mt-3 flex flex-wrap items-center gap-1"
        >
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filter === f.value
                  ? 'bg-[#1F293B] text-cyan-300 border border-cyan-500/35'
                  : 'bg-[#0D1119] text-slate-400 border border-[#1E2636] hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrolling Event Log */}
      <div className="max-h-[430px] overflow-y-auto divide-y divide-[#1A2231]">
        {filteredEvents.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-slate-400">
            No {filter === 'all' ? 'telemetry' : filter.replace('_', ' ')} events recorded yet.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const { icon: Icon, accent, label } = renderEventMeta(evt.type);
            return (
              <article
                key={evt.id}
                className={`px-4 py-3 transition-colors hover:bg-[#171E2C] ${
                  evt.type === 'lead_change' ? 'bg-emerald-500/[0.04]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                  <span className={`inline-flex items-center gap-1.5 font-semibold ${accent}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {label}
                  </span>
                  <span className="text-slate-500 tabular-nums shrink-0">
                    {formatRelativeTime(evt.timestamp)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectRepo(evt.repoId)}
                    className="text-xs font-semibold text-slate-200 hover:text-cyan-300 truncate text-left cursor-pointer"
                  >
                    {evt.repoFullName}
                  </button>
                  {evt.meta && (
                    <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                      {evt.meta}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-snug break-words">
                  {evt.title}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {evt.detail}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
