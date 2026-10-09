import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TOTAL_TRIALS } from '../engine/config';
import { useApp } from '../state/useApp';
import { GoNoGoSession, type GoNoGoView } from './GoNoGoSession';
import { useResponseControls } from './useResponseControls';
import { createLiveRecord } from './liveRecord';
import type { LiveCheck } from '../db/db';
import '../styles/checks.css';

export function GoNoGoTest({onCancel}:{onCancel:(recordedTrials:number)=>void}) {
  const app=useApp();
  const [view,setView]=useState<GoNoGoView>({phase:'idle',stimulus:null,recordedTrials:0,interruptions:0,score:null});
  const [saved,setSaved]=useState<'unsaved'|'saving'|'saved'|'failed'>('unsaved');
  const target=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null),start=useRef<HTMLButtonElement>(null);
  const record=useRef<LiveCheck|null>(null),savePending=useRef(false),session=useRef<GoNoGoSession|null>(null);
  if(!session.current)session.current=new GoNoGoSession({now:()=>performance.now(),schedule:(fn,ms)=>window.setTimeout(fn,ms),cancel:id=>window.clearTimeout(id),frame:fn=>requestAnimationFrame(fn),cancelFrame:id=>cancelAnimationFrame(id)},setView);
  const running=!['idle','complete'].includes(view.phase);
  const pointer=useResponseControls(target,running,()=>session.current!.respond(),focused=>session.current!.setFocused(focused));
  useEffect(()=>{const element=dialog.current!;element.showModal();start.current?.focus();return ()=>{session.current!.stop();if(element.open)element.close();};},[]);
  useLayoutEffect(()=>{if(view.phase==='rendering'){session.current!.presented();if(view.recordedTrials===0)target.current?.focus();}},[view.phase,view.recordedTrials]);
  useEffect(()=>{if(view.score&&!record.current)record.current=createLiveRecord(view.score,'go_no_go',crypto.randomUUID(),new Date().toISOString());},[view.score]);
  const begin=()=>{if(savePending.current)return;record.current=null;setSaved('unsaved');session.current!.start(crypto.getRandomValues(new Uint32Array(1))[0],!document.hidden&&document.hasFocus());};
  const save=async()=>{
    if(!record.current||savePending.current||saved==='saved')return;
    savePending.current=true;setSaved('saving');
    try{await app.saveLiveCheck(record.current);setSaved('saved');}catch{setSaved('failed');}finally{savePending.current=false;}
  };
  const visible=view.phase==='rendering'||view.phase==='stimulus';
  return <dialog className="check-dialog" ref={dialog} aria-labelledby="attention-title" aria-modal="true" onCancel={event=>{event.preventDefault();onCancel(view.recordedTrials);}}>
    <header className="check-test-header"><button className="pill-button" onClick={()=>onCancel(view.recordedTrials)}>Cancel</button><span className="live-check-label">Live browser test</span></header><h2 id="attention-title">Attention check</h2>
    {view.phase==='idle'?<div className="check-instructions"><p>Tap the sky circle or press Space when it appears. Do not respond to the lavender square. Each stimulus accepts one response.</p><p>There are 40 stimuli: 30 go circles and 10 no-go squares, shuffled each run. Each appears for 800 ms, followed by a 400 ms gap. Gap inputs are ignored.</p><p>No-go taps are commission errors; missed go circles are omissions. Responses before 100 ms also count as false starts for the common quality rule. Keep this tab visible. No separate practice block is specified.</p><button ref={start} className="pill-button primary-button" onClick={begin}>Start attention check</button></div>:view.score?<section className="check-summary" aria-labelledby="attention-result"><h3 id="attention-result">Attention result</h3><p>Live browser test · {view.score.quality==='good'?'Good quality':'Insufficient data'}{view.score.quality==='poor'?' · Poor quality':''}</p><dl><div><dt>Commission errors</dt><dd>{view.score.commissionErrors===null?'Not available':`${view.score.commissionErrors} / ${view.score.noGoTrials} no-go stimuli`}</dd></div><div><dt>Omission errors</dt><dd>{view.score.omissionErrors===null?'Not available':`${view.score.omissionErrors} / ${view.score.goTrials} go stimuli`}</dd></div><div><dt>False starts</dt><dd>{view.score.falseStarts??'Not available'}</dd></div><div><dt>Focused stimuli</dt><dd>{view.score.validTrials} / {TOTAL_TRIALS.go_no_go}</dd></div><div><dt>Recorded stimuli</dt><dd>{view.score.presentedTrials} / {view.score.expectedTrials}</dd></div><div><dt>Interruptions</dt><dd>{view.score.interruptions}</dd></div></dl>{view.score.reasons.length>0&&<ul>{view.score.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}<p>Counts describe focused stimuli only. Reaction median and lapses are not measured by this check.</p><div className="check-actions"><button className="pill-button primary-button" onClick={()=>void save()} disabled={view.score.quality==='missing'||saved==='saving'||saved==='saved'}>{saved==='saving'?'Saving…':saved==='saved'?'Saved on this device':'Save result'}</button><button className="pill-button" onClick={begin} disabled={saved==='saving'}>Restart attention check</button><button className="pill-button" onClick={()=>onCancel(view.recordedTrials)}>Return to Check</button></div><p role="status">{saved==='failed'?'Result could not be saved. Local storage may be unavailable.':saved==='saved'?'Live attention result saved. The synthetic baseline and mission remain unchanged.':view.score.quality==='missing'?'No usable result to save.':'Result is not saved until you choose Save result.'}</p></section>:<div className="check-active"><p className="trial-progress">Stimulus {Math.min(view.recordedTrials+1,TOTAL_TRIALS.go_no_go)} of {TOTAL_TRIALS.go_no_go}</p><p className="stimulus-instruction">{view.phase==='paused'?'Return to this tab to continue':!visible?'Gap · Wait':view.stimulus==='go'?'Go circle · Tap or press Space':'No-go square · Do not respond'}</p></div>}
    <button ref={target} className={`check-target ${visible?(view.stimulus==='go'?'target-go':'target-no-go'):''}`} data-phase={view.phase} data-stimulus={visible?view.stimulus:''} aria-label={!visible?'Attention target: wait':view.stimulus==='go'?'Go circle: respond now':'No-go square: do not respond'} onPointerDown={pointer} disabled={view.phase==='complete'||view.phase==='idle'}/>
    {running&&<div className="progress-dots" aria-label={`${view.recordedTrials} of ${TOTAL_TRIALS.go_no_go} stimuli recorded`}>{Array.from({length:TOTAL_TRIALS.go_no_go},(_,index)=><span key={index} className={index<view.recordedTrials?'recorded':''}/>)}</div>}
    <p className="check-timing-note">Browser rendering, device latency and interruptions affect these measurements. This is not NASA Cognition or a validated flight assessment. Browser test results cannot be compared with the synthetic mission data.</p>
  </dialog>;
}
