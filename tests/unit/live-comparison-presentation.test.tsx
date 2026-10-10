import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveComparison } from '../../src/checks/LiveBaselineView';
import type { LiveCheck } from '../../src/db/db';

const records:LiveCheck[]=Array.from({length:3},(_,index)=>({
  id:`reaction-${index}`,source:'live',day:null,kind:'reaction',quality:'good',
  timestamp:`2026-10-0${index+1}T00:00:00Z`,medianRtMs:250,lapses:0,falseStarts:0,
  commissionErrors:null,omissionErrors:null,validTrials:25,interruptions:0,
}));

describe('live comparison presentation',()=>{
  it('shows measured differences for a valid check',()=>{
    expect(renderToStaticMarkup(<LiveComparison records={records} kind="reaction" result={{...records[0],medianRtMs:300}}/>)).toContain('+50.0 ms difference');
  });
  it('does not compare a result whose effective quality is poor despite its stored good flag',()=>{
    const html=renderToStaticMarkup(<LiveComparison records={records} kind="reaction" result={{...records[0],interruptions:3}}/>);
    expect(html).toContain('250.0 ms baseline');expect(html).not.toContain('difference');
  });
  it('does not compare another test kind or malformed measurements',()=>{
    for(const result of [{...records[0],kind:'go_no_go' as const},{...records[0],medianRtMs:'bad'}]) {
      expect(renderToStaticMarkup(<LiveComparison records={records} kind="reaction" result={result as unknown as LiveCheck}/>)).not.toContain('difference');
    }
  });
});
