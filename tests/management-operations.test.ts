import test from "node:test";
import assert from "node:assert/strict";
import {operationInput,operationEdit,ownerBalance,paidCents,type Operation,type LedgerRow} from "../lib/management/operations";
const id="0123456789abcdef01234567";
const agreement:LedgerRow={_id:id,kind:"agreement",data:{startDate:"2026-01-01",feeBasis:"collected_rent",commissionRate:10}};
const record=(key:string,kind:string,data:Record<string,unknown>):LedgerRow=>({_id:key,kind,data:{agreementId:id,...data}});
const payment=(recordId:string,amount:number,status="posted"):Operation=>({_id:"payment",propertyId:id,kind:"payment",version:0,status,data:{recordId,amount,date:"2026-01-01"},audit:[]});
test("operation inputs reject forged states, invalid money and malformed dates",()=>{
 const input={action:"payment",propertyId:id,recordId:id,amount:20,date:"2026-01-01",reference:"Receipt 123"};
 assert.ok(operationInput.safeParse(input).success);
 for(const bad of [{...input,amount:0},{...input,amount:1.001},{...input,date:"2026-02-30"},{...input,status:"posted"},{...input,propertyId:"wrong"}])assert.equal(operationInput.safeParse(bad).success,false);
});
test("operational edits require version, reason and valid approval amount",()=>{
 assert.ok(operationEdit.safeParse({action:"reverse",id,version:0,reason:"Duplicate bank entry"}).success);
 assert.equal(operationEdit.safeParse({action:"reverse",id,version:0,reason:""}).success,false);
 assert.equal(operationEdit.safeParse({action:"approve",id,approvedAmount:100}).success,false);
 assert.equal(operationEdit.safeParse({action:"complete",id,version:1,actualCost:-5,date:"2026-01-01"}).success,false);
});
test("partial payments reconcile once and reversed receipts no longer count",()=>{
 const income=record("rent","income",{amount:100,status:"pending"});
 assert.equal(paidCents(income,[payment("rent",30),payment("rent",10,"reversed"),payment("other",90)]),3000);
 assert.equal(paidCents({...income,data:{...income.data,status:"settled"}},[payment("rent",30)]),10000);
});
test("owner payout deducts owner costs and collected-rent fee; excludes deposits, office and tenant amounts",()=>{
 const records=[record("rent","income",{amount:1000,status:"pending",beneficiary:"owner",category:"rent"}),record("deposit","income",{amount:1000,status:"settled",beneficiary:"owner",category:"deposit"}),record("office","income",{amount:300,status:"settled",beneficiary:"office",category:"commission"}),record("cost","expense",{amount:200,status:"pending",payer:"owner"}),record("tenant","expense",{amount:90,status:"settled",payer:"tenant"})];
 const ops=[payment("rent",600),payment("cost",100),{...payment("",0),kind:"payout" as const,data:{agreementId:id,amount:200,date:"2026-01-01"}}];
 assert.deepEqual(ownerBalance(agreement,records,ops,"2026-02-01"),{receipts:600,costs:100,fee:60,paidOut:200,balance:240,available:240});
});
test("scheduled-rent fees use installments due to date, not future rent",()=>{
 const lease=record("lease","lease",{status:"active",firstDueDate:"2026-01-31",endDate:"2026-12-31",frequency:"monthly",rentAmount:1000});
 const balance=ownerBalance({...agreement,data:{...agreement.data,feeBasis:"scheduled_rent"}},[lease],[],"2026-03-01");
 assert.equal(balance.fee,200);assert.equal(balance.balance,-200);assert.equal(balance.available,0);
});
test("fixed fee charged once across payouts and no fee before agreement starts",()=>{
 const a={...agreement,data:{...agreement.data,feeBasis:"fixed",fixedFee:100}};
 const receipt=record("rent","income",{status:"settled",amount:1000,beneficiary:"owner",category:"rent",settledDate:"2026-01-02"});
 assert.equal(ownerBalance(a,[receipt],[],"2025-12-31").fee,0);
 assert.equal(ownerBalance(a,[receipt],[{...payment("",0),kind:"payout",data:{agreementId:id,amount:400}}],"2026-02-01").available,500);
});
test("cash as of today excludes future receipts and archived entries; fees round in cents",()=>{
 const records=[record("rent","income",{status:"pending",amount:10.01,category:"rent",beneficiary:"owner"}),{...record("archived","income",{status:"settled",amount:1000,category:"rent",beneficiary:"owner"}),archived:true},record("future","income",{status:"settled",amount:200,category:"rent",beneficiary:"owner",settledDate:"2027-01-01"})];
 assert.equal(ownerBalance(agreement,records,[payment("rent",10.01)],"2026-01-02").available,9.01);
 assert.equal(ownerBalance(agreement,records,[{...payment("rent",10.01),data:{recordId:"rent",amount:10.01,date:"2027-01-01"}}],"2026-01-02").available,0);
});
test("lease-only financial references are allocated to their management agreement",()=>{
 const lease=record("lease","lease",{status:"draft"});
 const income:LedgerRow={_id:"rent",kind:"income",data:{leaseId:"lease",amount:100,status:"pending",category:"rent",beneficiary:"owner"}};
 assert.equal(ownerBalance(agreement,[lease,income],[payment("rent",100)],"2026-01-02").available,90);
});

test("draft management agreements do not accrue fees",()=>{assert.equal(ownerBalance({...agreement,data:{...agreement.data,status:"draft",feeBasis:"fixed",fixedFee:100}},[],[],"2026-02-01").fee,0);});
