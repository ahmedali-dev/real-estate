import { NextRequest,NextResponse } from "next/server";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { requireListingsAccess } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { recordInput,editInput,dataSchemas } from "@/lib/management/records";
import { validId,propertyScope,validateLinks,ManagementError } from "@/lib/management/server";
import { ManagementRecord } from "@/models/ManagementRecord";
import { Property } from "@/models/Property";
import { ManagementOperation } from "@/models/ManagementOperation";
import { User } from "@/models/User";

const fail=(error:unknown)=>{
  if(!(error instanceof ManagementError))console.error("Management mutation failure",error instanceof Error?{name:error.name,message:error.message.slice(0,300)}:{name:"Unknown"});
  return NextResponse.json({error:error instanceof ManagementError?error.message:"Unable to save management records."},{status:error instanceof ManagementError?error.status:500});
};
export async function GET(req:NextRequest){
  const {session,response}=await requireListingsAccess();if(response)return response;
  const propertyId=req.nextUrl.searchParams.get("propertyId")||"",id=req.nextUrl.searchParams.get("id");
  if(!validId(propertyId)||(id&&!validId(id)))return NextResponse.json({error:"Invalid record."},{status:400});
  try{
    await connectToDatabase();
    if(!await Property.exists(propertyScope(propertyId,session!.user.role)))return NextResponse.json({error:"Property not found."},{status:404});
    if(req.nextUrl.searchParams.get("options")==="1"){
      const data=await ManagementRecord.find({propertyId,archived:false,kind:{$in:["agreement","lease"]}}).select("kind data.title data.unit data.startDate data.endDate data.status data.agreementId").sort({createdAt:-1}).limit(1000).lean();
      return NextResponse.json({data},{headers:{"Cache-Control":"private, no-store"}});
    }
    const query:Record<string,unknown>={propertyId};
    if(id)query._id=id;
    else {
      query.archived=req.nextUrl.searchParams.get("archived")==="true";
      const kind=req.nextUrl.searchParams.get("kind");
      if(kind&&["agreement","lease","income","expense"].includes(kind))query.kind=kind;
    }
    const page=Math.max(1,Math.min(10000,Number(req.nextUrl.searchParams.get("page"))||1));
    const [data,total]=await Promise.all([ManagementRecord.find(query).select(id?{}:{audit:0}).sort({createdAt:-1,_id:-1}).skip((Math.floor(page)-1)*25).limit(25).lean(),ManagementRecord.countDocuments(query)]);
    const payments=await ManagementOperation.find({propertyId,kind:"payment",status:"posted","data.recordId":{$in:data.map(r=>String(r._id))}}).select("data").lean();
    const enriched=data.map(r=>{if(!["income","expense"].includes(r.kind))return r;const paid=r.data.status==="settled"?Number(r.data.amount):payments.filter(p=>p.data.recordId===String(r._id)).reduce((sum,p)=>sum+Math.round(Number(p.data.amount)*100),0)/100;return {...r,paymentSummary:{paid,remaining:Math.max(0,Math.round(Number(r.data.amount)*100)-Math.round(paid*100))/100}};});
    return NextResponse.json({data:enriched,total},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Unable to load records."},{status:500});}
}
export async function POST(req:NextRequest){return mutate(req,false);}
export async function PATCH(req:NextRequest){return mutate(req,true);}
async function mutate(req:NextRequest,edit:boolean){
  const {session,response}=await requireListingsAccess();if(response)return response;
  if(req.headers.get("origin")!==req.nextUrl.origin)return NextResponse.json({error:"Forbidden"},{status:403});
  const json=await req.json().catch(()=>null);
  const parsed=edit?editInput.safeParse(json):recordInput.safeParse(json);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(i=>i.message).join(" ")},{status:400});
  const requestId=req.headers.get("idempotency-key");
  if(!edit&&(!requestId||!/^[-a-f0-9]{36}$/i.test(requestId)))return NextResponse.json({error:"A valid request key is required."},{status:400});
  await connectToDatabase();
  await ManagementRecord.init();
  const transaction=await mongoose.startSession();
  try{
    let output:unknown;
    await transaction.withTransaction(async()=>{
      const existing=edit?await ManagementRecord.findById(String(json.id)).session(transaction):null;
      if(edit&&!existing)throw new ManagementError("Record not found.",404);
      const propertyId=existing?existing.propertyId.toString():String(json.propertyId);
      // Serialize mutations for this property and protect against concurrent property deletion.
      const locked=await Property.findOneAndUpdate(propertyScope(propertyId,session!.user.role),{$inc:{managementRevision:1},$set:{managementRegistered:true}},{new:true,session:transaction});
      if(!locked)throw new ManagementError("Property not found.",404);
      const actor={actorId:session!.user.id,actorName:session!.user.name||"Staff",at:new Date()};
      if(existing){
        const change=editInput.parse(json);
        const linkedOperation=await ManagementOperation.exists({propertyId,status:{$ne:"reversed"},kind:{$ne:"generate"},$or:[{"data.recordId":existing._id.toString()},{"data.expenseId":existing._id.toString()},{"data.agreementId":existing._id.toString()},{"data.leaseId":existing._id.toString()}]}).session(transaction);
        const postedPayout=await ManagementOperation.exists({propertyId,kind:"payout",status:"posted"}).session(transaction);
        const generated=existing.kind==="lease"&&await ManagementOperation.exists({propertyId,kind:"generate","data.leaseId":existing._id.toString()}).session(transaction);
        if(generated&&(change.archiveReason||!change.data||["unit","agreementId","startDate","endDate","firstDueDate","rentAmount","frequency","deposit","tenantName","tenantPhone"].some(key=>JSON.stringify(existing.data[key])!==JSON.stringify(change.data![key]))))throw new ManagementError("Generated installments lock lease financial terms. You may still update its title, notes or status.",409);
        if((generated||linkedOperation||postedPayout)&&existing.data.status!=="draft"&&change.data?.status==="draft")throw new ManagementError("Records with operational history cannot return to draft.",409);
        const contractMetadataOnly=["agreement","lease"].includes(existing.kind)&&change.data&&!change.archiveReason&&Array.from(new Set([...Object.keys(existing.data),...Object.keys(change.data)])).filter(key=>!["title","notes","status"].includes(key)).every(key=>JSON.stringify(existing.data[key])===JSON.stringify(change.data![key]));
        if((linkedOperation||postedPayout)&&!contractMetadataOnly)throw new ManagementError("This record has operational history or posted owner payouts. Reverse payments/payouts where permitted; keep its original financial terms and history.",409);
        if(existing.version!==change.version||existing.archived)throw new ManagementError("Record changed or archived. Reload before editing.",409);
        if(change.archiveReason){
          if(await ManagementRecord.exists({propertyId,archived:false,$or:[{"data.agreementId":existing._id.toString()},{"data.leaseId":existing._id.toString()}]}).session(transaction))throw new ManagementError("Archive linked records first.",409);
          existing.archived=true;existing.audit.push({...actor,action:"archived",reason:change.archiveReason});
        }else{
          const validate=recordInput.safeParse({propertyId,kind:existing.kind,data:change.data});
          if(!validate.success)throw new ManagementError(validate.error.issues.map(i=>i.message).join(" "));
          const data=dataSchemas[existing.kind].parse(change.data);
          if(existing.kind==="agreement"&&!await User.exists({_id:("responsibleUserId" in data ? data.responsibleUserId : ""),active:true}).session(transaction))throw new ManagementError("Choose an active responsible employee.");
          await validateLinks(propertyId,existing.kind,data,transaction,existing._id.toString());
          existing.audit.push({...actor,action:"updated",before:existing.data,after:data});
          existing.data=data;
        }
        existing.version+=1;
        output=await existing.save({session:transaction});
      }else{
        const input=recordInput.parse(json),data=dataSchemas[input.kind].parse(input.data);
        const requestKey=session!.user.id+":"+requestId;
        const requestHash=createHash("sha256").update(JSON.stringify({propertyId,kind:input.kind,data})).digest("hex");
        const duplicate=await ManagementRecord.findOne({requestKey}).select("+requestHash").session(transaction);
        if(duplicate){
          if(duplicate.propertyId.toString()!==propertyId||duplicate.requestHash!==requestHash)throw new ManagementError("This request key was already used for another record.",409);
          output=duplicate;return;
        }
        if(input.kind==="agreement"&&!await User.exists({_id:("responsibleUserId" in data ? data.responsibleUserId : ""),active:true}).session(transaction))throw new ManagementError("Choose an active responsible employee.");
        await validateLinks(propertyId,input.kind,data,transaction);
        const [created]=await ManagementRecord.create([{requestKey,requestHash,propertyId,kind:input.kind,data,audit:[{...actor,action:"created",after:data}]}],{session:transaction});
        output=created;
      }
    });
    return NextResponse.json({data:output},{status:edit?200:201});
  }catch(error){return fail(error);}
  finally{await transaction.endSession();}
}
