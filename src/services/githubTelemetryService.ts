import type {
  AlertRule,
  ApiSettings,
  AppNotification,
  CommitInfo,
  FeedEvent,
  GithubRepoVerificationResult,
  RateLimitInfo,
  TrackedRepo,
} from '../types/telemetry';
import {
  createInitialAlertRules,
  createInitialFeedEvents,
  createInitialRepos,
  DEFAULT_API_SETTINGS,
} from '../data/seedData';

import { computeCommitVelocity14d } from '../utils/telemetryLogic';

const STORAGE_KEYS = {
  REPOS: 'portwatch_live_repos_v3',
  FEED: 'portwatch_live_feed_v3',
  RULES: 'portwatch_live_rules_v3',
  SETTINGS: 'portwatch_live_settings_v3',
  NOTIFICATIONS: 'portwatch_live_notifications_v3',
} as const;

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadPersistedRepos(): TrackedRepo[] {
  if (typeof window === 'undefined') return createInitialRepos();
  const parsed = safeJsonParse<TrackedRepo[] | null>(
    window.localStorage.getItem(STORAGE_KEYS.REPOS),
    null
  );
  if (!Array.isArray(parsed)) {
    return createInitialRepos();
  }
  return parsed;
}

export function savePersistedRepos(repos: TrackedRepo[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.REPOS, JSON.stringify(repos));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function loadPersistedFeed(): FeedEvent[] {
  if (typeof window === 'undefined') return createInitialFeedEvents();
  const parsed = safeJsonParse<FeedEvent[] | null>(
    window.localStorage.getItem(STORAGE_KEYS.FEED),
    null
  );
  if (!Array.isArray(parsed)) return createInitialFeedEvents();
  return parsed;
}

export function savePersistedFeed(events: FeedEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(events.slice(0, 80)));
  } catch {
    // Ignore
  }
}

export function loadPersistedRules(): AlertRule[] {
  if (typeof window === 'undefined') return createInitialAlertRules();
  const parsed = safeJsonParse<AlertRule[] | null>(
    window.localStorage.getItem(STORAGE_KEYS.RULES),
    null
  );
  if (!Array.isArray(parsed)) return createInitialAlertRules();
  return parsed;
}

export function savePersistedRules(rules: AlertRule[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  } catch {
    // Ignore
  }
}

export function loadPersistedSettings(): ApiSettings {
  if (typeof window === 'undefined') return DEFAULT_API_SETTINGS;
  const parsed = safeJsonParse<Partial<ApiSettings> | null>(
    window.localStorage.getItem(STORAGE_KEYS.SETTINGS),
    null
  );
  if (!parsed) return DEFAULT_API_SETTINGS;
  return {
    ...DEFAULT_API_SETTINGS,
    ...parsed,
  };
}

export function savePersistedSettings(settings: ApiSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function loadPersistedNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  const parsed = safeJsonParse<AppNotification[] | null>(
    window.localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
    null
  );
  return Array.isArray(parsed) ? parsed : [];
}

export function savePersistedNotifications(notifications: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      STORAGE_KEYS.NOTIFICATIONS,
      JSON.stringify(notifications.slice(0, 40))
    );
  } catch {
    // Ignore
  }
}

export function clearPersistedData(): void {
  if (typeof window === 'undefined') return;
  Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}

function buildGithubHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  const trimmed = token?.trim();
  if (trimmed) {
    headers.Authorization = `Bearer ${trimmed}`;
  }
  return headers;
}

export function extractRateLimit(response: Response): RateLimitInfo {
  const remainingHeader = response.headers.get('X-RateLimit-Remaining');
  const limitHeader = response.headers.get('X-RateLimit-Limit');
  const resetHeader = response.headers.get('X-RateLimit-Reset');

  return {
    remaining: remainingHeader !== null ? Number(remainingHeader) : null,
    limit: limitHeader !== null ? Number(limitHeader) : null,
    resetAt: resetHeader !== null ? Number(resetHeader) : null,
  };
}

