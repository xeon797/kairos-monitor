import { expect, test, type Page } from '@playwright/test';
import { createGoNoGoStimuli, createSeededRandom } from '../../src/checks/scoring';
import { mockAI } from './helpers/mockAI';
import type { AppSettings, LiveCheck } from '../../src/db/db';
const stimuli=createGoNoGoStimuli(createSeededRandom(123));
test.beforeEach(async({page})=>{
  await mockAI(page);await page.clock.install({time:new Date('2026-10-09T00:00:00.000Z')});await page.clock.pauseAt(new Date('2026-10-09T00:00:01.000Z'));
  await page.addInitScript(()=>{const original=crypto.getRandomValues.bind(crypto);Object.defineProperty(crypto,'getRandomValues',{value:(array:Uint32Array)=>{original(array);if(array instanceof Uint32Array&&array.length===1)array[0]=123;return array;}});});
});
async function storage(page:Page){return page.evaluate(()=>new Promise<{settings:AppSettings;live:LiveCheck[]}>((resolve,reject)=>{
  const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);open.onsuccess=()=>{
    const db=open.result,tx=db.transaction(['checks','settings'],'readonly'),setting=tx.objectStore('settings').get('app'),checks=tx.objectStore('checks').getAll();
    tx.oncomplete=()=>{resolve({settings:setting.result as AppSettings,live:(checks.result as LiveCheck[]).filter(row=>row.source==='live')});db.close();};tx.onerror=()=>reject(tx.error);
  };
}));}
async function stimulusFrame(page:Page){
  for(let step=0;step<5;step++){if(await page.locator('.check-target').getAttribute('data-phase')==='stimulus')return;await page.clock.runFor(16);}
  await expect(page.locator('.check-target')).toHaveAttribute('data-phase','stimulus');
}
async function exposureEnd(page:Page,elapsedMs:number){
  await page.clock.runFor(770-elapsedMs);await expect(page.locator('.check-target')).toHaveAttribute('data-phase','stimulus');
  for(let step=0;step<5;step++){if(await page.locator('.check-target').getAttribute('data-phase')==='gap')break;await page.clock.runFor(16);}
  await expect(page.locator('.check-target')).toHaveAttribute('data-phase','gap');await expect(page.locator('.check-target')).toBeHidden();
}
async function gapEnd(page:Page){
  await page.clock.runFor(375);await expect(page.locator('.check-target')).toHaveAttribute('data-phase','gap');
  for(let step=0;step<5;step++){await page.clock.runFor(16);if(await page.locator('.check-target').getAttribute('data-phase')!=='gap')return;}
  throw new Error('The 400 ms gap did not finish.');
}
for(const width of [360,1100])test(`Attention full protocol, mixed responses and persisted kinds at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto('/check');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');const before=await storage(page);
  await page.getByRole('button',{name:'Open attention check'}).click();await page.getByRole('button',{name:'Start attention check'}).click();
  let goCount=0,noGoCount=0;
  for(let index=0;index<40;index++){
    await stimulusFrame(page);
    const target=page.locator('.check-target');await expect(target).toHaveAttribute('data-phase','stimulus');await expect(target).toHaveAttribute('data-stimulus',stimuli[index]);
    const radius=await target.evaluate(element=>getComputedStyle(element).borderRadius);
    if(stimuli[index]==='no_go'){noGoCount++;expect(parseFloat(radius)).toBeLessThan(20);}else{goCount++;expect(parseFloat(radius)).toBeGreaterThan(100);}
    await page.clock.runFor(250);
    if((stimuli[index]==='go'&&goCount>1)||(stimuli[index]==='no_go'&&noGoCount===1)){
      if(index%2===0)await page.keyboard.press('Space');else await target.click();
    }
    await exposureEnd(page,250);await gapEnd(page);
  }
  expect(goCount).toBe(30);expect(noGoCount).toBe(10);
  const summary=page.locator('.check-summary');await expect(summary).toContainText('Good quality');await expect(summary.locator('dl > div').filter({hasText:'Commission errors'}).locator('dd')).toHaveText('1 / 10 no-go stimuli');await expect(summary.locator('dl > div').filter({hasText:'Omission errors'}).locator('dd')).toHaveText('1 / 30 go stimuli');await expect(summary).toContainText('40 / 40');
  await page.getByRole('button',{name:'Save result',exact:true}).evaluate((button:HTMLButtonElement)=>{button.click();button.click();});await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();
  const saved=await storage(page);expect(saved.live).toHaveLength(1);expect(saved.live[0]).toMatchObject({kind:'go_no_go',source:'live',day:null,quality:'good',commissionErrors:1,omissionErrors:1,falseStarts:0,medianRtMs:null,lapses:null,validTrials:40});expect(saved.settings.baseline).toEqual(before.settings.baseline);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`.local/p8-screenshots/attention-result-${width}.png`});
  await page.getByRole('button',{name:'Return to Check'}).click();await page.reload();expect((await storage(page)).live).toEqual(saved.live);await expect(page.getByRole('article',{name:'Attention saved result',exact:true})).toHaveCount(1);await expect(page.getByRole('article',{name:'Attention saved result',exact:true})).toContainText('Live browser test');
  await page.goto('/mission');await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('Review recommended');await expect(page.getByRole('article',{name:'INV-03'})).toContainText('Change noted');expect(errors).toEqual([]);
});

for(const width of [360,1100])test(`Attention repeated/gap inputs, interruption quality, cancel/restart and navigation cleanup at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.goto('/check');await page.getByRole('button',{name:'Open attention check'}).click();await page.getByRole('button',{name:'Start attention check'}).click();
  // Before the committed target frame there is no response clock to score.
  await page.keyboard.down('Space');await page.keyboard.down('Space');await stimulusFrame(page);await page.keyboard.up('Space');
  for(let index=0;index<40;index++){
    if(index>0)await stimulusFrame(page);
    await expect(page.locator('.check-target')).toHaveAttribute('data-phase','stimulus');
    if(index<3){
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('blur'));});
      await exposureEnd(page,0);await gapEnd(page);await expect(page.locator('.check-target')).toHaveAttribute('data-phase','paused');
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('focus'));});
    }else{
      await page.clock.runFor(250);
      if(stimuli[index]==='go')await page.locator('.check-target').evaluate((button:HTMLButtonElement)=>{button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:4,button:0,bubbles:true}));button.dispatchEvent(new PointerEvent('pointerdown',{pointerId:4,button:0,bubbles:true}));button.dispatchEvent(new PointerEvent('pointerup',{pointerId:4,bubbles:true}));});
      await exposureEnd(page,250);await page.keyboard.press('Space');await gapEnd(page);
    }
  }
  const summary=page.locator('.check-summary');await expect(summary).toContainText('Insufficient data · Poor quality');await expect(summary).toContainText('More than 2 interruptions');await expect(summary).toContainText('37 / 40');await expect(summary.locator('dl > div').filter({hasText:'Commission errors'}).locator('dd')).toHaveText(/^0 \/ \d+ no-go stimuli$/);
  await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();expect((await storage(page)).live[0].quality).toBe('poor');
  await page.getByRole('button',{name:'Restart attention check'}).click();await page.clock.runFor(32);await expect(page.locator('.trial-progress')).toHaveText('Stimulus 1 of 40');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.clock.runFor(10000);expect((await storage(page)).live).toHaveLength(1);
  await page.getByRole('button',{name:'Open attention check'}).click();await page.getByRole('button',{name:'Start attention check'}).click();await page.goto('/today');await page.clock.runFor(10000);expect((await storage(page)).live).toHaveLength(1);
});

test('Attention full practice cannot save a live record',async({page})=>{
 await page.goto('/check');await page.getByRole('button',{name:'Practice attention check'}).click();await page.getByRole('button',{name:'Start attention check'}).click();
 for(let i=0;i<40;i++){await stimulusFrame(page);await exposureEnd(page,0);await gapEnd(page);}
 await expect(page.locator('.check-summary')).toBeFocused();await expect(page.getByRole('button',{name:/Practice.*not saved/})).toBeDisabled();expect((await storage(page)).live).toHaveLength(0);
 await page.getByRole('button',{name:'Return to Check'}).click();await expect(page.getByRole('button',{name:'Practice attention check'})).toBeFocused();
});
