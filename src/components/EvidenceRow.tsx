import { DOMAIN_LABELS } from '../engine/templates';
import type { DomainResult, EvidencePacket, MeasurementEvidence } from '../engine/types';
import { ProvenanceTag } from './ProvenanceTag';
import { SyntheticBadge } from './SyntheticBadge';

const metricLabels:Record<MeasurementEvidence['metric'],string> = {sleepHours:'Sleep duration',midpointMinutes:'Sleep midpoint',medianRtMs:'Median reaction time',lapses:'Lapses',commissionErrors:'Commission errors'};
function format(value:number,unit:MeasurementEvidence['unit'],signed = false):string {
  return value.toLocaleString('en-US',{maximumFractionDigits:unit === 'count' ? 2 : unit === 'h' ? 2 : 1,signDisplay:signed ? 'exceptZero' : 'auto'});
}
export function EvidenceRow({domain}:{domain:DomainResult}) {
  const state = !domain.evaluable ? 'Insufficient data' : domain.sustained ? 'Sustained' : 'Not sustained';
  return <article className="evidence-row" aria-label={`${DOMAIN_LABELS[domain.domain]} evidence`}>
    <div className="evidence-heading"><h3>{DOMAIN_LABELS[domain.domain]}</h3><span className={`evidence-state ${!domain.evaluable ? 'status-insufficient_data' : domain.sustained ? 'status-change_noted' : ''}`}><span aria-hidden="true">{!domain.evaluable ? '○' : domain.sustained ? '◐' : '—'}</span> {state}</span></div>
    <p className="window-count">Criterion met on {domain.metDaysInWindow} of the last {domain.windowDays} days · {domain.validDaysInWindow} valid</p>
    <div className="measurements">{domain.measurements.map(measurement => {
      const usable = measurement.quality === 'good' && measurement.value !== null;
      return <div className="measurement" key={measurement.metric}>
        <p className="measurement-name">{metricLabels[measurement.metric]}</p>
        <p className="measurement-value"><strong>{usable ? format(measurement.value!,measurement.unit) : '—'}</strong> <span>{measurement.unit}</span></p>
        <p className="baseline-reference">Baseline {measurement.baseline === null ? '—' : format(measurement.baseline,measurement.unit)} {measurement.unit}</p>
        <p className="measurement-difference">Difference {usable && measurement.deltaAbs !== null ? `${format(measurement.deltaAbs,measurement.unit,true)} ${measurement.unit}` : '—'}{usable && measurement.deltaPct !== null ? ` (${format(measurement.deltaPct,'ms',true)}%)` : ''}</p>
        <ProvenanceTag measurement={measurement} />
        {measurement.reasons.length > 0 && <p className="evidence-reason">{measurement.reasons.join(' ')}</p>}
      </div>;
    })}</div>
    {!domain.evaluable && <p className="evidence-reason">{domain.exclusions.map(exclusion => `Day ${exclusion.day}: ${exclusion.reasons.join(' ')}`).join(' ') || 'Not enough valid evidence in this window.'}</p>}
  </article>;
}
export function EvidenceList({packet}:{packet:EvidencePacket}) {
  return <section className="panel evidence-list" aria-labelledby="evidence-heading"><div className="card-heading"><div><p className="eyebrow">Current observations</p><h2 id="evidence-heading">The evidence</h2></div><SyntheticBadge /></div>{packet.domains.map(domain => <EvidenceRow key={domain.domain} domain={domain} />)}</section>;
}
