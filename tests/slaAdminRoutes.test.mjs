import test from "node:test";
import assert from "node:assert/strict";
import { createSlaAdminHandlers } from "../lib/slaAdminRoutes.mjs";
import { validateSlaPolicy } from "../lib/slaPolicy.mjs";
const good={enabled:true,mode:"24x7",targets:Object.fromEntries(["low","medium","high"].map(p=>[p,{responseMinutes:30,resolveMinutes:180}]))};
function harness(role="admin") {
 const org={supportContract:{slaPolicy:{enabled:false}},writes:0,set(path,value){if(path.endsWith(".enabled"))this.supportContract.slaPolicy.enabled=value;else this.supportContract.slaPolicy=value;},async save(){this.writes++}};
 let connected=0;
 const routes=createSlaAdminHandlers({getCurrentUser:async()=>role?{role}:null,isValidObjectId:(x)=>x==="valid",connectDb:async()=>{connected++},Organization:{findById:async id=>id==="valid"?org:null},validateSlaPolicy});
 return {org,routes,connected:()=>connected};
}
const ctx={params:Promise.resolve({organizationId:"valid"})};
const request=body=>new Request("https://local.invalid/api/admin/sla",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
test("SLA API denies unauthenticated, customer, agent and organization manager",async()=>{
 for(const role of [null,"customer","agent","organization_manager"]){
  const h=harness(role);assert.equal((await h.routes.PUT(request(good),ctx)).status,403);assert.equal((await h.routes.GET(new Request("https://local.invalid"),ctx)).status,403);assert.equal(h.org.writes,0);assert.equal(h.connected(),0);
 }
});
test("SLA API rejects malformed IDs and invalid targets without persisting",async()=>{
 const h=harness();assert.equal((await h.routes.PUT(request(good),{params:Promise.resolve({organizationId:"bad"})})).status,400);
 assert.equal((await h.routes.PUT(request({...good,targets:{}}),ctx)).status,400);assert.equal(h.org.writes,0);
});
test("SLA API admin can store, read and disable policy without losing historical targets",async()=>{
 const h=harness();
 const save=await h.routes.PUT(request(good),ctx);assert.equal(save.status,200);assert.equal(h.org.writes,1);
 const read=await h.routes.GET(new Request("https://local.invalid"),ctx);assert.equal((await read.json()).policy.targets.high.responseMinutes,30);
 assert.equal(read.headers.get("cache-control"),"no-store");
 await h.routes.PUT(request({enabled:false}),ctx);assert.equal(h.org.supportContract.slaPolicy.enabled,false);
 assert.equal(h.org.supportContract.slaPolicy.targets.high.responseMinutes,30);
});
