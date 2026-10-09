import { describe, expect, it } from 'vitest';
import { computeBaseline } from '../../src/engine/baseline';
import { BASELINE_WINDOW } from '../../src/engine/config';
import { syntheticSleep, syntheticChecks } from '../../src/engine/scenarios';

const frozenAt = '2026-10-09T00:00:00.000Z';

describe('adopted DEMO fixture — scenario baseline acceptance only', () => {
  it.each(['reaction', 'go_no_go'] as const)('matches DEMO §1.2 oracle using explicit %s quality validation', (testKind) => {
    const result = computeBaseline(syntheticSleep, syntheticChecks, BASELINE_WINDOW, frozenAt, testKind);
    expect(result).not.toBeNull();
    if (result === null) throw new Error('Scenario baseline must be established.');
    // Independent oracle expressions from DEMO, never computed by the production helper.
    expect(Math.abs(result.sleepMeanHours - 50.5 / 7)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(result.midpointMeanMinutes - 1260 / 7)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(result.rtMeanMs - 1855 / 7)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(result.lapsesMean - 7 / 7)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(result.errorsMean - 9 / 7)).toBeLessThanOrEqual(1e-9);
    expect(result.validSleepNights).toBe(7);
    expect(result.validChecks).toBe(7);
    expect(result.window).toEqual([1, 7]);
    expect(result.frozenAt).toBe(frozenAt);
    // Required PLAN/SPEC display-target acceptance, without rounding source data.
    expect(Math.abs(result.sleepMeanHours - 7.214)).toBeLessThanOrEqual(0.001);
    expect(Math.abs(result.errorsMean - 1.286)).toBeLessThanOrEqual(0.001);
  });
  it('uses baseline days only and leaves the full source scenario unchanged', () => {
    const beforeSleep = structuredClone(syntheticSleep);
    const beforeChecks = structuredClone(syntheticChecks);
    const full = computeBaseline(syntheticSleep, syntheticChecks, BASELINE_WINDOW, frozenAt, 'reaction');
    const firstSeven = computeBaseline(syntheticSleep.slice(0, 7), syntheticChecks.slice(0, 7), BASELINE_WINDOW, frozenAt, 'reaction');
    expect(full).toEqual(firstSeven);
    expect(syntheticSleep).toEqual(beforeSleep);
    expect(syntheticChecks).toEqual(beforeChecks);
  });
  it('excludes later altered observations without changing the adopted fixture', () => {
    const sleep = syntheticSleep.map((row) => row.day > 7 ? { ...row, sleepHours: 2, midpointMinutes: 300 } : { ...row });
    const checks = syntheticChecks.map((row) => row.day !== null && row.day > 7 ? { ...row, medianRtMs: 900, lapses: 20, commissionErrors: 20 } : { ...row });
    expect(computeBaseline(sleep, checks, BASELINE_WINDOW, frozenAt, 'reaction')).toEqual(
      computeBaseline(syntheticSleep, syntheticChecks, BASELINE_WINDOW, frozenAt, 'reaction'),
    );
  });
  it('returns null with fewer than five adopted baseline nights or checks', () => {
    expect(computeBaseline(syntheticSleep.filter(({ day }) => day > 3), syntheticChecks, BASELINE_WINDOW, frozenAt, 'reaction')).toBeNull();
    expect(computeBaseline(syntheticSleep, syntheticChecks.filter(({ day }) => day !== null && day > 3), BASELINE_WINDOW, frozenAt, 'reaction')).toBeNull();
  });
});
