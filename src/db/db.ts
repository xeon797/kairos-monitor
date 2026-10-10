import Dexie, { type Table } from 'dexie';
import { isLiveRecord } from '../checks/liveRecord';
import { computeBaseline } from '../engine/baseline';
import { BASELINE_WINDOW, MAX_RESPONSE_NOTE_LENGTH, MIN_BASELINE_CHECKS, MIN_BASELINE_SLEEP_NIGHTS, SIMULATION_MAX_DAY, SIMULATION_MIN_DAY } from '../engine/config';
import { syntheticChecks, syntheticSleep } from '../engine/scenarios';
import type { Baseline, CheckObservation, ResponseLog, SleepObservation, TestKind } from '../engine/types';

// Storage metadata extends, rather than changes, the verified engine contract.
export type PersistedCheck = CheckObservation & (
  | { kind: 'synthetic_daily_summary'; source: 'synthetic'; day: number; timestamp: null }
  | { kind: TestKind; source: 'live'; day: null; timestamp: string }
);
export type LiveCheck = Extract<PersistedCheck,{ source:'live' }>;
export type PersistedResponse = ResponseLog & { source:'synthetic' };
export interface CachedExplanation { key:string; text:string; model:string; createdAt:string; contractVersion?:string }
export interface AppSettings {
  key:'app'; currentDay:number; baseline:Baseline | null; scenarioLoaded:boolean; schemaVersion:number;
}
export interface ReadyState {
  status:'ready'; currentDay:number; baseline:Baseline;
  sleep:SleepObservation[]; checks:PersistedCheck[]; responses:PersistedResponse[];
}
export type StoredState = ReadyState | { status:'unavailable'; error:string };
export const DATABASE_NAME = 'kairos-monitor';
const SCHEMA_VERSION = 1;

export class KairosDatabase extends Dexie {
  sleep!: Table<SleepObservation,number>;
  checks!: Table<PersistedCheck,string>;
  responses!: Table<PersistedResponse,string>;
  settings!: Table<AppSettings,string>;
  explanations!: Table<CachedExplanation,string>;

  constructor(name = DATABASE_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      sleep:'day, source', checks:'id, source, day, kind, timestamp',
      responses:'id, day, source', settings:'key', explanations:'key, createdAt',
    });
  }
}
export const db = new KairosDatabase();

export function isSimulationDay(day:number): boolean {
  return Number.isInteger(day) && day >= SIMULATION_MIN_DAY && day <= SIMULATION_MAX_DAY;
}
function requireDay(day:number): void {
  if (!isSimulationDay(day)) throw new Error(`Mission day must be an integer from ${SIMULATION_MIN_DAY} to ${SIMULATION_MAX_DAY}.`);
}
function isIsoUtc(timestamp:string): boolean {
  if (typeof timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(timestamp)) return false;
  const parsed = new Date(timestamp);
  return Number.isFinite(parsed.getTime()) && (parsed.toISOString() === timestamp || parsed.toISOString().replace('.000Z','Z') === timestamp);
}
function baselineAvailable(baseline:Baseline | null): baseline is Baseline {
  if (!baseline || !Array.isArray(baseline.window) || baseline.window[0] !== BASELINE_WINDOW[0] || baseline.window[1] !== BASELINE_WINDOW[1] || !isIsoUtc(baseline.frozenAt)) return false;
  const means = [baseline.sleepMeanHours,baseline.midpointMeanMinutes,baseline.rtMeanMs,baseline.lapsesMean,baseline.errorsMean];
  return means.every(value => Number.isFinite(value) && value >= 0)
    && Number.isInteger(baseline.validSleepNights) && baseline.validSleepNights >= MIN_BASELINE_SLEEP_NIGHTS
    && Number.isInteger(baseline.validChecks) && baseline.validChecks >= MIN_BASELINE_CHECKS;
}
function errorMessage(error:unknown): string {
  return error instanceof Error ? error.message : 'Local storage is unavailable.';
}
function responseAvailable(value:unknown):value is PersistedResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Partial<PersistedResponse>;
  return typeof response.id === 'string' && !!response.id.trim()
    && typeof response.day === 'number' && isSimulationDay(response.day)
    && (response.type === 'rest_adjustment' || response.type === 'workload_adjustment')
    && response.source === 'synthetic' && typeof response.note === 'string'
    && response.note.length <= MAX_RESPONSE_NOTE_LENGTH;
}
async function readState(store:KairosDatabase): Promise<StoredState> {
  const settings = await store.settings.get('app');
  if (!settings?.scenarioLoaded || settings.schemaVersion !== SCHEMA_VERSION || !isSimulationDay(settings.currentDay) || !baselineAvailable(settings.baseline)) {
    return {status:'unavailable',error:'Local mission storage is incomplete: current day, scenario marker or frozen baseline is unavailable.'};
  }
  // Read every response: a corrupt/missing indexed day must not hide a saved row.
  const [sleep,checks,responses] = await Promise.all([store.sleep.toArray(),store.checks.toArray(),store.responses.toArray()]);
  if (!responses.every(responseAvailable)) {
    return {status:'unavailable',error:'Local mission storage is incomplete: saved schedule changes are malformed. Existing records were preserved.'};
  }
  if (!syntheticSleep.every(row => sleep.some(saved => saved.day === row.day && saved.source === 'synthetic')) ||
    !syntheticChecks.every(row => checks.some(saved => saved.id === row.id && saved.source === 'synthetic' && saved.kind === 'synthetic_daily_summary'))) {
    return {status:'unavailable',error:'Local mission storage is incomplete: synthetic scenario records are unavailable.'};
  }
  return {status:'ready',currentDay:settings.currentDay,baseline:settings.baseline,sleep,checks,responses:responses.sort((left,right) => left.day-right.day)};
}

