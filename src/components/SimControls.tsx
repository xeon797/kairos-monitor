import { SIMULATION_MAX_DAY, SIMULATION_MIN_DAY } from '../engine/config';
import { useApp } from '../state/useApp';
import { SyntheticBadge } from './SyntheticBadge';
import { LogScheduleChange } from './LogScheduleChange';
import { ResponseHistory } from './ResponseLog';

export function SimControls({showLogAction = true,showResponses = true}:{showLogAction?:boolean;showResponses?:boolean}) {
  const app = useApp();
  const disabled = app.loading || app.mutating || !!app.error || app.currentDay === null;
  const days = Array.from({length:SIMULATION_MAX_DAY-SIMULATION_MIN_DAY+1},(_,index) => SIMULATION_MIN_DAY+index);
  return <section className="simulation-panel" aria-labelledby="simulation-heading" aria-busy={app.loading || app.mutating}>
    <div className="simulation-heading"><h2 id="simulation-heading">Synthetic mission telemetry</h2><SyntheticBadge /></div>
    <p className="simulation-description">Explore mission days {SIMULATION_MIN_DAY}–{SIMULATION_MAX_DAY}. Changes are stored on this device.</p>
    <div className="simulation-controls">
      <button className="pill-button primary-button" disabled={disabled || app.currentDay === SIMULATION_MAX_DAY} onClick={() => void app.advance()}>Advance day</button>
      <button className="pill-button" disabled={disabled || app.currentDay === SIMULATION_MIN_DAY} onClick={() => void app.back()}>Back one day</button>
      <label className="jump-control">Jump to day
        <select aria-label="Jump to day" value={app.currentDay ?? SIMULATION_MIN_DAY} disabled={disabled} onChange={event => void app.jump(Number(event.target.value))}>
          {days.map(day => <option key={day} value={day}>Day {day}</option>)}
        </select>
      </label>
      <button className="pill-button" disabled={disabled} onClick={() => void app.reset()}>Reset</button>
      {showLogAction && <LogScheduleChange />}
    </div>
    {showResponses ? <ResponseHistory responses={app.responses} currentDay={app.currentDay} mutating={app.mutating} trend={app.trend} /> : app.mutating && <p className="simulation-description" role="status">Saving local changes…</p>}
  </section>;
}
