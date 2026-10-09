import { describe, expect, it } from 'vitest';
import { computeBaseline } from '../../src/engine/baseline';
import { BASELINE_WINDOW } from '../../src/engine/config';
import type { BaselineWindow, CheckObservation, SleepObservation } from '../../src/engine/types';

// Hand-calculated unit-test fixture, NOT the official 17-day mission scenario.
// Sleep: 41.875 / 5 = 8.375 h; midpoint: 800 / 5 = 160 min;
// RT: 1215 / 5 = 243 ms; lapses: 11 / 5 = 2.2; errors: 7 / 5 = 1.4.
const sleepValues = [6.125, 7.25, 8.375, 9.5, 10.625];
const rtValues = [201, 222, 243, 264, 285];
const lapseValues = [0, 1, 2, 3, 5];
const errorValues = [1, 0, 4, 2, 0];
const fixtureSleep: SleepObservation[] = sleepValues.map((sleepHours, index) => ({
  day: index + 1, sleepHours, midpointMinutes: 100 + index * 30, source: 'synthetic', quality: 'good',
}));
const fixtureChecks: CheckObservation[] = rtValues.map((medianRtMs, index) => ({
  id: `baseline-unit-fixture-${index + 1}`, day: index + 1, timestamp: null,
  medianRtMs, lapses: lapseValues[index], commissionErrors: errorValues[index],
  falseStarts: 0, omissionErrors: 0, validTrials: 40, interruptions: 0, source: 'synthetic', quality: 'good',
}));
const frozenAt = '2026-10-09T00:00:00.000Z';

function baseline(sleep = fixtureSleep, checks = fixtureChecks, window: BaselineWindow = BASELINE_WINDOW) {
  return computeBaseline(sleep, checks, window, frozenAt, 'reaction');
}