/** Caller supplies time; repeated and concurrent calls preserve all existing data. */
export async function initialize(frozenAt:string, store = db): Promise<StoredState> {
  if (!isIsoUtc(frozenAt)) return {status:'unavailable',error:'Initialization requires an ISO UTC timestamp.'};
  try {
    return await store.transaction('rw',store.sleep,store.checks,store.responses,store.settings,store.explanations,async () => {
      if (!await store.settings.get('app')) {
        if (await store.sleep.count() || await store.checks.where('source').equals('synthetic').count()) {
          throw new Error('Local mission storage is incomplete; existing records were preserved.');
        }
        // Explicit quality kind for the adopted aggregate fixture, never inferred
        // from its nullable metrics or the aggregate validTrials metadata.
        const baseline = computeBaseline(syntheticSleep,syntheticChecks,BASELINE_WINDOW,frozenAt,'reaction');
        if (!baseline) throw new Error('The synthetic baseline is unavailable.');
        await store.sleep.bulkAdd(syntheticSleep.map(row => ({...row})));
        await store.checks.bulkAdd(syntheticChecks.map(row => ({...row,day:row.day!,timestamp:null,source:'synthetic',kind:'synthetic_daily_summary'})));
        await store.settings.add({key:'app',currentDay:SIMULATION_MIN_DAY,baseline,scenarioLoaded:true,schemaVersion:SCHEMA_VERSION});
      }
      return readState(store);
    });
  } catch (error:unknown) { return {status:'unavailable',error:errorMessage(error)}; }
}

export async function getState(store = db): Promise<StoredState> {
  try { return await store.transaction('r',store.sleep,store.checks,store.responses,store.settings,() => readState(store)); }
  catch (error:unknown) { return {status:'unavailable',error:errorMessage(error)}; }
}

async function requireReady(store:KairosDatabase): Promise<ReadyState> {
  const state = await readState(store);
  if (state.status === 'unavailable') throw new Error(state.error);
  return state;
}
async function mutate(store:KairosDatabase, change:() => Promise<unknown>): Promise<ReadyState> {
  return store.transaction('rw',store.sleep,store.checks,store.responses,store.settings,async () => {
    await requireReady(store);
    await change();
    return requireReady(store);
  });
}
export async function setDay(day:number, store = db): Promise<ReadyState> {
  requireDay(day);
  return mutate(store,() => store.settings.update('app',{currentDay:day}));
}
export async function addResponse(response:ResponseLog, store = db): Promise<ReadyState> {
  requireDay(response.day);
  if (typeof response.id !== 'string' || !response.id.trim()) throw new Error('Response ID is required.');
  if (!['rest_adjustment','workload_adjustment'].includes(response.type)) throw new Error('Response type is unavailable.');
  if (typeof response.note !== 'string' || response.note.length > MAX_RESPONSE_NOTE_LENGTH) throw new Error(`Response note must be at most ${MAX_RESPONSE_NOTE_LENGTH} characters.`);
  return mutate(store,() => store.responses.add({...response,source:'synthetic'}));
}
export async function addLiveCheck(check:LiveCheck, store = db): Promise<ReadyState> {
  if (!isLiveRecord(check)) throw new Error('Live checks require a valid identity, ISO UTC timestamp, quality and nonnegative finite measurements or explicit null values.');
  return mutate(store,() => store.checks.add({...check}));
}
export async function resetSimulation(store = db): Promise<ReadyState> {
  return mutate(store,async () => {
    await store.settings.update('app',{currentDay:SIMULATION_MIN_DAY});
    await store.responses.where('source').equals('synthetic').delete();
  });
}
