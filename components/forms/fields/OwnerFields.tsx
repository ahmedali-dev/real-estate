"use client";

import { useEffect,useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import type { SavedOwnerOption } from "@/lib/owners";
import { Icon } from "@/components/ui/Icon";

import { Toggle } from "./ListingControls";
import type { ListingFormState } from "@/lib/forms/useListingFormState";

export type OwnerFormState=Pick<ListingFormState,"hasOwner"|"ownerName"|"ownerPhone"|"ownerEmail"|"ownerNotes">;

export function OwnerFields({
  form,
  update,
  errors,
  t,
}: {
  form: OwnerFormState;
  update: <K extends keyof OwnerFormState>(key: K, value: ListingFormState[K]) => void;
  errors: Record<string, string>;
  t: (key: string) => string;
}) {
  const {locale}=useLanguage();const ar=locale==="ar";const tr=(en:string,arabic:string)=>ar?arabic:en;
  const [mode,setMode]=useState<"saved"|"new"|"current">(()=>form.ownerName||form.ownerPhone?"current":"saved");
  const [selected,setSelected]=useState<SavedOwnerOption>();
  const [rows,setRows]=useState<SavedOwnerOption[]>([]),[search,setSearch]=useState("");
  const [page,setPage]=useState(1),[hasMore,setHasMore]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{
    if(!form.hasOwner||mode!=="saved")return;const controller=new AbortController();setLoading(true);setError(false);
    const timer=setTimeout(()=>{fetch(`/api/owners?${new URLSearchParams({search,page:String(page)})}`,{signal:controller.signal,cache:"no-store"}).then(async response=>{if(!response.ok)throw new Error();const result=await response.json();if(!controller.signal.aborted){setRows(result.data);setHasMore(result.hasMore);}}).catch(()=>{if(!controller.signal.aborted){setError(true);setRows([]);setHasMore(false);}}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},200);
    return()=>{clearTimeout(timer);controller.abort();};
  },[form.hasOwner,mode,search,page,retry]);
  function choose(owner:SavedOwnerOption){setSelected(owner);update("ownerName",owner.name);update("ownerPhone",owner.phone);update("ownerEmail",owner.email);update("ownerNotes",owner.notes);}
  function addNew(){if(mode==="new")return;setMode("new");setSelected(undefined);update("ownerName","");update("ownerPhone","");update("ownerEmail","");update("ownerNotes","");}
  return (
    <section>
      <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold text-ink-800"><Icon name="user" className="h-5 w-5 text-moss-500" />
        {t("form.ownerSection")} <span className="font-body text-xs font-normal text-ink-400">{t("form.optionalHint")}</span>
      </h3>
      <div className="mt-3"><Toggle checked={form.hasOwner} onChange={(checked) => update("hasOwner", checked)} label={t("form.hasOwner")} /></div>
      {form.hasOwner&&<div className="mt-4 space-y-3">
        <div className="flex flex-wrap gap-2"><button type="button" className={mode==="saved"?"btn-primary":"btn-secondary"} aria-pressed={mode==="saved"} onClick={()=>setMode("saved")}>{tr("Choose saved owner","اختيار مالك محفوظ")}</button><button type="button" className={mode==="new"?"btn-primary":"btn-secondary"} aria-pressed={mode==="new"} onClick={addNew}>{tr("Add new owner","إضافة مالك جديد")}</button></div>
        {mode==="saved"&&<div className="space-y-3 rounded-xl border border-ink-100 p-4">
          <label className="block"><span className="label-field">{tr("Search owners by name or phone","البحث عن مالك بالاسم أو الهاتف")}</span><input type="search" className="input-field" maxLength={200} value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} /></label>
          <label className="block"><span className="label-field">{tr("Saved owner","المالك المحفوظ")}</span><SelectDropdown className="input-field" required value={selected?.id||(form.ownerName?"__current":"")} onChange={e=>{if(e.target.value==="__new"){addNew();return;}if(e.target.value==="__current")return;const owner=rows.find(row=>row.id===e.target.value);if(owner)choose(owner);}}>
            <option value="">{tr("Choose an owner…","اختر المالك…")}</option>
            {!selected&&form.ownerName&&<option value="__current">{tr("Current owner","المالك الحالي")} · {form.ownerName} · {form.ownerPhone}</option>}
            {selected&&!rows.some(row=>row.id===selected.id)&&<option value={selected.id}>{selected.name} · {selected.phone}</option>}
            {rows.map(owner=><option key={owner.id} value={owner.id}>{owner.name} · {owner.phone}</option>)}
            <option value="__new">+ {tr("Owner not found? Add new owner","لم تجد المالك؟ أضف مالكًا جديدًا")}</option>
          </SelectDropdown></label>
          {loading&&<p role="status" className="text-xs text-ink-500">{tr("Loading saved owners…","جارٍ تحميل الملاك المحفوظين…")}</p>}
          {error&&<p role="alert" className="text-xs text-rust-600">{tr("Unable to load owners.","تعذر تحميل الملاك.")} <button type="button" className="underline" onClick={()=>setRetry(v=>v+1)}>{tr("Retry","إعادة المحاولة")}</button></p>}
          {!loading&&!error&&!rows.length&&<p className="text-xs text-ink-500">{tr("No saved owners found. Add a new owner below.","لا يوجد ملاك مطابقون. يمكنك إضافة مالك جديد.")}</p>}
          {(page>1||hasMore)&&<div className="flex items-center justify-between gap-3"><button type="button" className="btn-secondary" disabled={loading||page===1} onClick={()=>setPage(v=>v-1)}>{tr("Previous","السابق")}</button><span className="text-xs">{page}</span><button type="button" className="btn-secondary" disabled={loading||!hasMore} onClick={()=>setPage(v=>v+1)}>{tr("Next","التالي")}</button></div>}
        </div>}
        <p className="text-xs leading-6 text-ink-500">{tr("Owner information is saved with this listing and becomes available for future listings. Changes apply to this listing only.","تُحفظ بيانات المالك عند حفظ العقار لتتوفر في العقارات القادمة. تعديل البيانات يخص هذا العقار فقط.")}</p>
      </div>}
      {form.hasOwner && (mode!=="saved"||selected||form.ownerName) && <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label className="label-field" htmlFor="ownerName">{t("form.ownerName")}</label>
          <input
            id="ownerName"
            required
            className="input-field"
            value={form.ownerName}
            onChange={(e) => update("ownerName", e.target.value)}
          />
          {errors["owner.name"] && <p className="field-error">{errors["owner.name"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="ownerPhone">{t("form.ownerPhone")}</label>
          <input
            id="ownerPhone"
            type="tel"
            required
            className="input-field"
            value={form.ownerPhone}
            onChange={(e) => update("ownerPhone", e.target.value)}
          />
          {errors["owner.phone"] && <p className="field-error">{errors["owner.phone"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="ownerEmail">{t("form.ownerEmail")}</label>
          <input
            id="ownerEmail"
            type="email"
            className="input-field"
            value={form.ownerEmail}
            onChange={(e) => update("ownerEmail", e.target.value)}
          />
          {errors["owner.email"] && <p className="field-error">{errors["owner.email"]}</p>}
        </div>
        <div>
          <label className="label-field" htmlFor="ownerNotes">{t("form.ownerNotes")}</label>
          <input
            id="ownerNotes"
            className="input-field"
            value={form.ownerNotes}
            onChange={(e) => update("ownerNotes", e.target.value)}
            placeholder={t("form.ownerNotesPlaceholder")}
          />
        </div>
      </div>}
    </section>
  );
}
