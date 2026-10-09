import { useApp } from '../state/useApp';
import { Explanation } from '../components/Explanation';
import { EvidenceList } from '../components/EvidenceRow';
import { StatusCard } from '../components/StatusCard';
import { sortedTaskPackets, TaskCard } from '../components/TaskCard';
import { LogScheduleChange } from '../components/LogScheduleChange';

export default function Today() {
  const app = useApp();
  const next = sortedTaskPackets(app.taskPackets).find(packet => packet.task?.scheduledDay !== null && packet.task?.scheduledDay !== undefined && packet.task.scheduledDay >= (app.currentDay ?? Infinity));
  return <section aria-labelledby="screen-heading">
    <div className="screen-heading"><p className="eyebrow">Kairos Monitor / Daily briefing</p><h1 id="screen-heading">Today</h1><p className="screen-subtitle">Personal changes, in mission context.</p></div>
    <StatusCard packet={app.packet} day={app.currentDay} loading={app.loading} error={app.error} />
    {app.packet && <div className="today-layout"><EvidenceList packet={app.packet} /><aside className="next-task" aria-labelledby="next-task-heading"><div className="section-heading"><p className="eyebrow">Mission context</p><h2 id="next-task-heading">Next task</h2></div>{next ? <TaskCard packet={next} /> : <p className="panel empty-state">No upcoming tasks in this simulation.</p>}<div className="task-action"><LogScheduleChange /></div></aside></div>}
    {app.packet && <section className="panel explanation-box" aria-labelledby="explanation-heading"><h2 id="explanation-heading">Reading the evidence</h2><Explanation packet={app.packet} /></section>}
    {app.packet && <section className="data-availability" aria-label="Data availability"><span>Sleep {app.packet.dataQuality.validSleepDays}/{app.packet.dataQuality.windowDays} days</span><span>Checks {app.packet.dataQuality.validCheckDays}/{app.packet.dataQuality.windowDays} days</span><span>Baseline: days {app.baseline?.window[0]}–{app.baseline?.window[1]} <strong>Frozen</strong></span></section>}
  </section>;
}
