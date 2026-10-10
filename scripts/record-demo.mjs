// Actual local screen capture, never a recording of mocked provider output or
// a user profile. Cognitive inputs are automated; protocol clocks remain real.
import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const baseURL = 'http://127.0.0.1:4173';
const directory = '.local/p11-recording';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch();
const evidence = { revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), origin: baseURL, createdAt: new Date().toISOString(), ai: 'Deterministic templates; no real or mocked Gemini calls', inputs: 'Automated pointer/keyboard; seeded inputs; real browser protocol clocks; not human/device accuracy', recordings: [] };
async function context() {
  const context = await browser.newContext({ baseURL, viewport: { width: 1100, height: 900 }, reducedMotion: 'reduce', recordVideo: { dir: directory, size: { width: 1100, height: 900 } } });
  await context.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto, 'getRandomValues', { value: array => { original(array); if (array instanceof Uint32Array && array.length === 1) array[0] = 123; return array; } });
  });
  return context;
}
async function ready(page) {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(() => document.fonts.ready);
}
async function day(page, day) {
  await page.getByRole('combobox', { name: 'Jump to day' }).selectOption(String(day));
  await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);
}
async function navigate(page, screen) {
  await page.getByRole('navigation').getByRole('link', { name: screen, exact: true }).click();
  await expect(page.getByRole('heading', { name: screen, exact: true })).toBeVisible();
}
async function data(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('kairos-monitor'); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result, tx = database.transaction(['settings', 'checks', 'responses'], 'readonly');
      const setting = tx.objectStore('settings').get('app'), checks = tx.objectStore('checks').getAll(), responses = tx.objectStore('responses').getAll();
      tx.oncomplete = () => { database.close(); resolve({ settings: setting.result, live: checks.result.filter(row => row.source === 'live'), responses: responses.result }); };
      tx.onerror = () => { database.close(); reject(tx.error); };
    };
  }));
}
async function finish(context, page, name, details) {
  const video = page.video();
  await context.close();
  const original = await video.path(), path = `${directory}/${name}.webm`;
  await rename(original, path);
  const bytes = await readFile(path);
  if (bytes.length < 1000) throw new Error('Capture is empty');
  evidence.recordings.push({ path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...details });
  await writeFile(`${directory}/evidence.json`, JSON.stringify(evidence, null, 2));
}
try {
  const pitchContext = await context(), page = await pitchContext.newPage();
  const api = []; page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) api.push(request.url()); });
  await page.goto('/today'); await ready(page); await expect(page.locator('.engine-status')).toContainText('Within your usual range');
  const initial = await data(page); expect(initial.responses).toHaveLength(0); expect(initial.live).toHaveLength(0);
  const start = performance.now();
  const until = async seconds => { const remaining = seconds * 1000 - (performance.now() - start); if (remaining > 0) await page.waitForTimeout(remaining); };
  await until(10); await day(page, 11); await expect(page.locator('.engine-status')).toContainText('Change noted');
  await until(17); await page.getByRole('button', { name: 'Advance day' }).click(); await expect(page.locator('.engine-status')).toContainText('Review recommended');
  await expect(page.locator('.domain-preview li')).toContainText(['4 of 5', '3 of 5', '3 of 5']);
  await until(25); await navigate(page, 'Mission');
  const eva = page.getByRole('article', { name: 'EVA-07' }), inventory = page.getByRole('article', { name: 'INV-03' });
  await expect(eva.locator('.concern-chip')).toContainText('Review recommended'); await expect(inventory.locator('.concern-chip')).toContainText('Change noted');
  await expect(eva.locator('.task-schedule')).toContainText('In 2 days'); await eva.scrollIntoViewIfNeeded();
  await until(45); await eva.locator('.task-explanation').scrollIntoViewIfNeeded();
  await expect(eva.locator('.template-tag')).toContainText('Template explanation');
  expect(await eva.locator('.task-explanation').textContent()).not.toEqual(await inventory.locator('.task-explanation').textContent());
  await until(55); await day(page, 13); await page.getByRole('button', { name: 'Log schedule change', exact: true }).click();
  await expect(page.locator('.response-entry')).toContainText('Day 13'); await page.locator('.response-entry').scrollIntoViewIfNeeded();
  await until(65); await day(page, 15); await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');
  await page.locator('.recovery-chip').scrollIntoViewIfNeeded();
  await until(72); await day(page, 16); await navigate(page, 'Today'); await expect(page.locator('.engine-status')).toContainText('Within your usual range');
  await until(76); await page.locator('.recovery-chip').scrollIntoViewIfNeeded();
  await expect(page.getByText('This comparison does not show that the adjustment caused the change.', { exact: true })).toBeVisible();
  await until(80); await navigate(page, 'Check'); await expect(page.getByRole('button', { name: 'Open reaction check' })).toBeVisible();
  await until(90); expect(api).toHaveLength(0);
  await finish(pitchContext, page, 'pitch', { walkthroughSeconds: (performance.now() - start) / 1000, baseline: initial.settings.baseline, finalState: await data(page) });

  const checkContext = await context(), check = await checkContext.newPage();
  await check.goto('/today'); await ready(check); await day(check, 12); const before = await data(check);
  await navigate(check, 'Check'); await checkContext.setOffline(true);
  const reload = await check.reload(); expect(reload.fromServiceWorker()).toBe(true);
  await expect(check.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');
  const durations = {};
  for (const kind of ['reaction', 'attention']) {
    await check.getByRole('button', { name: `Open ${kind} check` }).click();
    const start = performance.now(); await check.getByRole('button', { name: `Start ${kind} check` }).click();
    for (let index = 0; index < (kind === 'reaction' ? 25 : 40); index++) {
      const progress = `${kind === 'reaction' ? 'Trial' : 'Stimulus'} ${index + 1} of ${kind === 'reaction' ? 25 : 40}`;
      await check.waitForFunction(progress => document.querySelector('.trial-progress')?.textContent === progress && document.querySelector('.check-target')?.getAttribute('data-phase') === 'stimulus', progress, { polling: 'raf', timeout: 8000 });
      const target = check.locator('.check-target');
      if (kind === 'reaction' || await target.getAttribute('data-stimulus') === 'go') {
        await check.waitForTimeout(180);
        const bounds = await target.boundingBox(); if (!bounds) throw new Error('No target');
        await check.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      }
      if (kind === 'attention') await check.waitForFunction(() => document.querySelector('.check-target')?.getAttribute('data-phase') === 'gap', undefined, { polling: 'raf', timeout: 2000 });
    }
    await expect(check.locator('.check-summary')).toContainText('Good quality'); durations[kind] = (performance.now() - start) / 1000;
    await check.waitForTimeout(1500); await check.getByRole('button', { name: 'Save result', exact: true }).click();
    await expect(check.getByRole('button', { name: 'Saved on this device' })).toBeDisabled();
    await check.waitForTimeout(1500); await check.getByRole('button', { name: 'Return to Check' }).click();
  }
  await check.reload(); await expect(check.getByRole('article', { name: 'Reaction saved result', exact: true })).toHaveCount(1); await expect(check.getByRole('article', { name: 'Attention saved result', exact: true })).toHaveCount(1);
  const after = await data(check); expect(after.live).toHaveLength(2); expect(after.settings.baseline).toEqual(before.settings.baseline);
  expect(after.live.every(row => row.source === 'live' && row.day === null && row.quality === 'good')).toBe(true);
  await check.locator('.check-history').scrollIntoViewIfNeeded(); await check.waitForTimeout(2500);
  await navigate(check, 'Today'); await expect(check.locator('.domain-preview li')).toContainText(['4 of 5', '3 of 5', '3 of 5']); await expect(check.locator('.engine-status')).toContainText('Review recommended'); await check.waitForTimeout(2500);
  await navigate(check, 'Mission'); await expect(check.getByRole('article', { name: 'EVA-07' }).locator('.concern-chip')).toContainText('Review recommended'); await expect(check.getByRole('article', { name: 'INV-03' }).locator('.concern-chip')).toContainText('Change noted'); await check.getByRole('article', { name: 'EVA-07' }).scrollIntoViewIfNeeded(); await check.waitForTimeout(2500);
  await navigate(check, 'Trends'); await expect(check.locator('.trend-card')).toHaveCount(3); await check.waitForTimeout(2500);
  await check.getByRole('button', { name: 'About', exact: true }).click(); await expect(check.getByRole('dialog')).toContainText('deterministic'); await check.waitForTimeout(2500); await check.keyboard.press('Escape');
  await checkContext.setOffline(false); await check.reload(); expect((await data(check)).live).toEqual(after.live);
  await finish(checkContext, check, 'offline-full-checks', { networkBlocked: true, offlineDocumentFromServiceWorker: true, protocols: durations, baselineUnchanged: true, syntheticCountsUnchanged: [4, 3, 3], savedLive: after.live });
  console.log(JSON.stringify({ evidence: `${directory}/evidence.json`, recordings: evidence.recordings.map(({ path, bytes }) => ({ path, bytes })) }, null, 2));
} finally { await browser.close(); }
