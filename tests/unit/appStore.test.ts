import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { addLiveCheck, addResponse, getState, initialize, KairosDatabase, resetSimulation, setDay, type StoredState } from '../../src/db/db';
import { AppStore, DEFAULT_RESPONSE_NOTE, type StorageAdapter } from '../../src/state/appStore';
import { rows } from './fixtures/engineOracle';

let index = 0;
let database:KairosDatabase;
let adapter:StorageAdapter;
const time = '2026-10-09T00:00:00.000Z';
beforeEach(() => {
  database = new KairosDatabase(`kairos-state-unit-${++index}`);
  adapter = {initialize:() => initialize(time,database),getState:() => getState(database),setDay:day => setDay(day,database),reset:() => resetSimulation(database),addResponse:response => addResponse(response,database)};
});
afterEach(async () => { await database.delete(); });
function createStore() { let id = 0; return new AppStore(adapter,() => `state-fixture-response-${++id}`); }

describe('shared app store and serialized mutations', () => {
  it('starts unavailable while loading and initializes only once across repeated mounts', async () => {
    let calls = 0;
    const app = new AppStore({...adapter,initialize:() => {calls++;return adapter.initialize();}});
    expect(app.getSnapshot()).toMatchObject({loading:true,currentDay:null,packet:null});
    await Promise.all([app.load(),app.load(),app.load()]);
    expect(calls).toBe(1);
    expect(app.getSnapshot()).toMatchObject({loading:false,currentDay:7,error:null,packet:{status:'WITHIN_USUAL'}});
  });
  it.each(rows)('derives day $day from the persisted frozen baseline and engine', async row => {
    const app = createStore(); await app.load(); const baseline = app.getSnapshot().baseline;
    await app.jump(row.day);
    const snapshot = app.getSnapshot();
    expect(snapshot.packet?.status).toBe(row.status);
    expect(snapshot.packet?.domains.map(d => d.metDaysInWindow)).toEqual(row.counts);
    expect(snapshot.baseline).toEqual(baseline);
    expect(snapshot.taskPackets.find(p => p.task?.taskId === 'EVA')).toMatchObject({taskConcern:row.eva[1],task:{r:row.eva[0]}});
    expect(snapshot.taskPackets.find(p => p.task?.taskId === 'INV')).toMatchObject({taskConcern:row.inv[1],task:{r:row.inv[0]}});
  });
  it('serializes rapid advances without lost updates, clamps both boundaries and preserves reload state', async () => {
    const app = createStore(); await app.load();
    const promises = Array.from({length:20},() => app.advance());
    expect(app.getSnapshot().mutating).toBe(true);
    await Promise.all(promises);
    expect(app.getSnapshot()).toMatchObject({currentDay:17,mutating:false,error:null});
    const reloaded = createStore(); await reloaded.load(); expect(reloaded.getSnapshot().currentDay).toBe(17);
    await Promise.all(Array.from({length:20},() => app.back()));
    expect(app.getSnapshot()).toMatchObject({currentDay:7,mutating:false,error:null});
  });
  it('retains ordering across jump/advance/back/reset operations', async () => {
    const app = createStore(); await app.load();
    await Promise.all([app.jump(11),app.advance(),app.advance(),app.back()]);
    expect(app.getSnapshot().currentDay).toBe(12);
    await Promise.all([app.reset(),app.advance()]);
    expect(app.getSnapshot().currentDay).toBe(8);
  });
  it('does not let a delayed initial load overwrite a queued newer day', async () => {
    await initialize(time,database);
    let resolveLoad!:(state:StoredState) => void;
    const delayed = new Promise<StoredState>(resolve => {resolveLoad = resolve;});
    const app = new AppStore({...adapter,initialize:() => delayed});
    const loading = app.load();
    const jumping = app.jump(16);
    resolveLoad(await getState(database));
    await Promise.all([loading,jumping]);
    expect(app.getSnapshot()).toMatchObject({currentDay:16,loading:false,mutating:false});
  });
  it('filters every future and live observation before synthetic derivation', async () => {
    await initialize(time,database);
    await addLiveCheck({id:'live-state-fixture',day:null,timestamp:time,kind:'reaction',source:'live',quality:'good',medianRtMs:10000,lapses:100,falseStarts:0,commissionErrors:null,omissionErrors:null,validTrials:25,interruptions:0},database);
    const app = createStore(); await app.load();
    const snapshot = app.getSnapshot();
    expect(snapshot.visibleSleep).toHaveLength(7); expect(snapshot.visibleChecks).toHaveLength(7);
    expect(snapshot.visibleChecks.every(c => c.source === 'synthetic' && c.day !== null && c.day <= 7)).toBe(true);
    expect(snapshot.packet?.status).toBe('WITHIN_USUAL');
    expect(snapshot.taskPackets.every(p => p.provenance.every(source => source.source === 'synthetic'))).toBe(true);
  });
  it('uses actual preceding-day results for response-linked trend and preserves/reset logs', async () => {
    const app = createStore(); await app.load(); const baseline = app.getSnapshot().baseline;
    await app.jump(13); await app.logResponse();
    expect(app.getSnapshot().responses).toMatchObject([{day:13,note:DEFAULT_RESPONSE_NOTE,type:'rest_adjustment'}]);
    for (const day of [13,14,15,16,17]) {
      await app.jump(day);
      expect(app.getSnapshot().trend?.label).toBe([15,16].includes(day) ? 'Measures moving toward baseline' : null);
    }
    const reloaded = createStore(); await reloaded.load(); expect(reloaded.getSnapshot().responses).toHaveLength(1);
    await app.reset();
    expect(app.getSnapshot()).toMatchObject({currentDay:7,baseline,responses:[],trend:{label:null}});
  });
  it('logs at the serialized current day rather than stale click-time state', async () => {
    const app = createStore(); await app.load();
    await Promise.all([app.jump(13),app.logResponse(),app.advance()]);
    expect(app.getSnapshot()).toMatchObject({currentDay:14,responses:[{day:13,note:DEFAULT_RESPONSE_NOTE}]});
  });
  it('returns an honest unavailable state on load failure, without deleting records', async () => {
    await initialize(time,database); await database.settings.update('app',{baseline:null});
    const app = createStore(); await app.load();
    expect(app.getSnapshot()).toMatchObject({loading:false,packet:null,currentDay:null,baseline:null});
    expect(app.getSnapshot().error).toContain('incomplete'); expect(await database.sleep.count()).toBe(17);
  });
  it('clears positive derived state when a mutation fails and preserves stored data', async () => {
    const app = new AppStore({...adapter,setDay:async () => {throw new Error('Injected storage failure');}});
    await app.load(); await app.advance();
    expect(app.getSnapshot()).toMatchObject({packet:null,currentDay:null,error:'Injected storage failure',mutating:false});
    expect(await getState(database)).toMatchObject({status:'ready',currentDay:7});
  });
  it('rejects invalid jump and premature response without invalid writes', async () => {
    const app = createStore(); await app.load(); await app.jump(18);
    expect(app.getSnapshot().error).toContain('Mission day');
    expect(await getState(database)).toMatchObject({status:'ready',currentDay:7});
    const reloaded = createStore(); await reloaded.load(); await reloaded.logResponse();
    expect(reloaded.getSnapshot().error).toContain('day 12'); expect(await database.responses.count()).toBe(0);
  });
  it('deduplicates identical subscriptions and removes them on unmount', async () => {
    const app = createStore(); let calls = 0; const listener = () => {calls++;};
    const unsubscribe = app.subscribe(listener); app.subscribe(listener);
    await app.load(); expect(calls).toBe(1);
    unsubscribe(); await app.advance(); expect(calls).toBe(1);
  });
});
