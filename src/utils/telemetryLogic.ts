import type {
  AlertRule,
  FeedEvent,
  GlobalTelemetryStats,
  GpuTarget,
  MilestoneScores,
  TrackedRepo,
} from '../types/telemetry';

export const MILESTONE_LIMITS: Record<keyof MilestoneScores, { label: string; max: number; shortLabel: string }> = {
  bootAndRender: { label: 'Boot & Render', shortLabel: 'Boot', max: 50 },
  worldAndFoliage: { label: 'World & Foliage', shortLabel: 'World', max: 15 },
  lightingAndShaders: { label: 'Lighting & Shaders', shortLabel: 'Lighting', max: 15 },
  audioAndPhysics: { label: 'Audio & Physics', shortLabel: 'Audio', max: 10 },
  framePacingAndStability: { label: 'Frame Pacing & Stability', shortLabel: 'Pacing', max: 10 },
};

export interface ParsedRepoInput {
  owner: string;
  repo: string;
  fullName: string;
  id: string;
}

const GITHUB_SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;

/**
 * Parses either a full GitHub URL (https://github.com/owner/repo) or shorthand (owner/repo).
 * Returns null if the input is empty or malformed.
 */
export function parseRepoInput(raw: string): ParsedRepoInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let pathPart = trimmed;

  // Strip protocol + github.com host if present
  const urlMatch = trimmed.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/(.+)$/i);
  if (urlMatch) {
    pathPart = urlMatch[1];
  } else if (/^https?:\/\//i.test(trimmed)) {
    // Reject non-GitHub URLs
    return null;
  }

  // Clean query/hash/trailing slashes
  pathPart = pathPart.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  const segments = pathPart.split('/').filter(Boolean);

  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');

  if (
    !owner ||
    !repo ||
    owner === '.' ||
    owner === '..' ||
    repo === '.' ||
    repo === '..' ||
    !GITHUB_SEGMENT_RE.test(owner) ||
    !GITHUB_SEGMENT_RE.test(repo)
  ) {
    return null;
  }

  const fullName = `${owner}/${repo}`;
  return {
    owner,
    repo,
    fullName,
    id: fullName.toLowerCase(),
  };
}

export function createEmptyMilestones(): MilestoneScores {
  return {
    bootAndRender: 0,
    worldAndFoliage: 0,
    lightingAndShaders: 0,
    audioAndPhysics: 0,
    framePacingAndStability: 0,
  };
}

export function clampMilestoneScores(milestones: MilestoneScores): MilestoneScores {
  return {
    bootAndRender: Math.max(0, Math.min(50, Math.round(milestones.bootAndRender))),
    worldAndFoliage: Math.max(0, Math.min(15, Math.round(milestones.worldAndFoliage))),
    lightingAndShaders: Math.max(0, Math.min(15, Math.round(milestones.lightingAndShaders))),
    audioAndPhysics: Math.max(0, Math.min(10, Math.round(milestones.audioAndPhysics))),
    framePacingAndStability: Math.max(0, Math.min(10, Math.round(milestones.framePacingAndStability))),
  };
}

export function calculatePlayabilityScore(milestones: MilestoneScores | null): number | null {
  if (!milestones) return null;
  const c = clampMilestoneScores(milestones);
  return (
    c.bootAndRender +
    c.worldAndFoliage +
    c.lightingAndShaders +
    c.audioAndPhysics +
    c.framePacingAndStability
  );
}

/**
 * Computes real 14-day daily commit counts (index 0 = 13d ago, index 13 = today UTC)
 * directly from live GitHub commit timestamps.
 */
export function computeCommitVelocity14d(
  commits: Array<{ timestamp: string }>,
  nowMs: number = Date.now()
): number[] {
  const counts = Array<number>(14).fill(0);
  const nowDate = new Date(nowMs);
  const todayUtcStart = Date.UTC(
    nowDate.getUTCFullYear(),
    nowDate.getUTCMonth(),
    nowDate.getUTCDate()
  );

  for (const commit of commits) {
    const ts = Date.parse(commit.timestamp);
    if (Number.isNaN(ts)) continue;
    const d = new Date(ts);
    const dayUtcStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const daysAgo = Math.floor((todayUtcStart - dayUtcStart) / 86400_000);
    if (daysAgo >= 0 && daysAgo < 14) {
      counts[13 - daysAgo] += 1;
    }
  }

  return counts;
}

