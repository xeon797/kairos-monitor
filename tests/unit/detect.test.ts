import { describe, expect, it } from 'vitest';
import { criterionMet, evaluateDomains } from '../../src/engine/detect';
import { syntheticChecks, syntheticSleep } from '../../src/engine/scenarios';
import { baseline, check, rows, sleep } from './fixtures/engineOracle';

describe('calendar domain detection', () => {
  it.each(rows)('matches all domain counts and sustained states on day $day', row => {
    const results = evaluateDomains(row.day, baseline, syntheticSleep, syntheticChecks);
    expect(results.map(result => result.metDaysInWindow)).toEqual(row.counts);
    expect(results.filter(result => result.sustained).map(result => result.domain)).toEqual(row.sustained);
    expect(results.map(result => [result.evaluable, result.validDaysInWindow, result.windowDays])).toEqual([[true,5,5],[true,5,5],[true,5,5]]);
  });
  it.each([2,3])('requires three valid days (fixture has %i)', count => {
    const days = [10,11,12].slice(0,count);
    const result = evaluateDomains(12, baseline, days.map(day => sleep(day, { sleepHours: 5 })), days.map(day => check(day, { medianRtMs: 300, lapses: 4 })));
    expect(result.map(r => [r.evaluable, r.sustained, r.validDaysInWindow])).toEqual(Array.from({length:3}, () => [count === 3, count === 3, count]));
  });
  it('counts calendar gaps rather than last available records', () => {
    const result = evaluateDomains(12, baseline, [1,2,3,8,12].map(day => sleep(day, {sleepHours:5})), []);
    expect(result[0]).toMatchObject({validDaysInWindow:2, metDaysInWindow:2, evaluable:false, sustained:false});
  });
  it.each(['poor','missing'] as const)('excludes recorded %s provenance', quality => {
    expect(criterionMet('sleep',12,baseline,sleep(12,{sleepHours:5,quality}))).toBeNull();
    expect(criterionMet('reaction',12,baseline,check(12,{medianRtMs:310,quality}))).toBeNull();
    expect(criterionMet('attention',12,baseline,check(12,{lapses:4,quality}))).toBeNull();
  });
  it.each([{interruptions:3},{falseStarts:6},{validTrials:10}])('excludes technically poor check windows %j', changes => {
    const checks = syntheticChecks.map(record => record.day !== null && record.day >= 10 && record.day <= 12 ? {...record,...changes} : record);
    const result = evaluateDomains(12,baseline,syntheticSleep,checks);
    expect(result.map(r => r.validDaysInWindow)).toEqual([5,2,2]);
    expect(result[1].exclusions).toHaveLength(3);
    expect(result[1].exclusions[0].reasons.length).toBeGreaterThan(0);
  });
  it('keeps today missing, without substituting yesterday', () => {
    const result = evaluateDomains(12,baseline,syntheticSleep.filter(s => s.day !== 12),syntheticChecks.filter(c => c.day !== 12));
    expect(result[0].latest).toMatchObject({day:12,value:null,quality:'missing',source:null,deltaAbs:null});
    expect(result[1].latest.value).toBeNull();
  });
  it('isolates future and live records and preserves all inputs', () => {
    const before = JSON.stringify([baseline,syntheticSleep,syntheticChecks]);
    const expected = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const checks = syntheticChecks.map(c => c.day !== null && c.day > 12 ? {...c,medianRtMs:10000,lapses:100} : c);
    checks.push(check(12,{day:null,source:'live',timestamp:'2026-10-09T00:00:00.000Z',medianRtMs:10000}));
    const sleeps = syntheticSleep.map(s => s.day > 12 ? {...s,sleepHours:2} : s);
    sleeps.push(sleep(12,{source:'live',sleepHours:2}));
    expect(evaluateDomains(12,baseline,sleeps,checks)).toEqual(expected);
    expect(JSON.stringify([baseline,syntheticSleep,syntheticChecks])).toBe(before);
  });
  it('does not select an arbitrary duplicate observation', () => {
    const result = evaluateDomains(12,baseline,[sleep(),sleep()],[])[0];
    expect(result.validDaysInWindow).toBe(0);
    expect(result.latest.reasons.join(' ')).toContain('ambiguous');
  });
});

