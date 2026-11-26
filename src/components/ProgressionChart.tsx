import { useMemo, useState } from 'react';
import type { TrackedRepo } from '../types/telemetry';

interface ProgressionChartProps {
  repos: TrackedRepo[];
}

type ChartMetric = 'score' | 'avgFps';

const SERIES_COLORS = [
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#F97316', // Orange
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
];

export function ProgressionChart({ repos }: ProgressionChartProps) {
  const [metric, setMetric] = useState<ChartMetric>('score');
  const [hiddenRepoIds, setHiddenRepoIds] = useState<Set<string>>(new Set());
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const topRepos = useMemo(() => {
    return [...repos].sort((a, b) => a.rank - b.rank).slice(0, 6);
  }, [repos]);

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of topRepos) {
      const key = r.name.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, c]) => c > 1).map(([k]) => k));
  }, [topRepos]);

  const getSeriesLabel = (repo: TrackedRepo) =>
    duplicateNames.has(repo.name.toLowerCase()) ? repo.fullName : repo.name;

  const visibleRepos = useMemo(
    () => topRepos.filter((r) => !hiddenRepoIds.has(r.id)),
    [topRepos, hiddenRepoIds]
  );

  const timelineDates = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of topRepos) {
      for (const pt of r.history14d) {
        const val = metric === 'score' ? pt.score : pt.avgFps;
        if (val !== null) {
          map.set(pt.date, pt.label);
        }
      }
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, label]) => ({ date, label }));
  }, [topRepos, metric]);

  const hasChartData = timelineDates.length > 0;

  const toggleSeries = (id: string) => {
    setHiddenRepoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (topRepos.length - next.size > 1) {
        next.add(id);
      }
      return next;
    });
  };

  const width = 720;
  const height = 240;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const { yMin, yMax, yTicks } = useMemo(() => {
    if (metric === 'score') {
      return { yMin: 0, yMax: 100, yTicks: [0, 25, 50, 75, 100] };
    }
    let maxVal = 30;
    for (const r of visibleRepos) {
      for (const p of r.history14d) {
        if (p.avgFps !== null && p.avgFps > maxVal) maxVal = p.avgFps;
      }
    }
    const ceilMax = Math.ceil(maxVal / 10) * 10;
    const step = ceilMax / 4;
    return {
      yMin: 0,
      yMax: ceilMax,
      yTicks: [0, step, step * 2, step * 3, ceilMax],
    };
  }, [metric, visibleRepos]);

  const pointCount = timelineDates.length;
  const getX = (idx: number) =>
    pointCount <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (pointCount - 1)) * plotW;
  const getY = (val: number) =>
    padTop + plotH - ((val - yMin) / Math.max(1, yMax - yMin)) * plotH;

  const activeIdx =
    hoverIndex !== null && pointCount > 0
      ? Math.min(pointCount - 1, Math.max(0, hoverIndex))
      : null;

  return (
    <section
      id="history"
      aria-label="14-Day Progression History Chart"
      className="scroll-mt-24 rounded-[22px] bg-white dark:bg-[#131822] border border-slate-200/80 dark:border-[#1E2636] shadow-[0_10px_30px_-18px_rgba(15,23,42,0.1)] dark:shadow-none overflow-hidden flex flex-col"
    >
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-[#1E2636] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-[#0D0E14] dark:text-white">
            Progression History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Recorded benchmark snapshots over time (zero synthetic data).
          </p>
        </div>

        <div
          role="group"
          aria-label="Chart Metric Toggle"
          className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-[#0D1119] border border-slate-200/70 dark:border-[#1E2636]"
        >
          <button
            type="button"
            onClick={() => setMetric('score')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              metric === 'score'
                ? 'bg-white dark:bg-[#1D2638] text-[#0D0E14] dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Playability (%)
          </button>
          <button
            type="button"
            onClick={() => setMetric('avgFps')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              metric === 'avgFps'
                ? 'bg-white dark:bg-[#1D2638] text-[#0D0E14] dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Average FPS
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        {/* Series Toggles */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
          {topRepos.map((repo, idx) => {
            const color = SERIES_COLORS[idx % SERIES_COLORS.length];
            const isHidden = hiddenRepoIds.has(repo.id);
            const currentVal =
              metric === 'score'
                ? repo.playabilityScore !== null
                  ? `${repo.playabilityScore}%`
                  : 'N/A'
                : repo.avgFps !== null
                  ? `${repo.avgFps.toFixed(1)}`
                  : 'N/A';
            return (
              <button
                key={repo.id}
                type="button"
                onClick={() => toggleSeries(repo.id)}
                aria-pressed={!isHidden}
                className={`inline-flex items-center gap-1.5 text-xs font-mono transition-opacity cursor-pointer ${
                  isHidden ? 'opacity-35 line-through' : 'opacity-100'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-1 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-700 dark:text-slate-300 font-medium">
                  {getSeriesLabel(repo)}
                </span>
                <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                  {currentVal}
                </span>
              </button>
            );
          })}
        </div>

        {!hasChartData ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-[#242F44] bg-slate-50/80 dark:bg-[#0D1119]/70 px-6 py-14 text-center">
            <p className="font-display text-lg font-bold text-slate-400 dark:text-slate-500">
              N/A
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              No {metric === 'score' ? 'playability score' : 'FPS'} history has been recorded yet. Log real benchmarks on any contender card to plot live progression.
            </p>
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto block select-none"
              role="img"
              aria-label={`Recorded ${metric === 'score' ? 'Playability Score' : 'Average FPS'} progression chart`}
              onMouseLeave={() => setHoverIndex(null)}
            >
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      x2={width - padRight}
                      y1={y}
                      y2={y}
                      className="stroke-slate-100 dark:stroke-[#1D2535]"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                    >
                      {metric === 'score' ? `${Math.round(tick)}%` : Math.round(tick)}
                    </text>
                  </g>
                );
              })}

              {timelineDates.map((d, idx) => {
                const isLast = idx === timelineDates.length - 1;
                const isTooCloseToLast =
                  timelineDates.length > 3 && idx === timelineDates.length - 2;
                if (
                  timelineDates.length > 5 &&
                  !isLast &&
                  (isTooCloseToLast || (idx !== 0 && idx % 3 !== 0))
                ) {
                  return null;
                }
                const x = getX(idx);
                return (
                  <text
                    key={`${d.date}-${idx}`}
                    x={x}
                    y={height - 6}
                    textAnchor={
                      pointCount === 1
                        ? 'middle'
                        : idx === 0
                          ? 'start'
                          : isLast
                            ? 'end'
                            : 'middle'
                    }
                    className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                  >
                    {d.label}
                  </text>
                );
              })}

              {activeIdx !== null && (
                <line
                  x1={getX(activeIdx)}
                  x2={getX(activeIdx)}
                  y1={padTop}
                  y2={padTop + plotH}
                  className="stroke-slate-300 dark:stroke-slate-600"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {topRepos.map((repo, seriesIdx) => {
                if (hiddenRepoIds.has(repo.id)) return null;
                const color = SERIES_COLORS[seriesIdx % SERIES_COLORS.length];
                const byDate = new Map(repo.history14d.map((p) => [p.date, p]));
                const plotted = timelineDates
                  .map((d, i) => {
                    const pt = byDate.get(d.date);
                    const val = pt ? (metric === 'score' ? pt.score : pt.avgFps) : null;
                    return val !== null ? { idx: i, val, date: d.date } : null;
                  })
                  .filter((x): x is { idx: number; val: number; date: string } => x !== null);

                if (plotted.length === 0) return null;

                const pointsStr = plotted
                  .map((p) => `${getX(p.idx).toFixed(1)},${getY(p.val).toFixed(1)}`)
                  .join(' ');

                return (
                  <g key={repo.id}>
                    {plotted.length >= 2 && (
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth={seriesIdx === 0 ? '2.5' : '2'}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={pointsStr}
                      />
                    )}
                    {plotted.map((p) => (
                      <circle
                        key={`${repo.id}-${p.date}`}
                        cx={getX(p.idx)}
                        cy={getY(p.val)}
                        r={activeIdx === p.idx ? 5 : 4}
                        fill={color}
                        className="stroke-white dark:stroke-[#131822]"
                        strokeWidth="2"
                      />
                    ))}
                  </g>
                );
              })}

              {timelineDates.map((d, idx) => {
                const colW = pointCount <= 1 ? plotW : plotW / Math.max(1, pointCount - 1);
                const x = pointCount <= 1 ? padLeft : Math.max(padLeft, getX(idx) - colW / 2);
                return (
                  <rect
                    key={`hit-${d.date}-${idx}`}
                    x={x}
                    y={padTop}
                    width={colW}
                    height={plotH}
                    fill="transparent"
                    className="cursor-crosshair"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />
                );
              })}
            </svg>

            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1E2636] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-slate-500 dark:text-slate-400">
                {activeIdx !== null
                  ? `Snapshot: ${timelineDates[activeIdx].label}`
                  : `Latest recorded (${timelineDates[timelineDates.length - 1].label})`}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                {visibleRepos.map((repo) => {
                  const colorIdx = topRepos.findIndex((r) => r.id === repo.id);
                  const color = SERIES_COLORS[colorIdx % SERIES_COLORS.length];
                  const targetDate =
                    activeIdx !== null
                      ? timelineDates[activeIdx].date
                      : timelineDates[timelineDates.length - 1].date;
                  const pt = repo.history14d.find((p) => p.date === targetDate);
                  const val = pt ? (metric === 'score' ? pt.score : pt.avgFps) : null;
                  return (
                    <span key={repo.id} className="inline-flex items-center gap-1.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full inline-block"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="text-slate-500 dark:text-slate-400">
                        {getSeriesLabel(repo)}:
                      </span>
                      <span
                        className={
                          val !== null
                            ? 'text-[#0D0E14] dark:text-slate-100 font-semibold'
                            : 'text-slate-400 dark:text-slate-500'
                        }
                      >
                        {val !== null
                          ? metric === 'score'
                            ? `${val}%`
                            : `${val.toFixed(1)} FPS`
                          : 'N/A'}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
