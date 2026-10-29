"use client";
import { SelectDropdown } from "@/components/ui/SelectDropdown";
import { useEffect, useRef, useState } from "react";
import type { OrderDTO } from "@/types/order";
import type { WhatsAppGroup } from "@/lib/openwa-groups";
import { orderWhatsAppMessage } from "@/lib/order-message";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function OrderWhatsAppDialog({ order, onClose }: { order: OrderDTO; onClose: () => void }) {
  const { t, locale } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const sending = useRef(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [groupId, setGroupId] = useState("");
  const [language, setLanguage] = useState<"ar" | "en">(locale);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [locked, setLocked] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(false);
    fetch('/api/whatsapp/groups', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Groups unavailable');
      const result = await response.json();
      if (!controller.signal.aborted) setGroups(result.data);
    }).catch(() => { if (!controller.signal.aborted) setLoadError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (sending.current || locked || !groupId) return;
    sending.current = true; setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/orders/${order._id}/whatsapp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groupId, locale: language }) });
      const result = await response.json();
      if (response.ok && result.success === true) { setNotice('sendAccepted'); setLocked(true); }
      else {
        const allowed = ['openwaSetup', 'openwaAuth', 'openwaNotReady', 'openwaLicense', 'invalidRecipient'];
        setNotice(allowed.includes(result.code) ? result.code : 'sendFailed');
        if (!allowed.includes(result.code)) setLocked(true);
      }
    } catch { setNotice('sendFailed'); setLocked(true); }
    finally { sending.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="order-whatsapp-title" onCancel={event => { event.preventDefault(); if (!sending.current) onClose(); }} className="w-[calc(100%-2rem)] max-w-xl rounded-2xl border border-ink-100 bg-white p-6 backdrop:bg-ink-900/50">
    <div className="flex items-center justify-between gap-4"><h2 id="order-whatsapp-title" className="text-lg font-semibold">{t('orders.sendGroup')}</h2><button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>{t('common.close')}</button></div>
    <p className="mt-2 text-sm text-ink-500">{t('orders.directHint')}</p>
    <form onSubmit={send} className="mt-5 space-y-4">
      <label className="block text-sm">{t('orders.chooseGroup')}<SelectDropdown required className="input-field mt-2" value={groupId} disabled={loading || loadError || busy || locked} onChange={event => setGroupId(event.target.value)}><option value="">{t(loading ? 'orders.groupsLoading' : 'orders.chooseGroup')}</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</SelectDropdown></label>
      {loadError ? <p role="alert" className="text-sm text-rust-500">{t('orders.groupsFailed')} <button type="button" className="underline" onClick={() => setAttempt(value => value + 1)}>{t('offer.retry')}</button></p> : !loading && groups.length === 0 ? <p role="status" className="text-sm">{t('orders.noGroups')}</p> : null}
      <label className="block text-sm">{t('property.messageLanguage')}<SelectDropdown className="input-field mt-2" value={language} disabled={busy || locked} onChange={event => setLanguage(event.target.value as 'en' | 'ar')}><option value="ar">العربية</option><option value="en">English</option></SelectDropdown></label>
      <p className="text-xs font-semibold">{t('property.messagePreview')}</p><p dir={language === 'ar' ? 'rtl' : 'ltr'} className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-stone-50 p-4 text-sm leading-relaxed">{orderWhatsAppMessage(order, language)}</p>
      {notice && <p role="status" className="text-sm">{t(`property.${notice}`)}</p>}
      <button type="submit" disabled={!groupId || loading || loadError || busy || locked} className="btn-primary">{t(busy ? 'property.sendingProperty' : 'orders.sendGroup')}</button>
    </form>
  </dialog>;
}
