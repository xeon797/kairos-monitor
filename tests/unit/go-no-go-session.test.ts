import { expect, it } from 'vitest';
import { GoNoGoSession, type GoNoGoView } from '../../src/checks/GoNoGoSession';
import { createLiveRecord } from '../../src/checks/liveRecord';
import type { SessionClock } from '../../src/checks/ReactionSession';
function harness(){
  let now=0,id=0,view:GoNoGoView={phase:'idle',stimulus:null,recordedTrials:0,interruptions:0,score:null};
  const jobs=new Map<number,{fn:()=>void;ms:number}>();
  const clock:SessionClock={now:()=>now,schedule:(fn,ms)=>{jobs.set(++id,{fn,ms});return id;},cancel:key=>{jobs.delete(key);},frame:fn=>{jobs.set(++id,{fn,ms:16});return id;},cancelFrame:key=>{jobs.delete(key);}};
  const session=new GoNoGoSession(clock,next=>{view=next;});
  const tick=()=>{const [key,job]=jobs.entries().next().value!;jobs.delete(key);now+=job.ms;job.fn();return job.ms;};
  return {session,tick,advance:(ms:number)=>{now+=ms;},view:()=>view,jobs};
}
it('presents exactly 30/10 stimuli, accepts one response and uses 800/400 ms timing',()=>{
  const h=harness();h.session.start(123,true);const shapes:string[]=[];
  for(let i=0;i<40;i++){
    shapes.push(h.view().stimulus!);h.session.presented();h.tick();
    h.advance(250);if(h.view().stimulus==='go'){h.session.respond();h.session.respond();}
    expect(h.tick()).toBe(800);expect(h.view().phase).toBe('gap');h.session.respond();expect(h.tick()).toBe(400);
  }
  expect(shapes.filter(shape=>shape==='no_go')).toHaveLength(10);
  expect(h.view().score).toMatchObject({quality:'good',commissionErrors:0,omissionErrors:0,falseStarts:0,validTrials:40});
  expect(createLiveRecord(h.view().score!,'go_no_go','attention','2026-10-09T00:00:00.000Z')).toMatchObject({kind:'go_no_go',medianRtMs:null,lapses:null});
});
it('counts early no-go taps as both measured false starts and commission errors',()=>{
  const h=harness();h.session.start(1,true);
  for(let i=0;i<40;i++){h.session.presented();h.tick();h.advance(99);h.session.respond();h.session.respond();h.tick();h.tick();}
  expect(h.view().score).toMatchObject({quality:'poor',falseStarts:40,commissionErrors:10,omissionErrors:0});
});
it('rejects responses at/after exposure boundary and counts missed go stimuli',()=>{
  const h=harness();h.session.start(1,true);
  for(let i=0;i<40;i++){h.session.presented();h.tick();h.advance(800);h.session.respond();h.tick();h.tick();}
  expect(h.view().score).toMatchObject({omissionErrors:30,commissionErrors:0,falseStarts:0});
});
it('excludes a hidden stimulus, coalesces interruption signals and cleans up stale frames',()=>{
  const h=harness();h.session.start(1,true);h.session.presented();h.tick();h.session.setFocused(false);h.session.setFocused(false);h.tick();h.tick();
  expect(h.view()).toMatchObject({phase:'paused',interruptions:1,recordedTrials:1});expect(h.jobs.size).toBe(0);
  h.session.setFocused(true);h.session.presented();const stale=[...h.jobs.values()][0].fn;h.session.stop();h.session.start(2,true);stale();expect(h.view().phase).toBe('rendering');expect(h.jobs.size).toBe(0);
});
