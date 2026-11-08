import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { evaluateElement, layoutFor } from '../../engine/evaluate';
import { SceneSVG } from '../../engine/render';
import type { FormatDef, Scene, SceneElement } from '../../engine/schema';
import { SequenceSVG } from '../../engine/sequence';
import { useAssets, useStore } from '../../store/store';
import { setKeyframe, setLayout, snapTime, trackValue } from '../../ui/editing';

type Drag =
  | { mode: 'move'; ids: string[]; sx: number; sy: number; orig: Record<string, { x: number; y: number; kx: number; ky: number }> }
  | { mode: 'scale'; id: string; cx: number; cy: number; d0: number; s0: number; k0: number }
  | { mode: 'rotate'; id: string; cx: number; cy: number; a0: number; r0: number; k0: number };

export function Stage({ scene, format, sequence }: { scene: Scene; format: FormatDef; sequence?: Scene[] }) {
  const assets = useAssets();
  const time = useStore((s) => s.ui.time);
  const selectedIds = useStore((s) => s.ui.selectedIds);
  const showGrid = useStore((s) => s.ui.showGrid);
  const showSafe = useStore((s) => s.settings.showSafeZones);
  const autoKey = useStore((s) => s.ui.autoKey);
  const zoomPref = useStore((s) => s.ui.zoom);
  const ui$ = useStore((s) => s.ui$);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState({ w: 800, h: 450 });
  const [drag, setDrag] = useState<Drag | null>(null);
  const [boxes, setBoxes] = useState<Record<string, { pts: [number, number][]; cx: number; cy: number }>>({});
  const W = format.width, H = format.height;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = Math.min((box.w - 32) / W, (box.h - 32) / H);
  const scale = zoomPref > 0 ? zoomPref : Math.max(0.05, fit);
  const dispW = W * scale, dispH = H * scale;

  // measure selection boxes after each render
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || sequence) { setBoxes({}); return; }
    const root = svg.querySelector('svg');
    if (!root) return;
    const inv = (root as SVGSVGElement).getScreenCTM()?.inverse();
    if (!inv) return;
    const out: typeof boxes = {};
    selectedIds.forEach((id) => {
      const g = root.querySelector(`[data-el-id="${id}"]`) as SVGGraphicsElement | null;
      if (!g) return;
      let bb: DOMRect;
      try { bb = g.getBBox(); } catch { return; }
      const m = inv.multiply(g.getScreenCTM()!);
      const P = (x: number, y: number): [number, number] => { const p = new DOMPoint(x, y).matrixTransform(m); return [p.x, p.y]; };
      const pts = [P(bb.x, bb.y), P(bb.x + bb.width, bb.y), P(bb.x + bb.width, bb.y + bb.height), P(bb.x, bb.y + bb.height)];
      const c = P(0, 0);
      out[id] = { pts, cx: c[0], cy: c[1] };
    });
    setBoxes(out);
  }, [scene, time, selectedIds, format.id, scale, sequence]);

  const toStage = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };

  const elById = (id: string) => scene.elements.find((e) => e.id === id);

  const onPointerDown = (e: React.PointerEvent) => {
    if (sequence || e.button !== 0) return;
    const target = e.target as Element;
    const handle = target.closest('[data-handle]') as HTMLElement | null;
    const p = toStage(e);
    const fps = scene.fps;
    const t = snapTime(time, fps);
    if (handle) {
      const id = handle.dataset.id!;
      const el = elById(id)!;
      const b = boxes[id];
      const L = layoutFor(el, format.id);
      if (handle.dataset.handle === 'scale') setDrag({ mode: 'scale', id, cx: b.cx, cy: b.cy, d0: Math.hypot(p.x - b.cx, p.y - b.cy) || 1, s0: L.scale, k0: trackValue(el, 'scale', t) });
      else setDrag({ mode: 'rotate', id, cx: b.cx, cy: b.cy, a0: Math.atan2(p.y - b.cy, p.x - b.cx), r0: L.rotation, k0: trackValue(el, 'rotation', t) });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const hit = target.closest('[data-el-id]') as SVGElement | null;
    let id = hit?.getAttribute('data-el-id') ?? null;
    if (id && elById(id)?.locked) id = null;
    if (!id) { ui$({ selectedIds: [], selectedKeyframe: null }); return; }
    let sel = selectedIds;
    if (e.shiftKey) sel = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    else if (!selectedIds.includes(id)) sel = [id];
    ui$({ selectedIds: sel, selectedKeyframe: null });
    const orig: Record<string, { x: number; y: number; kx: number; ky: number }> = {};
    sel.forEach((sid) => { const el = elById(sid); if (el && !el.locked) { const L = layoutFor(el, format.id); orig[sid] = { x: L.x, y: L.y, kx: trackValue(el, 'x', t), ky: trackValue(el, 'y', t) }; } });
    setDrag({ mode: 'move', ids: Object.keys(orig), sx: p.x, sy: p.y, orig });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toStage(e);
    const t = snapTime(time, scene.fps);
    if (drag.mode === 'move') {
      let dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      drag.ids.forEach((id) => {
        const o = drag.orig[id];
        const el = elById(id)!;
        const ms = layoutFor(el, format.id).motionScale ?? 1;
        if (autoKey) { setKeyframe(id, 'x', t, Math.round(o.kx + dx / ms)); setKeyframe(id, 'y', t, Math.round(o.ky + dy / ms)); }
        else setLayout(id, { x: Math.round(o.x + dx), y: Math.round(o.y + dy) }, format.id);
      });
    } else if (drag.mode === 'scale') {
      const f = Math.hypot(p.x - drag.cx, p.y - drag.cy) / drag.d0;
      if (autoKey) setKeyframe(drag.id, 'scale', t, +(drag.k0 * f).toFixed(3));
      else setLayout(drag.id, { scale: +Math.max(0.02, drag.s0 * f).toFixed(3) }, format.id);
    } else {
      let da = ((Math.atan2(p.y - drag.cy, p.x - drag.cx) - drag.a0) * 180) / Math.PI;
      if (e.shiftKey) da = Math.round(da / 15) * 15;
      if (autoKey) setKeyframe(drag.id, 'rotation', t, Math.round(drag.k0 + da));
      else setLayout(drag.id, { rotation: Math.round(drag.r0 + da) }, format.id);
    }
  };

  const onPointerUp = () => { if (drag) useStore.getState().checkpoint(); setDrag(null); };

  // wheel zoom
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const cur = useStore.getState().ui.zoom || fit;
      useStore.getState().ui$({ zoom: Math.min(2, Math.max(0.05, cur * (e.deltaY > 0 ? 0.9 : 1.1))) });
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [fit]);

  const hs = 10 / scale; // handle size in stage units
  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0 overflow-auto bg-[radial-gradient(ellipse_at_center,#11142a_0%,#07080f_70%)]">
      <div className="min-w-full min-h-full flex items-center justify-center p-4" style={{ width: Math.max(box.w, dispW + 32), height: Math.max(box.h, dispH + 32) }}>
        <div className="relative shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_20px_60px_rgba(0,0,0,0.6)]" style={{ width: dispW, height: dispH }}>
          <svg ref={svgRef} width={dispW} height={dispH} viewBox={`0 0 ${W} ${H}`} className="block touch-none select-none"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            {sequence
              ? <SequenceSVG scenes={sequence} assets={assets} format={format} time={time} idPrefix="stg" />
              : <SceneSVG scene={scene} assets={assets} format={format} time={time} idPrefix="stg" />}
            {showGrid && <GridOverlay W={W} H={H} />}
            {showSafe && <SafeZones format={format} />}
            {!sequence && Object.entries(boxes).map(([id, b]) => {
              const el = elById(id);
              if (!el) return null;
              const st = evaluateElement(el, time, format.id);
              const pts = b.pts.map((q) => q.join(',')).join(' ');
              const [tx, ty] = [(b.pts[0][0] + b.pts[1][0]) / 2, (b.pts[0][1] + b.pts[1][1]) / 2];
              const ang = Math.atan2(b.pts[1][1] - b.pts[0][1], b.pts[1][0] - b.pts[0][0]);
              const rx = tx + Math.sin(ang) * 40 / scale, ry = ty - Math.cos(ang) * 40 / scale;
              return (
                <g key={id} pointerEvents="none">
                  <polygon points={pts} fill="none" stroke="rgb(var(--accent))" strokeWidth={1.5 / scale} strokeDasharray={st.visible ? undefined : `${6 / scale} ${4 / scale}`} />
                  <circle cx={b.cx} cy={b.cy} r={3 / scale} fill="rgb(var(--accent))" />
                  {selectedIds.length === 1 && !el.locked && (
                    <>
                      <line x1={tx} y1={ty} x2={rx} y2={ry} stroke="rgb(var(--accent))" strokeWidth={1.2 / scale} />
                      <circle data-handle="rotate" data-id={id} cx={rx} cy={ry} r={hs * 0.7} fill="#fff" stroke="rgb(var(--accent))" strokeWidth={2 / scale} pointerEvents="all" style={{ cursor: 'grab' }} />
                      <rect data-handle="scale" data-id={id} x={b.pts[2][0] - hs / 2} y={b.pts[2][1] - hs / 2} width={hs} height={hs} fill="#fff" stroke="rgb(var(--accent))" strokeWidth={2 / scale} pointerEvents="all" style={{ cursor: 'nwse-resize' }} />
                    </>
                  )}
                </g>
              );
            })}
          </svg>
          {autoKey && <div className="absolute -top-0 left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e]" />}
        </div>
      </div>
    </div>
  );
}

