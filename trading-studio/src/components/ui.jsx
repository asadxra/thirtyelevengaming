import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';

export function Button({ variant = 'default', size, icon, children, loading, className = '', ...props }) {
  return (
    <button className={`btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon, title, className = '', ...props }) {
  return (
    <button className={`icon-btn ${className}`} title={title} aria-label={title} {...props}>
      <Icon name={icon} size={16} />
    </button>
  );
}

export function Panel({ title, subtitle, actions, children, className = '', pad = true, ...rest }) {
  return (
    <section className={`panel ${className}`} {...rest}>
      {(title || actions) && (
        <header className="panel-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions && <div className="row gap-s">{actions}</div>}
        </header>
      )}
      <div className={pad ? 'panel-body' : ''}>{children}</div>
    </section>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      {label && <span className="field-label">{label}</span>}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Input({ label, hint, className = '', ...props }) {
  const el = <input className={`input ${label ? '' : className}`} {...props} />;
  return label ? <Field label={label} hint={hint} className={className}>{el}</Field> : el;
}

export function TextArea({ label, hint, className, autoGrow, ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    if (autoGrow && ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight + 2}px`;
    }
  }, [props.value, autoGrow]);
  const el = <textarea ref={ref} className="input textarea" {...props} />;
  return label ? <Field label={label} hint={hint} className={className}>{el}</Field> : el;
}

export function Select({ label, options, hint, className, ...props }) {
  const el = (
    <select className="input select" {...props}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  );
  return label ? <Field label={label} hint={hint} className={className}>{el}</Field> : el;
}

export function Slider({ label, value, min = 0, max = 1, step = 0.01, onChange, format = (v) => v, className = '' }) {
  return (
    <div className={`field slider ${className}`}>
      <div className="row between">
        <span className="field-label">{label}</span>
        <span className="mono small accent-text">{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="field-label">{label}</span>
        {hint && <span className="field-hint block">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} className={`toggle ${checked ? 'on' : ''}`} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}

export function ColorInput({ label, value, onChange }) {
  return (
    <div className="field color-field">
      <span className="field-label">{label}</span>
      <div className="color-input">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <input className="input mono" value={value} onChange={(e) => /^#[0-9a-f]{0,6}$/i.test(e.target.value) && onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function Badge({ tone = 'muted', children, dot }) {
  return <span className={`badge badge-${tone}`}>{dot && <i className="dot" />}{children}</span>;
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={`tab ${value === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.badge != null && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chips({ options, value, onChange, multi }) {
  const isOn = (v) => (multi ? value.includes(v) : value === v);
  return (
    <div className="chips">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return (
          <button key={opt.value} type="button" className={`chip ${isOn(opt.value) ? 'on' : ''}`}
            onClick={() => onChange(multi ? (isOn(opt.value) ? value.filter((x) => x !== opt.value) : [...value, opt.value]) : opt.value)}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, width = 520 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal panel" style={{ width }} role="dialog" aria-modal="true" aria-label={title}>
        <header className="panel-head">
          <h3>{title}</h3>
          <IconButton icon="x" title="Close" onClick={onClose} />
        </header>
        <div className="panel-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirm({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose, children }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{confirmLabel}</Button>
      </>}>
      {message && <p>{message}</p>}
      {children}
    </Modal>
  );
}

export function Prompt({ open, title, label, initial = '', confirmLabel = 'Save', onSubmit, onClose }) {
  const [v, setV] = useState(initial);
  useEffect(() => { if (open) setV(initial); }, [open, initial]);
  return (
    <Modal open={open} title={title} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!v.trim()} onClick={() => onSubmit(v.trim())}>{confirmLabel}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }}>
        <Input label={label} value={v} autoFocus onChange={(e) => setV(e.target.value)} />
      </form>
    </Modal>
  );
}

export function Empty({ icon = 'sparkles', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={26} /></div>
      <h4>{title}</h4>
      {children && <p className="muted">{children}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }) {
  return <div className="loading"><span className="spinner lg" />{label && <span className="muted">{label}</span>}</div>;
}

export function SaveIndicator({ state }) {
  const map = { pending: ['Unsaved changes', 'warn'], saving: ['Saving…', 'accent'], saved: ['All changes saved', 'ok'], error: ['Save failed — retrying on next edit', 'bad'] };
  const [text, tone] = map[state] || ['Saved', 'ok'];
  return <Badge tone={tone} dot>{text}</Badge>;
}

export function Menu({ items, icon = 'more' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <IconButton icon={icon} title="More actions" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} />
      {open && (
        <div className="menu-pop panel">
          {items.filter(Boolean).map((it) => (
            <button key={it.label} className={`menu-item ${it.danger ? 'danger' : ''}`} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}>
              {it.icon && <Icon name={it.icon} size={15} />}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toasts({ toasts }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>)}
    </div>
  );
}

export function Stat({ label, value, icon, tone = 'primary', onClick }) {
  return (
    <button className={`stat panel tone-${tone}`} onClick={onClick}>
      <div className="stat-icon"><Icon name={icon} size={20} /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="muted small">{label}</div>
      </div>
    </button>
  );
}

export function timeAgo(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
