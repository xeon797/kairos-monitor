import { describe, expect, it } from 'vitest';
import { buildTrendData } from '../../src/components/trendData';
import { evaluateDomains } from '../../src/engine/detect';
import { syntheticSleep, syntheticChecks } from '../../src/engine/scenarios';
import { baseline, check, rows, sleep } from './fixtures/engineOracle';
import type { CheckObservation, SleepObservation } from '../../src/engine/types';

function charts(day=12, sleeps:readonly SleepObservation[]=syntheticSleep, checks:readonly CheckObservation[]=syntheticChecks, saved=baseline) {
  return buildTrendData(day,saved,sleeps,checks,evaluateDomains(day,saved,sleeps,checks));
}
describe('Trends evidence presentation',()=>{
  for(const day of [7,12,15,16]) it(`matches independent day-${day} window oracle and excludes future days`,()=>{
    const expected=rows.find(row=>row.day===day)!;
    const result=charts(day);
    expect(result.map(chart=>chart.summary.metDaysInWindow)).toEqual(expected.counts);
    expect(result.filter(chart=>chart.summary.sustained).map(chart=>chart.domain)).toEqual(expected.sustained);
    for(const chart of result){
      expect(chart.summary.evaluable).toBe(true);
      expect(chart.summary.validDaysInWindow).toBe(5);
      expect(chart.points.map(point=>point.day)).toEqual(Array.from({length:day},(_,i)=>i+1));
      expect(chart.baselineWindow).toEqual([1,7]);
    }
  });
  it('keeps full precision and the saved baseline rather than recomputing it',()=>{
    const saved={...baseline,sleepMeanHours:7.123456789,errorsMean:1.23456789};
    const result=charts(12,syntheticSleep,syntheticChecks,saved);
    expect(result[0].series[0].baseline).toBe(7.123456789);
    expect(result[0].series[0].criterion).toBe(6.123456789);
    expect(result[1].series[0].criterion).toBe(265*1.08);
    expect(result[2].series[1].criterion).toBe(3.23456789);
    expect(saved.sleepMeanHours).toBe(7.123456789);
  });
  for(const quality of ['poor','missing'] as const) it(`renders ${quality} values as gaps while retaining exclusions`,()=>{
    const result=charts(12,[sleep(12,{sleepHours:5,quality})],[check(12,{medianRtMs:400,quality})]);
    expect(result[0].points[11].sleepHours).toBeNull();
    expect(result[1].points[11].medianRtMs).toBeNull();
    expect(result[2].points[11].lapses).toBeNull();
    expect(result[0].points[11].marked.sleepHours).toBe(false);
    expect(result[0].summary.evaluable).toBe(false);
    expect(result[0].points[11].measurements[0].reasons.length).toBeGreaterThan(0);
  });
  it('leaves absent observations as gaps and never uses live values',()=>{
    const result=charts(12,[sleep(12,{source:'live'})],[]);
    expect(result[0].points[11].sleepHours).toBeNull();
    expect(result[1].points[11].medianRtMs).toBeNull();
    expect(result[0].points[11].domainMet).toBeNull();
  });
  it('marks each attention series independently while retaining the engine OR result',()=>{
    const point=charts(12,[sleep()],[check(12,{lapses:2,commissionErrors:4})])[2].points[11];
    expect(point.marked).toEqual({lapses:false,commissionErrors:true});
    expect(point.domainMet).toBe(true);
  });
  it('preserves a midpoint-only sleep criterion in the marker and text evidence',()=>{
    const point=charts(12,[sleep(12,{midpointMinutes:270})],[check()])[0].points[11];
    expect(point.marked.sleepHours).toBe(true);
    expect(point.measurements.find(m=>m.metric==='midpointMinutes')?.value).toBe(270);
  });
  it('does not present lines or criteria when the frozen baseline is unavailable',()=>{
    const result=buildTrendData(12,null,syntheticSleep,syntheticChecks,evaluateDomains(12,null,syntheticSleep,syntheticChecks));
    expect(result.every(chart=>chart.series.every(series=>series.baseline===null&&series.criterion===null))).toBe(true);
    expect(result.every(chart=>!chart.summary.evaluable)).toBe(true);
  });
});
