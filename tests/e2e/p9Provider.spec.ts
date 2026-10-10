import {test,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import type {EvidencePacket} from '../../src/engine/types';
import {validateExplanation} from '../../src/engine/validateExplanation';
const enabled=loadEnv('test','.','PLAYWRIGHT_').PLAYWRIGHT_P9_PROVIDER==='1';
test.skip(!enabled,'P9 real provider checks require explicit production opt-in.');
for(const width of [360,1100])test(`P9 full deployed pitch with real EVA and Inventory ${width}px`,async({page},info)=>{
 await page.setViewportSize({width,height:900});const seen=new Set<string>();const samples:unknown[]=[];const outcomes:unknown[]=[];
 await page.route('**/api/explain',async route=>{const packet=route.request().postDataJSON() as EvidencePacket;const id=packet.taskId??'';
  if(packet.day===12&&['EVA-07','INV-03'].includes(id)&&!seen.has(id)){seen.add(id);await route.continue();}else await route.fulfill({status:503,json:{error:'bounded_verification'}});
 });
 page.on('response',async response=>{if(!response.url().endsWith('/api/explain'))return;const packet=response.request().postDataJSON() as EvidencePacket;if(packet.day!==12||!['EVA-07','INV-03'].includes(packet.taskId??''))return;const body:unknown=await response.json().catch(()=>null);outcomes.push({task:packet.taskId,status:response.status(),outcome:response.headers()['x-kairos-outcome']});if(body&&typeof body==='object'&&'text' in body&&typeof body.text==='string'&&'model' in body&&typeof body.model==='string')samples.push({task:packet.taskId,text:body.text,model:body.model,validation:validateExplanation(body.text,packet)});});
 try{
  const jump=async(day:number)=>{await page.getByRole('combobox',{name:'Jump to day'}).selectOption(String(day));await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);};
  await page.goto('/');await page.getByRole('link',{name:'Launch demo'}).first().click();
  await expect(page.locator('.engine-status')).toContainText('Within your usual range');await expect(page.locator('.synthetic-badge').first()).toBeVisible();
  await jump(11);await expect(page.locator('.engine-status')).toContainText('Change noted');await page.getByRole('button',{name:'Advance day'}).click();
  await expect(page.locator('.engine-status')).toContainText('Review recommended');await expect(page.locator('.domain-preview li')).toContainText(['4 of 5','3 of 5','3 of 5']);
  // Finish the Today task request before navigation cancels its subscriber.
  await expect(page.locator('.next-task .template-tag')).toHaveText('AI-rephrased from the same evidence for EVA-07',{timeout:6500});
  await page.getByRole('navigation').getByRole('link',{name:'Mission'}).click();
  for(const [id,label] of [['EVA-07','Review recommended'],['INV-03','Change noted']]){
   const card=page.getByRole('article',{name:id});await expect(card.locator('.concern-chip')).toContainText(label);await expect(card.locator('.task-schedule')).toContainText('In 2 days');await expect(card.locator('.template-tag')).toHaveText(`AI-rephrased from the same evidence for ${id}`,{timeout:6500});
   const toggle=card.getByRole('button',{name:'Show template version'});await toggle.click();await expect(card.locator('.template-tag')).toHaveText(`Template explanation for ${id}`);await toggle.click();await expect(card.locator('.template-tag')).toHaveText(`AI-rephrased from the same evidence for ${id}`);
  }
  expect(await page.getByRole('article',{name:'EVA-07'}).locator('.task-explanation').textContent()).not.toEqual(await page.getByRole('article',{name:'INV-03'}).locator('.task-explanation').textContent());
  expect(seen.size).toBe(2);await expect.poll(()=>samples.length).toBe(2);for(const sample of samples)expect((sample as {validation:{ok:boolean}}).validation.ok).toBe(true);
  await page.screenshot({animations:'disabled',path:`.local/p9-screenshots/real-provider-${width}.png`});
  await page.reload();for(const id of ['EVA-07','INV-03'])await expect(page.getByRole('article',{name:id}).locator('.template-tag')).toContainText('AI-rephrased');expect(seen.size).toBe(2);
  await jump(13);await page.getByRole('button',{name:'Log schedule change',exact:true}).click();await expect(page.locator('.response-entry')).toContainText('Day 13');await expect(page.locator('.recovery-chip')).toHaveCount(0);
  await jump(15);await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('2 relevant sustained domains');await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');
  await page.getByRole('button',{name:'Advance day'}).click();await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');await expect(page.getByText('This comparison does not show that the adjustment caused the change.',{exact:true})).toBeVisible();
  await page.getByRole('navigation').getByRole('link',{name:'Today'}).click();await expect(page.locator('.engine-status')).toContainText('Within your usual range');await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');await expect(page.locator('.response-entry')).toContainText('Protected sleep window; EVA prep moved');
  await page.getByRole('navigation').getByRole('link',{name:'Check'}).click();await expect(page.getByRole('heading',{name:'Saved results'})).toBeVisible();await expect(page.locator('.check-choice')).toHaveCount(2);await expect(page.getByText('Browser test results cannot be compared with the synthetic mission data.',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }finally{await info.attach('p9-real-provider',{body:JSON.stringify({width,requests:[...seen],samples,outcomes},null,2),contentType:'application/json'});}
});
