import { REACTION_DOUBLE_FIRE_MS, REACTION_TIMEOUT_MS, TOTAL_TRIALS } from '../engine/config';
import { createReactionDelays, createSeededRandom, scoreReaction, type CheckScore, type ReactionTrial } from './scoring';

export interface SessionClock {
  now:()=>number; schedule:(callback:()=>void,delayMs:number)=>number; cancel:(id:number)=>void;
  frame:(callback:()=>void)=>number; cancelFrame:(id:number)=>void;
}
export interface ReactionView { phase:'idle'|'waiting'|'rendering'|'stimulus'|'paused'|'complete'; recordedTrials:number; interruptions:number; score:CheckScore|null }

/** Timing owner: every callback belongs to a particular run and trial. */
export class ReactionSession {
  private view:ReactionView={phase:'idle',recordedTrials:0,interruptions:0,score:null};
  private generation=0;
  private timer:number|null=null;
  private frame:number|null=null;
  private trials:ReactionTrial[]=[];
  private delays:number[]=[];
  private onsetMs:number|null=null;
  private lastResponseMs:number|null=null;
  private focused=true;
  private trialFocused=true;
  constructor(private clock:SessionClock,private publish:(view:ReactionView)=>void){}
  private emit(phase:ReactionView['phase']):void {this.view={...this.view,phase,recordedTrials:this.trials.length};this.publish(this.view);}
  private clear():void {
    if(this.timer!==null)this.clock.cancel(this.timer);
    if(this.frame!==null)this.clock.cancelFrame(this.frame);
    this.timer=null;this.frame=null;
  }
  private schedule(callback:()=>void,delayMs:number):void {
    const generation=this.generation,trial=this.trials.length;
    this.timer=this.clock.schedule(()=>{if(generation===this.generation&&trial===this.trials.length){this.timer=null;callback();}},delayMs);
  }
  start(seed:number,focused:boolean):void {
    this.stop();this.trials=[];this.lastResponseMs=null;this.delays=createReactionDelays(createSeededRandom(seed));this.focused=focused;
    this.view={phase:'idle',recordedTrials:0,interruptions:0,score:null};this.next();
  }
  private next():void {
    this.clear();this.onsetMs=null;this.trialFocused=this.focused;
    if(this.trials.length===TOTAL_TRIALS.reaction){this.view={...this.view,score:scoreReaction(this.trials,this.view.interruptions)};this.emit('complete');return;}
    if(!this.focused){this.emit('paused');return;}
    this.emit('waiting');this.schedule(()=>this.emit('rendering'),this.delays[this.trials.length]);
  }
  /** Called after React commits the visible target; the clock starts on its frame. */
  presented():void {
    if(this.view.phase!=='rendering'||this.frame!==null||!this.focused)return;
    const generation=this.generation,trial=this.trials.length;
    this.frame=this.clock.frame(()=>{
      if(generation!==this.generation||trial!==this.trials.length)return;
      this.frame=null;
      if(!this.focused||this.view.phase!=='rendering')return;
      this.onsetMs=this.clock.now();this.emit('stimulus');this.schedule(()=>this.finish('timeout',null),REACTION_TIMEOUT_MS);
    });
  }
  respond():void {
    if(!this.focused)return;
    if(this.view.phase!=='waiting'&&this.view.phase!=='stimulus')return;
    const now=this.clock.now();
    if(this.lastResponseMs!==null&&now-this.lastResponseMs<REACTION_DOUBLE_FIRE_MS)return;
    this.lastResponseMs=now;
    if(this.view.phase==='waiting'){this.finish('premature',null);return;}
    if(this.view.phase!=='stimulus'||this.onsetMs===null)return;
    const rtMs=now-this.onsetMs;
    if(rtMs>=REACTION_TIMEOUT_MS)this.finish('timeout',null);else this.finish('response',rtMs);
  }
  private finish(outcome:ReactionTrial['outcome'],rtMs:number|null):void {
    this.clear();this.trials.push({outcome,rtMs,focused:this.trialFocused});this.next();
  }
  setFocused(focused:boolean):void {
    if(this.view.phase==='idle'||this.view.phase==='complete')return;
    if(!focused&&this.focused){this.view={...this.view,interruptions:this.view.interruptions+1};this.trialFocused=false;}
    this.focused=focused;
    if(focused&&this.view.phase==='paused')this.next();
    else if(focused&&this.view.phase==='rendering')this.presented();
    else this.emit(this.view.phase);
  }
  stop():void {this.generation++;this.clear();this.view={...this.view,phase:'idle'};}
}
