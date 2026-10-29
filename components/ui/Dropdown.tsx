"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { createPortal } from "react-dom";

/** A disclosure panel supports links, buttons and form controls without menu-role traps. */
export function Dropdown({ label, children }: { label: string; children: ReactNode }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!position) return;
    function outside(event: PointerEvent) { if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setPosition(null); trigger.current?.focus(); } }
    function close(event: Event) { if (!panel.current?.contains(event.target as Node)) setPosition(null); }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    panel.current?.querySelector<HTMLElement>('button:not(:disabled), a[href], select, input')?.focus();
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [position]);
  return <>
    <button type="button" ref={trigger} aria-expanded={Boolean(position)} className="btn-secondary gap-2" onClick={() => { if (position) { setPosition(null); return; } const box = trigger.current!.getBoundingClientRect(); setPosition({ top: box.bottom + 6, left: Math.max(8, Math.min(box.right - 288, window.innerWidth - 296)) }); }}>{label}<Icon name="chevronDown" className={`h-4 w-4 transition-transform ${position ? "rotate-180" : ""}`} /></button>
    {position && createPortal(<div ref={panel} aria-label={label} className="dashboard-dropdown fixed z-50 flex w-72 flex-col gap-3 overflow-y-auto rounded-xl border border-ink-100 bg-white p-4 shadow-xl" style={{ top: Math.min(position.top, Math.max(8, window.innerHeight - 300)), left: position.left, maxHeight: 'min(70vh, 420px)' }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node) && event.relatedTarget !== trigger.current) setPosition(null); }}>{children}</div>, document.body)}
  </>;
}
