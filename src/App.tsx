import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AlertRule,
  ApiSettings,
  AppNotification,
  FeedEvent,
  GpuTarget,
  MilestoneScores,
  RateLimitInfo,
  RegressionItem,
  TrackedRepo,
} from './types/telemetry';
import {
  calculatePlayabilityScore,
  createSimulationTick,
  evaluateAlertRules,
  getGlobalStats,
  rankRepos,
} from './utils/telemetryLogic';
import {
  clearPersistedData,
  dispatchBrowserNotification,
  getBrowserNotificationPermission,
  loadPersistedFeed,
  loadPersistedNotifications,
  loadPersistedRepos,
  loadPersistedRules,
  loadPersistedSettings,
  requestBrowserNotificationPermission,
  savePersistedFeed,
  savePersistedNotifications,
  savePersistedRepos,
  savePersistedRules,
  savePersistedSettings,
  syncTrackedReposFromGithub,
  verifyGithubRepository,
} from './services/githubTelemetryService';
import {
  createInitialAlertRules,
  createInitialFeedEvents,
  createInitialRepos,
  DEFAULT_API_SETTINGS,
} from './data/seedData';
import { TopHeader } from './components/TopHeader';
import { HeroSection } from './components/HeroSection';
import { ProgressOverviewCard } from './components/ProgressOverviewCard';
import { LeaderboardSection } from './components/LeaderboardSection';
import { ProgressionChart } from './components/ProgressionChart';
import { LiveFeedPanel } from './components/LiveFeedPanel';
import { WatchlistAlertsPanel } from './components/WatchlistAlertsPanel';
import { ScoringMethodology } from './components/ScoringMethodology';
import { MilestoneDrawer } from './components/MilestoneDrawer';
import { AddRepoModal } from './components/AddRepoModal';
import { UpdateBenchmarkModal } from './components/UpdateBenchmarkModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { ToastContainer, type ToastItem } from './components/ToastContainer';

const THEME_STORAGE_KEY = 'portwatch_theme_v1';

function loadInitialTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore storage errors
  }
  return 'light';
}

