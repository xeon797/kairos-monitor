import { useEffect, useState } from 'react';
import { explain } from '../engine/templates';
import type { EvidencePacket } from '../engine/types';
import { explanationCacheKey } from '../engine/validateExplanation';
import { explainClient, type ExplanationResult } from './explainClient';

export function useExplanation(packet:EvidencePacket) {
  const key = explanationCacheKey(packet);
  const [result,setResult] = useState<{key:string;ai:ExplanationResult} | null>(null);
  const [templateKey,setTemplateKey] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void explainClient.getExplanation(packet,controller.signal).then(ai => {if(ai && !controller.signal.aborted)setResult({key,ai});});
    return () => controller.abort();
    // Identity includes every packet field; reconstructed equal objects need no new request.
  },[key]);
  const ai = result?.key === key ? result.ai : null;
  const showingTemplate = !ai || templateKey === key;
  return {text:showingTemplate ? explain(packet) : ai.text,ai,showingTemplate,toggle:() => setTemplateKey(previous => previous === key ? null : key)};
}
