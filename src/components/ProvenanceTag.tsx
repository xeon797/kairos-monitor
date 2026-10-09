import type { MeasurementEvidence } from '../engine/types';

export function ProvenanceTag({measurement}:{measurement:MeasurementEvidence}) {
  return <span className="provenance-tag">{measurement.source === 'synthetic' ? 'Synthetic' : measurement.source === 'live' ? 'Live browser test' : 'Source unavailable'} · {measurement.quality} quality · Day {measurement.day}</span>;
}
