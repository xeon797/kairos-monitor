import { expect, type Page } from '@playwright/test';
import { CONCERN_LABELS, explain, STATUS_LABELS } from '../../../src/engine/templates';
import type { EvidencePacket } from '../../../src/engine/types';
import { validateExplanation } from '../../../src/engine/validateExplanation';

/** P7 UI verification never consumes provider quota, locally or on the public site. */
export async function mockAI(page:Page):Promise<void> {
  await page.route('**/',async route=>{
    if(route.request().method()==='HEAD')await route.fulfill({status:200,headers:{'X-Kairos-Explanations':'v1'}});
    else await route.continue();
  });
  await page.route('**/api/explain',async route=>{
    const packet=route.request().postDataJSON() as EvidencePacket;
    const text=`${packet.taskConcern?CONCERN_LABELS[packet.taskConcern]:STATUS_LABELS[packet.status]}. ${explain(packet)}`;
    expect(validateExplanation(text,packet).ok).toBe(true);
    await route.fulfill({json:{text,model:'gemini-p7-browser-mock'}});
  });
}
