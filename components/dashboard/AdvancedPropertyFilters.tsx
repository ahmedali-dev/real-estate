"use client";
import { useEffect, useState } from "react";
import { dashboardFilterGroups } from "@/lib/dashboard-filters";
import type { FilterState } from "@/components/properties/FilterBar";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
export function AdvancedPropertyFilters({ value, onChange }: { value: FilterState; onChange: (next: FilterState) => void }) {
  const { locale } = useLanguage(); const ar = locale === "ar";
  const [users, setUsers] = useState<{ userId: string; name: string }[]>([]);
  const [failed, setFailed] = useState(false); const [loading, setLoading] = useState(true); const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setFailed(false);
    fetch('/api/users/options', { signal: controller.signal }).then(async response => { if (!response.ok) throw Error(); const result = await response.json(); if (!controller.signal.aborted) setUsers(result.data); }).catch(() => { if (!controller.signal.aborted) setFailed(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return <div className="col-span-full space-y-3">
    <p className="text-xs text-ink-500">{ar ? "معايير الغرف والمستأجر والوحدة يجب أن تتطابق في نفس الوحدة داخل المبنى. التواريخ بتوقيت UTC." : "Room, tenant and unit criteria must match the same unit in a building. Date ranges use UTC."}</p>
    {dashboardFilterGroups.filter(group => !(('nonLand' in group && group.nonLand) && value.category === 'land') && !(('building' in group && group.building) && value.category && value.category !== 'build')).map(group => <details key={group.en} className="rounded-xl border border-ink-100 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold">{ar ? group.ar : group.en} {group.fields.some(field => value[field.key]) && <span className="text-moss-600">•</span>}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
      {group.fields.map(field => <label key={field.key}><span className="label-field">{ar ? field.ar : field.en}</span>
        {field.type === 'boolean' ? <select className="input-field" value={value[field.key] || ''} onChange={e => onChange({ ...value, [field.key]: e.target.value })}><option value="">{ar ? "الكل" : "All"}</option><option value="yes">{ar ? "نعم" : "Yes"}</option><option value="no">{ar ? "لا" : "No"}</option></select>
        : field.type === 'period' ? <select className="input-field" value={value[field.key] || ''} onChange={e => onChange({ ...value, [field.key]: e.target.value })}><option value="">{ar ? "الكل" : "All"}</option><option value="monthly">{ar ? "شهري" : "Monthly"}</option><option value="yearly">{ar ? "سنوي" : "Yearly"}</option></select>
        : field.type === 'user' ? <><select className="input-field" disabled={loading || failed} value={value[field.key] || ''} onChange={e => onChange({ ...value, [field.key]: e.target.value })}><option value="">{loading ? (ar ? "جارٍ التحميل…" : "Loading…") : ar ? "جميع الموظفين" : "All staff"}</option>{value.broughtByUserId && !users.some(u => u.userId === value.broughtByUserId) && <option value={value.broughtByUserId}>{ar ? "الموظف المحدد" : "Selected staff"}</option>}{users.map(user => <option key={user.userId} value={user.userId}>{user.name}</option>)}</select>{failed && <button type="button" className="text-xs underline" onClick={() => setAttempt(n => n + 1)}>{ar ? "تعذر تحميل الموظفين — إعادة المحاولة" : "Could not load staff — retry"}</button>}</>
        : <input type={field.type} min={field.type === 'number' ? 0 : undefined} max={field.type === 'number' ? 200 : undefined} step={field.type === 'number' ? 1 : undefined} maxLength={field.type === 'text' ? 200 : undefined} className="input-field" value={value[field.key] || ''} onChange={e => onChange({ ...value, [field.key]: e.target.value })} />}
      </label>)}
    </div></details>)}
  </div>;
}
