import { useMemo } from 'react';
import { useApp } from '../state/useApp';
import { buildTrendData } from '../components/trendData';
import { TrendChart } from '../components/TrendChart';
import '../styles/trends.css';

export default function Trends() {
  const app=useApp();
  const charts=useMemo(()=>app.currentDay&&app.packet?buildTrendData(app.currentDay,app.baseline,app.visibleSleep,app.visibleChecks,app.packet.domains):[],[app.currentDay,app.baseline,app.visibleSleep,app.visibleChecks,app.packet]);
  return <section aria-labelledby="screen-heading"><div className="screen-heading"><p className="eyebrow">Kairos Monitor / Personal patterns</p><h1 id="screen-heading">Trends</h1><p className="screen-subtitle">Your measures, alongside your frozen baseline.</p></div>
    {app.loading||app.error?<p className="panel status-insufficient_data" role="status">Insufficient data · {app.loading?'Loading local mission storage.':'Local mission storage unavailable.'}</p>:<><p className="trend-intro">Observations through mission day {app.currentDay}. Baseline: days {app.baseline?.window.join('–')??'unavailable'} · Frozen. Criterion lines are experimental and illustrative.</p><div className="trend-cards">{charts.map(chart=><TrendChart chart={chart} key={chart.domain}/>)}</div></>}
    <aside className="panel hrv-placeholder"><h2>HRV</h2><p>Supporting context only. Not available in this prototype.</p></aside>
  </section>;
}
