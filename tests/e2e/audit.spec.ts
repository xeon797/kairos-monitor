import { expect, test } from '@playwright/test';
import { mockAI } from './helpers/mockAI';
import { SIMULATION_MIN_DAY } from '../../src/engine/config';

for(const width of [360,1100]) {
  test(`audit: malformed history remains stored without breaking checks or mission at ${width}px`,async({page})=>{
    await mockAI(page);await page.setViewportSize({width,height:900});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/check');await expect(page.locator('.mission-day:visible')).toContainText(`Mission day ${SIMULATION_MIN_DAY}`);
    await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
      const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('checks','readwrite'),checks=tx.objectStore('checks');
        const base={source:'live',day:null,kind:'reaction',quality:'good',medianRtMs:250,lapses:0,falseStarts:0,commissionErrors:null,omissionErrors:null,validTrials:25,interruptions:0};
        checks.add({...base,id:'valid',timestamp:'2026-10-01T00:00:00Z'});
        checks.add({...base,id:'bad-metric',timestamp:'2026-10-01T00:00:00.100Z',medianRtMs:'bad'});
        checks.add({...base,id:'bad-time',timestamp:'invalid'});
        checks.add({...base,id:'bad-kind',timestamp:'2026-10-01T00:00:00.200Z',kind:'unknown'});
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
      };
    }));
    await page.reload();await expect(page.getByRole('alert')).toContainText('3 saved live results are unavailable');
    await expect(page.getByRole('article',{name:'Reaction saved result',exact:true})).toHaveCount(1);
    await expect(page.getByRole('article',{name:'reaction check choices'})).toContainText('1 valid reaction check saved');
    await page.evaluate(()=>new Promise<void>((resolve,reject)=>{
      const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
        const db=open.result,tx=db.transaction('checks','readwrite'),checks=tx.objectStore('checks'),record=checks.get('valid');
        record.onsuccess=()=>{checks.put({...record.result,quality:'unknown'});};
        tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
      };
    }));
    await page.reload();await expect(page.getByRole('alert')).toContainText('4 saved live results are unavailable');
    await expect(page.getByText('No readable saved checks are available.',{exact:true})).toBeVisible();
    await expect(page.getByText('No saved checks yet.',{exact:false})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('.check-history').screenshot({animations:'disabled',path:`.local/audit-screenshots/check-unavailable-${width}.png`});
    await page.getByRole('button',{name:'Open reaction check'}).click();await expect(page.getByRole('button',{name:'Start reaction check'})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.goto('/mission');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
    await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('Review recommended');
    expect(await page.evaluate(()=>new Promise<number>((resolve,reject)=>{
      const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{const db=open.result,tx=db.transaction('checks','readonly'),count=tx.objectStore('checks').index('source').count('live');tx.oncomplete=()=>{db.close();resolve(count.result);};tx.onerror=()=>{db.close();reject(tx.error);};};
    }))).toBe(4);
    expect(errors).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });

  test(`audit: primary button text meets contrast at rest and hover at ${width}px`,async({page})=>{
    await mockAI(page);await page.setViewportSize({width,height:900});await page.goto('/check');
    const button=page.getByRole('button',{name:'Open reaction check'});
    const contrast=()=>button.evaluate(element=>{
      const style=getComputedStyle(element),canvas=document.createElement('canvas');canvas.width=canvas.height=1;
      const context=canvas.getContext('2d')!;
      const luminance=(color:string)=>{
        context.clearRect(0,0,1,1);context.fillStyle=color;context.fillRect(0,0,1,1);
        const channels=Array.from(context.getImageData(0,0,1,1).data).slice(0,3).map(channel=>{const s=channel/255;return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;});
        return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
      };
      const foreground=luminance(style.color),background=luminance(style.backgroundColor);
      return (Math.max(foreground,background)+0.05)/(Math.min(foreground,background)+0.05);
    });
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);await button.hover();
    await expect.poll(contrast).toBeGreaterThanOrEqual(4.5);
    // Observe the settled hover state as well as the beginning of its transition.
    await page.waitForFunction(element=>element.getAnimations().every(animation=>animation.playState==='finished'),await button.elementHandle());
    expect(await contrast()).toBeGreaterThanOrEqual(4.5);
  });
}