function appendTodayHistorySnapshot(
  history: TrackedRepo['history14d'],
  score: number | null,
  avgFps: number | null,
  nowIso: string
): TrackedRepo['history14d'] {
  if (score === null && avgFps === null) return history;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = new Date(nowIso);
  const dateKey = nowIso.slice(0, 10);
  const label = `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
  const next = [...history];
  if (next.length > 0 && next[next.length - 1].date === dateKey) {
    next[next.length - 1] = {
      ...next[next.length - 1],
      score: score ?? next[next.length - 1].score,
      avgFps: avgFps ?? next[next.length - 1].avgFps,
    };
  } else {
    next.push({ date: dateKey, label, score, avgFps });
  }
  return next.slice(-14);
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadInitialTheme());
  const [repos, setRepos] = useState<TrackedRepo[]>(() => loadPersistedRepos());
  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>(() => loadPersistedFeed());
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => loadPersistedRules());
  const [settings, setSettings] = useState<ApiSettings>(() => loadPersistedSettings());
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    loadPersistedNotifications()
  );

  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => getBrowserNotificationPermission());

  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);
  const [isAddRepoOpen, setIsAddRepoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [benchmarkRepo, setBenchmarkRepo] = useState<TrackedRepo | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const reposRef = useRef(repos);
  reposRef.current = repos;
  const rulesRef = useRef(alertRules);
  rulesRef.current = alertRules;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const isSyncingRef = useRef(false);
  const hasCompletedInitialSyncRef = useRef(false);

  // Sync HTML .dark class with theme state
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    savePersistedRepos(repos);
  }, [repos]);

  useEffect(() => {
    savePersistedFeed(feedEvents);
  }, [feedEvents]);

  useEffect(() => {
    savePersistedRules(alertRules);
  }, [alertRules]);

  useEffect(() => {
    savePersistedSettings(settings);
  }, [settings]);

  useEffect(() => {
    savePersistedNotifications(notifications);
  }, [notifications]);

  const pushToastAndAlert = useCallback(
    (
      title: string,
      body: string,
      variant: 'emerald' | 'cyan' | 'amber',
      recordInNotificationCenter = true
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [{ id, title, body, variant }, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5500);

      if (recordInNotificationCenter) {
        const notif: AppNotification = {
          id: `notif-${id}`,
          title,
          body,
          variant,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications((prev) => [notif, ...prev].slice(0, 40));

        if (settingsRef.current.browserNotificationsEnabled) {
          dispatchBrowserNotification(`PortWatch Live: ${title}`, body);
        }
      }
    },
    []
  );

  const mergeFeedEvents = useCallback((incoming: FeedEvent[]) => {
    if (incoming.length === 0) return;
    setFeedEvents((prev) => {
      const seen = new Set(prev.map((e) => e.id));
      const uniqueIncoming = incoming.filter((e) => !seen.has(e.id));
      if (uniqueIncoming.length === 0) return prev;
      return [...uniqueIncoming, ...prev].slice(0, 80);
    });
  }, []);

  const applyAlertEvaluation = useCallback(
    (prevRepos: TrackedRepo[], nextRepos: TrackedRepo[], leadChanged: boolean) => {
      const matches = evaluateAlertRules(rulesRef.current, prevRepos, nextRepos, leadChanged);
      if (matches.length === 0) return;

      const nowIso = new Date().toISOString();
      const triggeredIds = new Set(matches.map((m) => m.rule.id));

      setAlertRules((prev) =>
        prev.map((r) =>
          triggeredIds.has(r.id)
            ? { ...r, triggeredCount: r.triggeredCount + 1, lastTriggeredAt: nowIso }
            : r
        )
      );

      const alertEvents: FeedEvent[] = matches.map((m, idx) => ({
        id: `evt-alert-${m.rule.id}-${Date.now()}-${idx}`,
        type: 'alert',
        repoId: m.repo.id,
        repoFullName: m.repo.fullName,
        title: `Alert Triggered: ${m.rule.label}`,
        detail: m.message,
        meta: m.repo.avgFps !== null ? `${m.repo.avgFps.toFixed(1)} FPS` : 'N/A',
        timestamp: nowIso,
      }));

      mergeFeedEvents(alertEvents);

      for (const match of matches) {
        pushToastAndAlert(
          match.rule.conditionType === 'new_leader' ? 'New Race Leader' : 'Custom Alert Triggered',
          match.message,
          match.rule.conditionType === 'new_leader' ? 'emerald' : 'amber',
          true
        );
      }
    },
    [mergeFeedEvents, pushToastAndAlert]
  );

  const runSimulationTick = useCallback(
    (manual = false) => {
      const prevRepos = reposRef.current;
      if (prevRepos.length === 0) return;

      const nowIso = new Date().toISOString();
      const result = createSimulationTick(prevRepos, nowIso);

      setRepos(result.updatedRepos);
      mergeFeedEvents(result.events);

      if (result.leadChanged && result.newLeader) {
        pushToastAndAlert(
          'Rank #1 Lead Change',
          `${result.newLeader.fullName} overtook Rank #1 at ${result.newLeader.playabilityScore ?? 'N/A'}% playability.`,
          'emerald',
          true
        );
      } else if (manual && result.events[0]) {
        pushToastAndAlert(
          'Simulated Tick Injected',
          `${result.events[0].repoFullName}: ${result.events[0].title}`,
          'amber',
          false
        );
      }

      applyAlertEvaluation(prevRepos, result.updatedRepos, result.leadChanged);
    },
    [applyAlertEvaluation, mergeFeedEvents, pushToastAndAlert]
  );

  const runGithubSync = useCallback(
    async (manual = false, isInitialHydration = false) => {
      if (isSyncingRef.current) return;
      const currentRepos = reposRef.current;
      if (currentRepos.length === 0) return;

      isSyncingRef.current = true;
      setIsSyncing(true);
      try {
        const result = await syncTrackedReposFromGithub(
          currentRepos,
          settingsRef.current.githubPat
        );

        if (result.rateLimit) {
          setRateLimit(result.rateLimit);
        }

        const prevRanks = isInitialHydration
          ? new Map<string, number>()
          : new Map(currentRepos.map((r) => [r.id, r.rank]));
        const prevLeaderId = isInitialHydration
          ? null
          : currentRepos.find((r) => r.rank === 1)?.id ?? null;

        const { ranked, leadChanged } = rankRepos(result.repos, prevRanks, prevLeaderId);

        setRepos(ranked);
        setLastSyncedAt(new Date().toISOString());
        mergeFeedEvents(result.newFeedEvents);

        if (!isInitialHydration) {
          applyAlertEvaluation(currentRepos, ranked, leadChanged);
        }

        hasCompletedInitialSyncRef.current = true;

        if (manual) {
          pushToastAndAlert(
            'GitHub Live Sync Complete',
            result.liveUpdatedCount > 0
              ? `Synced ${result.liveUpdatedCount} live repo(s)${result.errorCount > 0 ? `, ${result.errorCount} unavailable (N/A)` : ''}.`
              : `No tracked repos returned HTTP 200 (${result.errorCount} unavailable or rate-limited).`,
            result.liveUpdatedCount > 0 ? 'cyan' : 'amber',
            false
          );
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [applyAlertEvaluation, mergeFeedEvents, pushToastAndAlert]
  );

  useEffect(() => {
    if (settingsRef.current.simulationMode) return;
    if (hasCompletedInitialSyncRef.current) return;
    void runGithubSync(false, true);
  }, [runGithubSync]);

  useEffect(() => {
    if (!settings.simulationMode) return;
    let timeoutId: number;
    const scheduleNext = () => {
      const delayMs = 8000 + Math.floor(Math.random() * 4000);
      timeoutId = window.setTimeout(() => {
        runSimulationTick(false);
        scheduleNext();
      }, delayMs);
    };
    scheduleNext();
    return () => window.clearTimeout(timeoutId);
  }, [settings.simulationMode, runSimulationTick]);

  useEffect(() => {
    if (settings.simulationMode) return;
    const intervalId = window.setInterval(() => {
      void runGithubSync(false, false);
    }, settings.pollingIntervalSeconds * 1000);
    return () => window.clearInterval(intervalId);
  }, [settings.simulationMode, settings.pollingIntervalSeconds, runGithubSync]);

  const handleManualRefresh = () => {
    if (settings.simulationMode) {
      runSimulationTick(true);
    } else {
      void runGithubSync(true, false);
    }
  };

  const handleToggleSimulation = () => {
    setSettings((prev) => {
      const nextSim = !prev.simulationMode;
      pushToastAndAlert(
        nextSim ? 'Offline Simulation Enabled' : 'Live GitHub API Mode Active',
        nextSim
          ? 'Test mode active: injecting synthetic events every 8–12s.'
          : `Polling live api.github.com every ${prev.pollingIntervalSeconds}s.`,
        nextSim ? 'amber' : 'cyan',
        false
      );
      return { ...prev, simulationMode: nextSim };
    });
  };

  const handleToggleBrowserNotifications = async () => {
    if (browserPermission === 'unsupported') return;

    if (browserPermission === 'granted') {
      setSettings((prev) => ({
        ...prev,
        browserNotificationsEnabled: !prev.browserNotificationsEnabled,
      }));
      return;
    }

    const perm = await requestBrowserNotificationPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      setSettings((prev) => ({ ...prev, browserNotificationsEnabled: true }));
      pushToastAndAlert(
        'Browser Push Alerts Active',
        'Desktop notifications will fire on Rank #1 lead changes and triggered alert rules.',
        'emerald',
        false
      );
    }
  };

  const handleAddRepo = (newRepo: TrackedRepo) => {
    const prevRepos = reposRef.current;
    const prevRanks = new Map(prevRepos.map((r) => [r.id, r.rank]));
    const prevLeaderId = prevRepos.find((r) => r.rank === 1)?.id ?? null;

    const { ranked, leadChanged, newLeader } = rankRepos(
      [...prevRepos, newRepo],
      prevRanks,
      prevLeaderId
    );

    const addedRanked = ranked.find((r) => r.id === newRepo.id) ?? newRepo;
    const nowIso = new Date().toISOString();

    const scoreLabel = newRepo.playabilityScore !== null ? `${newRepo.playabilityScore}%` : 'N/A';
    const fpsLabel = newRepo.avgFps !== null ? `${newRepo.avgFps.toFixed(1)} FPS` : 'N/A';

    const newEvents: FeedEvent[] = [
      {
        id: `evt-new-${newRepo.id}-${Date.now()}`,
        type: 'new_repo',
        repoId: newRepo.id,
        repoFullName: newRepo.fullName,
        title: 'New Contender Joined the Race',
        detail: `Entered at Rank #${addedRanked.rank} (${newRepo.gpuTarget}) · Score: ${scoreLabel} · FPS: ${fpsLabel}.`,
        meta: `#${addedRanked.rank} · ${scoreLabel}`,
        timestamp: nowIso,
      },
    ];

    if (newRepo.latestCommit) {
      newEvents.push({
        id: `evt-gh-${newRepo.id}-${newRepo.latestCommit.sha}`,
        type: 'commit',
        repoId: newRepo.id,
        repoFullName: newRepo.fullName,
        title: newRepo.latestCommit.message,
        detail: `Committed by ${newRepo.latestCommit.author} on ${newRepo.defaultBranch ?? 'default'}`,
        meta: newRepo.latestCommit.sha,
        timestamp: newRepo.latestCommit.timestamp || nowIso,
      });
    }

    if (leadChanged && newLeader) {
      newEvents.unshift({
        id: `evt-lead-${newLeader.id}-${Date.now()}`,
        type: 'lead_change',
        repoId: newLeader.id,
        repoFullName: newLeader.fullName,
        title: `${newLeader.fullName} debuts at Rank #1`,
        detail: `Claimed top leaderboard position (${newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'by live stars'}).`,
        meta: newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'Rank #1',
        timestamp: nowIso,
      });
    }

    setRepos(ranked);
    mergeFeedEvents(newEvents);

    pushToastAndAlert(
      'New Contender Joined',
      `${newRepo.fullName} entered at Rank #${addedRanked.rank}.`,
      'emerald',
      true
    );

    applyAlertEvaluation(prevRepos, ranked, leadChanged);

    if (newRepo.syncStatus === 'pending') {
      void (async () => {
        const result = await verifyGithubRepository(
          newRepo.owner,
          newRepo.name,
          settingsRef.current.githubPat
        );
        if (result.rateLimit && result.rateLimit.remaining !== null) {
          setRateLimit(result.rateLimit);
        }
        const latest = reposRef.current;
        const patched = latest.map((r) => {
          if (r.id !== newRepo.id) return r;
          if (!result.ok) {
            return { ...r, syncStatus: 'error' as const, syncError: result.errorMessage };
          }
          return {
            ...r,
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
            latestCommit: result.latestCommit ?? null,
            recentCommits: result.recentCommits ?? [],
            commitVelocity14d: result.commitVelocity14d ?? null,
            lastSyncedAt: new Date().toISOString(),
            syncStatus: 'live' as const,
            syncError: undefined,
          };
        });
        const reRanked = rankRepos(
          patched,
          new Map(latest.map((r) => [r.id, r.rank])),
          latest.find((r) => r.rank === 1)?.id ?? null
        );
        setRepos(reRanked.ranked);
        if (result.ok && result.latestCommit) {
          mergeFeedEvents([
            {
              id: `evt-gh-${newRepo.id}-${result.latestCommit.sha}`,
              type: 'commit',
              repoId: newRepo.id,
              repoFullName: result.fullName,
              title: result.latestCommit.message,
              detail: `Committed by ${result.latestCommit.author} on ${result.defaultBranch ?? 'default'}`,
              meta: result.latestCommit.sha,
              timestamp: result.latestCommit.timestamp || new Date().toISOString(),
            },
          ]);
        }
      })();
    }
  };

  const handleUpdateMilestonesLive = (repoId: string, nextMilestones: MilestoneScores | null) => {
    const prevRepos = reposRef.current;
    const prevRanks = new Map(prevRepos.map((r) => [r.id, r.rank]));
    const prevLeaderId = prevRepos.find((r) => r.rank === 1)?.id ?? null;

    const nextScore = calculatePlayabilityScore(nextMilestones);
    const nowIso = new Date().toISOString();

    const mutated = prevRepos.map((r) => {
      if (r.id !== repoId) return r;
      const nextHistory =
        nextScore !== null
          ? appendTodayHistorySnapshot(r.history14d, nextScore, r.avgFps, nowIso)
          : r.history14d;
      return {
        ...r,
        milestones: nextMilestones,
        playabilityScore: nextScore,
        history14d: nextHistory,
      };
    });

    const { ranked, leadChanged, newLeader } = rankRepos(mutated, prevRanks, prevLeaderId);
    setRepos(ranked);

    if (leadChanged && newLeader) {
      mergeFeedEvents([
        {
          id: `evt-lead-${newLeader.id}-${Date.now()}`,
          type: 'lead_change',
          repoId: newLeader.id,
          repoFullName: newLeader.fullName,
          title: `${newLeader.fullName} overtakes Rank #1`,
          detail: `Milestone calibration updated score to ${newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'N/A'}.`,
          meta: newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'N/A',
          timestamp: nowIso,
        },
      ]);
      pushToastAndAlert(
        'Rank #1 Lead Change',
        `${newLeader.fullName} took Rank #1 (${newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'N/A'}).`,
        'emerald',
        true
      );
    }

    applyAlertEvaluation(prevRepos, ranked, leadChanged);
  };

  const handleSaveBenchmark = (
    repoId: string,
    payload: {
      gpuTarget: GpuTarget;
      avgFps: number | null;
      onePercentLowFps: number | null;
      ramFootprintGb: number | null;
      milestones: MilestoneScores | null;
      note: string;
    }
  ) => {
    const prevRepos = reposRef.current;
    const prevRanks = new Map(prevRepos.map((r) => [r.id, r.rank]));
    const prevLeaderId = prevRepos.find((r) => r.rank === 1)?.id ?? null;

    const nextScore = calculatePlayabilityScore(payload.milestones);
    const targetRepo = prevRepos.find((r) => r.id === repoId);
    if (!targetRepo) return;

    const nowIso = new Date().toISOString();

    const mutated = prevRepos.map((r) => {
      if (r.id !== repoId) return r;
      const nextHistory = appendTodayHistorySnapshot(
        r.history14d,
        nextScore,
        payload.avgFps,
        nowIso
      );
      return {
        ...r,
        gpuTarget: payload.gpuTarget,
        avgFps: payload.avgFps,
        onePercentLowFps: payload.onePercentLowFps,
        ramFootprintGb: payload.ramFootprintGb,
        milestones: payload.milestones,
        playabilityScore: nextScore,
        history14d: nextHistory,
      };
    });

    const { ranked, leadChanged, newLeader } = rankRepos(mutated, prevRanks, prevLeaderId);

    const fpsText = payload.avgFps !== null ? `${payload.avgFps.toFixed(1)} FPS avg` : 'FPS N/A';
    const lowText =
      payload.onePercentLowFps !== null
        ? `${payload.onePercentLowFps.toFixed(1)} 1% low`
        : '1% low N/A';
    const scoreText = nextScore !== null ? `${nextScore}%` : 'N/A';

    const newEvents: FeedEvent[] = [
      {
        id: `evt-bench-${repoId}-${Date.now()}`,
        type: 'benchmark',
        repoId,
        repoFullName: targetRepo.fullName,
        title: `Benchmark logged: ${fpsText} / ${lowText}`,
        detail: payload.note,
        meta: `${scoreText} · ${payload.avgFps !== null ? `${payload.avgFps.toFixed(1)} FPS` : 'N/A'}`,
        timestamp: nowIso,
      },
    ];

    if (leadChanged && newLeader) {
      newEvents.unshift({
        id: `evt-lead-${newLeader.id}-${Date.now()}`,
        type: 'lead_change',
        repoId: newLeader.id,
        repoFullName: newLeader.fullName,
        title: `${newLeader.fullName} overtakes Rank #1`,
        detail: `New leader at ${newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'N/A'} playability (${newLeader.avgFps !== null ? `${newLeader.avgFps.toFixed(1)} FPS` : 'FPS N/A'}).`,
        meta: newLeader.playabilityScore !== null ? `${newLeader.playabilityScore}%` : 'Rank #1',
        timestamp: nowIso,
      });
    }

    setRepos(ranked);
    mergeFeedEvents(newEvents);

    pushToastAndAlert(
      'Benchmark Saved',
      `${targetRepo.fullName}: ${fpsText} · ${scoreText} playability.`,
      'cyan',
      false
    );

    applyAlertEvaluation(prevRepos, ranked, leadChanged);
  };

  const handleRemoveRepo = (repoId: string) => {
    const prevRepos = reposRef.current;
    const removed = prevRepos.find((r) => r.id === repoId);
    if (!removed) return;

    const remaining = prevRepos.filter((r) => r.id !== repoId);
    const prevRanks = new Map(prevRepos.map((r) => [r.id, r.rank]));
    const { ranked } = rankRepos(remaining, prevRanks, prevRepos[0]?.id ?? null);

    setRepos(ranked);
    if (selectedRepoId === repoId) setSelectedRepoId(null);

    pushToastAndAlert(
      'Contender Removed',
      `${removed.fullName} removed from active telemetry tracking.`,
      'amber',
      false
    );
  };

  const handleToggleStar = (repoId: string) => {
    setRepos((prev) =>
      prev.map((r) => (r.id === repoId ? { ...r, starred: !r.starred } : r))
    );
  };

  const handleToggleRegressionResolved = (repoId: string, regressionId: string) => {
    setRepos((prev) =>
      prev.map((r) =>
        r.id !== repoId
          ? r
          : {
              ...r,
              regressions: r.regressions.map((reg) =>
                reg.id === regressionId ? { ...reg, resolved: !reg.resolved } : reg
              ),
            }
      )
    );
  };

  const handleAddRegression = (
    repoId: string,
    regression: Omit<RegressionItem, 'id' | 'reportedAt' | 'resolved'>
  ) => {
    setRepos((prev) =>
      prev.map((r) =>
        r.id !== repoId
          ? r
          : {
              ...r,
              regressions: [
                {
                  id: `reg-${Date.now()}`,
                  title: regression.title,
                  severity: regression.severity,
                  subsystem: regression.subsystem,
                  reportedAt: new Date().toISOString(),
                  resolved: false,
                },
                ...r.regressions,
              ],
            }
      )
    );
  };

  const handleAddRule = (ruleData: Omit<AlertRule, 'id' | 'triggeredCount'>) => {
    const newRule: AlertRule = {
      ...ruleData,
      id: `rule-${Date.now()}`,
      triggeredCount: 0,
    };
    setAlertRules((prev) => [newRule, ...prev]);
    pushToastAndAlert('Alert Rule Armed', newRule.label, 'amber', false);
  };

  const handleToggleRule = (ruleId: string) => {
    setAlertRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleDeleteRule = (ruleId: string) => {
    setAlertRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleSaveSettings = (patch: Partial<ApiSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    pushToastAndAlert(
      'API Settings Saved',
      `Polling interval set to ${patch.pollingIntervalSeconds ?? settings.pollingIntervalSeconds}s.`,
      'cyan',
      false
    );
    if (
      patch.githubPat !== undefined &&
      patch.githubPat !== settings.githubPat &&
      !settings.simulationMode
    ) {
      window.setTimeout(() => void runGithubSync(true, false), 100);
    }
  };

  const handleResetAllData = () => {
    clearPersistedData();
    const freshRepos = createInitialRepos();
    reposRef.current = freshRepos;
    setRepos(freshRepos);
    setFeedEvents(createInitialFeedEvents());
    setAlertRules(createInitialAlertRules());
    setSettings(DEFAULT_API_SETTINGS);
    setNotifications([]);
    setSelectedRepoId(null);
    hasCompletedInitialSyncRef.current = false;
    pushToastAndAlert(
      'Local Cache Cleared',
      'Cleared saved local data and re-syncing live metadata from GitHub.',
      'cyan',
      false
    );
    window.setTimeout(() => void runGithubSync(false, true), 50);
  };

  const globalStats = useMemo(() => getGlobalStats(repos), [repos]);
  const selectedRepo = useMemo(
    () => repos.find((r) => r.id === selectedRepoId) ?? null,
    [repos, selectedRepoId]
  );
  const existingRepoIds = useMemo(() => new Set(repos.map((r) => r.id)), [repos]);

  return (
    <div className="min-h-screen bg-[#F6F7FA] dark:bg-[#0B0E14] text-[#0D0E14] dark:text-slate-100 flex flex-col transition-colors">
      <TopHeader
        theme={theme}
        settings={settings}
        rateLimit={rateLimit}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        notifications={notifications}
        browserPermission={browserPermission}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onOpenAddRepo={() => setIsAddRepoOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onManualRefresh={handleManualRefresh}
        onToggleBrowserNotifications={() => void handleToggleBrowserNotifications()}
        onMarkAllNotificationsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearNotifications={() => setNotifications([])}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-16 space-y-10">
        {/* Hero Banner + Overlapping Master Progress Showcase Card */}
        <div>
          <HeroSection
            stats={globalStats}
            repos={repos}
            settings={settings}
            rateLimit={rateLimit}
            isSyncing={isSyncing}
            onToggleSimulation={handleToggleSimulation}
            onManualRefresh={handleManualRefresh}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <ProgressOverviewCard
            stats={globalStats}
            repos={repos}
            onSelectRepo={setSelectedRepoId}
          />
        </div>

        {/* Horizontal "What Changed" Live Commit & Telemetry Strip */}
        <LiveFeedPanel events={feedEvents} onSelectRepo={setSelectedRepoId} />

        {/* Editorial Race Leaderboard Cards */}
        <LeaderboardSection
          repos={repos}
          selectedRepoId={selectedRepoId}
          onSelectRepo={setSelectedRepoId}
          onToggleStar={handleToggleStar}
          onOpenUpdateBenchmark={(repo) => setBenchmarkRepo(repo)}
          onRemoveRepo={handleRemoveRepo}
          onOpenAddRepo={() => setIsAddRepoOpen(true)}
        />

        {/* Progression History + Watchlist & Alert Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-stretch">
          <ProgressionChart repos={repos} />

          <WatchlistAlertsPanel
            repos={repos}
            rules={alertRules}
            onSelectRepo={setSelectedRepoId}
            onToggleStar={handleToggleStar}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
            onAddRule={handleAddRule}
          />
        </div>

        {/* Transparent Scoring Methodology */}
        <ScoringMethodology />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-slate-200/80 dark:border-[#1E2636] bg-white/60 dark:bg-[#0D1119]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-display font-bold text-[#0D0E14] dark:text-white">
              PortWatch Live
            </span>{' '}
            · Real-time GitHub developer race & compatibility tracker. No game files, keys, or synthetic benchmark scores are hosted here.
          </div>
          <div className="font-mono shrink-0">
            Live data: api.github.com
          </div>
        </div>
      </footer>

      {/* Interactive Milestone Breakdown Drawer */}
      <MilestoneDrawer
        repo={selectedRepo}
        onClose={() => setSelectedRepoId(null)}
        onUpdateMilestones={handleUpdateMilestonesLive}
        onToggleStar={handleToggleStar}
        onOpenBenchmarkModal={(repo) => setBenchmarkRepo(repo)}
        onToggleRegressionResolved={handleToggleRegressionResolved}
        onAddRegression={handleAddRegression}
      />

      {/* Add Repository Modal */}
      <AddRepoModal
        isOpen={isAddRepoOpen}
        existingRepoIds={existingRepoIds}
        githubPat={settings.githubPat}
        onClose={() => setIsAddRepoOpen(false)}
        onRateLimitUpdate={setRateLimit}
        onAddRepo={handleAddRepo}
      />

      {/* Update Benchmark Modal */}
      <UpdateBenchmarkModal
        repo={benchmarkRepo}
        onClose={() => setBenchmarkRepo(null)}
        onSaveBenchmark={handleSaveBenchmark}
      />

      {/* GitHub API Settings Modal */}
      <ApiSettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        rateLimit={rateLimit}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onResetAllData={handleResetAllData}
      />

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
