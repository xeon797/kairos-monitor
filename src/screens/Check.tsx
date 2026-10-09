import { useRef, useState } from 'react';
import { ReactionTest } from '../checks/ReactionTest';
import { GoNoGoTest } from '../checks/GoNoGoTest';

export default function Check() {
  const [reactionOpen,setReactionOpen]=useState(false),[attentionOpen,setAttentionOpen]=useState(false),[notice,setNotice]=useState('');
  const trigger=useRef<HTMLButtonElement>(null),attentionTrigger=useRef<HTMLButtonElement>(null);
  return <section aria-labelledby="screen-heading">
    <div className="screen-heading"><p className="eyebrow">Kairos Monitor / Live browser checks</p><h1 id="screen-heading">Check</h1><p className="screen-subtitle">A place to measure and review.</p></div>
    <div className="panel"><h2>Browser checks</h2><p>Run a complete check, review its raw measurements and choose whether to save it on this device.</p>
      <div className="check-launchers"><button className="pill-button primary-button" ref={trigger} onClick={()=>{setNotice('');setReactionOpen(true);}}>Open reaction check</button><button className="pill-button" ref={attentionTrigger} onClick={()=>{setNotice('');setAttentionOpen(true);}}>Open attention check</button></div>
      <p className="check-timing-note">A short browser test is not NASA Cognition and is not a validated flight assessment. Device latency, practice effects and interruptions affect results. Browser test results cannot be compared with the synthetic mission data.</p><p>Live results are shown as raw values.</p>
    </div>
    {notice&&<p role="status">{notice}</p>}
    {reactionOpen&&<ReactionTest onCancel={count=>{setReactionOpen(false);setNotice(`Returned to Check after ${count} recorded trials. Only explicitly saved completed results are stored.`);trigger.current?.focus();}}/>}
    {attentionOpen&&<GoNoGoTest onCancel={count=>{setAttentionOpen(false);setNotice(`Returned to Check after ${count} recorded stimuli. Only explicitly saved completed results are stored.`);attentionTrigger.current?.focus();}}/>}
  </section>;
}
