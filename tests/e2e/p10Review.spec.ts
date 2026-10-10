import { expect, test } from '@playwright/test';
import { mockAI } from './helpers/mockAI';

for(const width of [360,1100])test(`P10 malformed response cannot crash or imply recovery ${width}px`,async({page})=>{
  await mockAI(page);await page.setViewportSize({width,height:900});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/mission');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('16');
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');
  await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
    const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const database=open.result,tx=database.transaction('responses','readwrite');
      tx.objectStore('responses').put({id:'malformed-note',day:13,type:'rest_adjustment',source:'synthetic',note:{unexpected:'object'}});
      tx.oncomplete=()=>{database.close();resolve();};tx.onerror=()=>{database.close();reject(tx.error);};
    };
  }));
  await page.reload();await expect(page.locator('.engine-status')).toContainText('Insufficient data');
  await expect(page.getByRole('alert')).toContainText('schedule changes');
  await expect(page.locator('.recovery-chip')).toHaveCount(0);
  for(const name of ['Advance day','Reset','Log schedule change'])await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
  await page.getByRole('navigation').getByRole('link',{name:'Today'}).click();
  await expect(page.locator('.engine-status')).toContainText('Insufficient data');
  const stored=await page.evaluate(()=>new Promise<unknown>((resolve,reject)=>{
    const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const database=open.result,tx=database.transaction('responses','readonly'),request=tx.objectStore('responses').get('malformed-note');
      tx.oncomplete=()=>{database.close();resolve(request.result);};tx.onerror=()=>{database.close();reject(tx.error);};
    };
  }));
  expect(stored).toMatchObject({note:{unexpected:'object'}});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
