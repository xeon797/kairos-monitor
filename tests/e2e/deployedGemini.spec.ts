import { test, expect } from '@playwright/test';
import { loadEnv } from 'vite';
import { EXPLANATION_CLIENT_TIMEOUT_MS } from '../../src/engine/config';
import type { EvidencePacket } from '../../src/engine/types';
import { validateExplanation } from '../../src/engine/validateExplanation';
const enabled = loadEnv('test','.','PLAYWRIGHT_').PLAYWRIGHT_REAL_GEMINI === '1';
test.skip(!enabled,'Real Gemini verification is explicitly opt-in against the existing deployment.');
for(const width of [360,1100]) {
  test(`public real Gemini and synthetic UI at ${width}px`,async ({page,context},testInfo) => {
    await page.setViewportSize({width,height:900});
    const samples:Array<{task:string;day:number;text:string;model:string;valid:boolean;elapsedMs:number}>=[];
    const outcomes:Array<{task:string;day:number;status:number;error?:string;elapsedMs:number;serverTiming:string|null;reason:string|null;upstreamStatus:string|null;outputReason:string|null;validationReasons:string|null}>=[];
    const starts=new Map<import('@playwright/test').Request,number>();
    const errors:string[]=[];const fontWarnings:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>{if(new URL(request.url()).pathname==='/api/explain')starts.set(request,Date.now());});
    page.on('requestfailed',request=>{
      if(new URL(request.url()).pathname!=='/api/explain')return;
      const packet=request.postDataJSON() as EvidencePacket;const elapsedMs=Date.now()-(starts.get(request)??Date.now());
      const aborted=request.failure()?.errorText==='net::ERR_ABORTED';
      outcomes.push({task:packet.taskId??'overall',day:packet.day,status:0,elapsedMs,serverTiming:null,reason:aborted&&elapsedMs>=EXPLANATION_CLIENT_TIMEOUT_MS?'client_deadline':'client_request_failed',upstreamStatus:null,outputReason:null,validationReasons:null});
    });
    page.on('console',message=>{if(!['warning','error'].includes(message.type()))return;const text=message.text();if(/font|OTS parsing/i.test(text))fontWarnings.push(text);else if(!/Failed to load resource|net::ERR_/i.test(text))errors.push(text);});
    page.on('response',async response=>{
      if(new URL(response.url()).pathname!=='/api/explain')return;
      const packet=response.request().postDataJSON() as EvidencePacket;
      const task=packet.taskId??'overall';
      const body:unknown=await response.json().catch(()=>null);
      const headers=response.headers();const elapsedMs=Date.now()-(starts.get(response.request())??Date.now());
      const outcome={task,day:packet.day,status:response.status(),elapsedMs,serverTiming:headers['server-timing']??null,reason:headers['x-kairos-outcome']??null,upstreamStatus:headers['x-kairos-upstream-status']??null,outputReason:headers['x-kairos-output']??null,validationReasons:headers['x-kairos-validation']??null,error:undefined as string|undefined};outcomes.push(outcome);
      if(body && typeof body==='object' && 'error' in body)outcome.error=String(body.error);
      if(body && typeof body==='object' && 'text' in body && 'model' in body && typeof body.text==='string' && typeof body.model==='string')samples.push({task,day:packet.day,text:body.text,model:body.model,valid:validateExplanation(body.text,packet).ok,elapsedMs});
    });
    try {
      const health=await page.request.head('/');expect(health.headers()['x-kairos-explanations']).toBe('v1');
      const api=await page.request.get('/api/explain');expect(api.status()).toBe(405);expect(api.headers()['content-type']).toContain('application/json');
      await page.goto('/mission');await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
      await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
      const eva=page.getByRole('article',{name:'EVA-07'});const inv=page.getByRole('article',{name:'INV-03'});
      await expect(eva.locator('.concern-chip')).toContainText('Review recommended');await expect(inv.locator('.concern-chip')).toContainText('Change noted');
      await expect(eva.locator('.template-tag')).toContainText('AI-rephrased from the same evidence',{timeout:6500});await expect(inv.locator('.template-tag')).toContainText('AI-rephrased from the same evidence',{timeout:6500});
      expect(samples.filter(s=>s.day===12&&['EVA-07','INV-03'].includes(s.task)&&s.valid)).toHaveLength(2);
      await eva.getByRole('button',{name:'Show template version'}).click();await expect(eva.locator('.template-tag')).toContainText('Template explanation');await eva.getByRole('button').press('Space');await expect(eva.locator('.template-tag')).toContainText('AI-rephrased');
      await inv.getByRole('button',{name:'Show template version'}).click();await expect(inv.locator('.template-tag')).toContainText('Template explanation');await inv.getByRole('button').press('Space');await expect(inv.locator('.template-tag')).toContainText('AI-rephrased');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
      await page.screenshot({path:`.local/p6-screenshots/mission-day12-${width}.png`,fullPage:true});
      await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');await expect(eva.locator('.template-tag')).toContainText('AI-rephrased');
      await page.getByRole('link',{name:'Today',exact:true}).click();await expect(page.locator('.engine-status')).toContainText('Review recommended');
      await expect(page.getByRole('article',{name:'Sleep evidence'})).toContainText('Criterion met on 4 of the last 5 days');
      await expect(page.getByRole('article',{name:'Reaction evidence'})).toContainText('Criterion met on 3 of the last 5 days');
      await expect(page.locator('.explanation-box .template-tag')).toHaveText('AI-rephrased from the same evidence',{timeout:6500});
      await page.screenshot({path:`.local/p6-screenshots/today-day12-${width}.png`,fullPage:true});
      await page.reload();await expect(page.locator('.engine-status')).toContainText('Review recommended');
      await page.evaluate(async()=>{await Promise.all([400,500,700].map(weight=>document.fonts.load(`${weight} 16px Satoshi`)));});
      expect(await page.evaluate(()=>[400,500,700].every(weight=>document.fonts.check(`${weight} 16px Satoshi`)))).toBe(true);
      for(const name of ['Regular','Medium','Bold']) {const font=await page.request.get(`/fonts/Satoshi-${name}.woff2`);expect(font.status()).toBe(200);expect((await font.body()).length).toBeGreaterThan(20000);}
      await context.setOffline(true);await page.getByRole('combobox',{name:'Jump to day'}).selectOption('11');await expect(page.locator('.engine-status')).toContainText('Change noted');await expect(page.locator('.explanation-box .template-tag')).toHaveText('Template explanation');await context.setOffline(false);
      for(const route of ['/check','/trends','/mission','/today']) {await page.goto(route);await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 11 / 17');await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 11 / 17');}
      expect(errors).toEqual([]);expect(fontWarnings).toEqual([]);
    } finally {await testInfo.attach('real-gemini-results',{body:JSON.stringify({samples,outcomes,errors,fontWarnings},null,2),contentType:'application/json'});}
  });
}
