import type { CheckObservation, SleepObservation, TaskProfile, ScheduledTask } from './types';

// Adopted synthetic demo fixture: exact DEMO §1 measurements, not recorded trials.
const missionRows: readonly (readonly [day: number, sleepHours: number, midpointMinutes: number, medianRtMs: number, lapses: number, commissionErrors: number])[] = [
  [1, 7.2, 180, 260, 1, 1],
  [2, 7.4, 180, 270, 1, 2],
  [3, 7.1, 180, 265, 1, 1],
  [4, 7.3, 180, 255, 1, 1],
  [5, 7.0, 180, 275, 1, 2],
  [6, 7.2, 180, 260, 1, 1],
  [7, 7.3, 180, 270, 1, 1],
  [8, 7.1, 180, 268, 1, 1],
  [9, 6.0, 180, 275, 1, 2],
  [10, 5.9, 180, 295, 3, 4],
  [11, 5.7, 180, 305, 4, 4],
  [12, 5.4, 180, 312, 5, 5],
  [13, 6.6, 180, 300, 3, 4],
  [14, 7.0, 180, 280, 2, 2],
  [15, 7.2, 180, 270, 1, 1],
  [16, 7.3, 180, 265, 1, 1],
  [17, 7.2, 180, 260, 1, 1],
];

export const syntheticSleep: readonly SleepObservation[] = Object.freeze(missionRows.map(([day, sleepHours, midpointMinutes]) => Object.freeze({
  day, sleepHours, midpointMinutes, source: 'synthetic' as const, quality: 'good' as const,
})));

export const syntheticChecks: readonly CheckObservation[] = Object.freeze(missionRows.map(([day, , , medianRtMs, lapses, commissionErrors]) => Object.freeze({
  id: `synthetic-check-${String(day).padStart(2, '0')}`,
  day, timestamp: null, medianRtMs, lapses, commissionErrors,
  // DEMO §1.1 aggregate metadata; 40 is not a reaction-test trial count.
  falseStarts: 0, omissionErrors: 0, interruptions: 0, validTrials: 40,
  source: 'synthetic' as const, quality: 'good' as const,
})));

export const taskLibrary: readonly TaskProfile[] = [
  { id: 'EVA', name: 'EVA (spacewalk)', demand: 'high', relevantDomains: ['sleep', 'reaction', 'attention'], reviewCap: 'REVIEW_RECOMMENDED' },
  { id: 'DOCK', name: 'Docking', demand: 'high', relevantDomains: ['reaction', 'attention', 'sleep'], reviewCap: 'REVIEW_RECOMMENDED' },
  { id: 'MAINT', name: 'Maintenance', demand: 'medium', relevantDomains: ['attention', 'sleep'], reviewCap: 'REVIEW_RECOMMENDED' },
  { id: 'INV', name: 'Inventory', demand: 'low', relevantDomains: ['sleep', 'attention'], reviewCap: 'CHANGE_NOTED' },
];

// SPEC §8.3 schedule, ordered by day and then instance ID as DEMO §1.3 requires.
export const missionSchedule: readonly ScheduledTask[] = [
  { id: 'EVA-07', taskId: 'EVA', scheduledDay: 14 },
  { id: 'INV-03', taskId: 'INV', scheduledDay: 14 },
  { id: 'MAINT-11', taskId: 'MAINT', scheduledDay: 15 },
  { id: 'DOCK-02', taskId: 'DOCK', scheduledDay: 16 },
];
