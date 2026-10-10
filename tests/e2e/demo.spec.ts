import { expect, test, type Page } from '@playwright/test';
import { createGoNoGoStimuli, createReactionDelays, createSeededRandom } from '../../src/checks/scoring';
import type { AppSettings, LiveCheck, PersistedResponse } from '../../src/db/db';
import type { EvidencePacket } from '../../src/engine/types';
import { validateExplanation } from '../../src/engine/validateExplanation';

// Fixed independent responses: no production template generates the AI oracle.
const fixedText:Record<string,string>={
  'EVA-07':'EVA-07: Review recommended. Sleep met a change criterion on 4 of the last 5 days; reaction and attention on 3 of the last 5 days. Review recent sleep and repeat the check before EVA-07.',
  'INV-03':'INV-03: Change noted. Sleep and attention show sustained changes from baseline. Inventory is a lower-demand task, noted for routine monitoring. No task-specific review is prompted.',
};
async function fixedAI(page:Page,failed=false) {
  const sent:EvidencePacket[]=[];
  await page.route('**/',async route=>{
    if(route.request().method()==='HEAD')await route.fulfill({status:200,headers:{'X-Kairos-Explanations':'v1'}});
    else await route.continue();
  });
  await page.route('**/api/explain',async route=>{
    const packet=route.request().postDataJSON() as EvidencePacket;sent.push(packet);
    const text=packet.day===12?fixedText[packet.taskId??'']:undefined;
    if(failed||!text){await route.abort('failed');return;}
    expect(validateExplanation(text,packet).ok).toBe(true);
    await route.fulfill({json:{text,model:'gemini-p10-fixed-mock'}});
  });
  return sent;
}
async function saved(page:Page) {
  return page.evaluate(()=>new Promise<{settings:AppSettings;live:LiveCheck[];responses:PersistedResponse[];cacheKeys:string[]}>((resolve,reject)=>{
    const open=indexedDB.open('kairos-monitor');open.onerror=()=>reject(open.error);
    open.onsuccess=()=>{
      const database=open.result,tx=database.transaction(['settings','checks','responses','explanations'],'readonly');
      const settings=tx.objectStore('settings').get('app'),checks=tx.objectStore('checks').getAll();
      const responses=tx.objectStore('responses').getAll(),cache=tx.objectStore('explanations').getAllKeys();
      tx.oncomplete=()=>{database.close();resolve({settings:settings.result,live:checks.result.filter((row:LiveCheck)=>row.source==='live'),responses:responses.result,cacheKeys:cache.result.map(String)});};
      tx.onerror=()=>{database.close();reject(tx.error);};
    };
  }));
}
async function frameUntil(page:Page,phase:string) {
  for(let frame=0;frame<6;frame++) {
    if(await page.locator('.check-target').getAttribute('data-phase')===phase)return;
    await page.clock.runFor(16);
  }
  await expect(page.locator('.check-target')).toHaveAttribute('data-phase',phase);
}
async function completeChecks(page:Page) {
  const delays=createReactionDelays(createSeededRandom(123));
  await page.getByRole('button',{name:'Open reaction check'}).click();await page.getByRole('button',{name:'Start reaction check'}).click();
  for(let index=0;index<25;index++) {
    await page.clock.runFor(Math.ceil(delays[index])+32);await frameUntil(page,'stimulus');
    await expect(page.locator('.trial-progress')).toHaveText(`Trial ${index+1} of 25`);
    await page.clock.runFor(250);
    if(index%2===0)await page.keyboard.press('Space');else await page.locator('.check-target').click();
  }
  await expect(page.locator('.check-summary')).toBeFocused();await expect(page.locator('.check-summary')).toContainText('Good quality');
  await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();
  await page.getByRole('button',{name:'Return to Check'}).click();await expect(page.getByRole('button',{name:'Open reaction check'})).toBeFocused();
  const stimuli=createGoNoGoStimuli(createSeededRandom(123));
  await page.getByRole('button',{name:'Open attention check'}).click();await page.getByRole('button',{name:'Start attention check'}).click();
  for(let index=0;index<40;index++) {
    await frameUntil(page,'stimulus');await expect(page.locator('.trial-progress')).toHaveText(`Stimulus ${index+1} of 40`);
    await expect(page.locator('.check-target')).toHaveAttribute('data-stimulus',stimuli[index]);
    await page.clock.runFor(250);
    if(stimuli[index]==='go') {
      if(index%2===0)await page.keyboard.press('Space');else await page.locator('.check-target').click();
    }
    await page.clock.runFor(520);await frameUntil(page,'gap');await page.clock.runFor(375);
    // The final gap leads to complete, rather than a further stimulus.
    for(let frame=0;frame<6;frame++) {
      if(await page.locator('.check-target').getAttribute('data-phase')!=='gap')break;
      await page.clock.runFor(16);
    }
  }
  await expect(page.locator('.check-summary')).toBeFocused();await expect(page.locator('.check-summary')).toContainText('Good quality');
  await page.getByRole('button',{name:'Save result',exact:true}).click();await expect(page.getByRole('button',{name:'Saved on this device'})).toBeDisabled();
  await page.getByRole('button',{name:'Return to Check'}).click();await expect(page.getByRole('button',{name:'Open attention check'})).toBeFocused();
}

