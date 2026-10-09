import { MAX_FALSE_START_COUNT, MAX_INTERRUPTION_COUNT, MAX_SLEEP_HOURS, MIN_NONNEGATIVE_VALUE, MIN_SLEEP_HOURS, MIN_VALID_TRIALS } from './config.js';
import type { CheckObservation, Quality, SleepObservation, TestKind } from './types.js';

export interface QualityResult {
  quality: Quality;
  reasons: string[];
}

function provenanceReasons(quality: Quality): string[] {
  return quality === 'good' ? [] : [`Recorded quality is ${quality}.`];
}

function isNonnegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_NONNEGATIVE_VALUE;
}

function sleepQuality(sleep: SleepObservation, requireDuration: boolean): QualityResult {
  const reasons = provenanceReasons(sleep.quality);
  if (sleep.sleepHours === null && requireDuration) reasons.push('Sleep duration is missing.');
  else if (sleep.sleepHours === null) { /* Domain OR evaluation checks availability separately. */ }
  else if (!Number.isFinite(sleep.sleepHours)) reasons.push('Sleep duration must be finite.');
  else if (sleep.sleepHours < MIN_SLEEP_HOURS || sleep.sleepHours > MAX_SLEEP_HOURS) {
    reasons.push(`Sleep duration is outside ${MIN_SLEEP_HOURS}–${MAX_SLEEP_HOURS} h.`);
  }
  // A missing midpoint does not invalidate duration under SPEC §5;
  // callers needing midpoint must separately require that measurement.
  if (sleep.midpointMinutes !== null && !isNonnegativeNumber(sleep.midpointMinutes)) {
    reasons.push('Sleep midpoint must be finite and nonnegative.');
  }
  const missing = sleep.quality === 'missing' || (requireDuration && sleep.sleepHours === null);
  return { quality: missing ? 'missing' : reasons.length ? 'poor' : 'good', reasons };
}

function checkQuality(check: CheckObservation, testKind: TestKind, requireMetrics: boolean): QualityResult {
  const reasons = provenanceReasons(check.quality);
  let missing = check.quality === 'missing';
  const requiredMetrics = !requireMetrics ? ['falseStarts'] as const : testKind === 'reaction'
    ? ['medianRtMs', 'lapses', 'falseStarts'] as const
    : ['commissionErrors', 'omissionErrors', 'falseStarts'] as const;
  for (const field of requiredMetrics) {
    if (check[field] === null) {
      missing = true;
      reasons.push(`${field} is missing.`);
    }
  }
  if (check.medianRtMs !== null && !isNonnegativeNumber(check.medianRtMs)) {
    reasons.push('Reaction time must be finite and nonnegative.');
  }
  const countFields = ['lapses', 'falseStarts', 'commissionErrors', 'omissionErrors', 'validTrials', 'interruptions'] as const;
  for (const field of countFields) {
    const value = check[field];
    if (value !== null && (!isNonnegativeNumber(value) || !Number.isInteger(value))) {
      reasons.push(`${field} must be a finite nonnegative integer.`);
    }
  }
  if (check.validTrials < MIN_VALID_TRIALS[testKind]) {
    reasons.push(`Fewer than ${MIN_VALID_TRIALS[testKind]} valid trials for ${testKind}.`);
  }
  if (check.interruptions > MAX_INTERRUPTION_COUNT) {
    reasons.push(`More than ${MAX_INTERRUPTION_COUNT} interruptions.`);
  }
  if (check.falseStarts !== null && check.falseStarts > MAX_FALSE_START_COUNT) {
    reasons.push(`More than ${MAX_FALSE_START_COUNT} false starts.`);
  }
  return { quality: missing ? 'missing' : reasons.length ? 'poor' : 'good', reasons };
}

export function getSleepQuality(sleep: SleepObservation): QualityResult {
  return sleepQuality(sleep, true);
}

export function getCheckQuality(check: CheckObservation, testKind: TestKind): QualityResult {
  return checkQuality(check, testKind, true);
}

// Share technical filters without requiring an unrelated metric. Domain detection
// separately decides whether each observed branch establishes a criterion.
export function getSleepMeasurementQuality(sleep: SleepObservation): QualityResult {
  return sleepQuality(sleep, false);
}

export function getCheckMeasurementQuality(check: CheckObservation, testKind: TestKind): QualityResult {
  return checkQuality(check, testKind, false);
}

export function isSleepValid(sleep: SleepObservation): boolean {
  return getSleepQuality(sleep).quality === 'good';
}

export function isCheckValid(check: CheckObservation, testKind: TestKind): boolean {
  return getCheckQuality(check, testKind).quality === 'good';
}
