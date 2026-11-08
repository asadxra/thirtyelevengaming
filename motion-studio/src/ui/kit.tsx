import { ChevronDown, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/store';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

/** Number input with click-drag scrubbing on the label. */
export function Num({ label, value, onChange, step = 1, min, max, suffix, className, title, precision }: {
  label?: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string; className?: string; title?: string; precision?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const clampV = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
  const p = precision ?? (step < 0.01 ? 3 : step < 1 ? 2 : 0);
  const shown = draft ?? (Number.isFinite(value) ? String(+value.toFixed(p)) : '');
  const onScrub = (e: React.PointerEvent) => {
    const x0 = e.clientX, v0 = value;
    const move = (ev: PointerEvent) => onChange(clampV(+(v0 + Math.round((ev.clientX - x0) / 2) * step).toFixed(p)));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); useStore.getState().checkpoint(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return (
    <label className={cx('flex items-center gap-1.5 min-w-0', className)} title={title}>
      {label && <span onPointerDown={onScrub} className="text-[11px] text-slate-500 cursor-ew-resize select-none shrink-0 w-auto min-w-[14px]">{label}</span>}
      <div className="relative flex-1 min-w-0">
        <input
          className="input pr-6 tabular-nums"
          value={shown}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { if (draft !== null) { const v = parseFloat(draft); if (Number.isFinite(v)) onChange(clampV(v)); setDraft(null); } }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); onChange(clampV(+(value + (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)).toFixed(p))); }
          }}
        />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-500 pointer-events-none">{suffix}</span>}
      </div>
    </label>
  );
}

export function Text({ label, value, onChange, multiline, placeholder, rows = 3 }: { label?: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; rows?: number }) {
  return (
    <label className="block space-y-1">
      {label && <span className="label">{label}</span>}
      {multiline
        ? <textarea className="input h-auto py-1.5 resize-y min-h-[60px]" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        : <input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

export function Select<T extends string>({ label, value, options, onChange, className }: { label?: string; value: T; options: readonly (T | { value: T; label: string })[]; onChange: (v: T) => void; className?: string }) {
  return (
    <label className={cx('block space-y-1 min-w-0', className)}>
      {label && <span className="label">{label}</span>}
      <div className="relative">
        <select className="input appearance-none pr-7 cursor-pointer" value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            const l = typeof o === 'string' ? o : o.label;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </label>
  );
}

export function Color({ label, value, onChange, allowNone }: { label?: string; value: string; onChange: (v: string) => void; allowNone?: boolean }) {
  const isNone = !value || value === 'none';
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : /^#[0-9a-f]{8}$/i.test(value) ? value.slice(0, 7) : '#000000';
  return (
    <label className="flex items-center gap-2 min-w-0">
      {label && <span className="text-[11px] text-slate-500 w-14 shrink-0 truncate">{label}</span>}
      <input type="color" className="w-7 h-7 shrink-0 cursor-pointer" value={hex} onChange={(e) => onChange(e.target.value)} disabled={isNone && false} />
      <input className="input font-mono text-[12px]" value={value} onChange={(e) => onChange(e.target.value)} />
      {allowNone && <button type="button" className={cx('icon-btn shrink-0', isNone && 'icon-btn-on')} title="No color" onClick={() => onChange(isNone ? '#ffffff' : 'none')}><X size={13} /></button>}
    </label>
  );
}

export function Toggle({ label, value, onChange, small }: { label?: string; value: boolean; onChange: (v: boolean) => void; small?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
      {label && <span className={cx('text-slate-300', small ? 'text-[12px]' : 'text-[13px]')}>{label}</span>}
      <button type="button" onClick={() => onChange(!value)} className={cx('relative w-9 h-5 rounded-full transition-colors shrink-0', value ? 'bg-accent' : 'bg-white/10')}>
        <span className={cx('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', value ? 'left-[18px]' : 'left-0.5')} />
      </button>
    </label>
  );
}

export function Slider({ label, value, onChange, min, max, step = 0.01, suffix }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5"><span>{label}</span><span className="tabular-nums text-slate-400">{+value.toFixed(2)}{suffix}</span></div>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} onPointerUp={() => useStore.getState().checkpoint()} />
    </label>
  );
}

export function Section({ title, children, defaultOpen = true, right, className }: { title: string; children: React.ReactNode; defaultOpen?: boolean; right?: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cx('border-b border-white/[0.05]', className)}>
      <div className="flex items-center justify-between px-3 h-9">
        <button type="button" className="flex items-center gap-1.5 label hover:text-slate-300" onClick={() => setOpen(!open)}>
          <ChevronDown size={13} className={cx('transition-transform', !open && '-rotate-90')} />{title}
        </button>
        {right}
      </div>
      {open && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean | 'xl'; footer?: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm fade-up" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={cx('panel bg-ink-850 w-full max-h-[92vh] flex flex-col shadow-2xl', wide === 'xl' ? 'max-w-6xl' : wide ? 'max-w-4xl' : 'max-w-lg')}>
        <div className="flex items-center justify-between px-5 h-12 border-b border-white/[0.06] shrink-0">
          <div className="font-semibold text-[15px] truncate">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="p-5 overflow-auto flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-white/[0.06] flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cx('flex items-center gap-1 overflow-x-auto', className)}>
      {tabs.map((t) => <button key={t.value} type="button" className={cx('tab shrink-0', value === t.value && 'tab-on')} onClick={() => onChange(t.value)}>{t.label}</button>)}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon?: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 gap-3">
      {icon && <div className="text-accent/80">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {text && <div className="text-sm text-slate-400 max-w-sm">{text}</div>}
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, icon }: { title: string; subtitle?: string; actions?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {icon && <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center shadow-glow shrink-0">{icon}</div>}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Prompt for a string with a small modal. */
export function usePrompt() {
  const [state, setState] = useState<{ title: string; value: string; resolve: (v: string | null) => void } | null>(null);
  const ask = (title: string, value = '') => new Promise<string | null>((resolve) => setState({ title, value, resolve }));
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state) setTimeout(() => ref.current?.select(), 30); }, [state]);
  const close = (v: string | null) => { state?.resolve(v); setState(null); };
  const node = state ? (
    <Modal open title={state.title} onClose={() => close(null)} footer={<><button className="btn-ghost" onClick={() => close(null)}>Cancel</button><button className="btn-primary" onClick={() => close(state.value)}>OK</button></>}>
      <input ref={ref} className="input" value={state.value} onChange={(e) => setState({ ...state, value: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && close(state.value)} />
    </Modal>
  ) : null;
  return { ask, node };
}

export function confirmAction(msg: string) {
  return window.confirm(msg);
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}

export function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function fmtBytes(n?: number) {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
