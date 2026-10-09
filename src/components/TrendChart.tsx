import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TrendData, TrendMetric, TrendPoint } from './trendData';
import { trendNumber } from './trendData';
import { SyntheticBadge } from './SyntheticBadge';

function Marker({cx,cy,payload,metric,square,color}:{cx?:number;cy?:number;payload?:TrendPoint;metric:TrendMetric;square:boolean;color:string}) {
  if(cx===undefined||cy===undefined||payload?.[metric]===null)return null;
  if(payload?.marked[metric])return square?<rect className="criterion-marker" data-day={payload.day} x={cx-5} y={cy-5} width={10} height={10} fill="var(--chart-criterion)" stroke="var(--color-lavender)" strokeWidth={1.5}/>:<path className="criterion-marker" data-day={payload.day} d={`M ${cx} ${cy-6} l 6 6 -6 6 -6 -6 Z`} fill="var(--chart-criterion)" stroke="var(--color-lavender)" strokeWidth={1.5}/>;
  return square?<rect x={cx-3} y={cy-3} width={6} height={6} fill={color}/>:<circle cx={cx} cy={cy} r={3} fill={color}/>;
}

export function TrendChart({chart}:{chart:TrendData}) {
  const {summary}=chart;
  const state=!summary.evaluable?'Insufficient data':summary.sustained?'Sustained':'Not sustained';
  const id=`trend-${chart.domain}`;
  return <article className="panel trend-card" aria-labelledby={`${id}-title`} data-domain={chart.domain}>
    <div className="card-heading"><div><p className="eyebrow">Personal baseline / {chart.series[0].unit}</p><h2 id={`${id}-title`}>{chart.title}</h2></div><SyntheticBadge/></div>
    <div className="trend-summary"><p>Criterion met on <strong>{summary.metDaysInWindow} of the last {summary.windowDays} days</strong></p><span className={`evidence-state ${!summary.evaluable?'status-insufficient_data':summary.sustained?'status-change_noted':''}`}><span aria-hidden="true">{!summary.evaluable?'○':summary.sustained?'◐':'—'}</span> {state}</span><span>{summary.validDaysInWindow} valid days · {summary.evaluable?'Evaluable':'Not evaluable'}</span></div>
    <div className="trend-reference-list">{chart.series.map(series=><p key={series.metric}><strong>{series.label}</strong> · Baseline <span data-baseline={series.baseline??''}>{trendNumber(series.baseline,series.unit)} {series.unit}</span> · Criterion <span data-criterion={series.criterion??''}>{chart.domain==='sleep'?'≤':'≥'} {trendNumber(series.criterion,series.unit)} {series.unit}</span></p>)}</div>
    <div className="trend-plot" role="img" aria-label={`${chart.title} through mission day ${summary.day}. Exact evidence and exclusions are available in the data table below.`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={chart.points} margin={{top:16,right:12,bottom:24,left:0}} accessibilityLayer={false}>
          <CartesianGrid stroke="var(--chart-grid)" vertical={false}/>
          <XAxis type="number" dataKey="day" domain={[1,summary.day]} ticks={chart.points.map(p=>p.day)} minTickGap={16} tick={{fill:'var(--text-muted)',fontSize:12}} stroke="var(--chart-grid)" label={{value:'Mission day',position:'insideBottom',offset:-14,fill:'var(--text-muted)'}}/>
          <YAxis width={42} tick={{fill:'var(--text-muted)',fontSize:12}} stroke="var(--chart-grid)" domain={['auto','auto']} tickFormatter={value=>trendNumber(Number(value),chart.series[0].unit)}/>
          <ReferenceArea x1={chart.baselineWindow[0]} x2={Math.min(chart.baselineWindow[1],summary.day)} fill="var(--chart-baseline-band)" fillOpacity={1} stroke="none"/>
          {chart.series.map(series=><ReferenceLine key={`baseline-${series.metric}`} y={series.baseline??undefined} stroke="var(--chart-baseline)" strokeDasharray={series.square?'8 4':'4 4'} ifOverflow="extendDomain"/>)}
          {chart.series.map(series=><ReferenceLine key={`criterion-${series.metric}`} y={series.criterion??undefined} stroke="var(--chart-criterion)" strokeDasharray={series.square?'6 3 1 3':'1 4'} ifOverflow="extendDomain"/>)}
          <Tooltip content={({active,payload,label})=>active&&payload?.length?<div className="trend-tooltip"><strong>Mission day {label}</strong>{payload.map(item=><p key={String(item.dataKey)}>{item.name}: {trendNumber(typeof item.value==='number'?item.value:null,chart.series[0].unit)} {chart.series[0].unit}</p>)}<p>Source and quality in data table.</p></div>:null}/>
          {chart.series.map(series=><Line key={series.metric} type="linear" dataKey={series.metric} name={series.label} stroke={series.color} strokeWidth={2} strokeDasharray={series.square?'6 3':undefined} connectNulls={false} isAnimationActive={false} dot={props=><Marker {...props} metric={series.metric} square={series.square} color={series.color}/>} activeDot={false}/>)}
        </LineChart>
      </ResponsiveContainer>
    </div>
    <ul className="trend-legend" aria-label={`${chart.title} legend`}><li>◯ {chart.series[0].label}{chart.series.length>1?' · □ Commission errors (dashed)':''}</li><li>– – Frozen baseline{chart.series.length>1?' · longer dash for errors':''}</li><li>··· Criterion{chart.series.length>1?' · dash-dot for errors':''}</li><li>◆ Larger outlined {chart.series.length>1?'diamond / square':'diamond'}: criterion met</li><li>Shaded band: baseline days {chart.baselineWindow[0]}–{chart.baselineWindow[1]}</li><li>Gaps: missing or poor data</li></ul>
    {chart.domain==='sleep'&&<p className="trend-note">Sleep criteria include duration or midpoint shift. Midpoint evidence appears in the data table; a marked point may reflect either criterion.</p>}
    {chart.domain==='attention'&&<p className="trend-note">Each series marks its own criterion. The attention count above uses lapses or commission errors, as evaluated by the engine.</p>}
    <details className="trend-table"><summary>View {chart.title.toLowerCase()} data table</summary><table><caption>{chart.title} · Synthetic mission telemetry · through day {summary.day}. Values rounded for display only.</caption><thead><tr><th scope="col">Day</th><th scope="col">Evidence</th><th scope="col">Domain criterion</th></tr></thead><tbody>{chart.points.map(point=><tr key={point.day} data-day={point.day}><th scope="row">{point.day}</th><td>{point.measurements.map(m=><div className="trend-table-measurement" key={m.metric}><strong>{m.metric==='midpointMinutes'?'Sleep midpoint':chart.series.find(s=>s.metric===m.metric)?.label}</strong>: {m.quality==='good'?trendNumber(m.value,m.unit):'—'} {m.unit}<span>{m.source==='synthetic'?'Synthetic':m.source==='live'?'Live browser test':'Source unavailable'} · {m.quality} quality</span>{m.reasons.length>0&&<span>{m.reasons.join(' ')}</span>}</div>)}</td><td>{point.domainMet===null?'Not evaluable':point.domainMet?'Met':'Not met'}</td></tr>)}</tbody></table></details>
  </article>;
}
