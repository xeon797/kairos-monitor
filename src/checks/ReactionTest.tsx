import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOTAL_TRIALS } from '../engine/config';
import { useApp } from '../state/useApp';
import { ReactionSession, type ReactionView } from './ReactionSession';
import { useResponseControls } from './useResponseControls';
import { createLiveRecord } from './liveRecord';
import type { LiveCheck } from '../db/db';
import '../styles/checks.css';
import { keepDialogFocus } from './keepDialogFocus';
import { LiveComparison } from './LiveBaselineView';

export function ReactionTest({onCancel,practice=false}:{practice?:boolean;onCancel:(recordedTrials:number)=>void}) {
  const app=useApp();
  const [completedRecord,setCompletedRecord]=useState<LiveCheck|null>(null);
  const [view,setView]=useState<ReactionView>({phase:'idle',recordedTrials:0,interruptions:0,score:null});
  const [saved,setSaved]=useState<'unsaved'|'saving'|'saved'|'failed'>('unsaved');
  const target=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),start=useRef<HTMLButtonElement>(null);
  const record=useRef<LiveCheck|null>(null),savePending=useRef(false);
  const session=useRef<ReactionSession|null>(null);
  if(!session.current)session.current=new ReactionSession({now:()=>performance.now(),schedule:(fn,ms)=>window.setTimeout(fn,ms),cancel:id=>window.clearTimeout(id),frame:fn=>requestAnimationFrame(fn),cancelFrame:id=>cancelAnimationFrame(id)},setView);
  useEffect(()=>{if(view.score)dialog.current?.querySelector<HTMLElement>('.check-summary')?.focus();},[view.score]);
  const running=!['idle','complete'].includes(view.phase);
  const pointer=useResponseControls(target,running,()=>session.current!.respond(),focused=>session.current!.setFocused(focused));
  useEffect(()=>{const element=dialog.current!;element.showModal();start.current?.focus();return ()=>{session.current!.stop();if(element.open)element.close();};},[]);
  useLayoutEffect(()=>{if(view.phase==='rendering')session.current!.presented();if(view.phase==='waiting'&&view.recordedTrials===0)target.current?.focus();},[view.phase,view.recordedTrials]);
  useEffect(()=>{
    if(view.score&&!record.current){record.current=createLiveRecord(view.score,'reaction',crypto.randomUUID(),new Date().toISOString());setCompletedRecord(record.current);}
  },[view.score]);
  const begin=()=>{if(savePending.current)return;record.current=null;setCompletedRecord(null);setSaved('unsaved');session.current!.start(crypto.getRandomValues(new Uint32Array(1))[0],!document.hidden&&document.hasFocus());};
  const save=async()=>{
    if(practice||!record.current||savePending.current||saved==='saved')return;
    savePending.current=true;setSaved('saving');
    try{await app.saveLiveCheck(record.current);setSaved('saved');}catch{setSaved('failed');}finally{savePending.current=false;}
  };
  return <dialog onKeyDown={keepDialogFocus} className="check-dialog" ref={dialog} aria-labelledby="reaction-title" aria-modal="true" onCancel={event=>{event.preventDefault();onCancel(view.recordedTrials);}}>
    <header className="check-test-header"><button className="pill-button" onClick={()=>onCancel(view.recordedTrials)}>Cancel</button><span className="live-check-label">{practice?'Practice · never saved':'Live browser test'}</span></header>
    <h2 id="reaction-title">Reaction check</h2>
    {view.phase==='idle'?<div className="check-instructions"><p>Wait for the sky circle and “Go”, then tap the target or press Space. Respond once per trial. A response while waiting or before 100 ms counts as a false start.</p><p>There are 25 trials with random 1.5–4 s waits. A response after 500 ms counts as a lapse; no response within 2 s also counts as a lapse. Duration depends on the waits and your responses.</p><p>Use a quiet setting and keep this tab visible. Practice runs this same full protocol without saving.</p><button ref={start} className="pill-button primary-button" onClick={begin}>Start reaction check</button></div>:view.score?<section tabIndex={-1} className="check-summary" aria-labelledby="reaction-result"><h3 id="reaction-result">Reaction result</h3><p className={`quality-chip quality-${view.score.quality}`} role="status"><span aria-hidden="true">{view.score.quality==='good'?'✓':'◐'}</span> Live browser test · {view.score.quality==='good'?'Good quality':'Insufficient data'}{view.score.quality==='poor'?' · Poor quality':''}</p><dl><div><dt>Median reaction time</dt><dd>{view.score.medianRtMs===null?'Not available':`${view.score.medianRtMs.toFixed(1)} ms`}</dd></div><div><dt>Lapses</dt><dd>{view.score.lapses??'Not available'}</dd></div><div><dt>False starts</dt><dd>{view.score.falseStarts??'Not available'}</dd></div><div><dt>Median-eligible responses</dt><dd>{view.score.validTrials} / {TOTAL_TRIALS.reaction}</dd></div><div><dt>Recorded trials</dt><dd>{view.score.presentedTrials} / {view.score.expectedTrials}</dd></div><div><dt>Interruptions</dt><dd>{view.score.interruptions}</dd></div></dl>{view.score.reasons.length>0&&<ul>{view.score.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}<p>Timeouts count as lapses but are excluded from the median. Unfocused trials are excluded from measurements.</p><LiveComparison records={app.liveChecks} kind="reaction" result={completedRecord}/><div className="check-actions"><button className="pill-button primary-button" onClick={()=>void save()} disabled={practice||view.score.quality==='missing'||saved==='saving'||saved==='saved'}>{practice?'Practice · not saved':saved==='saving'?'Saving…':saved==='saved'?'Saved on this device':'Save result'}</button><button className="pill-button" onClick={begin} disabled={saved==='saving'}>Restart reaction check</button><button className="pill-button" onClick={()=>onCancel(view.recordedTrials)}>Return to Check</button></div><p role="status">{practice?'Practice results are never saved. Return to Check to start a measured check.':saved==='failed'?'Result could not be saved. Local storage may be unavailable.':saved==='saved'?'Live reaction result saved. The synthetic baseline and mission remain unchanged.':view.score.quality==='missing'?'No usable result to save.':'Result is not saved until you choose Save result.'}</p></section>:<div className="check-active"><p className="trial-progress">Trial {Math.min(view.recordedTrials+1,TOTAL_TRIALS.reaction)} of {TOTAL_TRIALS.reaction}</p><p className="stimulus-instruction">{view.phase==='paused'?'Return to this tab to continue':view.phase==='waiting'?'Wait':view.phase==='rendering'?'Wait':'Go · Tap or press Space'}</p></div>}
    <button ref={target} className={`check-target ${view.phase==='rendering'||view.phase==='stimulus'?'target-go':''}`} data-phase={view.phase} aria-label={view.phase==='stimulus'?'Go circle: respond now':'Reaction target: wait'} onPointerDown={pointer} disabled={view.phase==='complete'||view.phase==='idle'}/>
    {running&&<div className="progress-dots" aria-label={`${view.recordedTrials} of ${TOTAL_TRIALS.reaction} trials recorded`}>{Array.from({length:TOTAL_TRIALS.reaction},(_,index)=><span key={index} className={index<view.recordedTrials?'recorded':''}/>)}</div>}
    <p className="check-timing-note">Browser rendering, device latency and interruptions affect these measurements. This is not NASA Cognition or a validated flight assessment. Browser test results cannot be compared with the synthetic mission data.</p>
  </dialog>;
}
