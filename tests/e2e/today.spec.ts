import { test, expect } from '@playwright/test';

for (const width of [360,1100]) {
  test(`Today evidence at ${width}px`,async ({page},testInfo) => {
    await page.setViewportSize({width,height:900});
    const errors:string[] = []; page.on('pageerror',error => errors.push(error.message));
    page.on('console',message => {if (message.type() === 'error') errors.push(message.text());});
    await page.goto('/today');
    const status = page.getByRole('region',{name:'Overall status'});
    await expect(status).toContainText('Within your usual range');
    const jump = async (day:number) => {
      await page.getByRole('combobox',{name:'Jump to day'}).selectOption(String(day));
      await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);
    };
    await jump(11); await expect(status).toContainText('Change noted');
    await jump(12); await expect(status).toContainText('Review recommended');
    const sleep = page.getByRole('article',{name:'Sleep evidence'});
    const reaction = page.getByRole('article',{name:'Reaction evidence'});
    const attention = page.getByRole('article',{name:'Attention evidence'});
    await expect(sleep).toContainText('4 of the last 5 days');
    await expect(sleep).toContainText('5.4 h'); await expect(sleep).toContainText('Baseline 7.21 h'); await expect(sleep).toContainText('Difference -1.81 h');
    await expect(reaction).toContainText('3 of the last 5 days'); await expect(reaction).toContainText('312 ms'); await expect(reaction).toContainText('Baseline 265 ms'); await expect(reaction).toContainText('Difference +47 ms');
    await expect(attention).toContainText('3 of the last 5 days'); await expect(attention.locator('.measurement')).toHaveCount(2);
    await expect(attention).toContainText('Baseline 1 count'); await expect(attention).toContainText('Baseline 1.29 count');
    await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('In 2 days');
    await expect(page.getByRole('region',{name:'Data availability'})).toContainText('Checks 5/5 days');
    await expect(page.getByText('Template explanation',{exact:true})).toBeVisible();
    await expect(page.getByRole('region',{name:'Synthetic mission telemetry'})).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('400 16px Satoshi') && document.fonts.check('500 16px Satoshi') && document.fonts.check('700 16px Satoshi'))).toBe(true);
    await page.locator('.content-region').evaluate(element => element.scrollTo(0,0));
    await page.screenshot({path:testInfo.outputPath(`today-day12-${width}.png`),fullPage:true});
    const repeat = page.getByRole('link',{name:'Repeat check',exact:true});
    await repeat.focus(); await expect(repeat).toBeFocused(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/check$/);
    await page.getByRole('navigation').getByRole('link',{name:'Today',exact:true}).click(); await jump(17);
    await expect(page.getByText('No upcoming tasks in this simulation.',{exact:true})).toBeVisible();
    expect(await page.locator('html').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator('.content-region').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}
test('Today missing telemetry shows gaps, reasons and actual availability',async ({page}) => {
  await page.goto('/today'); await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
  await page.evaluate(() => new Promise<void>((resolve,reject) => {
    const open = indexedDB.open('kairos-monitor');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result; const tx = database.transaction(['sleep','checks','settings'],'readwrite');
      tx.oncomplete = () => {database.close();resolve();}; tx.onerror = () => {database.close();reject(tx.error);};
      const settings = tx.objectStore('settings'); const setting = settings.get('app'); setting.onsuccess = () => settings.put({...setting.result,currentDay:12});
      for (const day of [10,11,12]) {
        const sleep = tx.objectStore('sleep'); const request = sleep.get(day);
        request.onsuccess = () => sleep.put({...request.result,sleepHours:null,midpointMinutes:null,quality:'missing'});
        const checks = tx.objectStore('checks'); const check = checks.get(`synthetic-check-${day}`);
        check.onsuccess = () => checks.put({...check.result,medianRtMs:null,lapses:null,commissionErrors:null,quality:'missing'});
      }
    };
  }));
  await page.reload(); await expect(page.locator('.engine-status')).toContainText('Insufficient data');
  await expect(page.getByRole('article',{name:'Sleep evidence'})).toContainText('missing quality');
  await expect(page.getByRole('article',{name:'Sleep evidence'}).locator('.measurement-value strong').first()).toHaveText('—');
  await expect(page.getByRole('region',{name:'Data availability'})).toContainText('Sleep 2/5 days');
  await expect(page.getByRole('region',{name:'Data availability'})).toContainText('Checks 2/5 days');
  await expect(page.locator('.recovery-chip')).toHaveCount(0);
});
