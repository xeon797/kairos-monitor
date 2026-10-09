import { describe, expect, it } from 'vitest';
import { FOOTER_DISCLAIMER as shellFooter } from '../../src/content';
import { evaluateDomains } from '../../src/engine/detect';
import { buildEvidencePacket } from '../../src/engine/evidence';
import { missionSchedule, syntheticChecks, syntheticSleep, taskLibrary } from '../../src/engine/scenarios';
import { CONCERN_LABELS, DOMAIN_LABELS, explain, FOOTER_DISCLAIMER, NON_CAUSATION, STATUS_LABELS, TASK_DECISIONS, TREND_LABEL, trendChip } from '../../src/engine/templates';
import type { ResponseLog } from '../../src/engine/types';
import { baseline, rows } from './fixtures/engineOracle';

// Test-only wording audit; Gemini text validation remains outside this milestone.
const banned = /\b(?:cleared|clearance|fit\s+for\s+duty|unfit|safe|unsafe|diagnos\w*|impaired|fatigued|disorder|prescribe|treat|medicate|dangerous|risk\s+of\s+accident|predict)\b/i;
function hasBannedWords(text: string): boolean {
  return text !== FOOTER_DISCLAIMER && banned.test(text);
}
const response: ResponseLog = {id:'fixture-response',day:13,type:'rest_adjustment',note:'Protected sleep window; EVA prep moved'};

describe('neutral deterministic explanations', () => {
  it('explains day-12 EVA and Inventory with their own names, counts and demand', () => {
    const domains = evaluateDomains(12,baseline,syntheticSleep,syntheticChecks);
    const eva = explain(buildEvidencePacket(12,baseline,domains,{profile:taskLibrary[0],instance:missionSchedule[0]}));
    const inv = explain(buildEvidencePacket(12,baseline,domains,{profile:taskLibrary[3],instance:missionSchedule[1]}));
    expect(eva).toContain('EVA (spacewalk) (EVA-07) is a high-demand task');
    expect(eva).toContain('Sleep met a change criterion on 4 of the last 5 days');
    expect(eva).toContain('Reaction met a change criterion on 3 of the last 5 days');
    expect(eva).toContain('Attention met a change criterion on 3 of the last 5 days');
    expect(eva).toContain('repeat the check before EVA-07');
    expect(inv).toContain('Inventory (INV-03) is a lower-demand task');
    expect(inv).toContain('No task-specific review is prompted');
    expect(inv).not.toContain('EVA');
    expect(inv).not.toContain('Reaction');
    expect(inv).not.toContain('repeat the check');
    expect(inv).not.toEqual(eva);
  });
  it.each(rows)('audits all scenario overall/task template branches on day $day', row => {
    const domains = evaluateDomains(row.day,baseline,syntheticSleep,syntheticChecks);
    const packets = [buildEvidencePacket(row.day,baseline,domains),...taskLibrary.map(profile => buildEvidencePacket(row.day,baseline,domains,{profile,instance:missionSchedule.find(task => task.taskId === profile.id)}))];
    for (const packet of packets) {
      expect(hasBannedWords(explain(packet))).toBe(false);
      expect(hasBannedWords(packet.reviewPrompt)).toBe(false);
      expect(explain(packet)).toContain(TASK_DECISIONS);
      expect(explain(packet)).not.toMatch(/changed for|3[–-]5 days/);
    }
  });
  it.each(['baseline','sleep','checks'] as const)('keeps insufficient %s distinct from no sustained change', missing => {
    const usedBaseline = missing === 'baseline' ? null : baseline;
    const domains = evaluateDomains(12,usedBaseline,missing === 'sleep' ? [] : syntheticSleep,missing === 'checks' ? [] : syntheticChecks);
    const packets = [buildEvidencePacket(12,usedBaseline,domains),...taskLibrary.map(profile => buildEvidencePacket(12,usedBaseline,domains,{profile,instance:missionSchedule.find(task => task.taskId === profile.id)}))];
    for (const packet of packets) {
      const text = explain(packet);
      expect(text).toContain('not enough valid data');
      expect(text).not.toContain('No sustained change');
      expect(hasBannedWords(text)).toBe(false);
    }
  });
  it('explains no sustained change without treating all measurements as unchanged', () => {
    const packet = buildEvidencePacket(9,baseline,evaluateDomains(9,baseline,syntheticSleep,syntheticChecks));
    expect(packet.domains[0].latest.deltaAbs).toBeLessThan(-1);
    expect(explain(packet)).toBe(`No sustained change from baseline was found in the available data. ${TASK_DECISIONS}`);
  });
  it('audits all exported labels and trend copy', () => {
    [...Object.values(STATUS_LABELS),...Object.values(CONCERN_LABELS),...Object.values(DOMAIN_LABELS),TASK_DECISIONS,TREND_LABEL,NON_CAUSATION].forEach(text => expect(hasBannedWords(text)).toBe(false));
  });
  it.each(['cleared','CLEARANCE','Fit for duty','unfit','safe','unsafe','diagnosis','diagnostic','diagnoses','impaired','fatigued','disorder','prescribe','treat','medicate','dangerous','risk of accident','predict'])('deliberately detects banned wording: %s', word => {
    expect(hasBannedWords(`This says ${word}.`)).toBe(true);
  });
  it('does not match incidental substrings in unrelated words', () => {
    expect(hasBannedWords('The retreat features a treatise on thermodynamics.')).toBe(false);
    expect(hasBannedWords('A retreat with diagnostic data.')).toBe(true);
    expect(hasBannedWords('A retreat with a treatise and sphere.')).toBe(false);
  });
  it('exempts only the exact shared footer', () => {
    expect(FOOTER_DISCLAIMER).toBe('Synthetic mission telemetry · Not a medical or flight-clearance tool');
    expect(FOOTER_DISCLAIMER).toBe(shellFooter);
    expect(hasBannedWords(FOOTER_DISCLAIMER)).toBe(false);
    expect(hasBannedWords(`${FOOTER_DISCLAIMER} Extra text.`)).toBe(true);
    expect(hasBannedWords('Not a medical or flight-clearance tool')).toBe(true);
    expect(hasBannedWords('A separate clearance disclaimer.')).toBe(true);
  });
  it('is deterministic and does not mutate packets', () => {
    const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,syntheticSleep,syntheticChecks));
    const before = JSON.stringify(packet);
    expect(explain(packet)).toBe(explain(packet));
    expect(JSON.stringify(packet)).toBe(before);
  });
});

