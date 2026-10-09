import { describe, expect, it } from 'vitest';
import { evaluateDomains } from '../../src/engine/detect';
import { buildEvidencePacket } from '../../src/engine/evidence';
import { missionSchedule, syntheticChecks, syntheticSleep, taskLibrary } from '../../src/engine/scenarios';
import { baseline, check, rows, sleep } from './fixtures/engineOracle';

describe('evidence packets', () => {
  it.each(rows)('preserves independently expected counts/status for day $day', row => {
    const packet = buildEvidencePacket(row.day,baseline,evaluateDomains(row.day,baseline,syntheticSleep,syntheticChecks));
    expect(packet.status).toBe(row.status);
    expect(packet.domains.map(d => d.metDaysInWindow)).toEqual(row.counts);
    expect(packet.domains.filter(d => d.sustained).map(d => d.domain)).toEqual(row.sustained);
    expect(packet.dataQuality).toEqual({validSleepDays:5,validCheckDays:5,windowDays:5,notes:[]});
  });
  it('carries all day-12 values, units, signed differences and baseline precision', () => {
    const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,syntheticSleep,syntheticChecks));
    expect(packet.baseline).toEqual(baseline);
    const measured = packet.domains.flatMap(d => d.measurements);
    expect(measured.map(m => [m.metric,m.value,m.unit,m.baseline])).toEqual([
      ['sleepHours',5.4,'h',50.5/7], ['midpointMinutes',180,'min',180],
      ['medianRtMs',312,'ms',265], ['lapses',5,'count',1], ['commissionErrors',5,'count',9/7],
    ]);
    expect(measured.map(m => m.deltaAbs)).toEqual([5.4-50.5/7,0,47,4,5-9/7]);
    expect(measured[2].deltaPct).toBeCloseTo(47/265*100,12);
    expect(measured[0].deltaAbs).toBeLessThan(0);
    expect(measured.every(m => m.source === 'synthetic' && m.quality === 'good' && m.day === 12)).toBe(true);
    expect(packet.provenance).toHaveLength(5);
    expect(packet.provenance.every(p => p.source === 'synthetic' && p.label.includes('day 12') && p.label.includes('good quality'))).toBe(true);
  });
  it('retains each task instance, demand, relevant domains and own concern', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const eva = buildEvidencePacket(12,baseline,results,{profile:taskLibrary[0],instance:missionSchedule[0]});
    const inv = buildEvidencePacket(12,baseline,results,{profile:taskLibrary[3],instance:missionSchedule[1]});
    expect(eva).toMatchObject({taskId:'EVA-07',taskConcern:'REVIEW_RECOMMENDED',task:{taskId:'EVA',demand:'high',r:3,relevantDomains:['sleep','reaction','attention']}});
    expect(inv).toMatchObject({taskId:'INV-03',taskConcern:'CHANGE_NOTED',task:{taskId:'INV',demand:'low',r:2,relevantDomains:['sleep','attention']}});
    expect(inv.reviewPrompt).not.toContain('repeat');
    expect(inv.reviewPrompt).not.toBe(eva.reviewPrompt);
  });
  it('preserves null current measurements and their reasons', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep.filter(s => s.day !== 12),syntheticChecks.filter(c => c.day !== 12));
    const packet = buildEvidencePacket(12,baseline,results);
    expect(packet.domains.every(d => d.latest.value === null && d.latest.deltaAbs === null && d.latest.day === 12)).toBe(true);
    expect(packet.dataQuality).toMatchObject({validSleepDays:4,validCheckDays:4});
    expect(packet.dataQuality.notes.join(' ')).toContain('No observation');
    expect(packet.provenance).toEqual([]);
  });
  it('keeps excluded raw values and provenance, without computing differences', () => {
    const checks = syntheticChecks.map(c => c.day === 12 ? {...c,interruptions:3} : c);
    const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,syntheticSleep,checks));
    expect(packet.domains[1].latest).toMatchObject({value:312,quality:'poor',source:'synthetic',deltaAbs:null,deltaPct:null});
    expect(packet.domains[1].latest.reasons.join(' ')).toContain('interruptions');
  });
  it.each([NaN,Infinity,-Infinity])('represents nonfinite input %s as absent numeric evidence with exclusion reason', medianRtMs => {
    const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,[sleep()],[check(12,{medianRtMs})]));
    expect(packet.domains[1].latest).toMatchObject({value:null,quality:'poor',deltaAbs:null});
    expect(packet.domains[1].latest.reasons.join(' ')).toContain('finite');
  });
  it('does not convert missing baseline into zero or a positive status', () => {
    const packet = buildEvidencePacket(12,null,evaluateDomains(12,null,syntheticSleep,syntheticChecks));
    expect(packet.baseline).toBeNull();
    expect(packet.status).toBe('INSUFFICIENT_DATA');
    expect(packet.domains.every(d => d.latest.baseline === null && d.latest.deltaAbs === null)).toBe(true);
  });
  it('does not relabel earlier results as current evidence', () => {
    const packet = buildEvidencePacket(12,baseline,evaluateDomains(11,baseline,syntheticSleep,syntheticChecks));
    expect(packet.status).toBe('INSUFFICIENT_DATA');
    expect(packet.domains.every(d => d.latest.day === 12 && d.latest.value === null)).toBe(true);
  });
  it('reports intersection of check days, rather than minimum domain count', () => {
    const checks = [8,9,10,11,12].map(day => check(day,{medianRtMs:day === 8 ? null : 300,lapses:day === 9 ? null : 3,commissionErrors:day === 9 ? null : 4}));
    const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,syntheticSleep,checks));
    expect(packet.domains.map(d => d.validDaysInWindow)).toEqual([5,4,4]);
    expect(packet.dataQuality.validCheckDays).toBe(3);
  });
  it('keeps a zero baseline percentage undefined, not infinite', () => {
    const packet = buildEvidencePacket(12,{...baseline,lapsesMean:0},evaluateDomains(12,{...baseline,lapsesMean:0},[sleep()],[check(12,{lapses:3})]));
    expect(packet.domains[2].latest.deltaAbs).toBe(3);
    expect(packet.domains[2].latest.deltaPct).toBeNull();
  });
  it('returns deterministic detached data without input mutation', () => {
    const domains = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const before = JSON.stringify([domains,baseline,taskLibrary,missionSchedule]);
    const build = () => buildEvidencePacket(12,baseline,domains,{profile:taskLibrary[0],instance:missionSchedule[0]});
    expect(build()).toEqual(build());
    const packet = build();
    packet.baseline!.window[0] = 2;
    packet.domains[0].measurements[0].reasons.push('caller mutation');
    packet.domains[0].latest.reasons.push('caller mutation');
    packet.task!.relevantDomains.pop();
    expect(JSON.stringify([domains,baseline,taskLibrary,missionSchedule])).toBe(before);
  });
});
