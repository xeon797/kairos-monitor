import { describe, expect, it } from 'vitest';
import { getCheckQuality, getSleepQuality, isCheckValid, isSleepValid } from '../../src/engine/quality';
import type { CheckObservation, SleepObservation, TestKind } from '../../src/engine/types';

// Unit-test fixtures only; these are not the official mission scenario.
const sleep: SleepObservation = { day: 1, sleepHours: 8, midpointMinutes: 180, source: 'synthetic', quality: 'good' };
const check: CheckObservation = {
  id: 'quality-fixture', day: 1, timestamp: null, medianRtMs: 250,
  lapses: 1, falseStarts: 0, commissionErrors: 1, omissionErrors: 0,
  validTrials: 40, interruptions: 0, source: 'synthetic', quality: 'good',
};

describe('sleep quality — unit-test fixtures', () => {
  it.each([2, 8, 14])('accepts duration %s h including boundaries', (sleepHours) => {
    expect(getSleepQuality({ ...sleep, sleepHours })).toEqual({ quality: 'good', reasons: [] });
  });
  it.each([1.99, 14.01, -1, NaN, Infinity, -Infinity])('excludes invalid duration %s', (sleepHours) => {
    expect(isSleepValid({ ...sleep, sleepHours })).toBe(false);
    expect(getSleepQuality({ ...sleep, sleepHours }).quality).toBe('poor');
  });
  it('classifies null duration as missing without changing the record', () => {
    const observation = Object.freeze({ ...sleep, sleepHours: null });
    expect(getSleepQuality(observation)).toEqual({ quality: 'missing', reasons: ['Sleep duration is missing.'] });
    expect(observation.quality).toBe('good');
  });
  it.each(['poor', 'missing'] as const)('preserves exclusion for recorded %s quality', (quality) => {
    expect(isSleepValid({ ...sleep, quality })).toBe(false);
    expect(getSleepQuality({ ...sleep, quality }).quality).toBe(quality);
  });
  it('allows missing midpoint for duration validation', () => {
    expect(isSleepValid({ ...sleep, midpointMinutes: null })).toBe(true);
  });
  it.each([NaN, Infinity, -1])('excludes invalid midpoint %s', (midpointMinutes) => {
    expect(isSleepValid({ ...sleep, midpointMinutes })).toBe(false);
  });
});

describe('check quality — unit-test fixtures', () => {
  it.each([
    ['reaction', 19, false], ['reaction', 20, true], ['reaction', 25, true],
    ['go_no_go', 29, false], ['go_no_go', 30, true], ['go_no_go', 40, true],
  ] satisfies Array<[TestKind, number, boolean]>)('%s with %s trials is valid: %s', (kind, validTrials, valid) => {
    expect(isCheckValid({ ...check, validTrials }, kind)).toBe(valid);
  });
  it('uses the explicit test kind with identical metrics', () => {
    const observation = { ...check, validTrials: 25 };
    expect(isCheckValid(observation, 'reaction')).toBe(true);
    expect(isCheckValid(observation, 'go_no_go')).toBe(false);
  });
  it.each([['interruptions', 2, true], ['interruptions', 3, false], ['falseStarts', 5, true], ['falseStarts', 6, false]] as const)(
    '%s boundary %s is valid: %s', (field, value, valid) => {
      expect(isCheckValid({ ...check, [field]: value }, 'reaction')).toBe(valid);
    },
  );
  it.each(['poor', 'missing'] as const)('does not promote recorded %s quality', (quality) => {
    expect(getCheckQuality({ ...check, quality }, 'reaction').quality).toBe(quality);
    expect(isCheckValid({ ...check, quality }, 'reaction')).toBe(false);
  });
  it.each(['medianRtMs', 'lapses', 'falseStarts'] as const)('requires reaction metric %s', (field) => {
    expect(getCheckQuality({ ...check, [field]: null }, 'reaction').quality).toBe('missing');
  });
  it.each(['commissionErrors', 'omissionErrors', 'falseStarts'] as const)('requires go/no-go metric %s', (field) => {
    expect(getCheckQuality({ ...check, [field]: null }, 'go_no_go').quality).toBe('missing');
  });
  it('accepts null metrics unrelated to the explicit kind', () => {
    expect(isCheckValid({ ...check, commissionErrors: null, omissionErrors: null }, 'reaction')).toBe(true);
    expect(isCheckValid({ ...check, medianRtMs: null, lapses: null }, 'go_no_go')).toBe(true);
  });
  it.each(['lapses', 'falseStarts', 'commissionErrors', 'omissionErrors', 'validTrials', 'interruptions'] as const)(
    'rejects negative, fractional and non-finite %s', (field) => {
      for (const value of [-1, 1.5, NaN, Infinity, -Infinity]) {
        expect(isCheckValid({ ...check, [field]: value }, 'reaction')).toBe(false);
        expect(isCheckValid({ ...check, [field]: value }, 'go_no_go')).toBe(false);
      }
    },
  );
  it.each([-1, NaN, Infinity, -Infinity])('excludes invalid reaction time %s', (medianRtMs) => {
    expect(isCheckValid({ ...check, medianRtMs }, 'reaction')).toBe(false);
  });
  it('reports all applicable exclusions without mutating provenance', () => {
    const observation = Object.freeze({ ...check, quality: 'poor' as const, validTrials: 10, interruptions: 3, falseStarts: 6 });
    expect(getCheckQuality(observation, 'reaction')).toEqual({
      quality: 'poor', reasons: ['Recorded quality is poor.', 'Fewer than 20 valid trials for reaction.', 'More than 2 interruptions.', 'More than 5 false starts.'],
    });
    expect(observation).toEqual({ ...check, quality: 'poor', validTrials: 10, interruptions: 3, falseStarts: 6 });
  });
});
