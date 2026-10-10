import { expect, type Page } from '@playwright/test';
import { createGoNoGoStimuli, createReactionDelays, createSeededRandom } from '../../../src/checks/scoring';
import type { AppSettings, LiveCheck, PersistedResponse } from '../../../src/db/db';

export async function saved(page:Page) {
  return page.evaluate(()=>new Promise<{settings:AppSettings;live:LiveCheck[];responses:PersistedResponse[];cacheKeys:string[]}>((resolve,reject)=>{
    const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const database=open.result,tx=database.transaction(['settings','checks','responses','explanations'],'readonly');
      const settings=tx.objectStore('settings').get('app'),checks=tx.objectStore('checks').getAll();
      const responses=tx.objectStore('responses').getAll(),cache=tx.objectStore('explanations').getAllKeys();
      tx.oncomplete=()=>{database.close();resolve({settings:settings.result,live:checks.result.filter((row:LiveCheck)=>row.source==='live'),responses:responses.result,cacheKeys:cache.result.map(String)});};
      tx.onerror=()=>{database.close();reject(tx.error);};
    };
  }));
}
async function frameUntil(page:Page,phase:string) {
  for(let frame=0;frame<6;frame++) {
    if(await page.locator('.check-target').getAttribute('data-phase')===phase)return;
    await page.clock.runFor(16);
  }
  await expect(page.locator('.check-target')).toHaveAttribute('data-phase',phase);
}
export async function completeChecks(page:Page) {
  const delays=createReactionDelays(createSeededRandom(123));
  await page.getByRole('button',{name:'Open reaction check'}).click();await page.getByRole('button',{name:'Start reaction check'}).click();
  for(let index=0;index<25;index++) {
    await page.clock.runFor(Math.ceil(delays[index])+32);await frameUntil(page,'stimulus');
    await expect(page.locator('.trial-progress')).toHaveText(`Trial ${index+1} of 25`);
    await page.clock.runFor(250);
    if(index%2===0)await page.keyboard.press('Space');else await page.locator('.check-target').click();
  }
  await expect(page.locator('.check-summary')).toBeFocused();await expect(page.locator('.check-summary')).toContainText('Good quality');
  await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();
  await page.getByRole('button',{name:'Return to Check'}).click();await expect(page.getByRole('button',{name:'Open reaction check'})).toBeFocused();
  const stimuli=createGoNoGoStimuli(createSeededRandom(123));
  await page.getByRole('button',{name:'Open attention check'}).click();await page.getByRole('button',{name:'Start attention check'}).click();
  for(let index=0;index<40;index++) {
    await frameUntil(page,'stimulus');await expect(page.locator('.trial-progress')).toHaveText(`Stimulus ${index+1} of 40`);
    await expect(page.locator('.check-target')).toHaveAttribute('data-stimulus',stimuli[index]);
    await page.clock.runFor(250);
    if(stimuli[index]==='go') {
      if(index%2===0)await page.keyboard.press('Space');else await page.locator('.check-target').click();
    }
    await page.clock.runFor(520);await frameUntil(page,'gap');await page.clock.runFor(375);
    // The final gap leads to complete, rather than a further stimulus.
    for(let frame=0;frame<6;frame++) {
      if(await page.locator('.check-target').getAttribute('data-phase')!=='gap')break;
      await page.clock.runFor(16);
    }
  }
  await expect(page.locator('.check-summary')).toBeFocused();await expect(page.locator('.check-summary')).toContainText('Good quality');
  await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();
  await page.getByRole('button',{name:'Return to Check'}).click();await expect(page.getByRole('button',{name:'Open attention check'})).toBeFocused();
}

