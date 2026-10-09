import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ABOUT_LIMITATIONS, NASA_REFERENCES } from '../../src/components/AboutDialog';
import { ProvenanceTag } from '../../src/components/ProvenanceTag';

it('keeps all About limitations neutral without broadening the footer exemption',()=>{
  const text=ABOUT_LIMITATIONS.join(' ');
  expect(text).not.toMatch(/\b(?:cleared|clearance|fit\s+for\s+duty|unfit|safe|unsafe|diagnos\w*|impaired|fatigued|disorder|prescribe|treat|medicate|dangerous|risk\s+of\s+accident|predict)\b/i);
  for(const required of ['synthetic','experimental','NASA Cognition','Device timing','practice effects','interruptions','causation','Novelty','HRV','Gemini','deterministic engine','not sent to Gemini','crew and mission team'])expect(text).toContain(required);
  expect(NASA_REFERENCES.map(ref=>ref.href)).toEqual(['https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/','https://techport.nasa.gov/projects/23228']);
});
it('uses one native keyboard/tap disclosure per provenance tag with excluded-quality details',()=>{
  const html=renderToStaticMarkup(<ProvenanceTag measurement={{metric:'sleepHours',value:5,baseline:7,deltaAbs:-2,deltaPct:null,unit:'h',day:12,source:'synthetic',quality:'poor',reasons:[]}}/>);
  expect(html.match(/class="provenance-tag"/g)).toHaveLength(1);
  expect(html).toContain('<summary>Synthetic · poor quality · Day 12</summary>');
  expect(html).toContain('excluded from criterion evaluation');
  expect(html).toContain('Unit: h');
});
