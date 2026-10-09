import { SCHEDULE_CHANGE_MIN_DAY, SIMULATION_MAX_DAY, SIMULATION_MIN_DAY } from '../engine/config';
import { useApp } from '../state/useApp';
import { SyntheticBadge } from './SyntheticBadge';

export function SimControls() {
  const app = useApp();
  const disabled = app.loading || app.mutating || !!app.error || app.currentDay === null;
  const days = Array.from({length:SIMULATION_MAX_DAY-SIMULATION_MIN_DAY+1},(_,index) => SIMULATION_MIN_DAY+index);
  return <section className="simulation-panel" aria-labelledby="simulation-heading" aria-busy={app.loading || app.mutating}>
    <div className="simulation-heading"><h2 id="simulation-heading">Synthetic mission telemetry</h2><SyntheticBadge /></div>
    <p className="simulation-description">Explore the adopted synthetic scenario. These controls are shared across all four routes.</p>
    <div className="simulation-controls">
      <button className="pill-button primary-button" disabled={disabled || app.currentDay === SIMULATION_MAX_DAY} onClick={() => void app.advance()}>Advance day</button>
      <button className="pill-button" disabled={disabled || app.currentDay === SIMULATION_MIN_DAY} onClick={() => void app.back()}>Back one day</button>
      <label className="jump-control">Jump to day
        <select aria-label="Jump to day" value={app.currentDay ?? SIMULATION_MIN_DAY} disabled={disabled} onChange={event => void app.jump(Number(event.target.value))}>
          {days.map(day => <option key={day} value={day}>Day {day}</option>)}
        </select>
      </label>
      <button className="pill-button" disabled={disabled} onClick={() => void app.reset()}>Reset</button>
      <button className="pill-button primary-button" disabled={disabled || (app.currentDay ?? SIMULATION_MIN_DAY) < SCHEDULE_CHANGE_MIN_DAY} onClick={() => void app.logResponse()}>Log schedule change</button>
    </div>
    <p className="simulation-description" role="status">{app.mutating ? 'Saving local changes…' : `Schedule changes logged: ${app.responses.length}`}</p>
    {app.responses.map(response => <p className="response-entry" key={response.id}>Day {response.day} · {response.note}</p>)}
    {app.trend?.label && <div className="recovery-preview"><p className="recovery-chip">{app.trend.label}</p><p>{app.trend.nonCausation}</p></div>}
  </section>;
}
