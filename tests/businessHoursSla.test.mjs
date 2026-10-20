import test from "node:test";
import assert from "node:assert/strict";
import { validateSlaPolicy, calculateSlaSnapshot, addWorkingMinutes } from "../lib/slaPolicy.mjs";
const weekly = Object.fromEntries(Array.from({length:7},(_,i)=>[String(i),i===5||i===6?null:{start:"09:00",end:"17:00"}]));
const policy = {enabled:true,mode:"business-hours",targets:{low:{responseMinutes:60,resolveMinutes:120},medium:{responseMinutes:60,resolveMinutes:120},high:{responseMinutes:60,resolveMinutes:120}},calendar:{timeZone:"Asia/Tehran",weekly,holidays:["2026-10-21"]}};
test("business calendar is explicit and validated",()=>{
 assert.equal(validateSlaPolicy(policy).mode,"business-hours");
 assert.throws(()=>validateSlaPolicy({...policy,calendar:{...policy.calendar,holidays:["2026-02-30"]}}));
 assert.throws(()=>validateSlaPolicy({...policy,calendar:{...policy.calendar,weekly:{...weekly,"1":{start:"17:00",end:"09:00"}}}}));
});
test("working SLA skips holidays and closed weekend",()=>{
 const snapshot=calculateSlaSnapshot(policy,"low","2026-10-20T12:00:00Z"); // 15:30 Tehran Tue
 assert.equal(snapshot.responseDueAt.toISOString(),"2026-10-20T13:00:00.000Z");
 const late=calculateSlaSnapshot(policy,"low","2026-10-20T13:00:00Z"); // Tue 16:30 local
 assert.equal(late.responseDueAt.toISOString(),"2026-10-22T06:00:00.000Z"); // Thu 09:30 local after Wed holiday
});
test("closed-hour creation starts clock at next business opening",()=>{
 const snapshot=calculateSlaSnapshot(policy,"high","2026-10-23T13:30:00Z"); // Fri after hours
 assert.equal(snapshot.responseDueAt.toISOString(),"2026-10-25T06:30:00.000Z"); // Sun 10:00 local
});
test("invalid start rejected and no silent all-day fallback",()=>{
 assert.throws(()=>addWorkingMinutes("wrong",60,policy.calendar));
 assert.equal(validateSlaPolicy({enabled:false,mode:"24x7",targets:policy.targets}).mode,"24x7");
});
