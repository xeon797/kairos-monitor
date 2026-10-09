import { MAX_EXPLANATION_WORDS } from './config.js';
import { CONCERN_LABELS, STATUS_LABELS } from './templates.js';
import type { EvidencePacket, MeasurementEvidence } from './types.js';

export const EXPLANATION_CONTRACT_VERSION = 'kairos-explanation-v1';
const banned = /\b(?:cleared|clearance|fit\s+for\s+duty|unfit|safe|unsafe|diagnos\w*|impaired|fatigued|disorder|prescribe|treat|medicate|dangerous|risk\s+of\s+accident|predict)\b/i;
const metricNames: Record<MeasurementEvidence['metric'], RegExp> = {
  sleepHours: /\bsleep(?:\s+duration)?\b/i,
  midpointMinutes: /\b(?:sleep\s+)?midpoint\b/i,
  medianRtMs: /\b(?:reaction(?:\s+time)?|rt)\b/i,
  lapses: /\blapses?\b/i,
  commissionErrors: /\b(?:commission(?:\s+errors?)?|errors?)\b/i,
};
const words: Record<string, number> = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18, nineteen:19, twenty:20 };

/** Only the UI's precision and the explicitly documented three-place baseline rounding. */
function matchesNumber(number: number, value: number | null, measurement?: MeasurementEvidence): boolean {
  if (value === null || !Number.isFinite(value)) return false;
  if (number === value) return true;
  const precision = measurement?.unit === 'h' || measurement?.unit === 'count' ? 2 : 1;
  return number === Number(value.toFixed(precision)) ||
    (measurement !== undefined && value === measurement.baseline && number === Number(value.toFixed(3)));
}

function numericClaims(text: string, packet: EvidencePacket): boolean {
  // Remove only this packet's identity. An unrelated task ID is not a numeric exemption.
  let body = text.replace(/\b(?:EVA|INV|MAINT|DOCK)-\d+\b/gi, id => id === packet.taskId ? '' : '999999');
  body = body.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi, word => String(words[word.toLowerCase()]));
  // Reject representations we cannot reliably associate with the packet.
  if (/\b(?:hundred|thousand|million)\b|\d\s*:\s*\d|\d[eE][+-]?\d/.test(body)) return false;
  const measurements = packet.domains.flatMap(domain => domain.measurements);
  for (const match of body.matchAll(/[+-]?\d+(?:\.\d+)?/g)) {
    const n = Number(match[0]);
    const position = match.index;
    const start = Math.max(body.lastIndexOf(';',position), body.lastIndexOf('\n',position), body.lastIndexOf('. ',position));
    const next = body.slice(position).search(/[;\n]|\.\s/);
    const end = next < 0 ? body.length : position + next;
    const clause = body.slice(start + 1,end);
    const before = body.slice(start + 1,position);
    const after = body.slice(position + match[0].length,end);
    if (/\b(?:day|days)\s*$/i.test(before) && [packet.day,packet.task?.scheduledDay,...measurements.map(m => m.day),...(packet.baseline?.window ?? [])].includes(n)) continue;
    if (/\b(?:last|window(?:\s+of)?)\s*$/i.test(before) && /^\s*days\b/i.test(after)) { if (n !== packet.dataQuality.windowDays) return false; continue; }
    const domain = [...packet.domains].reverse().find(d => new RegExp(`\\b${d.domain}\\b`,'i').test(before));
    if (domain && /\b(?:criterion|criteria|met|valid|on)\b/i.test(clause) && /\b(?:days|of|out of)\b|\//i.test(clause)) {
      const expected = /\bof(?:\s+the)?\s*$/i.test(before) || /\/\s*$/.test(before) ? domain.windowDays : /\bvalid\b/i.test(clause) ? domain.validDaysInWindow : domain.metDaysInWindow;
      if (n === expected) continue;
      return false;
    }
    if (/\b(?:sustained|relevant)\b/i.test(clause) && /^\s*(?:relevant\s+)?(?:sustained\s+)?domains\b/i.test(after) && n === (packet.task?.r ?? packet.domains.filter(d => d.sustained).length)) continue;
    const unitMatch = after.match(/^\s*(%|hours?\b|h\b|minutes?\b|min\b|milliseconds?\b|ms\b|counts?\b|lapses?\b|commission\s+errors?\b)/i);
    const unit = unitMatch?.[1].toLowerCase();
    // Choose the nearest named metric, with the more specific midpoint winning over sleep.
    const named = measurements.map(m => ({m,index: [...before.matchAll(new RegExp(metricNames[m.metric].source,'gi'))].at(-1)?.index ?? -1}))
      .filter(item => item.index >= 0).sort((a,b) => b.index - a.index || (a.m.metric === 'midpointMinutes' ? -1 : 1));
    let measurement: MeasurementEvidence | undefined = named[0]?.m;
    if (!measurement && /^\s*lapses?\b/i.test(after)) measurement = measurements.find(m => m.metric === 'lapses');
    if (!measurement && /^\s*commission\s+errors?\b/i.test(after)) measurement = measurements.find(m => m.metric === 'commissionErrors');
    if (!measurement || !unit || measurement.quality !== 'good' || measurement.value === null) return false;
    const actualUnit = unit === '%' ? '%' : /^(?:h|hour)/.test(unit) ? 'h' : /^(?:ms|millisecond)/.test(unit) ? 'ms' : /^(?:min|minute)/.test(unit) ? 'min' : 'count';
    if (actualUnit !== '%' && actualUnit !== measurement.unit) return false;
    const values = actualUnit === '%' ? [measurement.deltaPct] : /\bbaseline\b/i.test(before) && !/\b(?:difference|delta)\b/i.test(before) ? [measurement.baseline] : /\b(?:difference|delta)\b/i.test(before) ? [measurement.deltaAbs] : [measurement.value];
    if (!values.some(value => matchesNumber(n,value,actualUnit === '%' ? undefined : measurement))) return false;
  }
  return true;
}

