import { BASELINE_WINDOW, MIN_BASELINE_CHECKS, MIN_BASELINE_SLEEP_NIGHTS } from './config.js';
import { isCheckValid, isSleepValid } from './quality.js';
import type { Baseline, BaselineWindow, CheckObservation, SleepObservation, TestKind } from './types.js';

type BaselineSleep = SleepObservation & { sleepHours: number; midpointMinutes: number };
type BaselineCheck = CheckObservation & { day: number; medianRtMs: number; lapses: number; commissionErrors: number };

function isDayInWindow(day: number | null, window: BaselineWindow): day is number {
  return day !== null && Number.isInteger(day) && day >= window[0] && day <= window[1];
}

function hasUniqueDays(observations: readonly { day: number }[]): boolean {
  return new Set(observations.map(({ day }) => day)).size === observations.length;
}

function arithmeticMean(values: readonly number[]): number {
  // Divide before summing to avoid overflow for finite, nonnegative inputs.
  return values.reduce((sum, value) => sum + value / values.length, 0);
}

/** Pure calculation only; the caller owns storage and explicit re-baselining.
 * testKind applies to the supplied check collection, never inferred from metrics.
 * frozenAt is an ISO UTC timestamp supplied by the caller.
 */
export function computeBaseline(
  sleep: readonly SleepObservation[],
  checks: readonly CheckObservation[],
  window: BaselineWindow,
  frozenAt: string,
  testKind: TestKind,
): Baseline | null {
  if (!Number.isInteger(window[0]) || !Number.isInteger(window[1]) || window[0] < BASELINE_WINDOW[0] || window[0] > window[1]) {
    return null;
  }
  const validSleep = sleep.filter((observation): observation is BaselineSleep =>
    observation.source === 'synthetic' && isDayInWindow(observation.day, window) && isSleepValid(observation)
    && observation.sleepHours !== null && observation.midpointMinutes !== null,
  );
  const validChecks = checks.filter((observation): observation is BaselineCheck =>
    observation.source === 'synthetic' && isDayInWindow(observation.day, window) && isCheckValid(observation, testKind)
    && observation.medianRtMs !== null && observation.lapses !== null && observation.commissionErrors !== null,
  );
  // A duplicate mission day is ambiguous; do not invent a selection/merging rule.
  if (!hasUniqueDays(validSleep) || !hasUniqueDays(validChecks)
    || validSleep.length < MIN_BASELINE_SLEEP_NIGHTS || validChecks.length < MIN_BASELINE_CHECKS) {
    return null;
  }
  return {
    window: [window[0], window[1]],
    sleepMeanHours: arithmeticMean(validSleep.map(({ sleepHours }) => sleepHours)),
    midpointMeanMinutes: arithmeticMean(validSleep.map(({ midpointMinutes }) => midpointMinutes)),
    rtMeanMs: arithmeticMean(validChecks.map(({ medianRtMs }) => medianRtMs)),
    lapsesMean: arithmeticMean(validChecks.map(({ lapses }) => lapses)),
    errorsMean: arithmeticMean(validChecks.map(({ commissionErrors }) => commissionErrors)),
    validSleepNights: validSleep.length,
    validChecks: validChecks.length,
    frozenAt,
  };
}
