import {test,expect,type Page} from '@playwright/test';
import {mockAI} from './helpers/mockAI';
import type {AppSettings,LiveCheck} from '../../src/db/db';
async function saved(page:Page){return page.evaluate(()=>new Promise<{settings:AppSettings;checks:LiveCheck[];responses:unknown[]}>((resolve,reject)=>{
 const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction(['settings','checks','responses'],'readonly');const settings=tx.objectStore('settings').get('app'),checks=tx.objectStore('checks').getAll(),responses=tx.objectStore('responses').getAll();tx.oncomplete=()=>{resolve({settings:settings.result,checks:checks.result.filter((r:LiveCheck)=>r.source==='live'),responses:responses.result});db.close();};};
}));}
for(const width of [360,1100])test(`P9 full documented pitch and navigation ${width}px`,async({page,context})=>{
 await mockAI(page);await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await page.getByRole('link',{name:'Launch demo'}).first().click();await expect(page.locator('.engine-status')).toContainText('Within your usual range');
 const baseline=(await saved(page)).settings.baseline;expect(baseline).toMatchObject({window:[1,7],rtMeanMs:265,validChecks:7,validSleepNights:7});expect(baseline?.midpointMeanMinutes).toBeCloseTo(180,9);expect(baseline?.lapsesMean).toBeCloseTo(1,9);expect(baseline?.sleepMeanHours).toBeCloseTo(50.5/7,9);expect(baseline?.errorsMean).toBeCloseTo(9/7,9);
 const jump=async(day:number)=>{await page.getByRole('combobox',{name:'Jump to day'}).selectOption(String(day));await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);};
 await expect(page.getByRole('button',{name:'Back one day'})).toBeDisabled();await jump(11);await expect(page.locator('.engine-status')).toContainText('Change noted');await page.getByRole('button',{name:'Advance day'}).click();await expect(page.locator('.engine-status')).toContainText('Review recommended');
 await expect(page.locator('.domain-preview li')).toContainText(['4 of 5','3 of 5','3 of 5']);
 await page.getByRole('navigation').getByRole('link',{name:'Mission'}).click();
 const eva=page.getByRole('article',{name:'EVA-07'}),inv=page.getByRole('article',{name:'INV-03'});
 await expect(eva.locator('.concern-chip')).toContainText('Review recommended');await expect(inv.locator('.concern-chip')).toContainText('Change noted');
 for(const card of [eva,inv]){await expect(card.locator('.task-schedule')).toContainText('In 2 days');await expect(card.locator('.template-tag')).toContainText('AI-rephrased');await card.getByRole('button',{name:'Show template version'}).click();await expect(card.locator('.template-tag')).toContainText('Template explanation');}
 expect(await eva.locator('.task-explanation').textContent()).not.toEqual(await inv.locator('.task-explanation').textContent());
 await page.screenshot({animations:'disabled',path:`.local/p9-screenshots/mission-${width}.png`});
 await page.getByRole('navigation').getByRole('link',{name:'Trends'}).click();await expect(page.locator('.trend-summary')).toContainText(['4 of the last 5','3 of the last 5','3 of the last 5']);await expect(page.locator('.trend-card').first().locator('tbody tr')).toHaveCount(12);
 await page.getByRole('button',{name:'About',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Gemini');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'About',exact:true})).toBeFocused();
 await page.getByRole('navigation').getByRole('link',{name:'Mission'}).click();await page.getByRole('button',{name:'Advance day'}).click();await page.getByRole('button',{name:'Log schedule change',exact:true}).click();await expect(page.locator('.response-entry')).toContainText('Day 13');await expect(page.locator('.recovery-chip')).toHaveCount(0);
 await jump(14);await expect(page.locator('.recovery-chip')).toHaveCount(0);await jump(15);await expect(eva).toContainText('2 relevant sustained domains');await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');
 await page.getByRole('button',{name:'Advance day'}).click();await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');await expect(page.getByText('This comparison does not show that the adjustment caused the change.',{exact:true})).toBeVisible();
 await page.getByRole('navigation').getByRole('link',{name:'Today'}).click();await expect(page.locator('.engine-status')).toContainText('Within your usual range');await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');expect((await saved(page)).responses).toHaveLength(1);
 await page.getByRole('link',{name:'Kairos Monitor home'}).click();await page.reload();await page.getByRole('link',{name:'Launch demo'}).first().click();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');
 for(const route of ['check','trends','mission','today']){await page.goto('/'+route);await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(await page.locator('.content-region').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);}
 await jump(17);await expect(page.getByRole('button',{name:'Advance day'})).toBeDisabled();await expect(page.locator('.recovery-chip')).toHaveCount(0);expect((await saved(page)).settings.baseline).toEqual(baseline);
 await context.setOffline(true);await jump(10);await expect(page.locator('.explanation-box .template-tag')).toHaveText('Template explanation');await expect(page.locator('.engine-status')).toContainText('Within your usual range');await context.setOffline(false);
 await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');expect((await saved(page)).responses).toHaveLength(0);expect((await saved(page)).settings.baseline).toEqual(baseline);
 await page.getByRole('navigation').getByRole('link',{name:'Check'}).click();await expect(page.getByRole('heading',{name:'Saved results'})).toBeVisible();await expect(page.locator('.check-choice')).toHaveCount(2);await page.screenshot({animations:'disabled',path:`.local/p9-screenshots/check-${width}.png`});expect(errors).toEqual([]);
});
for(const width of [360,1100])test(`P9 practice focus and reduced motion ${width}px`,async({page})=>{
 await mockAI(page);await page.setViewportSize({width,height:900});await page.goto('/check');
 for(const kind of ['reaction','attention']){const launch=page.getByRole('button',{name:`Practice ${kind} check`});await launch.click();await expect(page.getByRole('button',{name:`Start ${kind} check`})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:`Start ${kind} check`})).toBeFocused();await page.keyboard.press('Escape');await expect(launch).toBeFocused();}
 expect((await saved(page)).checks).toHaveLength(0);await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.navigation-link').first().evaluate(e=>getComputedStyle(e).transitionDuration)).toBe('0s');
 await page.emulateMedia({reducedMotion:'no-preference'});expect(await page.locator('.navigation-link').first().evaluate(e=>getComputedStyle(e).transitionDuration)).toContain('0.18s');
});