for(const width of [360,1100])test(`P10 fixed-AI full journey and both saved checks ${width}px`,async({page})=>{
  test.setTimeout(90000);await page.setViewportSize({width,height:900});
  await page.addInitScript(()=>{
    const original=crypto.getRandomValues.bind(crypto);
    Object.defineProperty(crypto,'getRandomValues',{value:(array:Uint32Array)=>{original(array);if(array instanceof Uint32Array&&array.length===1)array[0]=123;return array;}});
  });
  const requests=await fixedAI(page),errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error'&&!new URL(message.location().url||page.url()).pathname.startsWith('/api/'))errors.push(message.text());
  });
  await page.goto('/');await page.getByRole('link',{name:'Launch demo'}).first().click();
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');const initial=await saved(page);
  await expect(page.getByRole('button',{name:'Back one day'})).toBeDisabled();
  for(const day of [8,9,10,11,12]) {
    await page.getByRole('button',{name:'Advance day'}).click();await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);
    await expect(page.locator('.engine-status')).toContainText(day===12?'Review recommended':day===11?'Change noted':'Within your usual range');
  }
  await expect(page.locator('.domain-preview li')).toContainText(['4 of 5','3 of 5','3 of 5']);
  await page.getByRole('navigation').getByRole('link',{name:'Mission'}).click();
  for(const [id,label] of [['EVA-07','Review recommended'],['INV-03','Change noted']]) {
    const card=page.getByRole('article',{name:id});await expect(card.locator('.concern-chip')).toContainText(label);
    await expect(card.locator('.task-explanation')).toHaveText(fixedText[id]);await expect(card.locator('.template-tag')).toContainText('AI-rephrased from the same evidence');
    await card.getByRole('button',{name:'Show template version'}).press('Space');await expect(card.locator('.template-tag')).toContainText('Template explanation');
    await card.getByRole('button',{name:'Show template version'}).press('Space');await expect(card.locator('.task-explanation')).toHaveText(fixedText[id]);
  }
  await page.getByRole('button',{name:'Advance day'}).click();await page.getByRole('button',{name:'Log schedule change',exact:true}).click();
  await expect(page.locator('.response-entry')).toContainText('Day 13');await expect(page.locator('.recovery-chip')).toHaveCount(0);
  for(const day of [14,15,16]) {
    await page.getByRole('button',{name:'Advance day'}).click();await expect(page.locator('.mission-day:visible')).toHaveText(`Mission day ${day} / 17`);
    if(day===14)await expect(page.locator('.recovery-chip')).toHaveCount(0);else await expect(page.locator('.recovery-chip')).toHaveText('Measures moving toward baseline');
  }
  await expect(page.getByText('This comparison does not show that the adjustment caused the change.',{exact:true})).toBeVisible();
  await page.getByRole('navigation').getByRole('link',{name:'Today'}).click();await expect(page.locator('.engine-status')).toContainText('Within your usual range');
  await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');expect((await saved(page)).responses).toHaveLength(1);
  await page.getByRole('link',{name:'Kairos Monitor home'}).click();await page.reload();await page.getByRole('link',{name:'Launch demo'}).first().click();
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');
  await page.getByRole('navigation').getByRole('link',{name:'Trends'}).click();await expect(page.locator('.trend-card').first().locator('tbody tr')).toHaveCount(16);
  const about=page.getByRole('button',{name:'About',exact:true});await about.press('Enter');await expect(page.getByRole('dialog')).toContainText('deterministic');
  await page.keyboard.press('Escape');await expect(about).toBeFocused();
  await page.getByRole('navigation').getByRole('link',{name:'Check'}).click();
  // Control cognitive trial timing only; let asynchronous AI/storage work settle normally.
  const checkTime=new Date();await page.clock.install({time:checkTime});await page.clock.pauseAt(new Date(checkTime.getTime()+1000));
  await completeChecks(page);await page.clock.resume();
  await page.reload();await expect(page.getByRole('article',{name:'Reaction saved result',exact:true})).toContainText('Live browser test');
  await expect(page.getByRole('article',{name:'Attention saved result',exact:true})).toContainText('Live browser test');
  const beforeReset=await saved(page);expect(beforeReset.live).toHaveLength(2);
  expect(beforeReset.live.find(check=>check.kind==='reaction')).toMatchObject({source:'live',day:null,quality:'good',validTrials:25,falseStarts:0,lapses:0,commissionErrors:null,omissionErrors:null});
  expect(beforeReset.live.find(check=>check.kind==='go_no_go')).toMatchObject({source:'live',day:null,quality:'good',validTrials:40,falseStarts:0,commissionErrors:0,omissionErrors:0,medianRtMs:null,lapses:null});
  expect(beforeReset.settings.baseline).toEqual(initial.settings.baseline);expect(beforeReset.settings.currentDay).toBe(16);
  expect(beforeReset.cacheKeys).toHaveLength(2);
  for(const route of ['today','mission','trends','check']) {
    await page.goto('/'+route);await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');
    await page.reload();await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 16 / 17');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.locator('.content-region').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
  }
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(page.locator('.mission-day:visible')).toHaveText('Mission day 7 / 17');const reset=await saved(page);
  expect(reset.settings.currentDay).toBe(7);expect(reset.settings.baseline).toEqual(initial.settings.baseline);expect(reset.responses).toHaveLength(0);
  expect(reset.live).toEqual(beforeReset.live);expect(reset.cacheKeys).toEqual(beforeReset.cacheKeys);
  await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');await page.getByRole('navigation').getByRole('link',{name:'Mission'}).click();
  for(const [id,label] of [['EVA-07','Review recommended'],['INV-03','Change noted']]) {
    const card=page.getByRole('article',{name:id});await expect(card.locator('.task-explanation')).toHaveText(fixedText[id]);
    await expect(card.locator('.concern-chip')).toContainText(label);
  }
  expect(requests.every(packet=>packet.provenance.every(source=>source.source==='synthetic')&&packet.domains.every(domain=>domain.measurements.every(value=>value.source==='synthetic')))).toBe(true);
  expect(requests.filter(packet=>packet.day===12&&packet.taskId==='EVA-07')).toHaveLength(1);
  expect(requests.filter(packet=>packet.day===12&&packet.taskId==='INV-03')).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('P10 unavailable API retains immediate template and deterministic day-12 status',async({page})=>{
  const requests=await fixedAI(page,true);await page.goto('/today');await page.getByRole('combobox',{name:'Jump to day'}).selectOption('12');
  await expect(page.locator('.engine-status')).toContainText('Review recommended');await expect(page.locator('.explanation-box .template-tag')).toHaveText('Template explanation');
  await expect.poll(()=>requests.length).toBeGreaterThan(0);
  await expect(page.locator('.explanation-box .template-tag')).toHaveText('Template explanation');await expect(page.locator('.explanation-box .explanation-toggle')).toHaveCount(0);
  await expect(page.locator('.overall-explanation')).toContainText('Sleep met a change criterion on 4 of the last 5 days');
});
