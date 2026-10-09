import { DOMAIN_LABELS, STATUS_LABELS } from '../engine/templates';
import { SIMULATION_MAX_DAY } from '../engine/config';
import type { EvidencePacket } from '../engine/types';
import { STATUS_ICONS } from './ConcernChip';
import { SyntheticBadge } from './SyntheticBadge';

export function StatusCard({packet,day,loading,error}:{packet:EvidencePacket | null;day:number | null;loading:boolean;error:string | null}) {
  const availablePacket = loading || error ? null : packet;
  const status = availablePacket?.status ?? 'INSUFFICIENT_DATA';
  const sustained = packet?.domains.filter(domain => domain.sustained).map(domain => DOMAIN_LABELS[domain.domain].toLowerCase());
  const summary = loading ? 'Loading local mission storage…' : error ? 'Current evidence is unavailable.' : status === 'INSUFFICIENT_DATA'
    ? 'Some evidence is missing or excluded. Review data availability below.' : sustained?.length
      ? `Sustained changes in ${sustained.join(', ')} relative to your frozen baseline.`
      : 'No sustained change found in the available evidence. Individual measurements may still differ from baseline.';
  return <section className="status-card engine-preview" aria-label="Overall status">
    <div className="card-heading"><p className="eyebrow">Alex / Personal baseline</p><SyntheticBadge /></div>
    <div className="status-layout"><div><p className={`engine-status status-${status.toLowerCase()}`} aria-live="polite" aria-atomic="true"><span aria-hidden="true">{STATUS_ICONS[status]}</span> <span>{STATUS_LABELS[status]}</span></p><p className="status-summary">{summary}</p></div><p className="day-metric"><span className="eyebrow">Mission day</span><strong>{day ?? '—'}</strong><span>of {SIMULATION_MAX_DAY}</span></p></div>
    {error && <p className="storage-error" role="alert">Local storage unavailable: {error} Reload to retry. Existing records have been preserved.</p>}
    {availablePacket && <ul className="domain-preview" aria-label="Domain criterion counts">{availablePacket.domains.map(domain => <li key={domain.domain}><strong>{DOMAIN_LABELS[domain.domain]}</strong><span>{domain.metDaysInWindow} of {domain.windowDays} days · {domain.evaluable ? domain.sustained ? 'Sustained' : 'Not sustained' : 'Insufficient data'}</span></li>)}</ul>}
  </section>;
}
