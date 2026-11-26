import { useMemo, useState } from 'react';
import type { TrackedRepo } from '../types/telemetry';

interface ProgressionChartProps {
  repos: TrackedRepo[];
}

type ChartMetric = 'score' | 'avgFps';

const SERIES_COLORS = [
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#F43F5E', // Rose
  '#A78BFA', // Violet
  '#38BDF8', // Sky
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

  // Collect union of all real recorded dates across top repos
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

  // Chart SVG dimensions
  const width = 760;
  const height = 250;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
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
      aria-label="14-Day Progression History Chart"
      className="bg-[#131822] border border-[#1E2636] rounded-lg overflow-hidden"
    >
      <div className="px-4 py-3.5 border-b border-[#1E2636] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-slate-100">
            Progression History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Recorded benchmark trajectory for top tracked repositories (no synthetic history).
          </p>
        </div>

        <div
          role="group"
          aria-label="Chart Metric Toggle"
          className="inline-flex items-center p-0.5 rounded-md bg-[#0D1119] border border-[#1E2636]"
        >
          <button
            type="button"
            onClick={() => setMetric('score')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              metric === 'score'
                ? 'bg-[#1D2638] text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Playability Score (%)
          </button>
          <button
            type="button"
            onClick={() => setMetric('avgFps')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              metric === 'avgFps'
                ? 'bg-[#1D2638] text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Average FPS
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Series Toggles */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
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
                  isHidden ? 'opacity-35 line-through' : 'opacity-100 hover:text-white'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="w-2.5 h-0.5 rounded-full inline-block"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-300">{getSeriesLabel(repo)}</span>
                <span className="text-slate-500 tabular-nums">{currentVal}</span>
              </button>
            );
          })}
        </div>

        {!hasChartData ? (
          <div className="rounded-md border border-dashed border-[#242F44] bg-[#0D1119]/70 px-6 py-12 text-center">
            <p className="font-mono text-sm font-semibold text-slate-400">N/A</p>
            <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
              No {metric === 'score' ? 'playability score' : 'FPS'} history has been recorded yet. Log real benchmarks on any repository to plot live progression over time.
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
              {/* Horizontal grid lines & Y axis labels */}
              {yTicks.map((tick) => {
                const y = getY(tick);
                return (
                  <g key={tick}>
                    <line
                      x1={padLeft}
                      x2={width - padRight}
                      y1={y}
                      y2={y}
                      stroke="#1D2535"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-mono"
                    >
                      {metric === 'score' ? `${Math.round(tick)}%` : Math.round(tick)}
                    </text>
                  </g>
                );
              })}

              {/* X axis labels */}
              {timelineDates.map((d, idx) => {
                const isLast = idx === timelineDates.length - 1;
                const isTooCloseToLast = timelineDates.length > 3 && idx === timelineDates.length - 2;
                if (timelineDates.length > 5 && !isLast && (isTooCloseToLast || (idx !== 0 && idx % 3 !== 0))) {
                  return null;
                }
                const x = getX(idx);
                return (
                  <text
                    key={`${d.date}-${idx}`}
                    x={x}
                    y={height - 8}
                    textAnchor={
                      pointCount === 1 ? 'middle' : idx === 0 ? 'start' : isLast ? 'end' : 'middle'
                    }
                    className="fill-slate-500 text-[10px] font-mono"
                  >
                    {d.label}
                  </text>
                );
              })}

              {/* Active vertical crosshair */}
              {activeIdx !== null && (
                <line
                  x1={getX(activeIdx)}
                  x2={getX(activeIdx)}
                  y1={padTop}
                  y2={padTop + plotH}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Series polylines & data points */}
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
                        strokeWidth={seriesIdx === 0 ? '2.25' : '1.75'}
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
                        r={activeIdx === p.idx ? 4.5 : 3.5}
                        fill={color}
                        stroke="#0B0E14"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })}

              {/* Invisible hover columns */}
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

            {/* Compact Monospace Crosshair Readout Strip */}
            <div className="mt-2.5 pt-2.5 border-t border-[#1C2434] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-slate-400">
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
                      <span className="text-slate-400">{getSeriesLabel(repo)}:</span>
                      <span className={val !== null ? 'text-slate-100 font-semibold' : 'text-slate-500'}>
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
