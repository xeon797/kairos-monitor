import type { LiveCheck } from '../db/db';
import type { TestKind } from '../engine/types';
import { liveComparison } from './liveComparison';
export function LiveComparison({records,kind,result}:{records:LiveCheck[];kind:TestKind;result?:LiveCheck|null}) {
  const comparison=liveComparison(records,kind);
  return <div className="live-comparison">
    {comparison.metrics?<><p>Live personal baseline · mean of the first 3 valid {kind==='reaction'?'reaction':'attention'} checks. Later checks do not move this baseline.</p>
      <dl>{comparison.metrics.map(metric=><div key={metric.key}><dt>{metric.label}</dt><dd>{metric.mean.toFixed(1)} {metric.unit} baseline{result&&result.quality==='good'&&result[metric.key]!==null?` · ${(result[metric.key]!-metric.mean)>=0?'+':''}${(result[metric.key]!-metric.mean).toFixed(1)} ${metric.unit} difference`:''}</dd></div>)}</dl>
    </>:<p>Live results are shown as raw values. Compare after 3 checks.</p>}
    <p>{comparison.validCount} valid {kind==='reaction'?'reaction':'attention'} checks saved. Test types are compared separately; poor results are excluded. Comparisons describe measurements only.</p>
  </div>;
}
