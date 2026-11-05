import test from "node:test";
import assert from "node:assert/strict";
import {createReport,reportFilterSchema,type ReportRecord,type ReportProperty} from "../lib/management/reports";
import {reportCsv,reportPrint,csvCell} from "../lib/management/report-display";
import type {Operation} from "../lib/management/operations";
const p="111111111111111111111111",p2="222222222222222222222222",a="333333333333333333333333",employee="444444444444444444444444";
const properties:ReportProperty[]=[{_id:p,title:"Building A",category:"build"},{_id:p2,title:"Land B",category:"land"}];
const rec=(id:string,kind:string,data:Record<string,unknown>):ReportRecord=>({_id:id,propertyId:p,kind,data:{agreementId:a,title:id,...data}});
const records:ReportRecord[]=[rec(a,"agreement",{agreementId:undefined,ownerName:"Owner",responsibleUserId:employee,feeBasis:"collected_rent",commissionRate:10,startDate:"2026-01-01",endDate:"2026-02-15",status:"active"}),rec("lease","lease",{firstDueDate:"2026-01-01",startDate:"2026-01-01",endDate:"2026-02-15",frequency:"monthly",rentAmount:1000,status:"active"}),rec("rent","income",{amount:1000,date:"2026-01-01",dueDate:"2026-01-01",category:"rent",beneficiary:"owner",status:"pending",leaseId:"lease",counterparty:"Tenant"}),rec("later","income",{amount:200,date:"2026-01-01",settledDate:"2026-02-10",category:"rent",beneficiary:"owner",status:"settled",counterparty:"Tenant"}),rec("deposit","income",{amount:100,date:"2026-01-01",settledDate:"2026-01-15",category:"deposit",beneficiary:"owner",status:"settled"}),rec("repair","expense",{amount:600,date:"2026-01-05",category:"maintenance",payer:"owner",status:"pending",counterparty:"Supplier"}),rec("officeCost","expense",{amount:40,date:"2026-01-05",settledDate:"2026-01-05",category:"administration",payer:"office",status:"settled"}),rec("commission","income",{amount:50,date:"2026-01-04",settledDate:"2026-01-04",category:"commission",beneficiary:"office",status:"settled"}),rec("unassigned","income",{agreementId:undefined,amount:50,date:"2026-01-03",settledDate:"2026-01-03",category:"other",beneficiary:"owner",status:"settled"})];
const op=(id:string,kind:Operation["kind"],data:Record<string,unknown>,status="posted"):Operation=>({_id:id,propertyId:p,kind,status,version:0,data,audit:[{action:"created",actorName:"Staff",at:"2026-01-02T10:00:00Z"}]});
const ops=[op("paid1","payment",{recordId:"rent",amount:400,date:"2026-01-10"}),op("paid2","payment",{recordId:"rent",amount:300,date:"2026-02-10"}),op("reversed","payment",{recordId:"rent",amount:200,date:"2026-01-11"},"reversed"),op("cost1","payment",{recordId:"repair",amount:250,date:"2026-01-20"}),op("cost2","payment",{recordId:"repair",amount:100,date:"2026-02-01"}),op("payout","payout",{agreementId:a,amount:100,date:"2026-01-25",ownerName:"Owner"}),op("work","maintenance",{agreementId:a,title:"Repair",supplier:"Supplier",estimate:550,approvedAmount:650,actualCost:600,completedDate:"2026-01-21",payer:"owner",expenseId:"repair",priority:"normal"},"completed")];
const jan={from:"2026-01-01",to:"2026-01-31"};
test("reports count actual cash by payment date, exclude deposits from operations, and distinguish office cash from fees",()=>{
 const report=createReport(properties,records,ops,jan);
 assert.equal(report.summary.receipts,500);assert.equal(report.summary.costs,290);assert.equal(report.summary.net,210);assert.equal(report.summary.ownerNet,200);assert.equal(report.summary.officeCashNet,10);assert.equal(report.summary.fee,40);assert.equal(report.summary.deposits,100);assert.equal(report.summary.payouts,100);assert.equal(report.trend[0].receipts,500);
 assert.equal(report.tables.transactions.some(t=>t.id==="reversed"),false);
});
test("arrears use end-date payment balances, including legacy settled after cutoff",()=>{
 const report=createReport(properties,records,ops,jan),rent=report.tables.dues.find(r=>r.id==="rent")!;
 assert.equal(rent.remaining,600);assert.equal(rent.paid,400);assert.equal(rent.daysLate,30);assert.equal(rent.bucket,"1_30");assert.equal(report.summary.overdue,800);assert.equal(report.summary.payable,350);
 assert.equal(report.tables.properties.find(p=>p.propertyId===properties[0]._id)?.collectionRate,"33.33%");
});
test("owner statements reconcile opening plus cash less costs, fees and payouts to closing",()=>{
 const report=createReport(properties,records,ops,{from:"2026-02-01",to:"2026-02-28"}),owner=report.tables.owners[0];
 assert.equal(owner.opening,10);assert.equal(owner.receipts,500);assert.equal(owner.costs,100);assert.equal(owner.fee,50);assert.equal(owner.payouts,0);assert.equal(owner.balance,360);
 assert.equal(Number(owner.opening)+Number(owner.receipts)-Number(owner.costs)-Number(owner.fee)-Number(owner.payouts),owner.balance);
});
test("property, category and responsible employee filters constrain all report sections",()=>{
 const b=createReport(properties,records,ops,{...jan,propertyId:p2});assert.equal(b.summary.receipts,0);assert.equal(b.tables.owners.length,0);assert.equal(b.summary.properties,1);
 const empty=createReport(properties,records,ops,{...jan,category:"apartment"});assert.equal(empty.summary.properties,0);
 const filtered=createReport(properties,records,ops,{...jan,employeeId:employee});assert.equal(filtered.summary.properties,1);assert.equal(filtered.summary.receipts,450);assert.equal(filtered.summary.unassigned,0);
 const wrong=createReport(properties,records,ops,{...jan,employeeId:p2});assert.equal(wrong.summary.receipts,0);
});
test("maintenance separates completed cost, approved variance and paid money",()=>{
 const report=createReport(properties,records,ops,jan),work=report.tables.maintenance[0];assert.equal(work.actual,600);assert.equal(work.approved,650);assert.equal(work.variance,-50);assert.equal(work.paid,250);assert.equal(report.summary.maintenance,250);
 assert.equal(report.tables.expenses.find(e=>e.category==="maintenance")?.amount,250);
});
test("reminders surface overdue debts, expiring contracts, missing rent dues and unassigned owner entries",()=>{
 const report=createReport(properties,records,ops,jan);assert.ok(report.tables.reminders.some(r=>r.type==="lease_expiry"));assert.ok(report.tables.reminders.some(r=>r.type==="agreement_expiry"));assert.equal(report.summary.unassigned,1);
 const noRent=createReport(properties,records.filter(r=>r._id!=="rent"),ops,jan);assert.ok(noRent.tables.reminders.some(r=>r.type==="missing_rent_dues"));
 const open=op("open","maintenance",{agreementId:a,title:"Pending repair",estimate:100},"requested");assert.ok(createReport(properties,records,[...ops,open],jan).tables.reminders.some(r=>r.type==="maintenance_approval"));
});
test("ageing bands have exact due-today, 30, 60, 90 and 91-day boundaries",()=>{
 const dated=[0,1,30,31,60,61,90,91].map(days=>rec(String(days),"income",{amount:1,status:"pending",date:new Date(new Date("2026-05-01").getTime()-days*86400000).toISOString().slice(0,10),category:"other",beneficiary:"office"}));
 const r=createReport(properties,dated,[],{from:"2026-01-01",to:"2026-05-01"});assert.deepEqual(r.tables.dues.map(r=>r.bucket),["90_plus","61_90","61_90","31_60","31_60","1_30","1_30","due_today"]);
});
test("archived and reversed entries are excluded and no cash is counted twice",()=>{
 const archived=records.map(r=>r._id==="rent"?{...r,archived:true}:r);const r=createReport(properties,archived,ops,jan);assert.equal(r.summary.receipts,100);assert.equal(r.summary.fee,0);
 const settled=records.map(r=>r._id==="rent"?{...r,data:{...r.data,status:"settled",settledDate:"2026-01-10"}}:r);assert.equal(createReport(properties,settled,ops,jan).summary.receipts,1100);
});
test("filter dates reject invalid calendars, inverted periods and excessive ranges",()=>{
 assert.ok(reportFilterSchema.safeParse(jan).success);
 for(const f of [{from:"2026-02-30",to:"2026-03-01"},{from:"2026-02-01",to:"2026-01-01"},{from:"2020-01-01",to:"2026-01-01"},{...jan,propertyId:"bad"}])assert.equal(reportFilterSchema.safeParse(f).success,false);
});
test("CSV exports are UTF-8, escape quotes/newlines, neutralize formulas and preserve numeric negatives",()=>{
 assert.equal(csvCell(" =HYPERLINK(\"bad\")"),'"\' =HYPERLINK(""bad"")"');assert.equal(csvCell("\t@SUM(1)"),'"\'\t@SUM(1)"');assert.equal(csvCell(-20.5),"-20.5");
 const report=createReport(properties,records,ops,jan),csv=reportCsv([{...report.tables.properties[0],property:'=1+2\n"test"'}],"properties",jan,false);
 assert.ok(csv.startsWith("\uFEFF"));assert.ok(csv.includes('"\'=1+2\n""test"""'));assert.ok(csv.includes("SAR"));
});
test("print export escapes untrusted text, includes full rows, summary and ledger basis",()=>{
 const report=createReport(properties,records,ops,jan),html=reportPrint([{...report.tables.properties[0],property:"<script>alert(1)</script>"}],"properties",report,jan,true,"2026-02-01T00:00:00Z");
 assert.ok(html.includes('lang="ar" dir="rtl"'));assert.ok(html.includes("&lt;script&gt;"));assert.ok(!html.includes("<script>"));assert.ok(html.includes("2026-01-31"));assert.ok(html.includes("PDF"));assert.ok(html.includes("ر.س")||html.includes("SAR"));
});
