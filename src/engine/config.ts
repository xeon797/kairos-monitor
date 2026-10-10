import type { BaselineWindow, TaskDemand, TestKind } from './types.js';

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
// Browser-check protocol (SPEC §11): experimental, illustrative; not clinical criteria.
export const REACTION_FALSE_START_MS = 100;
export const REACTION_LAPSE_MS = 500;
export const REACTION_TIMEOUT_MS = 2000;
// experimental, illustrative: DESIGN §7 suppresses duplicate input across trial boundaries.
export const REACTION_DOUBLE_FIRE_MS = 50;
export const REACTION_DELAY_MIN_MS = 1500;
export const REACTION_DELAY_MAX_MS = 4000;
export const GO_NO_GO_COUNT = 10;
export const GO_NO_GO_STIMULUS_MS = 800;
export const GO_NO_GO_GAP_MS = 400;
// Technical numeric validity: experimental, illustrative; quantities/counts cannot be negative.
export const MIN_NONNEGATIVE_VALUE = 0;

// Task classification thresholds: experimental, illustrative (SPEC §8.2).
export const TASK_CHANGE_MIN_DOMAINS = 1;
export const TASK_REVIEW_MIN_DOMAINS: Readonly<Record<Exclude<TaskDemand, 'low'>, number>> = Object.freeze({ high: 2, medium: 2 });
export const LOW_DEMAND_CONCERN_CAP = 'CHANGE_NOTED' as const;

// Technical performance target: experimental, illustrative prototype budget (SPEC §15).
export const ENGINE_TARGET_MS = 20;

// Technical simulator/input limits: experimental, illustrative prototype rules
// from SPEC §4/§12; these do not alter detection or task classification.
export const SIMULATION_MIN_DAY = 7;
export const SIMULATION_MAX_DAY = 17;
export const SCHEDULE_CHANGE_MIN_DAY = 12;
export const MAX_RESPONSE_NOTE_LENGTH = 200;

// Explanation limits: experimental, illustrative prototype safeguards, not clinical criteria.
export const MAX_EXPLANATION_WORDS = 90;
// Technical explanation budgets: experimental, illustrative prototype safeguards.
export const EXPLANATION_BODY_BYTES = 8 * 1024;
export const EXPLANATION_SERVER_TIMEOUT_MS = 3500;
export const EXPLANATION_CLIENT_TIMEOUT_MS = 4000;
export const EXPLANATION_OUTPUT_TOKENS = 160;
export const EXPLANATION_TEMPERATURE = 0.2;
export const EXPLANATION_REQUESTS_PER_MINUTE = 20;
export const EXPLANATION_RATE_WINDOW_MS = 60_000;
export const EXPLANATION_RATE_MAX_ENTRIES = 1000;
export const EXPLANATION_SETTLE_MS = 900;
export const EXPLANATION_CLIENT_REQUESTS_PER_MINUTE = 12;
export const EXPLANATION_CACHE_MAX_ENTRIES = 50;
export const EXPLANATION_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Live comparison minimum: experimental, illustrative (SPEC section 11.3).
export const LIVE_BASELINE_CHECKS = 3;
// History display limit: experimental, illustrative (DESIGN section 4.2).
export const LIVE_HISTORY_LIMIT = 10;
