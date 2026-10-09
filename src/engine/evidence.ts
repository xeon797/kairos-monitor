import { WINDOW_DAYS } from './config';
import { DOMAINS, evaluateDomains, overallStatus } from './detect';
import { evaluateTask } from './taskContext';
import { reviewPromptFor } from './templates';
import type { Baseline, DomainResult, EvidencePacket, ScheduledTask, TaskProfile } from './types';

export function buildEvidencePacket(day: number, baseline: Baseline | null, domains: readonly DomainResult[],
  task?: { profile: TaskProfile; instance?: ScheduledTask }): EvidencePacket {
  const missing = evaluateDomains(day,baseline,[],[]);
  // Stale or ambiguous results are missing current evidence, never relabeled today.
  const current = DOMAINS.map((domain,index) => {
    const matches = domains.filter(result => result.domain === domain && result.day === day);
    const result = matches.length === 1 ? matches[0] : missing[index];
    const copy = (measurement: DomainResult['latest']) => ({...measurement,reasons:[...measurement.reasons]});
    return {...result,latest:copy(result.latest),measurements:result.measurements.map(copy),
      exclusions:result.exclusions.map(exclusion => ({day:exclusion.day,reasons:[...exclusion.reasons]}))};
  });
  const evaluatedTask = task ? evaluateTask(task.profile,current,baseline,task.instance) : undefined;
  // Combined check availability is the intersection of reaction/attention days,
  // not their minimum count (which can overstate availability in disjoint gaps).
  const excludedCheckDays = new Set(current.filter(result => result.domain !== 'sleep').flatMap(result => result.exclusions.map(exclusion => exclusion.day)));
  const notes = [...new Set(current.flatMap(result => [
    ...result.exclusions.flatMap(exclusion => exclusion.reasons.map(reason => `Day ${exclusion.day}: ${reason}`)),
    ...result.measurements.flatMap(measurement => measurement.reasons.map(reason => `Day ${measurement.day}: ${reason}`)),
  ]))];
  if (!baseline) notes.unshift('Baseline is unavailable.');
  const packet: EvidencePacket = {
    day, status:overallStatus(current,baseline),
    baseline:baseline ? {...baseline,window:[...baseline.window]} : null,
    ...(evaluatedTask ? {taskId:evaluatedTask.instanceId ?? evaluatedTask.taskId,taskConcern:evaluatedTask.concern,task:evaluatedTask} : {}),
    domains:current, dataQuality:{validSleepDays:current[0].validDaysInWindow,
      validCheckDays:WINDOW_DAYS-excludedCheckDays.size,windowDays:WINDOW_DAYS,notes},
    provenance:current.flatMap(result => result.measurements.flatMap(measurement => measurement.source ? [{
      label:`${measurement.metric} · day ${measurement.day} · ${measurement.unit} · ${measurement.quality} quality`,source:measurement.source,
    }] : [])), reviewPrompt:'',
  };
  packet.reviewPrompt = reviewPromptFor(packet);
  return packet;
}
