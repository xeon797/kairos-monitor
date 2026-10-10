import { expect, test } from '@playwright/test';
import { mockAI } from './helpers/mockAI';
import { saved } from './helpers/checkJourney';

for (const width of [360, 1100]) test(`NASA research attribution, accessible details and actual offline summaries ${width}px`, async ({ page, context }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width, height: 900 });
  await mockAI(page);
  const errors: string[] = [], externalRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (/nature\.com|ntrs\.nasa\.gov|creativecommons\.org|\.pdf(?:\?|$)/.test(request.url())) externalRequests.push(request.url()); });
  await page.goto('/today');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const baseline = (await saved(page)).settings.baseline;
  expect(baseline).not.toBeNull();
  await page.getByRole('combobox', { name: 'Jump to day' }).selectOption('12');
  await expect(page.locator('.domain-preview li')).toContainText(['4 of 5', '3 of 5', '3 of 5']);
  await page.getByRole('navigation').getByRole('link', { name: 'Mission', exact: true }).click();
  await expect(page.getByRole('article', { name: 'EVA-07' }).locator('.concern-chip')).toContainText('Review recommended');
  await expect(page.getByRole('article', { name: 'INV-03' }).locator('.concern-chip')).toContainText('Change noted');
  const trigger = page.getByRole('button', { name: 'About', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'About Kairos Monitor' });
  await expect(dialog).toContainText('Synthetic demonstration data—not NASA participant measurements.');
  await expect(dialog).toContainText('Participant-level NASA data are not imported.');
  await expect(dialog).toContainText('not validated by these PDFs');
  await expect(dialog.locator('.research-source')).toHaveCount(2);
  const hera = dialog.locator('.research-source').nth(0), iss = dialog.locator('.research-source').nth(1);
  for (const [link, href] of [
    [hera.getByRole('link', { name: /Read the HERA article/ }), 'https://www.nature.com/articles/s41598-020-71929-4'],
    [iss.getByRole('link', { name: /Read the ISS source/ }), 'https://ntrs.nasa.gov/citations/20090029851'],
    [hera.getByRole('link', { name: /CC BY 4.0/ }), 'https://creativecommons.org/licenses/by/4.0/'],
  ] as const) {
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noreferrer');
  }
  const heraSummary = hera.locator('summary');
  await heraSummary.focus(); await page.keyboard.press('Enter');
  await expect(hera.locator('details')).toHaveAttribute('open', '');
  await expect(hera).toContainText('Jessica J. Marquez');
  const table = hera.getByRole('table', { name: 'HERA published-study facts' });
  for (const [label, value] of [
    ['Participants', '20'], ['Planned mission duration', '45 days'],
    ['Missions completed / stopped', 'Four complete missions; one stopped after 20 days'],
    ['Scheduled sleep opportunity', '5 hours on weekdays; 8 hours on weekends'], ['PVT duration', '5 minutes'],
  ]) await expect(table.getByRole('row', { name: new RegExp(label) }).getByRole('cell')).toContainText(value);
  await expect(hera).toContainText('not measured sleep');
  await expect(hera).toContainText('No objective sleep data were collected');
  await expect(hera).toContainText('paraphrased findings and selected published facts');
  await iss.locator('summary').focus(); await page.keyboard.press('Space');
  await expect(iss.locator('details')).toHaveAttribute('open', '');
  await expect(iss).toContainText('three-minute vigilance test after two minutes');
  await expect(iss).toContainText('not a report of completed ISS study outcomes');
  await expect(iss).toContainText('Public Use Permitted');
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `.local/nasa-research/about-expanded-${width}.png` });
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();

  // Mocked online AI and genuine offline summaries remain distinct evidence.
  await page.unroute('**/api/explain');
  await context.setOffline(true);
  const response = await page.reload(); expect(response?.fromServiceWorker()).toBe(true);
  await trigger.click();
  await heraSummary.focus(); await page.keyboard.press('Enter');
  await expect(table).toBeVisible();
  await iss.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(iss).toContainText('Adrian Ecker');
  await expect(dialog).toContainText('Kairos has no NASA-norm score');
  await expect(hera.getByRole('link', { name: /CC BY 4.0/ })).toBeVisible();
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  await close.focus(); await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link').last()).toBeFocused();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await heraSummary.focus(); await page.keyboard.press('Space');
  await expect(hera.locator('details')).not.toHaveAttribute('open', '');
  await page.keyboard.press('Tab'); await expect(hera.getByRole('link', { name: /CC BY 4.0/ })).toBeFocused();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await close.click(); await expect(trigger).toBeFocused();
  expect((await saved(page)).settings.baseline).toEqual(baseline);
  await expect(page.getByRole('article', { name: 'EVA-07' }).locator('.concern-chip')).toContainText('Review recommended');
  await expect(page.getByRole('article', { name: 'INV-03' }).locator('.concern-chip')).toContainText('Change noted');
  const cachedURLs = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(request => request.url)))).flat());
  expect(cachedURLs.some(url => /\.pdf(?:\?|$)|nature\.com|ntrs\.nasa\.gov/.test(url))).toBe(false);
  expect(externalRequests).toEqual([]); expect(errors).toEqual([]);
});
