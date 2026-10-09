import { Link } from 'react-router-dom';
import { DOMAIN_LABELS, explain } from '../engine/templates';
import type { EvidencePacket } from '../engine/types';
import { ConcernChip } from './ConcernChip';
import { SyntheticBadge } from './SyntheticBadge';

export function taskTiming(scheduledDay:number,currentDay:number):string {
  const difference = scheduledDay-currentDay;
  return difference === 0 ? 'Today' : difference > 0 ? `In ${difference} ${difference === 1 ? 'day' : 'days'}` : `${-difference} ${difference === -1 ? 'day' : 'days'} ago`;
}
export function sortedTaskPackets(packets:readonly EvidencePacket[]):EvidencePacket[] {
  return [...packets].sort((left,right) => (left.task?.scheduledDay ?? Infinity)-(right.task?.scheduledDay ?? Infinity) || (left.task?.instanceId ?? '').localeCompare(right.task?.instanceId ?? '','en'));
}
export function TaskCard({packet}:{packet:EvidencePacket}) {
  const task = packet.task;
  if (!task) return null;
  return <article className="task-card" aria-label={task.instanceId ?? task.name}>
    <div className="card-heading"><span className="task-id">{task.instanceId}</span><SyntheticBadge /></div>
    <div className="task-title"><h3>{task.name}</h3><span className="demand-chip">{task.demand[0].toUpperCase()+task.demand.slice(1)} demand</span></div>
    <p className="task-schedule">Mission day {task.scheduledDay} <span>· {task.scheduledDay === null ? 'Schedule unavailable' : taskTiming(task.scheduledDay,packet.day)}</span></p>
    <ConcernChip concern={task.concern} />
    <p className="task-domains">{task.r} relevant sustained {task.r === 1 ? 'domain' : 'domains'}{task.sustainedDomains.length ? ` · ${task.sustainedDomains.map(domain => DOMAIN_LABELS[domain]).join(', ')}` : ''}</p>
    <p className="task-explanation">{explain(packet)}</p>
    <Link className="pill-button repeat-check" to="/check">Repeat check</Link>
  </article>;
}
