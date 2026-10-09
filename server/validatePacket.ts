import { BASELINE_WINDOW, SIMULATION_MAX_DAY, SIMULATION_MIN_DAY, WINDOW_DAYS } from '../src/engine/config.js';
import { computeBaseline } from '../src/engine/baseline.js';
import { evaluateDomains } from '../src/engine/detect.js';
import { buildEvidencePacket } from '../src/engine/evidence.js';
import { missionSchedule, syntheticChecks, syntheticSleep, taskLibrary } from '../src/engine/scenarios.js';
import type { EvidencePacket } from '../src/engine/types.js';
import { explanationCacheKey } from '../src/engine/validateExplanation.js';

type ObjectValue = Record<string,unknown>;
function object(value:unknown,required:string[],optional:string[] = []): value is ObjectValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && required.every(key => Object.hasOwn(value,key)) && Object.keys(value).every(key => [...required,...optional].includes(key));
}
function number(value:unknown,min:number,max:number,integer = false): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value)); }
function strings(value:unknown):boolean { return Array.isArray(value) && value.length <= 30 && value.every(item => typeof item === 'string' && item.length <= 250); }
function day(value:unknown):value is number { return number(value,1,SIMULATION_MAX_DAY,true); }
function measurement(value:unknown):boolean {
  if (!object(value,['metric','value','unit','baseline','deltaAbs','deltaPct','day','source','quality','reasons'])) return false;
  const units: Record<string,string> = {sleepHours:'h',midpointMinutes:'min',medianRtMs:'ms',lapses:'count',commissionErrors:'count'};
  if (typeof value.metric !== 'string' || !Object.hasOwn(units,value.metric) || value.unit !== units[value.metric]) return false;
  const max = value.unit === 'h' ? 24 : value.unit === 'min' ? 1440 : value.unit === 'ms' ? 10000 : 40;
  return (value.value === null || number(value.value,0,max,value.unit === 'count')) && (value.baseline === null || number(value.baseline,0,max)) &&
    (value.deltaAbs === null || number(value.deltaAbs,-max,max)) && (value.deltaPct === null || number(value.deltaPct,-100,10000)) && day(value.day) &&
    (value.source === 'synthetic' || value.source === null && value.quality === 'missing' && value.value === null) && ['good','poor','missing'].includes(String(value.quality)) && strings(value.reasons);
}
function domain(value:unknown):boolean {
  if (!object(value,['domain','day','baselineEstablished','evaluable','sustained','metDaysInWindow','validDaysInWindow','windowDays','latest','measurements','exclusions'])) return false;
  return ['sleep','reaction','attention'].includes(String(value.domain)) && day(value.day) &&
    ['baselineEstablished','evaluable','sustained'].every(key => typeof value[key] === 'boolean') &&
    number(value.metDaysInWindow,0,WINDOW_DAYS,true) && number(value.validDaysInWindow,0,WINDOW_DAYS,true) && value.metDaysInWindow <= value.validDaysInWindow && value.windowDays === WINDOW_DAYS &&
    measurement(value.latest) && Array.isArray(value.measurements) && value.measurements.length <= 2 && value.measurements.every(measurement) &&
    Array.isArray(value.exclusions) && value.exclusions.length <= WINDOW_DAYS && value.exclusions.every(item => object(item,['day','reasons']) && day(item.day) && strings(item.reasons));
}
function baseline(value:unknown):boolean {
  if (value === null) return true;
  if (!object(value,['window','sleepMeanHours','midpointMeanMinutes','rtMeanMs','lapsesMean','errorsMean','validSleepNights','validChecks','frozenAt'])) return false;
  return Array.isArray(value.window) && value.window.length === 2 && value.window.every((item,index) => item === BASELINE_WINDOW[index]) &&
    number(value.sleepMeanHours,0,24) && number(value.midpointMeanMinutes,0,1440) && number(value.rtMeanMs,0,10000) && number(value.lapsesMean,0,40) && number(value.errorsMean,0,40) &&
    number(value.validSleepNights,0,BASELINE_WINDOW[1],true) && number(value.validChecks,0,BASELINE_WINDOW[1],true) && typeof value.frozenAt === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value.frozenAt) && Number.isFinite(Date.parse(value.frozenAt));
}
function task(value:unknown):boolean {
  if (!object(value,['instanceId','taskId','name','demand','scheduledDay','day','relevantDomains','sustainedDomains','r','concern','reasons'])) return false;
  const profile = taskLibrary.find(profile => profile.id === value.taskId);
  const scheduled = missionSchedule.find(item => item.id === value.instanceId && item.taskId === value.taskId);
  return !!profile && !!scheduled && value.name === profile.name && value.demand === profile.demand && value.scheduledDay === scheduled.scheduledDay && day(value.day) &&
    JSON.stringify(value.relevantDomains) === JSON.stringify(profile.relevantDomains) && Array.isArray(value.sustainedDomains) && value.sustainedDomains.length <= profile.relevantDomains.length && value.sustainedDomains.every(item => profile.relevantDomains.includes(item)) && number(value.r,0,profile.relevantDomains.length,true) &&
    ['INSUFFICIENT_DATA','NO_RELEVANT_CHANGE','CHANGE_NOTED','REVIEW_RECOMMENDED'].includes(String(value.concern)) && strings(value.reasons);
}

