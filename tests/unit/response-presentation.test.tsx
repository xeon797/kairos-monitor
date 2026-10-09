import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResponseHistory } from '../../src/components/ResponseLog';
import { NON_CAUSATION, TREND_LABEL } from '../../src/engine/templates';

const response = {id:'display-fixture',day:13,type:'rest_adjustment' as const,note:'Protected sleep window; EVA prep moved'};
describe('response history presentation',() => {
  it('marks future entries without removing them',() => {
    const html = renderToStaticMarkup(<ResponseHistory responses={[response]} currentDay={12} mutating={false} trend={null} />);
    expect(html).toContain('After the selected day'); expect(html).toContain('Day 13'); expect(html).toContain(response.note); expect(html).toContain('Rest adjustment');
    expect(html).not.toContain(TREND_LABEL);
  });
  it('retains workload adjustment type and escapes the user note',() => {
    const html = renderToStaticMarkup(<ResponseHistory responses={[{...response,type:'workload_adjustment',note:'<script>example</script>'}]} currentDay={13} mutating={false} trend={null} />);
    expect(html).toContain('Workload adjustment'); expect(html).not.toContain('After the selected day');
    expect(html).toContain('&lt;script&gt;'); expect(html).not.toContain('<script>');
  });
  it('shows the exact non-causation line alongside a supplied recovery chip',() => {
    const html = renderToStaticMarkup(<ResponseHistory responses={[response]} currentDay={15} mutating={false} trend={{label:TREND_LABEL,nonCausation:NON_CAUSATION}} />);
    expect(html).toContain(TREND_LABEL); expect(html).toContain(NON_CAUSATION);
  });
  it('does not invent recovery from the presence of a response alone',() => {
    const html = renderToStaticMarkup(<ResponseHistory responses={[response]} currentDay={17} mutating={false} trend={{label:null,nonCausation:NON_CAUSATION}} />);
    expect(html).not.toContain(TREND_LABEL);
  });
});
