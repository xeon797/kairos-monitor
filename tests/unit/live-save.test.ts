import 'fake-indexeddb/auto';
import { afterEach, expect, it } from 'vitest';
import { addLiveCheck, addResponse, getState, initialize, KairosDatabase, resetSimulation, setDay } from '../../src/db/db';
import { AppStore } from '../../src/state/appStore';
import { createLiveRecord } from '../../src/checks/liveRecord';
import { scoreReaction } from '../../src/checks/scoring';
const databases:KairosDatabase[]=[];
afterEach(async()=>{for(const db of databases.splice(0))await db.delete();});
it('serializes duplicate saves once, survives reload and preserves day-12 synthetic packets/baseline',async()=>{
  const db=new KairosDatabase('p8-live-save');databases.push(db);
  const adapter={initialize:()=>initialize('2026-10-09T00:00:00.000Z',db),getState:()=>getState(db),setDay:(day:number)=>setDay(day,db),reset:()=>resetSimulation(db),addResponse:(response:Parameters<typeof addResponse>[0])=>addResponse(response,db),addLiveCheck:(record:Parameters<typeof addLiveCheck>[0])=>addLiveCheck(record,db)};
  const app=new AppStore(adapter);await app.load();await app.jump(12);const before=app.getSnapshot();
  const record=createLiveRecord(scoreReaction(Array.from({length:25},()=>({outcome:'response',rtMs:250,focused:true}))),'reaction','one-result','2026-10-09T00:00:00.000Z')!;
  await Promise.all([app.saveLiveCheck(record),app.saveLiveCheck(record),app.saveLiveCheck(record)]);
  expect(await db.checks.where('source').equals('live').count()).toBe(1);
  expect(app.getSnapshot().baseline).toEqual(before.baseline);expect(app.getSnapshot().taskPackets).toEqual(before.taskPackets);
  const reloaded=new AppStore(adapter);await reloaded.load();await reloaded.saveLiveCheck(record);expect(await db.checks.where('source').equals('live').count()).toBe(1);
  await expect(app.saveLiveCheck({...record,medianRtMs:999})).rejects.toThrow();
});
