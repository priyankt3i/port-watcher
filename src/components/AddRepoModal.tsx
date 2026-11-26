import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  GitCommitHorizontal,
  Loader2,
  SearchCheck,
  X,
} from 'lucide-react';
import type {
  GithubRepoVerificationResult,
  GpuTarget,
  MilestoneScores,
  RateLimitInfo,
  TrackedRepo,
} from '../types/telemetry';
import {
  calculatePlayabilityScore,
  createEmptyMilestones,
  MILESTONE_LIMITS,
  parseRepoInput,
} from '../utils/telemetryLogic';
import { verifyGithubRepository } from '../services/githubTelemetryService';

interface AddRepoModalProps {
  isOpen: boolean;
  existingRepoIds: Set<string>;
  githubPat: string;
  onClose: () => void;
  onRateLimitUpdate: (info: RateLimitInfo) => void;
  onAddRepo: (repo: TrackedRepo) => void;
}

const MILESTONE_KEYS: (keyof MilestoneScores)[] = [
  'bootAndRender',
  'worldAndFoliage',
  'lightingAndShaders',
  'audioAndPhysics',
  'framePacingAndStability',
];

export function AddRepoModal({
  isOpen,
  existingRepoIds,
  githubPat,
  onClose,
  onRateLimitUpdate,
  onAddRepo,
}: AddRepoModalProps) {
  const [repoInput, setRepoInput] = useState('');
  const [gpuTarget, setGpuTarget] = useState<GpuTarget>('AMD RDNA3/4');
  const [includeMilestones, setIncludeMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneScores>(createEmptyMilestones);
  const [avgFps, setAvgFps] = useState('');
  const [onePercentLow, setOnePercentLow] = useState('');
  const [ramGb, setRamGb] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<GithubRepoVerificationResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRepoInput('');
    setGpuTarget('AMD RDNA3/4');
    setIncludeMilestones(false);
    setMilestones(createEmptyMilestones());
    setAvgFps('');
    setOnePercentLow('');
    setRamGb('');
    setIsVerifying(false);
    setVerification(null);
    setFormError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const computedScore = includeMilestones ? calculatePlayabilityScore(milestones) : null;

  const handleVerify = async () => {
    setFormError(null);
    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setFormError('Enter a valid GitHub URL (https://github.com/owner/repo) or shorthand (owner/repo).');
      return;
    }

    setIsVerifying(true);
    setVerification(null);

    const result = await verifyGithubRepository(parsed.owner, parsed.repo, githubPat);
    if (result.rateLimit && result.rateLimit.remaining !== null) {
      onRateLimitUpdate(result.rateLimit);
    }
    setVerification(result);
    setIsVerifying(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = parseRepoInput(repoInput);
    if (!parsed) {
      setFormError('Enter a valid GitHub URL (https://github.com/owner/repo) or shorthand (owner/repo).');
      return;
    }

    if (existingRepoIds.has(parsed.id)) {
      setFormError(`${parsed.fullName} is already tracked in the active race.`);
      return;
    }

    let parsedFps: number | null = null;
    if (avgFps.trim() !== '') {
      const n = Number(avgFps);
      if (Number.isNaN(n) || n < 0 || n > 300) {
        setFormError('Average FPS must be a number between 0 and 300 (or leave blank for N/A).');
        return;
      }
      parsedFps = Number(n.toFixed(1));
    }

    let parsedLow: number | null = null;
    if (onePercentLow.trim() !== '') {
      const n = Number(onePercentLow);
      if (Number.isNaN(n) || n < 0 || n > 300) {
        setFormError('1% Low FPS must be a number between 0 and 300 (or leave blank for N/A).');
        return;
      }
      parsedLow = Number((parsedFps !== null ? Math.min(parsedFps, n) : n).toFixed(1));
    }

    let parsedRam: number | null = null;
    if (ramGb.trim() !== '') {
      const n = Number(ramGb);
      if (Number.isNaN(n) || n <= 0 || n > 256) {
        setFormError('RAM Footprint must be between 0.1 and 256 GB (or leave blank for N/A).');
        return;
      }
      parsedRam = Number(n.toFixed(1));
    }

    const nowIso = new Date().toISOString();
    const verifiedMatchesInput =
      verification?.ok &&
      verification.fullName.toLowerCase() === parsed.id;

    const finalMilestones = includeMilestones ? milestones : null;
    const finalScore = includeMilestones ? calculatePlayabilityScore(milestones) : null;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nowDate = new Date(nowIso);
    const initialHistory =
      finalScore !== null || parsedFps !== null
        ? [
            {
              date: nowIso.slice(0, 10),
              label: `${monthNames[nowDate.getUTCMonth()]} ${nowDate.getUTCDate()}`,
              score: finalScore,
              avgFps: parsedFps,
            },
          ]
        : [];

    const newRepo: TrackedRepo = {
      id: parsed.id,
      owner: verifiedMatchesInput ? verification.owner : parsed.owner,
      name: verifiedMatchesInput ? verification.name : parsed.repo,
      fullName: verifiedMatchesInput ? verification.fullName : parsed.fullName,
      description: verifiedMatchesInput ? verification.description : null,
      avatarUrl: verifiedMatchesInput ? verification.avatarUrl : '',
      htmlUrl: verifiedMatchesInput
        ? verification.htmlUrl
        : `https://github.com/${parsed.fullName}`,
      defaultBranch: verifiedMatchesInput ? verification.defaultBranch : null,
      gpuTarget,
      milestones: finalMilestones,
      playabilityScore: finalScore,
      avgFps: parsedFps,
      onePercentLowFps: parsedLow,
      ramFootprintGb: parsedRam,
      stars: verifiedMatchesInput ? verification.stars : null,
      openIssues: verifiedMatchesInput ? verification.openIssues : null,
      latestCommit: verifiedMatchesInput ? (verification.latestCommit ?? null) : null,
      recentCommits: verifiedMatchesInput ? (verification.recentCommits ?? []) : [],
      commitVelocity14d: verifiedMatchesInput ? (verification.commitVelocity14d ?? null) : null,
      regressions: [],
      history14d: initialHistory,
      rank: existingRepoIds.size + 1,
      rankDelta: 0,
      starred: false,
      addedAt: nowIso,
      lastSyncedAt: verifiedMatchesInput ? nowIso : undefined,
      syncStatus: verifiedMatchesInput ? 'live' : 'pending',
    };

    onAddRepo(newRepo);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Track New Repository"
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-[#131822] border border-[#253044] shadow-2xl shadow-black/80">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1E2636] flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-50">Track New Repository</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Fetches live GitHub metadata. Leave unmeasured benchmark fields blank to display N/A.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Add Repository modal"
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-[#1E2636] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Repo URL / Shorthand + Verify Button */}
          <div>
            <label htmlFor="add-repo-input" className="block text-xs font-medium text-slate-200 mb-1.5">
              GitHub Repository URL or Shorthand
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="add-repo-input"
                type="text"
                value={repoInput}
                onChange={(e) => {
                  setRepoInput(e.target.value);
                  setFormError(null);
                }}
                placeholder="https://github.com/owner/repo or owner/repo"
                required
                className="flex-1 bg-[#0B0E14] border border-[#253044] rounded-md px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md border border-cyan-500/40 bg-cyan-500/12 text-cyan-200 hover:bg-cyan-500/20 text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <SearchCheck className="w-3.5 h-3.5" />
                    Verify on GitHub
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Error Banner */}
          {formError && (
            <div
              role="alert"
              className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-200 flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {/* GitHub Verification Banner (Success or 404/DMCA/403 Error) */}
          {verification && (
            verification.ok ? (
              <div className="rounded-md border border-emerald-500/35 bg-emerald-500/8 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Verified on GitHub: {verification.fullName}
                  </span>
                  <span className="font-mono text-[11px] text-slate-300 tabular-nums">
                    {verification.stars !== null ? `${verification.stars.toLocaleString()} ★` : 'N/A ★'} ·{' '}
                    {verification.openIssues !== null ? `${verification.openIssues} issues` : 'N/A issues'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {verification.description ?? 'No repository description on GitHub.'}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <GitBranch className="w-3 h-3 text-cyan-400" aria-hidden="true" />
                    {verification.defaultBranch ?? 'N/A'}
                  </span>
                  {verification.latestCommit && (
                    <span className="inline-flex items-center gap-1 truncate max-w-md">
                      <GitCommitHorizontal className="w-3 h-3 text-cyan-400 shrink-0" aria-hidden="true" />
                      <span className="text-cyan-300">{verification.latestCommit.sha}</span>
                      <span className="truncate">{verification.latestCommit.message}</span>
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div
                role="alert"
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-2.5"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-amber-100">GitHub Verification Failed</p>
                  <p className="mt-0.5 text-amber-200/90 leading-relaxed">{verification.errorMessage}</p>
                  <p className="mt-1 text-[11px] text-slate-300">
                    You can still track this repo; missing GitHub metadata will display as N/A.
                  </p>
                </div>
              </div>
            )
          )}

          {/* GPU Target & Optional Numeric Telemetry */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label htmlFor="add-gpu-target" className="block text-xs font-medium text-slate-300 mb-1 whitespace-nowrap">
                Target GPU Architecture
              </label>
              <select
                id="add-gpu-target"
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
              <label htmlFor="add-avg-fps" className="block text-xs font-medium text-slate-300 mb-1 whitespace-nowrap">
                Avg FPS
              </label>
              <input
                id="add-avg-fps"
                type="number"
                min={0}
                max={300}
                step="0.1"
                value={avgFps}
                onChange={(e) => setAvgFps(e.target.value)}
                placeholder="N/A"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="add-low-fps" className="block text-xs font-medium text-slate-300 mb-1 whitespace-nowrap">
                1% Low
              </label>
              <input
                id="add-low-fps"
                type="number"
                min={0}
                max={300}
                step="0.1"
                value={onePercentLow}
                onChange={(e) => setOnePercentLow(e.target.value)}
                placeholder="N/A"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 tabular-nums"
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="add-ram-gb" className="block text-xs font-medium text-slate-300 mb-1 whitespace-nowrap">
                RAM Footprint (GB)
              </label>
              <input
                id="add-ram-gb"
                type="number"
                min={0.1}
                max={256}
                step="0.1"
                value={ramGb}
                onChange={(e) => setRamGb(e.target.value)}
                placeholder="N/A"
                className="w-full bg-[#0B0E14] border border-[#253044] rounded-md px-2.5 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 tabular-nums"
              />
            </div>
          </div>

          {/* Optional 5 Weighted Milestone Sliders */}
          <div className="rounded-lg border border-[#1E2636] bg-[#0F141D] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMilestones}
                  onChange={(e) => setIncludeMilestones(e.target.checked)}
                  className="rounded border-[#253044] bg-[#0B0E14] accent-emerald-500"
                />
                Include verified milestone scores (optional)
              </label>
              <span className="font-mono text-xs font-bold tabular-nums text-emerald-300">
                Composite Score: {computedScore !== null ? `${computedScore}%` : 'N/A'}
              </span>
            </div>

            {includeMilestones && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-1">
                {MILESTONE_KEYS.map((key) => {
                  const meta = MILESTONE_LIMITS[key];
                  const val = milestones[key];
                  return (
                    <div key={key} className={key === 'bootAndRender' ? 'sm:col-span-2' : ''}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <label htmlFor={`add-ms-${key}`} className="text-slate-300">
                          {meta.label}
                        </label>
                        <span className="font-mono text-cyan-300 tabular-nums">
                          {val} / {meta.max}
                        </span>
                      </div>
                      <input
                        id={`add-ms-${key}`}
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
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-[#1E2636] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-[#253044] text-xs font-medium text-slate-300 hover:text-slate-100 hover:border-slate-500 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#06130D] text-xs font-semibold cursor-pointer"
            >
              {computedScore !== null ? `Add to Race (${computedScore}%)` : 'Add to Race'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
