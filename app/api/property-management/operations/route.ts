import { NextRequest,NextResponse } from "next/server";
import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { requireListingsAccess } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { propertyScope,validId,ManagementError } from "@/lib/management/server";
import { operationInput,operationEdit,ownerBalance,paidCents,type Operation,type LedgerRow } from "@/lib/management/operations";
import { leaseSchedule } from "@/lib/management/schedule";
import { ManagementRecord } from "@/models/ManagementRecord";
import { ManagementOperation } from "@/models/ManagementOperation";
import { Property } from "@/models/Property";
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const fail=(e:unknown)=>{if(!(e instanceof ManagementError))console.error("Management operation failed",e instanceof Error?e.message.slice(0,200):"Unknown");return NextResponse.json({error:e instanceof ManagementError?e.message:"Unable to process this operation."},{status:e instanceof ManagementError?e.status:500});};
async function ledger(propertyId:string,session?:mongoose.ClientSession){
  const records=await ManagementRecord.find({propertyId,archived:false}).select("kind data").session(session||null).limit(10001).lean();
  const operations=await ManagementOperation.find({propertyId}).sort({createdAt:1,_id:1}).session(session||null).limit(10001).lean();
  if(records.length>10000||operations.length>10000)throw new ManagementError("Ledger capacity reached. Contact the administrator.",409);
  return {records:records.map(r=>({...r,_id:String(r._id)})) as LedgerRow[],operations:JSON.parse(JSON.stringify(operations)) as Operation[]};
}
export async function GET(req:NextRequest){
  const {session,response}=await requireListingsAccess();if(response)return response;
  const propertyId=req.nextUrl.searchParams.get("propertyId")||"";if(!validId(propertyId))return NextResponse.json({error:"Invalid property."},{status:400});
  try{
    await connectToDatabase();if(!await Property.exists(propertyScope(propertyId,session!.user.role)))throw new ManagementError("Property not found.",404);
    const {records,operations}=await ledger(propertyId);
    const raw=Number(req.nextUrl.searchParams.get("page"));const page=Number.isFinite(raw)?Math.max(1,Math.floor(raw||1)):1;
    const kind=req.nextUrl.searchParams.get("kind")||"maintenance";
    const selected=operations.filter(o=>o.kind===kind||(kind==="payment"&&o.kind==="generate")).reverse();
    return NextResponse.json({data:selected.slice((page-1)*20,page*20),total:selected.length,
      agreements:records.filter(r=>r.kind==="agreement").map(r=>({...r,balance:ownerBalance(r,records,operations,today())})),
      leases:records.filter(r=>r.kind==="lease"),
      obligations:records.filter(r=>r.kind==="income"||r.kind==="expense").map(r=>({...r,paid:paidCents(r,operations)/100,remaining:Math.max(0,Math.round(Number(r.data.amount)*100)-paidCents(r,operations))/100})),
    },{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return fail(e);}
}
export async function POST(req:NextRequest){return mutate(req,false);}
export async function PATCH(req:NextRequest){return mutate(req,true);}
async function mutate(req:NextRequest,edit:boolean){
  const {session,response}=await requireListingsAccess();if(response)return response;
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Forbidden"},{status:403});
  const body=await req.json().catch(()=>null),parsed=edit?operationEdit.safeParse(body):operationInput.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(i=>i.message).join(" ")},{status:400});
  const key=req.headers.get("idempotency-key");if(!edit&&(!key||!/^[-a-f0-9]{36}$/i.test(key)))return NextResponse.json({error:"Request key required."},{status:400});
  await connectToDatabase();await Promise.all([ManagementRecord.init(),ManagementOperation.init()]);const tx=await mongoose.startSession();
  try{
    let output:unknown;
    await tx.withTransaction(async()=>{
      const actor={actorId:session!.user.id,actorName:session!.user.name||"Staff",at:new Date()};
      const existing=edit?await ManagementOperation.findById(body.id).session(tx):null;
      if(edit&&!existing)throw new ManagementError("Operation not found.",404);
      const propertyId=existing?String(existing.propertyId):body.propertyId;
      if(!await Property.findOneAndUpdate(propertyScope(propertyId,session!.user.role),{$inc:{managementRevision:1},$set:{managementRegistered:true}},{session:tx}))throw new ManagementError("Property not found.",404);
      const elevated=session!.user.role!=="project_manager";
      if(existing){
        const input=operationEdit.parse(body);
        if(input.version!==existing.version)throw new ManagementError("Operation changed. Reload first.",409);
        if(input.action==="reverse"){
          if(!elevated)throw new ManagementError("Only office officers can reverse payments or payouts.",403);
          if(!["payment","payout"].includes(existing.kind)||existing.status!=="posted")throw new ManagementError("Only posted payments or payouts can be reversed.",409);
          if(existing.kind==="payment"&&await ManagementOperation.exists({propertyId,kind:"payout",status:"posted"}).session(tx))throw new ManagementError("Reverse owner payouts before reversing payments.",409);
          existing.status="reversed";
        }else{
          if(existing.kind!=="maintenance")throw new ManagementError("This action requires a maintenance request.");
          if(input.action==="approve"){
            if(!elevated)throw new ManagementError("Only office officers can approve maintenance.",403);
            if(existing.status!=="requested")throw new ManagementError("Only requested work can be approved.",409);
            existing.data={...existing.data,approvedAmount:input.approvedAmount};existing.status="approved";
          }else if(input.action==="cancel"){
            if(!["requested","approved"].includes(existing.status))throw new ManagementError("Completed work cannot be cancelled.",409);
            existing.status="cancelled";
          }else{
            if(existing.status!=="approved"||input.actualCost>Number(existing.data.approvedAmount))throw new ManagementError("Complete only approved work within its approved budget.",409);
            if(input.date>today())throw new ManagementError("Completion cannot be in the future.");
            const agreement=await ManagementRecord.findOne({_id:existing.data.agreementId,propertyId,archived:false}).session(tx);
            if(!agreement)throw new ManagementError("Management agreement is unavailable.",409);
            const data={title:String(existing.data.title),unit:String(agreement.data.unit||""),notes:String(existing.data.description),agreementId:String(agreement._id),amount:input.actualCost,date:input.date,counterparty:String(existing.data.supplier),category:"maintenance",payer:String(existing.data.payer),status:"pending",reference:"Maintenance "+existing._id};
            const [expense]=await ManagementRecord.create([{propertyId,kind:"expense",data,audit:[{...actor,action:"created",after:data}]}],{session:tx});
            existing.data={...existing.data,actualCost:input.actualCost,expenseId:String(expense._id),completedDate:input.date};existing.status="completed";
          }
        }
        existing.version++;existing.audit.push({...actor,action:input.action,...("reason" in input?{reason:input.reason}:{})});output=await existing.save({session:tx});return;
      }
      const input=operationInput.parse(body),requestKey=session!.user.id+":"+key,requestHash=createHash("sha256").update(JSON.stringify(input)).digest("hex");
      const duplicate=await ManagementOperation.findOne({requestKey}).select("+requestHash").session(tx);
      if(duplicate){if(duplicate.requestHash!==requestHash)throw new ManagementError("Request key already used with different details.",409);output=duplicate;return;}
      const {records,operations}=await ledger(propertyId,tx);
      let data:Record<string,unknown>={...input};delete data.action;delete data.propertyId;
      let status="posted";
      if(input.action==="maintenance"){
        const agreement=records.find(r=>r._id===input.agreementId&&r.kind==="agreement"&&r.data.status==="active");
        if(!agreement)throw new ManagementError("Choose an active management agreement.");status="requested";
      }else if(input.action==="payment"){
        const record=records.find(r=>r._id===input.recordId&&["income","expense"].includes(r.kind));
        if(!record||record.data.status!=="pending")throw new ManagementError("Choose an unpaid obligation.");
        if(input.date>today())throw new ManagementError("Actual payments cannot be in the future.");
        if(Math.round(input.amount*100)+paidCents(record,operations)>Math.round(Number(record.data.amount)*100))throw new ManagementError("Payment exceeds the outstanding balance.",409);
        data={...data,agreementId:record.data.agreementId||"",direction:record.kind,recordTitle:record.data.title};
      }else if(input.action==="payout"){
        if(!elevated)throw new ManagementError("Only office officers can record owner payouts.",403);
        if(input.date!==today())throw new ManagementError("Record payouts on today’s date so the balance snapshot matches the payment date.");
        const agreement=records.find(r=>r._id===input.agreementId&&r.kind==="agreement");
        if(!agreement||agreement.data.status==="draft")throw new ManagementError("Choose an active or ended agreement.");
        const snapshot=ownerBalance(agreement,records,operations,today());
        if(Math.round(input.amount*100)>Math.round(snapshot.available*100))throw new ManagementError("Payout exceeds the owner's available balance.",409);
        data={...data,snapshot,ownerName:agreement.data.ownerName,agreementTitle:agreement.data.title};
      }else{
        const lease=records.find(r=>r._id===input.leaseId&&r.kind==="lease"&&r.data.status==="active");
        if(!lease)throw new ManagementError("Choose an active lease.");
        if(operations.some(o=>o.kind==="generate"&&o.data.leaseId===input.leaseId))throw new ManagementError("This lease already has a generated schedule.",409);
        if(records.some(r=>r.kind==="income"&&r.data.leaseId===input.leaseId&&r.data.category==="rent"))throw new ManagementError("This lease already has rent records. Reconcile existing entries before generation.",409);
        const schedule=leaseSchedule(String(lease.data.firstDueDate),String(lease.data.endDate),String(lease.data.frequency),Number(lease.data.rentAmount));
        if(!schedule.length)throw new ManagementError("Lease schedule is empty.");
        await ManagementRecord.create(schedule.map(i=>{const d={title:`${lease.data.title} · ${i.dueDate}`,unit:lease.data.unit||"",notes:"Generated lease installment",amount:i.amount,date:i.dueDate,dueDate:i.dueDate,agreementId:lease.data.agreementId,leaseId:lease._id,counterparty:lease.data.tenantName,category:"rent",beneficiary:"owner",status:"pending",reference:""};return {propertyId,kind:"income",data:d,audit:[{...actor,action:"created",after:d}]};}),{session:tx,ordered:true});
        data={...data,count:schedule.length};
      }
      const [created]=await ManagementOperation.create([{propertyId,kind:input.action,status,data,requestKey,requestHash,audit:[{...actor,action:"created"}]}],{session:tx});output=created;
    });
    return NextResponse.json({data:output},{status:edit?200:201});
  }catch(e){return fail(e);}finally{await tx.endSession();}
}