/** Public endpoint is intentionally restricted to the adopted synthetic fixture.
 * Shape validation precedes engine reconstruction; arbitrary packet text is never a prompt. */
export function validatePacket(value:unknown): EvidencePacket | null {
  if (!object(value,['day','status','baseline','domains','dataQuality','provenance','reviewPrompt'],['task','taskId','taskConcern'])) return null;
  if (!number(value.day,SIMULATION_MIN_DAY,SIMULATION_MAX_DAY,true) || !['INSUFFICIENT_DATA','WITHIN_USUAL','CHANGE_NOTED','REVIEW_RECOMMENDED'].includes(String(value.status)) || !baseline(value.baseline)) return null;
  if (!Array.isArray(value.domains) || value.domains.length !== 3 || !value.domains.every(domain)) return null;
  if (!object(value.dataQuality,['validSleepDays','validCheckDays','windowDays','notes']) || !number(value.dataQuality.validSleepDays,0,WINDOW_DAYS,true) || !number(value.dataQuality.validCheckDays,0,WINDOW_DAYS,true) || value.dataQuality.windowDays !== WINDOW_DAYS || !strings(value.dataQuality.notes)) return null;
  if (!Array.isArray(value.provenance) || !value.provenance.length || value.provenance.length > 5 || !value.provenance.every(item => object(item,['label','source']) && item.source === 'synthetic' && typeof item.label === 'string' && item.label.length <= 120)) return null;
  if (typeof value.reviewPrompt !== 'string' || value.reviewPrompt.length > 300) return null;
  if (value.task !== undefined && !task(value.task)) return null;
  if ((value.task !== undefined) !== (value.taskId !== undefined && value.taskConcern !== undefined)) return null;
  // A structural narrowing alone cannot verify semantic consistency. Compare to
  // the existing pure engine's exact demo output, including provenance and prompts.
  const packet = value as unknown as EvidencePacket;
  if (packet.baseline && explanationCacheKey({...packet,baseline:computeBaseline(syntheticSleep,syntheticChecks,BASELINE_WINDOW,packet.baseline.frozenAt,'reaction')}) !== explanationCacheKey(packet)) return null;
  const profile = taskLibrary.find(profile => profile.id === packet.task?.taskId);
  const instance = missionSchedule.find(instance => instance.id === packet.taskId);
  const expected = buildEvidencePacket(packet.day,packet.baseline,evaluateDomains(packet.day,packet.baseline,syntheticSleep,syntheticChecks),profile && instance ? {profile,instance} : undefined);
  return explanationCacheKey(expected) === explanationCacheKey(packet) ? expected : null;
}
