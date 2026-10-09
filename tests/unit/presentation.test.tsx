import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { computeBaseline } from '../../src/engine/baseline';
import { evaluateDomains } from '../../src/engine/detect';
import { buildEvidencePacket } from '../../src/engine/evidence';
import { syntheticChecks, syntheticSleep } from '../../src/engine/scenarios';
import { StatusCard } from '../../src/components/StatusCard';
import { EvidenceRow } from '../../src/components/EvidenceRow';
import { sortedTaskPackets, taskTiming } from '../../src/components/TaskCard';
import type { EvidencePacket } from '../../src/engine/types';

const baseline = computeBaseline(syntheticSleep,syntheticChecks,[1,7],'2026-10-09T00:00:00.000Z','reaction')!;
const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,syntheticSleep,syntheticChecks));
describe('packet presentation preserves evidence',() => {
  it.each(['loading','error'] as const)('never displays a positive label while %s, even with an old packet',state => {
    const html = renderToStaticMarkup(<StatusCard packet={{...packet,status:'WITHIN_USUAL'}} day={null} loading={state === 'loading'} error={state === 'error' ? 'Storage denied' : null} />);
    expect(html).toContain('Insufficient data'); expect(html).not.toContain('Within your usual range');
    expect(html).not.toContain('Domain criterion counts');
  });
  it('uses separate window counts rather than a shared fabricated duration',() => {
    const html = renderToStaticMarkup(<StatusCard packet={packet} day={12} loading={false} error={null} />);
    expect(html).toContain('Review recommended'); expect(html).toContain('4 of 5 days'); expect(html).toContain('3 of 5 days');
  });
  it('preserves lapses and commission errors as separate baseline comparisons',() => {
    const html = renderToStaticMarkup(<EvidenceRow domain={packet.domains[2]} />);
    expect(html).toContain('Lapses'); expect(html).toContain('Commission errors');
    expect(html).toContain('Baseline 1 count'); expect(html).toContain('Baseline 1.29 count');
    expect(html).toContain('+4 count'); expect(html).toContain('+3.71 count');
  });
  it('shows missing measurements as gaps with the engine reason',() => {
    const sleep = syntheticSleep.map(row => row.day >= 10 && row.day <= 12 ? {...row,sleepHours:null,midpointMinutes:null,quality:'missing' as const} : row);
    const domain = evaluateDomains(12,baseline,sleep,syntheticChecks)[0];
    const html = renderToStaticMarkup(<EvidenceRow domain={domain} />);
    expect(html).toContain('Insufficient data'); expect(html).toContain('<strong>—</strong>');
    expect(html).toContain('missing quality'); expect(html).toContain(domain.measurements[0].reasons[0]);
    expect(html).not.toContain('<strong>0</strong>');
  });
  it('preserves actual earlier-day provenance when supplied by the packet',() => {
    const domain = {...packet.domains[1],measurements:packet.domains[1].measurements.map(m => ({...m,day:9}))};
    const html = renderToStaticMarkup(<EvidenceRow domain={domain} />);
    expect(html).toContain('Day 9'); expect(html).not.toContain('Day 12');
  });
  it('does not show excluded poor raw values as usable measurements',() => {
    const domain = {...packet.domains[1],measurements:packet.domains[1].measurements.map(m => ({...m,quality:'poor' as const,reasons:['Interrupted check.']}))};
    const html = renderToStaticMarkup(<EvidenceRow domain={domain} />);
    expect(html).toContain('<strong>—</strong>'); expect(html).toContain('Interrupted check.'); expect(html).not.toContain('<strong>312</strong>');
  });
  it.each([[14,12,'In 2 days'],[14,14,'Today'],[14,17,'3 days ago'],[16,17,'1 day ago']] as const)('formats scheduled %i viewed on %i', (schedule,day,label) => {
    expect(taskTiming(schedule,day)).toBe(label);
  });
  it('sorts schedule ties by instance ID without changing shared packet order',() => {
    const tasks = [{instanceId:'INV-03',scheduledDay:14},{instanceId:'DOCK-02',scheduledDay:16},{instanceId:'EVA-07',scheduledDay:14}].map(task => ({...packet,task:{...task}} as EvidencePacket));
    expect(sortedTaskPackets(tasks).map(p => p.task?.instanceId)).toEqual(['EVA-07','INV-03','DOCK-02']);
    expect(tasks[0].task?.instanceId).toBe('INV-03');
  });
});