describe('non-causal day-to-day trend chip', () => {
  it.each([{day:13,shown:false},{day:14,shown:false},{day:15,shown:true},{day:16,shown:true},{day:17,shown:false}])('day $day shown=$shown with response day 13', ({day,shown}) => {
    const current = evaluateDomains(day,baseline,syntheticSleep,syntheticChecks);
    const previous = evaluateDomains(day-1,baseline,syntheticSleep,syntheticChecks);
    expect(trendChip(day,[response],current,previous)).toEqual({label:shown ? 'Measures moving toward baseline' : null,nonCausation:'This comparison does not show that the adjustment caused the change.'});
  });
  it.each([15,16])('requires an existing nonfuture response on day %i', day => {
    const current = evaluateDomains(day,baseline,syntheticSleep,syntheticChecks);
    const previous = evaluateDomains(day-1,baseline,syntheticSleep,syntheticChecks);
    expect(trendChip(day,[],current,previous).label).toBeNull();
    expect(trendChip(day,[{...response,day:17}],current,previous).label).toBeNull();
  });
  it('does not describe missing current or previous evidence as recovery', () => {
    const current = evaluateDomains(16,baseline,syntheticSleep,syntheticChecks);
    const previous = evaluateDomains(15,baseline,syntheticSleep,syntheticChecks);
    const incomplete = current.map(r => ({...r,evaluable:false,sustained:false}));
    expect(trendChip(16,[response],incomplete,previous).label).toBeNull();
    expect(trendChip(16,[response],current,previous.slice(0,2)).label).toBeNull();
    expect(trendChip(16,[response],current,previous.map(r => ({...r,baselineEstablished:false}))).label).toBeNull();
    expect(trendChip(16,[response],current,previous.map(r => ({...r,day:14}))).label).toBeNull();
  });
  it.each([15,16])('does not confuse a missing day %i with improvement even when windows remain evaluable', missingDay => {
    const checks = syntheticChecks.filter(check => check.day !== missingDay);
    const current = evaluateDomains(16,baseline,syntheticSleep,checks);
    const previous = evaluateDomains(15,baseline,syntheticSleep,checks);
    expect([...current,...previous].every(result => result.evaluable)).toBe(true);
    expect(current.filter(r => r.sustained).length).toBeLessThan(previous.filter(r => r.sustained).length);
    expect(trendChip(16,[response],current,previous).label).toBeNull();
  });
  it('requires both explicit calendar days and is immutable/deterministic', () => {
    const current = evaluateDomains(16,baseline,syntheticSleep,syntheticChecks);
    const previous = evaluateDomains(15,baseline,syntheticSleep,syntheticChecks);
    const before = JSON.stringify([current,previous,response]);
    expect(trendChip(17,[response],current,previous).label).toBeNull();
    expect(trendChip(16,[response],current,previous)).toEqual(trendChip(16,[response],current,previous));
    expect(JSON.stringify([current,previous,response])).toBe(before);
  });
});
