import { CONCERN_LABELS, DOMAIN_LABELS, STATUS_LABELS } from '../engine/templates';
import type { Status } from '../engine/types';
import { useApp } from '../state/useApp';
import { SyntheticBadge } from './SyntheticBadge';

const icons:Record<Status,string> = {INSUFFICIENT_DATA:'○',WITHIN_USUAL:'✓',CHANGE_NOTED:'◐',REVIEW_RECOMMENDED:'⚑'};
export function EnginePreview() {
  const app = useApp();
  const status = app.packet?.status ?? 'INSUFFICIENT_DATA';
  return <section className="engine-preview" aria-labelledby="engine-preview-heading">
    <div className="simulation-heading"><h2 id="engine-preview-heading">Temporary engine preview</h2><SyntheticBadge /></div>
    <p className="simulation-description">Verification preview. The Today and Mission screens will be connected in P5.</p>
    <p className={`engine-status status-${status.toLowerCase()}`} aria-live="polite"><span aria-hidden="true">{icons[status]}</span> <span>{STATUS_LABELS[status]}</span></p>
    {app.loading && <p className="simulation-description" role="status">Loading local mission storage…</p>}
    {app.error && <p className="storage-error" role="alert">Local storage unavailable: {app.error} Reload to retry. Existing records have been preserved.</p>}
    {app.packet && <ul className="domain-preview" aria-label="Domain criterion counts">
      {app.packet.domains.map(domain => <li key={domain.domain}>
        <strong>{DOMAIN_LABELS[domain.domain]}</strong>
        <span>{domain.metDaysInWindow} of {domain.windowDays} days · {domain.evaluable ? domain.sustained ? 'Sustained' : 'Not sustained' : CONCERN_LABELS.INSUFFICIENT_DATA}</span>
      </li>)}
    </ul>}
  </section>;
}
