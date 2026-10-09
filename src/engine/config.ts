import type { BaselineWindow, TaskDemand, TestKind } from './types';

// Detection thresholds: experimental, illustrative (SPEC §7); not validated criteria.
export const SLEEP_DEFICIT_HOURS = 1.0;
export const MIDPOINT_SHIFT_MIN = 90;
export const RT_INCREASE_FACTOR = 1.08;
export const LAPSES_INCREASE = 2;
export const ERRORS_INCREASE = 2;
export const WINDOW_DAYS = 5;
export const MIN_MET_DAYS = 3;
export const MIN_VALID_DAYS = 3;
// Overall classification: experimental, illustrative (SPEC §7.3).
export const OVERALL_CHANGE_MIN_DOMAINS = 1;
export const OVERALL_REVIEW_MIN_DOMAINS = 2;

// Baseline eligibility: experimental, illustrative (SPEC §6).
export const BASELINE_WINDOW: BaselineWindow = Object.freeze([1, 7] as const);
export const MIN_BASELINE_SLEEP_NIGHTS = 5;
export const MIN_BASELINE_CHECKS = 5;

// Technical quality rules from SPEC §5: experimental, illustrative data filters,
// not detection thresholds or clinical interpretations of the excluded values.
export const MIN_SLEEP_HOURS = 2;
export const MAX_SLEEP_HOURS = 14;
export const MAX_INTERRUPTION_COUNT = 2;
export const MAX_FALSE_START_COUNT = 5;
export const MIN_VALID_TRIALS: Readonly<Record<TestKind, number>> = Object.freeze({ reaction: 20, go_no_go: 30 });
export const TOTAL_TRIALS: Readonly<Record<TestKind, number>> = Object.freeze({ reaction: 25, go_no_go: 40 });
// Technical numeric validity: experimental, illustrative; quantities/counts cannot be negative.
export const MIN_NONNEGATIVE_VALUE = 0;

// Task classification thresholds: experimental, illustrative (SPEC §8.2).
export const TASK_CHANGE_MIN_DOMAINS = 1;
export const TASK_REVIEW_MIN_DOMAINS: Readonly<Record<Exclude<TaskDemand, 'low'>, number>> = Object.freeze({ high: 2, medium: 2 });
export const LOW_DEMAND_CONCERN_CAP = 'CHANGE_NOTED' as const;

// Technical performance target: experimental, illustrative prototype budget (SPEC §15).
export const ENGINE_TARGET_MS = 20;
