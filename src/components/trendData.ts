import { ERRORS_INCREASE, LAPSES_INCREASE, RT_INCREASE_FACTOR, SLEEP_DEFICIT_HOURS, BASELINE_WINDOW } from '../engine/config';
import { criterionMet, evaluateDomains } from '../engine/detect';
import type { Baseline, CheckObservation, Domain, DomainResult, MeasurementEvidence, SleepObservation } from '../engine/types';

export type TrendMetric = 'sleepHours' | 'medianRtMs' | 'lapses' | 'commissionErrors';
export interface TrendSeries { metric:TrendMetric; label:string; unit:string; baseline:number|null; criterion:number|null; color:string; square:boolean }
export interface TrendPoint {
  day:number;
  sleepHours?:number|null; medianRtMs?:number|null; lapses?:number|null; commissionErrors?:number|null;
  measurements:MeasurementEvidence[]; domainMet:boolean|null; marked:Partial<Record<TrendMetric,boolean>>;
}
export interface TrendData { domain:Domain; title:string; series:TrendSeries[]; points:TrendPoint[]; summary:DomainResult; baselineWindow:readonly [number,number] }

/** Presentation only: reference-line arithmetic uses saved means and engine config. */
export function buildTrendData(day:number,baseline:Baseline|null,sleep:readonly SleepObservation[],checks:readonly CheckObservation[],domains:readonly DomainResult[]):TrendData[] {
  const series:Record<Domain,TrendSeries[]> = {
    sleep:[{metric:'sleepHours',label:'Sleep duration',unit:'h',baseline:baseline?.sleepMeanHours??null,criterion:baseline?baseline.sleepMeanHours-SLEEP_DEFICIT_HOURS:null,color:'var(--chart-series-1)',square:false}],
    reaction:[{metric:'medianRtMs',label:'Median reaction time',unit:'ms',baseline:baseline?.rtMeanMs??null,criterion:baseline?baseline.rtMeanMs*RT_INCREASE_FACTOR:null,color:'var(--chart-series-1)',square:false}],
    attention:[{metric:'lapses',label:'Lapses',unit:'count',baseline:baseline?.lapsesMean??null,criterion:baseline?baseline.lapsesMean+LAPSES_INCREASE:null,color:'var(--chart-series-1)',square:false},
      {metric:'commissionErrors',label:'Commission errors',unit:'count',baseline:baseline?.errorsMean??null,criterion:baseline?baseline.errorsMean+ERRORS_INCREASE:null,color:'var(--chart-series-2)',square:true}],
  };
  const rows = Array.from({length:Math.max(0,day)},(_,index)=>{
    const missionDay=index+1;
    return {day:missionDay,domains:evaluateDomains(missionDay,baseline,sleep,checks)};
  });
  return domains.map(summary=>({domain:summary.domain,title:summary.domain==='sleep'?'Sleep hours':summary.domain==='reaction'?'Median reaction time':'Lapses and commission errors',series:series[summary.domain],summary,baselineWindow:baseline?.window??BASELINE_WINDOW,
    points:rows.map(row=>{
      const measurements=row.domains.find(d=>d.domain===summary.domain)!.measurements;
      const observations=summary.domain==='sleep'?sleep:checks;
      const matches=observations.filter(obs=>obs.source==='synthetic'&&obs.day===row.day);
      const domainMet=criterionMet(summary.domain,row.day,baseline,matches.length===1?matches[0]:undefined);
      const point:TrendPoint={day:row.day,measurements,domainMet,marked:{}};
      for(const item of series[summary.domain]){
        const measurement=measurements.find(m=>m.metric===item.metric)!;
        const value=measurement.quality==='good'?measurement.value:null;
        point[item.metric]=value;
        // Each attention series marks its own cutoff; the table retains the OR-domain result.
        point.marked[item.metric]=value!==null&&item.criterion!==null&&(summary.domain==='sleep'?domainMet===true:value>=item.criterion);
      }
      return point;
    }),
  }));
}

export function trendNumber(value:number|null,unit:string):string {
  return value===null?'—':value.toLocaleString('en-US',{maximumFractionDigits:unit==='ms'?1:2});
}
