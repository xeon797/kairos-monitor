import { GO_NO_GO_GAP_MS, GO_NO_GO_STIMULUS_MS, TOTAL_TRIALS } from '../engine/config';
import { createGoNoGoStimuli, createSeededRandom, scoreGoNoGo, type CheckScore, type GoNoGoTrial, type Stimulus } from './scoring';
import type { SessionClock } from './ReactionSession';

export interface GoNoGoView { phase:'idle'|'rendering'|'stimulus'|'gap'|'paused'|'complete'; stimulus:Stimulus|null; recordedTrials:number; interruptions:number; score:CheckScore|null }
export class GoNoGoSession {
  private view:GoNoGoView={phase:'idle',stimulus:null,recordedTrials:0,interruptions:0,score:null};
  private generation=0;private timer:number|null=null;private frame:number|null=null;
  private trials:GoNoGoTrial[]=[];private stimuli:Stimulus[]=[];
  private onsetMs:number|null=null;private responseMs:number|null=null;private focused=true;private trialFocused=true;
  constructor(private clock:SessionClock,private publish:(view:GoNoGoView)=>void){}
  private emit(phase:GoNoGoView['phase']):void {this.view={...this.view,phase,recordedTrials:this.trials.length};this.publish(this.view);}
  private clear():void {if(this.timer!==null)this.clock.cancel(this.timer);if(this.frame!==null)this.clock.cancelFrame(this.frame);this.timer=null;this.frame=null;}
  private schedule(callback:()=>void,delayMs:number):void {
    const generation=this.generation,trial=this.trials.length;
    this.timer=this.clock.schedule(()=>{if(generation===this.generation&&trial===this.trials.length){this.timer=null;callback();}},delayMs);
  }
  start(seed:number,focused:boolean):void {
    this.stop();this.trials=[];this.stimuli=createGoNoGoStimuli(createSeededRandom(seed));this.focused=focused;
    this.view={phase:'idle',stimulus:null,recordedTrials:0,interruptions:0,score:null};this.next();
  }
  private next():void {
    this.clear();this.onsetMs=null;this.responseMs=null;this.trialFocused=this.focused;
    if(this.trials.length===TOTAL_TRIALS.go_no_go){this.view={...this.view,stimulus:null,score:scoreGoNoGo(this.trials,this.view.interruptions)};this.emit('complete');return;}
    if(!this.focused){this.view={...this.view,stimulus:null};this.emit('paused');return;}
    this.view={...this.view,stimulus:this.stimuli[this.trials.length]};this.emit('rendering');
  }
  presented():void {
    if(this.view.phase!=='rendering'||this.frame!==null||!this.focused)return;
    const generation=this.generation,trial=this.trials.length;
    this.frame=this.clock.frame(()=>{
      if(generation!==this.generation||trial!==this.trials.length)return;
      this.frame=null;if(!this.focused||this.view.phase!=='rendering')return;
      this.onsetMs=this.clock.now();this.emit('stimulus');this.schedule(()=>this.finish(),GO_NO_GO_STIMULUS_MS);
    });
  }
  respond():void {
    if(!this.focused||this.view.phase!=='stimulus'||this.onsetMs===null||this.responseMs!==null)return;
    const rtMs=this.clock.now()-this.onsetMs;
    if(rtMs>=GO_NO_GO_STIMULUS_MS)return;
    this.responseMs=rtMs;
  }
  private finish():void {
    this.trials.push({stimulus:this.view.stimulus!,responded:this.responseMs!==null,rtMs:this.responseMs,focused:this.trialFocused});
    this.view={...this.view,stimulus:null};this.emit('gap');this.schedule(()=>this.next(),GO_NO_GO_GAP_MS);
  }
  setFocused(focused:boolean):void {
    if(this.view.phase==='idle'||this.view.phase==='complete')return;
    if(!focused&&this.focused){this.view={...this.view,interruptions:this.view.interruptions+1};this.trialFocused=false;}
    this.focused=focused;
    if(focused&&this.view.phase==='paused')this.next();else if(focused&&this.view.phase==='rendering')this.presented();else this.emit(this.view.phase);
  }
  stop():void {this.generation++;this.clear();this.view={...this.view,phase:'idle'};}
}
