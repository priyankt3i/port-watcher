import type { AlertRule, ApiSettings, FeedEvent, GpuTarget, TrackedRepo } from '../types/telemetry';
import { rankRepos } from '../utils/telemetryLogic';

interface TrackedRepoTarget {
  owner: string;
  name: string;
  gpuTarget: GpuTarget;
}

/**
 * Watchlist of GitHub repository identifiers to track live via api.github.com.
 * Contains NO fake or seeded telemetry numbers — all GitHub metadata is fetched live,
 * and unmeasured benchmark fields (FPS, RAM, playability score) remain null (N/A)
 * until real data is logged.
 */
const DEFAULT_TRACKED_TARGETS: TrackedRepoTarget[] = [
  { owner: 'Marvisak', name: 'VIctory', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'AvatarManz', name: 'VIctory-7900XTX', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'Belobug', name: 'VIctory-Belobug-AMD', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'DexNom', name: 'VIctory', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'Zettrox', name: 'ztrx', gpuTarget: 'NVIDIA Ada/Blackwell' },
  { owner: 'fxceless', name: 'victory-fork', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'xcl-dev', name: 'xcl', gpuTarget: 'Multi-Vendor / Vulkan' },
  { owner: 'ZigZagBoi1', name: 'ScarlettPort', gpuTarget: 'Multi-Vendor / Vulkan' },
  { owner: 'ubiquitarianism', name: 'leonida', gpuTarget: 'Multi-Vendor / Vulkan' },
  { owner: 'DexNom', name: 'VIctory-RDNA3', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'Belobug', name: 'ViceLayer-DX12', gpuTarget: 'Multi-Vendor / Vulkan' },
  { owner: 'Doomsday', name: 'Project-Leonida', gpuTarget: 'Multi-Vendor / Vulkan' },
  { owner: 'darkworldhm', name: 'VIctory-Base', gpuTarget: 'AMD RDNA3/4' },
  { owner: 'ZETTROX', name: 'NV-Translate', gpuTarget: 'NVIDIA Ada/Blackwell' },
];

export function createInitialRepos(): TrackedRepo[] {
  const nowIso = new Date().toISOString();
  const emptyTargets: TrackedRepo[] = DEFAULT_TRACKED_TARGETS.map((target, idx) => {
    const fullName = `${target.owner}/${target.name}`;
    return {
      id: fullName.toLowerCase(),
      owner: target.owner,
      name: target.name,
      fullName,
      description: null,
      avatarUrl: '',
      htmlUrl: `https://github.com/${fullName}`,
      defaultBranch: null,
      gpuTarget: target.gpuTarget,
      milestones: null,
      playabilityScore: null,
      avgFps: null,
      onePercentLowFps: null,
      ramFootprintGb: null,
      stars: null,
      openIssues: null,
      latestCommit: null,
      recentCommits: [],
      commitVelocity14d: null,
      regressions: [],
      history14d: [],
      rank: idx + 1,
      rankDelta: 0,
      starred: false,
      addedAt: nowIso,
      syncStatus: 'pending',
    };
  });

  return rankRepos(emptyTargets, new Map(), null).ranked;
}

export function createInitialFeedEvents(): FeedEvent[] {
  return [];
}

export function createInitialAlertRules(): AlertRule[] {
  return [
    {
      id: 'rule-default-leader',
      label: 'Alert on any New Rank #1 Leader',
      conditionType: 'new_leader',
      enabled: true,
      triggeredCount: 0,
    },
    {
      id: 'rule-default-nvidia-fps',
      label: 'Notify when any NVIDIA repo exceeds 15 FPS',
      conditionType: 'gpu_fps_gt',
      gpuTarget: 'NVIDIA Ada/Blackwell',
      threshold: 15,
      enabled: true,
      triggeredCount: 0,
    },
    {
      id: 'rule-default-amd-80',
      label: 'Notify when any AMD RDNA3/4 repo exceeds 80% score',
      conditionType: 'gpu_score_gt',
      gpuTarget: 'AMD RDNA3/4',
      threshold: 80,
      enabled: true,
      triggeredCount: 0,
    },
  ];
}

export const DEFAULT_API_SETTINGS: ApiSettings = {
  githubPat: '',
  pollingIntervalSeconds: 60,
  simulationMode: false,
  browserNotificationsEnabled: false,
};
