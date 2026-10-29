"use client";
import { Children, isValidElement, useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

type Option = { value: string; label: string; disabled: boolean };
function plain(node: ReactNode): string { return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child) ? plain(child.props.children) : String(child ?? "")).join(""); }
function optionsFrom(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap(child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return [];
    if (child.type === "option") return [{ value: String(child.props.value ?? plain(child.props.children)), label: plain(child.props.children), disabled: Boolean(child.props.disabled) }];
    return optionsFrom(child.props.children);
  });
}
/** Custom combobox; a visually hidden native field preserves form submission and validation. */
export function SelectDropdown({ children, value, defaultValue, onChange, className = "", id, disabled, required, autoFocus, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const options = optionsFrom(children);
  const uid = useId(); const listId = `${uid}-options`;
  const button = useRef<HTMLButtonElement>(null); const native = useRef<HTMLSelectElement>(null); const panel = useRef<HTMLDivElement>(null);
  const [internal, setInternal] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const selected = String(value ?? internal); const index = options.findIndex(option => option.value === selected);
  const [open, setOpen] = useState(false); const [active, setActive] = useState(0); const [invalid, setInvalid] = useState(false);
  const [place, setPlace] = useState({ top: 0, left: 0, width: 220, height: 280 });
  const [host, setHost] = useState<HTMLElement | null>(null);
  const typed = useRef({ text: "", time: 0 });
  function reveal() {
    if (disabled || button.current?.matches(":disabled")) return;
    const box = button.current!.getBoundingClientRect();
    const below = window.innerHeight - box.bottom - 12; const above = box.top - 12;
    const height = Math.max(80, Math.min(280, Math.max(below, above)));
    const width = Math.min(Math.max(box.width, 200), window.innerWidth - 16);
    setPlace({ top: below >= Math.min(280, above) ? box.bottom + 6 : Math.max(8, box.top - height - 6), left: Math.max(8, Math.min(box.left, window.innerWidth - width - 8)), width, height });
    setHost(button.current?.closest<HTMLElement>('dialog, .dashboard-dropdown') || document.body);
    setActive(index >= 0 && !options[index].disabled ? index : Math.max(0, options.findIndex(option => !option.disabled)));
    setOpen(true);
  }
  function choose(option: Option) {
    if (option.disabled || disabled) return;
    setInternal(option.value); setInvalid(false); setOpen(false);
    if (native.current) {
      native.current.value = option.value;
      onChange?.({ target: native.current, currentTarget: native.current, type: "change" } as ChangeEvent<HTMLSelectElement>);
    }
    button.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!panel.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false); }
    function close(event: Event) { if (!panel.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", outside); window.addEventListener("resize", close); window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("pointerdown", outside); window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [open]);
  useEffect(() => {
    const list = panel.current;
    const option = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!open || !list || !option) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
  }, [active, open]);
  function keyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape") { if (open) { event.preventDefault(); event.stopPropagation(); setOpen(false); } return; }
    if (event.key === "Tab") { setOpen(false); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault(); if (!open) { reveal(); return; }
      const allowed = options.map((option, i) => option.disabled ? -1 : i).filter(i => i >= 0);
      const pos = allowed.indexOf(active);
      setActive(event.key === "Home" ? allowed[0] ?? 0 : event.key === "End" ? allowed[allowed.length - 1] ?? 0 : allowed[(pos + (event.key === "ArrowDown" ? 1 : -1) + allowed.length) % allowed.length] ?? 0); return;
    }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (open && options[active]) choose(options[active]); else reveal(); return; }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault(); const now = Date.now(); typed.current = { text: now - typed.current.time < 700 ? typed.current.text + event.key : event.key, time: now };
      const found = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase().startsWith(typed.current.text.toLocaleLowerCase()));
      if (found >= 0) { if (open) setActive(found); else choose(options[found]); }
    }
  }
  return <span className={`select-dropdown ${className.includes("input-field") ? "select-dropdown-field" : ""}`}>
    <select {...props} ref={native} value={selected} onChange={onChange} disabled={disabled} required={required} aria-hidden="true" tabIndex={-1} className="select-dropdown-native" onInvalid={event => { event.preventDefault(); setInvalid(true); button.current?.focus(); reveal(); }}>{children}</select>
    <button id={id} ref={button} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open ? `${uid}-${active}` : undefined} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} aria-required={required} aria-invalid={invalid || props['aria-invalid']} disabled={disabled} autoFocus={autoFocus} className={`select-dropdown-trigger ${className}`} onClick={() => open ? setOpen(false) : reveal()} onKeyDown={keyDown} onBlur={event => { if (!panel.current?.contains(event.relatedTarget as Node)) setOpen(false); }}><span className="min-w-0 truncate">{options[index]?.label || options[0]?.label || "—"}</span><Icon name="chevronDown" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
    {open && host && createPortal(<div ref={panel} id={listId} role="listbox" aria-label={props['aria-label']} className="select-dropdown-options" dir={button.current?.closest('[dir]')?.getAttribute('dir') || undefined} style={{ position: 'fixed', ...place, maxHeight: place.height, height: 'auto', zIndex: 100 }} onMouseDown={event => event.preventDefault()}>{options.map((option, i) => <div key={`${option.value}-${i}`} id={`${uid}-${i}`} role="option" aria-selected={selected === option.value} aria-disabled={option.disabled} data-active={active === i} onMouseMove={() => !option.disabled && setActive(i)} onClick={() => choose(option)} className="select-dropdown-option"><span>{option.label}</span>{selected === option.value && <Icon name="check" className="h-4 w-4" />}</div>)}</div>, host)}
  </span>;
}
