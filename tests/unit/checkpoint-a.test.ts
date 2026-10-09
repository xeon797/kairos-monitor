import { describe, expect, it } from 'vitest';
import { computeBaseline } from '../../src/engine/baseline';
import { BASELINE_WINDOW, ENGINE_TARGET_MS } from '../../src/engine/config';
import { criterionMet, evaluateDomains, overallStatus } from '../../src/engine/detect';
import { buildEvidencePacket } from '../../src/engine/evidence';
import { getCheckQuality } from '../../src/engine/quality';
import { missionSchedule, syntheticChecks, syntheticSleep, taskLibrary } from '../../src/engine/scenarios';
import { evaluateTask } from '../../src/engine/taskContext';
import { explain, trendChip } from '../../src/engine/templates';
import { baseline as oracle, check, rows, sleep } from './fixtures/engineOracle';

function scenarioBaseline() {
  return computeBaseline(syntheticSleep,syntheticChecks,BASELINE_WINDOW,'2026-10-09T00:00:00.000Z','reaction');
}

describe('Checkpoint A adopted-data integration', () => {
  it('tests immediately adjacent representable sleep/RT/midpoint values without rounding', () => {
    const adjacent = (value: number, direction: 'up' | 'down') => {
      const view = new DataView(new ArrayBuffer(8));
      view.setFloat64(0,value);
      view.setBigUint64(0,view.getBigUint64(0)+(direction === 'up' ? 1n : -1n));
      return view.getFloat64(0);
    };
    const sleepCutoff = 50.5/7-1;
    const rtCutoff = 265*1.08;
    expect(criterionMet('sleep',12,oracle,sleep(12,{sleepHours:adjacent(sleepCutoff,'down')}))).toBe(true);
    expect(criterionMet('sleep',12,oracle,sleep(12,{sleepHours:sleepCutoff}))).toBe(true);
    expect(criterionMet('sleep',12,oracle,sleep(12,{sleepHours:adjacent(sleepCutoff,'up')}))).toBe(false);
    expect(criterionMet('reaction',12,oracle,check(12,{medianRtMs:adjacent(rtCutoff,'down')}))).toBe(false);
    expect(criterionMet('reaction',12,oracle,check(12,{medianRtMs:rtCutoff}))).toBe(true);
    expect(criterionMet('reaction',12,oracle,check(12,{medianRtMs:adjacent(rtCutoff,'up')}))).toBe(true);
    expect(criterionMet('sleep',12,oracle,sleep(12,{midpointMinutes:adjacent(270,'down')}))).toBe(false);
    expect(criterionMet('sleep',12,oracle,sleep(12,{midpointMinutes:270}))).toBe(true);
    expect(criterionMet('sleep',12,oracle,sleep(12,{midpointMinutes:adjacent(270,'up')}))).toBe(true);
  });
  it.each(rows)('matches the entire independent acceptance row on day $day with the computed baseline', row => {
    const baseline = scenarioBaseline();
    expect(baseline).not.toBeNull();
    const domains = evaluateDomains(row.day,baseline,syntheticSleep,syntheticChecks);
    expect(domains.map(d => d.metDaysInWindow)).toEqual(row.counts);
    expect(domains.filter(d => d.sustained).map(d => d.domain)).toEqual(row.sustained);
    expect(overallStatus(domains,baseline)).toBe(row.status);
    const taskPackets = taskLibrary.map(profile => buildEvidencePacket(row.day,baseline,domains,{profile,instance:missionSchedule.find(task => task.taskId === profile.id)}));
    expect(taskPackets.map(p => [p.task!.r,p.taskConcern])).toEqual([row.eva,row.eva,[row.inv[0],row.maintenance],row.inv]);
    taskPackets.forEach(packet => expect(explain(packet)).toContain(packet.task!.instanceId!));
  });
  it('preserves the supplied frozen baseline through every day and later-data changes', () => {
    const baseline = scenarioBaseline()!;
    const before = JSON.stringify(baseline);
    for (let day = 7; day <= 17; day++) {
      const domains = evaluateDomains(day,baseline,syntheticSleep,syntheticChecks);
      buildEvidencePacket(day,baseline,domains);
      taskLibrary.forEach(profile => evaluateTask(profile,domains,baseline));
    }
    const laterSleep = syntheticSleep.map(s => s.day > 7 ? {...s,sleepHours:2} : s);
    const laterChecks = syntheticChecks.map(c => c.day !== null && c.day > 7 ? {...c,medianRtMs:10000,lapses:50} : c);
    evaluateDomains(17,baseline,laterSleep,laterChecks);
    expect(JSON.stringify(baseline)).toBe(before);
    expect(Math.abs(baseline.sleepMeanHours-oracle.sleepMeanHours)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(baseline.errorsMean-oracle.errorsMean)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(baseline.midpointMeanMinutes-180)).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(baseline.lapsesMean-1)).toBeLessThanOrEqual(1e-9);
    expect(baseline).toMatchObject({rtMeanMs:265,frozenAt:'2026-10-09T00:00:00.000Z',window:[1,7]});
  });
  it('isolates live and altered future observations throughout classification and packets', () => {
    const baseline = scenarioBaseline();
    const expected = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const checks = syntheticChecks.map(c => c.day !== null && c.day > 12 ? {...c,medianRtMs:10000,commissionErrors:100} : c);
    checks.push(check(12,{day:null,source:'live',timestamp:'2026-10-09T00:00:00.000Z',medianRtMs:10000}));
    const domains = evaluateDomains(12,baseline,syntheticSleep,checks);
    expect(computeBaseline(syntheticSleep,checks,BASELINE_WINDOW,'2026-10-09T00:00:00.000Z','reaction')).toEqual(baseline);
    expect(buildEvidencePacket(12,baseline,domains)).toEqual(buildEvidencePacket(12,baseline,expected));
    taskLibrary.forEach(profile => expect(evaluateTask(profile,domains,baseline)).toEqual(evaluateTask(profile,expected,baseline)));
    expect(buildEvidencePacket(12,baseline,domains).provenance.every(p => p.source === 'synthetic')).toBe(true);
  });
  it.each([{kind:'reaction' as const,trials:19},{kind:'go_no_go' as const,trials:29}])('preserves explicit $kind minimum exclusions across the engine', ({kind,trials}) => {
    const checks = syntheticChecks.map(c => {
      if (c.day === null || ![10,11,12].includes(c.day)) return c;
      const changed = {...c,validTrials:trials};
      return {...changed,quality:getCheckQuality(changed,kind).quality};
    });
    const baseline = scenarioBaseline();
    const domains = evaluateDomains(12,baseline,syntheticSleep,checks);
    expect(domains.map(d => d.validDaysInWindow)).toEqual([5,2,2]);
    expect(overallStatus(domains,baseline)).toBe('INSUFFICIENT_DATA');
    taskLibrary.forEach(profile => expect(evaluateTask(profile,domains,baseline).concern).toBe('INSUFFICIENT_DATA'));
  });
  it('records measured engine timings against the configured target', () => {
    const baseline = scenarioBaseline();
    const domains = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const previous = evaluateDomains(11,baseline,syntheticSleep,syntheticChecks);
    const packet = buildEvidencePacket(12,baseline,domains,{profile:taskLibrary[0],instance:missionSchedule[0]});
    const calls: Record<string,() => unknown> = {
      baseline:scenarioBaseline,
      domains:() => evaluateDomains(12,baseline,syntheticSleep,syntheticChecks),
      status:() => overallStatus(domains,baseline),
      task:() => evaluateTask(taskLibrary[0],domains,baseline,missionSchedule[0]),
      packet:() => buildEvidencePacket(12,baseline,domains,{profile:taskLibrary[0],instance:missionSchedule[0]}),
      explanation:() => explain(packet),
      trend:() => trendChip(12,[],domains,previous),
    };
    const timings: Record<string,{meanMs:number;maxMs:number}> = {};
    for (const [name,call] of Object.entries(calls)) {
      call(); // Warm the module path; timings cover each following complete call.
      const samples = Array.from({length:100},() => {
        const start = performance.now();
        call();
        return performance.now()-start;
      });
      timings[name] = {meanMs:samples.reduce((sum,value) => sum+value,0)/samples.length,maxMs:Math.max(...samples)};
      expect(timings[name].maxMs).toBeLessThan(ENGINE_TARGET_MS);
    }
    console.info('Checkpoint A timing sample:', JSON.stringify({samplesPerCall:100,targetMs:ENGINE_TARGET_MS,timings}));
  });
});
