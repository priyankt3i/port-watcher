import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { GpuTarget, MilestoneScores, TrackedRepo } from '../types/telemetry';
import {
  calculatePlayabilityScore,
  createEmptyMilestones,
  MILESTONE_LIMITS,
} from '../utils/telemetryLogic';

interface UpdateBenchmarkModalProps {
  repo: TrackedRepo | null;
  onClose: () => void;
  onSaveBenchmark: (
    repoId: string,
    payload: {
      gpuTarget: GpuTarget;
      avgFps: number | null;
      onePercentLowFps: number | null;
      ramFootprintGb: number | null;
      milestones: MilestoneScores | null;
      note: string;
    }
  ) => void;
}

const MILESTONE_KEYS: (keyof MilestoneScores)[] = [
  'bootAndRender',
  'worldAndFoliage',
  'lightingAndShaders',
  'audioAndPhysics',
  'framePacingAndStability',
];

export function UpdateBenchmarkModal({
  repo,
  onClose,
  onSaveBenchmark,
}: UpdateBenchmarkModalProps) {
  const [gpuTarget, setGpuTarget] = useState<GpuTarget>('AMD RDNA3/4');
  const [avgFps, setAvgFps] = useState('');
  const [onePercentLow, setOnePercentLow] = useState('');
  const [ramGb, setRamGb] = useState('');
  const [includeMilestones, setIncludeMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneScores>(createEmptyMilestones);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!repo) return;
    setGpuTarget(repo.gpuTarget);
    setAvgFps(repo.avgFps !== null ? String(repo.avgFps) : '');
    setOnePercentLow(repo.onePercentLowFps !== null ? String(repo.onePercentLowFps) : '');
    setRamGb(repo.ramFootprintGb !== null ? String(repo.ramFootprintGb) : '');
    setIncludeMilestones(repo.milestones !== null);
    setMilestones(repo.milestones ? { ...repo.milestones } : createEmptyMilestones());
    setNote('');
  }, [repo]);

  useEffect(() => {
    if (!repo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [repo, onClose]);

  if (!repo) return null;

  const nextScore = includeMilestones ? calculatePlayabilityScore(milestones) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedFps =
      avgFps.trim() !== '' && !Number.isNaN(Number(avgFps))
        ? Number(Math.max(0, Math.min(300, Number(avgFps))).toFixed(1))
        : null;
    const parsedLowRaw =
      onePercentLow.trim() !== '' && !Number.isNaN(Number(onePercentLow))
        ? Math.max(0, Math.min(300, Number(onePercentLow)))
        : null;
    const parsedLow =
      parsedLowRaw !== null
        ? Number((parsedFps !== null ? Math.min(parsedFps, parsedLowRaw) : parsedLowRaw).toFixed(1))
        : null;
    const parsedRam =
      ramGb.trim() !== '' && !Number.isNaN(Number(ramGb))
        ? Number(Math.max(0.1, Math.min(256, Number(ramGb))).toFixed(1))
        : null;

    const fpsLabel = parsedFps !== null ? `${parsedFps.toFixed(1)} FPS avg` : 'FPS N/A';
    const scoreLabel = nextScore !== null ? `${nextScore}% playability` : 'playability N/A';

    onSaveBenchmark(repo.id, {
      gpuTarget,
      avgFps: parsedFps,
      onePercentLowFps: parsedLow,
      ramFootprintGb: parsedRam,
      milestones: includeMilestones ? milestones : null,
      note: note.trim() || `Manual benchmark run logged (${fpsLabel}, ${scoreLabel})`,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Update Benchmark Scores for ${repo.fullName}`}
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-[#131822] border border-[#253044] shadow-2xl shadow-black/80">
        <div className="px-5 py-4 border-b border-[#1E2636] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-50">Update Benchmark Scores</h2>
            <p className="text-xs font-mono text-cyan-300 mt-0.5">{repo.fullName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Update Benchmark modal"
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1E2636] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label htmlFor="bench-gpu" className="block text-xs text-slate-300 mb-1 whitespace-nowrap">
                GPU Target
              </label>
              <select
                id="bench-gpu"
                value={gpuTarget}
                onChange={(e) => setGpuTarget(e.target.value as GpuTarget)}
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs text-slate-100"
              >
                <option value="AMD RDNA3/4">AMD RDNA3/4</option>
                <option value="NVIDIA Ada/Blackwell">NVIDIA Ada/Blackwell</option>
                <option value="Multi-Vendor / Vulkan">Multi-Vendor / Vulkan</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bench-fps" className="block text-xs text-slate-300 mb-1 whitespace-nowrap">
                Avg FPS
              </label>
              <input
                id="bench-fps"
                type="number"
                step="0.1"
                min={0}
                max={300}
                value={avgFps}
                onChange={(e) => setAvgFps(e.target.value)}
                placeholder="N/A"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bench-low" className="block text-xs text-slate-300 mb-1 whitespace-nowrap">
                1% Low
              </label>
              <input
                id="bench-low"
                type="number"
                step="0.1"
                min={0}
                max={300}
                value={onePercentLow}
                onChange={(e) => setOnePercentLow(e.target.value)}
                placeholder="N/A"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 tabular-nums"
              />
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="bench-ram" className="block text-xs text-slate-300 mb-1 whitespace-nowrap">
                RAM (GB)
              </label>
              <input
                id="bench-ram"
                type="number"
                step="0.1"
                min={0.1}
                max={256}
                value={ramGb}
                onChange={(e) => setRamGb(e.target.value)}
                placeholder="N/A"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 tabular-nums"
              />
            </div>
          </div>

          <div className="rounded-lg border border-[#1E2636] bg-[#0F141D] p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMilestones}
                  onChange={(e) => setIncludeMilestones(e.target.checked)}
                  className="rounded border-[#253044] bg-[#0B0E14] accent-emerald-500"
                />
                Record Milestone Scores
              </label>
              <span className="font-mono font-bold text-emerald-300 tabular-nums">
                Playability: {nextScore !== null ? `${nextScore}%` : 'N/A'}
              </span>
            </div>
            {includeMilestones &&
              MILESTONE_KEYS.map((key) => {
                const meta = MILESTONE_LIMITS[key];
                const val = milestones[key];
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <label htmlFor={`bench-ms-${key}`} className="text-slate-300">
                        {meta.label}
                      </label>
                      <span className="font-mono text-cyan-300 tabular-nums">
                        {val} / {meta.max}
                      </span>
                    </div>
                    <input
                      id={`bench-ms-${key}`}
                      type="range"
                      min={0}
                      max={meta.max}
                      step={1}
                      value={val}
                      onChange={(e) =>
                        setMilestones((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                      }
                      className="w-full telemetry-slider"
                    />
                  </div>
                );
              })}
          </div>

          <div>
            <label htmlFor="bench-note" className="block text-xs text-slate-300 mb-1">
              Benchmark Notes (logged to Live Feed)
            </label>
            <input
              id="bench-note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Tested 1440p Medium on RX 7900 XTX"
              className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="pt-2 border-t border-[#1E2636] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-[#253044] text-xs font-medium text-slate-300 hover:text-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
            >
              Save Benchmark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
