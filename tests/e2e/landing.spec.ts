import { expect, test } from '@playwright/test';
import { mockAI } from './helpers/mockAI';

test.beforeEach(async({page})=>{await mockAI(page);});

for(const width of [360,1100])test(`P7 landing and preserved console routing at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{
    const tracking=window as Window&{missionOpenCount?:number};tracking.missionOpenCount=0;
    const open=indexedDB.open.bind(indexedDB);
    indexedDB.open=(name,version)=>{tracking.missionOpenCount=(tracking.missionOpenCount??0)+1;return version===undefined?open(name):open(name,version);};
  });
  const errors:string[]=[],api:string[]=[],heads:string[]=[],media:string[]=[],chunks:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{
    const path=new URL(request.url()).pathname;
    if(path.startsWith('/api/'))api.push(path);
    if(request.method()==='HEAD')heads.push(path);
    if(/\.(?:mp4|webm)$/.test(path))media.push(path);
    if(path.includes('MissionShell')||path.includes('Trends-'))chunks.push(path);
  });
  const response=await page.goto('/');expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle('Kairos Monitor');
  await expect(page.getByRole('heading',{name:'Readiness before the next task.',exact:true})).toBeVisible();
  await expect(page.getByText('Synthetic research prototype',{exact:true}).first()).toBeVisible();
  await expect(page.locator('.app-shell,.simulation-panel,.primary-navigation')).toHaveCount(0);
  await expect(page.locator('.orbit-poster')).toBeVisible();
  await expect(page.locator('video,source')).toHaveCount(0);
  expect(await page.evaluate(()=>(window as Window&{missionOpenCount?:number}).missionOpenCount)).toBe(0);
  expect(await page.evaluate(()=>indexedDB.databases())).toEqual([]);
  expect(api).toEqual([]);expect(heads).toEqual([]);expect(media).toEqual([]);expect(chunks).toEqual([]);
  await page.getByRole('link',{name:'How it works'}).click();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await expect(page.getByRole('heading',{name:'From observation to context.'})).toBeInViewport();
  await page.locator('.dashboard-preview').scrollIntoViewIfNeeded();
  await expect(page.locator('.dashboard-preview img')).toHaveJSProperty('naturalWidth',1100);
  await expect(page.locator('.preview-caption')).toContainText('Synthetic');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0);});
  await page.screenshot({path:`.local/p7-screenshots/landing-${width}.png`,fullPage:true});
  await page.getByRole('link',{name:'Launch demo'}).first().click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
  await expect(page.locator('.engine-status')).toContainText('Review recommended');
  await expect(page.locator('.explanation-box')).toContainText('AI-rephrased from the same evidence');
  await page.getByRole('link',{name:'Kairos Monitor home'}).click();
  await expect(page.locator('.app-shell')).toHaveCount(0);
  await page.reload();
  expect(await page.evaluate(()=>(window as Window&{missionOpenCount?:number}).missionOpenCount)).toBe(0);
  const previousCalls=api.length;
  await expect(page.getByRole('heading',{name:'Readiness before the next task.'})).toBeVisible();
  expect(api).toHaveLength(previousCalls);
  await page.getByRole('link',{name:'Launch demo'}).first().click();
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');
  for(const screen of ['today','check','trends','mission']){
    expect((await page.goto(`/${screen}`))?.status()).toBe(200);
    await page.reload();
    await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 12 / 17');
    await expect(page.getByRole('heading',{name:screen[0].toUpperCase()+screen.slice(1),exact:true})).toBeVisible();
  }
  await expect(page.getByRole('article',{name:'EVA-07'})).toContainText('Review recommended');
  await expect(page.getByRole('article',{name:'INV-03'})).toContainText('Change noted');
  const about=page.getByRole('button',{name:'About',exact:true});await about.click();
  await expect(page.getByRole('dialog',{name:'About Kairos Monitor'})).toBeVisible();
  await page.keyboard.press('Escape');await expect(about).toBeFocused();
  await page.goto('/');await page.emulateMedia({reducedMotion:'no-preference'});
  await expect(page.locator('.orbit-poster')).toBeVisible();await expect(page.locator('video')).toHaveCount(0);
  expect(errors).toEqual([]);expect(media).toEqual([]);
});

test('Landing remains usable if its decorative preview image cannot load',async({page})=>{
  await page.route('**/images/kairos-day12.jpg',route=>route.abort());
  await page.goto('/');
  await expect(page.locator('.orbit-poster')).toBeVisible();
  await expect(page.getByRole('link',{name:'Launch demo'}).first()).toBeVisible();
  await page.getByRole('link',{name:'Launch demo'}).first().click();
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');
});
