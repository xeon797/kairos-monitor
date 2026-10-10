import type { LiveCheck } from '../db/db';
import type { TestKind } from '../engine/types';
import { liveComparison } from './liveComparison';
import { isLiveRecord } from './liveRecord';
import { isCheckValid } from '../engine/quality';
export function LiveComparison({records,kind,result}:{records:LiveCheck[];kind:TestKind;result?:LiveCheck|null}) {
  const comparison=liveComparison(records,kind);
  const comparable=result&&isLiveRecord(result)&&result.kind===kind&&isCheckValid(result,kind)?result:null;
  return <div className="live-comparison">
    {comparison.metrics?<><p>Live personal baseline · mean of the first 3 valid {kind==='reaction'?'reaction':'attention'} checks. Later checks do not move this baseline.</p>
      <dl>{comparison.metrics.map(metric=><div key={metric.key}><dt>{metric.label}</dt><dd>{metric.mean.toFixed(1)} {metric.unit} baseline{comparable&&comparable[metric.key]!==null?` · ${(comparable[metric.key]!-metric.mean)>=0?'+':''}${(comparable[metric.key]!-metric.mean).toFixed(1)} ${metric.unit} difference`:''}</dd></div>)}</dl>
    </>:<p>Live results are shown as raw values. Compare after 3 checks.</p>}
    <p>{comparison.validCount} valid {kind==='reaction'?'reaction':'attention'} {comparison.validCount===1?'check':'checks'} saved. Test types are compared separately; poor results are excluded. Comparisons describe measurements only.</p>
  </div>;
}
