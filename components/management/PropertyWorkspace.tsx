"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useRequireRole } from "@/lib/auth/useRequireRole";
import { leaseSchedule } from "@/lib/management/schedule";
import { formatPrice } from "@/lib/format";
import { recordKinds,type RecordKind,type OfficeRecord } from "@/lib/management/records";
import type { PropertyDTO } from "@/types/property";
import { Operations } from "./Operations";
import { RecordEditor,kindNames,type Employee } from "./RecordEditor";

export function PropertyWorkspace(){
  const {id}=useParams<{id:string}>();const {locale,t}=useLanguage();const ar=locale==="ar";
  const tr=(en:string,arabic:string)=>ar?arabic:en;
  const {status,role}=useRequireRole(["admin","real_estate_officer","project_manager"],"/dashboard/orders");
  const {data:session}=useSession();
  const allowed=status==="authenticated"&&["admin","real_estate_officer","project_manager"].includes(role||"");
  const [property,setProperty]=useState<PropertyDTO>();
  const [employees,setEmployees]=useState<Employee[]>([]),[options,setOptions]=useState<OfficeRecord[]>([]);
  const [kind,setKind]=useState<RecordKind>("agreement"),[archived,setArchived]=useState(false);
  const [records,setRecords]=useState<OfficeRecord[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1);
  const [version,setVersion]=useState(0),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [editor,setEditor]=useState<{record?:OfficeRecord}|null>(null),[details,setDetails]=useState<OfficeRecord>();
  const [operations,setOperations]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    if(!allowed)return;const controller=new AbortController();
    setError("");setProperty(undefined);setLoading(true);setEditor(null);setDetails(undefined);setPage(1);setMessage("");
    Promise.all([fetch(`/api/properties/${id}`,{signal:controller.signal,cache:"no-store"}),fetch("/api/users/options",{signal:controller.signal,cache:"no-store"})])
      .then(async responses=>{
        if(responses.some(response=>!response.ok))throw new Error();
        const [result,users]=await Promise.all(responses.map(response=>response.json()));
        if(controller.signal.aborted)return;
        if(role==="project_manager"&&result.data.category!=="build")throw new Error();
        setProperty(result.data);setEmployees(users.data);
      }).catch(()=>{if(!controller.signal.aborted)setError("load");});
    return()=>controller.abort();
  },[allowed,id,role]);
  useEffect(()=>{
    if(!property)return;const controller=new AbortController();setLoading(true);setError("");
    const params=new URLSearchParams({propertyId:id,kind,archived:String(archived),page:String(page)});
    Promise.all([fetch(`/api/property-management/records?${params}`,{signal:controller.signal,cache:"no-store"}),fetch(`/api/property-management/records?propertyId=${id}&options=1`,{signal:controller.signal,cache:"no-store"})])
      .then(async responses=>{
        if(responses.some(response=>!response.ok))throw new Error();
        const [result,references]=await Promise.all(responses.map(response=>response.json()));
        if(!controller.signal.aborted){setRecords(result.data);setTotal(result.total);setOptions(references.data);}
      }).catch(()=>{if(!controller.signal.aborted)setError("load");}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[property,id,kind,archived,page,version]);
  async function openDetails(record:OfficeRecord,edit=false){
    setError("");
    try{
      const response=await fetch(`/api/property-management/records?propertyId=${id}&id=${record._id}`,{cache:"no-store"});
      const result=await response.json();if(!response.ok||!result.data[0])throw new Error();
      if(edit){setEditor({record:result.data[0]});setDetails(undefined);}else{setDetails(result.data[0]);setEditor(null);}
    }catch{setError("load");}
  }
  function refresh(){setEditor(null);setDetails(undefined);setVersion(v=>v+1);setMessage(tr("Record saved. Its history is preserved.","تم حفظ السجل مع الاحتفاظ بتاريخه."));}
  if(!allowed)return null;
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
    <Link href="/dashboard/management" className="text-sm text-brass-600 underline">{tr("Back to managed properties","العودة إلى العقارات المُدارة")}</Link>
    <header className="rounded-2xl border border-ink-100 bg-white p-6">
      <p className="text-xs text-ink-500">{tr("Property management","إدارة الأملاك")}</p>
      <h1 className="mt-2 text-2xl font-semibold">{property?.title||tr("Loading property…","جارٍ تحميل العقار…")}</h1>
      {property&&<div className="mt-4 flex flex-wrap gap-3"><Link className="btn-secondary" href={`/properties/${id}`}>{tr("View listing","عرض العقار")}</Link><Link className="btn-secondary" href={`/dashboard/management/reports?propertyId=${id}`}>{tr("Reports & reminders","التقارير والتذكيرات")}</Link><Link className="btn-secondary" href={`/dashboard/${id}/edit`}>{tr("Edit property and owner","تعديل العقار والمالك")}</Link></div>}
      <p className="mt-4 text-xs leading-6 text-ink-500">{tr("Private office records. Expected income is not a received payment; planned expenses are not paid costs. Record statuses do not change the public listing's availability.","سجلات خاصة بالمكتب. الإيراد المتوقع ليس تحصيلًا فعليًا، والتكلفة المخططة ليست مصروفًا مدفوعًا. حالات السجلات لا تغيّر توفر الإعلان العام.")}</p>
    </header>
    {message&&<p role="status" className="rounded-xl bg-brass-50 p-3 text-sm">{message}</p>}
    {error&&<p role="alert" className="rounded-xl border border-rust-500/30 bg-white p-3 text-sm">{tr("Could not load this workspace. Check access or retry.","تعذر تحميل البيانات. تحقق من الصلاحيات أو أعد المحاولة.")} <button className="underline" onClick={()=>{setError("");if(property)setVersion(v=>v+1);else window.location.reload();}}>{tr("Retry","إعادة المحاولة")}</button></p>}
    {property&&<>
      <nav aria-label={tr("Management records","سجلات الإدارة")} className="flex flex-wrap gap-2">
        {recordKinds.filter(value=>property.category!=="land"||value!=="lease").map(value=><button key={value} type="button" className={!operations&&value===kind?"btn-primary":"btn-secondary"} aria-pressed={!operations&&value===kind} onClick={()=>{setOperations(false);setKind(value);setPage(1);setEditor(null);setDetails(undefined);setMessage("");}}>{kindNames[value][ar?1:0]}</button>)}
        <button type="button" className={operations?"btn-primary":"btn-secondary"} aria-pressed={operations} onClick={()=>{setOperations(true);setEditor(null);setDetails(undefined);}}>{tr("Maintenance, payments & payouts","الصيانة والدفعات ومستحقات المالك")}</button>
      </nav>
      {operations?<Operations key={id} propertyId={id} role={role!} onChanged={()=>setVersion(v=>v+1)} />:<>
      {editor&&<RecordEditor key={editor.record?._id||kind} property={property} kind={kind} record={editor.record} options={options} employees={employees} actorId={session!.user.id} onSaved={refresh} onCancel={()=>setEditor(null)} />}
      {details&&<RecordDetails key={details._id+details.version} record={details} employees={employees} options={options} onClose={()=>setDetails(undefined)} onUpdated={updated=>{setDetails(updated);setVersion(v=>v+1);}} onArchived={refresh} />}
      <section className="rounded-2xl border border-ink-100 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{kindNames[kind][ar?1:0]}</h2>
          <div className="flex gap-2"><button type="button" aria-pressed={archived} className="btn-secondary" onClick={()=>{setArchived(v=>!v);setPage(1);setEditor(null);setDetails(undefined);}}>{archived?tr("Show current","عرض الحالية"):tr("Show archived","عرض الأرشيف")}</button><button type="button" className="btn-primary" disabled={loading} onClick={()=>{setEditor({});setDetails(undefined);setMessage("");}}>{tr("Add record","إضافة سجل")}</button></div>
        </div>
        {loading?<p role="status">{tr("Loading records…","جارٍ تحميل السجلات…")}</p>:!records.length?<p className="py-6 text-sm text-ink-500">{tr("No records in this section yet.","لا توجد سجلات في هذا القسم بعد.")}</p>:<ul className="divide-y divide-ink-100">{records.map(record=><li key={record._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0"><h3 className="break-words font-semibold">{String(record.data.title)}</h3><p className="mt-1 text-xs text-ink-500">{String(record.data.unit||tr("Whole property","كامل العقار"))} · {record.paymentSummary?.remaining===0||record.data.status==="settled"?tr("Received / paid","تم التحصيل / الدفع"):record.data.status==="pending"?tr("Expected / unpaid","متوقع / غير مدفوع"):record.data.status==="active"?tr("Active","ساري"):record.data.status==="ended"?tr("Ended","منتهٍ"):tr("Draft","مسودة")}{record.archived?" · "+tr("Archived","مؤرشف"):""}</p>
          {record.paymentSummary&&<p className="mt-2 text-xs text-ink-500">{tr("Paid","المدفوع")}: {formatPrice(record.paymentSummary.paid,locale)} · {tr("Remaining","المتبقي")}: {formatPrice(record.paymentSummary.remaining,locale)} {tr("SAR","ر.س")}</p>}
          {record.data.amount!=null&&<p className="mt-2 text-sm font-semibold">{formatPrice(Number(record.data.amount),locale)} {tr("SAR","ر.س")} · {String(record.data.date)}</p>}
          </div>
          <div className="flex gap-2"><button className="btn-secondary" type="button" onClick={()=>openDetails(record)}>{tr("Details & documents","التفاصيل والمستندات")}</button>{!record.archived&&<button className="btn-secondary" type="button" onClick={()=>openDetails(record,true)}>{tr("Edit","تعديل")}</button>}</div>
        </li>)}</ul>}
        {!loading&&total>25&&<div className="mt-4 flex items-center justify-between"><button type="button" className="btn-secondary" disabled={page===1} onClick={()=>setPage(v=>v-1)}>{t("courtyard.previous")}</button><span>{page} / {Math.ceil(total/25)}</span><button type="button" className="btn-secondary" disabled={page*25>=total} onClick={()=>setPage(v=>v+1)}>{t("courtyard.next")}</button></div>}
      </section>
      </>}
    </>}
  </div>;
}
const fieldLabels:Record<string,[string,string]>={
  title:["Title","العنوان"],unit:["Unit","الوحدة"],notes:["Notes","ملاحظات"],ownerName:["Owner","المالك"],ownerPhone:["Owner phone","هاتف المالك"],
  responsibleUserId:["Responsible employee ID","معرف الموظف المسؤول"],scope:["Scope","النطاق"],feeBasis:["Fee basis","أساس الأتعاب"],commissionRate:["Commission (%)","العمولة (%)"],fixedFee:["Fixed fee (SAR)","الأتعاب الثابتة (ر.س)"],
  startDate:["Start date","تاريخ البداية"],endDate:["End date","تاريخ النهاية"],status:["Status","الحالة"],agreementId:["Agreement ID","معرف الاتفاقية"],leaseId:["Lease ID","معرف عقد الإيجار"],
  tenantName:["Tenant","المستأجر"],tenantPhone:["Tenant phone","هاتف المستأجر"],rentAmount:["Rent per installment (SAR)","الإيجار لكل دفعة (ر.س)"],frequency:["Frequency","دورية السداد"],deposit:["Deposit (SAR)","التأمين (ر.س)"],firstDueDate:["First due date","أول استحقاق"],
  amount:["Amount (SAR)","المبلغ (ر.س)"],date:["Transaction date","تاريخ العملية"],dueDate:["Due date","تاريخ الاستحقاق"],settledDate:["Payment date","تاريخ الدفع"],counterparty:["Counterparty","الطرف المقابل"],category:["Category","التصنيف"],payer:["Cost bearer","من يتحمل التكلفة"],beneficiary:["Beneficiary","المستفيد"],reference:["Invoice / receipt reference","رقم الفاتورة / الإيصال"],
};
function RecordDetails({record,employees,options,onClose,onUpdated,onArchived}:{record:OfficeRecord;employees:Employee[];options:OfficeRecord[];onClose:()=>void;onUpdated:(record:OfficeRecord)=>void;onArchived:()=>void}){
  const {locale}=useLanguage();const ar=locale==="ar";const tr=(en:string,arabic:string)=>ar?arabic:en;
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[reason,setReason]=useState("");
  const schedule=record.kind==="lease"?leaseSchedule(String(record.data.firstDueDate),String(record.data.endDate),String(record.data.frequency),Number(record.data.rentAmount)):[];
  async function attach(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value="";if(!file||busy)return;
    if(file.size>3*1024*1024){setError(tr("Maximum file size is 3 MB.","الحد الأقصى للملف ٣ ميجابايت."));return;}
    const data=new FormData();data.append("recordId",record._id);data.append("version",String(record.version));data.append("file",file);
    setBusy(true);setError("");
    try{
      const response=await fetch("/api/property-management/attachments",{method:"POST",body:data}),result=await response.json();
      if(!response.ok)throw new Error(result.error);onUpdated(result.data);
    }catch(error){setError(error instanceof Error?error.message:tr("Upload failed.","تعذر الرفع."));}finally{setBusy(false);}
  }
  async function archive(event:React.FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    try{
      const response=await fetch("/api/property-management/records",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:record._id,version:record.version,archiveReason:reason})}),result=await response.json();
      if(!response.ok)throw new Error(result.error);onArchived();
    }catch(error){setError(error instanceof Error?error.message:tr("Archive failed.","تعذرت الأرشفة."));}finally{setBusy(false);}
  }
  function displayValue(key:string,value:unknown){
    if(key==="responsibleUserId")return employees.find(user=>user.userId===value)?.name||String(value);
    if(key==="agreementId"||key==="leaseId")return String(options.find(item=>item._id===value)?.data.title||value);
    const labels:Record<string,[string,string]>={
      whole_property:["Whole property","كامل العقار"],unit:["One unit","وحدة واحدة"],collected_rent:["Rent actually collected","الإيجار المحصل فعليًا"],scheduled_rent:["Scheduled rent","الإيجار التعاقدي"],fixed:["Fixed fee","أتعاب ثابتة"],
      draft:["Draft","مسودة"],active:["Active","ساري"],ended:["Ended","منتهٍ"],pending:["Expected / unpaid","متوقع / غير مدفوع"],settled:["Received / paid","تم التحصيل / الدفع"],
      monthly:["Monthly","شهري"],quarterly:["Quarterly","ربع سنوي"],semiannual:["Every 6 months","نصف سنوي"],annual:["Annual","سنوي"],
      owner:["Owner","المالك"],tenant:["Tenant","المستأجر"],office:["Office","المكتب"],rent:["Rent","إيجار"],sale:["Sale","بيع"],deposit:["Tenant deposit","تأمين المستأجر"],commission:["Office commission","عمولة المكتب"],
      maintenance:["Maintenance","صيانة"],utilities:["Utilities","خدمات ومرافق"],cleaning:["Cleaning","نظافة"],security:["Security","أمن"],insurance:["Insurance","تأمين"],administration:["Administration","إدارة"],other:["Other","أخرى"],
    };
    return labels[String(value)]?.[ar?1:0]||String(value);
  }
  return <section className="rounded-2xl border border-ink-100 bg-white p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{String(record.data.title)}</h2><button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>{tr("Close","إغلاق")}</button></div>
    <dl className="my-5 grid gap-3 text-sm sm:grid-cols-2">{Object.entries(record.data).filter(([,value])=>value!=="").map(([key,value])=><div key={key} className="min-w-0 rounded-xl bg-stone-50 p-3"><dt className="mb-1 text-xs text-ink-500">{fieldLabels[key]?.[ar?1:0]||key}</dt><dd dir="auto" className="whitespace-pre-wrap break-words">{displayValue(key,value)}</dd></div>)}</dl>
    {schedule.length>0&&<details className="mb-5 rounded-xl border border-ink-100 p-4"><summary className="cursor-pointer font-semibold">{tr("Contracted rent schedule","جدول الإيجار التعاقدي")} ({schedule.length})</summary><p className="my-3 text-xs text-ink-500">{tr("Scheduled installments, not received payments. No automatic proration. Record receipts separately under Income.","دفعات تعاقدية وليست تحصيلات فعلية. لا يوجد توزيع نسبي تلقائي. سجّل التحصيلات بصورة مستقلة في الإيرادات.")}</p><ul className="max-h-64 overflow-auto">{schedule.map(item=><li key={item.dueDate} className="flex justify-between border-t border-ink-100 py-2 text-sm"><span>{item.dueDate}</span><span>{formatPrice(item.amount,locale)} {tr("SAR","ر.س")}</span></li>)}</ul></details>}
    {record.paymentSummary&&<p className="mb-5 text-sm">{tr("Paid","المدفوع")}: {formatPrice(record.paymentSummary.paid,locale)} · {tr("Remaining","المتبقي")}: {formatPrice(record.paymentSummary.remaining,locale)} {tr("SAR","ر.س")}</p>}
    <h3 className="font-semibold">{tr("Private documents","المستندات الخاصة")}</h3>
    <ul className="my-3 space-y-2">{record.attachments.map(file=><li key={file.id}><a className="text-sm text-brass-600 underline" href={`/api/property-management/attachments?id=${file.id}`}>{file.name}</a> <span className="text-xs text-ink-400">({Math.ceil(file.size/1024)} KB)</span></li>)}</ul>
    {!record.archived&&<label className="block text-sm">{tr("Attach PDF, JPG, PNG or WebP · up to 3 MB · maximum 10 files","أرفق PDF أو JPG أو PNG أو WebP · حتى ٣ ميجابايت · ١٠ ملفات كحد أقصى")}<input type="file" className="input-field mt-2" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy||record.attachments.length>=10} onChange={attach} /></label>}
    {busy&&<p role="status" className="mt-3 text-sm">{tr("Saving…","جارٍ الحفظ…")}</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-rust-600">{error}</p>}
    <details className="mt-5 border-t border-ink-100 pt-4"><summary className="cursor-pointer font-semibold">{tr("Change history","سجل التغييرات")} ({record.audit.length})</summary><ol className="mt-3 space-y-3">{record.audit.map((event,index)=><li key={index} className="rounded-xl border border-ink-100 p-3 text-xs"><p>{event.actorName} · <time dateTime={event.at}>{new Intl.DateTimeFormat(ar?"ar-SA":"en-GB",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Riyadh",calendar:"gregory"}).format(new Date(event.at))}</time></p><p className="mt-1">{event.action==="created"?tr("Created","إنشاء"):event.action==="updated"?tr("Updated","تعديل"):event.action==="archived"?tr("Archived","أرشفة"):tr("Document attached","إرفاق مستند")}</p>{event.reason&&<p className="mt-1">{event.reason}</p>}{event.before&&<details className="mt-2"><summary>{tr("Before / after values","القيم قبل / بعد")}</summary><pre dir="ltr" className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify({before:event.before,after:event.after},null,2)}</pre></details>}</li>)}</ol></details>
    {!record.archived&&<form onSubmit={archive} className="mt-5 border-t border-ink-100 pt-4"><label className="label-field">{tr("Archive reason (history is retained)","سبب الأرشفة (يُحتفظ بالتاريخ)")}<input className="input-field mt-2" required minLength={5} maxLength={500} value={reason} disabled={busy} onChange={e=>setReason(e.target.value)} /></label><button type="submit" className="btn-secondary mt-2" disabled={busy}>{tr("Archive record","أرشفة السجل")}</button></form>}
  </section>;
}
