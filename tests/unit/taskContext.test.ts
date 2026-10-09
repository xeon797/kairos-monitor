import { describe, expect, it } from 'vitest';
import { evaluateDomains } from '../../src/engine/detect';
import { missionSchedule, syntheticChecks, syntheticSleep, taskLibrary } from '../../src/engine/scenarios';
import { evaluateTask } from '../../src/engine/taskContext';
import { baseline, rows } from './fixtures/engineOracle';

describe('current evidence task context', () => {
  it.each(rows)('matches every task concern/count on day $day', row => {
    const results = evaluateDomains(row.day,baseline,syntheticSleep,syntheticChecks);
    const tasks = taskLibrary.map(profile => evaluateTask(profile,results,baseline,missionSchedule.find(task => task.taskId === profile.id)));
    expect(tasks.map(task => [task.r,task.concern])).toEqual([row.eva,row.eva,[row.inv[0],row.maintenance],row.inv]);
    expect(tasks.map(task => task.taskId)).toEqual(['EVA','DOCK','MAINT','INV']);
  });
  it('retains instance IDs and compares current day rather than scheduled day', () => {
    const result = evaluateTask(taskLibrary[0],evaluateDomains(12,baseline,syntheticSleep,syntheticChecks),baseline,missionSchedule[0]);
    expect(result).toMatchObject({instanceId:'EVA-07',taskId:'EVA',scheduledDay:14,day:12,r:3,concern:'REVIEW_RECOMMENDED',sustainedDomains:['sleep','reaction','attention']});
    expect(evaluateTask(taskLibrary[0],evaluateDomains(7,baseline,syntheticSleep,syntheticChecks),baseline,{...missionSchedule[0],scheduledDay:17}).concern).toBe('NO_RELEVANT_CHANGE');
  });
  it('caps low demand even when all three domains are relevant and sustained', () => {
    const profile = {...taskLibrary[3],relevantDomains:['sleep','reaction','attention'] as const};
    expect(evaluateTask(profile,evaluateDomains(12,baseline,syntheticSleep,syntheticChecks),baseline)).toMatchObject({r:3,concern:'CHANGE_NOTED'});
  });
  it('ignores unavailable or absent irrelevant reaction for inventory', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const missing = results.map(r => r.domain === 'reaction' ? {...r,evaluable:false,baselineEstablished:false,day:1} : r);
    expect(evaluateTask(taskLibrary[3],missing,baseline).concern).toBe('CHANGE_NOTED');
    expect(evaluateTask(taskLibrary[3],missing.filter(r => r.domain !== 'reaction'),baseline).concern).toBe('CHANGE_NOTED');
    expect(evaluateTask(taskLibrary[0],missing,baseline).concern).toBe('INSUFFICIENT_DATA');
  });
  it.each(['sleep','attention'] as const)('requires relevant %s result for inventory', domain => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    expect(evaluateTask(taskLibrary[3],results.filter(r => r.domain !== domain),baseline).concern).toBe('INSUFFICIENT_DATA');
    expect(evaluateTask(taskLibrary[3],results.map(r => r.domain === domain ? {...r,evaluable:false} : r),baseline).concern).toBe('INSUFFICIENT_DATA');
  });
  it('invalidates all tasks with no baseline', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    expect(taskLibrary.map(profile => evaluateTask(profile,results,null).concern)).toEqual(Array(4).fill('INSUFFICIENT_DATA'));
  });
  it.each(['missing_checks','poor_checks','missing_sleep'] as const)('invalidates all official tasks for %s', mode => {
    const checks = mode === 'missing_checks' ? syntheticChecks.filter(c => c.day !== null && ![10,11,12].includes(c.day))
      : mode === 'poor_checks' ? syntheticChecks.map(c => c.day !== null && [10,11,12].includes(c.day) ? {...c,interruptions:3} : c) : syntheticChecks;
    const sleep = mode === 'missing_sleep' ? syntheticSleep.map(s => [10,11,12].includes(s.day) ? {...s,sleepHours:null,quality:'missing' as const} : s) : syntheticSleep;
    const results = evaluateDomains(12,baseline,sleep,checks);
    expect(taskLibrary.map(profile => evaluateTask(profile,results,baseline).concern)).toEqual(Array(4).fill('INSUFFICIENT_DATA'));
  });
  it('rejects mismatched task profiles and instances', () => {
    expect(evaluateTask(taskLibrary[3],evaluateDomains(12,baseline,syntheticSleep,syntheticChecks),baseline,missionSchedule[0]).concern).toBe('INSUFFICIENT_DATA');
  });
  it('preserves all inputs', () => {
    const results = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const before = JSON.stringify([taskLibrary,missionSchedule,results,baseline]);
    taskLibrary.forEach(profile => evaluateTask(profile,results,baseline,missionSchedule.find(task => task.taskId === profile.id)));
    expect(JSON.stringify([taskLibrary,missionSchedule,results,baseline])).toBe(before);
  });
});
