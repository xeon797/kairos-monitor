import { test, expect, type Page } from '@playwright/test';
import { CONCERN_LABELS, explain, STATUS_LABELS } from '../../src/engine/templates';
import type { EvidencePacket } from '../../src/engine/types';
import { validateExplanation } from '../../src/engine/validateExplanation';
async function capability(page:Page) {
  await page.route('**/',async route => {
    if(route.request().method()==='HEAD')await route.fulfill({status:200,headers:{'X-Kairos-Explanations':'v1'}});else await route.continue();
  });
}
function aiText(packet:EvidencePacket):string {return `${packet.taskConcern ? CONCERN_LABELS[packet.taskConcern] : STATUS_LABELS[packet.status]}. ${explain(packet)}`;}
for(const width of [360,1100]) {
  test(`validated AI, template toggle, cache and unchanged evidence at ${width}px`,async ({page}) => {
    await page.setViewportSize({width,height:900});await capability(page);
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/explain',async route => {const packet=route.request().postDataJSON() as EvidencePacket;const text=aiText(packet);expect(validateExplanation(text,packet).ok).toBe(true);await route.fulfill({json:{text,model:'gemini-browser-mock'}});});
    await page.goto('/today');await expect(page.locator('.engine-status')).toContainText('Within your usual range');
    await expect(page.locator('.explanation-box')).toContainText('Template explanation');
    await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
    await expect(page.locator('.engine-status')).toContainText('Review recommended');
    const overall=page.locator('.explanation-box');await expect(overall).toContainText('AI-rephrased from the same evidence');
    await expect(page.getByRole('article',{name:'Sleep evidence'})).toContainText('Criterion met on 4 of the last 5 days');
    await overall.getByRole('button',{name:'Show template version'}).click();await expect(overall.locator('.template-tag')).toHaveText('Template explanation');await expect(overall.getByRole('button')).toHaveAttribute('aria-pressed','true');
    await overall.getByRole('button').press('Space');await expect(overall.locator('.template-tag')).toHaveText('AI-rephrased from the same evidence');
    await page.getByRole('link',{name:'Mission',exact:true}).click();const eva=page.getByRole('article',{name:'EVA-07'});const inv=page.getByRole('article',{name:'INV-03'});
    await expect(eva).toContainText('AI-rephrased from the same evidence');await expect(inv).toContainText('AI-rephrased from the same evidence');
    await expect(eva.locator('.concern-chip')).toContainText('Review recommended');await expect(inv.locator('.concern-chip')).toContainText('Change noted');
    await expect(inv.locator('.task-explanation')).toContainText('routine monitoring');await expect(inv.locator('.task-explanation')).not.toContainText('repeat the check');
    await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');await expect(eva).toContainText('AI-rephrased from the same evidence');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);expect(errors).toEqual([]);
  });
}
test('stale completion and rapid day changes do not replace current text',async ({page}) => {
  await capability(page);let calls=0;let release:() => void=()=>{};
  const hold=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/explain',async route=>{calls++;const packet=route.request().postDataJSON() as EvidencePacket;if(packet.day===12)await hold;await route.fulfill({json:{text:aiText(packet),model:'gemini-browser-mock'}});});
  await page.goto('/today');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
  await expect.poll(()=>calls).toBeGreaterThan(0);await page.getByRole('combobox',{name:'Jump to day'}).selectOption('16');release();
  await expect(page.locator('.engine-status')).toContainText('Within your usual range');await expect(page.locator('.explanation-box')).not.toContainText('Review recommended');
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('11');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('17');
  await expect(page.locator('.explanation-box')).toContainText('No sustained change');await expect(page.locator('.engine-status')).toContainText('Within your usual range');
});
test('malformed output/network failure stays on template and cache works offline',async ({page,context}) => {
  await capability(page);let valid=false;
  await page.route('**/api/explain',async route=>{if(!valid){await route.fulfill({json:{text:'You are safe.',model:'gemini-browser-mock'}});return;}const packet=route.request().postDataJSON() as EvidencePacket;await route.fulfill({json:{text:aiText(packet),model:'gemini-browser-mock'}});});
  await page.goto('/today');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');await page.waitForTimeout(1500);await expect(page.locator('.explanation-box .template-tag')).toHaveText('Template explanation');
  valid=true;await page.reload();await expect(page.locator('.explanation-box')).toContainText('AI-rephrased from the same evidence');
  await context.setOffline(true);await page.getByRole('link',{name:'Mission',exact:true}).click();await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('AI-rephrased from the same evidence');
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('11');await expect(page.getByRole('article',{name:'EVA-07'}).locator('.template-tag')).toContainText('Template explanation');
  await context.setOffline(false);await page.unroute('**/api/explain');await page.route('**/api/explain',route=>route.abort('failed'));await page.getByRole('combobox',{name:'Jump to day'}).selectOption('13');await page.waitForTimeout(1400);await expect(page.getByRole('article',{name:'EVA-07'}).locator('.template-tag')).toContainText('Template explanation');
});
