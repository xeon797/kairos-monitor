import { expect, test } from '@playwright/test';
import type { AppSettings } from '../../src/db/db';
import { FOOTER_DISCLAIMER } from '../../src/content';

// Local P4 verification only; this is not the later AI/full-demo/PWA flow.
for (const width of [360,1100]) {
  test(`shared simulator persistence at ${width}px`,async ({page},testInfo) => {
    await page.setViewportSize({width,height:820});
    const errors:string[] = [];
    const fontWarnings:string[] = [];
    const apiRequests:string[] = [];
    page.on('pageerror',error => errors.push(error.message));
    page.on('console',message => {
      if (!['error','warning'].includes(message.type())) return;
      if (message.location().url.includes('/fonts/') || /font|OTS parsing error/i.test(message.text())) fontWarnings.push(message.text());
      else errors.push(message.text());
    });
    page.on('request',request => {if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());});
    const readSettings = () => page.evaluate(() => new Promise<AppSettings>((resolve,reject) => {
      const opening = indexedDB.open('kairos-monitor');
      opening.onerror = () => reject(opening.error);
      opening.onsuccess = () => {
        const database = opening.result;
        const request = database.transaction('settings','readonly').objectStore('settings').get('app');
        request.onerror = () => {database.close();reject(request.error);};
        request.onsuccess = () => {database.close();resolve(request.result as AppSettings);};
      };
    }));
    const currentDay = page.locator('.mission-day:visible');
    const advance = page.getByRole('button',{name:'Advance day',exact:true});
    const back = page.getByRole('button',{name:'Back one day',exact:true});
    const reset = page.getByRole('button',{name:'Reset',exact:true});
    const log = page.getByRole('button',{name:'Log schedule change',exact:true});
    const panel = page.getByRole('region',{name:'Synthetic mission telemetry'});
    const jump = async (day:number) => {
      await page.getByRole('combobox',{name:'Jump to day'}).selectOption(String(day));
      await expect(currentDay).toHaveText(`Mission day ${day} / 17`);
      await expect(panel).toHaveAttribute('aria-busy','false');
    };
    await page.goto('/today');
    await expect(currentDay).toHaveText('Mission day 7 / 17');
    await expect(back).toBeDisabled(); await expect(log).toBeDisabled();
    await expect(page.locator('.engine-status')).toContainText('Within your usual range');
    const baseline = (await readSettings()).baseline;
    await jump(11); await expect(page.locator('.engine-status')).toContainText('Change noted');
    await advance.click(); await expect(currentDay).toHaveText('Mission day 12 / 17'); await expect(panel).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.engine-status')).toContainText('Review recommended');
    await expect(page.locator('.domain-preview')).toHaveText(/Sleep4 of 5 days · SustainedReaction3 of 5 days · SustainedAttention3 of 5 days · Sustained/);
    await page.locator('.engine-preview').scrollIntoViewIfNeeded();
    if (width === 1100) await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({path:testInfo.outputPath(`engine-day12-${width}.png`),fullPage:true});
    await jump(13); await log.click(); await expect(page.getByText('Schedule changes logged: 1',{exact:true})).toBeVisible();
    await expect(page.locator('.response-entry')).toHaveText('Day 13 · Protected sleep window; EVA prep moved');
    await expect(page.locator('.recovery-chip')).toHaveCount(0);
    await jump(15);
    await expect(page.locator('.domain-preview')).toHaveText(/Sleep2 of 5 days · Not sustainedReaction3 of 5 days · SustainedAttention3 of 5 days · Sustained/);
    await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');
    await expect(page.getByText('This comparison does not show that the adjustment caused the change.',{exact:true})).toBeVisible();
    await advance.click(); await expect(currentDay).toHaveText('Mission day 16 / 17'); await expect(panel).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.engine-status')).toContainText('Within your usual range');
    await expect(page.locator('.recovery-chip')).toBeVisible();
    await page.locator('.simulation-panel').scrollIntoViewIfNeeded();
    await page.screenshot({path:testInfo.outputPath(`simulator-day16-${width}.png`),fullPage:true});
    await page.reload(); await expect(currentDay).toHaveText('Mission day 16 / 17');
    await expect(page.locator('.response-entry')).toHaveCount(1); await expect(page.locator('.recovery-chip')).toHaveCount(1);
    for (const screen of ['Check','Trends','Mission','Today']) {
      await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:screen,exact:true}).click();
      await expect(page.getByRole('heading',{name:screen,exact:true})).toBeVisible();
      await expect(currentDay).toHaveText('Mission day 16 / 17');
      await expect(page.locator('.response-entry')).toHaveCount(1);
    }
    await reset.click(); await expect(currentDay).toHaveText('Mission day 7 / 17'); await expect(panel).toHaveAttribute('aria-busy','false');
    await expect(page.locator('.response-entry')).toHaveCount(0); await expect(page.locator('.recovery-chip')).toHaveCount(0);
    expect((await readSettings()).baseline).toEqual(baseline);
    // Same-task burst exercises serialized accepted events before DOM disabling.
    const acceptedClicks = await advance.evaluate((button:HTMLButtonElement) => {
      let accepted = 0;
      for (let index = 0; index < 20; index++) { if (!button.disabled) {accepted++;button.click();} }
      return accepted;
    });
    await expect(panel).toHaveAttribute('aria-busy','false');
    const expectedDay = Math.min(7+acceptedClicks,17);
    await expect(currentDay).toHaveText(`Mission day ${expectedDay} / 17`);
    await page.reload(); await expect(currentDay).toHaveText(`Mission day ${expectedDay} / 17`);
    await jump(17); await expect(advance).toBeDisabled();
    await jump(7); await expect(back).toBeDisabled(); await expect(log).toBeDisabled();
    await expect(page.getByRole('combobox',{name:'Jump to day'}).locator('option')).toHaveCount(11);
    expect(await page.locator('html').evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.locator('.content-region').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    for (const control of [advance,back,reset,log,page.getByRole('combobox',{name:'Jump to day'})]) {
      expect(await control.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
    await reset.focus(); expect(await reset.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
    await page.locator('footer').scrollIntoViewIfNeeded(); await expect(page.locator('footer')).toHaveText(FOOTER_DISCLAIMER);
    if (width === 360) {
      const footer = await page.locator('footer').boundingBox(); const navigation = await page.locator('.primary-navigation').boundingBox();
      expect(footer!.y+footer!.height).toBeLessThanOrEqual(navigation!.y);
    }
    await testInfo.attach('p4-browser-verification',{body:JSON.stringify({width,acceptedClicks,expectedDay,errors,fontWarnings,apiRequests,baselineUnchanged:true},null,2),contentType:'application/json'});
    expect(errors).toEqual([]); expect(apiRequests).toEqual([]);
  });
}

test('storage failure disables simulator and shows insufficient data',async ({page}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window,'indexedDB',{value:{open:() => {throw new DOMException('Storage denied for verification','SecurityError');}}});
  });
  await page.goto('/today');
  await expect(page.getByRole('alert')).toContainText('Local storage unavailable');
  await expect(page.locator('.engine-status')).toContainText('Insufficient data');
  await expect(page.getByRole('button',{name:'Advance day',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeDisabled();
});
