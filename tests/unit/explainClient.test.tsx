import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createExplainClient } from '../../src/ai/explainClient';
import { Explanation } from '../../src/components/Explanation';
import { KairosDatabase } from '../../src/db/db';
import { EXPLANATION_CACHE_MAX_ENTRIES, EXPLANATION_CLIENT_TIMEOUT_MS, EXPLANATION_SETTLE_MS } from '../../src/engine/config';
import { evaluateDomains } from '../../src/engine/detect';
import { buildEvidencePacket } from '../../src/engine/evidence';
import { syntheticChecks, syntheticSleep } from '../../src/engine/scenarios';
import { EXPLANATION_CONTRACT_VERSION, explanationCacheKey } from '../../src/engine/validateExplanation';
import { baseline } from './fixtures/engineOracle';
const packet = buildEvidencePacket(12,baseline,evaluateDomains(12,baseline,syntheticSleep,syntheticChecks));
const text = 'Review recommended. Sleep met a criterion on 4 of the last 5 days. Review current evidence and repeat the check.';
const model = 'gemini-test'; const now = Date.parse('2026-10-09T00:00:00.000Z');
let db:KairosDatabase;let sequence=0;
beforeEach(async () => {db=new KairosDatabase(`explanation-client-${++sequence}`);await db.open();});
afterEach(async () => {vi.useRealTimers();db.close();await db.delete();});
function setup(options:{online?:boolean;available?:() => Promise<boolean>;fetch?:typeof fetch;expectedModel?:string} = {}) {
  const fetchMock=options.fetch ?? vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({text,model})));
  const client=createExplainClient({store:db,fetch:fetchMock,online:() => options.online ?? true,available:options.available ?? (async () => true),now:() => now,expectedModel:options.expectedModel});
  return {fetchMock,client};
}
// Dexie schedules real IDB tasks; only settle/deadline timers are accelerated.
async function settle() { await new Promise(resolve => setTimeout(resolve,EXPLANATION_SETTLE_MS+100)); }
async function seed(extra:Record<string,unknown> = {}) {await db.explanations.put({key:explanationCacheKey(packet),text,model,createdAt:new Date(now).toISOString(),contractVersion:EXPLANATION_CONTRACT_VERSION,...extra});}
describe('non-blocking explanation client', () => {
  it('renders the deterministic template immediately without a fake toggle', () => {const html=renderToStaticMarkup(<Explanation packet={packet}/>);expect(html).toContain('Template explanation');expect(html).toContain('Sleep met a change criterion on 4 of the last 5 days');expect(html).not.toContain('Show template version');expect(html).not.toContain('AI-rephrased');});
  it('validates a fresh result and stores version/model metadata',async () => {const {client,fetchMock}=setup();const result=await client.getExplanation(packet);expect(result).toEqual({text,model});expect(fetchMock).toHaveBeenCalledOnce();const cached=await db.explanations.get(explanationCacheKey(packet));expect(cached?.contractVersion).toBe(EXPLANATION_CONTRACT_VERSION);expect(cached?.model).toBe(model);});
  it.each([true,false])('uses a validated cache online=%s without a request',async online => {await seed();const {client,fetchMock}=setup({online});expect(await client.getExplanation(packet)).toEqual({text,model});expect(fetchMock).not.toHaveBeenCalled();});
  it.each([{text:'You are safe.'},{contractVersion:'old-contract'},{model:'invalid'},{createdAt:'invalid'},{createdAt:'2020-01-01T00:00:00.000Z'}])('rejects incompatible/unvalidated offline cache',async extra => {await seed(extra);const {client,fetchMock}=setup({online:false});expect(await client.getExplanation(packet)).toBeNull();expect(fetchMock).not.toHaveBeenCalled();});
  it('enforces known model compatibility',async () => {await seed();const {client}=setup({online:false,expectedModel:'gemini-other'});expect(await client.getExplanation(packet)).toBeNull();});
  it.each(['You are safe.','Sleep is 99 h. Review current evidence.','Review recommended.'])('silently rejects bad fresh text: %s',async text => {const {client}=setup({fetch:vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({text,model})))});expect(await client.getExplanation(packet)).toBeNull();expect(await db.explanations.count()).toBe(0);});
  it.each([429,502,503])('silently falls back on %i',async status => {const {client}=setup({fetch:vi.fn<typeof fetch>().mockResolvedValue(new Response('{}',{status}))});expect(await client.getExplanation(packet)).toBeNull();});
  it('silently handles network and malformed failures',async () => {for(const fetchMock of [vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),vi.fn<typeof fetch>().mockResolvedValue(new Response('not json'))]) expect(await setup({fetch:fetchMock}).client.getExplanation(packet)).toBeNull();});
  it('bounds fetch/body timeout and aborts at four seconds',async () => {const fetchMock=vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));const {client}=setup({fetch:fetchMock});const pending=client.getExplanation(packet);await settle();expect(fetchMock).toHaveBeenCalledOnce();expect(await pending).toBeNull();expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);},EXPLANATION_CLIENT_TIMEOUT_MS+EXPLANATION_SETTLE_MS+2000);
  it('deduplicates concurrent requests',async () => {const {client,fetchMock}=setup();const results=await Promise.all([client.getExplanation(packet),client.getExplanation(structuredClone(packet)),client.getExplanation(packet)]);expect(results.every(result => result?.text === text)).toBe(true);expect(fetchMock).toHaveBeenCalledOnce();});
  it('cancels an abandoned day before network work',async () => {const {client,fetchMock}=setup();const controller=new AbortController();const result=client.getExplanation(packet,controller.signal);controller.abort();expect(await result).toBeNull();expect(fetchMock).not.toHaveBeenCalled();});
  it('a cancelled subscriber cannot cancel a StrictMode/concurrent replacement',async () => {const {client,fetchMock}=setup();const controller=new AbortController();const old=client.getExplanation(packet,controller.signal);controller.abort();const fresh=client.getExplanation(packet);expect(await old).toBeNull();expect((await fresh)?.text).toBe(text);expect(fetchMock).toHaveBeenCalledOnce();});
  it('ignores stale completion while retaining validated cache',async () => {let complete:(value:Response) => void = () => {};const fetchMock=vi.fn<typeof fetch>().mockImplementation(() => new Promise(resolve => {complete=resolve;}));const {client}=setup({fetch:fetchMock});const controller=new AbortController();const old=client.getExplanation(packet,controller.signal);await settle();controller.abort();complete(new Response(JSON.stringify({text,model})));expect(await old).toBeNull();expect(await db.explanations.count()).toBe(1);});
  it('never retries a failed packet automatically',async () => {const {client,fetchMock}=setup({fetch:vi.fn<typeof fetch>().mockRejectedValue(new Error('unavailable'))});expect(await client.getExplanation(packet)).toBeNull();expect(await client.getExplanation(packet)).toBeNull();expect(fetchMock).toHaveBeenCalledOnce();});
  it('keeps Vite/no endpoint template-only and handles capability failures',async () => {for(const available of [async () => false,async () => {throw new Error('offline');}]) {const {client,fetchMock}=setup({available});expect(await client.getExplanation(packet)).toBeNull();expect(fetchMock).not.toHaveBeenCalled();}});
  it.each(['provenance','measurement','latest'] as const)('never transmits live %s',async kind => {const live=structuredClone(packet);if(kind==='provenance')live.provenance[0].source='live';else if(kind==='latest')live.domains[0].latest.source='live';else live.domains[0].measurements[0].source='live';const {client,fetchMock}=setup();expect(await client.getExplanation(live)).toBeNull();expect(fetchMock).not.toHaveBeenCalled();});
  it('bounds the cache on write and preserves newest result',async () => {await db.explanations.bulkPut(Array.from({length:EXPLANATION_CACHE_MAX_ENTRIES},(_,index) => ({key:`old-${index}`,text,model,createdAt:'2026-10-08T00:00:00.000Z'})));const {client}=setup();expect((await client.getExplanation(packet))?.text).toBe(text);expect(await db.explanations.count()).toBe(EXPLANATION_CACHE_MAX_ENTRIES);expect(await db.explanations.get(explanationCacheKey(packet))).toBeDefined();});
  it('bounds a burst of different packets to twelve calls',async () => {const {client,fetchMock}=setup();await Promise.all(Array.from({length:13},(_,index) => client.getExplanation({...packet,baseline:{...baseline,frozenAt:`2026-10-09T00:00:${String(index).padStart(2,'0')}.000Z`}})));expect(fetchMock).toHaveBeenCalledTimes(12);});
});
