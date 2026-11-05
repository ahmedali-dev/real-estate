import { z } from "zod";
import { ownerBalance,type LedgerRow,type Operation } from "./operations";
export const reportViews=["properties","transactions","dues","maintenance","owners","expenses","reminders"] as const;
export type ReportView=typeof reportViews[number];
export type ReportRow=Record<string,string|number>;
export interface ReportProperty {_id:string;title:string;category:string}
export interface ReportRecord extends LedgerRow {propertyId:string}
export interface ReportFilter {from:string;to:string;propertyId?:string;agreementId?:string;employeeId?:string;category?:string}
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;});
const id=z.string().regex(/^[a-f\d]{24}$/i).optional();
export const reportFilterSchema=z.object({from:date,to:date,propertyId:id,agreementId:id,employeeId:id,category:z.enum(["build","land","apartment"]).optional()}).strict().refine(v=>v.from<=v.to&&new Date(v.to).getTime()-new Date(v.from).getTime()<=366*5*86400000,"Choose a valid period of up to five years.");
export function riyadhToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export const previousDay=(date:string)=>new Date(new Date(date+"T00:00:00Z").getTime()-86400000).toISOString().slice(0,10);
const cents=(v:unknown)=>{const n=Math.round(Number(v||0)*100);if(!Number.isSafeInteger(n))throw new Error("Report amount exceeds safe monetary precision.");return n;};
function sum(values:number[]){const n=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(n))throw new Error("Report total exceeds safe monetary precision.");return n;}
export function createReport(properties:ReportProperty[],allRecords:ReportRecord[],allOperations:Operation[],filter:ReportFilter){
  const initial=properties.filter(p=>(!filter.propertyId||p._id===filter.propertyId)&&(!filter.category||p.category===filter.category));
  const propertyMap=new Map(initial.map(p=>[p._id,p]));
  const records=allRecords.filter(r=>!r.archived&&propertyMap.has(r.propertyId));
  const agreements=records.filter(r=>r.kind==="agreement"&&(!filter.agreementId||r._id===filter.agreementId)&&(!filter.employeeId||r.data.responsibleUserId===filter.employeeId));
  const agreementMap=new Map(agreements.map(a=>[a._id,a]));
  const leaseMap=new Map(records.filter(r=>r.kind==="lease").map(l=>[l._id,l]));
  const agreementOf=(r:ReportRecord)=>String(r.data.agreementId||leaseMap.get(String(r.data.leaseId))?.data.agreementId||"");
  const agreementFilter=Boolean(filter.agreementId||filter.employeeId);
  const selected=records.filter(r=>!agreementFilter||agreementMap.has(r.kind==="agreement"?r._id:agreementOf(r)));
  const selectedIds=new Set(selected.map(r=>r._id));
  const operations=allOperations.filter(o=>propertyMap.has(o.propertyId)&&(!agreementFilter||agreementMap.has(String(o.data.agreementId))||selectedIds.has(String(o.data.recordId))||selectedIds.has(String(o.data.leaseId))));
  const selectedProperties=initial.filter(p=>!agreementFilter||agreements.some(a=>a.propertyId===p._id));
  const title=(propertyId:string)=>propertyMap.get(propertyId)?.title||"";
  const transactions:ReportRow[]=[],dues:ReportRow[]=[],maintenance:ReportRow[]=[],owners:ReportRow[]=[],reminders:ReportRow[]=[];
  const paymentsByRecord=new Map<string,Operation[]>();
  for(const o of operations)if(o.kind==="payment"&&o.status==="posted"){const id=String(o.data.recordId);if(!paymentsByRecord.has(id))paymentsByRecord.set(id,[]);paymentsByRecord.get(id)!.push(o);}
  const receivedByRecord=new Map<string,number>();
  for(const r of selected.filter(r=>["income","expense"].includes(r.kind))){
    const payments=r.data.status==="settled"?[{id:"legacy:"+r._id,date:String(r.data.settledDate),amount:cents(r.data.amount),reference:String(r.data.reference||"")}]:(paymentsByRecord.get(r._id)||[]).map(o=>({id:o._id,date:String(o.data.date),amount:cents(o.data.amount),reference:String(o.data.reference||"")}));
    const paid=sum(payments.filter(p=>p.date<=filter.to).map(p=>p.amount));receivedByRecord.set(r._id,paid);
    for(const p of payments.filter(p=>p.date>=filter.from&&p.date<=filter.to))transactions.push({id:p.id,propertyId:r.propertyId,property:title(r.propertyId),recordId:r._id,title:String(r.data.title),date:p.date,kind:r.kind,category:String(r.data.category),party:String(r.data.counterparty),allocation:String(r.data.beneficiary||r.data.payer),amount:p.amount/100,reference:p.reference});
    const dueDate=String(r.data.dueDate||r.data.date),remaining=Math.max(0,cents(r.data.amount)-paid);
    if(remaining>0&&dueDate<=filter.to){
      const days=Math.round((new Date(filter.to).getTime()-new Date(dueDate).getTime())/86400000);
      const row={id:r._id,propertyId:r.propertyId,property:title(r.propertyId),title:String(r.data.title),kind:r.kind,party:String(r.data.counterparty),dueDate,amount:Number(r.data.amount),paid:paid/100,remaining:remaining/100,daysLate:days,bucket:days===0?"due_today":days<=30?"1_30":days<=60?"31_60":days<=90?"61_90":"90_plus"};dues.push(row);
      if(days>0)reminders.push({id:r._id,propertyId:r.propertyId,property:title(r.propertyId),title:row.title,type:r.kind==="income"?"overdue_income":"overdue_expense",date:dueDate,amount:row.remaining,days});
    }
  }
  for(const o of operations.filter(o=>o.kind==="payout"&&o.status==="posted"&&String(o.data.date)>=filter.from&&String(o.data.date)<=filter.to))transactions.push({id:o._id,propertyId:o.propertyId,property:title(o.propertyId),recordId:"",title:String(o.data.agreementTitle||""),date:String(o.data.date),kind:"payout",category:"owner_payout",party:String(o.data.ownerName||""),allocation:"owner",amount:Number(o.data.amount),reference:String(o.data.reference)});
  for(const o of operations.filter(o=>o.kind==="maintenance")){
    const created=String(o.audit.find(a=>a.action==="created")?.at||"");
    const requestedAt=created?new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(created)):"";
    if(requestedAt>filter.to)continue;
    const completedDate=String(o.data.completedDate||"");
    const expenseId=String(o.data.expenseId||"");
    if((o.status==="completed"&&completedDate>=filter.from&&completedDate<=filter.to)||(["requested","approved"].includes(o.status))||(o.status==="cancelled"&&requestedAt>=filter.from&&requestedAt<=filter.to))maintenance.push({id:o._id,propertyId:o.propertyId,property:title(o.propertyId),title:String(o.data.title),status:o.status,priority:String(o.data.priority),supplier:String(o.data.supplier),allocation:String(o.data.payer),estimate:Number(o.data.estimate),approved:Number(o.data.approvedAmount||0),actual:Number(o.data.actualCost||0),variance:o.status==="completed"?(cents(o.data.actualCost)-cents(o.data.approvedAmount))/100:0,paid:(receivedByRecord.get(expenseId)||0)/100,date:completedDate||requestedAt});
    if(o.status==="requested")reminders.push({id:o._id,propertyId:o.propertyId,property:title(o.propertyId),title:String(o.data.title),type:"maintenance_approval",date:requestedAt,amount:Number(o.data.estimate),days:0});
  }
  const unassigned=selected.filter(r=>(r.kind==="income"&&r.data.beneficiary==="owner"||r.kind==="expense"&&r.data.payer==="owner")&&!records.some(a=>a.kind==="agreement"&&a._id===agreementOf(r)));
  for(const r of unassigned)reminders.push({id:"unassigned:"+r._id,propertyId:r.propertyId,property:title(r.propertyId),title:String(r.data.title),type:"unassigned_owner_entry",date:String(r.data.date),amount:Number(r.data.amount),days:0});
  for(const r of selected.filter(r=>r.kind==="lease"&&r.data.status==="active"))if(!selected.some(i=>i.kind==="income"&&i.data.category==="rent"&&i.data.leaseId===r._id))reminders.push({id:"schedule:"+r._id,propertyId:r.propertyId,property:title(r.propertyId),title:String(r.data.title),type:"missing_rent_dues",date:String(r.data.firstDueDate),amount:0,days:0});
  for(const r of selected.filter(r=>["agreement","lease"].includes(r.kind)&&r.data.status==="active")){
    const days=Math.round((new Date(String(r.data.endDate)).getTime()-new Date(filter.to).getTime())/86400000);
    if(days<=30)reminders.push({id:r._id,propertyId:r.propertyId,property:title(r.propertyId),title:String(r.data.title),type:r.kind==="lease"?(days<0?"lease_expired":"lease_expiry"):(days<0?"agreement_expired":"agreement_expiry"),date:String(r.data.endDate),amount:0,days});
  }
  const before=previousDay(filter.from);
  const groupedRecords=new Map<string,ReportRecord[]>(),groupedOps=new Map<string,Operation[]>();
  const recordMap=new Map(records.map(r=>[r._id,r]));
  for(const r of records){const id=agreementOf(r);if(agreementMap.has(id)){if(!groupedRecords.has(id))groupedRecords.set(id,[]);groupedRecords.get(id)!.push(r);}}
  for(const o of operations){const record=recordMap.get(String(o.data.recordId));const id=record?agreementOf(record):String(o.data.agreementId||"");if(agreementMap.has(id)){if(!groupedOps.has(id))groupedOps.set(id,[]);groupedOps.get(id)!.push(o);}}
  for(const a of agreements){
    const scopeRecords=groupedRecords.get(a._id)||[],scopeOps=groupedOps.get(a._id)||[];
    const balance=ownerBalance(a,scopeRecords,scopeOps,filter.to),opening=ownerBalance(a,scopeRecords,scopeOps,before);
    owners.push({id:a._id,propertyId:a.propertyId,property:title(a.propertyId),title:String(a.data.title),owner:String(a.data.ownerName),employeeId:String(a.data.responsibleUserId),opening:opening.balance,receipts:(cents(balance.receipts)-cents(opening.receipts))/100,costs:(cents(balance.costs)-cents(opening.costs))/100,fee:(cents(balance.fee)-cents(opening.fee))/100,payouts:(cents(balance.paidOut)-cents(opening.paidOut))/100,balance:balance.balance,available:balance.available});
  }
  const amounts=(rows:ReportRow[])=>sum(rows.map(r=>cents(r.amount)))/100;
  const cash=(propertyId?:string)=>transactions.filter(t=>!propertyId||t.propertyId===propertyId);
  const propertyRows=selectedProperties.map(p=>{
    const tx=cash(p._id),incomes=tx.filter(t=>t.kind==="income"&&t.category!=="deposit"),expenses=tx.filter(t=>t.kind==="expense");
    const receipts=amounts(incomes),costs=amounts(expenses),ownerReceipts=amounts(incomes.filter(t=>t.allocation==="owner")),ownerCosts=amounts(expenses.filter(t=>t.allocation==="owner"));
    const rentDues=selected.filter(r=>r.propertyId===p._id&&r.kind==="income"&&r.data.category==="rent"&&String(r.data.dueDate||r.data.date)>=filter.from&&String(r.data.dueDate||r.data.date)<=filter.to);
    const rentDue=sum(rentDues.map(r=>cents(r.data.amount))),rentPaid=sum(rentDues.map(r=>Math.min(cents(r.data.amount),receivedByRecord.get(r._id)||0)));
    return {rentDue:rentDue/100,rentDueCollected:rentPaid/100,collectionRate:rentDue?`${Math.round(rentPaid/rentDue*10000)/100}%`:"—",id:p._id,propertyId:p._id,property:p.title,category:p.category,receipts,costs,net:(cents(receipts)-cents(costs))/100,ownerNet:(cents(ownerReceipts)-cents(ownerCosts))/100,maintenance:amounts(expenses.filter(t=>t.category==="maintenance")),deposits:amounts(tx.filter(t=>t.kind==="income"&&t.category==="deposit")),fee:sum(owners.filter(o=>o.propertyId===p._id).map(o=>cents(o.fee)))/100,payouts:amounts(tx.filter(t=>t.kind==="payout")),overdue:sum(dues.filter(d=>d.propertyId===p._id&&d.kind==="income"&&Number(d.daysLate)>0).map(d=>cents(d.remaining)))/100};
  });
  const categories=[...new Set(transactions.filter(t=>t.kind==="expense").map(t=>String(t.category)))].sort();
  const expenses=categories.flatMap(category=>["owner","tenant","office"].map(allocation=>{const rows=transactions.filter(t=>t.kind==="expense"&&t.category===category&&t.allocation===allocation);return {id:category+allocation,category,allocation,amount:amounts(rows),count:rows.length};}).filter(r=>r.count>0));
  const months:string[]=[];let month=filter.from.slice(0,7);while(month<=filter.to.slice(0,7)){months.push(month);const [y,m]=month.split("-").map(Number);month=`${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,"0")}`;}
  const trend=months.map(month=>({month,receipts:amounts(transactions.filter(t=>t.date.toString().startsWith(month)&&t.kind==="income"&&t.category!=="deposit")),costs:amounts(transactions.filter(t=>t.date.toString().startsWith(month)&&t.kind==="expense"))}));
  const incomes=transactions.filter(t=>t.kind==="income"&&t.category!=="deposit"),costRows=transactions.filter(t=>t.kind==="expense");
  const summary={receipts:amounts(incomes),costs:amounts(costRows),net:(cents(amounts(incomes))-cents(amounts(costRows)))/100,deposits:amounts(transactions.filter(t=>t.kind==="income"&&t.category==="deposit")),ownerNet:sum(propertyRows.map(r=>cents(r.ownerNet)))/100,officeCashNet:(cents(amounts(incomes.filter(t=>t.allocation==="office")))-cents(amounts(costRows.filter(t=>t.allocation==="office"))))/100,fee:sum(owners.map(r=>cents(r.fee)))/100,payouts:amounts(transactions.filter(t=>t.kind==="payout")),overdue:sum(dues.filter(d=>d.kind==="income"&&Number(d.daysLate)>0).map(d=>cents(d.remaining)))/100,payable:sum(dues.filter(d=>d.kind==="expense").map(d=>cents(d.remaining)))/100,maintenance:amounts(costRows.filter(t=>t.category==="maintenance")),properties:propertyRows.length,reminders:reminders.length,unassigned:unassigned.length};
  return {summary,trend,tables:{properties:propertyRows.sort((a,b)=>a.ownerNet-b.ownerNet),transactions:transactions.sort((a,b)=>String(b.date).localeCompare(String(a.date))),dues:dues.sort((a,b)=>Number(b.daysLate)-Number(a.daysLate)),maintenance,owners,expenses,reminders:reminders.sort((a,b)=>String(a.date).localeCompare(String(b.date)))}};
}
export type ManagementReport=ReturnType<typeof createReport>;
