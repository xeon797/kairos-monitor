export type Source = 'synthetic' | 'live';
export type Quality = 'good' | 'poor' | 'missing';
export type Domain = 'sleep' | 'reaction' | 'attention';
export type TestKind = 'reaction' | 'go_no_go';
export type Status = 'INSUFFICIENT_DATA' | 'WITHIN_USUAL' | 'CHANGE_NOTED' | 'REVIEW_RECOMMENDED';
export type Concern = 'INSUFFICIENT_DATA' | 'NO_RELEVANT_CHANGE' | 'CHANGE_NOTED' | 'REVIEW_RECOMMENDED';
export type TaskId = 'EVA' | 'DOCK' | 'MAINT' | 'INV';
export type TaskDemand = 'high' | 'medium' | 'low';
export type BaselineWindow = readonly [number, number];

export interface SleepObservation {
  day: number;
  sleepHours: number | null;
  /** Minutes after local midnight. */
  midpointMinutes: number | null;
  source: Source;
  quality: Quality;
}

export interface CheckObservation {
  id: string;
  day: number | null;
  /** ISO UTC time for live checks; null for synthetic records. */
  timestamp: string | null;
  medianRtMs: number | null;
  lapses: number | null;
  falseStarts: number | null;
  commissionErrors: number | null;
  omissionErrors: number | null;
  validTrials: number;
  interruptions: number;
  source: Source;
  quality: Quality;
}

export interface Baseline {
  window: [number, number];
  sleepMeanHours: number;
  midpointMeanMinutes: number;
  rtMeanMs: number;
  lapsesMean: number;
  errorsMean: number;
  validSleepNights: number;
  validChecks: number;
  frozenAt: string;
}

export interface ResponseLog {
  id: string;
  day: number;
  type: 'rest_adjustment' | 'workload_adjustment';
  note: string;
}

export interface TaskProfile {
  id: TaskId;
  name: string;
  demand: TaskDemand;
  relevantDomains: readonly Domain[];
  reviewCap: 'CHANGE_NOTED' | 'REVIEW_RECOMMENDED';
}

export interface ScheduledTask {
  id: string;
  taskId: TaskId;
  scheduledDay: number;
}

export interface EvidencePacket {
  day: number;
  status: Status;
  taskId?: string;
  taskConcern?: Concern;
  domains: Array<{
    domain: Domain;
    sustained: boolean;
    evaluable: boolean;
    metDaysInWindow: number;
    windowDays: number;
    latest: { value: number; unit: string; baseline: number; deltaPct?: number; deltaAbs?: number };
  }>;
  dataQuality: { validSleepDays: number; validCheckDays: number; windowDays: number; notes: string[] };
  provenance: Array<{ label: string; source: Source }>;
  reviewPrompt: string;
}
