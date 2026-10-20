export const SLA_ALERT_TYPES = [
  { id:"responseWarning",field:"slaAlerts.responseWarningAt",due:"responseDueAt",actual:"slaFirstResponseAt",kind:"warning" },
  { id:"resolutionWarning",field:"slaAlerts.resolutionWarningAt",due:"resolveDueAt",actual:"resolvedAt",kind:"warning" },
  { id:"responseBreach",field:"slaAlerts.responseBreachAt",due:"responseDueAt",actual:"slaFirstResponseAt",kind:"breach" },
  { id:"resolutionBreach",field:"slaAlerts.resolutionBreachAt",due:"resolveDueAt",actual:"resolvedAt",kind:"breach" },
];
export function shouldSendSlaAlert(ticket, alert, now) {
 const due=Date.parse(ticket.sla?.[alert.due]);
 const current=new Date(now).getTime();
 if(!Number.isFinite(due)||!Number.isFinite(current)||!ticket.sla?.responseDueAt||!ticket.sla?.resolveDueAt)return false;
 if(["resolved","closed"].includes(ticket.status))return false;
 const actual=alert.actual==="slaFirstResponseAt"?(ticket.slaFirstResponseAt||ticket.agentFirstReplyAt):ticket[alert.actual];
 if(actual && Number.isFinite(new Date(actual).getTime()))return false;
 if(alert.kind==="warning")return current>=due-30*60*1000&&current<due;
 return current>due;
}
export async function deliverAlertWithClaim({ticket,alert,now,claim,release,send,recipients,text}){
 if(!shouldSendSlaAlert(ticket,alert,now))return {sent:false,reason:"not-due"};
 const claimed=await claim(ticket,alert,now);
 if(!claimed)return {sent:false,reason:"claimed-or-closed"};
 try{
  const unique=[...new Map(recipients.filter(Boolean).map(user=>[String(user._id),user])).values()];
  const results=await Promise.allSettled(unique.map(user=>send(user,text)));
  const delivered=results.some(r=>r.status==="fulfilled" && r.value?.sent===true);
  if(delivered)return {sent:true};
  await release(ticket,alert,now);
  return {sent:false,reason:"delivery-failed"};
 }catch(error){
  await release(ticket,alert,now);
  return {sent:false,reason:"delivery-error"};
 }
}
