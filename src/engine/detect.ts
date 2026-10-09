import { ERRORS_INCREASE, LAPSES_INCREASE, MIDPOINT_SHIFT_MIN, MIN_MET_DAYS, MIN_VALID_DAYS, RT_INCREASE_FACTOR, SLEEP_DEFICIT_HOURS, WINDOW_DAYS } from './config';
import { getCheckMeasurementQuality, getSleepMeasurementQuality } from './quality';
import type { Baseline, CheckObservation, Domain, DomainResult, MeasurementEvidence, SleepObservation } from './types';

export const DOMAINS: readonly Domain[] = ['sleep', 'reaction', 'attention'];
type Observation = SleepObservation | CheckObservation;
interface Branch { evidence: MeasurementEvidence; met: boolean | null }

function branches(domain: Domain, day: number, baseline: Baseline | null, obs?: Observation): Branch[] {
  function branch(metric: MeasurementEvidence['metric'], unit: MeasurementEvidence['unit'], usual: number | null,
    meets: (value: number, mean: number) => boolean): Branch {
    const raw = obs && metric in obs ? (obs as unknown as Partial<Record<MeasurementEvidence['metric'], number | null>>)[metric] ?? null : null;
    const quality = !obs ? { quality: 'missing' as const, reasons: ['No observation for this mission day.'] }
      : 'sleepHours' in obs ? getSleepMeasurementQuality(obs)
      : getCheckMeasurementQuality(obs, metric === 'commissionErrors' ? 'go_no_go' : 'reaction');
    const reasons = [...quality.reasons];
    if (raw === null) reasons.push(`${metric} is missing.`);
    if (!baseline) reasons.push('Baseline is unavailable.');
    const usable = quality.quality === 'good' && raw !== null;
    // Excluded values remain visible with their quality; never use them in arithmetic.
    const delta = usable && usual !== null ? raw - usual : null;
    return { evidence: { metric, value: raw, unit, baseline: usual, deltaAbs: delta,
      deltaPct: delta !== null && usual !== null && usual !== 0 ? delta / usual * 100 : null,
      day, source: obs?.source ?? null, quality: raw === null ? 'missing' : quality.quality, reasons },
      met: usable && usual !== null ? meets(raw, usual) : null };
  }
  if (domain === 'sleep') return [
    branch('sleepHours', 'h', baseline?.sleepMeanHours ?? null, (v, b) => v <= b - SLEEP_DEFICIT_HOURS),
    branch('midpointMinutes', 'min', baseline?.midpointMeanMinutes ?? null, (v, b) => Math.abs(v - b) >= MIDPOINT_SHIFT_MIN),
  ];
  if (domain === 'reaction') return [branch('medianRtMs', 'ms', baseline?.rtMeanMs ?? null, (v, b) => v >= b * RT_INCREASE_FACTOR)];
  return [
    branch('lapses', 'count', baseline?.lapsesMean ?? null, (v, b) => v >= b + LAPSES_INCREASE),
    branch('commissionErrors', 'count', baseline?.errorsMean ?? null, (v, b) => v >= b + ERRORS_INCREASE),
  ];
}

function combined(items: readonly Branch[]): boolean | null {
  if (items.some(item => item.met === true)) return true;
  return items.every(item => item.met === false) ? false : null;
}

/** null means unknown, rather than a measured negative criterion. */
export function criterionMet(domain: Domain, day: number, baseline: Baseline | null, obs?: Observation): boolean | null {
  if (!obs || obs.source !== 'synthetic' || obs.day !== day ||
    (domain === 'sleep') !== ('sleepHours' in obs)) return null;
  return combined(branches(domain, day, baseline, obs));
}

export function evaluateDomains(day: number, baseline: Baseline | null, sleep: readonly SleepObservation[], checks: readonly CheckObservation[]): DomainResult[] {
  return DOMAINS.map(domain => {
    const records: readonly Observation[] = domain === 'sleep' ? sleep : checks;
    let validDaysInWindow = 0;
    let metDaysInWindow = 0;
    const exclusions: DomainResult['exclusions'] = [];
    let current = branches(domain, day, baseline);
    for (let observationDay = day - WINDOW_DAYS + 1; observationDay <= day; observationDay++) {
      const matches = records.filter(obs => obs.source === 'synthetic' && obs.day === observationDay);
      const items = branches(domain, observationDay, baseline, matches.length === 1 ? matches[0] : undefined);
      if (matches.length > 1) items.forEach(item => item.evidence.reasons.push('Multiple observations for this day; selection is ambiguous.'));
      if (observationDay === day) current = items;
      const met = combined(items);
      if (met !== null) {
        validDaysInWindow++;
        if (met) metDaysInWindow++;
      } else exclusions.push({ day: observationDay, reasons: [...new Set(items.flatMap(item => item.evidence.reasons))] });
    }
    const evaluable = baseline !== null && validDaysInWindow >= MIN_VALID_DAYS;
    return { domain, day, baselineEstablished: baseline !== null, evaluable,
      sustained: evaluable && metDaysInWindow >= MIN_MET_DAYS, metDaysInWindow, validDaysInWindow,
      windowDays: WINDOW_DAYS, latest: current[0].evidence, measurements: current.map(item => item.evidence), exclusions };
  });
}