test('P9 separate first-three baselines and latest-ten history fixtures',async({page})=>{
 await mockAI(page);await page.goto('/check');await expect(page.getByRole('heading',{name:'Saved results'})).toBeVisible();
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('checks','readwrite');for(let i=1;i<=12;i++)tx.objectStore('checks').put({id:`fixture-${i}`,source:'live',day:null,timestamp:`2026-10-${String(i).padStart(2,'0')}T00:00:00.000Z`,kind:i<=10?'reaction':'go_no_go',quality:i===1?'poor':'good',medianRtMs:i<=10?200+i*10:null,lapses:i<=10?0:null,falseStarts:0,commissionErrors:i>10?1:null,omissionErrors:i>10?0:null,validTrials:i<=10?25:40,interruptions:i===1?3:0});tx.oncomplete=()=>{db.close();resolve();};};}));
 await page.reload();await expect(page.locator('.check-history ol > li')).toHaveCount(10);
 const reaction=page.getByRole('article',{name:'reaction check choices'}),attention=page.getByRole('article',{name:'attention check choices'});
 await expect(reaction).toContainText('230.0 ms baseline');await expect(reaction).toContainText('9 valid reaction checks saved');await expect(attention).toContainText('Compare after 3 checks');await expect(attention).toContainText('2 valid attention checks saved');
 await page.getByRole('button',{name:'Reset',exact:true}).click();await page.reload();await expect(page.locator('.check-history ol > li')).toHaveCount(10);await expect(reaction).toContainText('230.0 ms baseline');
});
