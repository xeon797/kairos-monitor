import {test,expect} from '@playwright/test';
import {loadEnv} from 'vite';
import {mockAI} from './helpers/mockAI';
const enabled=loadEnv('test','.','PLAYWRIGHT_').PLAYWRIGHT_P9_REALTIME==='1';
test.skip(!enabled,'Opt-in wall-clock browser protocol verification on deployment.');
for(const width of [360,1100])test(`P9 real-time complete measured checks ${width}px`,async({page},info)=>{
 test.setTimeout(240000);await mockAI(page);await page.setViewportSize({width,height:900});await page.goto('/check');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');const durations:Record<string,number>={};
 for(const kind of ['reaction','attention']){
  await page.getByRole('button',{name:`Open ${kind} check`}).click();const start=Date.now();await page.getByRole('button',{name:`Start ${kind} check`}).click();
  const target=page.locator('.check-target');
  for(let i=0;i<(kind==='reaction'?25:40);i++){
   const progress=`${kind==='reaction'?'Trial':'Stimulus'} ${i+1} of ${kind==='reaction'?25:40}`;
   // Frame polling observes this trial's brief stimulus, rather than a later one.
   await page.waitForFunction(expected=>document.querySelector('.trial-progress')?.textContent===expected&&document.querySelector('.check-target')?.getAttribute('data-phase')==='stimulus',progress,{polling:'raf',timeout:8000});
   if(kind==='reaction'||await target.getAttribute('data-stimulus')==='go'){
    await page.waitForTimeout(180);const bounds=await target.boundingBox();expect(bounds).not.toBeNull();
    // Send real pointer input without actionability waits spanning the exposure.
    if(!bounds)throw new Error('Visible stimulus has no bounds');await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
   }
   if(kind==='attention')await page.waitForFunction(()=>document.querySelector('.check-target')?.getAttribute('data-phase')==='gap',undefined,{polling:'raf',timeout:2000});
  }
  await expect(page.locator('.check-summary')).toBeVisible();durations[kind]=Date.now()-start;
  const denominator=kind==='reaction'?'Median-eligible responses':'Focused stimuli';const count=kind==='reaction'?25:40;
  await expect(page.locator('.check-summary dl > div').filter({has:page.getByText(denominator,{exact:true})}).locator('dd')).toHaveText(`${count} / ${count}`);
  await expect(page.locator('.check-summary .quality-chip')).toContainText('Good quality');
  await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();await page.getByRole('button',{name:'Return to Check'}).click();
 }
 await page.reload();await expect(page.getByRole('article',{name:'Reaction saved result',exact:true})).toHaveCount(1);await expect(page.getByRole('article',{name:'Attention saved result',exact:true})).toHaveCount(1);
 await page.locator('.check-history').scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:`.local/p9-screenshots/live-history-${width}.png`});
 await page.getByRole('navigation').getByRole('link',{name:'Mission'}).click();await expect(page.getByRole('article',{name:'EVA-07'}).locator('.concern-chip')).toContainText('Review recommended');await expect(page.getByRole('article',{name:'INV-03'}).locator('.concern-chip')).toContainText('Change noted');
 await info.attach('wall-clock-durations',{body:JSON.stringify({width,durations,note:'Automated pointer input with real browser clocks; software verification, not human performance.'}),contentType:'application/json'});
});
