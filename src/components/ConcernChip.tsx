import { CONCERN_LABELS } from '../engine/templates';
import type { Concern, Status } from '../engine/types';

export const STATUS_ICONS:Record<Status | Concern,string> = {
  INSUFFICIENT_DATA:'○', WITHIN_USUAL:'✓', NO_RELEVANT_CHANGE:'✓', CHANGE_NOTED:'◐', REVIEW_RECOMMENDED:'⚑',
};
export function ConcernChip({concern}:{concern:Concern}) {
  return <span className={`concern-chip status-${concern.toLowerCase()}`}><span aria-hidden="true">{STATUS_ICONS[concern]}</span> {CONCERN_LABELS[concern]}</span>;
}
