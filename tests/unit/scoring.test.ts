import { describe, expect, it } from 'vitest';
import { createGoNoGoStimuli, createReactionDelays, createSeededRandom, scoreGoNoGo, scoreReaction, type ReactionTrial } from '../../src/checks/scoring';
const response=(rtMs:number):ReactionTrial=>({outcome:'response',rtMs,focused:true});
const full=()=>Array.from({length:25},()=>response(250));
describe('reaction scoring',()=>{
  it('excludes false starts from median and includes slow responses',()=>{
    const score=scoreReaction([response(99),response(100),response(500),response(501)]);
    expect(score.medianRtMs).toBe(500);expect(score.validTrials).toBe(3);expect(score.falseStarts).toBe(1);expect(score.lapses).toBe(1);
    expect(score.complete).toBe(false);expect(score.quality).toBe('poor');
  });
  it('computes the even median without rounding',()=>{expect(scoreReaction([response(100.25),response(101.5)]).medianRtMs).toBe(100.875);});
  it('counts timeout lapses without inventing a median response',()=>{
    const score=scoreReaction([{outcome:'timeout',rtMs:null,focused:true},response(300)]);
    expect(score.lapses).toBe(1);expect(score.medianRtMs).toBe(300);expect(score.validTrials).toBe(1);
    expect(scoreReaction(Array.from({length:25},()=>({outcome:'timeout',rtMs:null,focused:true}))).medianRtMs).toBeNull();
  });
  it('counts waiting-period responses as premature, with no RT',()=>{const score=scoreReaction([{outcome:'premature',rtMs:null,focused:true}]);expect(score.falseStarts).toBe(1);expect(score.medianRtMs).toBeNull();});
  it('returns null unmeasured fields for an empty session',()=>{const score=scoreReaction([]);expect(score.medianRtMs).toBeNull();expect(score.lapses).toBeNull();expect(score.falseStarts).toBeNull();expect(score.quality).toBe('missing');});
  it.each([-1,NaN,Infinity,2000])('rejects invalid measured RT %s',rtMs=>{const score=scoreReaction([response(rtMs)]);expect(score.validInput).toBe(false);expect(score.medianRtMs).toBeNull();});
  it('applies exact trial/false-start/interruption quality limits',()=>{
    expect(scoreReaction(full(),2).quality).toBe('good');expect(scoreReaction(full(),3).quality).toBe('poor');
    const trials=full();trials.splice(0,5,...Array.from({length:5},()=>response(99)));expect(scoreReaction(trials).quality).toBe('good');
    trials[5]=response(99);expect(scoreReaction(trials).quality).toBe('poor');
  });
  it('excludes unfocused trials and preserves the denominator',()=>{
    const trials=full();trials[0]={...response(999),focused:false};const score=scoreReaction(trials);
    expect(score.medianRtMs).toBe(250);expect(score.lapses).toBe(0);expect(score.validTrials).toBe(24);expect(score.presentedTrials).toBe(25);expect(score.quality).toBe('good');
  });
  it('rejects noninteger interruptions and overlong sessions without mutation',()=>{
    const trials=Object.freeze(full());const before=JSON.stringify(trials);expect(scoreReaction(trials,-1).validInput).toBe(false);expect(scoreReaction([...trials,response(250)]).validInput).toBe(false);expect(JSON.stringify(trials)).toBe(before);
  });
});
describe('attention scoring and deterministic schedules',()=>{
  it('counts commissions and omissions independently for measured focused stimuli',()=>{
    const score=scoreGoNoGo([{stimulus:'no_go',responded:true,rtMs:99,focused:true},{stimulus:'go',responded:false,rtMs:null,focused:true},{stimulus:'go',responded:true,rtMs:100,focused:true},{stimulus:'no_go',responded:false,rtMs:null,focused:true}]);
    expect(score.commissionErrors).toBe(1);expect(score.omissionErrors).toBe(1);expect(score.validTrials).toBe(4);
    expect(score.medianRtMs).toBeNull();expect(score.lapses).toBeNull();expect(score.falseStarts).toBe(1);
  });
  it('leaves empty metrics missing and excludes unfocused stimuli',()=>{
    expect(scoreGoNoGo([]).commissionErrors).toBeNull();expect(scoreGoNoGo([{stimulus:'no_go',responded:true,rtMs:250,focused:false}]).commissionErrors).toBeNull();
  });
  it('rejects malformed, interrupted and composition-invalid sessions honestly',()=>{
    expect(scoreGoNoGo([],0.5).validInput).toBe(false);
    const trials=createGoNoGoStimuli(createSeededRandom(1)).map(stimulus=>({stimulus,responded:stimulus==='go',rtMs:stimulus==='go'?250:null,focused:true}));
    const score=scoreGoNoGo(trials,3);expect(score.complete).toBe(true);expect(score.reasons).toContain('More than 2 interruptions.');
    expect(scoreGoNoGo(trials.map(trial=>({...trial,stimulus:'go' as const}))).reasons.join(' ')).toContain('exactly 10');
  });
  it('uses the common measured false-start definition without removing no-go commissions',()=>{
    const trials=createGoNoGoStimuli(createSeededRandom(1)).map(stimulus=>({stimulus,responded:true,rtMs:100,focused:true}));
    expect(scoreGoNoGo(trials)).toMatchObject({quality:'good',commissionErrors:10,omissionErrors:0,falseStarts:0,validTrials:40});
    for(let index=0;index<5;index++)trials[index].rtMs=99;
    expect(scoreGoNoGo(trials).quality).toBe('good');trials[5].rtMs=99;
    expect(scoreGoNoGo(trials)).toMatchObject({quality:'poor',falseStarts:6,commissionErrors:10});
  });
  it.each([-1,NaN,Infinity,800])('rejects invalid attention response timing %s',rtMs=>{
    expect(scoreGoNoGo([{stimulus:'go',responded:true,rtMs,focused:true}]).validInput).toBe(false);
  });
  it('uses exactly the focused-stimulus minimum and does not fill missing response timing',()=>{
    const trials=createGoNoGoStimuli(createSeededRandom(1)).map((stimulus,index)=>({stimulus,responded:false,rtMs:null,focused:index<30}));
    expect(scoreGoNoGo(trials).quality).toBe('good');trials[29].focused=false;expect(scoreGoNoGo(trials).quality).toBe('poor');
    expect(scoreGoNoGo([{stimulus:'go',responded:true,rtMs:null,focused:true}]).commissionErrors).toBeNull();
  });
  it('keeps an entirely unobserved stimulus type missing rather than declaring zero errors',()=>{
    const trials=createGoNoGoStimuli(createSeededRandom(1)).map(stimulus=>({stimulus,responded:false,rtMs:null,focused:stimulus==='go'}));
    expect(scoreGoNoGo(trials)).toMatchObject({commissionErrors:null,omissionErrors:30,noGoTrials:0,goTrials:30,quality:'missing'});
  });
  it('generates a repeatable 25-delay protocol within documented bounds',()=>{
    const delays=createReactionDelays(createSeededRandom(123));expect(delays).toEqual(createReactionDelays(createSeededRandom(123)));
    expect(delays).toHaveLength(25);expect(delays.every(delay=>delay>=1500&&delay<4000)).toBe(true);expect(new Set(delays).size).toBeGreaterThan(1);
  });
  it('shuffles exactly 30 go and 10 no-go stimuli deterministically',()=>{
    const stimuli=createGoNoGoStimuli(createSeededRandom(123));expect(stimuli).toEqual(createGoNoGoStimuli(createSeededRandom(123)));
    expect(stimuli).toHaveLength(40);expect(stimuli.filter(s=>s==='no_go')).toHaveLength(10);expect(stimuli.filter(s=>s==='go')).toHaveLength(30);
  });
  it.each([-1,0.5,Infinity,0x100000000])('rejects invalid seed %s',seed=>expect(()=>createSeededRandom(seed)).toThrow());
  it.each([-1,1,NaN,Infinity])('rejects invalid injected random fraction %s',fraction=>expect(()=>createReactionDelays(()=>fraction)).toThrow());
});
