import test from "node:test";
import assert from "node:assert/strict";
import {SLA_ALERT_TYPES,shouldSendSlaAlert,deliverAlertWithClaim} from "../lib/slaAlertDelivery.mjs";
const now=new Date("2026-10-20T09:45:00Z");
const ticket={_id:"a",status:"in-progress",sla:{responseDueAt:"2026-10-20T10:00:00Z",resolveDueAt:"2026-10-20T12:00:00Z"},slaFirstResponseAt:null,agentFirstReplyAt:null};
const warn=SLA_ALERT_TYPES[0];
test("alerts only for due active unresolved tickets",()=>{
 assert.equal(shouldSendSlaAlert(ticket,warn,now),true);
 assert.equal(shouldSendSlaAlert({...ticket,status:"resolved"},warn,now),false);
 assert.equal(shouldSendSlaAlert({...ticket,agentFirstReplyAt:now},warn,now),false);
 assert.equal(shouldSendSlaAlert({...ticket,slaFirstResponseAt:now},warn,now),false);
 assert.equal(shouldSendSlaAlert(ticket,warn,new Date("2026-10-20T08:00:00Z")),false);
});
test("mocked delivery deduplicates users and records success",async()=>{
 let count=0,releases=0;
 const result=await deliverAlertWithClaim({ticket,alert:warn,now,recipients:[{_id:"u"},{_id:"u"},{_id:"v"}],text:"test",
 claim:async()=>true,release:async()=>{releases++},send:async()=>{count++;return {sent:true}}});
 assert.deepEqual(result,{sent:true});assert.equal(count,2);assert.equal(releases,0);
});
test("mocked provider failure releases claim for retry",async()=>{
 let releases=0;
 const result=await deliverAlertWithClaim({ticket,alert:warn,now,recipients:[{_id:"u"}],text:"test",
 claim:async()=>true,release:async()=>{releases++},send:async()=>({sent:false})});
 assert.equal(result.reason,"delivery-failed");assert.equal(releases,1);
});
test("already claimed alert sends no duplicate",async()=>{
 let count=0;
 const r=await deliverAlertWithClaim({ticket,alert:warn,now,recipients:[{_id:"u"}],text:"x",
 claim:async()=>null,release:async()=>{},send:async()=>{count++;return {sent:true}}});
 assert.equal(r.reason,"claimed-or-closed");assert.equal(count,0);
});
