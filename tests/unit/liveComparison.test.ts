import { describe,it,expect } from 'vitest';
import { liveComparison } from '../../src/checks/liveComparison';
import type { LiveCheck } from '../../src/db/db';
function record(index:number,kind:LiveCheck['kind']='reaction',quality:LiveCheck['quality']='good'):LiveCheck {
 return {id:`live-${index}`,source:'live',day:null,timestamp:`2026-10-${String(index).padStart(2,'0')}T00:00:00.000Z`,kind,quality,medianRtMs:kind==='reaction'?200+index*10:null,lapses:kind==='reaction'?index:null,falseStarts:0,commissionErrors:kind==='go_no_go'?index:null,omissionErrors:kind==='go_no_go'?0:null,validTrials:kind==='reaction'?25:40,interruptions:0};
}
describe('live personal comparisons',()=>{
 it('orders ISO timestamps by time even when fractional seconds are omitted',()=>{
  const rows=[{...record(4),timestamp:'2026-10-01T00:00:00.500Z'},{...record(1),timestamp:'2026-10-01T00:00:00Z'},record(2),record(3)];
  expect(liveComparison(rows,'reaction').ids).toEqual(['live-1','live-4','live-2']);
 });
 it('excludes malformed saved records rather than comparing invalid values',()=>{
  const invalid={...record(3),timestamp:'invalid'};
  expect(liveComparison([record(1),record(2),invalid],'reaction').metrics).toBeNull();
 });
 it('requires three valid checks of the same kind',()=>{
  const rows=[record(1),record(2),record(3,'go_no_go'),record(4,'reaction','poor')];
  expect(liveComparison(rows,'reaction').metrics).toBeNull();expect(liveComparison(rows,'go_no_go').metrics).toBeNull();
 });
 it('uses the chronological first three means without rolling or mutating input',()=>{
  const rows=[record(4),record(2),record(1),record(3)];const copy=structuredClone(rows);
  const result=liveComparison(rows,'reaction');expect(result.ids).toEqual(['live-1','live-2','live-3']);
  expect(result.metrics?.map(metric=>metric.mean)).toEqual([220,2,0]);expect(rows).toEqual(copy);
 });
 it('keeps attention metrics separate',()=>{
  const result=liveComparison([record(1,'go_no_go'),record(2,'go_no_go'),record(3,'go_no_go'),record(4)],'go_no_go');
  expect(result.metrics?.map(metric=>metric.mean)).toEqual([2,0,0]);
 });
 it('excludes missing metrics and invalid quality metadata even if marked good',()=>{
  const invalid={...record(3),medianRtMs:null};const interrupted={...record(4),interruptions:3};
  expect(liveComparison([record(1),record(2),invalid,interrupted],'reaction').validCount).toBe(2);
 });
});
