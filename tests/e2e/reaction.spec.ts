import { expect, test, type Page } from '@playwright/test';
import { createReactionDelays, createSeededRandom } from '../../src/checks/scoring';
import { mockAI } from './helpers/mockAI';
import type { AppSettings, LiveCheck } from '../../src/db/db';

test.beforeEach(async({page})=>{
  await mockAI(page);
  await page.clock.install({time:new Date('2026-10-09T00:00:00.000Z')});
  await page.clock.pauseAt(new Date('2026-10-09T00:00:01.000Z'));
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto,'getRandomValues',{value:(array:Uint32Array)=>{original(array);if(array instanceof Uint32Array&&array.length===1)array[0]=123;return array;}});
  });
});
const delays=createReactionDelays(createSeededRandom(123));
async function storage(page:Page){return page.evaluate(()=>new Promise<{settings:AppSettings;live:LiveCheck[]}>((resolve,reject)=>{
  const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
    const db=open.result,tx=db.transaction(['checks','settings'],'readonly');const setting=tx.objectStore('settings').get('app'),checks=tx.objectStore('checks').getAll();
    tx.oncomplete=()=>{resolve({settings:setting.result as AppSettings,live:(checks.result as LiveCheck[]).filter(row=>row.source==='live')});db.close();};tx.onerror=()=>reject(tx.error);
  };
}));}
async function go(page:Page,index:number){
  await page.clock.runFor(Math.ceil(delays[index]));await page.clock.runFor(32);
  await expect(page.locator('.check-target')).toHaveAttribute('data-phase','stimulus');
  await expect(page.getByRole('button',{name:'Go circle: respond now'})).toBeVisible();
}
async function respond(page:Page,index:number){
  await page.clock.runFor(250);
  if(index%2===0)await page.keyboard.press('Space');else await page.locator('.check-target').click();
}
for(const width of [360,1100])test(`Reaction complete keyboard/pointer and persisted isolation at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto('/check');await expect(page.getByRole('heading',{name:'Check',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');const before=await storage(page);
  await page.getByRole('button',{name:'Open reaction check'}).click();await page.getByRole('button',{name:'Start reaction check'}).click();
  for(let index=0;index<25;index++){await go(page,index);await respond(page,index);}
  const summary=page.locator('.check-summary');await expect(summary).toContainText('Good quality');await expect(summary).toContainText('25 / 25');
  await expect(summary.locator('dl > div').filter({hasText:'Lapses'}).locator('dd')).toHaveText('0');
  await page.getByRole('button',{name:'Save result',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();button.click();});
  await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();
  const saved=await storage(page);expect(saved.live).toHaveLength(1);
  expect(saved.live[0]).toMatchObject({kind:'reaction',source:'live',day:null,quality:'good',validTrials:25,lapses:0,falseStarts:0,commissionErrors:null,omissionErrors:null});
  expect(saved.live[0].timestamp).toMatch(/Z$/);expect(saved.live[0].medianRtMs!).toBeGreaterThanOrEqual(250);expect(saved.live[0].medianRtMs!).toBeLessThan(500);
  expect(saved.settings.baseline).toEqual(before.settings.baseline);expect(saved.settings.currentDay).toBe(12);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`.local/p8-screenshots/reaction-result-${width}.png`});
  await page.getByRole('button',{name:'Return to Check'}).click();await page.reload();expect((await storage(page)).live).toEqual(saved.live);await expect(page.getByRole('article',{name:'Reaction saved result',exact:true})).toHaveCount(1);await expect(page.getByRole('article',{name:'Reaction saved result',exact:true})).toContainText('Live browser test');
  await page.goto('/mission');await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('Review recommended');await expect(page.getByRole('article',{name:'INV-03'})).toContainText('Change noted');expect(errors).toEqual([]);
});

for(const width of [360,1100])test(`Reaction premature/held/repeated input, visibility exclusion, timeout and cancellation at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/check');await page.getByRole('button',{name:'Open reaction check'}).click();await page.getByRole('button',{name:'Start reaction check'}).click();
  await page.keyboard.down('Space');await page.keyboard.down('Space');await page.keyboard.down('Space');
  await expect(page.locator('.trial-progress')).toHaveText('Trial 2 of 25');await page.keyboard.up('Space');
  await page.keyboard.press('Space');
  await expect(page.locator('.trial-progress')).toHaveText('Trial 2 of 25');
  await go(page,1);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('blur'));});
  await page.clock.runFor(2100);await expect(page.locator('.check-target')).toHaveAttribute('data-phase','paused');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
  for(let index=2;index<25;index++){await go(page,index);if(index===2)await page.clock.runFor(2100);else await respond(page,index);}
  const summary=page.locator('.check-summary');await expect(summary.locator('dl > div').filter({hasText:'False starts'}).locator('dd')).toHaveText('1');await expect(summary.locator('dl > div').filter({hasText:'Lapses'}).locator('dd')).toHaveText('1');await expect(summary.locator('dl > div').filter({hasText:'Interruptions'}).locator('dd')).toHaveText('1');await expect(summary).toContainText('22 / 25');
  await page.getByRole('button',{name:'Restart reaction check'}).click();await expect(page.locator('.trial-progress')).toHaveText('Trial 1 of 25');
  await go(page,0);await page.locator('.check-target').evaluate((button:HTMLButtonElement)=>{button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:4,button:0,bubbles:true}));button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:4,button:0,bubbles:true}));button.dispatchEvent(new PointerEvent('pointerup',{pointerId:4,bubbles:true}));});
  await expect(page.locator('.trial-progress')).toHaveText('Trial 2 of 25');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.clock.runFor(10000);expect((await storage(page)).live).toHaveLength(0);
  await page.getByRole('button',{name:'Open reaction check'}).click();await page.getByRole('button',{name:'Start reaction check'}).click();await page.goto('/mission');await page.clock.runFor(10000);expect((await storage(page)).live).toHaveLength(0);
});

test('Reaction full practice cannot save a live record',async({page})=>{
 await page.goto('/check');await page.getByRole('button',{name:'Practice reaction check'}).click();await page.getByRole('button',{name:'Start reaction check'}).click();
 for(let i=0;i<25;i++){await go(page,i);await respond(page,i);}
 await expect(page.locator('.check-summary')).toBeFocused();await expect(page.getByRole('button',{name:/Practice.*not saved/})).toBeDisabled();expect((await storage(page)).live).toHaveLength(0);
 await page.getByRole('button',{name:'Return to Check'}).click();await expect(page.getByRole('button',{name:'Practice reaction check'})).toBeFocused();
});
