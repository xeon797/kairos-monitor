import { expect, test, type Page } from '@playwright/test';
import { startUpdateServer } from './helpers/updateServer.mjs';
import { mockAI } from './helpers/mockAI';
import { completeChecks, saved } from './helpers/checkJourney';

async function offlineReady(page: Page) {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.getByRole('complementary', { name: 'Offline availability' })).toContainText('Available offline');
}
async function cacheURLs(page: Page) {
  return page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      urls.push(...(await cache.keys()).map(request => request.url));
    }
    return urls;
  });
}
async function controlledChecks(page: Page) {
  const now = new Date();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date(now.getTime() + 1000));
  await completeChecks(page);
  await page.clock.resume();
}
for (const width of [360, 1100]) test(`P11 actual offline reload, routes, checks and persistence ${width}px`, async ({ page, context }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, 'getRandomValues', { value: (array: Uint32Array) => {
      original(array); if (array instanceof Uint32Array && array.length === 1) array[0] = 123; return array;
    } });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await mockAI(page); // Explicitly mocked online AI; never real provider evidence.
  await page.goto('/'); await offlineReady(page);
  const manifestURL = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = await (await context.request.get(manifestURL!)).json();
  expect(manifest).toMatchObject({ name: 'Kairos Monitor', theme_color: '#171D1C', background_color: '#171D1C', start_url: '/', display: 'standalone' });
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(['192x192', '512x512']);
  await page.getByRole('link', { name: 'Launch demo' }).first().click();
  await page.getByRole('combobox', { name: 'Jump to day' }).selectOption('12');
  await page.getByRole('navigation').getByRole('link', { name: 'Mission' }).click();
  const eva = page.getByRole('article', { name: 'EVA-07' });
  await expect(eva.locator('.template-tag')).toContainText('AI-rephrased from the same evidence');
  const cachedText = await eva.locator('.task-explanation').textContent();
  const before = await saved(page);
  await page.unrouteAll({ behavior: 'wait' });
  // Chromium blocks actual network traffic. Mocks are removed before blocking.
  await context.setOffline(true);
  const offlineResponse = await page.reload();
  expect(offlineResponse?.fromServiceWorker()).toBe(true);
  await expect(eva.locator('.task-explanation')).toHaveText(cachedText!);
  await expect(eva.locator('.template-tag')).toContainText('AI-rephrased from the same evidence');
  await eva.getByRole('button', { name: 'Show template version' }).click();
  await expect(eva.locator('.template-tag')).toContainText('Template explanation');
  // An uncached day uses deterministic templates with accurate provenance.
  await page.getByRole('button', { name: 'Advance day' }).click();
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 13 / 17');
  await expect(eva.locator('.template-tag')).toHaveText('Template explanation for EVA-07');
  await page.getByRole('button', { name: 'Log schedule change', exact: true }).click();
  await expect(page.locator('.response-entry')).toContainText('Day 13');
  for (const route of ['', 'today', 'mission', 'trends', 'check']) {
    const response = await page.goto('/' + route);
    expect(response?.fromServiceWorker()).toBe(true);
    const refresh = await page.reload(); expect(refresh?.fromServiceWorker()).toBe(true);
    if (!route) {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.locator('.dashboard-preview img').scrollIntoViewIfNeeded();
      await expect.poll(() => page.locator('.dashboard-preview img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1100);
    } else await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 13 / 17');
    if (route === 'trends') await expect(page.locator('.trend-card').first().locator('tbody tr')).toHaveCount(13);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('deterministic'); await page.keyboard.press('Escape');
  await controlledChecks(page);
  const after = await saved(page);
  expect(after.live).toHaveLength(2);
  expect(after.live.map(row => row.kind).sort()).toEqual(['go_no_go', 'reaction']);
  expect(after.live.every(row => row.source === 'live' && row.day === null && row.quality === 'good')).toBe(true);
  expect(after.settings.baseline).toEqual(before.settings.baseline);
  expect(after.settings.currentDay).toBe(13); expect(after.responses).toHaveLength(1);
  await page.reload();
  await expect(page.getByRole('article', { name: 'Reaction saved result', exact: true })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Attention saved result', exact: true })).toBeVisible();
  expect((await saved(page)).live).toEqual(after.live);
  await page.getByRole('navigation').getByRole('link', { name: 'Today' }).click();
  await page.getByRole('combobox', { name: 'Jump to day' }).selectOption('12');
  await expect(page.locator('.engine-status')).toContainText('Review recommended');
  await expect(page.locator('.domain-preview li')).toContainText(['4 of 5', '3 of 5', '3 of 5']);
  const urls = await cacheURLs(page);
  for (const weight of ['Regular', 'Medium', 'Bold']) expect(urls.some(url => url.includes(`fonts/Satoshi-${weight}.woff2`))).toBe(true);
  expect(urls.some(url => new URL(url).pathname.startsWith('/api/'))).toBe(false);
  await page.evaluate(async () => {
    await document.fonts.ready;
    if (![400, 500, 700].every(weight => document.fonts.check(`${weight} 16px Satoshi`))) throw new Error('Offline fonts unavailable');
    for (const method of ['GET', 'POST']) {
      try { await fetch('/api/explain', { method }); throw new Error('API unexpectedly available offline'); }
      catch (error) { if (!(error instanceof TypeError)) throw error; }
    }
  });
  await context.setOffline(false);
  // Prevent provider calls during return-online verification, while shell traffic is real.
  await mockAI(page); await page.reload(); await offlineReady(page);
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');
  const online = await saved(page);
  expect(online.live).toEqual(after.live); expect(online.settings.baseline).toEqual(before.settings.baseline);
  expect(errors).toEqual([]);
});

test('P11 waiting update preserves active checks and unsaved results until tabs close', async ({ page, context }) => {
  test.setTimeout(120000);
  const server = await startUpdateServer();
  const origin = server.origin;
  try {
    await page.addInitScript(() => {
      const original = crypto.getRandomValues.bind(crypto);
      Object.defineProperty(crypto, 'getRandomValues', { value: (array: Uint32Array) => {
        original(array); if (array instanceof Uint32Array && array.length === 1) array[0] = 123; return array;
      } });
    });
    await page.goto(origin + '/check'); await offlineReady(page);
    const secondTab = await context.newPage();
    await secondTab.goto(origin + '/today'); await offlineReady(secondTab);
    await page.getByRole('combobox', { name: 'Jump to day' }).selectOption('12'); const before = await saved(page);
    const now = new Date(); await page.clock.install({ time: now }); await page.clock.pauseAt(new Date(now.getTime() + 1000));
    await page.getByRole('button', { name: 'Open reaction check' }).click(); await page.getByRole('button', { name: 'Start reaction check' }).click();
    server.update();
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.waiting?.state)).toBe('installed');
    await expect(page.locator('.trial-progress')).toHaveText('Trial 1 of 25');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Offline availability' })).toContainText('Finish and save your checks');
    // Complete a new full run, then leave a real result unsaved across the waiting update.
    const { createReactionDelays, createSeededRandom } = await import('../../src/checks/scoring');
    const delays = createReactionDelays(createSeededRandom(123));
    await page.getByRole('button', { name: 'Open reaction check' }).click(); await page.getByRole('button', { name: 'Start reaction check' }).click();
    for (const delay of delays) {
      await page.clock.runFor(Math.ceil(delay) + 32);
      await expect(page.locator('.check-target')).toHaveAttribute('data-phase', 'stimulus');
      await page.clock.runFor(250); await page.keyboard.press('Space');
    }
    await expect(page.locator('.check-summary')).toContainText('Result is not saved until you choose Save result.');
    await page.clock.runFor(5000);
    expect((await saved(page)).live).toHaveLength(0);
    expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())!.waiting)).toBe(true);
    await page.getByRole('button', { name: 'Save result', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Saved on this device' })).toBeDisabled();
    const after = await saved(page); expect(after.live).toHaveLength(1); expect(after.settings.baseline).toEqual(before.settings.baseline);
    await page.clock.resume(); await page.close();
    expect(await secondTab.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())!.waiting)).toBe(true);
    expect((await saved(secondTab)).live).toEqual(after.live);
    await secondTab.close();
    const reopened = await context.newPage();
    await reopened.goto(origin + '/check'); await offlineReady(reopened);
    await expect.poll(() => reopened.evaluate(async () => !(await navigator.serviceWorker.getRegistration())!.waiting)).toBe(true);
    const restored = await saved(reopened); expect(restored.live).toEqual(after.live); expect(restored.settings).toEqual(after.settings);
  } finally { await server.close(); }
});
