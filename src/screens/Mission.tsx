import { useApp } from '../state/useApp';
import { sortedTaskPackets, TaskCard } from '../components/TaskCard';
import { SyntheticBadge } from '../components/SyntheticBadge';
import { StatusCard } from '../components/StatusCard';
import { ResponseLog } from '../components/ResponseLog';
import { STATUS_LABELS } from '../engine/templates';
import { STATUS_ICONS } from '../components/ConcernChip';

export default function Mission() {
  const app = useApp();
  return <section aria-labelledby="screen-heading">
    <div className="screen-heading"><p className="eyebrow">Kairos Monitor / Task context</p><h1 id="screen-heading">Mission</h1><p className="screen-subtitle">Same evidence. Different task demands.</p></div>
    {!app.packet ? <StatusCard packet={null} day={app.currentDay} loading={app.loading} error={app.error} /> : <>
      <div className="mission-context-strip"><div><p className="eyebrow">Current evidence / Day {app.currentDay}</p><p className={`mission-status status-${app.packet.status.toLowerCase()}`} aria-live="polite" aria-atomic="true"><span aria-hidden="true">{STATUS_ICONS[app.packet.status]}</span> {STATUS_LABELS[app.packet.status]}</p></div><SyntheticBadge /></div>
      <p className="mission-guidance">Each task uses the relevant domains and demand level. Concerns reflect today’s evidence, including for past tasks.</p>
      <div className="mission-task-list" aria-label="Mission schedule">{sortedTaskPackets(app.taskPackets).map(packet => <TaskCard key={packet.taskId} packet={packet} />)}</div>
    </>}
    <ResponseLog />
  </section>;
}