function compareNullableDesc(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

export interface RankResult {
  ranked: TrackedRepo[];
  leadChanged: boolean;
  previousLeaderId: string | null;
  newLeader: TrackedRepo | null;
}

/**
 * Sorts repos by weighted playability score (desc, nulls last), avgFps (desc, nulls last),
 * live GitHub stars (desc, nulls last), latest commit timestamp (desc, nulls last), then fullName (asc).
 * Updates rank & rankDelta against previous positions and detects #1 lead changes.
 */
export function rankRepos(
  repos: TrackedRepo[],
  previousRanks?: Map<string, number>,
  previousLeaderId?: string | null
): RankResult {
  const prevMap =
    previousRanks ??
    new Map<string, number>(repos.map((r) => [r.id, r.rank]));

  const derivedPrevLeader =
    previousLeaderId !== undefined
      ? previousLeaderId
      : repos.find((r) => r.rank === 1)?.id ?? null;

  const sorted = [...repos]
    .map((repo) => {
      const clamped = repo.milestones ? clampMilestoneScores(repo.milestones) : null;
      const score = calculatePlayabilityScore(clamped);
      return {
        ...repo,
        milestones: clamped,
        playabilityScore: score,
      };
    })
    .sort((a, b) => {
      const scoreCmp = compareNullableDesc(a.playabilityScore, b.playabilityScore);
      if (scoreCmp !== 0) return scoreCmp;

      const fpsCmp = compareNullableDesc(a.avgFps, b.avgFps);
      if (fpsCmp !== 0) return fpsCmp;

      const starsCmp = compareNullableDesc(a.stars, b.stars);
      if (starsCmp !== 0) return starsCmp;

      const aCommitTs = a.latestCommit ? Date.parse(a.latestCommit.timestamp) : null;
      const bCommitTs = b.latestCommit ? Date.parse(b.latestCommit.timestamp) : null;
      const commitCmp = compareNullableDesc(
        aCommitTs !== null && !Number.isNaN(aCommitTs) ? aCommitTs : null,
        bCommitTs !== null && !Number.isNaN(bCommitTs) ? bCommitTs : null
      );
      if (commitCmp !== 0) return commitCmp;

      return a.fullName.localeCompare(b.fullName);
    });

  const ranked = sorted.map((repo, idx) => {
    const newRank = idx + 1;
    const oldRank = prevMap.get(repo.id);
    const rankDelta = oldRank !== undefined ? oldRank - newRank : 0;
    return {
      ...repo,
      rank: newRank,
      rankDelta,
    };
  });

  const newLeader = ranked[0] ?? null;
  const newLeaderHasData = Boolean(
    newLeader &&
      (newLeader.playabilityScore !== null ||
        newLeader.avgFps !== null ||
        newLeader.stars !== null)
  );
  const leadChanged = Boolean(
    derivedPrevLeader &&
      newLeader &&
      newLeaderHasData &&
      newLeader.id !== derivedPrevLeader
  );

  return {
    ranked,
    leadChanged,
    previousLeaderId: derivedPrevLeader,
    newLeader,
  };
}

export function getGlobalStats(repos: TrackedRepo[]): GlobalTelemetryStats {
  if (repos.length === 0) {
    return {
      leaderFullName: null,
      leaderScore: null,
      leaderStars: null,
      leaderGpu: null,
      highestScore: null,
      peakFps: null,
      peakFpsRepo: null,
      activeReposCount: 0,
      liveSyncedCount: 0,
      amdCount: 0,
      nvidiaCount: 0,
      vulkanCount: 0,
    };
  }

  const sortedByRank = [...repos].sort((a, b) => a.rank - b.rank);
  const leaderCandidate = sortedByRank[0];
  const leaderHasMeasuredData =
    leaderCandidate.playabilityScore !== null ||
    leaderCandidate.avgFps !== null ||
    leaderCandidate.stars !== null;

  let peakFpsRepo: TrackedRepo | null = null;
  let highestScore: number | null = null;
  let liveSyncedCount = 0;
  let amdCount = 0;
  let nvidiaCount = 0;
  let vulkanCount = 0;

  for (const r of repos) {
    if (r.syncStatus === 'live') liveSyncedCount++;
    if (r.playabilityScore !== null) {
      if (highestScore === null || r.playabilityScore > highestScore) {
        highestScore = r.playabilityScore;
      }
    }
    if (r.avgFps !== null) {
      if (peakFpsRepo === null || (peakFpsRepo.avgFps ?? -1) < r.avgFps) {
        peakFpsRepo = r;
      }
    }
    if (r.gpuTarget === 'AMD RDNA3/4') amdCount++;
    else if (r.gpuTarget === 'NVIDIA Ada/Blackwell') nvidiaCount++;
    else vulkanCount++;
  }

  return {
    leaderFullName: leaderHasMeasuredData ? leaderCandidate.fullName : null,
    leaderScore: leaderHasMeasuredData ? leaderCandidate.playabilityScore : null,
    leaderStars: leaderHasMeasuredData ? leaderCandidate.stars : null,
    leaderGpu: leaderHasMeasuredData ? leaderCandidate.gpuTarget : null,
    highestScore,
    peakFps: peakFpsRepo?.avgFps ?? null,
    peakFpsRepo: peakFpsRepo?.fullName ?? null,
    activeReposCount: repos.length,
    liveSyncedCount,
    amdCount,
    nvidiaCount,
    vulkanCount,
  };
}

export interface TriggeredAlertMatch {
  rule: AlertRule;
  repo: TrackedRepo;
  message: string;
}

/**
 * Evaluates enabled alert rules on state transitions so alerts fire when a real threshold
 * is newly crossed or when a new #1 leader takes over.
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  prevRepos: TrackedRepo[],
  nextRepos: TrackedRepo[],
  leadChanged: boolean
): TriggeredAlertMatch[] {
  const prevById = new Map(prevRepos.map((r) => [r.id, r]));
  const matches: TriggeredAlertMatch[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.conditionType === 'new_leader') {
      if (leadChanged && nextRepos[0]) {
        const leader = nextRepos[0];
        const scorePart =
          leader.playabilityScore !== null ? `${leader.playabilityScore}% playability` : 'playability N/A';
        const fpsPart =
          leader.avgFps !== null ? `${leader.avgFps.toFixed(1)} FPS` : 'FPS N/A';
        matches.push({
          rule,
          repo: leader,
          message: `${leader.fullName} took Rank #1 (${scorePart}, ${fpsPart}).`,
        });
      }
      continue;
    }

    if (rule.conditionType === 'gpu_fps_gt' && rule.gpuTarget && rule.threshold !== undefined) {
      for (const repo of nextRepos) {
        if (repo.gpuTarget !== rule.gpuTarget || repo.avgFps === null) continue;
        const prev = prevById.get(repo.id);
        const prevFps = prev?.avgFps ?? null;
        const crossed =
          repo.avgFps > rule.threshold && (prevFps === null || prevFps <= rule.threshold);
        if (crossed) {
          matches.push({
            rule,
            repo,
            message: `${repo.fullName} (${repo.gpuTarget}) reached ${repo.avgFps.toFixed(1)} FPS (threshold > ${rule.threshold} FPS).`,
          });
        }
      }
      continue;
    }

    if (rule.conditionType === 'gpu_score_gt' && rule.gpuTarget && rule.threshold !== undefined) {
      for (const repo of nextRepos) {
        if (repo.gpuTarget !== rule.gpuTarget || repo.playabilityScore === null) continue;
        const prev = prevById.get(repo.id);
        const prevScore = prev?.playabilityScore ?? null;
        const crossed =
          repo.playabilityScore > rule.threshold &&
          (prevScore === null || prevScore <= rule.threshold);
        if (crossed) {
          matches.push({
            rule,
            repo,
            message: `${repo.fullName} (${repo.gpuTarget}) hit ${repo.playabilityScore}% playability (threshold > ${rule.threshold}%).`,
          });
        }
      }
      continue;
    }

    if (rule.conditionType === 'repo_score_gt' && rule.repoId && rule.threshold !== undefined) {
      const repo = nextRepos.find((r) => r.id === rule.repoId);
      if (repo && repo.playabilityScore !== null) {
        const prev = prevById.get(repo.id);
        const prevScore = prev?.playabilityScore ?? null;
        const crossed =
          repo.playabilityScore > rule.threshold &&
          (prevScore === null || prevScore <= rule.threshold);
        if (crossed) {
          matches.push({
            rule,
            repo,
            message: `${repo.fullName} crossed ${repo.playabilityScore}% playability (threshold > ${rule.threshold}%).`,
          });
        }
      }
    }
  }

  return matches;
}

const SIM_COMMIT_TEMPLATES = [
  { msg: 'opt(vk): eliminate descriptor set stall on async compute pass', field: 'framePacingAndStability' as const, fpsDelta: 1.4 },
  { msg: 'fix(shaders): patch HLSL SM6.6 wave ops translation for foliage wind', field: 'worldAndFoliage' as const, fpsDelta: 0.9 },
  { msg: 'feat(gi): enable cascaded shadow map fallback for RDNA3/Ada parity', field: 'lightingAndShaders' as const, fpsDelta: 1.2 },
  { msg: 'perf(mem): compact streaming geometry heap and cut VRAM copies', field: 'bootAndRender' as const, fpsDelta: 1.8 },
  { msg: 'fix(audio): resolve XAudio2 ring-buffer underrun during vehicle chase', field: 'audioAndPhysics' as const, fpsDelta: 0.5 },
  { msg: 'refactor(dx12): batch PSO compilation queue to reduce shader stutter', field: 'framePacingAndStability' as const, fpsDelta: 1.6 },
  { msg: 'fix(rt): clamp specular denoiser NaNs on wet asphalt surfaces', field: 'lightingAndShaders' as const, fpsDelta: 0.8 },
  { msg: 'feat(loader): stream coastal sector LODs without blocking main thread', field: 'worldAndFoliage' as const, fpsDelta: 1.1 },
];

export interface SimulationTickResult {
  updatedRepos: TrackedRepo[];
  events: FeedEvent[];
  leadChanged: boolean;
  newLeader: TrackedRepo | null;
}

/**
 * Generates an optional offline test simulation tick ONLY when the user explicitly toggles Simulation Mode ON.
 */
export function createSimulationTick(
  repos: TrackedRepo[],
  nowIso: string,
  seedRandom?: number
): SimulationTickResult {
  if (repos.length === 0) {
    return { updatedRepos: [], events: [], leadChanged: false, newLeader: null };
  }

  const rand = seedRandom !== undefined ? seedRandom : Math.random();
  const repoIdx = Math.floor(rand * repos.length) % repos.length;
  const tplIdx = Math.floor((rand * 997) % SIM_COMMIT_TEMPLATES.length);
  const template = SIM_COMMIT_TEMPLATES[tplIdx];

  const target = repos[repoIdx];
  const shortSha = Math.floor(0x1000000 + ((rand * 0xeffffff) % 0xeffffff))
    .toString(16)
    .slice(0, 7);

  const prevRanks = new Map(repos.map((r) => [r.id, r.rank]));
  const prevLeaderId = repos.find((r) => r.rank === 1)?.id ?? null;

  const baseMilestones = target.milestones ?? createEmptyMilestones();
  const limit = MILESTONE_LIMITS[template.field].max;
  const currentFieldVal = baseMilestones[template.field];
  const scoreBump = currentFieldVal < limit ? 1 : 0;

  const nextMilestones: MilestoneScores = {
    ...baseMilestones,
    [template.field]: Math.min(limit, currentFieldVal + scoreBump),
  };

  const nextScore = calculatePlayabilityScore(nextMilestones) ?? 0;
  const baseFps = target.avgFps ?? 10;
  const nextFps = Number(Math.min(120, baseFps + template.fpsDelta).toFixed(1));
  const baseLow = target.onePercentLowFps ?? baseFps * 0.65;
  const nextLowFps = Number(
    Math.min(nextFps - 1, Math.max(1, baseLow + template.fpsDelta * 0.72)).toFixed(1)
  );
  const nextRam =
    target.ramFootprintGb !== null
      ? Number(Math.max(8.2, target.ramFootprintGb - (scoreBump ? 0.1 : 0)).toFixed(1))
      : null;

  const newCommit = {
    sha: shortSha,
    message: template.msg,
    author: target.owner,
    timestamp: nowIso,
    url: `${target.htmlUrl}/commit/${shortSha}`,
  };

  const nextVelocity = target.commitVelocity14d
    ? [...target.commitVelocity14d]
    : Array<number>(14).fill(0);
  nextVelocity[nextVelocity.length - 1] += 1;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const nowDate = new Date(nowIso);
  const dateKey = nowIso.slice(0, 10);
  const dateLabel = `${monthNames[nowDate.getUTCMonth()]} ${nowDate.getUTCDate()}`;
  const nextHistory = [...target.history14d];
  if (nextHistory.length > 0 && nextHistory[nextHistory.length - 1].date === dateKey) {
    nextHistory[nextHistory.length - 1] = {
      ...nextHistory[nextHistory.length - 1],
      score: nextScore,
      avgFps: nextFps,
    };
  } else {
    nextHistory.push({ date: dateKey, label: dateLabel, score: nextScore, avgFps: nextFps });
  }

  const mutated = repos.map((r, i) => {
    if (i !== repoIdx) return r;
    return {
      ...r,
      milestones: nextMilestones,
      playabilityScore: nextScore,
      avgFps: nextFps,
      onePercentLowFps: nextLowFps,
      ramFootprintGb: nextRam,
      stars: r.stars !== null ? r.stars + (rand > 0.5 ? 2 : 1) : r.stars,
      latestCommit: newCommit,
      recentCommits: [newCommit, ...r.recentCommits].slice(0, 12),
      commitVelocity14d: nextVelocity,
      history14d: nextHistory.slice(-14),
      lastSyncedAt: nowIso,
    };
  });

  const { ranked, leadChanged, newLeader } = rankRepos(mutated, prevRanks, prevLeaderId);
  const events: FeedEvent[] = [];

  events.push({
    id: `evt-commit-${shortSha}-${Date.now()}`,
    type: 'commit',
    repoId: target.id,
    repoFullName: target.fullName,
    title: `[Sim] ${template.msg}`,
    detail: `Simulated commit by ${target.owner} on ${target.defaultBranch ?? 'main'}`,
    meta: shortSha,
    timestamp: nowIso,
  });

  if (scoreBump > 0 || template.fpsDelta >= 1.2) {
    events.push({
      id: `evt-bench-${shortSha}-${Date.now()}`,
      type: 'benchmark',
      repoId: target.id,
      repoFullName: target.fullName,
      title: `[Sim] Telemetry gain: ${nextFps.toFixed(1)} FPS · ${nextScore}% playability`,
      detail: `${MILESTONE_LIMITS[template.field].label} ${scoreBump > 0 ? `+${scoreBump} pts` : 'verified'} (+${template.fpsDelta.toFixed(1)} FPS)`,
      meta: `${nextFps.toFixed(1)} FPS`,
      timestamp: nowIso,
    });
  }

  if (leadChanged && newLeader) {
    events.push({
      id: `evt-lead-${newLeader.id}-${Date.now()}`,
      type: 'lead_change',
      repoId: newLeader.id,
      repoFullName: newLeader.fullName,
      title: `${newLeader.fullName} overtakes Rank #1`,
      detail: `New race leader at ${newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'N/A'} playability`,
      meta: newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'N/A',
      timestamp: nowIso,
    });
  }

  return {
    updatedRepos: ranked,
    events,
    leadChanged,
    newLeader,
  };
}

export function formatRelativeTime(isoTimestamp: string, nowMs: number = Date.now()): string {
  const ts = Date.parse(isoTimestamp);
  if (Number.isNaN(ts)) return 'N/A';

  const diffSec = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSec < 45) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function getGpuShortLabel(gpu: GpuTarget): string {
  switch (gpu) {
    case 'AMD RDNA3/4':
      return 'AMD RDNA3/4';
    case 'NVIDIA Ada/Blackwell':
      return 'NVIDIA Ada/BW';
    case 'Multi-Vendor / Vulkan':
      return 'Vulkan Multi';
  }
}
