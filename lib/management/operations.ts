import { z } from "zod";
import { leaseSchedule } from "./schedule";
const id=z.string().regex(/^[a-f\d]{24}$/i);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const d=new Date(v);return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;});
const money=z.number().finite().positive().max(1e12).multipleOf(.01);
export const operationInput=z.discriminatedUnion("action",[
  z.object({action:z.literal("maintenance"),propertyId:id,agreementId:id,title:z.string().trim().min(2).max(160),description:z.string().trim().min(5).max(2000),supplier:z.string().trim().min(2).max(160),estimate:money,payer:z.enum(["owner","tenant","office"]),priority:z.enum(["normal","urgent"])}).strict(),
  z.object({action:z.literal("payment"),propertyId:id,recordId:id,amount:money,date,reference:z.string().trim().min(2).max(160)}).strict(),
  z.object({action:z.literal("payout"),propertyId:id,agreementId:id,amount:money,date,reference:z.string().trim().min(2).max(160)}).strict(),
  z.object({action:z.literal("generate"),propertyId:id,leaseId:id}).strict(),
]);
export const operationEdit=z.discriminatedUnion("action",[
  z.object({action:z.literal("approve"),id,version:z.number().int().nonnegative(),approvedAmount:money}).strict(),
  z.object({action:z.literal("complete"),id,version:z.number().int().nonnegative(),actualCost:money,date}).strict(),
  z.object({action:z.literal("cancel"),id,version:z.number().int().nonnegative(),reason:z.string().trim().min(5).max(500)}).strict(),
  z.object({action:z.literal("reverse"),id,version:z.number().int().nonnegative(),reason:z.string().trim().min(5).max(500)}).strict(),
]);
export interface Operation { _id:string;propertyId:string;kind:"maintenance"|"payment"|"payout"|"generate";status:string;version:number;data:Record<string,unknown>;audit:{action:string;actorName:string;at:string;reason?:string}[] }
export interface LedgerRow { _id:string;kind:string;data:Record<string,unknown>;archived?:boolean }
const cents=(v:unknown)=>Math.round(Number(v||0)*100);
export function paidCents(record:LedgerRow,payments:Operation[]){
  if(record.data.status==="settled")return cents(record.data.amount);
  return payments.filter(p=>p.kind==="payment"&&p.status==="posted"&&p.data.recordId===String(record._id)).reduce((sum,p)=>sum+cents(p.data.amount),0);
}
export function ownerBalance(agreement:LedgerRow,records:LedgerRow[],operations:Operation[],today:string){
  operations=operations.filter(o=>!o.data.date||String(o.data.date)<=today);
  const leases=new Map(records.filter(r=>r.kind==="lease").map(r=>[r._id,r]));
  const related=records.filter(r=>!r.archived&&(r.data.agreementId===String(agreement._id)||leases.get(String(r.data.leaseId))?.data.agreementId===String(agreement._id)));
  const paidTotals=new Map<string,number>();
  for(const o of operations)if(o.kind==="payment"&&o.status==="posted")paidTotals.set(String(o.data.recordId),(paidTotals.get(String(o.data.recordId))||0)+cents(o.data.amount));
  let receipts=0,costs=0,collectedRent=0;
  for(const r of related){
    const paid=r.data.status==="settled"?(String(r.data.settledDate)>today?0:cents(r.data.amount)):(paidTotals.get(r._id)||0);
    if(r.kind==="income"&&r.data.beneficiary==="owner"&&r.data.category!=="deposit"){receipts+=paid;if(r.data.category==="rent")collectedRent+=paid;}
    if(r.kind==="expense"&&r.data.payer==="owner")costs+=paid;
  }
  const scheduled=related.filter(r=>r.kind==="lease"&&r.data.status!=="draft").flatMap(r=>leaseSchedule(String(r.data.firstDueDate),String(r.data.endDate),String(r.data.frequency),Number(r.data.rentAmount))).filter(i=>i.dueDate<=today).reduce((sum,i)=>sum+cents(i.amount),0);
  const fee=agreement.data.status==="draft"||String(agreement.data.startDate)>today?0:agreement.data.feeBasis==="fixed"?cents(agreement.data.fixedFee):Math.round((agreement.data.feeBasis==="scheduled_rent"?scheduled:collectedRent)*Number(agreement.data.commissionRate)/100);
  const paidOut=operations.filter(o=>o.kind==="payout"&&o.status==="posted"&&o.data.agreementId===String(agreement._id)).reduce((sum,o)=>sum+cents(o.data.amount),0);
  return {receipts:receipts/100,costs:costs/100,fee:fee/100,paidOut:paidOut/100,balance:(receipts-costs-fee-paidOut)/100,available:Math.max(0,receipts-costs-fee-paidOut)/100};
}