function classifyGithubError(status: number, bodyMessage?: string): string {
  const lower = (bodyMessage ?? '').toLowerCase();
  if (status === 451 || lower.includes('dmca') || lower.includes('blocked')) {
    return 'HTTP 451 · Unavailable (DMCA / legal block)';
  }
  if (status === 404) {
    return 'HTTP 404 · Not found or private';
  }
  if (status === 401) {
    return 'HTTP 401 · Invalid GitHub token';
  }
  if (status === 403) {
    if (lower.includes('rate limit')) {
      return 'HTTP 403 · GitHub rate limit exceeded (add PAT in API Settings)';
    }
    return 'HTTP 403 · Access forbidden';
  }
  return bodyMessage || `HTTP ${status} · GitHub API error`;
}

/**
 * Fetches live repository metadata and recent commits from GitHub REST API.
 */
export async function verifyGithubRepository(
  owner: string,
  repo: string,
  token?: string
): Promise<GithubRepoVerificationResult> {
  const headers = buildGithubHeaders(token);
  const repoEndpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  try {
    const repoResp = await fetch(repoEndpoint, { headers });
    const rateLimit = extractRateLimit(repoResp);

    if (!repoResp.ok) {
      let bodyMsg: string | undefined;
      try {
        const errBody = (await repoResp.json()) as { message?: string };
        bodyMsg = errBody.message;
      } catch {
        // Ignore parse failure
      }
      return {
        ok: false,
        status: repoResp.status,
        owner,
        name: repo,
        fullName: `${owner}/${repo}`,
        description: null,
        stars: null,
        openIssues: null,
        defaultBranch: null,
        avatarUrl: '',
        htmlUrl: `https://github.com/${owner}/${repo}`,
        errorMessage: classifyGithubError(repoResp.status, bodyMsg),
        rateLimit,
      };
    }

    const repoData = (await repoResp.json()) as {
      name: string;
      full_name: string;
      description: string | null;
      stargazers_count: number;
      forks_count?: number;
      license?: { spdx_id?: string | null } | null;
      open_issues_count: number;
      default_branch: string;
      html_url: string;
      owner?: { login?: string; avatar_url?: string };
    };

    let recentCommits: CommitInfo[] = [];
    let commitVelocity14d: number[] | undefined;
    let finalRateLimit = rateLimit;

    if (rateLimit.remaining === null || rateLimit.remaining > 0) {
      try {
        const commitsEndpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=30`;
        const commitsResp = await fetch(commitsEndpoint, { headers });
        finalRateLimit = extractRateLimit(commitsResp);

        if (commitsResp.ok) {
          const rawCommits = (await commitsResp.json()) as Array<{
            sha: string;
            html_url?: string;
            commit?: {
              message?: string;
              author?: { name?: string; date?: string };
            };
            author?: { login?: string };
          }>;
          const allCommits = rawCommits.map((c) => ({
            sha: c.sha.slice(0, 7),
            message: (c.commit?.message ?? 'No commit message').split('\n')[0],
            author: c.author?.login ?? c.commit?.author?.name ?? owner,
            timestamp: c.commit?.author?.date ?? '',
            url: c.html_url,
          }));
          commitVelocity14d = computeCommitVelocity14d(allCommits);
          recentCommits = allCommits.slice(0, 10);
        }
      } catch {
        // Commits endpoint failure leaves commit data empty (N/A)
      }
    }

    return {
      ok: true,
      status: repoResp.status,
      owner: repoData.owner?.login ?? owner,
      name: repoData.name ?? repo,
      fullName: repoData.full_name ?? `${owner}/${repo}`,
      description: repoData.description ?? null,
      stars: typeof repoData.stargazers_count === 'number' ? repoData.stargazers_count : null,
      forks: typeof repoData.forks_count === 'number' ? repoData.forks_count : null,
      license: repoData.license?.spdx_id && repoData.license.spdx_id !== 'NOASSERTION' ? repoData.license.spdx_id : null,
      openIssues: typeof repoData.open_issues_count === 'number' ? repoData.open_issues_count : null,
      defaultBranch: repoData.default_branch ?? null,
      avatarUrl: repoData.owner?.avatar_url ?? '',
      htmlUrl: repoData.html_url ?? `https://github.com/${owner}/${repo}`,
      latestCommit: recentCommits[0],
      recentCommits,
      commitVelocity14d,
      rateLimit: finalRateLimit,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
      description: null,
      stars: null,
      openIssues: null,
      defaultBranch: null,
      avatarUrl: '',
      htmlUrl: `https://github.com/${owner}/${repo}`,
      errorMessage: 'Network error reaching api.github.com',
    };
  }
}

export interface BatchSyncResult {
  repos: TrackedRepo[];
  newFeedEvents: FeedEvent[];
  rateLimit: RateLimitInfo | null;
  liveUpdatedCount: number;
  errorCount: number;
}

/**
 * Syncs all tracked repositories against live GitHub REST API in small parallel batches.
 * Never fabricates fallback metrics when a repo is unavailable or rate-limited.
 */
export async function syncTrackedReposFromGithub(
  repos: TrackedRepo[],
  token?: string
): Promise<BatchSyncResult> {
  let latestRateLimit: RateLimitInfo | null = null;
  let liveUpdatedCount = 0;
  let errorCount = 0;
  const newFeedEvents: FeedEvent[] = [];
  const updatedRepos: TrackedRepo[] = new Array(repos.length);

  const BATCH_SIZE = 4;
  for (let start = 0; start < repos.length; start += BATCH_SIZE) {
    const slice = repos.slice(start, start + BATCH_SIZE);

    if (latestRateLimit && latestRateLimit.remaining === 0) {
      for (let offset = 0; offset < slice.length; offset++) {
        const repo = slice[offset];
        errorCount++;
        updatedRepos[start + offset] = {
          ...repo,
          syncStatus: 'error',
          syncError: 'HTTP 403 · GitHub rate limit reached (add PAT in API Settings)',
        };
      }
      continue;
    }

    const results = await Promise.all(
      slice.map((repo) => verifyGithubRepository(repo.owner, repo.name, token))
    );

    for (let offset = 0; offset < results.length; offset++) {
      const result = results[offset];
      const repo = slice[offset];
      if (result.rateLimit && result.rateLimit.remaining !== null) {
        if (
          !latestRateLimit ||
          latestRateLimit.remaining === null ||
          result.rateLimit.remaining < latestRateLimit.remaining
        ) {
          latestRateLimit = result.rateLimit;
        }
      }

      if (result.ok) {
        liveUpdatedCount++;
        const incomingCommit = result.latestCommit ?? null;
        const isNewCommit = Boolean(
          incomingCommit && incomingCommit.sha !== repo.latestCommit?.sha
        );

        if (isNewCommit && incomingCommit) {
          newFeedEvents.push({
            id: `evt-gh-${repo.id}-${incomingCommit.sha}`,
            type: 'commit',
            repoId: repo.id,
            repoFullName: result.fullName,
            title: incomingCommit.message,
            detail: `Committed by ${incomingCommit.author} on ${result.defaultBranch ?? 'default'}`,
            meta: incomingCommit.sha,
            timestamp: incomingCommit.timestamp || new Date().toISOString(),
          });
        }

        updatedRepos[start + offset] = {
          ...repo,
          owner: result.owner,
          name: result.name,
          fullName: result.fullName,
          description: result.description,
          stars: result.stars,
          forks: result.forks ?? null,
          license: result.license ?? null,
          openIssues: result.openIssues,
          defaultBranch: result.defaultBranch,
          avatarUrl: result.avatarUrl,
          htmlUrl: result.htmlUrl,
          latestCommit: incomingCommit,
          recentCommits: result.recentCommits ?? [],
          commitVelocity14d: result.commitVelocity14d ?? null,
          lastSyncedAt: new Date().toISOString(),
          syncStatus: 'live',
          syncError: undefined,
        };
      } else {
        errorCount++;
        updatedRepos[start + offset] = {
          ...repo,
          syncStatus: 'error',
          syncError: result.errorMessage,
        };
      }
    }
  }

  // Sort newly discovered real commits newest-first
  newFeedEvents.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  return {
    repos: updatedRepos,
    newFeedEvents,
    rateLimit: latestRateLimit,
    liveUpdatedCount,
    errorCount,
  };
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    return await window.Notification.requestPermission();
  } catch {
    return window.Notification.permission;
  }
}

export function dispatchBrowserNotification(title: string, body: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;
  try {
    new window.Notification(title, { body });
  } catch {
    // Ignore in restricted iframe sandboxes
  }
}
