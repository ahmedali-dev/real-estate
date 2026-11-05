import { NextRequest,NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireListingsAccess,isBuildOnlyRole } from "@/lib/auth/requireSession";
import { connectToDatabase } from "@/lib/mongodb/connect";
import { ManagementError } from "@/lib/management/server";
import { createReport,reportViews,reportFilterSchema,riyadhToday,type ReportRecord,type ReportProperty,type ReportView } from "@/lib/management/reports";
import { reportCsv,reportPrint } from "@/lib/management/report-display";
import type { Operation } from "@/lib/management/operations";
import { Property } from "@/models/Property";
import { ManagementRecord } from "@/models/ManagementRecord";
import { ManagementOperation } from "@/models/ManagementOperation";
import { User } from "@/models/User";
const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow"};
export async function GET(req:NextRequest){
 const {session,response}=await requireListingsAccess();if(response)return response;
 const p=req.nextUrl.searchParams,today=riyadhToday();
 const parsed=reportFilterSchema.safeParse({from:p.get("from")||today.slice(0,4)+"-01-01",to:p.get("to")||today,...Object.fromEntries(["propertyId","agreementId","employeeId","category"].flatMap(key=>p.get(key)?[[key,p.get(key)]]:[]))});
 const view=(p.get("view")||"properties") as ReportView,format=p.get("format")||"json";
 if(!parsed.success||parsed.data.to>today||!reportViews.includes(view)||!["json","csv","print"].includes(format))return NextResponse.json({error:"Choose valid filters, a period ending no later than today, and a supported report format."},{status:400,headers});
 let tx:mongoose.ClientSession|undefined;
 try{
  await connectToDatabase();tx=await mongoose.startSession();
  let properties:ReportProperty[]=[],records:ReportRecord[]=[],operations:Operation[]=[],employees:{id:string;name:string}[]=[];
  await tx.withTransaction(async()=>{
   const scope=isBuildOnlyRole(session!.user.role)?{category:"build"}:{};
   const docs=await Property.find({...scope,$or:[{managementRegistered:true},{management:{$exists:true}},...(parsed.data.propertyId?[{_id:parsed.data.propertyId}]:[])]}).select("title category").sort({title:1,_id:1}).limit(2001).session(tx!).lean();
   if(docs.length>2000)throw new ManagementError("Report capacity reached. Contact the administrator to increase the reporting capacity.",409);
   properties=docs.map(d=>({_id:String(d._id),title:d.title,category:d.category}));
   if(parsed.data.propertyId&&!properties.some(d=>d._id===parsed.data.propertyId))throw new ManagementError("Property not found.",404);
   if(isBuildOnlyRole(session!.user.role)&&parsed.data.category&&parsed.data.category!=="build")throw new ManagementError("Category outside your access.",403);
   const ids=properties.map(d=>d._id);
   const rawRecords=await ManagementRecord.find({propertyId:{$in:ids},archived:false}).select("propertyId kind data").sort({_id:1}).limit(20001).session(tx!).lean();
   const rawOps=await ManagementOperation.find({propertyId:{$in:ids}}).select("propertyId kind status data audit").sort({_id:1}).limit(20001).session(tx!).lean();
   if(rawRecords.length>20000||rawOps.length>20000)throw new ManagementError("Report capacity reached. No partial totals or export were produced.",409);
   records=rawRecords.map(r=>({...r,_id:String(r._id),propertyId:String(r.propertyId)}));
   operations=JSON.parse(JSON.stringify(rawOps));
   const responsible=[...new Set(records.filter(r=>r.kind==="agreement").map(r=>r.data.responsibleUserId))];
   const users=await User.find({_id:{$in:responsible}}).select("name").session(tx!).lean();employees=users.map(u=>({id:String(u._id),name:u.name}));
  },{readConcern:{level:"snapshot"}});
  const filter=parsed.data,agreements=records.filter(r=>r.kind==="agreement").map(r=>({id:r._id,propertyId:r.propertyId,title:String(r.data.title),owner:String(r.data.ownerName),employeeId:String(r.data.responsibleUserId)}));
  if(filter.agreementId&&!agreements.some(a=>a.id===filter.agreementId))throw new ManagementError("Agreement not found.",404);
  if(filter.employeeId&&!employees.some(e=>e.id===filter.employeeId))throw new ManagementError("Responsible employee not found in your scope.",404);
  const report=createReport(properties,records,operations,filter),allRows=report.tables[view],generatedAt=new Date().toISOString(),ar=p.get("lang")!=="en";
  if(format==="csv")return new NextResponse(reportCsv(allRows,view,filter,ar,generatedAt),{headers:{...headers,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="41-management-${view}-${filter.from}-${filter.to}.csv"`}});
  if(format==="print")return new NextResponse(reportPrint(allRows,view,report,filter,ar,generatedAt,{propertyId:properties.find(d=>d._id===filter.propertyId)?.title,agreementId:agreements.find(a=>a.id===filter.agreementId)?.title,employeeId:employees.find(e=>e.id===filter.employeeId)?.name}),{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"}});
  const rawPage=Number(p.get("page")),page=Number.isFinite(rawPage)?Math.min(10000,Math.max(1,Math.floor(rawPage||1))):1;
  return NextResponse.json({filter,view,page,total:allRows.length,data:allRows.slice((page-1)*25,page*25),summary:report.summary,trend:report.trend,generatedAt,options:{properties,agreements,employees}},{headers});
 }catch(e){return NextResponse.json({error:e instanceof ManagementError?e.message:"Unable to produce a complete report. Please retry."},{status:e instanceof ManagementError?e.status:500,headers});}finally{await tx?.endSession();}
}
