/* Opt-in integration test. Creates and drops ONLY its own randomly named database. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
if(process.env.RUN_MANAGEMENT_INTEGRATION!=="1"){console.log("Set RUN_MANAGEMENT_INTEGRATION=1 to test in an isolated temporary database.");process.exit(0);}
const config={};dotenv.config({path:[".env.local",".env"],processEnv:config,quiet:true});
const original=process.env.MONGODB_URI||config.MONGODB_URI;
if(!original)throw new Error("MONGODB_URI is required.");
const dbName="estate_stage1_it_"+crypto.randomBytes(8).toString("hex");
const uri=new URL(original);uri.pathname="/"+dbName;if(!uri.searchParams.has("authSource"))uri.searchParams.set("authSource","admin");
const origin="http://localhost:3012";
const password=crypto.randomBytes(24).toString("hex");
let connection,server,step="connect",serverErrors="";
const jars={};
async function call(path,{method="GET",body,role="admin",key}={}){
  const headers={Origin:origin,...(jars[role]?{Cookie:jars[role]}:{})};
  if(key)headers["Idempotency-Key"]=key;
  if(body&&!(body instanceof FormData))headers["Content-Type"]="application/json";
  const response=await fetch(origin+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined,redirect:"manual"});
  return {response,result:response.headers.get("content-type")?.includes("json")?await response.json():null};
}
async function login(role){
  const cookies=new Map();
  function remember(response){for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(";")[0];cookies.set(pair.slice(0,pair.indexOf("=")),pair);}}
  const csrf=await fetch(origin+"/api/auth/csrf");remember(csrf);const {csrfToken}=await csrf.json();
  const signed=await fetch(origin+"/api/auth/callback/credentials",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Cookie:[...cookies.values()].join("; ")},body:new URLSearchParams({identifier:role+"@stage1.invalid",password,csrfToken,json:"true",callbackUrl:origin+"/dashboard/management"}),redirect:"manual"});
  remember(signed);jars[role]=[...cookies.values()].join("; ");
  const check=await call("/api/auth/session",{role});assert.equal(check.result?.user?.role,role);
}
async function create(kind,propertyId,data,key=crypto.randomUUID()){
  const result=await call("/api/property-management/records",{method:"POST",key,body:{kind,propertyId,data}});
  assert.equal(result.response.status,201,JSON.stringify(result.result));return result.result.data;
}
try{
  connection=await mongoose.createConnection(uri.href,{dbName,serverSelectionTimeoutMS:12000}).asPromise();
  const ids={admin:new mongoose.Types.ObjectId(),project_manager:new mongoose.Types.ObjectId(),sales_officer:new mongoose.Types.ObjectId()};
  await connection.collection("users").insertMany(Object.entries(ids).map(([role,_id])=>({_id,name:"Stage1 "+role,email:role+"@stage1.invalid",role,passwordHash:bcrypt.hashSync(password,8),active:true})));
  server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","localhost","--port","3012"],{env:{...process.env,...config,MONGODB_URI:uri.href,NEXTAUTH_URL:origin,NEXTAUTH_SECRET:crypto.randomBytes(32).toString("hex")},stdio:["ignore","ignore","pipe"]});
  server.stderr.on("data",chunk=>{serverErrors=(serverErrors+chunk.toString()).slice(-10000);});
  step="start";let ready=false;for(let i=0;i<40;i++){try{await fetch(origin+"/login");ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,250));}}assert.ok(ready);
  step="authentication";await login("admin");await login("project_manager");await login("sales_officer");
  const anon=await call("/api/property-management/records?propertyId="+ids.admin,{role:"anonymous"});assert.equal(anon.response.status,401);
  step="create isolated properties";
  const listing={title:"Stage1 isolated building",description:"Temporary integration test property.",listingType:"sale",owner:{name:"Reusable owner",phone:"0551234567",email:"owner@stage1.invalid",notes:"Owner note"},units:[{number:"101"},{number:"102"}]};
  const created=await call("/api/properties",{method:"POST",body:{...listing,category:"build"}});assert.equal(created.response.status,201);const propertyId=created.result.data._id;
  const land=await call("/api/properties",{method:"POST",body:{...listing,category:"land",units:[],owner:{name:"Land-only owner",phone:"0559876543"}}});assert.equal(land.response.status,201);
  step="saved owner selector access, search and deduplication";
  assert.equal((await call("/api/owners",{role:"anonymous"})).response.status,401);
  assert.equal((await call("/api/owners",{role:"sales_officer"})).response.status,403);
  const allOwners=await call("/api/owners");assert.equal(allOwners.response.status,200);assert.equal(allOwners.result.data.length,2);assert.equal(allOwners.response.headers.get("cache-control"),"private, no-store");
  const buildOwners=await call("/api/owners",{role:"project_manager"});assert.equal(buildOwners.result.data.length,1);assert.equal(buildOwners.result.data[0].name,"Reusable owner");assert.equal(buildOwners.result.data[0].notes,"Owner note");
  assert.equal((await call("/api/owners?search="+encodeURIComponent(".*"))).result.data.length,0);
  const selectedOwner=buildOwners.result.data[0];
  const reused=await call("/api/properties",{method:"POST",body:{title:"Owner reuse test",description:"Disposable owner reuse fixture",category:"apartment",listingType:"sale",owner:{name:selectedOwner.name,phone:selectedOwner.phone,email:selectedOwner.email,notes:selectedOwner.notes}}});assert.equal(reused.response.status,201);assert.equal(reused.result.data.owner.email,"owner@stage1.invalid");
  assert.equal((await call("/api/owners")).result.data.length,2);
  step="quick owner and availability edits";
  const quick=await call("/api/properties/"+reused.result.data._id,{method:"PATCH",body:{owner:{name:"Updated contact",phone:"0552222222",email:"updated@stage1.invalid",notes:"Updated note"},status:"sold"}});assert.equal(quick.response.status,200);assert.equal(quick.result.data.owner.name,"Updated contact");assert.equal(quick.result.data.status,"sold");assert.equal(quick.result.data.description,reused.result.data.description);
  const wrongStatus=await call("/api/properties/"+reused.result.data._id,{method:"PATCH",body:{status:"rented"}});assert.equal(wrongStatus.response.status,400);
  const available=await call("/api/properties/"+reused.result.data._id,{method:"PATCH",body:{status:"available",owner:null}});assert.equal(available.response.status,200);assert.equal(available.result.data.owner,undefined);assert.equal(available.result.data.status,"available");
  const noPermission=await call("/api/properties/"+reused.result.data._id,{method:"PATCH",role:"project_manager",body:{owner:{name:"Wrong scope",phone:"0552222222"}}});assert.equal(noPermission.response.status,403);
  console.log("PASS: quick owner updates/removal, availability, listing-type rules and role scope.");
  console.log("PASS: saved-owner lookup, private access, building scope, literal search and owner reuse without duplicate options.");
  if(process.env.MANAGEMENT_OWNERS_ONLY!=="1"){
  step="agreements and leases";
  const agreementData={title:"Management agreement",unit:"",ownerName:"Test owner",ownerPhone:"0551234567",responsibleUserId:ids.admin.toString(),startDate:"2026-01-01",endDate:"2027-12-31",scope:"whole_property",feeBasis:"collected_rent",commissionRate:10,status:"active",notes:"Private agreement"};
  const agreement=await create("agreement",propertyId,agreementData);
  const overlap=await call("/api/property-management/records",{method:"POST",key:crypto.randomUUID(),body:{kind:"agreement",propertyId,data:agreementData}});assert.equal(overlap.response.status,409);
  const leaseData={title:"Unit 101 lease",unit:"101",agreementId:agreement._id,tenantName:"Test tenant",tenantPhone:"0551234567",startDate:"2026-01-01",endDate:"2026-12-31",firstDueDate:"2026-01-31",rentAmount:1000,frequency:"monthly",status:"active",deposit:1000};
  const lease=await create("lease",propertyId,leaseData);
  const endAgreement=await call("/api/property-management/records",{method:"PATCH",body:{id:agreement._id,version:0,data:{...agreementData,status:"ended"}}});assert.equal(endAgreement.response.status,409);
  const leaseOverlap=await call("/api/property-management/records",{method:"POST",key:crypto.randomUUID(),body:{kind:"lease",propertyId,data:leaseData}});assert.equal(leaseOverlap.response.status,409);
  step="financial retry protection and audit";
  const key=crypto.randomUUID(),expenseData={title:"Maintenance invoice",unit:"101",amount:500,date:"2026-01-01",counterparty:"Test supplier",status:"pending",category:"maintenance",payer:"owner",notes:"Private expense"};
  const expense=await create("expense",propertyId,expenseData,key);
  const changedRetry=await call("/api/property-management/records",{method:"POST",key,body:{kind:"expense",propertyId,data:{...expenseData,amount:999}}});assert.equal(changedRetry.response.status,409);
  const retry=await create("expense",propertyId,expenseData,key);assert.equal(retry._id,expense._id);assert.equal(retry.audit.length,1);
  const revised=await call("/api/property-management/records",{method:"PATCH",body:{id:expense._id,version:0,data:{...expenseData,amount:800}}});assert.equal(revised.response.status,200);assert.equal(revised.result.data.audit.length,2);assert.equal(revised.result.data.audit[1].before.amount,500);assert.equal(revised.result.data.audit[1].after.amount,800);
  const stale=await call("/api/property-management/records",{method:"PATCH",body:{id:expense._id,version:0,data:expenseData}});assert.equal(stale.response.status,409);
  step="private attachments";
  const upload=new FormData();upload.set("recordId",expense._id);upload.set("version","1");upload.set("file",new Blob(["%PDF-1.7\nTemporary test\n%%EOF"],{type:"application/pdf"}),"test-invoice.pdf");
  const attached=await call("/api/property-management/attachments",{method:"POST",body:upload});assert.equal(attached.response.status,201);
  const fileId=attached.result.data.attachments[0].id;
  const privateFile=await call("/api/property-management/attachments?id="+fileId,{role:"anonymous"});assert.equal(privateFile.response.status,401);
  const download=await call("/api/property-management/attachments?id="+fileId);assert.equal(download.response.status,200);assert.match(await download.response.text(),/%PDF-1.7/);assert.equal(download.response.headers.get("cache-control"),"private, no-store");
  step="role boundaries and linked record protection";
  const forbidden=await call("/api/property-management/records?propertyId="+land.result.data._id,{role:"project_manager"});assert.equal(forbidden.response.status,404);
  const cross=await call("/api/property-management/records",{method:"POST",key:crypto.randomUUID(),body:{kind:"lease",propertyId:land.result.data._id,data:leaseData}});assert.equal(cross.response.status,400);
  const archive=await call("/api/property-management/records",{method:"PATCH",body:{id:agreement._id,version:0,archiveReason:"Test archive"}});assert.equal(archive.response.status,409);
  const unitRemoval=await call("/api/properties/"+propertyId,{method:"PUT",body:{...listing,category:"build",units:[{number:"102"}]}});assert.equal(unitRemoval.response.status,409);
  const deletion=await call("/api/properties/"+propertyId,{method:"DELETE"});assert.equal(deletion.response.status,409);
  const archivedExpense=await call("/api/property-management/records",{method:"PATCH",body:{id:expense._id,version:2,archiveReason:"Duplicate test invoice"}});assert.equal(archivedExpense.response.status,200);assert.equal(archivedExpense.result.data.archived,true);assert.equal(archivedExpense.result.data.audit.length,4);
  step="Stage 2 maintenance and approval";
  async function operate(body,key=crypto.randomUUID(),role="admin"){
    const r=await call("/api/property-management/operations",{method:"POST",key,role,body:{...body,propertyId}});
    assert.equal(r.response.status,201,JSON.stringify(r.result));return r.result.data;
  }
  async function changeOperation(body,expected=200,role="admin"){
    const r=await call("/api/property-management/operations",{method:"PATCH",role,body});assert.equal(r.response.status,expected,JSON.stringify(r.result));return r.result?.data;
  }
  const work=await operate({action:"maintenance",agreementId:agreement._id,title:"Repair water leak",description:"Replace damaged kitchen pipe",supplier:"Test plumber",estimate:200,payer:"owner",priority:"urgent"});
  await changeOperation({action:"complete",id:work._id,version:0,actualCost:150,date:"2026-01-01"},409);
  await changeOperation({action:"approve",id:work._id,version:0,approvedAmount:180},403,"project_manager");
  await changeOperation({action:"approve",id:work._id,version:0,approvedAmount:180});
  await changeOperation({action:"complete",id:work._id,version:1,actualCost:200,date:"2026-01-01"},409);
  const complete=await changeOperation({action:"complete",id:work._id,version:1,actualCost:150,date:"2026-01-01"});
  assert.ok(complete.data.expenseId);
  await changeOperation({action:"complete",id:work._id,version:1,actualCost:150,date:"2026-01-01"},409);
  assert.equal(await connection.collection("managementrecords").countDocuments({"data.reference":"Maintenance "+work._id}),1);
  step="Stage 2 rent generation and partial payment";
  const genKey=crypto.randomUUID();const generated=await operate({action:"generate",leaseId:lease._id},genKey);assert.equal(generated.data.count,12);
  const genRetry=await operate({action:"generate",leaseId:lease._id},genKey);assert.equal(generated._id,genRetry._id);
  const duplicateGen=await call("/api/property-management/operations",{method:"POST",key:crypto.randomUUID(),body:{action:"generate",leaseId:lease._id,propertyId}});assert.equal(duplicateGen.response.status,409);
  const rent=await connection.collection("managementrecords").findOne({propertyId:new mongoose.Types.ObjectId(propertyId),kind:"income","data.leaseId":lease._id},{sort:{"data.dueDate":1}});
  const payKey=crypto.randomUUID();const pay=await operate({action:"payment",recordId:String(rent._id),amount:400,date:"2026-01-31",reference:"Bank receipt 1"},payKey);
  assert.equal((await operate({action:"payment",recordId:String(rent._id),amount:400,date:"2026-01-31",reference:"Bank receipt 1"},payKey))._id,pay._id);
  const overpay=await call("/api/property-management/operations",{method:"POST",key:crypto.randomUUID(),body:{action:"payment",propertyId,recordId:String(rent._id),amount:601,date:"2026-02-01",reference:"Too much"}});assert.equal(overpay.response.status,409);
  await operate({action:"payment",recordId:String(rent._id),amount:600,date:"2026-02-01",reference:"Bank receipt 2"});
  await operate({action:"payment",recordId:complete.data.expenseId,amount:150,date:"2026-02-01",reference:"Plumber paid"});
  let ops=await call("/api/property-management/operations?propertyId="+propertyId+"&kind=payment");
  assert.equal(ops.result.obligations.find(r=>r._id===String(rent._id)).remaining,0);
  assert.equal(ops.result.agreements[0].balance.available,750);
  const immutable=await call("/api/property-management/records",{method:"PATCH",body:{id:String(rent._id),version:0,archiveReason:"Remove paid installment"}});assert.equal(immutable.response.status,409);
  step="Stage 2 payouts and reversals";
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const excessive=await call("/api/property-management/operations",{method:"POST",key:crypto.randomUUID(),body:{action:"payout",propertyId,agreementId:agreement._id,amount:751,date:today,reference:"Too much payout"}});assert.equal(excessive.response.status,409);
  const payout=await operate({action:"payout",agreementId:agreement._id,amount:500,date:today,reference:"Owner transfer 1"});assert.equal(payout.data.snapshot.available,750);
  ops=await call("/api/property-management/operations?propertyId="+propertyId+"&kind=payout");assert.equal(ops.result.agreements[0].balance.available,250);
  await changeOperation({action:"reverse",id:pay._id,version:0,reason:"Correction requested"},409);
  await changeOperation({action:"reverse",id:payout._id,version:0,reason:"Transfer was cancelled"});
  await changeOperation({action:"reverse",id:pay._id,version:0,reason:"Receipt was duplicated"});
  ops=await call("/api/property-management/operations?propertyId="+propertyId+"&kind=payment");assert.equal(ops.result.obligations.find(r=>r._id===String(rent._id)).remaining,400);assert.equal(ops.result.agreements[0].balance.available,390);
  step="Stage 2 concurrent payments and lifecycle locks";
  const secondRent=await connection.collection("managementrecords").findOne({propertyId:new mongoose.Types.ObjectId(propertyId),kind:"income","data.leaseId":lease._id,"data.dueDate":"2026-02-28"});
  const concurrent=await Promise.all([1,2].map(i=>call("/api/property-management/operations",{method:"POST",key:crypto.randomUUID(),body:{action:"payment",propertyId,recordId:String(secondRent._id),amount:700,date:"2026-03-01",reference:"Concurrent "+i}})));
  assert.deepEqual(concurrent.map(r=>r.response.status).sort(),[201,409]);
  const winner=concurrent.find(r=>r.response.status===201).result.data;
  await changeOperation({action:"reverse",id:winner._id,version:0,reason:"Undo concurrency test receipt"});
  const ended=await call("/api/property-management/records",{method:"PATCH",body:{id:lease._id,version:0,data:{...leaseData,status:"ended"}}});assert.equal(ended.response.status,200,JSON.stringify(ended.result));
  const repriced=await call("/api/property-management/records",{method:"PATCH",body:{id:lease._id,version:1,data:{...leaseData,status:"ended",rentAmount:900}}});assert.equal(repriced.response.status,409);
  const backToDraft=await call("/api/property-management/records",{method:"PATCH",body:{id:lease._id,version:1,data:{...leaseData,status:"draft"}}});assert.equal(backToDraft.response.status,409);
  const scope=await call("/api/property-management/operations?propertyId="+land.result.data._id,{role:"project_manager"});assert.equal(scope.response.status,404);
  step="Stage 3 reports, access and exports";
  const reportPath="/api/property-management/reports?from=2026-01-01&to="+today+"&propertyId="+propertyId;
  const unauthReport=await call(reportPath+"&format=csv",{role:"anonymous"});assert.equal(unauthReport.response.status,401);
  const salesReport=await call(reportPath,{role:"sales_officer"});assert.equal(salesReport.response.status,403);
  const report=await call(reportPath);assert.equal(report.response.status,200,JSON.stringify(report.result));assert.equal(report.result.summary.receipts,600);assert.equal(report.result.summary.costs,150);assert.equal(report.result.summary.fee,60);assert.equal(report.result.summary.payouts,0);assert.equal(report.result.summary.ownerNet,450);
  assert.equal(report.response.headers.get("cache-control"),"private, no-store");
  const ownerReport=await call(reportPath+"&view=owners");assert.equal(ownerReport.result.data[0].balance,390);
  const managerReport=await call(reportPath,{role:"project_manager"});assert.equal(managerReport.response.status,200);
  const hiddenLand=await call("/api/property-management/reports?propertyId="+land.result.data._id,{role:"project_manager"});assert.equal(hiddenLand.response.status,404);
  const invalidReport=await call("/api/property-management/reports?from=2026-02-30&to="+today);assert.equal(invalidReport.response.status,400);
  await connection.collection("managementrecords").insertMany(Array.from({length:35},(_,i)=>({propertyId:new mongoose.Types.ObjectId(propertyId),kind:"income",archived:false,version:0,data:{title:i===0?"=HYPERLINK(test)":"Export fixture "+i,amount:1,date:"2026-01-05",settledDate:"2026-01-05",category:"commission",beneficiary:"office",status:"settled",counterparty:"Test office receipt",notes:"",unit:""},attachments:[],audit:[]})));
  const paged=await call(reportPath+"&view=transactions");assert.equal(paged.result.data.length,25);assert.equal(paged.result.total,37);
  const secondPage=await call(reportPath+"&view=transactions&page=2");assert.equal(secondPage.result.data.length,12);
  const csv=await call(reportPath+"&view=transactions&page=2&format=csv&lang=en");assert.equal(csv.response.status,200);const csvText=await csv.response.text();assert.equal(csvText.split("\r\n").filter(Boolean).length,38);assert.ok(csvText.includes("'=HYPERLINK(test)"));assert.ok(csv.response.headers.get("content-disposition").includes("attachment"));
  const printed=await call(reportPath+"&view=transactions&format=print&lang=ar");assert.equal(printed.response.status,200);const printHtml=await printed.response.text();assert.ok(printHtml.includes('dir="rtl"'));assert.ok(printHtml.includes("Export fixture 34"));assert.ok(printed.response.headers.get("content-security-policy").includes("default-src 'none'"));
  console.log("PASS: Stage 3 report reconciliation, role scopes, invalid dates, pagination, full CSV/print exports and formula protection.");
  console.log("PASS: Stage 2 approvals, budget limits, one-time expenses/installments, partial payments, retry protection, overpayment guards, payout balances and reversals.");
  console.log("PASS: authentication, role scopes, agreements, lease conflicts, financial retry safety, audit history, private documents, archive and deletion guards.");
  }
}catch(error){
  console.error("Stage 1 integration failed at: "+step);
  if(error instanceof assert.AssertionError)console.error(error.message);
  console.error(serverErrors.split("\n").filter(line=>line.includes("Management operation failed")).join("\n"));
  process.exitCode=1;
}finally{
  server?.kill();
  if(connection){if(!/^estate_stage1_it_[a-f0-9]{16}$/.test(dbName))throw new Error("Refusing cleanup.");await connection.dropDatabase();await connection.close();console.log("Temporary test database removed. Existing application databases were not modified.");}
}
