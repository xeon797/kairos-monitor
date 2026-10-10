import { useEffect, useRef, useState } from 'react';
import { ReactionTest } from '../checks/ReactionTest';
import { GoNoGoTest } from '../checks/GoNoGoTest';
import { LiveComparison } from '../checks/LiveBaselineView';
import { liveMetrics } from '../checks/liveComparison';
import { LIVE_HISTORY_LIMIT } from '../engine/config';
import { getCheckQuality } from '../engine/quality';
import type { TestKind } from '../engine/types';
import { useApp } from '../state/useApp';
import '../styles/checks.css';

export default function Check() {
  const app=useApp();
  const [session,setSession]=useState<{kind:TestKind;practice:boolean}|null>(null);
  const [notice,setNotice]=useState('');
  const trigger=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>{if(!session)trigger.current?.focus();},[session]);
  const close=(count:number)=>{setSession(null);setNotice(`Returned to Check after ${count} recorded ${session?.kind==='reaction'?'trials':'stimuli'}. ${session?.practice?'Practice is never saved.':'Only explicitly saved completed results are stored.'}`);trigger.current?.focus();};
  const history=[...app.liveChecks].sort((a,b)=>b.timestamp.localeCompare(a.timestamp)||b.id.localeCompare(a.id)).slice(0,LIVE_HISTORY_LIMIT);
  return <section aria-labelledby="screen-heading">
    <div className="screen-heading"><p className="eyebrow">Kairos Monitor / Live browser checks</p><h1 id="screen-heading">Check</h1><p className="screen-subtitle">Measure on this device. Review your own results.</p></div>
    <div className="check-card-grid">{(['reaction','go_no_go'] as const).map(kind=>{
      const name=kind==='reaction'?'reaction':'attention';
      return <article className="panel check-choice" key={kind} aria-label={`${name} check choices`}>
        <span className="icon-container" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/>{kind==='reaction'?<path d="M12 5v7l4 3"/>:<rect x="8" y="8" width="8" height="8"/>}</svg></span>
        <h2>{kind==='reaction'?'Reaction check':'Attention check'}</h2><p className="eyebrow">{kind==='reaction'?'25 trials · variable duration':'40 stimuli · approximately 50 s'}</p>
        <p>{kind==='reaction'?'Wait for Go, then tap the sky circle or press Space. Random waits make the total duration variable.':'Tap the sky circle or press Space. Do not respond to the lavender square. Shape and text identify each stimulus.'}</p>
        <div className="check-actions">{[false,true].map(practice=><button key={String(practice)} className={`pill-button ${practice?'':'primary-button'}`} onClick={event=>{trigger.current=event.currentTarget;setNotice('');setSession({kind,practice});}}>{practice?`Practice ${name} check`:`Open ${name} check`}</button>)}</div>
        <p>Practice uses the full protocol without saving. Cancel or leave the page to discard an unfinished session.</p>
        <LiveComparison records={app.liveChecks} kind={kind}/>
      </article>;
    })}</div>
    <p className="check-notice" role="status">{notice}</p>
    <section className="panel check-history" aria-labelledby="history-title"><h2 id="history-title">Saved results</h2><p>Latest 10 · stored on this device · Live browser test</p>
      {app.loading?<p role="status">Loading saved checks...</p>:app.error?<p role="alert">Saved history is unavailable. Reload to retry. {app.error}</p>:history.length===0?<p>No saved checks yet. Complete a check and choose Save result.</p>:<ol>{history.map(record=>{
        const quality=getCheckQuality(record,record.kind);
        return <li key={record.id}><article aria-label={`${record.kind==='reaction'?'Reaction':'Attention'} saved result`}>
          <h3>{record.kind==='reaction'?'Reaction check':'Attention check'}</h3><time dateTime={record.timestamp}>{record.timestamp.replace('T',' ').replace('Z',' UTC')}</time><p className="live-check-label">Live browser test · {record.kind} · no mission day</p>
          <p className={`quality-chip quality-${quality.quality}`}>{quality.quality==='good'?'✓ Good quality':quality.quality==='poor'?'◐ Insufficient data · Poor quality':'○ Insufficient data · Missing quality'}</p>
          {quality.reasons.length>0&&<ul>{quality.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}
          <dl>{liveMetrics[record.kind].map(metric=><div key={metric.key}><dt>{metric.label}</dt><dd>{record[metric.key]===null?'Not available':`${record[metric.key]!.toFixed(metric.unit==='ms'?1:0)} ${metric.unit}`}</dd></div>)}<div><dt>Valid trials / interruptions</dt><dd>{record.validTrials} / {record.interruptions}</dd></div></dl>
          <LiveComparison records={app.liveChecks} kind={record.kind} result={record}/>
        </article></li>;
      })}</ol>}
    </section>
    <aside className="panel check-notes"><h2>About these measurements</h2><p>A short browser test is not NASA Cognition and is not a validated flight assessment. Device latency, practice effects and interruptions affect results.</p><p>Browser test results cannot be compared with the synthetic mission data.</p><p>Live checks do not modify the frozen synthetic demo baseline, Today status, charts or mission task calculations. Live results stay on this device and are never sent to Gemini.</p></aside>
    {session?.kind==='reaction'&&<ReactionTest practice={session.practice} onCancel={close}/>}
    {session?.kind==='go_no_go'&&<GoNoGoTest practice={session.practice} onCancel={close}/>}
  </section>;
}
