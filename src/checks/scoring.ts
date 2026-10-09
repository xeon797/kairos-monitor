import { GO_NO_GO_COUNT, GO_NO_GO_STIMULUS_MS, REACTION_DELAY_MAX_MS, REACTION_DELAY_MIN_MS, REACTION_FALSE_START_MS, REACTION_LAPSE_MS, REACTION_TIMEOUT_MS, TOTAL_TRIALS } from '../engine/config';
import { getCheckQuality } from '../engine/quality';
import type { CheckObservation, Quality, TestKind } from '../engine/types';

export interface ReactionTrial { outcome:'response'|'premature'|'timeout'; rtMs:number|null; focused:boolean }
export type Stimulus = 'go'|'no_go';
export interface GoNoGoTrial { stimulus:Stimulus; responded:boolean; rtMs:number|null; focused:boolean }
export type ScoredMetrics = Pick<CheckObservation,'medianRtMs'|'lapses'|'falseStarts'|'commissionErrors'|'omissionErrors'|'validTrials'|'interruptions'|'quality'>;
export interface CheckScore extends ScoredMetrics { kind:TestKind; complete:boolean; validInput:boolean; presentedTrials:number; expectedTrials:number; medianTrials:number; goTrials:number|null; noGoTrials:number|null; reasons:string[] }

function isCount(value:number):boolean {return Number.isSafeInteger(value)&&value>=0;}
function missingMetrics(interruptions:number):ScoredMetrics {
  return {medianRtMs:null,lapses:null,falseStarts:null,commissionErrors:null,omissionErrors:null,validTrials:0,interruptions,quality:'missing'};
}
function sessionReasons(length:number,total:number,interruptions:number):string[] {
  const reasons:string[]=[];
  if(length!==total)reasons.push(`Incomplete session: ${length} of ${total} trials recorded.`);
  if(!isCount(interruptions))reasons.push('Interruption count must be a nonnegative integer.');
  return reasons;
}
function mergeQuality(quality:Quality,reasons:readonly string[]):Quality {return quality==='missing'?'missing':reasons.length?'poor':quality;}

/** RTs are elapsed monotonic-clock milliseconds, never ISO timestamps. */
export function scoreReaction(trials:readonly ReactionTrial[],interruptions=0):CheckScore {
  const total=TOTAL_TRIALS.reaction;
  const reasons=sessionReasons(trials.length,total,interruptions);
  const validInput=isCount(interruptions)&&trials.length<=total&&trials.every(trial=>typeof trial.focused==='boolean'&&(
    trial.outcome==='response'?trial.rtMs!==null&&Number.isFinite(trial.rtMs)&&trial.rtMs>=0&&trial.rtMs<REACTION_TIMEOUT_MS:
      (trial.outcome==='premature'||trial.outcome==='timeout')&&trial.rtMs===null));
  if(!validInput)reasons.push('Invalid reaction trial data; no aggregate measurement is available.');
  const eligible=validInput?trials.filter(trial=>trial.focused):[];
  let metrics=missingMetrics(interruptions);
  let medianTrials=0;
  if(eligible.length){
    const rts=eligible.flatMap(trial=>trial.outcome==='response'&&trial.rtMs!==null&&trial.rtMs>=REACTION_FALSE_START_MS?[trial.rtMs]:[]).sort((a,b)=>a-b);
    medianTrials=rts.length;
    const middle=Math.floor(rts.length/2);
    const median=rts.length?(rts.length%2?rts[middle]:rts[middle-1]/2+rts[middle]/2):null;
    metrics={...metrics,medianRtMs:median,validTrials:rts.length,
      lapses:eligible.filter(trial=>trial.outcome==='timeout'||(trial.outcome==='response'&&trial.rtMs!>REACTION_LAPSE_MS)).length,
      falseStarts:eligible.filter(trial=>trial.outcome==='premature'||(trial.outcome==='response'&&trial.rtMs!<REACTION_FALSE_START_MS)).length,quality:'good'};
    const quality=getCheckQuality({id:'scoring-only',day:null,timestamp:null,source:'live',...metrics},'reaction');
    reasons.push(...quality.reasons);metrics.quality=quality.quality;
  }
  const quality=mergeQuality(metrics.quality,reasons);
  if(trials.some(trial=>!trial.focused))reasons.push('Unfocused trials are excluded from measurements.');
  return {...metrics,kind:'reaction',quality,complete:trials.length===total,validInput,presentedTrials:trials.length,expectedTrials:total,medianTrials,goTrials:null,noGoTrials:null,reasons};
}

