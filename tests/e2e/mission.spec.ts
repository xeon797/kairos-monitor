import { test, expect } from '@playwright/test';
import { NON_CAUSATION } from '../../src/engine/templates';

for (const width of [360,1100]) {
  test(`Mission comparison and response flow at ${width}px`,async ({page},testInfo) => {
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({reducedMotion:'reduce'});
    const errors:string[] = []; const fontWarnings:string[] = []; const apiRequests:string[] = [];
    page.on('pageerror',error => errors.push(error.message));
    page.on('console',message => {
      if (!['error','warning'].includes(message.type())) return;
      if (/font|OTS parsing/i.test(message.text())) fontWarnings.push(message.text()); else errors.push(message.text());
    });
    page.on('request',request => {if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());});
    await page.goto('/mission'); await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
    const jump = async (day:number) => {
      await page.getByRole('combobox',{name:'Jump to day'}).selectOption(String(day));
      await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);
      await expect(page.getByRole('region',{name:'Synthetic mission telemetry'})).toHaveAttribute('aria-busy','false');
    };
    const schedule = page.locator('.mission-task-list');
    await expect(schedule.locator('.task-id')).toHaveText(['EVA-07','INV-03','MAINT-11','DOCK-02']);
    await jump(12);
    const eva = page.getByRole('article',{name:'EVA-07'}); const inv = page.getByRole('article',{name:'INV-03'});
    await expect(eva.locator('.concern-chip')).toHaveText('⚑ Review recommended'); await expect(inv.locator('.concern-chip')).toHaveText('◐ Change noted');
    await expect(eva).toContainText('3 relevant sustained domains'); await expect(inv).toContainText('2 relevant sustained domains');
    await expect(eva.locator('.task-schedule')).toContainText('In 2 days'); await expect(inv.locator('.task-schedule')).toContainText('In 2 days');
    await expect(eva.locator('.task-explanation')).toContainText('high-demand'); await expect(eva.locator('.task-explanation')).toContainText('repeat the check before EVA-07');
    await expect(inv.locator('.task-explanation')).toContainText('INV-03'); await expect(inv.locator('.task-explanation')).toContainText('routine monitoring');
    await expect(inv.locator('.task-explanation')).not.toContainText('repeat the check');
    expect(await eva.locator('.task-explanation').textContent()).not.toBe(await inv.locator('.task-explanation').textContent());
    await expect(schedule.locator('.task-schedule')).toHaveText(['Mission day 14 · In 2 days','Mission day 14 · In 2 days','Mission day 15 · In 3 days','Mission day 16 · In 4 days']);
    await page.locator('.content-region').evaluate(element => element.scrollTo(0,0));
    await page.screenshot({path:testInfo.outputPath(`mission-day12-${width}.png`),fullPage:true});
    // A taller screenshot records the entire mobile scroll region without changing width.
    if (width === 360) {
      const height = await page.locator('.content-region').evaluate(element => element.scrollHeight+250);
      await page.setViewportSize({width,height});
      await page.screenshot({path:testInfo.outputPath('mission-day12-360-complete.png'),fullPage:true});
      await page.setViewportSize({width,height:900});
    }
    await page.getByRole('navigation').getByRole('link',{name:'Today',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Today',exact:true})).toBeVisible();
    await expect(page.getByRole('article',{name:'Sleep evidence'})).toContainText('5.4 h');
    await expect(page.locator('.engine-status')).toContainText('Review recommended');
    if (width === 360) {
      const height = await page.locator('.content-region').evaluate(element => element.scrollHeight+250);
      await page.setViewportSize({width,height});
    }
    await page.screenshot({path:testInfo.outputPath(`today-day12-${width}-complete.png`),fullPage:true});
    await page.setViewportSize({width,height:900});
    await page.getByRole('navigation').getByRole('link',{name:'Mission',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Mission',exact:true})).toBeVisible();
    // Enter keyboard modality after pointer navigation before checking :focus-visible.
    await page.keyboard.press('Tab');
    const repeat = eva.getByRole('link',{name:'Repeat check',exact:true}); await repeat.focus(); await expect(repeat).toBeFocused();
    expect(await repeat.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    expect(await repeat.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/check$/);
    await page.getByRole('navigation').getByRole('link',{name:'Mission',exact:true}).click();
    await jump(13);
    const log = page.getByRole('button',{name:'Log schedule change',exact:true});
    await log.focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.response-entry')).toHaveCount(1); await expect(page.locator('.response-entry')).toHaveText('Day 13 · Protected sleep window; EVA prep moved');
    await expect(page.locator('.response-metadata')).toContainText('Rest adjustment');
    await jump(12); await expect(page.locator('.future-response')).toHaveText('After the selected day · Day 13'); await expect(page.locator('.recovery-chip')).toHaveCount(0);
    await jump(14); await expect(page.locator('.recovery-chip')).toHaveCount(0); await expect(eva.locator('.task-schedule')).toContainText('Today');
    for (const day of [15,16]) { await jump(day); await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline'); await expect(page.getByText(NON_CAUSATION,{exact:true})).toBeVisible(); }
    await page.reload(); await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17'); await expect(page.locator('.response-entry')).toHaveCount(1);
    await jump(17); await expect(page.locator('.recovery-chip')).toHaveCount(0);
    await expect(schedule.locator('.task-schedule')).toHaveText(['Mission day 14 · 3 days ago','Mission day 14 · 3 days ago','Mission day 15 · 2 days ago','Mission day 16 · 1 day ago']);
    await page.getByRole('navigation').getByRole('link',{name:'Today',exact:true}).click(); await expect(page.getByText('No upcoming tasks in this simulation.',{exact:true})).toBeVisible();
    await page.getByRole('navigation').getByRole('link',{name:'Mission',exact:true}).click();
    await page.getByRole('button',{name:'Reset',exact:true}).click(); await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17'); await expect(page.locator('.response-entry')).toHaveCount(0);
    await expect(log).toBeDisabled();
    // React disables immediately; the button's synchronous latch also rejects same-task duplicates.
    await jump(13); await log.evaluate((element:HTMLButtonElement) => {for (let count = 0;count < 10;count++) element.click();});
    await expect(page.locator('.response-entry')).toHaveCount(1); await expect(log).toBeEnabled();
    expect(await page.locator('html').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator('.content-region').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await testInfo.attach('p5-browser-inspection',{body:JSON.stringify({width,errors,fontWarnings,apiRequests},null,2),contentType:'application/json'});
    expect(errors).toEqual([]); expect(fontWarnings).toEqual([]); expect(apiRequests).toEqual([]);
  });
}

test('Mission current-day missing evidence cannot produce recovery after a logged adjustment',async ({page}) => {
  await page.goto('/mission'); await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('13');
  await page.getByRole('button',{name:'Log schedule change',exact:true}).click(); await expect(page.locator('.response-entry')).toHaveCount(1);
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('15'); await expect(page.locator('.recovery-chip')).toHaveCount(1);
  await page.evaluate(() => new Promise<void>((resolve,reject) => {
    const open = indexedDB.open('kairos-monitor'); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result; const tx = database.transaction('checks','readwrite');
      tx.oncomplete = () => {database.close();resolve();}; tx.onerror = () => {database.close();reject(tx.error);};
      const checks = tx.objectStore('checks'); const read = checks.get('synthetic-check-15');
      read.onsuccess = () => checks.put({...read.result,medianRtMs:null,lapses:null,commissionErrors:null,quality:'missing'});
    };
  }));
  await page.reload(); await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 15 / 17');
  await expect(page.locator('.response-entry')).toHaveCount(1); await expect(page.locator('.recovery-chip')).toHaveCount(0);
});

test('Mission unavailable storage renders insufficient data and disables response actions',async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window,'indexedDB',{value:{open:() => {throw new DOMException('Storage denied for verification','SecurityError');}}});
  });
  await page.goto('/mission'); await expect(page.getByRole('alert')).toContainText('Local storage unavailable');
  await expect(page.locator('.engine-status')).toContainText('Insufficient data');
  await expect(page.locator('.task-card')).toHaveCount(0); await expect(page.getByRole('button',{name:'Log schedule change',exact:true})).toBeDisabled();
});
