import { db, type KairosDatabase } from '../db/db';
import { EXPLANATION_CACHE_MAX_AGE_MS, EXPLANATION_CACHE_MAX_ENTRIES, EXPLANATION_CLIENT_REQUESTS_PER_MINUTE, EXPLANATION_CLIENT_TIMEOUT_MS, EXPLANATION_RATE_WINDOW_MS, EXPLANATION_SETTLE_MS } from '../engine/config';
import type { EvidencePacket } from '../engine/types';
import { EXPLANATION_CONTRACT_VERSION, explanationCacheKey, validateExplanation } from '../engine/validateExplanation';

export interface ExplanationResult { text:string;model:string }
interface ClientOptions { store:KairosDatabase;fetch:typeof fetch;online:() => boolean;available:() => Promise<boolean>;now:() => number;expectedModel?:string }
export function isSyntheticExplanation(packet:EvidencePacket):boolean {
  return !!packet.baseline && packet.status !== 'INSUFFICIENT_DATA' && packet.provenance.length > 0 && packet.provenance.every(p => p.source === 'synthetic') &&
    packet.domains.length === 3 && packet.domains.every(d => d.evaluable && d.baselineEstablished && d.latest.source === 'synthetic' && d.measurements.every(m => m.source === 'synthetic' && m.quality === 'good' && m.value !== null));
}
async function deadline<T>(work:(signal:AbortSignal) => Promise<T>):Promise<T> {
  const controller = new AbortController(); let timer:ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve,reject) => {timer=setTimeout(() => {controller.abort();reject(new Error('deadline'));},EXPLANATION_CLIENT_TIMEOUT_MS);});
  try {return await Promise.race([work(controller.signal),timeout]);} finally {if(timer !== undefined)clearTimeout(timer);}
}

export function createExplainClient(options:ClientOptions) {
  const pending = new Map<string,{promise:Promise<ExplanationResult | null>;leases:Set<symbol>}>();
  const attempted = new Set<string>();
  let starts:number[] = [];
  async function cached(packet:EvidencePacket,key:string):Promise<ExplanationResult | null> {
    try {
      const item = await options.store.explanations.get(key);
      if (!item || item.contractVersion !== EXPLANATION_CONTRACT_VERSION || !/^gemini-[\w.-]+$/.test(item.model) || options.expectedModel && item.model !== options.expectedModel ||
        !Number.isFinite(Date.parse(item.createdAt)) || options.now()-Date.parse(item.createdAt) < 0 || options.now()-Date.parse(item.createdAt) > EXPLANATION_CACHE_MAX_AGE_MS || !validateExplanation(item.text,packet).ok) return null;
      return {text:item.text,model:item.model};
    } catch {return null;}
  }
  async function save(key:string,result:ExplanationResult):Promise<void> {
    try {
      await options.store.transaction('rw',options.store.explanations,async () => {
        await options.store.explanations.put({key,...result,createdAt:new Date(options.now()).toISOString(),contractVersion:EXPLANATION_CONTRACT_VERSION});
        const all = await options.store.explanations.orderBy('createdAt').primaryKeys();
        if(all.length > EXPLANATION_CACHE_MAX_ENTRIES) await options.store.explanations.bulkDelete(all.slice(0,all.length-EXPLANATION_CACHE_MAX_ENTRIES));
      });
    } catch { /* Explanation storage never makes mission state unavailable. */ }
  }
  function getExplanation(packet:EvidencePacket,signal?:AbortSignal):Promise<ExplanationResult | null> {
    if (!isSyntheticExplanation(packet) || signal?.aborted) return Promise.resolve(null);
    const key = explanationCacheKey(packet);
    let entry = pending.get(key);
    if (!entry) {
      const leases = new Set<symbol>();
      const promise = (async () => {
        const hit = await cached(packet,key);
        if (hit) return hit;
        if (!options.online() || attempted.has(key)) return null;
        await new Promise(resolve => setTimeout(resolve,EXPLANATION_SETTLE_MS));
        if (!leases.size || !options.online() || !await options.available() || !leases.size) return null;
        const now = options.now(); starts = starts.filter(start => now-start < EXPLANATION_RATE_WINDOW_MS);
        if (starts.length >= EXPLANATION_CLIENT_REQUESTS_PER_MINUTE) return null;
        starts.push(now); attempted.add(key);
        if (attempted.size > EXPLANATION_CACHE_MAX_ENTRIES * 2) attempted.delete(attempted.values().next().value!);
        try {
          const result = await deadline(async signal => {
            const response = await options.fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(packet),signal});
            if(!response.ok) return null;
            const body:unknown = await response.json();
            if(!body || typeof body !== 'object' || !('text' in body) || !('model' in body) || typeof body.text !== 'string' || typeof body.model !== 'string' || !/^gemini-[\w.-]+$/.test(body.model) || options.expectedModel && body.model !== options.expectedModel || !validateExplanation(body.text,packet).ok) return null;
            return {text:body.text,model:body.model};
          });
          if(result) await save(key,result);
          return result;
        } catch {return null;}
      })().catch(() => null).finally(() => pending.delete(key));
      entry={promise,leases}; pending.set(key,entry);
    }
    const lease = Symbol(); entry.leases.add(lease);
    const active = entry;
    const release = () => active.leases.delete(lease);
    signal?.addEventListener('abort',release,{once:true});
    return entry.promise.then(result => signal?.aborted ? null : result).finally(() => {release();signal?.removeEventListener('abort',release);});
  }
  return {getExplanation};
}

let availability:Promise<boolean> | undefined;
async function serverAvailable():Promise<boolean> {
  // Vercel advertises the deployed function bundle. Vite's static dev/preview
  // servers don't, so template-only regression checks need no test-only UI flag.
  availability ??= deadline(async signal => (await fetch('/',{method:'HEAD',signal,cache:'no-store'})).headers.get('X-Kairos-Explanations') === 'v1').catch(() => false);
  return availability;
}
export const explainClient = createExplainClient({store:db,fetch:(...args) => fetch(...args),online:() => typeof navigator !== 'undefined' && navigator.onLine,available:serverAvailable,now:() => Date.now()});
