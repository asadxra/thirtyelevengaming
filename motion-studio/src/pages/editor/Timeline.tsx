import { ChevronFirst, ChevronLast, Eye, EyeOff, Lock, Pause, Play, Repeat, SkipBack, SkipForward, Unlock, Video } from 'lucide-react';
import React, { useRef, useState } from 'react';
import type { CameraProp, Scene, SceneElement, TrackProp } from '../../engine/schema';
import { useStore } from '../../store/store';
import { mutateElement, mutateScene, removeCameraKey, removeKeyframe, snapTime, updateKeyframe } from '../../ui/editing';
import { cx } from '../../ui/kit';

const LABEL_W = 190;

export function Timeline({ scene, duration, sequence }: { scene: Scene; duration: number; sequence?: boolean }) {
  const ui = useStore((s) => s.ui);
  const ui$ = useStore((s) => s.ui$);
  const [pps, setPps] = useState(120);
  const areaRef = useRef<HTMLDivElement>(null);
  const fps = scene.fps;
  const totalW = Math.max(400, duration * pps + 40);

  const timeFromX = (clientX: number) => {
    const r = areaRef.current!.getBoundingClientRect();
    return Math.min(duration, Math.max(0, (clientX - r.left) / pps));
  };
  const scrub = (e: React.PointerEvent) => {
    ui$({ playing: false, time: snapTime(timeFromX(e.clientX), fps) });
    const move = (ev: PointerEvent) => ui$({ time: snapTime(timeFromX(ev.clientX), fps) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const frame = Math.round(ui.time * fps);
  const step = (d: number) => ui$({ playing: false, time: Math.min(duration, Math.max(0, (frame + d) / fps)) });

  const dragBar = (e: React.PointerEvent, el: SceneElement, mode: 'move' | 'start' | 'end') => {
    e.stopPropagation();
    ui$({ selectedIds: [el.id] });
    if (el.locked) return;
    const x0 = e.clientX, s0 = el.start, e0 = el.end;
    const move = (ev: PointerEvent) => {
      const dt = snapTime((ev.clientX - x0) / pps, fps);
      mutateElement(el.id, (d) => {
        if (mode === 'move') {
          const len = e0 - s0;
          const ns = Math.max(0, Math.min(scene.duration - len, s0 + dt));
          const shift = ns - d.start;
          d.start = ns; d.end = ns + len;
          Object.values(d.tracks).forEach((kfs) => kfs?.forEach((k) => { k.time = +(k.time + shift).toFixed(4); }));
        } else if (mode === 'start') d.start = Math.max(0, Math.min(d.end - 1 / fps, s0 + dt));
        else d.end = Math.min(scene.duration, Math.max(d.start + 1 / fps, e0 + dt));
      });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); useStore.getState().checkpoint(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const dragKey = (e: React.PointerEvent, elementId: string, prop: string, id: string, t0: number) => {
    e.stopPropagation();
    ui$({ selectedKeyframe: { elementId, prop, id }, time: t0, playing: false, ...(elementId !== '__camera' ? { selectedIds: [elementId] } : {}) });
    const x0 = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      const nt = Math.min(scene.duration, Math.max(0, snapTime(t0 + (ev.clientX - x0) / pps, fps)));
      if (!moved && Math.abs(ev.clientX - x0) < 3) return;
      moved = true;
      updateKeyframe(elementId, prop, id, { time: nt });
      ui$({ time: nt });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); useStore.getState().checkpoint(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const ticks: React.ReactNode[] = [];
  const minor = pps >= 200 ? 1 / fps * Math.ceil(fps / 10) : pps >= 80 ? 0.25 : 0.5;
  for (let t = 0; t <= duration + 1e-6; t += minor) {
    const major = Math.abs(t - Math.round(t)) < 1e-6;
    ticks.push(
      <div key={t.toFixed(3)} className="absolute top-0 bottom-0" style={{ left: t * pps }}>
        <div className={cx('w-px', major ? 'h-3 bg-slate-500' : 'h-1.5 bg-slate-700')} />
        {major && <div className="text-[10px] text-slate-500 ml-1 -mt-0.5 tabular-nums">{Math.round(t)}s</div>}
      </div>,
    );
  }

  const rows = [...scene.elements].reverse();
  const camKeys = Object.entries(scene.camera.tracks).flatMap(([p, kfs]) => (kfs ?? []).map((k) => ({ ...k, prop: p })));

  return (
    <div className="flex flex-col h-full min-h-0 bg-ink-900 border-t border-white/[0.06]">
      {/* transport */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/[0.06] overflow-x-auto [&>*]:shrink-0">
        <button className="icon-btn" title="Go to start (Home)" onClick={() => ui$({ time: 0, playing: false })}><ChevronFirst size={16} /></button>
        <button className="icon-btn" title="Previous frame (,)" onClick={() => step(-1)}><SkipBack size={15} /></button>
        <button className="w-9 h-8 rounded-lg bg-accent text-white flex items-center justify-center shadow-glow hover:brightness-110" title="Play / pause (Space)" onClick={() => ui$({ playing: !ui.playing, time: ui.time >= duration - 1e-3 ? 0 : ui.time })}>
          {ui.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="icon-btn" title="Next frame (.)" onClick={() => step(1)}><SkipForward size={15} /></button>
        <button className="icon-btn" title="Go to end (End)" onClick={() => ui$({ time: duration, playing: false })}><ChevronLast size={16} /></button>
        <button className={cx('icon-btn', ui.loop && 'icon-btn-on')} title="Loop" onClick={() => ui$({ loop: !ui.loop })}><Repeat size={14} /></button>
        <div className="font-mono text-[12px] tabular-nums px-2 text-slate-200 min-w-[132px]">
          {ui.time.toFixed(2)}s <span className="text-slate-500">/ {duration.toFixed(2)}s · f{frame}</span>
        </div>
        {!sequence && (
          <>
            <label className="flex items-center gap-1 text-[11px] text-slate-500">FPS
              <select className="input h-7 w-16 py-0" value={fps} onChange={(e) => mutateScene((s) => { s.fps = +e.target.value; })}>
                {[24, 30, 60].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1 text-[11px] text-slate-500">Duration
              <input className="input h-7 w-16" type="number" step={0.1} min={0.2} value={scene.duration} onChange={(e) => {
                const v = Math.max(0.2, +e.target.value || 1);
                mutateScene((s) => { const old = s.duration; s.duration = v; s.elements.forEach((el) => { if (el.end >= old - 1e-3 || el.end > v) el.end = v; if (el.start >= v) el.start = Math.max(0, v - 0.5); }); });
              }} />
            </label>
          </>
        )}
        <label className="flex items-center gap-1 text-[11px] text-slate-500">Speed
          <select className="input h-7 w-[68px] py-0" value={ui.playbackRate} onChange={(e) => ui$({ playbackRate: +e.target.value })}>
            {[0.1, 0.25, 0.5, 1, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
        </label>
        <div className="flex-1" />
        <label className="flex items-center gap-1 text-[11px] text-slate-500">Zoom
          <input type="range" min={30} max={500} value={pps} onChange={(e) => setPps(+e.target.value)} className="w-24" />
        </label>
      </div>

      {/* tracks */}
      <div className="flex-1 min-h-0 overflow-auto relative">
        <div style={{ width: LABEL_W + totalW }} className="relative">
          {/* ruler */}
          <div className="sticky top-0 z-20 flex h-6 bg-ink-850 border-b border-white/[0.06]">
            <div className="sticky left-0 z-10 bg-ink-850 shrink-0 border-r border-white/[0.06] text-[10px] text-slate-500 px-2 flex items-center" style={{ width: LABEL_W }}>{sequence ? 'Sequence preview' : 'Layers'}</div>
            <div ref={areaRef} className="relative flex-1 cursor-ew-resize" onPointerDown={scrub}>{ticks}</div>
          </div>
          {/* camera */}
          {!sequence && (
            <Row label={<span className="flex items-center gap-1.5 text-sky-300"><Video size={13} /> Camera</span>}>
              {camKeys.map((k) => (
                <Diamond key={k.id} x={k.time * pps} color="#38bdf8" selected={ui.selectedKeyframe?.id === k.id}
                  title={`camera ${k.prop} = ${k.value} @ ${k.time}s`}
                  onPointerDown={(e) => dragKey(e, '__camera', k.prop, k.id, k.time)}
                  onDelete={() => removeCameraKey(k.prop as CameraProp, k.id)} />
              ))}
            </Row>
          )}
          {!sequence && rows.map((el) => {
            const sel = ui.selectedIds.includes(el.id);
            const keys = Object.entries(el.tracks).flatMap(([p, kfs]) => (kfs ?? []).map((k) => ({ ...k, prop: p })));
            const inW = el.animIn.type !== 'none' ? ((el.animIn.delay ?? 0) + el.animIn.duration) * pps : 0;
            const outW = el.animOut.type !== 'none' ? el.animOut.duration * pps : 0;
            return (
              <Row key={el.id} selected={sel} onSelect={() => ui$({ selectedIds: [el.id], selectedKeyframe: null })}
                label={
                  <span className="flex items-center gap-1 min-w-0 w-full">
                    <button className="icon-btn w-5 h-5" title={el.hidden ? 'Show' : 'Hide'} onClick={(e) => { e.stopPropagation(); mutateElement(el.id, (d) => { d.hidden = !d.hidden; }); }}>{el.hidden ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                    <button className="icon-btn w-5 h-5" title={el.locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); mutateElement(el.id, (d) => { d.locked = !d.locked; }); }}>{el.locked ? <Lock size={11} /> : <Unlock size={11} className="opacity-40" />}</button>
                    <span className={cx('truncate text-[12px]', el.hidden && 'opacity-40')}>{el.name}</span>
                  </span>
                }>
                <div className={cx('absolute top-1.5 bottom-1.5 rounded-md border overflow-hidden', sel ? 'bg-accent/30 border-accent' : 'bg-white/[0.07] border-white/10', el.hidden && 'opacity-40')}
                  style={{ left: el.start * pps, width: Math.max(4, (el.end - el.start) * pps) }}
                  onPointerDown={(e) => dragBar(e, el, 'move')}>
                  {inW > 0 && <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-emerald-400/40 to-transparent" style={{ width: inW }} title={`Entrance: ${el.animIn.type}`} />}
                  {outW > 0 && <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-rose-400/40 to-transparent" style={{ width: outW }} title={`Exit: ${el.animOut.type}`} />}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40" onPointerDown={(e) => dragBar(e, el, 'start')} />
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-white/40" onPointerDown={(e) => dragBar(e, el, 'end')} />
                  <span className="absolute left-2 top-0 bottom-0 flex items-center text-[10px] text-slate-300 pointer-events-none truncate">{el.type}</span>
                </div>
                {keys.map((k) => (
                  <Diamond key={k.id} x={k.time * pps} color={k.prop === 'pose' ? '#f472b6' : '#facc15'} selected={ui.selectedKeyframe?.id === k.id}
                    title={`${k.prop} = ${k.value} @ ${k.time}s`}
                    onPointerDown={(e) => dragKey(e, el.id, k.prop, k.id, k.time)}
                    onDelete={() => removeKeyframe(el.id, k.prop as TrackProp, k.id)} />
                ))}
              </Row>
            );
          })}
          {/* playhead */}
          <div className="absolute top-0 bottom-0 w-px bg-rose-500 z-30 pointer-events-none" style={{ left: LABEL_W + ui.time * pps }}>
            <div className="w-2.5 h-2.5 bg-rose-500 rotate-45 -translate-x-[4.5px] -translate-y-0.5" />
          </div>
          {!sequence && rows.length === 0 && <div className="text-[12px] text-slate-500 p-4" style={{ marginLeft: LABEL_W }}>No layers yet — add elements from the Insert panel.</div>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children, selected, onSelect }: { label: React.ReactNode; children: React.ReactNode; selected?: boolean; onSelect?: () => void }) {
  return (
    <div className={cx('flex h-8 border-b border-white/[0.04]', selected && 'bg-accent/[0.06]')} onPointerDown={onSelect}>
      <div className="sticky left-0 z-10 shrink-0 flex items-center px-1.5 bg-ink-900 border-r border-white/[0.06]" style={{ width: LABEL_W }}>{label}</div>
      <div className="relative flex-1">{children}</div>
    </div>
  );
}

function Diamond({ x, color, selected, title, onPointerDown, onDelete }: { x: number; color: string; selected: boolean; title: string; onPointerDown: (e: React.PointerEvent) => void; onDelete: () => void }) {
  return (
    <div title={`${title} — drag to retime, double-click to delete`} onPointerDown={onPointerDown} onDoubleClick={(e) => { e.stopPropagation(); onDelete(); }}
      className="absolute top-1/2 z-10 w-3 h-3 -ml-1.5 -mt-1.5 rotate-45 cursor-pointer border"
      style={{ left: x, background: color, borderColor: selected ? '#fff' : 'rgba(0,0,0,.5)', boxShadow: selected ? `0 0 0 2px ${color}, 0 0 10px ${color}` : undefined }} />
  );
}
