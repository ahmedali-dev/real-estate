"use client";
import { useRef,useState } from "react";
import type { PropertyDTO } from "@/types/property";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { dataSchemas, recordInput, expenseCategories, type OfficeRecord, type RecordKind } from "@/lib/management/records";
import { normalizePriceInput } from "@/lib/format";

type Choice={value:string;en:string;ar:string};
type Field={key:string;en:string;ar:string;type?:string;choices?:Choice[];optional?:boolean};
const choices=(values:string[],en:string[],ar:string[]):Choice[]=>values.map((value,index)=>({value,en:en[index],ar:ar[index]}));
const statuses=choices(["draft","active","ended"],["Draft","Active","Ended"],["مسودة","ساري","منتهٍ"]);
const payStatuses=choices(["pending","settled"],["Expected / unpaid","Received / paid"],["متوقع / غير مدفوع","تم الاستلام / الدفع"]);
export const kindNames={agreement:["Management agreements","اتفاقيات الإدارة"],lease:["Leases","عقود الإيجار"],income:["Income records","سجلات الإيرادات"],expense:["Expense records","سجلات المصروفات"]};
export type Employee={userId:string;name:string};
export function RecordEditor({property,kind,record,options,employees,actorId,onSaved,onCancel}:{property:PropertyDTO;kind:RecordKind;record?:OfficeRecord;options:OfficeRecord[];employees:Employee[];actorId:string;onSaved:()=>void;onCancel:()=>void}){
  const {locale}=useLanguage();const ar=locale==="ar";const tr=(en:string,arabic:string)=>ar?arabic:en;
  const [values,setValues]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(record?.data||{
    title:"",unit:"",notes:"",status:kind==="income"||kind==="expense"?"pending":"draft",
    responsibleUserId:actorId,scope:"whole_property",feeBasis:"collected_rent",commissionRate:5,
    ownerName:property.owner?.name||"",ownerPhone:property.owner?.phone||"",frequency:"monthly",
    category:kind==="income"?"rent":"maintenance",payer:"owner",beneficiary:"owner",
  }).map(([key,value])=>[key,String(value??"")])));
  const requestId=useRef("");
  const saving=useRef(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const agreementOptions=options.filter(item=>item.kind==="agreement");
  const leaseOptions=options.filter(item=>item.kind==="lease");
  const numberKeys=["rentAmount","deposit","commissionRate","fixedFee","amount"];
  const units=property.units.map(unit=>unit.number).filter((n):n is string=>Boolean(n)).filter((n,i,list)=>list.indexOf(n)===i&&list.lastIndexOf(n)===i);
  const fields:Field[]=[{key:"title",en:"Record title",ar:"عنوان السجل"}];
  if(kind==="agreement"){
    fields.push({key:"scope",en:"Management scope",ar:"نطاق الإدارة",choices:property.category==="build"?choices(["whole_property","unit"],["Whole property","One building unit"],["كامل العقار","وحدة في المبنى"]):choices(["whole_property"],["Whole property"],["كامل العقار"])});
  }
  if(property.category==="build"&&(kind!=="agreement"||values.scope==="unit")){
    fields.push({key:"unit",en:"Building unit",ar:"الوحدة",optional:kind!=="agreement",choices:units.map(value=>({value,en:value,ar:value}))});
  }
  if(kind==="agreement"){
    fields.push({key:"ownerName",en:"Owner name",ar:"اسم المالك"},{key:"ownerPhone",en:"Owner phone",ar:"هاتف المالك",type:"tel"},
      {key:"responsibleUserId",en:"Responsible employee",ar:"الموظف المسؤول",choices:employees.map(user=>({value:user.userId,en:user.name,ar:user.name}))},
      {key:"startDate",en:"Start date",ar:"تاريخ البداية",type:"date"},{key:"endDate",en:"End date",ar:"تاريخ النهاية",type:"date"},
      {key:"feeBasis",en:"Fee basis",ar:"أساس احتساب الأتعاب",choices:choices(["collected_rent","scheduled_rent","fixed"],["Rent actually collected","Scheduled rent","Fixed fee"],["الإيجار المحصل فعليًا","الإيجار المستحق بالعقد","أتعاب ثابتة"])},
      values.feeBasis==="fixed"?{key:"fixedFee",en:"Fixed fee (SAR)",ar:"الأتعاب الثابتة (ر.س)",type:"money"}:{key:"commissionRate",en:"Commission (%)",ar:"نسبة العمولة",choices:Array.from({length:11},(_,i)=>({value:String(i+5),en:`${i+5}%`,ar:`${i+5}%`}))});
  }else if(kind==="lease"){
    fields.push({key:"agreementId",en:"Management agreement",ar:"اتفاقية الإدارة",choices:agreementOptions.map(item=>({value:item._id,en:String(item.data.title),ar:String(item.data.title)}))},
      {key:"tenantName",en:"Tenant name",ar:"اسم المستأجر"},{key:"tenantPhone",en:"Tenant phone",ar:"هاتف المستأجر",type:"tel"},
      {key:"startDate",en:"Lease start",ar:"بداية الإيجار",type:"date"},{key:"endDate",en:"Lease end",ar:"نهاية الإيجار",type:"date"},
      {key:"rentAmount",en:"Rent per installment (SAR)",ar:"الإيجار لكل دفعة (ر.س)",type:"money"},
      {key:"frequency",en:"Rent schedule",ar:"دورية السداد",choices:choices(["monthly","quarterly","semiannual","annual"],["Monthly","Quarterly","Every 6 months","Annual"],["شهري","ربع سنوي","نصف سنوي","سنوي"])},
      {key:"firstDueDate",en:"First payment due",ar:"استحقاق أول دفعة",type:"date"},{key:"deposit",en:"Security deposit (SAR)",ar:"مبلغ التأمين (ر.س)",type:"money",optional:true});
  }else{
    const cats=kind==="expense"?choices([...expenseCategories],["Maintenance","Utilities","Cleaning","Security","Insurance","Administration","Other"],["صيانة","خدمات ومرافق","نظافة","أمن","تأمين","إدارة","أخرى"]):choices(["rent","sale","deposit","commission","other"],["Rent","Sale","Deposit","Office commission","Other"],["إيجار","بيع","تأمين مستأجر","عمولة المكتب","أخرى"]);
    fields.push({key:"category",en:"Category",ar:"التصنيف",choices:cats},{key:"amount",en:"Amount (SAR)",ar:"المبلغ (ر.س)",type:"money"},
      {key:"date",en:"Transaction date",ar:"تاريخ العملية",type:"date"},{key:"dueDate",en:"Due date",ar:"تاريخ الاستحقاق",type:"date",optional:true},
      {key:"counterparty",en:kind==="income"?"Paid by / expected from":"Supplier / payee",ar:kind==="income"?"الدافع / المطلوب منه":"المورد / المستفيد"},
      kind==="expense"?{key:"payer",en:"Cost borne by",ar:"من يتحمل التكلفة",choices:choices(["owner","tenant","office"],["Owner","Tenant","Office"],["المالك","المستأجر","المكتب"])}:{key:"beneficiary",en:"Income belongs to",ar:"الإيراد يعود إلى",choices:choices(["owner","office"],["Owner","Office"],["المالك","المكتب"])},
      {key:"agreementId",en:"Related agreement",ar:"اتفاقية مرتبطة",optional:true,choices:agreementOptions.map(item=>({value:item._id,en:String(item.data.title),ar:String(item.data.title)}))},
      {key:"leaseId",en:"Related lease",ar:"عقد إيجار مرتبط",optional:true,choices:leaseOptions.map(item=>({value:item._id,en:String(item.data.title),ar:String(item.data.title)}))},
      {key:"reference",en:"Invoice / receipt reference",ar:"رقم الفاتورة / الإيصال",optional:true});
  }
  fields.push({key:"status",en:"Record status",ar:"حالة السجل",choices:kind==="income"||kind==="expense"?payStatuses:statuses});
  if((kind==="income"||kind==="expense")&&values.status==="settled")fields.push({key:"settledDate",en:"Actual receipt / payment date",ar:"تاريخ التحصيل / الدفع الفعلي",type:"date"});
  fields.push({key:"notes",en:"Private notes",ar:"ملاحظات خاصة",type:"textarea",optional:true});
  function update(key:string,value:string){
    setValues(old=>{
      const next={...old,[key]:value};
      if(key==="scope"&&value==="whole_property")next.unit="";
      if(key==="feeBasis"){delete next.fixedFee;delete next.commissionRate;if(value!=="fixed")next.commissionRate="5";}
      if(key==="status"&&value==="pending")delete next.settledDate;
      if(key==="agreementId"||key==="leaseId"){
        const linked=options.find(item=>item._id===value);
        if(linked?.data.unit)next.unit=String(linked.data.unit);
        if(key==="leaseId"&&linked?.data.agreementId)next.agreementId=String(linked.data.agreementId);
      }
      return next;
    });
  }
  async function save(event:React.FormEvent){
    event.preventDefault();if(saving.current)return;setError("");
    const data:Record<string,unknown>={};
    for(const field of fields){
      const value=(values[field.key]||"").trim();
      if(!value&&field.optional)continue;
      data[field.key]=numberKeys.includes(field.key)?Number(normalizePriceInput(value)??NaN):value;
    }
    if(!data.unit)data.unit="";
    const parsed=recordInput.safeParse({propertyId:property._id,kind,data});
    if(!parsed.success){setError(parsed.error.issues.map(issue=>issue.message).join(" "));return;}
    const clean=dataSchemas[kind].parse(data);
    saving.current=true;setBusy(true);
    if(!requestId.current)requestId.current=crypto.randomUUID();
    try{
      const response=await fetch("/api/property-management/records",{method:record?"PATCH":"POST",headers:{"Content-Type":"application/json","Idempotency-Key":requestId.current},body:JSON.stringify(record?{id:record._id,version:record.version,data:clean}:{propertyId:property._id,kind,data:clean})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error);
      onSaved();
    }catch(error){setError(error instanceof Error?error.message:tr("Unable to save.","تعذر الحفظ."));}
    finally{saving.current=false;setBusy(false);}
  }
  return <form onSubmit={save} className="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
    <h2 className="mb-2 text-lg font-semibold">{record?tr("Edit record","تعديل السجل"):tr("New record","سجل جديد")} · {kindNames[kind][ar?1:0]}</h2>
    <p className="mb-5 text-xs text-ink-500">{tr("Every saved change is recorded in the audit trail. Attach documents after saving.","كل تعديل محفوظ يُسجّل في سجل التغييرات. يمكنك إرفاق المستندات بعد الحفظ.")}</p>
    {property.category==="build"&&!units.length&&<p className="mb-4 rounded-xl bg-stone-50 p-3 text-xs text-ink-500">{tr("Add uniquely numbered building units in Edit property before linking an individual unit.","أضف أرقامًا فريدة لوحدات المبنى من تعديل العقار قبل ربط سجل بوحدة منفردة.")}</p>}
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
      {fields.map(field=><label key={field.key} className={field.type==="textarea"?"sm:col-span-2":""}><span className="label-field">{ar?field.ar:field.en}{field.optional&&<span className="ms-1 font-normal text-ink-400">({tr("optional","اختياري")})</span>}</span>
        {field.choices?<SelectDropdown className="input-field" value={values[field.key]||""} onChange={e=>update(field.key,e.target.value)} required={!field.optional}>
          <option value="">{tr("Choose…","اختر…")}</option>
          {values[field.key]&&!field.choices.some(option=>option.value===values[field.key])&&<option value={values[field.key]}>{tr("Previously selected","اختيار سابق")} · {values[field.key]}</option>}
          {field.choices.map(option=><option key={option.value} value={option.value}>{ar?option.ar:option.en}</option>)}
        </SelectDropdown>:field.type==="textarea"?<textarea className="input-field min-h-24" maxLength={2000} value={values[field.key]||""} onChange={e=>update(field.key,e.target.value)} />:<input className="input-field" type={field.type==="money"?"text":field.type||"text"} inputMode={field.type==="money"?"decimal":undefined} maxLength={field.type==="date"?undefined:field.type==="tel"?40:field.key==="title"||field.key==="reference"||field.key==="counterparty"||field.key==="ownerName"||field.key==="tenantName"?160:2000} required={!field.optional} value={values[field.key]||""} onChange={e=>update(field.key,e.target.value)} />}
      </label>)}
    </fieldset>
    {error&&<p role="alert" className="mt-4 text-sm text-rust-600">{error}</p>}
    <div className="mt-5 flex gap-3"><button type="submit" className="btn-primary" disabled={busy}>{tr(busy?"Saving…":"Save record",busy?"جارٍ الحفظ…":"حفظ السجل")}</button><button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>{tr("Cancel","إلغاء")}</button></div>
  </form>;
}
