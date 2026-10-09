import { test, expect } from '@playwright/test';
import { FOOTER_DISCLAIMER } from '../../src/content';

const screens = ['Today', 'Check', 'Trends', 'Mission'];

for (const width of [360, 1100]) {
  test(`foundation routes and navigation at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 820 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const pageErrors: string[] = [];
    const failedResources: string[] = [];
    const apiRequests: string[] = [];
    const consoleMessages: string[] = [];
    const unexpectedConsoleMessages: string[] = [];
    const fontResponses: { url: string; status: number; contentType: string }[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) {
        consoleMessages.push(message.text());
        const isMissingFont = message.location().url.includes('/fonts/') || /font|OTS parsing error/i.test(message.text());
        if (!isMissingFont) unexpectedConsoleMessages.push(message.text());
      }
    });
    page.on('response', (response) => {
      if (response.url().includes('/fonts/')) {
        fontResponses.push({ url: response.url(), status: response.status(), contentType: response.headers()['content-type'] ?? '' });
      } else if (response.status() >= 400) {
        failedResources.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/today$/);
    await expect(page).toHaveTitle('Kairos Monitor');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();

    for (const screen of screens) {
      const route = `/${screen.toLowerCase()}`;
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { name: screen, exact: true })).toBeVisible();
      // Reload with cache disabled to exercise a direct document request.
      const session = await page.context().newCDPSession(page);
      await session.send('Network.setCacheDisabled', { cacheDisabled: true });
      await page.reload();
      await session.detach();
      await expect(page.getByRole('heading', { name: screen, exact: true })).toBeVisible();
      const navigation = page.getByRole('navigation', { name: 'Main navigation' });
      await expect(navigation.getByRole('link', { name: screen, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('button', { name: 'About unavailable until P7' })).toBeDisabled();
      expect(await page.locator('.topbar').evaluate((element) => element.getBoundingClientRect().height)).toBe(width < 900 ? 64 : 80);
      expect(await page.locator('html').evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(width);
      const mainWidth = await page.locator('main').evaluate((element) => element.getBoundingClientRect().width);
      expect(mainWidth).toBeLessThanOrEqual(1100);
      const position = await navigation.evaluate((element) => getComputedStyle(element).position);
      expect(position).toBe('static');
      const region = await page.locator('.content-region').boundingBox();
      const navigationBox = await navigation.boundingBox();
      if (width < 900 && region && navigationBox) {
        expect(region.y + region.height).toBeLessThanOrEqual(navigationBox.y);
        expect(navigationBox.y + navigationBox.height).toBe(820);
      }

      await page.locator('footer').scrollIntoViewIfNeeded();
      await expect(page.locator('footer')).toHaveText(FOOTER_DISCLAIMER);
      const footer = await page.locator('footer').boundingBox();
      const nav = await navigation.boundingBox();
      expect(footer).not.toBeNull();
      expect(nav).not.toBeNull();
      if (width < 900 && footer && nav) expect(footer.y + footer.height).toBeLessThanOrEqual(nav.y);
      await page.screenshot({ path: testInfo.outputPath(`${screen.toLowerCase()}-${width}-footer.png`) });
      await page.locator('.content-region').evaluate((element) => element.scrollTo(0, 0));
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: testInfo.outputPath(`${screen.toLowerCase()}-${width}.png`), fullPage: true });

      const next = screens[(screens.indexOf(screen) + 1) % screens.length];
      const nextLink = navigation.getByRole('link', { name: next, exact: true });
      expect(await nextLink.evaluate((element) => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      await nextLink.focus();
      expect(await nextLink.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe('solid');
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name: next, exact: true })).toBeVisible();
      await expect(nextLink).toHaveAttribute('aria-current', 'page');
    }
    await page.evaluate(() => document.fonts.ready);
    const fontStatus = await page.evaluate(() => ({
      family: getComputedStyle(document.body).fontFamily,
      faces: Array.from(document.fonts).map((face) => ({ family: face.family, weight: face.weight, status: face.status })),
    }));
    const fontSession = await page.context().newCDPSession(page);
    await fontSession.send('DOM.enable');
    await fontSession.send('CSS.enable');
    const { root } = await fontSession.send('DOM.getDocument');
    const { nodeId } = await fontSession.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.screen-subtitle' });
    const renderedFonts = await fontSession.send('CSS.getPlatformFontsForNode', { nodeId });
    await fontSession.detach();
    expect(renderedFonts.fonts.length).toBeGreaterThan(0);
    await testInfo.attach('browser-inspection', { body: JSON.stringify({ pageErrors, failedResources, apiRequests, consoleMessages, fontResponses, fontStatus, renderedFonts }, null, 2), contentType: 'application/json' });
    expect(pageErrors).toEqual([]);
    expect(failedResources).toEqual([]);
    expect(apiRequests).toEqual([]);
    expect(unexpectedConsoleMessages).toEqual([]);
  });
}