export function validateExplanation(text: string, packet: EvidencePacket): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!text.trim()) reasons.push('empty');
  if (text.trim().split(/\s+/).length > MAX_EXPLANATION_WORDS) reasons.push('too_long');
  if (banned.test(text)) reasons.push('banned_language');
  if (!numericClaims(text,packet)) reasons.push('unsupported_numeric_claim');
  const state = packet.taskConcern ?? packet.status;
  const expected = packet.taskConcern ? CONCERN_LABELS[packet.taskConcern] : STATUS_LABELS[packet.status];
  if ([...new Set([...Object.values(STATUS_LABELS),...Object.values(CONCERN_LABELS)])].some(label => label !== expected && text.toLowerCase().includes(label.toLowerCase()))) reasons.push('contradictory_label');
  const changed = state === 'CHANGE_NOTED' || state === 'REVIEW_RECOMMENDED';
  if ((changed || state === 'INSUFFICIENT_DATA') && /\b(?:no sustained change|all (?:good|normal)|everything is normal|no concerns|no review (?:is )?needed|ready for|can proceed)\b/i.test(text)) reasons.push('contradictory_status');
  if (requiresReviewState(state,packet) && /\b(?:review (?:is )?not (?:recommended|required|needed)|no need (?:for|to) (?:a )?review)\b/i.test(text)) reasons.push('contradictory_status');
  if ((state === 'WITHIN_USUAL' || state === 'NO_RELEVANT_CHANGE') && /\b(?:sustained changes?|review is (?:needed|required))\b/i.test(text) && !/\bno sustained change\b/i.test(text)) reasons.push('contradictory_status');
  if (state === 'INSUFFICIENT_DATA' && !/\b(?:insufficient|missing|not enough|unavailable|excluded)\b/i.test(text)) reasons.push('missing_availability');
  if (packet.taskId && !text.includes(packet.taskId)) reasons.push('missing_task_identity');
  const requiresReview = requiresReviewState(state,packet);
  const prompt = /\b(?:review (?:recent sleep|current evidence|the evidence|missing|excluded)|repeat (?:the |a )?check)\b/i;
  if (requiresReview && (!prompt.test(text) || /\b(?:no|not|without|avoid|skip|do not)\b[^.;]{0,35}\b(?:review|repeat)\b/i.test(text))) reasons.push('missing_review_prompt');
  if (packet.task?.demand === 'low' && /\b(?:repeat (?:the |a )?check|review recent sleep|review recommended)\b/i.test(text)) reasons.push('unsupported_low_demand_prompt');
  if (/\b(?:take medication|you should|you must|recommend (?:sleeping|taking)|increase your|reduce your|caused (?:by|the)|will recover|will improve)\b/i.test(text)) reasons.push('unsupported_recommendation');
  return {ok:reasons.length === 0,reasons:[...new Set(reasons)]};
}

function requiresReviewState(state:string,packet:EvidencePacket):boolean {
  return state === 'INSUFFICIENT_DATA' || (['CHANGE_NOTED','REVIEW_RECOMMENDED'].includes(state) && packet.task?.demand !== 'low');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const object = value as Record<string,unknown>;
  return `{${Object.keys(object).filter(key => object[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${canonical(object[key])}`).join(',')}}`;
}

/** Full canonical material avoids hash collisions and browser crypto dependencies. */
export function explanationCacheKey(packet: EvidencePacket): string {
  return `${EXPLANATION_CONTRACT_VERSION}:${canonical(packet)}`;
}
