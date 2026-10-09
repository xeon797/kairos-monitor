import type { ResponseLog as ResponseEntry } from '../engine/types';
import type { TrendChip } from '../engine/templates';
import { SCHEDULE_CHANGE_MIN_DAY } from '../engine/config';
import { useApp } from '../state/useApp';
import { LogScheduleChange } from './LogScheduleChange';
import { SyntheticBadge } from './SyntheticBadge';

export function ResponseHistory({responses,currentDay,mutating,trend}:{responses:readonly ResponseEntry[];currentDay:number | null;mutating:boolean;trend:TrendChip | null}) {
  return <>
    <p className="simulation-description" role="status">{mutating ? 'Saving local changes…' : `Schedule changes logged: ${responses.length}`}</p>
    {responses.length === 0 && <p className="response-empty">No schedule changes logged yet.</p>}
    <ol className="response-history">{responses.map(response => <li key={response.id}>
      <div className="response-metadata"><span>{response.type === 'rest_adjustment' ? 'Rest adjustment' : 'Workload adjustment'}</span>{currentDay !== null && response.day > currentDay && <span className="future-response">After the selected day · Day {response.day}</span>}</div>
      <p className="response-entry">Day {response.day} · {response.note}</p>
    </li>)}</ol>
    {trend?.label && <div className="recovery-preview"><p className="recovery-chip">{trend.label}</p><p>{trend.nonCausation}</p></div>}
  </>;
}
export function ResponseLog() {
  const app = useApp();
  return <section className="panel response-log" aria-labelledby="response-heading">
    <div className="card-heading"><div><p className="eyebrow">Human-entered adjustments</p><h2 id="response-heading">Response log</h2></div><SyntheticBadge /></div>
    <p className="response-description">A record of schedule changes. Entries remain visible when you revisit earlier mission days.</p>
    <ResponseHistory responses={app.responses} currentDay={app.currentDay} mutating={app.mutating} trend={app.trend} />
    <div className="response-action"><LogScheduleChange /><span>Available from mission day {SCHEDULE_CHANGE_MIN_DAY}</span></div>
  </section>;
}