export function scoreGoNoGo(trials:readonly GoNoGoTrial[],interruptions=0):CheckScore {
  const total=TOTAL_TRIALS.go_no_go;
  const reasons=sessionReasons(trials.length,total,interruptions);
  const compositionValid=trials.length!==total||trials.filter(trial=>trial.stimulus==='no_go').length===GO_NO_GO_COUNT;
  const validInput=isCount(interruptions)&&trials.length<=total&&compositionValid&&trials.every(trial=>['go','no_go'].includes(trial.stimulus)&&typeof trial.responded==='boolean'&&typeof trial.focused==='boolean'&&(trial.responded?trial.rtMs!==null&&Number.isFinite(trial.rtMs)&&trial.rtMs>=0&&trial.rtMs<GO_NO_GO_STIMULUS_MS:trial.rtMs===null));
  if(!validInput)reasons.push('Invalid attention trial data; no aggregate measurement is available.');
  if(trials.length===total&&trials.filter(trial=>trial.stimulus==='no_go').length!==GO_NO_GO_COUNT)reasons.push(`The session must contain exactly ${GO_NO_GO_COUNT} no-go stimuli.`);
  const eligible=validInput?trials.filter(trial=>trial.focused):[];
  const goTrials=eligible.filter(trial=>trial.stimulus==='go').length,noGoTrials=eligible.filter(trial=>trial.stimulus==='no_go').length;
  let metrics=missingMetrics(interruptions);
  if(eligible.length){
    metrics={...metrics,commissionErrors:noGoTrials?eligible.filter(trial=>trial.stimulus==='no_go'&&trial.responded).length:null,
      omissionErrors:goTrials?eligible.filter(trial=>trial.stimulus==='go'&&!trial.responded).length:null,validTrials:eligible.length,
      // Common CheckObservation definition in SPEC §4; commission counts still include early no-go taps.
      falseStarts:eligible.filter(trial=>trial.responded&&trial.rtMs!<REACTION_FALSE_START_MS).length,quality:'good'};
    const quality=getCheckQuality({id:'scoring-only',day:null,timestamp:null,source:'live',...metrics},'go_no_go');
    reasons.push(...quality.reasons);metrics.quality=quality.quality;
  }
  const quality=mergeQuality(metrics.quality,reasons);
  if(trials.some(trial=>!trial.focused))reasons.push('Unfocused stimuli are excluded from error counts.');
  return {...metrics,kind:'go_no_go',quality,complete:trials.length===total,validInput,presentedTrials:trials.length,expectedTrials:total,medianTrials:0,goTrials,noGoTrials,reasons};
}

/** xorshift32: caller supplies the seed; no clock, browser or randomness dependency. */
export function createSeededRandom(seed:number):()=>number {
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new Error('Seed must be a uint32.');
  let state=seed||0x9e3779b9;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/0x100000000;};
}
function randomFraction(random:()=>number):number {
  const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new Error('Random values must be in [0, 1).');return value;
}
export function createReactionDelays(random:()=>number):number[] {
  return Array.from({length:TOTAL_TRIALS.reaction},()=>REACTION_DELAY_MIN_MS+randomFraction(random)*(REACTION_DELAY_MAX_MS-REACTION_DELAY_MIN_MS));
}
export function createGoNoGoStimuli(random:()=>number):Stimulus[] {
  const stimuli:Stimulus[]=Array.from({length:TOTAL_TRIALS.go_no_go},(_,index)=>index<GO_NO_GO_COUNT?'no_go':'go');
  for(let index=stimuli.length-1;index>0;index--){const other=Math.floor(randomFraction(random)*(index+1));[stimuli[index],stimuli[other]]=[stimuli[other],stimuli[index]];}
  return stimuli;
}
