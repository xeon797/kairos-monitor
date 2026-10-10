import { expect, test } from '@playwright/test';
import { FOOTER_DISCLAIMER } from '../../src/content';
import { mockAI } from './helpers/mockAI';

for (const width of [360, 1100]) test(`P11 polish, contrast, focus, reduced motion and font fallback ${width}px`, async ({ page, browser }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mockAI(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.landing-footer')).toContainText(FOOTER_DISCLAIMER);
  await expect(page.locator('video,source')).toHaveCount(0);
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  await page.getByRole('link', { name: 'Launch demo' }).first().click();
  await page.getByRole('combobox', { name: 'Jump to day' }).selectOption('12');
  for (const screen of ['Today', 'Mission', 'Trends', 'Check']) {
    await page.getByRole('navigation').getByRole('link', { name: screen, exact: true }).click();
    await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');
    await expect(page.getByRole('heading', { name: screen, exact: true })).toBeVisible();
    await expect(page.locator('.app-footer')).toContainText(FOOTER_DISCLAIMER);
    await expect(page.locator('.app-footer .offline-status')).toHaveCount(1);
    if (screen !== 'Check') await expect(page.locator('.page-content .synthetic-badge').first()).toBeVisible();
    if (screen === 'Trends') {
      for (const [index, unit] of ['h', 'ms', 'count'].entries()) {
        const card = page.locator('.trend-card').nth(index);
        await expect(card.locator('.recharts-label').filter({ hasText: unit }).first()).toBeVisible();
        await expect(card.locator('.recharts-label').filter({ hasText: 'Mission day' })).toBeVisible();
      }
    }
    const ratios = await page.locator('.engine-status,.concern-chip,.template-tag,.eyebrow,.simulator-note,.offline-status').evaluateAll(elements => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!;
      const rgba = (color: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return Array.from(ctx.getImageData(0, 0, 1, 1).data); };
      const luminance = (channels: number[]) => channels.slice(0, 3).map(channel => { const s = channel / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      return elements.filter(element => element.getClientRects().length && element.textContent?.trim()).map(element => {
        const parents: Element[] = []; for (let node: Element | null = element; node; node = node.parentElement) parents.unshift(node);
        let background = [0, 0, 0];
        for (const parent of parents) {
          const color = rgba(getComputedStyle(parent).backgroundColor), alpha = color[3] / 255;
          background = background.map((channel, index) => color[index] * alpha + channel * (1 - alpha));
        }
        const fg = luminance(rgba(getComputedStyle(element).color)), bg = luminance(background);
        return { text: element.textContent, ratio: (Math.max(fg, bg) + .05) / (Math.min(fg, bg) + .05) };
      });
    });
    for (const sample of ratios) expect(sample.ratio, sample.text!).toBeGreaterThanOrEqual(4.5);
    expect(await page.locator('.screen-heading').evaluate(element => getComputedStyle(element).animationName)).toBe('none');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.content-region').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.evaluate(() => document.querySelector('.content-region')!.scrollTop = 0);
    await page.screenshot({ path: `.local/p11-polish/${screen.toLowerCase()}-${width}.png` });
  }
  const button = page.getByRole('button', { name: 'Open reaction check' });
  await button.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  await expect(button).toBeFocused();
  expect(await button.evaluate(element => getComputedStyle(element).outlineStyle)).toBe('solid');
  expect(await button.evaluate(element => getComputedStyle(element).outlineWidth)).toBe('2px');
  await page.keyboard.press('Enter'); await expect(page.getByRole('button', { name: 'Start reaction check' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('.check-target')).toBeFocused();
  expect((await page.locator('.check-target').boundingBox())!.width).toBeGreaterThanOrEqual(200);
  await page.keyboard.press('Space'); await expect(page.locator('.trial-progress')).toHaveText('Trial 2 of 25');
  await page.keyboard.press('Escape'); await expect(button).toBeFocused();
  const about = page.getByRole('button', { name: 'About', exact: true }); await about.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape'); await expect(about).toBeFocused();
  expect(errors).toEqual([]);
  // Separate isolated context: deliberately unavailable fonts and no SW, to
  // inspect the real system fallback without a precache masking the failure.
  const fallbackContext = await browser.newContext({ baseURL: new URL(page.url()).origin, viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  try {
    const fallback = await fallbackContext.newPage();
    await mockAI(fallback);
    await fallback.route('**/fonts/*.woff2', route => route.abort());
    await fallback.goto('/today');
    await expect(fallback.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
    await fallback.evaluate(() => document.fonts.ready);
    expect(await fallback.evaluate(() => document.fonts.check('400 16px Satoshi'))).toBe(false);
    await expect(fallback.locator('.engine-status')).toContainText('Within your usual range');
    expect(await fallback.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await fallback.screenshot({ path: `.local/p11-polish/font-fallback-${width}.png` });
  } finally { await fallbackContext.close(); }
});
