import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addLiveCheck, addResponse, getState, initialize, KairosDatabase, resetSimulation, setDay, type LiveCheck, type ReadyState } from '../../src/db/db';
import { syntheticChecks, syntheticSleep } from '../../src/engine/scenarios';
import { baseline as oracle, check } from './fixtures/engineOracle';

const time = '2026-10-09T00:00:00.000Z';
const response = {id:'response-fixture',day:13,type:'rest_adjustment' as const,note:'Protected sleep window; EVA prep moved'};
function live(kind:'reaction'|'go_no_go' = 'reaction', id = 'live-fixture'): LiveCheck {
  return {...check(),id,source:'live',day:null,timestamp:time,kind};
}
let sequence = 0;
let store:KairosDatabase;
let connections:KairosDatabase[];
beforeEach(() => { store = new KairosDatabase(`kairos-unit-${++sequence}`); connections = [store]; });
afterEach(async () => { vi.restoreAllMocks(); connections.forEach(connection => connection.close()); await store.delete(); });
async function ready(): Promise<ReadyState> {
  const state = await initialize(time,store);
  if (state.status !== 'ready') throw new Error(state.error);
  return state;
}

describe('transactional scenario persistence', () => {
  it('seeds the exact fixture and verified frozen baseline on first initialization', async () => {
    const state = await ready();
    expect(state.currentDay).toBe(7);
    expect(state.sleep).toEqual(syntheticSleep);
    expect(state.checks.map(({kind,...observation}) => {expect(kind).toBe('synthetic_daily_summary'); return observation;})).toEqual(syntheticChecks);
    expect(state.checks).toHaveLength(17);
    expect(state.sleep).toHaveLength(17);
    for (const metric of ['sleepMeanHours','midpointMeanMinutes','rtMeanMs','lapsesMean','errorsMean'] as const) {
      expect(Math.abs(state.baseline[metric]-oracle[metric])).toBeLessThanOrEqual(1e-9);
    }
    expect(state.baseline).toMatchObject({window:[1,7],validSleepNights:7,validChecks:7,frozenAt:time});
    expect(await store.settings.get('app')).toMatchObject({scenarioLoaded:true,schemaVersion:1});
  });
  it('is idempotent and preserves current day, baseline, responses, live data and cache', async () => {
    await ready();
    await setDay(16,store); await addResponse(response,store); await addLiveCheck(live(),store);
    await store.explanations.add({key:'cache-fixture',text:'Fixture explanation',model:'fixture',createdAt:time});
    const before = await getState(store);
    expect(await initialize('2027-01-01T00:00:00.000Z',store)).toEqual(before);
    expect(await store.explanations.count()).toBe(1);
  });
  it('survives a new connection with day and response intact', async () => {
    await ready(); await setDay(16,store); await addResponse(response,store);
    store.close();
    const other = new KairosDatabase(store.name); connections.push(other);
    const state = await getState(other);
    expect(state).toMatchObject({status:'ready',currentDay:16,responses:[{...response,source:'synthetic'}]});
  });
  it('serializes concurrent initialization across connections without duplicates or overwrites', async () => {
    const other = new KairosDatabase(store.name); connections.push(other);
    const results = await Promise.all([initialize(time,store),initialize('2027-01-01T00:00:00.000Z',other),initialize(time,store)]);
    expect(results.every(state => state.status === 'ready')).toBe(true);
    expect(await store.sleep.count()).toBe(17);
    expect(await store.checks.count()).toBe(17);
    const baselines = results.map(state => state.status === 'ready' ? state.baseline : null);
    expect(baselines[1]).toEqual(baselines[0]); expect(baselines[2]).toEqual(baselines[0]);
  });
  it('rolls back the entire seed if writing the initialization settings fails', async () => {
    vi.spyOn(store.settings,'add').mockRejectedValueOnce(new Error('Injected settings write failure'));
    expect(await initialize(time,store)).toMatchObject({status:'unavailable',error:'Injected settings write failure'});
    expect(await store.sleep.count()).toBe(0); expect(await store.checks.count()).toBe(0);
    expect(await store.settings.count()).toBe(0);
  });
  it('preserves pre-existing live checks and cached explanations during first seed', async () => {
    await store.checks.add(live());
    await store.explanations.add({key:'existing-cache',text:'Fixture',model:'fixture',createdAt:time});
    const state = await ready();
    expect(state.checks).toHaveLength(18);
    expect(state.checks.find(record => record.id === 'live-fixture')).toEqual(live());
    expect(await store.explanations.count()).toBe(1);
  });
  it('resets only simulated day/responses and preserves baseline, fixture, live checks and cache', async () => {
    const first = await ready();
    await setDay(16,store); await addResponse(response,store); await addLiveCheck(live('reaction','live-rt'),store); await addLiveCheck(live('go_no_go','live-attention'),store);
    const cached = {key:'cached',text:'Fixture',model:'fixture',createdAt:time}; await store.explanations.add(cached);
    const reset = await resetSimulation(store);
    expect(reset).toMatchObject({currentDay:7,baseline:first.baseline,responses:[]});
    expect(reset.sleep).toEqual(first.sleep);
    expect(reset.checks.filter(c => c.source === 'synthetic')).toEqual(first.checks);
    expect(reset.checks.filter(c => c.source === 'live')).toHaveLength(2);
    expect(await store.explanations.get('cached')).toEqual(cached);
  });
});

