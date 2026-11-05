import assert from "node:assert/strict";
import test from "node:test";
import { recordInput,editInput,financialTotals } from "../lib/management/records";
import { leaseSchedule } from "../lib/management/schedule";
import { attachmentMime,safeAttachmentName,maxAttachmentBytes } from "../lib/management/attachments";
import { propertyScope } from "../lib/management/server";
import { ManagementRecord } from "../models/ManagementRecord";

const propertyId="0123456789abcdef01234567";
const base={title:"Management contract",unit:"",notes:"Private note"};
const agreement={...base,ownerName:"Owner",ownerPhone:"0551234567",responsibleUserId:propertyId,startDate:"2026-01-01",endDate:"2027-12-31",scope:"whole_property",feeBasis:"collected_rent",commissionRate:10,status:"active"};
const lease={...base,agreementId:propertyId,tenantName:"Tenant",tenantPhone:"0551234567",startDate:"2026-01-01",endDate:"2026-12-31",firstDueDate:"2026-01-31",rentAmount:1000,frequency:"monthly",status:"active"};
const finance={...base,amount:500,date:"2026-01-01",counterparty:"Supplier",status:"pending",category:"maintenance",payer:"owner"};
const valid=(kind:string,data:unknown)=>recordInput.safeParse({propertyId,kind,data}).success;
test("agreements require an explicit correct fee basis and valid scope and dates",()=>{
  assert.ok(valid("agreement",agreement));
  assert.ok(valid("agreement",{...agreement,feeBasis:"fixed",commissionRate:undefined,fixedFee:200}));
  for(const data of [{...agreement,commissionRate:4},{...agreement,fixedFee:100},{...agreement,commissionRate:undefined},{...agreement,scope:"unit"},{...agreement,endDate:"2025-01-01"},{...agreement,endDate:"2026-02-30"}])assert.equal(valid("agreement",data),false);
});
test("lease validation checks rent, dates, deposit and first installment",()=>{
  assert.ok(valid("lease",lease));
  for(const data of [{...lease,rentAmount:0},{...lease,deposit:-5},{...lease,firstDueDate:"2027-01-01"},{...lease,endDate:"2025-01-01"}])assert.equal(valid("lease",data),false);
});
test("expenses distinguish planned cost from paid cost and validate actual payment dates",()=>{
  assert.ok(valid("expense",finance));
  assert.ok(valid("expense",{...finance,status:"settled",settledDate:"2025-12-31"})); // Advance payments are valid.
  assert.equal(valid("expense",{...finance,status:"settled"}),false);
  assert.equal(valid("expense",{...finance,settledDate:"2026-01-01"}),false);
  assert.equal(valid("expense",{...finance,amount:1.005}),false);
  assert.equal(valid("expense",{...finance,payer:"unknown"}),false);
});
test("income records identify the beneficiary and reject unrelated client fields",()=>{
  const {payer,...rest}=finance;void payer;
  assert.ok(valid("income",{...rest,category:"rent",beneficiary:"owner"}));
  assert.equal(valid("income",{...rest,category:"rent",beneficiary:"owner",actorName:"Forged"}),false);
  assert.equal(valid("income",{...rest,category:"rent"}),false);
});
test("audit edits require a version and exactly one mutation; client cannot forge history",()=>{
  assert.ok(editInput.safeParse({id:propertyId,version:0,data:{title:"Changed"}}).success);
  assert.ok(editInput.safeParse({id:propertyId,version:0,archiveReason:"Duplicate entry"}).success);
  for(const input of [{id:propertyId,data:{}},{id:propertyId,version:0},{id:propertyId,version:0,data:{},archiveReason:"Duplicate"},{id:propertyId,version:0,data:{},audit:[]}])assert.equal(editInput.safeParse(input).success,false);
});
test("planned amounts do not inflate actual cash movement",()=>{
  const totals=financialTotals([
    {kind:"income",data:{amount:100,status:"settled"},archived:false},
    {kind:"income",data:{amount:200,status:"pending"},archived:false},
    {kind:"expense",data:{amount:30,status:"settled"},archived:false},
    {kind:"expense",data:{amount:70,status:"pending"},archived:false},
    {kind:"expense",data:{amount:999,status:"settled"},archived:true},
  ]);
  assert.deepEqual(totals,{received:100,paid:30,expected:200,planned:70});
});
test("lease dates follow calendar months without drifting after February",()=>{
  assert.deepEqual(leaseSchedule("2028-01-31","2028-04-30","monthly",100).map(row=>row.dueDate),["2028-01-31","2028-02-29","2028-03-31","2028-04-30"]);
  assert.equal(leaseSchedule("2026-01-01","2026-12-31","quarterly",100).length,4);
  assert.deepEqual(leaseSchedule("invalid","2026-12-31","monthly",100),[]);
});
test("attachments use magic signatures, safe names and bounded file sizes",()=>{
  assert.equal(attachmentMime(new TextEncoder().encode("%PDF-1.7\n")),"application/pdf");
  assert.equal(attachmentMime(Uint8Array.from([137,80,78,71,13,10,26,10])),"image/png");
  assert.equal(attachmentMime(new TextEncoder().encode("<script>fake pdf</script>")),null);
  assert.equal(safeAttachmentName("../invoice\r\n.pdf"),".._invoice__.pdf");
  assert.equal(maxAttachmentBytes,3*1024*1024);
});
test("project managers are scoped to buildings and audit values persist privately",async()=>{
  assert.deepEqual(propertyScope(propertyId,"project_manager"),{_id:propertyId,category:"build"});
  const doc=new ManagementRecord({propertyId,kind:"expense",data:finance,audit:[{action:"created",at:new Date(),actorId:propertyId,actorName:"Employee",after:finance}]});
  await doc.validate();
  assert.equal(doc.toObject().audit[0].after?.amount,500);
  assert.equal(doc.version,0);
});
