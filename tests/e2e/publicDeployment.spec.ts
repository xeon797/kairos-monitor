import { test, expect } from '@playwright/test';
import { loadEnv } from 'vite';
test.skip(loadEnv('test','.','PLAYWRIGHT_').PLAYWRIGHT_REAL_GEMINI !== '1','Public deployment checks are opt-in.');
for(const width of [360,1100]) {
  test(`deployed routes, fallback, evidence, fonts and persistence at ${width}px`,async ({page,context},testInfo)=>{
    await page.setViewportSize({width,height:900});const errors:string[]=[];const fontWarnings:string[]=[];
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(/font|OTS parsing/i.test(message.text())&&['warning','error'].includes(message.type()))fontWarnings.push(message.text());});
    await page.goto('/mission');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
    const eva=page.getByRole('article',{name:'EVA-07'});const inv=page.getByRole('article',{name:'INV-03'});
    await expect(eva.locator('.concern-chip')).toContainText('Review recommended');await expect(inv.locator('.concern-chip')).toContainText('Change noted');
    await page.waitForTimeout(5500);await expect(eva.locator('.task-explanation')).not.toBeEmpty();await expect(inv.locator('.task-explanation')).toContainText('INV-03');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await page.screenshot({path:`.local/p6-screenshots/mission-day12-${width}.png`,fullPage:true});
    await page.getByRole('link',{name:'Today',exact:true}).click();await expect(page.locator('.engine-status')).toContainText('Review recommended');await expect(page.getByRole('article',{name:'Sleep evidence'})).toContainText('Criterion met on 4 of the last 5 days');
    await page.waitForTimeout(5500);await expect(page.locator('.overall-explanation')).not.toBeEmpty();await page.screenshot({path:`.local/p6-screenshots/today-day12-${width}.png`,fullPage:true});
    await page.getByRole('combobox',{name:'Jump to day'}).selectOption('13');await page.getByRole('button',{name:'Log schedule change'}).click();await page.getByRole('combobox',{name:'Jump to day'}).selectOption('16');await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');await expect(page.locator('.response-entry')).toContainText('Protected sleep window; EVA prep moved');
    for(const path of ['/today','/mission','/check','/trends']) {await page.goto(path);await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');}
    await page.goto('/today');await context.setOffline(true);await page.getByRole('combobox',{name:'Jump to day'}).selectOption('11');await expect(page.locator('.engine-status')).toContainText('Change noted');await expect(page.locator('.explanation-box .template-tag')).toHaveText('Template explanation');await context.setOffline(false);
    await page.getByRole('button',{name:'Reset',exact:true}).click();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');await expect(page.locator('.response-entry')).toHaveCount(0);
    await page.evaluate(async()=>{await Promise.all([400,500,700].map(weight=>document.fonts.load(`${weight} 16px Satoshi`)));});
    expect(await page.evaluate(()=>[400,500,700].every(weight=>document.fonts.check(`${weight} 16px Satoshi`)))).toBe(true);
    for(const name of ['Regular','Medium','Bold']){const font=await page.request.get(`/fonts/Satoshi-${name}.woff2`);expect(font.status()).toBe(200);expect((await font.body()).length).toBeGreaterThan(20000);}
    const session=await context.newCDPSession(page);await session.send('DOM.enable');await session.send('CSS.enable');const {root}=await session.send('DOM.getDocument');const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'.screen-subtitle'});const fonts=await session.send('CSS.getPlatformFontsForNode',{nodeId});await session.detach();expect(fonts.fonts.some(font=>font.familyName==='Satoshi'&&font.isCustomFont)).toBe(true);
    expect(errors).toEqual([]);expect(fontWarnings).toEqual([]);await testInfo.attach('public-deployment-results',{body:JSON.stringify({width,errors,fontWarnings,fonts:fonts.fonts},null,2),contentType:'application/json'});
  });
}
