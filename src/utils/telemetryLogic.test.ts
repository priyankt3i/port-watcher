import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlayabilityScore,
  computeCommitVelocity14d,
  createSimulationTick,
  evaluateAlertRules,
  formatRelativeTime,
  getGlobalStats,
  parseRepoInput,
  rankRepos,
} from './telemetryLogic';
import type { AlertRule, TrackedRepo } from '../types/telemetry';

function makeRepo(overrides: Partial<TrackedRepo> & { id: string; fullName: string }): TrackedRepo {
  const [owner, name] = overrides.fullName.split('/');
  const milestones = overrides.milestones !== undefined
    ? overrides.milestones
    : {
        bootAndRender: 30,
        worldAndFoliage: 8,
        lightingAndShaders: 8,
        audioAndPhysics: 5,
        framePacingAndStability: 5,
      };
  return {
    id: overrides.id,
    owner,
    name,
    fullName: overrides.fullName,
    description: overrides.description !== undefined ? overrides.description : 'Test repo',
    avatarUrl: '',
    htmlUrl: `https://github.com/${overrides.fullName}`,
    defaultBranch: overrides.defaultBranch !== undefined ? overrides.defaultBranch : 'main',
    gpuTarget: overrides.gpuTarget ?? 'AMD RDNA3/4',
    milestones,
    playabilityScore: calculatePlayabilityScore(milestones),
    avgFps: overrides.avgFps !== undefined ? overrides.avgFps : 20,
    onePercentLowFps: overrides.onePercentLowFps !== undefined ? overrides.onePercentLowFps : 14,
    ramFootprintGb: overrides.ramFootprintGb !== undefined ? overrides.ramFootprintGb : 16,
    stars: overrides.stars !== undefined ? overrides.stars : 100,
    openIssues: overrides.openIssues !== undefined ? overrides.openIssues : 12,
    latestCommit:
      overrides.latestCommit !== undefined
        ? overrides.latestCommit
        : {
            sha: 'abc1234',
            message: 'init',
            author: owner,
            timestamp: '2026-11-25T15:00:00Z',
          },
    recentCommits: overrides.recentCommits ?? [],
    commitVelocity14d: overrides.commitVelocity14d !== undefined ? overrides.commitVelocity14d : Array(14).fill(2),
    regressions: [],
    history14d: overrides.history14d ?? [{ date: '2026-11-25', label: 'Nov 25', score: 56, avgFps: 20 }],
    rank: overrides.rank ?? 1,
    rankDelta: overrides.rankDelta ?? 0,
    starred: overrides.starred ?? false,
    addedAt: '2026-11-10T00:00:00Z',
    syncStatus: overrides.syncStatus ?? 'live',
  };
}

test('parseRepoInput accepts full GitHub URLs and owner/repo shorthand', () => {
  assert.deepEqual(parseRepoInput('https://github.com/AvatarManz/VIctory-7900XTX'), {
    owner: 'AvatarManz',
    repo: 'VIctory-7900XTX',
    fullName: 'AvatarManz/VIctory-7900XTX',
    id: 'avatarmanz/victory-7900xtx',
  });

  assert.deepEqual(parseRepoInput('  ZETTROX/NV-Translate.git/  '), {
    owner: 'ZETTROX',
    repo: 'NV-Translate',
    fullName: 'ZETTROX/NV-Translate',
    id: 'zettrox/nv-translate',
  });

  assert.equal(parseRepoInput(''), null);
  assert.equal(parseRepoInput('just-one-segment'), null);
  assert.equal(parseRepoInput('https://gitlab.com/owner/repo'), null);
});

test('calculatePlayabilityScore sums, clamps, and returns null when unbenchmarked', () => {
  assert.equal(calculatePlayabilityScore(null), null);
  assert.equal(
    calculatePlayabilityScore({
      bootAndRender: 45,
      worldAndFoliage: 12,
      lightingAndShaders: 10,
      audioAndPhysics: 7,
      framePacingAndStability: 6,
    }),
    80
  );

  // Clamps above max and below zero
  assert.equal(
    calculatePlayabilityScore({
      bootAndRender: 99,
      worldAndFoliage: -5,
      lightingAndShaders: 20,
      audioAndPhysics: 10,
      framePacingAndStability: 10,
    }),
    85
  );
});

test('rankRepos orders measured repos ahead of null N/A repos and falls back to live stars', () => {
  const unmeasuredHighStars = makeRepo({
    id: 'c/stars',
    fullName: 'c/stars',
    rank: 1,
    milestones: null,
    avgFps: null,
    stars: 500,
  });
  const unmeasuredLowStars = makeRepo({
    id: 'd/low',
    fullName: 'd/low',
    rank: 2,
    milestones: null,
    avgFps: null,
    stars: 10,
  });
  const measured = makeRepo({
    id: 'b/two',
    fullName: 'b/two',
    rank: 3,
    avgFps: 30,
    stars: 5,
    milestones: { bootAndRender: 40, worldAndFoliage: 10, lightingAndShaders: 10, audioAndPhysics: 6, framePacingAndStability: 6 },
  });

  const { ranked, leadChanged, newLeader } = rankRepos([unmeasuredHighStars, unmeasuredLowStars, measured]);
  assert.equal(leadChanged, true);
  assert.equal(newLeader?.id, 'b/two');
  assert.equal(ranked[0].id, 'b/two');
  assert.equal(ranked[1].id, 'c/stars');
  assert.equal(ranked[2].id, 'd/low');
});