function GridOverlay({ W, H }: { W: number; H: number }) {
  const sw = Math.max(W, H) / 900;
  return (
    <g pointerEvents="none" stroke="#ffffff" strokeOpacity={0.22} strokeWidth={sw}>
      {[1, 2].map((i) => <line key={`v${i}`} x1={(W * i) / 3} y1={0} x2={(W * i) / 3} y2={H} />)}
      {[1, 2].map((i) => <line key={`h${i}`} x1={0} y1={(H * i) / 3} x2={W} y2={(H * i) / 3} />)}
      <line x1={W / 2 - 30} y1={H / 2} x2={W / 2 + 30} y2={H / 2} strokeOpacity={0.5} />
      <line x1={W / 2} y1={H / 2 - 30} x2={W / 2} y2={H / 2 + 30} strokeOpacity={0.5} />
    </g>
  );
}

/** Title/action safe zones + YouTube Shorts UI overlays. */
export function SafeZones({ format }: { format: FormatDef }) {
  const W = format.width, H = format.height;
  const sw = Math.max(W, H) / 700;
  const tall = H > W;
  const font = { fontFamily: 'Arial, sans-serif', fontSize: Math.max(W, H) / 70, fill: '#facc15', fillOpacity: 0.8 };
  return (
    <g pointerEvents="none">
      <rect x={W * 0.05} y={H * 0.05} width={W * 0.9} height={H * 0.9} fill="none" stroke="#facc15" strokeOpacity={0.35} strokeWidth={sw} strokeDasharray={`${sw * 6} ${sw * 4}`} />
      <rect x={W * 0.1} y={H * 0.1} width={W * 0.8} height={H * 0.8} fill="none" stroke="#22d3ee" strokeOpacity={0.35} strokeWidth={sw} strokeDasharray={`${sw * 6} ${sw * 4}`} />
      {tall ? (
        <>
          <rect x={0} y={0} width={W} height={H * 0.1} fill="#f43f5e" fillOpacity={0.08} />
          <rect x={0} y={H * 0.72} width={W} height={H * 0.28} fill="#f43f5e" fillOpacity={0.1} />
          <rect x={W * 0.86} y={H * 0.45} width={W * 0.14} height={H * 0.27} fill="#f43f5e" fillOpacity={0.12} />
          <line x1={0} y1={H * 0.62} x2={W} y2={H * 0.62} stroke="#a78bfa" strokeOpacity={0.6} strokeWidth={sw} strokeDasharray={`${sw * 3} ${sw * 3}`} />
          <text x={W * 0.03} y={H * 0.615} {...font} fill="#a78bfa">caption line</text>
          <text x={W * 0.03} y={H * 0.75} {...font} fill="#f43f5e">Shorts title / description UI</text>
          <text x={W * 0.85} y={H * 0.44} textAnchor="end" {...font} fill="#f43f5e">buttons</text>
        </>
      ) : (
        <>
          <rect x={0} y={H * 0.85} width={W} height={H * 0.15} fill="#a78bfa" fillOpacity={0.07} />
          <text x={W * 0.11} y={H * 0.88} {...font} fill="#a78bfa">caption zone</text>
        </>
      )}
      <text x={W * 0.055} y={H * 0.045} {...font}>action safe 90%</text>
      <text x={W * 0.105} y={H * 0.095} {...font} fill="#22d3ee">title safe 80%</text>
    </g>
  );
}
