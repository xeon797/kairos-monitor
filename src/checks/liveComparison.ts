import type { LiveCheck } from '../db/db';
import { LIVE_BASELINE_CHECKS } from '../engine/config';
import { isCheckValid } from '../engine/quality';
import type { TestKind } from '../engine/types';

export const liveMetrics = {
  reaction: [{key:'medianRtMs',label:'Median reaction time',unit:'ms'}, {key:'lapses',label:'Lapses',unit:'count'}, {key:'falseStarts',label:'False starts',unit:'count'}],
  go_no_go: [{key:'commissionErrors',label:'Commission errors',unit:'count'}, {key:'omissionErrors',label:'Omission errors',unit:'count'}, {key:'falseStarts',label:'False starts',unit:'count'}],
} as const;
export function liveComparison(records:LiveCheck[],kind:TestKind) {
  const valid=records.filter(record=>record.source==='live'&&record.kind===kind&&isCheckValid(record,kind))
    .sort((a,b)=>a.timestamp.localeCompare(b.timestamp)||a.id.localeCompare(b.id));
  const first=valid.slice(0,LIVE_BASELINE_CHECKS);
  return {validCount:valid.length,ids:first.map(record=>record.id),metrics:first.length<LIVE_BASELINE_CHECKS?null:liveMetrics[kind].map(metric=>({
    ...metric,mean:first.reduce((sum,record)=>sum+record[metric.key]!,0)/LIVE_BASELINE_CHECKS,
  }))};
}
