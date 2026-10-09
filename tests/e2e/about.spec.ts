import { expect, test } from '@playwright/test';
import { mockAI } from './helpers/mockAI';

test.beforeEach(async({page})=>{await mockAI(page);});

for(const width of [360,1100])test(`About modal and provenance at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto('/today');
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
  const trigger=page.getByRole('button',{name:'About',exact:true});
  await trigger.click();
  const dialog=page.getByRole('dialog',{name:'About Kairos Monitor'});
  await expect(dialog).toBeVisible();
  const close=dialog.getByRole('button',{name:'Close',exact:true});
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('link').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.getByRole('combobox',{name:'Jump to day'}).evaluate((element:HTMLSelectElement)=>element.focus());
  expect(await page.evaluate(()=>document.activeElement?.closest('dialog')!==null)).toBe(true);
  await expect(dialog.getByRole('link')).toHaveCount(2);
  await expect(dialog).toContainText('Live browser-check results');
  if(width===360){
    expect(await dialog.evaluate(element=>element.scrollHeight>element.clientHeight)).toBe(true);
    await dialog.locator('.about-credit').scrollIntoViewIfNeeded();
    await expect(dialog.locator('.about-credit')).toBeVisible();
  }
  await dialog.evaluate(element=>{element.scrollTop=0;});
  await page.screenshot({path:`.local/p7-screenshots/about-${width}.png`});
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();await close.click();await expect(trigger).toBeFocused();
  const tag=page.locator('.provenance-tag').first();
  await tag.locator('summary').focus();await page.keyboard.press('Enter');
  await expect(tag.locator('.provenance-details')).toBeVisible();
  await expect(tag).toContainText('Illustrative mission telemetry');
  await tag.locator('summary').click();await expect(tag).not.toHaveAttribute('open','');
});
