import type { LiveCheck } from '../db/db';
import type { TestKind } from '../engine/types';
import type { CheckScore } from './scoring';
import { MIN_NONNEGATIVE_VALUE } from '../engine/config';

function isCount(value:unknown):value is number {
  return typeof value==='number'&&Number.isSafeInteger(value)&&value>=MIN_NONNEGATIVE_VALUE;
}

/** Stored records are untrusted; reject malformed values without erasing history. */
export function isLiveRecord(value:unknown):value is LiveCheck {
  if(typeof value!=='object'||value===null)return false;
  const record=value as Record<string,unknown>;
  if(record.source!=='live'||record.day!==null||(record.kind!=='reaction'&&record.kind!=='go_no_go')||
    typeof record.id!=='string'||!record.id.trim()||typeof record.timestamp!=='string'||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(record.timestamp))return false;
  const parsed=new Date(record.timestamp);
  if(!Number.isFinite(parsed.getTime())||
    (parsed.toISOString()!==record.timestamp&&parsed.toISOString().replace('.000Z','Z')!==record.timestamp))return false;
  if(record.quality!=='good'&&record.quality!=='poor'&&record.quality!=='missing')return false;
  if(record.medianRtMs!==null&&(typeof record.medianRtMs!=='number'||!Number.isFinite(record.medianRtMs)||record.medianRtMs<MIN_NONNEGATIVE_VALUE))return false;
  return ['lapses','falseStarts','commissionErrors','omissionErrors'].every(key=>record[key]===null||isCount(record[key]))&&
    isCount(record.validTrials)&&isCount(record.interruptions);
}

/** Only a complete, structurally valid, measured session can become a record. */
export function createLiveRecord(score:CheckScore,kind:TestKind,id:string,timestamp:string):LiveCheck|null {
  if(score.kind!==kind||!score.complete||!score.validInput||score.quality==='missing')return null;
  const record:LiveCheck={id,timestamp,kind,source:'live',day:null,medianRtMs:score.medianRtMs,lapses:score.lapses,
    falseStarts:score.falseStarts,commissionErrors:score.commissionErrors,omissionErrors:score.omissionErrors,
    validTrials:score.validTrials,interruptions:score.interruptions,quality:score.quality};
  return isLiveRecord(record)?record:null;
}
