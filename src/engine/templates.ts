import { domainsEstablished } from './detect';
import type { Concern, Domain, DomainResult, EvidencePacket, ResponseLog, Status } from './types';

// Re-export the sole existing declaration, keeping the foundation's import intact.
export { FOOTER_DISCLAIMER } from '../content';

export const STATUS_LABELS: Readonly<Record<Status, string>> = {
  INSUFFICIENT_DATA: 'Insufficient data', WITHIN_USUAL: 'Within your usual range',
  CHANGE_NOTED: 'Change noted', REVIEW_RECOMMENDED: 'Review recommended',
};
export const CONCERN_LABELS: Readonly<Record<Concern, string>> = {
  INSUFFICIENT_DATA: 'Insufficient data', NO_RELEVANT_CHANGE: 'No relevant change found',
  CHANGE_NOTED: 'Change noted', REVIEW_RECOMMENDED: 'Review recommended',
};
export const DOMAIN_LABELS: Readonly<Record<Domain,string>> = { sleep:'Sleep', reaction:'Reaction', attention:'Attention' };
export const TASK_DECISIONS = 'Task decisions remain with the crew and mission team.';
export const TREND_LABEL = 'Measures moving toward baseline';
export const NON_CAUSATION = 'This comparison does not show that the adjustment caused the change.';

export function reviewPromptFor(packet: EvidencePacket): string {
  const task = packet.task;
  const state = task?.concern ?? packet.status;
  if (state === 'INSUFFICIENT_DATA') return `Review missing or excluded evidence${task ? ` for ${task.instanceId ?? task.name}` : ''}. ${TASK_DECISIONS}`;
  if (state === 'WITHIN_USUAL' || state === 'NO_RELEVANT_CHANGE') return TASK_DECISIONS;
  if (task?.demand === 'low') return `No task-specific review is prompted. ${TASK_DECISIONS}`;
  if (state === 'REVIEW_RECOMMENDED') return task
    ? `Review recent sleep and repeat the check before ${task.instanceId ?? task.name}. ${TASK_DECISIONS}`
    : `Review recent sleep and repeat the check. ${TASK_DECISIONS}`;
  return `Review current evidence${task ? ` for ${task.instanceId ?? task.name}` : ''}. ${TASK_DECISIONS}`;
}

export function explain(packet: EvidencePacket): string {
  const task = packet.task;
  const state = task?.concern ?? packet.status;
  const relevant = task ? packet.domains.filter(result => task.relevantDomains.includes(result.domain)) : packet.domains;
  const taskIntro = task ? `${task.name} (${task.instanceId ?? task.taskId}) is a ${task.demand === 'low' ? 'lower' : task.demand}-demand task. ` : '';
  if (state === 'INSUFFICIENT_DATA') {
    const absent = relevant.filter(result => !result.evaluable || !result.baselineEstablished).map(result => DOMAIN_LABELS[result.domain].toLowerCase());
    const target = !packet.baseline ? 'the baseline and current evidence' : absent.join(', ') || 'current evidence';
    return `${taskIntro}There is not enough valid data to evaluate ${target}. ${packet.reviewPrompt}`;
  }
  if (state === 'WITHIN_USUAL' || state === 'NO_RELEVANT_CHANGE') {
    return `${taskIntro}No sustained change from baseline was found in the available data${task ? ' for its relevant domains' : ''}. ${packet.reviewPrompt}`;
  }
  // Each count belongs to its own domain; never describe a count as a duration range.
  const evidence = relevant.filter(result => result.sustained).map(result =>
    `${DOMAIN_LABELS[result.domain]} met a change criterion on ${result.metDaysInWindow} of the last ${result.windowDays} days`).join('; ');
  const monitoring = task?.demand === 'low' ? ' These changes are noted for routine monitoring.' : '';
  return `${evidence}. ${taskIntro.trim()}${monitoring} ${packet.reviewPrompt}`.replace(/ +/g,' ').trim();
}

export interface TrendChip { label: typeof TREND_LABEL | null; nonCausation: typeof NON_CAUSATION }

export function trendChip(day: number, responses: readonly ResponseLog[], current: readonly DomainResult[], previous: readonly DomainResult[]): TrendChip {
  const established = domainsEstablished(current,undefined,day) && domainsEstablished(previous,undefined,day - 1);
  // A window can remain evaluable while today's measurement is missing. A drop
  // caused by a gap as an older met day leaves the window is not improvement.
  const measuredDays = [...current,...previous].every(result => !result.exclusions.some(exclusion => exclusion.day === result.day));
  const falling = current.filter(result => result.sustained).length < previous.filter(result => result.sustained).length;
  return { label: established && measuredDays && falling && responses.some(response => response.day <= day) ? TREND_LABEL : null,
    nonCausation: NON_CAUSATION };
}
