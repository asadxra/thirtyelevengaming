import React, { useRef } from 'react';
import { EASING_BEZIER, EASING_NAMES, easingFn } from '../../engine/easing';
import type { Easing } from '../../engine/schema';
import { useStore } from '../../store/store';
import { Num, Select } from '../../ui/kit';

/** Named easing picker + draggable cubic-bezier curve editor. */
export function EasingEditor({ value, onChange, label = 'Easing' }: { value: Easing; onChange: (e: Easing) => void; label?: string }) {
  const custom = Array.isArray(value);
  const bez: [number, number, number, number] = custom ? value : EASING_BEZIER[value] ?? [0.42, 0, 0.58, 1];
  const svgRef = useRef<SVGSVGElement>(null);
  const S = 120, PAD = 30;
  const toPx = (x: number, y: number) => [PAD + x * S, PAD + (1 - y) * S];
  const fn = easingFn(value);
  const curve = Array.from({ length: 41 }, (_, i) => { const x = i / 40; const [px, py] = toPx(x, fn(x)); return `${px.toFixed(1)},${py.toFixed(1)}`; }).join(' ');

  const drag = (which: 0 | 1) => (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const r = svgRef.current!.getBoundingClientRect();
      const sx = (S + PAD * 2) / r.width;
      const x = Math.min(1, Math.max(0, ((ev.clientX - r.left) * sx - PAD) / S));
      const y = Math.min(2, Math.max(-1, 1 - ((ev.clientY - r.top) * sx - PAD) / S));
      const nb: [number, number, number, number] = [...bez];
      nb[which * 2] = +x.toFixed(3); nb[which * 2 + 1] = +y.toFixed(3);
      onChange(nb);
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); useStore.getState().checkpoint(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const [p1x, p1y] = toPx(bez[0], bez[1]);
  const [p2x, p2y] = toPx(bez[2], bez[3]);
  const [ax, ay] = toPx(0, 0), [bx, by] = toPx(1, 1);
  const editable = custom || !!EASING_BEZIER[value as keyof typeof EASING_BEZIER];

  return (
    <div className="space-y-2">
      <Select label={label} value={custom ? 'custom' : (value as string)} onChange={(v) => onChange(v === 'custom' ? [...bez] as [number, number, number, number] : (v as Easing))}
        options={[...EASING_NAMES.map((n) => ({ value: n, label: n })), { value: 'custom', label: 'Custom cubic-bezier…' }]} />
      <div className="flex gap-2 items-start">
        <svg ref={svgRef} viewBox={`0 0 ${S + PAD * 2} ${S + PAD * 2}`} className="w-32 h-32 shrink-0 rounded-md bg-ink-950 border border-white/[0.06] touch-none">
          <rect x={PAD} y={PAD} width={S} height={S} fill="none" stroke="#ffffff14" />
          <polyline points={curve} fill="none" stroke="rgb(var(--accent))" strokeWidth={2.5} />
          {editable && (
            <>
              <line x1={ax} y1={ay} x2={p1x} y2={p1y} stroke="#94a3b8" strokeWidth={1} />
              <line x1={bx} y1={by} x2={p2x} y2={p2y} stroke="#94a3b8" strokeWidth={1} />
              <circle cx={p1x} cy={p1y} r={6} fill="#fff" stroke="rgb(var(--accent))" strokeWidth={2} style={{ cursor: 'grab' }} onPointerDown={drag(0)} />
              <circle cx={p2x} cy={p2y} r={6} fill="#fff" stroke="rgb(var(--accent))" strokeWidth={2} style={{ cursor: 'grab' }} onPointerDown={drag(1)} />
            </>
          )}
        </svg>
        {editable ? (
          <div className="grid grid-cols-2 gap-1 flex-1">
            {(['x1', 'y1', 'x2', 'y2'] as const).map((k, i) => (
              <Num key={k} label={k} step={0.01} value={bez[i]} onChange={(v) => { const nb: [number, number, number, number] = [...bez]; nb[i] = v; onChange(nb); }} />
            ))}
            <div className="col-span-2 text-[10px] text-slate-500 leading-tight">Drag the handles to shape the curve. Editing a named curve converts it to custom.</div>
          </div>
        ) : <div className="text-[11px] text-slate-500">Procedural curve ({value as string}).</div>}
      </div>
    </div>
  );
}
