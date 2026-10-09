import { describe, expect, it } from 'vitest';
import { ReactionSession, type ReactionView, type SessionClock } from '../../src/checks/ReactionSession';
import { createLiveRecord } from '../../src/checks/liveRecord';
import { scoreReaction } from '../../src/checks/scoring';

function harness(){
  let now=0,id=0,view:ReactionView={phase:'idle',recordedTrials:0,interruptions:0,score:null};
  const jobs=new Map<number,()=>void>();
  const clock:SessionClock={now:()=>now,schedule:fn=>{jobs.set(++id,fn);return id;},cancel:job=>{jobs.delete(job);},frame:fn=>{jobs.set(++id,fn);return id;},cancelFrame:job=>{jobs.delete(job);}};
  const session=new ReactionSession(clock,next=>{view=next;});
  const tick=(ms=0)=>{now+=ms;const [key,job]=jobs.entries().next().value!;jobs.delete(key);job();};
  return {session,tick,advance:(ms:number)=>{now+=ms;},view:()=>view,jobs};
}
describe('reaction timing owner and records',()=>{
  it('does not arm the response clock until the rendered target frame',()=>{
    const h=harness();h.session.start(123,true);h.tick(1500);expect(h.view().phase).toBe('rendering');h.session.respond();expect(h.view().recordedTrials).toBe(0);
    h.session.presented();h.tick(16);h.advance(250);h.session.respond();expect(h.view().recordedTrials).toBe(1);
  });
  it('produces all 25 actual measured trials and a live typed result',()=>{
    const h=harness();h.session.start(123,true);
    for(let i=0;i<25;i++){h.tick(2000);h.session.presented();h.tick(16);h.advance(250.5);h.session.respond();}
    expect(h.view().score).toMatchObject({medianRtMs:250.5,quality:'good',validTrials:25,lapses:0});
    expect(createLiveRecord(h.view().score!,'reaction','unit-live','2026-10-09T00:00:00.000Z')).toMatchObject({kind:'reaction',source:'live',day:null,medianRtMs:250.5,commissionErrors:null});
    expect(h.jobs.size).toBe(0);
  });
  it('invalidates stale callbacks on cancellation and restart',()=>{
    const h=harness();h.session.start(1,true);const callback=[...h.jobs.values()][0];h.session.stop();callback();expect(h.view().phase).toBe('waiting');
    h.session.start(2,true);callback();expect(h.view().recordedTrials).toBe(0);expect(h.jobs.size).toBe(1);
  });
  it('coalesces blur plus hidden events and resumes without timing a hidden target',()=>{
    const h=harness();h.session.start(1,true);h.session.setFocused(false);h.session.setFocused(false);h.tick(2000);h.session.presented();
    expect(h.view().interruptions).toBe(1);expect(h.jobs.size).toBe(0);
    h.session.setFocused(true);h.tick(16);h.advance(250);h.session.respond();expect(h.view().recordedTrials).toBe(1);
  });
  it('never creates a saveable record for incomplete or all-timeout sessions',()=>{
    expect(createLiveRecord(scoreReaction([]),'reaction','none','2026-10-09T00:00:00.000Z')).toBeNull();
    expect(createLiveRecord(scoreReaction(Array.from({length:25},()=>({outcome:'timeout',rtMs:null,focused:true}))),'reaction','none','2026-10-09T00:00:00.000Z')).toBeNull();
  });
  it('cannot relabel a reaction score as an attention record',()=>{
    const score=scoreReaction(Array.from({length:25},()=>({outcome:'response',rtMs:250,focused:true})));
    expect(createLiveRecord(score,'go_no_go','wrong-kind','2026-10-09T00:00:00.000Z')).toBeNull();
  });
});
