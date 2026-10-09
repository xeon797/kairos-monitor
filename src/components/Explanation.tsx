import { useExplanation } from '../ai/useExplanation';
import type { EvidencePacket } from '../engine/types';

export function Explanation({packet,task = false}:{packet:EvidencePacket;task?:boolean}) {
  const explanation = useExplanation(packet);
  return <div className="explanation-content">
    <span className="template-tag" title={explanation.ai ? `Model: ${explanation.ai.model}` : undefined}>{explanation.showingTemplate ? 'Template explanation' : 'AI-rephrased from the same evidence'}{task && <span className="visually-hidden"> for {packet.taskId}</span>}</span>
    <p className={task ? 'task-explanation' : 'overall-explanation'}>{explanation.text}</p>
    <div className="explanation-actions">{explanation.ai && <button className="pill-button secondary-button explanation-toggle" type="button" aria-pressed={explanation.showingTemplate} onClick={explanation.toggle}>Show template version</button>}</div>
  </div>;
}
