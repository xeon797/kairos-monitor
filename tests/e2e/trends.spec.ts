import { expect, test } from '@playwright/test';

for(const width of [360,1100]) test(`Trends frozen evidence at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto('/trends');
  await expect(page.locator('.trend-card')).toHaveCount(3);
  for(const [day,counts,states] of [[7,[0,0,0],[false,false,false]],[12,[4,3,3],[true,true,true]],[15,[2,3,3],[false,true,true]],[16,[1,2,2],[false,false,false]]] as const){
    await page.getByRole('combobox',{name:'Jump to day'}).selectOption(String(day));
    await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);
    for(let i=0;i<3;i++){
      const card=page.locator('.trend-card').nth(i);
      await expect(card.locator('.trend-summary')).toContainText(`${counts[i]} of the last 5 days`);
      await expect(card.locator('.evidence-state')).toContainText(states[i]?'Sustained':'Not sustained');
      await expect(card.locator('.trend-summary')).toContainText('5 valid days · Evaluable');
      await expect(card.locator('tbody tr')).toHaveCount(day);
      await expect(card.locator(`tbody tr[data-day="${day+1}"]`)).toHaveCount(0);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
  const sleep=page.locator('.trend-card').first();
  expect(Number(await sleep.locator('[data-baseline]').getAttribute('data-baseline'))).toBeCloseTo(50.5/7,12);
  expect(Number(await sleep.locator('[data-criterion]').getAttribute('data-criterion'))).toBeCloseTo(50.5/7-1,12);
  await expect(sleep.locator('.criterion-marker')).toHaveCount(4);
  await sleep.locator('summary').click();
  await expect(sleep.locator('tr[data-day="12"]')).toContainText('5.4 h');
  await expect(sleep.locator('tr[data-day="12"]')).toContainText('Synthetic · good quality');
  await expect(page.getByText('Supporting context only. Not available in this prototype.',{exact:true})).toHaveCount(1);
  await sleep.locator('summary').click();
  await page.locator('#main-content').scrollIntoViewIfNeeded();
  await page.screenshot({path:`.local/p7-screenshots/trends-day12-${width}.png`,fullPage:true});
  expect(errors).toEqual([]);
});
