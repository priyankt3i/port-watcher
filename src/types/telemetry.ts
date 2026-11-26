export type GpuTarget =
  | 'AMD RDNA3/4'
  | 'NVIDIA Ada/Blackwell'
  | 'Multi-Vendor / Vulkan';

export interface MilestoneScores {
  bootAndRender: number; // 0-50
  worldAndFoliage: number; // 0-15
  lightingAndShaders: number; // 0-15
  audioAndPhysics: number; // 0-10
  framePacingAndStability: number; // 0-10
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  timestamp: string; // ISO string
  url?: string;
}

export interface RegressionItem {
  id: string;
  title: string;
  severity: 'warning' | 'critical';
  subsystem: string;
  reportedAt: string;
  resolved: boolean;
}

export interface HistoryPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Nov 25"
  score: number | null; // 0-100 or null
  avgFps: number | null;
}

export interface TrackedRepo {
  id: string; // normalized lowercase "owner/repo"
  owner: string;
  name: string;
  fullName: string; // display casing "owner/repo"
  description: string | null;
  avatarUrl: string;
  htmlUrl: string;
  defaultBranch: string | null;
  gpuTarget: GpuTarget;
  milestones: MilestoneScores | null;
  playabilityScore: number | null; // 0-100 computed sum, or null if not benchmarked
  avgFps: number | null;
  onePercentLowFps: number | null;
  ramFootprintGb: number | null;
  stars: number | null;
  forks?: number | null;
  license?: string | null;
  openIssues: number | null;
  latestCommit: CommitInfo | null;
  recentCommits: CommitInfo[];
  commitVelocity14d: number[] | null; // 14 daily commit counts computed from live GitHub commits
  regressions: RegressionItem[];
  history14d: HistoryPoint[];
  rank: number;
  rankDelta: number; // positive = moved up (e.g. +1), negative = moved down (-1), 0 = unchanged
  starred: boolean;
  addedAt: string;
  lastSyncedAt?: string;
  syncStatus: 'pending' | 'live' | 'error';
  syncError?: string;
}

export type FeedEventType =
  | 'lead_change'
  | 'commit'
  | 'new_repo'
  | 'benchmark'
  | 'alert';

export type FeedFilter = 'all' | 'lead_change' | 'commit' | 'new_repo' | 'benchmark';

export interface FeedEvent {
  id: string;
  type: FeedEventType;
  repoId: string;
  repoFullName: string;
  title: string;
  detail: string;
  meta?: string; // e.g. commit sha, "28.2 FPS", "Score 78%"
  timestamp: string;
}

export type AlertConditionType =
  | 'new_leader'
  | 'gpu_fps_gt'
  | 'gpu_score_gt'
  | 'repo_score_gt';

export interface AlertRule {
  id: string;
  label: string;
  conditionType: AlertConditionType;
  gpuTarget?: GpuTarget;
  repoId?: string;
  threshold?: number;
  enabled: boolean;
  triggeredCount: number;
  lastTriggeredAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  variant: 'emerald' | 'cyan' | 'amber';
  timestamp: string;
  read: boolean;
}

export type PollingIntervalSeconds = 30 | 60 | 300;

export interface ApiSettings {
  githubPat: string;
  pollingIntervalSeconds: PollingIntervalSeconds;
  simulationMode: boolean;
  browserNotificationsEnabled: boolean;
}

export interface RateLimitInfo {
  remaining: number | null;
  limit: number | null;
  resetAt: number | null; // Unix epoch seconds
}

export interface GithubRepoVerificationResult {
  ok: boolean;
  status: number;
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  stars: number | null;
  forks?: number | null;
  license?: string | null;
  openIssues: number | null;
  defaultBranch: string | null;
  avatarUrl: string;
  htmlUrl: string;
  latestCommit?: CommitInfo;
  recentCommits?: CommitInfo[];
  commitVelocity14d?: number[];
  errorMessage?: string;
  rateLimit?: RateLimitInfo;
}

export interface GlobalTelemetryStats {
  leaderFullName: string | null;
  leaderScore: number | null;
  leaderStars: number | null;
  leaderGpu: GpuTarget | null;
  highestScore: number | null;
  peakFps: number | null;
  peakFpsRepo: string | null;
  activeReposCount: number;
  liveSyncedCount: number;
  amdCount: number;
  nvidiaCount: number;
  vulkanCount: number;
}
