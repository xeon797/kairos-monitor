import { describe, expect, it } from 'vitest';
import { syntheticSleep, syntheticChecks, taskLibrary, missionSchedule } from '../../src/engine/scenarios';
import { isCheckValid, isSleepValid } from '../../src/engine/quality';

describe('adopted DEMO synthetic fixture — exact data only', () => {
  it('contains exactly 17 sleep and 17 check records with unique days 1–17', () => {
    const days = Array.from({ length: 17 }, (_, index) => index + 1);
    expect(syntheticSleep).toHaveLength(17);
    expect(syntheticChecks).toHaveLength(17);
    expect(syntheticSleep.map(({ day }) => day)).toEqual(days);
    expect(syntheticChecks.map(({ day }) => day)).toEqual(days);
    expect(new Set(syntheticSleep.map(({ day }) => day)).size).toBe(17);
    expect(new Set(syntheticChecks.map(({ day }) => day)).size).toBe(17);
    expect(new Set(syntheticChecks.map(({ id }) => id)).size).toBe(17);
  });
  it.each([
    { day: 1, sleepHours: 7.2, medianRtMs: 260, lapses: 1, commissionErrors: 1 },
    { day: 12, sleepHours: 5.4, medianRtMs: 312, lapses: 5, commissionErrors: 5 },
    { day: 17, sleepHours: 7.2, medianRtMs: 260, lapses: 1, commissionErrors: 1 },
  ])('preserves the exact supplied day $day records', ({ day, sleepHours, medianRtMs, lapses, commissionErrors }) => {
    expect(syntheticSleep.find((row) => row.day === day)).toEqual({ day, sleepHours, midpointMinutes: 180, source: 'synthetic', quality: 'good' });
    expect(syntheticChecks.find((row) => row.day === day)).toEqual({
      id: `synthetic-check-${String(day).padStart(2, '0')}`, day, timestamp: null,
      medianRtMs, lapses, commissionErrors, falseStarts: 0, omissionErrors: 0,
      interruptions: 0, validTrials: 40, source: 'synthetic', quality: 'good',
    });
  });
  it('matches every measurement column in DEMO §1 without rounding', () => {
    expect(syntheticSleep.map(({ sleepHours }) => sleepHours)).toEqual([7.2, 7.4, 7.1, 7.3, 7.0, 7.2, 7.3, 7.1, 6.0, 5.9, 5.7, 5.4, 6.6, 7.0, 7.2, 7.3, 7.2]);
    expect(syntheticSleep.map(({ midpointMinutes }) => midpointMinutes)).toEqual(Array(17).fill(180));
    expect(syntheticChecks.map(({ medianRtMs }) => medianRtMs)).toEqual([260, 270, 265, 255, 275, 260, 270, 268, 275, 295, 305, 312, 300, 280, 270, 265, 260]);
    expect(syntheticChecks.map(({ lapses }) => lapses)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 4, 5, 3, 2, 1, 1, 1]);
    expect(syntheticChecks.map(({ commissionErrors }) => commissionErrors)).toEqual([1, 2, 1, 1, 2, 1, 1, 1, 2, 4, 4, 5, 4, 2, 1, 1, 1]);
  });
  it('preserves synthetic provenance and documented aggregate metadata on all records', () => {
    for (const row of syntheticSleep) {
      expect(row.source).toBe('synthetic');
      expect(row.quality).toBe('good');
      expect(isSleepValid(row)).toBe(true);
    }
    for (const row of syntheticChecks) {
      expect(row).toMatchObject({ timestamp: null, source: 'synthetic', quality: 'good', falseStarts: 0, omissionErrors: 0, interruptions: 0, validTrials: 40 });
      // Explicitly exercise both minima; this does not assign a live test kind.
      expect(isCheckValid(row, 'reaction')).toBe(true);
      expect(isCheckValid(row, 'go_no_go')).toBe(true);
    }
  });
  it('matches the SPEC task profiles, demands, domains and caps', () => {
    expect(taskLibrary).toEqual([
      { id: 'EVA', name: 'EVA (spacewalk)', demand: 'high', relevantDomains: ['sleep', 'reaction', 'attention'], reviewCap: 'REVIEW_RECOMMENDED' },
      { id: 'DOCK', name: 'Docking', demand: 'high', relevantDomains: ['reaction', 'attention', 'sleep'], reviewCap: 'REVIEW_RECOMMENDED' },
      { id: 'MAINT', name: 'Maintenance', demand: 'medium', relevantDomains: ['attention', 'sleep'], reviewCap: 'REVIEW_RECOMMENDED' },
      { id: 'INV', name: 'Inventory', demand: 'low', relevantDomains: ['sleep', 'attention'], reviewCap: 'CHANGE_NOTED' },
    ]);
  });
  it('matches the mission schedule with deterministic same-day ordering', () => {
    expect(missionSchedule).toEqual([
      { id: 'EVA-07', taskId: 'EVA', scheduledDay: 14 },
      { id: 'INV-03', taskId: 'INV', scheduledDay: 14 },
      { id: 'MAINT-11', taskId: 'MAINT', scheduledDay: 15 },
      { id: 'DOCK-02', taskId: 'DOCK', scheduledDay: 16 },
    ]);
    expect(missionSchedule.every((task) => taskLibrary.some(({ id }) => id === task.taskId))).toBe(true);
  });
  it('keeps source observations immutable for later tests that use copies', () => {
    expect(Object.isFrozen(syntheticSleep)).toBe(true);
    expect(Object.isFrozen(syntheticChecks)).toBe(true);
    expect(syntheticSleep.every(Object.isFrozen)).toBe(true);
    expect(syntheticChecks.every(Object.isFrozen)).toBe(true);
  });
});