test('evaluateAlertRules fires on NVIDIA > 15 FPS crossing and ignores null N/A values', () => {
  const unmeasuredNv = makeRepo({
    id: 'zettrox/ztrx',
    fullName: 'Zettrox/ztrx',
    gpuTarget: 'NVIDIA Ada/Blackwell',
    avgFps: null,
    milestones: null,
    rank: 2,
  });
  const measuredNv = makeRepo({
    id: 'zettrox/ztrx',
    fullName: 'Zettrox/ztrx',
    gpuTarget: 'NVIDIA Ada/Blackwell',
    avgFps: 18.6,
    rank: 1,
  });

  const rules: AlertRule[] = [
    {
      id: 'rule-nv',
      label: 'NVIDIA exceeds 15 FPS',
      conditionType: 'gpu_fps_gt',
      gpuTarget: 'NVIDIA Ada/Blackwell',
      threshold: 15,
      enabled: true,
      triggeredCount: 0,
    },
    {
      id: 'rule-lead',
      label: 'Any New Leader',
      conditionType: 'new_leader',
      enabled: true,
      triggeredCount: 0,
    },
  ];

  // Null values should never trigger FPS rules
  assert.equal(evaluateAlertRules(rules, [unmeasuredNv], [unmeasuredNv], false).length, 0);

  const matches = evaluateAlertRules(rules, [unmeasuredNv], [measuredNv], true);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].rule.id, 'rule-nv');
  assert.equal(matches[1].rule.id, 'rule-lead');

  // Re-evaluating with same FPS should NOT fire again
  assert.equal(evaluateAlertRules(rules, [measuredNv], [measuredNv], false).length, 0);
});

test('computeCommitVelocity14d buckets live commit timestamps accurately over 14 UTC days', () => {
  const nowMs = Date.parse('2026-11-25T16:00:00Z');
  const counts = computeCommitVelocity14d(
    [
      { timestamp: '2026-11-25T10:00:00Z' }, // today -> index 13
      { timestamp: '2026-11-25T01:00:00Z' }, // today -> index 13
      { timestamp: '2026-11-24T22:00:00Z' }, // 1d ago -> index 12
      { timestamp: '2026-11-12T12:00:00Z' }, // 13d ago -> index 0
      { timestamp: '2026-11-10T12:00:00Z' }, // 15d ago -> ignored
    ],
    nowMs
  );
  assert.equal(counts.length, 14);
  assert.equal(counts[13], 2);
  assert.equal(counts[12], 1);
  assert.equal(counts[0], 1);
  assert.equal(counts.reduce((a, b) => a + b, 0), 4);
});

test('createSimulationTick works cleanly even when starting from null unbenchmarked repos', () => {
  const r1 = makeRepo({ id: 'a/one', fullName: 'a/one', rank: 1, avgFps: null, milestones: null, ramFootprintGb: null });
  const r2 = makeRepo({ id: 'b/two', fullName: 'b/two', rank: 2, avgFps: null, milestones: null, ramFootprintGb: null });

  const result = createSimulationTick([r1, r2], '2026-11-25T16:00:00Z', 0.1);
  assert.equal(result.updatedRepos.length, 2);
  assert.ok(result.events.length >= 1);
  const updatedA = result.updatedRepos.find((r) => r.id === 'a/one')!;
  assert.ok(updatedA.avgFps !== null && updatedA.avgFps > 10);
});

test('getGlobalStats returns null metrics when no benchmarks exist and accurate values when present', () => {
  const unmeasured = makeRepo({
    id: 'a/one',
    fullName: 'a/one',
    rank: 1,
    milestones: null,
    avgFps: null,
    stars: null,
    syncStatus: 'pending',
  });
  const emptyStats = getGlobalStats([unmeasured]);
  assert.equal(emptyStats.leaderFullName, null);
  assert.equal(emptyStats.highestScore, null);
  assert.equal(emptyStats.peakFps, null);
  assert.equal(emptyStats.activeReposCount, 1);

  const r1 = makeRepo({ id: 'a/one', fullName: 'a/one', rank: 1, avgFps: 28.4, gpuTarget: 'AMD RDNA3/4' });
  const r2 = makeRepo({ id: 'b/two', fullName: 'b/two', rank: 2, avgFps: 34.1, gpuTarget: 'NVIDIA Ada/Blackwell' });
  const stats = getGlobalStats([r1, r2]);
  assert.equal(stats.leaderFullName, 'a/one');
  assert.equal(stats.peakFps, 34.1);
  assert.equal(stats.peakFpsRepo, 'b/two');
  assert.equal(stats.activeReposCount, 2);

  const now = Date.parse('2026-11-25T16:00:00Z');
  assert.equal(formatRelativeTime('2026-11-25T15:59:30Z', now), 'just now');
  assert.equal(formatRelativeTime('2026-11-25T15:45:00Z', now), '15m ago');
  assert.equal(formatRelativeTime('2026-11-25T13:00:00Z', now), '3h ago');
});