describe('validated writes and explicit unavailable storage', () => {
  it.each([6,18,7.5,NaN,Infinity])('rejects invalid day %s without changing state', async day => {
    await ready(); await setDay(11,store); const before = await getState(store);
    await expect(setDay(day,store)).rejects.toThrow('Mission day');
    expect(await getState(store)).toEqual(before);
  });
  it.each([7,17])('accepts inclusive day boundary %i', async day => {
    await ready(); expect((await setDay(day,store)).currentDay).toBe(day);
  });
  it.each([6,18,12.5,NaN])('rejects invalid response day %s atomically', async day => {
    await ready(); const before = await getState(store);
    await expect(addResponse({...response,day},store)).rejects.toThrow('Mission day');
    expect(await getState(store)).toEqual(before);
  });
  it('accepts 200 characters and rejects 201 without changing stored response', async () => {
    await ready(); await addResponse({...response,note:'x'.repeat(200)},store); const before = await getState(store);
    await expect(addResponse({...response,id:'too-long',note:'x'.repeat(201)},store)).rejects.toThrow('200');
    expect(await getState(store)).toEqual(before);
  });
  it('never overwrites an existing response or live check on duplicate ID', async () => {
    await ready(); await addResponse(response,store); await addLiveCheck(live(),store); const before = await getState(store);
    await expect(addResponse({...response,note:'replacement'},store)).rejects.toThrow();
    await expect(addLiveCheck({...live(),medianRtMs:999},store)).rejects.toThrow();
    expect(await getState(store)).toEqual(before);
  });
  it.each(['reaction','go_no_go'] as const)('persists explicit live %s identity and provenance without inferring from metrics', async kind => {
    await ready(); const record = {...live(kind),quality:'poor' as const,medianRtMs:null,lapses:null,commissionErrors:null};
    await addLiveCheck(record,store);
    const saved = await store.checks.get(record.id);
    expect(saved).toEqual(record);
    expect(saved).toMatchObject({kind,source:'live',day:null,timestamp:time,quality:'poor'});
  });
  it.each([
    {source:'synthetic'}, {day:12}, {kind:'synthetic_daily_summary'}, {kind:undefined},
    {timestamp:null}, {timestamp:'not-time'}, {timestamp:'2026-02-30T00:00:00.000Z'},
    {timestamp:'2026-10-09T00:00:00+06:00'}, {id:''},
  ])('rejects malformed/synthetic live write %j and preserves storage', async changes => {
    await ready(); const before = await getState(store);
    await expect(addLiveCheck({...live(),...changes} as unknown as LiveCheck,store)).rejects.toThrow();
    expect(await getState(store)).toEqual(before);
  });
  it('returns unavailable for an uninitialized database', async () => {
    expect(await getState(store)).toMatchObject({status:'unavailable'});
    await expect(setDay(12,store)).rejects.toThrow('incomplete');
    expect(await store.settings.count()).toBe(0);
  });
  it.each(['missing_baseline','missing_day','missing_marker','missing_row'] as const)('does not repair or erase incomplete storage: %s', async missing => {
    await ready(); await addLiveCheck(live(),store);
    if (missing === 'missing_baseline') await store.settings.update('app',{baseline:null});
    if (missing === 'missing_day') await store.settings.update('app',{currentDay:99});
    if (missing === 'missing_marker') await store.settings.update('app',{scenarioLoaded:false});
    if (missing === 'missing_row') await store.checks.delete('synthetic-check-12');
    const before = await store.settings.get('app');
    expect(await getState(store)).toMatchObject({status:'unavailable'});
    expect(await initialize(time,store)).toMatchObject({status:'unavailable'});
    await expect(resetSimulation(store)).rejects.toThrow('incomplete');
    expect(await store.settings.get('app')).toEqual(before);
    expect(await store.checks.get('live-fixture')).toEqual(live());
  });
  it('preserves unmarked partial telemetry instead of scaffolding over it', async () => {
    await store.sleep.add({...syntheticSleep[0]});
    expect(await initialize(time,store)).toMatchObject({status:'unavailable'});
    expect(await store.sleep.toArray()).toEqual([syntheticSleep[0]]);
    expect(await store.settings.count()).toBe(0);
  });
  it('rejects invalid initialization time without any seed writes', async () => {
    expect(await initialize('invalid',store)).toMatchObject({status:'unavailable'});
    expect(await store.sleep.count()).toBe(0);
  });
});