describe('inclusive unrounded criteria and partial OR branches', () => {
  it.each([270,269])('tests midpoint %i against 180', midpointMinutes => {
    expect(criterionMet('sleep',12,baseline,sleep(12,{midpointMinutes}))).toBe(midpointMinutes === 270);
  });
  it.each([true,false])('compares the exact sleep threshold (met=%s)', met => {
    expect(criterionMet('sleep',12,baseline,sleep(12,{sleepHours:50.5/7-1+(met?0:1e-12)}))).toBe(met);
  });
  it.each([true,false])('compares exact reaction threshold (met=%s)', met => {
    expect(criterionMet('reaction',12,baseline,check(12,{medianRtMs:265*1.08-(met?0:1e-12)}))).toBe(met);
  });
  it.each([3,2])('compares lapses %i at inclusive threshold', lapses => {
    expect(criterionMet('attention',12,baseline,check(12,{lapses}))).toBe(lapses === 3);
  });
  it.each([4,3])('compares integer errors %i using full-precision baseline', commissionErrors => {
    expect(criterionMet('attention',12,baseline,check(12,{commissionErrors}))).toBe(commissionErrors === 4);
  });
  it('tests an exact integer commission cutoff independently', () => {
    expect(criterionMet('attention',12,{...baseline,errorsMean:2},check(12,{commissionErrors:4}))).toBe(true);
    expect(criterionMet('attention',12,{...baseline,errorsMean:2},check(12,{commissionErrors:3}))).toBe(false);
  });
  it.each([
    {sleepHours:5,midpointMinutes:null,expected:true},
    {sleepHours:7.2,midpointMinutes:null,expected:null},
    {sleepHours:null,midpointMinutes:270,expected:true},
    {sleepHours:null,midpointMinutes:180,expected:null},
  ])('handles partial sleep %j', ({expected,...changes}) => {
    expect(criterionMet('sleep',12,baseline,sleep(12,changes))).toBe(expected);
  });
  it.each([
    {lapses:3,commissionErrors:null,expected:true},
    {lapses:1,commissionErrors:null,expected:null},
    {lapses:null,commissionErrors:4,expected:true},
    {lapses:null,commissionErrors:1,expected:null},
  ])('handles partial attention %j', ({expected,...changes}) => {
    expect(criterionMet('attention',12,baseline,check(12,changes))).toBe(expected);
  });
  it('uses each branch trial minimum without borrowing reaction validity', () => {
    expect(criterionMet('reaction',12,baseline,check(12,{validTrials:20,medianRtMs:300,lapses:null,commissionErrors:null}))).toBe(true);
    expect(criterionMet('attention',12,baseline,check(12,{validTrials:20,lapses:null,commissionErrors:4}))).toBeNull();
    expect(criterionMet('attention',12,baseline,check(12,{validTrials:20,lapses:3,commissionErrors:null}))).toBe(true);
  });
  it.each([NaN,Infinity,-1])('rejects invalid numeric input %s', value => {
    expect(criterionMet('reaction',12,baseline,check(12,{medianRtMs:value}))).toBeNull();
    expect(criterionMet('attention',12,baseline,check(12,{lapses:value}))).toBeNull();
    expect(criterionMet('sleep',12,baseline,sleep(12,{sleepHours:value}))).toBeNull();
  });
  it('requires baseline and the right source/day/observation kind', () => {
    expect(criterionMet('reaction',12,null,check())).toBeNull();
    expect(criterionMet('reaction',12,baseline,check(13))).toBeNull();
    expect(criterionMet('reaction',12,baseline,sleep())).toBeNull();
    expect(evaluateDomains(12,null,syntheticSleep,syntheticChecks).every(r => !r.evaluable && !r.sustained)).toBe(true);
  });
});
