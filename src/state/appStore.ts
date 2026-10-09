import { addLiveCheck, addResponse, getState, initialize, resetSimulation, setDay, type LiveCheck, type ReadyState, type StoredState } from '../db/db';
import { SCHEDULE_CHANGE_MIN_DAY, SIMULATION_MAX_DAY, SIMULATION_MIN_DAY } from '../engine/config';
import { evaluateDomains } from '../engine/detect';
import { buildEvidencePacket } from '../engine/evidence';
import { missionSchedule, taskLibrary } from '../engine/scenarios';
import { trendChip, type TrendChip } from '../engine/templates';
import type { Baseline, CheckObservation, EvidencePacket, ResponseLog, SleepObservation } from '../engine/types';

export const DEFAULT_RESPONSE_NOTE = 'Protected sleep window; EVA prep moved';
export interface StorageAdapter {
  initialize:() => Promise<StoredState>;
  getState:() => Promise<StoredState>;
  setDay:(day:number) => Promise<ReadyState>;
  reset:() => Promise<ReadyState>;
  addResponse:(response:ResponseLog) => Promise<ReadyState>;
  addLiveCheck?:(check:LiveCheck) => Promise<ReadyState>;
}
const storage:StorageAdapter = {
  initialize:() => initialize(new Date().toISOString()), getState:() => getState(),
  setDay:day => setDay(day), reset:() => resetSimulation(), addResponse:response => addResponse(response),
  addLiveCheck:check=>addLiveCheck(check),
};
export interface AppSnapshot {
  loading:boolean; mutating:boolean; error:string | null;
  currentDay:number | null; baseline:Baseline | null;
  packet:EvidencePacket | null; taskPackets:EvidencePacket[];
  responses:ResponseLog[]; trend:TrendChip | null;
  visibleSleep:SleepObservation[]; visibleChecks:CheckObservation[];
}
function unavailable(loading:boolean,error:string | null,mutating = false): AppSnapshot {
  return {loading,mutating,error,currentDay:null,baseline:null,packet:null,taskPackets:[],responses:[],trend:null,visibleSleep:[],visibleChecks:[]};
}
export function deriveAppState(state:ReadyState): Omit<AppSnapshot,'loading'|'mutating'|'error'> {
  const day = state.currentDay;
  const sleep = state.sleep.filter(record => record.source === 'synthetic' && record.day <= day);
  const checks = state.checks.filter(record => record.source === 'synthetic' && record.kind === 'synthetic_daily_summary' && record.day !== null && record.day <= day);
  const domains = evaluateDomains(day,state.baseline,sleep,checks);
  const previous = evaluateDomains(day-1,state.baseline,sleep.filter(record => record.day < day),checks.filter(record => record.day !== null && record.day < day));
  const responses = state.responses.filter(response => response.source === 'synthetic');
  return {currentDay:day,baseline:state.baseline,visibleSleep:sleep,visibleChecks:checks,responses,
    packet:buildEvidencePacket(day,state.baseline,domains),
    taskPackets:missionSchedule.map(instance => {
      const profile = taskLibrary.find(profile => profile.id === instance.taskId)!;
      return buildEvidencePacket(day,state.baseline,domains,{profile,instance});
    }), trend:trendChip(day,responses,domains,previous)};
}

/** One owner for loading and serialized read-modify-write operations across routes. */
export class AppStore {
  private snapshot:AppSnapshot = unavailable(true,null);
  private listeners = new Set<() => void>();
  private loadPromise:Promise<void> | null = null;
  private queue:Promise<void> = Promise.resolve();
  private pending = 0;
  private revision = 0;
  private liveSaves=new Map<string,{record:LiveCheck;promise:Promise<void>}>();
  constructor(private adapter:StorageAdapter = storage, private responseId:() => string = () => crypto.randomUUID()) {}

  getSnapshot = ():AppSnapshot => this.snapshot;
  subscribe = (listener:() => void):(() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private publish(snapshot:AppSnapshot):void {
    this.snapshot = snapshot;
    this.listeners.forEach(listener => listener());
  }
  private accept(state:StoredState):void {
    if (state.status === 'unavailable') throw new Error(state.error);
    this.publish({...deriveAppState(state),loading:false,mutating:this.pending > 0,error:null});
  }
  private fail(error:unknown):void {
    this.publish(unavailable(false,error instanceof Error ? error.message : 'Local storage is unavailable.',this.pending > 0));
  }
  load = ():Promise<void> => {
    if (!this.loadPromise) {
      const revision = this.revision;
      this.loadPromise = this.adapter.initialize().then(state => {
        if (revision === this.revision) this.accept(state);
      }).catch((error:unknown) => { if (revision === this.revision) this.fail(error); });
    }
    return this.loadPromise;
  };
  private mutate(change:(state:ReadyState) => Promise<ReadyState>):Promise<void> {
    this.pending++;
    this.revision++;
    this.publish({...this.snapshot,mutating:true});
    const operation = this.queue.then(async () => {
      await this.load();
      const state = await this.adapter.getState();
      if (state.status === 'unavailable') throw new Error(state.error);
      this.accept(await change(state));
    }).catch((error:unknown) => { this.fail(error); }).finally(() => {
      this.pending--;
      this.publish({...this.snapshot,mutating:this.pending > 0});
    });
    this.queue = operation;
    return operation;
  }
  advance = ():Promise<void> => this.mutate(state => this.adapter.setDay(Math.min(SIMULATION_MAX_DAY,state.currentDay+1)));
  back = ():Promise<void> => this.mutate(state => this.adapter.setDay(Math.max(SIMULATION_MIN_DAY,state.currentDay-1)));
  jump = (day:number):Promise<void> => this.mutate(() => this.adapter.setDay(day));
  reset = ():Promise<void> => this.mutate(() => this.adapter.reset());
  logResponse = ():Promise<void> => this.mutate(state => {
    if (state.currentDay < SCHEDULE_CHANGE_MIN_DAY) throw new Error(`Schedule changes are available from day ${SCHEDULE_CHANGE_MIN_DAY}.`);
    return this.adapter.addResponse({id:this.responseId(),day:state.currentDay,type:'rest_adjustment',note:DEFAULT_RESPONSE_NOTE});
  });
  saveLiveCheck = (check:LiveCheck):Promise<void> => {
    const same=(saved:LiveCheck):boolean=>(Object.keys(check) as (keyof LiveCheck)[]).every(key=>saved[key]===check[key]);
    const pending=this.liveSaves.get(check.id);
    if(pending)return same(pending.record)?pending.promise:Promise.reject(new Error('This result ID already belongs to another record.'));
    const record={...check};
    const operation=this.queue.then(async()=>{
      await this.load();
      const state=await this.adapter.getState();
      if(state.status!=='ready')throw new Error(state.error);
      const existing=state.checks.find(saved=>saved.id===record.id);
      if(existing){if(existing.source==='live'&&same(existing))return;throw new Error('This result ID already exists.');}
      if(!this.adapter.addLiveCheck)throw new Error('Live result storage is unavailable.');
      this.accept(await this.adapter.addLiveCheck(record));
    });
    this.liveSaves.set(record.id,{record,promise:operation});
    this.queue=operation.catch(()=>{});
    void operation.catch(()=>{this.liveSaves.delete(record.id);});
    return operation;
  };
}
