import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { isSyntheticExplanation } from '../../src/ai/explainClient';
import { getState, initialize, KairosDatabase, setDay } from '../../src/db/db';
import { evaluateDomains } from '../../src/engine/detect';
import { buildEvidencePacket } from '../../src/engine/evidence';
import { getCheckQuality } from '../../src/engine/quality';
import { missionSchedule, syntheticChecks, syntheticSleep, taskLibrary } from '../../src/engine/scenarios';
import { deriveAppState } from '../../src/state/appStore';
import { baseline } from './fixtures/engineOracle';

// DEMO §2's classification rows, boundaries, recovery, wording and source isolation
// already run in checkpoint-a/detect/status/taskContext/templates and storage tests.
// These cases close packet-value/provenance and persisted-edit gaps; see NOTES P10.
// Independent transcription of DEMO §1, not calculated from production fixtures.
const dailyEvidence=[
  {day:7,values:[7.3,180,270,1,1]}, {day:8,values:[7.1,180,268,1,1]},
  {day:9,values:[6,180,275,1,2]}, {day:10,values:[5.9,180,295,3,4]},
  {day:11,values:[5.7,180,305,4,4]}, {day:12,values:[5.4,180,312,5,5]},
  {day:13,values:[6.6,180,300,3,4]}, {day:14,values:[7,180,280,2,2]},
  {day:15,values:[7.2,180,270,1,1]}, {day:16,values:[7.3,180,265,1,1]},
  {day:17,values:[7.2,180,260,1,1]},
];
const databases:KairosDatabase[]=[];
afterEach(async()=>{
  const opened=databases.splice(0);opened.forEach(database=>database.close());
  for(const database of opened)await database.delete();
});

describe('P10 scenario acceptance gaps',()=>{
  it.each(dailyEvidence)('preserves each evidence value, unit, difference and provenance on day $day',({day,values})=>{
    const domains=evaluateDomains(day,baseline,syntheticSleep,syntheticChecks);
    const packets=[buildEvidencePacket(day,baseline,domains),...taskLibrary.map(profile=>
      buildEvidencePacket(day,baseline,domains,{profile,instance:missionSchedule.find(task=>task.taskId===profile.id)}))];
    for(const packet of packets) {
      const measurements=packet.domains.flatMap(domain=>domain.measurements);
      expect(measurements.map(value=>value.value)).toEqual(values);
      expect(measurements.map(value=>value.unit)).toEqual(['h','min','ms','count','count']);
      const means=[50.5/7,180,265,1,9/7];
      measurements.forEach((value,index)=>{
        expect(value.baseline).toBeCloseTo(means[index],9);
        expect(value.deltaAbs).toBeCloseTo(values[index]-means[index],9);
        expect(value).toMatchObject({day,source:'synthetic',quality:'good',reasons:[]});
      });
      expect(packet.provenance).toHaveLength(5);
      expect(packet.provenance.every(source=>source.source==='synthetic'&&source.label.includes(`day ${day}`))).toBe(true);
    }
  });

  it('keeps the saved baseline frozen across edits, advance and a new connection',async()=>{
    const database=new KairosDatabase('p10-frozen-edit');databases.push(database);
    const initial=await initialize(baseline.frozenAt,database);
    if(initial.status!=='ready')throw new Error(initial.error);
    const expected=deriveAppState({...initial,currentDay:12});
    await database.sleep.where('day').above(12).modify({sleepHours:2,midpointMinutes:400});
    await database.checks.where('source').equals('synthetic').filter(check=>check.day!==null&&check.day>12)
      .modify({medianRtMs:1000,lapses:30,commissionErrors:30});
    const day12=await setDay(12,database);
    expect(deriveAppState(day12)).toEqual(expected);
    await setDay(17,database);database.close();
    const reloaded=new KairosDatabase(database.name);databases.push(reloaded);
    const state=await initialize('2026-10-10T12:00:00.000Z',reloaded);
    if(state.status!=='ready')throw new Error(state.error);
    expect(state.currentDay).toBe(17);expect(state.baseline).toEqual(initial.baseline);
    expect(await reloaded.sleep.get(17)).toMatchObject({sleepHours:2,midpointMinutes:400});
    expect(await reloaded.sleep.count()).toBe(17);expect(await reloaded.checks.count()).toBe(17);
    expect((await getState(reloaded)).status).toBe('ready');
  });

  it.each([
    {kind:'reaction' as const,changes:{interruptions:3}},
    {kind:'reaction' as const,changes:{falseStarts:6}},
    {kind:'reaction' as const,changes:{validTrials:19}},
    {kind:'go_no_go' as const,changes:{validTrials:29}},
  ])('retains exclusion reasons and prevents AI eligibility for $kind poor-window $changes',({kind,changes})=>{
    const checks=syntheticChecks.map(check=>{
      if(check.day===null||![10,11,12].includes(check.day))return check;
      const changed={...check,...changes};return {...changed,quality:getCheckQuality(changed,kind).quality};
    });
    const domains=evaluateDomains(12,baseline,syntheticSleep,checks);
    const packet=buildEvidencePacket(12,baseline,domains);
    expect(packet.status).toBe('INSUFFICIENT_DATA');expect(isSyntheticExplanation(packet)).toBe(false);
    expect(packet.domains[1].latest).toMatchObject({value:312,day:12,source:'synthetic',quality:'poor',deltaAbs:null,deltaPct:null});
    for(const domain of packet.domains.slice(1)) {
      expect(domain.evaluable).toBe(false);
      expect(domain.exclusions.map(exclusion=>exclusion.day)).toEqual([10,11,12]);
      expect(domain.exclusions.every(exclusion=>exclusion.reasons.length>0)).toBe(true);
    }
    expect(syntheticChecks.filter(check=>check.day!==null&&[10,11,12].includes(check.day)).every(check=>check.quality==='good'&&check.interruptions===0&&check.falseStarts===0&&check.validTrials===40)).toBe(true);
  });
});
