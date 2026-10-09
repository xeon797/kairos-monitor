import { describe, expect, it } from 'vitest';
import { evaluateDomains, overallStatus } from '../../src/engine/detect';
import { syntheticChecks, syntheticSleep } from '../../src/engine/scenarios';
import { baseline, rows } from './fixtures/engineOracle';

describe('overall status precedence', () => {
  it.each(rows)('matches DEMO overall status on day $day', row => {
    expect(overallStatus(evaluateDomains(row.day,baseline,syntheticSleep,syntheticChecks),baseline)).toBe(row.status);
  });
  it('requires an explicit baseline, even with evaluable supplied results', () => {
    expect(overallStatus(evaluateDomains(12,baseline,syntheticSleep,syntheticChecks),null)).toBe('INSUFFICIENT_DATA');
    expect(overallStatus(evaluateDomains(12,null,syntheticSleep,syntheticChecks),baseline)).toBe('INSUFFICIENT_DATA');
  });
  it.each(['sleep','reaction','attention'] as const)('rejects an absent %s result', domain => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks).filter(r => r.domain !== domain);
    expect(overallStatus(results,baseline)).toBe('INSUFFICIENT_DATA');
  });
  it('rejects empty, duplicate and mixed-day results', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    expect(overallStatus([],baseline)).toBe('INSUFFICIENT_DATA');
    expect(overallStatus([...results,results[0]],baseline)).toBe('INSUFFICIENT_DATA');
    expect(overallStatus(results.map(r => r.domain === 'sleep' ? {...r,day:11} : r),baseline)).toBe('INSUFFICIENT_DATA');
  });
  it('keeps sleep sustained but insufficient overall when checks are missing', () => {
    const checks = syntheticChecks.filter(c => c.day !== null && ![10,11,12].includes(c.day));
    const results = evaluateDomains(12,baseline,syntheticSleep,checks);
    expect(results.map(r => [r.evaluable,r.sustained])).toEqual([[true,true],[false,false],[false,false]]);
    expect(overallStatus(results,baseline)).toBe('INSUFFICIENT_DATA');
  });
  it.each([{quality:'poor' as const},{interruptions:3},{falseStarts:6},{validTrials:10}])('excludes poor check windows %j', changes => {
    const checks = syntheticChecks.map(c => c.day !== null && [10,11,12].includes(c.day) ? {...c,...changes} : c);
    expect(overallStatus(evaluateDomains(12,baseline,syntheticSleep,checks),baseline)).toBe('INSUFFICIENT_DATA');
  });
  it('rejects missing sleep windows', () => {
    const sleep = syntheticSleep.map(s => [10,11,12].includes(s.day) ? {...s,sleepHours:null,quality:'missing' as const} : s);
    expect(overallStatus(evaluateDomains(12,baseline,sleep,syntheticChecks),baseline)).toBe('INSUFFICIENT_DATA');
  });
  it('uses all four statuses without mutating inputs', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const before = JSON.stringify([results,baseline]);
    for (const count of [0,1,2,3]) {
      const changed = results.map((r,i) => ({...r,sustained:i<count}));
      expect(overallStatus(changed,baseline)).toBe(['WITHIN_USUAL','CHANGE_NOTED','REVIEW_RECOMMENDED','REVIEW_RECOMMENDED'][count]);
    }
    expect(JSON.stringify([results,baseline])).toBe(before);
  });
});
