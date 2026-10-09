import type { MeasurementEvidence } from '../engine/types';

export function ProvenanceTag({measurement}:{measurement:MeasurementEvidence}) {
  const source=measurement.source === 'synthetic' ? 'Synthetic' : measurement.source === 'live' ? 'Live browser test' : 'Source unavailable';
  return <details className="provenance-tag"><summary>{source} · {measurement.quality} quality · Day {measurement.day}</summary><div className="provenance-details"><p>{measurement.source==='synthetic'?'Illustrative mission telemetry from the synthetic scenario.':measurement.source==='live'?'A browser check recorded locally on this device.':'No eligible observation was available for this mission day.'}</p><p>Unit: {measurement.unit}. {measurement.quality==='good'?'Eligible quality for this measurement.':measurement.quality==='poor'?'Poor quality: excluded from criterion evaluation.':'Missing data: excluded from criterion evaluation.'}</p></div></details>;
}