describe('baseline calculation — hand-calculated unit-test fixtures only', () => {
  it('computes the independently stated means with exactly five eligible records', () => {
    const result = baseline();
    expect(result).not.toBeNull();
    expect(result?.sleepMeanHours).toBeCloseTo(8.375, 12);
    expect(result?.midpointMeanMinutes).toBeCloseTo(160, 12);
    expect(result?.rtMeanMs).toBeCloseTo(243, 12);
    expect(result?.lapsesMean).toBeCloseTo(2.2, 12);
    expect(result?.errorsMean).toBeCloseTo(1.4, 12);
    expect(result?.validSleepNights).toBe(5);
    expect(result?.validChecks).toBe(5);
    expect(result?.window).toEqual([1, 7]);
  });
  it('preserves the supplied timestamp exactly', () => {
    const suppliedTime = '2027-01-02T03:04:05.678Z';
    expect(computeBaseline(fixtureSleep, fixtureChecks, BASELINE_WINDOW, suppliedTime, 'reaction')?.frozenAt).toBe(suppliedTime);
  });
  it('returns null with only four valid sleep nights', () => {
    expect(baseline(fixtureSleep.slice(0, 4))).toBeNull();
  });
  it('returns null with only four valid checks', () => {
    expect(baseline(fixtureSleep, fixtureChecks.slice(0, 4))).toBeNull();
  });
  it('returns null for empty collections', () => {
    expect(baseline([], [])).toBeNull();
  });
  it.each(['poor', 'missing'] as const)('excludes %s observations even with usable measurements', (quality) => {
    const sleep = [...fixtureSleep, { ...fixtureSleep[0], day: 6, quality }];
    const checks = [...fixtureChecks, { ...fixtureChecks[0], day: 6, quality }];
    expect(baseline(sleep, checks)).toEqual(baseline());
    expect(baseline(fixtureSleep.map((row, index) => index === 0 ? { ...row, quality } : row))).toBeNull();
    expect(baseline(fixtureSleep, fixtureChecks.map((row, index) => index === 0 ? { ...row, quality } : row))).toBeNull();
  });
  it('excludes observations outside the supplied window', () => {
    const sleep = [...fixtureSleep, { ...fixtureSleep[0], day: 8, sleepHours: 14 }, { ...fixtureSleep[0], day: 0 }];
    const checks = [...fixtureChecks, { ...fixtureChecks[0], day: 8, medianRtMs: 900 }, { ...fixtureChecks[0], day: 0 }];
    expect(baseline(sleep, checks)).toEqual(baseline());
  });
  it('excludes live records, including incorrectly day-tagged live records', () => {
    const liveCheck = { ...fixtureChecks[0], source: 'live' as const, day: null, timestamp: frozenAt };
    expect(baseline(fixtureSleep, [...fixtureChecks, liveCheck, { ...liveCheck, day: 6 }])).toEqual(baseline());
    expect(baseline(fixtureSleep, [...fixtureChecks.slice(0, 4), liveCheck, { ...liveCheck, day: 5 }])).toBeNull();
    expect(baseline([...fixtureSleep.slice(0, 4), { ...fixtureSleep[4], source: 'live' }])).toBeNull();
  });
  it('excludes null-day checks even when marked synthetic', () => {
    expect(baseline(fixtureSleep, fixtureChecks.map((row, index) => index === 0 ? { ...row, day: null } : row))).toBeNull();
  });
  it.each(['sleepHours', 'midpointMinutes'] as const)('requires sleep metric %s rather than coercing null to zero', (field) => {
    expect(baseline(fixtureSleep.map((row, index) => index === 0 ? { ...row, [field]: null } : row))).toBeNull();
  });
  it.each(['medianRtMs', 'lapses', 'commissionErrors'] as const)('requires baseline check metric %s', (field) => {
    expect(baseline(fixtureSleep, fixtureChecks.map((row, index) => index === 0 ? { ...row, [field]: null } : row))).toBeNull();
  });
  it('excludes numerically invalid or low-quality records', () => {
    for (const invalid of [{ medianRtMs: NaN }, { lapses: -1 }, { commissionErrors: Infinity }, { validTrials: 19 }, { interruptions: 3 }, { falseStarts: 6 }]) {
      expect(baseline(fixtureSleep, fixtureChecks.map((row, index) => index === 0 ? { ...row, ...invalid } : row))).toBeNull();
    }
    expect(baseline(fixtureSleep.map((row, index) => index === 0 ? { ...row, sleepHours: 1.99 } : row))).toBeNull();
  });
  it('applies the explicitly supplied kind to the collection', () => {
    const checks = fixtureChecks.map((row) => ({ ...row, validTrials: 25 }));
    expect(computeBaseline(fixtureSleep, checks, BASELINE_WINDOW, frozenAt, 'reaction')).not.toBeNull();
    expect(computeBaseline(fixtureSleep, checks, BASELINE_WINDOW, frozenAt, 'go_no_go')).toBeNull();
  });
  it('accepts a supplied later window without rolling it automatically', () => {
    const sleep = fixtureSleep.map((row) => ({ ...row, day: row.day + 7 }));
    const checks = fixtureChecks.map((row) => ({ ...row, day: (row.day ?? 0) + 7 }));
    expect(baseline(sleep, checks)).toBeNull();
    expect(baseline(sleep, checks, [8, 12])).toEqual({ ...baseline(), window: [8, 12] });
  });
  it.each([[7, 1], [1, NaN], [-1, 7], [1.5, 7]] satisfies BaselineWindow[])('rejects invalid window [%s, %s]', (start, end) => {
    expect(baseline(fixtureSleep, fixtureChecks, [start, end])).toBeNull();
  });
  it('rejects duplicate eligible days instead of counting them as extra nights/checks', () => {
    expect(baseline([...fixtureSleep, { ...fixtureSleep[0] }])).toBeNull();
    expect(baseline(fixtureSleep, [...fixtureChecks, { ...fixtureChecks[0] }])).toBeNull();
  });
  it('preserves frozen input arrays, their records and the caller window', () => {
    const sleep = Object.freeze(fixtureSleep.map((row) => Object.freeze({ ...row })));
    const checks = Object.freeze(fixtureChecks.map((row) => Object.freeze({ ...row })));
    const window = Object.freeze([1, 7] as const);
    const before = { sleep: structuredClone(sleep), checks: structuredClone(checks), window: [...window] };
    const result = computeBaseline(sleep, checks, window, frozenAt, 'reaction');
    expect(result).not.toBeNull();
    expect({ sleep, checks, window }).toEqual(before);
    if (result) result.window[0] = 2;
    expect(window).toEqual([1, 7]);
  });
  it('leaves a previously returned baseline unchanged on subsequent calculations', () => {
    const original = baseline();
    const snapshot = structuredClone(original);
    const changed = baseline(fixtureSleep.map((row) => ({ ...row, sleepHours: 12 })));
    expect(changed?.sleepMeanHours).toBeCloseTo(12, 12);
    expect(original).toEqual(snapshot);
  });
});
