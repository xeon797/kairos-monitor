import { LOW_DEMAND_CONCERN_CAP, TASK_CHANGE_MIN_DOMAINS, TASK_REVIEW_MIN_DOMAINS } from './config';
import { domainsEstablished } from './detect';
import type { Baseline, Concern, DomainResult, ScheduledTask, TaskProfile, TaskResult } from './types';

export function evaluateTask(profile: TaskProfile, domains: readonly DomainResult[], baseline: Baseline | null, instance?: ScheduledTask): TaskResult {
  const relevantDomains = [...new Set(profile.relevantDomains)];
  const sustainedDomains = relevantDomains.filter(domain => domains.some(result => result.domain === domain && result.baselineEstablished && result.evaluable && result.sustained));
  const r = sustainedDomains.length;
  const reasons: string[] = [];
  if (!baseline) reasons.push('Baseline is unavailable.');
  if (!domainsEstablished(domains,relevantDomains)) reasons.push('Relevant domain evidence is unavailable or not evaluable.');
  if (instance && instance.taskId !== profile.id) reasons.push('Task instance does not match its task profile.');
  let concern: Concern = 'INSUFFICIENT_DATA';
  if (!reasons.length) {
    if (r < TASK_CHANGE_MIN_DOMAINS) concern = 'NO_RELEVANT_CHANGE';
    else if (profile.demand === 'low' || profile.reviewCap === LOW_DEMAND_CONCERN_CAP) concern = LOW_DEMAND_CONCERN_CAP;
    else concern = r >= TASK_REVIEW_MIN_DOMAINS[profile.demand] ? 'REVIEW_RECOMMENDED' : 'CHANGE_NOTED';
  }
  return { instanceId: instance?.id ?? null, taskId: profile.id, name: profile.name, demand: profile.demand,
    scheduledDay: instance?.scheduledDay ?? null, day: domains.find(result => relevantDomains.includes(result.domain))?.day ?? null,
    relevantDomains, sustainedDomains, r, concern, reasons };
}
