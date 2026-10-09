import type { LiveCheck } from '../db/db';
import type { TestKind } from '../engine/types';
import type { CheckScore } from './scoring';

/** Only a complete, structurally valid, measured session can become a record. */
export function createLiveRecord(score:CheckScore,kind:TestKind,id:string,timestamp:string):LiveCheck|null {
  if(score.kind!==kind||!score.complete||!score.validInput||score.quality==='missing')return null;
  return {id,timestamp,kind,source:'live',day:null,medianRtMs:score.medianRtMs,lapses:score.lapses,
    falseStarts:score.falseStarts,commissionErrors:score.commissionErrors,omissionErrors:score.omissionErrors,
    validTrials:score.validTrials,interruptions:score.interruptions,quality:score.quality};
}
