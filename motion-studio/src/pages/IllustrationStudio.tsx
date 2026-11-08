import { ArrowDown, ArrowUp, Copy, Download, Eye, EyeOff, FileUp, Pause, Play, Plus, Trash2 } from 'lucide-react';
import React, { useMemo, useRef, useState } from 'react';
import { EASING_NAMES } from '../engine/easing';
import { part } from '../engine/illustrations';
import { IllustrationView } from '../engine/render';
import type { Easing, Illustration, IllustrationPart, PartKind } from '../engine/schema';
import { renderPNG } from '../export/frames';
import { illustrationSVG } from '../export/package';
import { downloadBlob, slug } from '../export/video';
import { DEFAULT_FORMATS, newElement, newScene, uid } from '../lib/factory';
import { allIllustrations, findPreset, selectAssets, useStore } from '../store/store';
import { ExportDialog, type ExportSource } from '../ui/ExportDialog';
import { Color, confirmAction, cx, Num, PageHeader, Section, Select, Text } from '../ui/kit';
import { useClock } from '../ui/playback';
import { insertIntoOpenTarget } from '../ui/useAsset';
import { LOOP_TYPES } from './editor/Inspector';

const PART_ANIMS = ['none', 'fade', 'pop', 'draw', 'slideUp', 'slideDown', 'slideLeft', 'slideRight', 'grow', 'spin'] as const;

/** Parse basic SVG markup into editable parts. */
function parseSVG(text: string): Illustration | null {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return null;
  const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
  const w = vb.length === 4 ? vb[2] : parseFloat(svg.getAttribute('width') ?? '400') || 400;
  const h = vb.length === 4 ? vb[3] : parseFloat(svg.getAttribute('height') ?? '400') || 400;
  const parts: IllustrationPart[] = [];
  const num = (el: Element, k: string, d = 0) => parseFloat(el.getAttribute(k) ?? '') || d;
  svg.querySelectorAll('rect,circle,ellipse,path,polygon,polyline,line,text').forEach((el, i) => {
    const style = el.getAttribute('style') ?? '';
    const sv = (k: string) => el.getAttribute(k) ?? /(?:^|;)\s*KEY\s*:\s*([^;]+)/.exec(style.replace('KEY', k))?.[1]?.trim() ?? null;
    const fill = sv('fill') ?? '#000000';
    const stroke = sv('stroke') ?? 'none';
    const sw = parseFloat(sv('stroke-width') ?? '0') || 0;
    const tag = el.tagName.toLowerCase();
    let kind: PartKind, attrs: Record<string, number | string>;
    switch (tag) {
      case 'rect': kind = 'rect'; attrs = { x: num(el, 'x'), y: num(el, 'y'), w: num(el, 'width'), h: num(el, 'height'), rx: num(el, 'rx') }; break;
      case 'circle': kind = 'circle'; attrs = { cx: num(el, 'cx'), cy: num(el, 'cy'), r: num(el, 'r') }; break;
      case 'ellipse': kind = 'ellipse'; attrs = { cx: num(el, 'cx'), cy: num(el, 'cy'), rx: num(el, 'rx'), ry: num(el, 'ry') }; break;
      case 'line': kind = 'line'; attrs = { x1: num(el, 'x1'), y1: num(el, 'y1'), x2: num(el, 'x2'), y2: num(el, 'y2') }; break;
      case 'polygon': kind = 'polygon'; attrs = { points: el.getAttribute('points') ?? '' }; break;
      case 'polyline': kind = 'path'; attrs = { d: `M ${(el.getAttribute('points') ?? '').trim().replace(/\s+/g, ' L ')}` }; break;
      case 'text': kind = 'text'; attrs = { x: num(el, 'x'), y: num(el, 'y'), text: el.textContent ?? '', fontSize: parseFloat(sv('font-size') ?? '40') || 40 }; break;
      default: kind = 'path'; attrs = { d: el.getAttribute('d') ?? '' };
    }
    parts.push(part(kind, `${tag} ${i + 1}`, attrs, { fill: tag === 'polyline' || tag === 'line' ? 'none' : fill, stroke, strokeWidth: sw, anim: { type: 'pop', delay: +(i * 0.06).toFixed(2), duration: 0.5, easing: 'easeOutBack' } }));
  });
  return { id: uid('il_'), name: 'Imported SVG', category: 'Imported', w, h, parts, createdAt: Date.now() };
}

export function IllustrationStudio() {
  const custom = useStore((s) => s.illustrations);
  const activeId = useStore((s) => s.ui.activeIllustrationId);
  const ui$ = useStore((s) => s.ui$);
  const mutate = useStore((s) => s.mutate);
  const toast = useStore((s) => s.toast);
  const all = useMemo(() => allIllustrations(useStore.getState()), [custom]);
  const il = all.find((x) => x.id === activeId) ?? all[0];
  const [partId, setPartId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useClock(playing, 3.5);
  const [filter, setFilter] = useState('');
  const [exp, setExp] = useState<ExportSource | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const editable = !il.builtin;
  const p = il.parts.find((x) => x.id === partId);

  const edit = (fn: (d: Illustration) => void) => {
    if (!editable) { toast('Built-in illustrations are read-only — duplicate to edit', 'info'); return; }
    mutate((d) => { const x = d.illustrations.find((y) => y.id === il.id); if (x) fn(x as Illustration); });
  };
  const editPart = (fn: (q: IllustrationPart) => void) => edit((d) => { const q = d.parts.find((x) => x.id === partId); if (q) fn(q); });
  const duplicate = () => {
    const c: Illustration = { ...structuredClone(il), id: uid('il_'), name: `${il.name}${il.builtin ? '' : ' copy'}`, builtin: false, createdAt: Date.now(), parts: il.parts.map((q) => ({ ...structuredClone(q), id: uid('p') })) };
    mutate((d) => { d.illustrations.unshift(c); });
    ui$({ activeIllustrationId: c.id });
    setPartId(null);
  };
  const addPart = (kind: PartKind) => {
    const cx = il.w / 2, cy = il.h / 2;
    const attrs: Record<PartKind, Record<string, number | string>> = {
      rect: { x: cx - 60, y: cy - 40, w: 120, h: 80, rx: 10 }, circle: { cx, cy, r: 50 }, ellipse: { cx, cy, rx: 70, ry: 40 },
      line: { x1: cx - 80, y1: cy, x2: cx + 80, y2: cy }, polygon: { points: `${cx},${cy - 60} ${cx + 60},${cy + 50} ${cx - 60},${cy + 50}` },
      path: { d: `M ${cx - 80} ${cy} Q ${cx} ${cy - 90} ${cx + 80} ${cy}` }, text: { x: cx, y: cy + 15, text: 'Label', fontSize: 48, fontWeight: 700 },
    };
    const q = part(kind, `${kind} ${il.parts.length + 1}`, attrs[kind], { fill: kind === 'line' || kind === 'path' ? 'none' : '#9b5cff', stroke: kind === 'line' || kind === 'path' ? '#ffffff' : 'none', strokeWidth: kind === 'line' || kind === 'path' ? 8 : 0 });
    edit((d) => { d.parts.push(q); });
    setPartId(q.id);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const hit = (e.target as Element).closest('[data-part-id]');
    const id = hit?.getAttribute('data-part-id') ?? null;
    setPartId(id);
    if (!id || !editable) return;
    const q = il.parts.find((x) => x.id === id)!;
    const r = svgRef.current!.getBoundingClientRect();
    const k = (il.w * 1.2) / r.width;
    const x0 = e.clientX, y0 = e.clientY, tx = q.tx, ty = q.ty;
    const move = (ev: PointerEvent) => mutate((d) => { const qq = d.illustrations.find((y) => y.id === il.id)?.parts.find((x) => x.id === id); if (qq) { qq.tx = Math.round(tx + (ev.clientX - x0) * k); qq.ty = Math.round(ty + (ev.clientY - y0) * k); } });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); useStore.getState().checkpoint(); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const exportAnimated = () => {
    const st = useStore.getState();
    const preset = findPreset(st, st.settings.defaultPresetId);
    const sc = newScene(il.name, preset, 30);
    sc.duration = 3;
    sc.background = { ...sc.background, type: 'transparent' };
    const formats = structuredClone(DEFAULT_FORMATS);
    const el = newElement('illustration', { preset, formats, formatId: 'landscape', assets: selectAssets(st), end: 3, props: { illustrationId: il.id, partAnimations: true } });
    el.animIn = { type: 'none', duration: 0.1, easing: 'linear' };
    el.animOut = { type: 'none', duration: 0.1, easing: 'linear' };
    sc.elements.push(el);
    setExp({ title: `Illustration — ${il.name}`, kind: 'illustration', scenes: [sc], formats, presetId: preset.id });
  };

  const exportPNG = async () => {
    const st = useStore.getState();
    const f = { id: 'ill', name: il.name, width: Math.round(il.w * 2), height: Math.round(il.h * 2) };
    const preset = findPreset(st, st.settings.defaultPresetId);
    const sc = newScene(il.name, preset); sc.background = { ...sc.background, type: 'transparent' };
    const el = newElement('illustration', { preset, formats: [f], formatId: 'ill', assets: selectAssets(st), props: { illustrationId: il.id, partAnimations: false } });
    el.layout.ill = { x: f.width / 2, y: f.height / 2, scale: 2, rotation: 0 };
    el.animIn = { type: 'none', duration: 0.1, easing: 'linear' };
    sc.elements.push(el);
    downloadBlob(await renderPNG({ scenes: [sc] }, selectAssets(st), f, 1, true), `${slug(il.name)}.png`);
  };

  const cats = [...new Set(all.map((x) => x.category))];
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <PageHeader title="Illustration Studio" subtitle="Layer-based vector illustrations. Every part can be edited and animated independently."
        actions={<>
          <button className="btn-soft" onClick={() => { const n: Illustration = { id: uid('il_'), name: 'New illustration', category: 'Custom', w: 400, h: 400, parts: [], createdAt: Date.now() }; mutate((d) => { d.illustrations.unshift(n); }); ui$({ activeIllustrationId: n.id }); }}><Plus size={14} />Blank</button>
          <label className="btn-soft cursor-pointer"><FileUp size={14} />Import SVG<input type="file" accept=".svg,image/svg+xml" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = parseSVG(await f.text()); if (!r) return toast('Could not parse SVG', 'err'); r.name = f.name.replace(/\.svg$/i, ''); mutate((d) => { d.illustrations.unshift(r); }); ui$({ activeIllustrationId: r.id }); toast(`Imported ${r.parts.length} parts`); e.target.value = ''; }} /></label>
          <button className="btn-soft" onClick={() => insertIntoOpenTarget('illustration', { illustrationId: il.id, partAnimations: true }, il.name)}><Plus size={14} />Use in open scene</button>
          <button className="btn-soft" onClick={() => downloadBlob(new Blob([illustrationSVG(il)], { type: 'image/svg+xml' }), `${slug(il.name)}.svg`)}><Download size={14} />SVG</button>
          <button className="btn-soft" onClick={exportPNG}><Download size={14} />PNG</button>
          <button className="btn-primary" onClick={exportAnimated}><Download size={14} />Export animation</button>
        </>} />
      <div className="grid xl:grid-cols-[230px_1fr_330px] lg:grid-cols-[210px_1fr] gap-4">
        <div className="panel p-2 max-h-[75vh] overflow-y-auto">
          <input className="input mb-2" placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {cats.map((cat) => {
            const items = all.filter((x) => x.category === cat && x.name.toLowerCase().includes(filter.toLowerCase()));
            if (!items.length) return null;
            return (
              <div key={cat} className="mb-2">
                <div className="label px-1 mb-1">{cat}</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((x) => (
                    <button key={x.id} onClick={() => { ui$({ activeIllustrationId: x.id }); setPartId(null); setT(0); }} className={cx('rounded-lg p-1 border text-left', x.id === il.id ? 'border-accent bg-accent/10' : 'border-white/[0.06] hover:border-white/20')}>
                      <svg viewBox={`${-x.w * 0.55} ${-x.h * 0.55} ${x.w * 1.1} ${x.h * 1.1}`} className="w-full h-14"><IllustrationView il={x} local={99} /></svg>
                      <div className="text-[10px] truncate text-slate-400">{x.name}{!x.builtin && ' ✎'}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="panel p-3 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <input className="input h-8 max-w-[240px]" value={il.name} disabled={!editable} onChange={(e) => edit((d) => { d.name = e.target.value; })} />
            <input className="input h-8 max-w-[160px]" value={il.category} disabled={!editable} onChange={(e) => edit((d) => { d.category = e.target.value; })} />
            {!editable && <button className="btn-primary h-8" onClick={duplicate}><Copy size={14} />Duplicate to edit</button>}
            {editable && <button className="btn-soft h-8" onClick={duplicate}><Copy size={14} />Duplicate</button>}
            {editable && <button className="btn-danger h-8" onClick={() => { if (confirmAction(`Delete ${il.name}?`)) { mutate((d) => { d.illustrations = d.illustrations.filter((x) => x.id !== il.id); }); ui$({ activeIllustrationId: null }); } }}><Trash2 size={14} /></button>}
          </div>
          <div className="checker rounded-xl overflow-hidden">
            <svg ref={svgRef} viewBox={`${-il.w * 0.6} ${-il.h * 0.6} ${il.w * 1.2} ${il.h * 1.2}`} className="w-full max-h-[52vh] touch-none" onPointerDown={onPointerDown}>
              <rect x={-il.w / 2} y={-il.h / 2} width={il.w} height={il.h} fill="none" stroke="#ffffff30" strokeDasharray="6 6" />
              <IllustrationView il={il} local={t} selectedPartId={partId ?? undefined} />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-soft" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
            <input type="range" className="flex-1" min={0} max={3.5} step={0.01} value={t} onChange={(e) => { setPlaying(false); setT(+e.target.value); }} />
            <span className="text-[12px] tabular-nums text-slate-400 w-12">{t.toFixed(2)}s</span>
          </div>
          {editable && (
            <div className="grid grid-cols-2 gap-2 max-w-xs">
              <Num label="Canvas W" value={il.w} onChange={(v) => edit((d) => { d.w = v; })} />
              <Num label="Canvas H" value={il.h} onChange={(v) => edit((d) => { d.h = v; })} />
            </div>
          )}
        </div>

        <div className="panel overflow-hidden lg:col-span-2 xl:col-span-1 max-h-[80vh] overflow-y-auto">
          <Section title={`Layers (${il.parts.length})`} right={editable ? <select className="input h-7 w-24 text-[12px]" value="" onChange={(e) => e.target.value && addPart(e.target.value as PartKind)}><option value="">＋ Add</option>{(['rect', 'circle', 'ellipse', 'line', 'polygon', 'path', 'text'] as PartKind[]).map((k) => <option key={k}>{k}</option>)}</select> : null}>
            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {[...il.parts].reverse().map((q) => {
                const i = il.parts.indexOf(q);
                return (
                  <div key={q.id} onClick={() => setPartId(q.id)} className={cx('flex items-center gap-1 px-1.5 h-7 rounded text-[12px] cursor-pointer', q.id === partId ? 'bg-accent/15 text-white' : 'hover:bg-white/[0.04] text-slate-300')}>
                    <span className="w-3 h-3 rounded-sm shrink-0 border border-white/20" style={{ background: q.fill !== 'none' ? q.fill : q.stroke }} />
                    <span className="truncate flex-1">{q.name}</span>
                    {editable && <>
                      <button className="icon-btn w-5 h-5" onClick={(e) => { e.stopPropagation(); edit((d) => { d.parts[i].hidden = !d.parts[i].hidden; }); }}>{q.hidden ? <EyeOff size={11} /> : <Eye size={11} />}</button>
                      <button className="icon-btn w-5 h-5" onClick={(e) => { e.stopPropagation(); edit((d) => { if (i < d.parts.length - 1) [d.parts[i], d.parts[i + 1]] = [d.parts[i + 1], d.parts[i]]; }); }}><ArrowUp size={11} /></button>
                      <button className="icon-btn w-5 h-5" onClick={(e) => { e.stopPropagation(); edit((d) => { if (i > 0) [d.parts[i], d.parts[i - 1]] = [d.parts[i - 1], d.parts[i]]; }); }}><ArrowDown size={11} /></button>
                    </>}
                  </div>
                );
              })}
            </div>
          </Section>
          {p ? (
            <fieldset disabled={!editable}>
              <Section title={`Part · ${p.kind}`} right={editable && (
                <div className="flex">
                  <button className="icon-btn" title="Duplicate part" onClick={() => { const c = { ...structuredClone(p), id: uid('p'), name: `${p.name} copy`, tx: p.tx + 20, ty: p.ty + 20 }; edit((d) => { d.parts.push(c); }); setPartId(c.id); }}><Copy size={13} /></button>
                  <button className="icon-btn" title="Delete part" onClick={() => { edit((d) => { d.parts = d.parts.filter((x) => x.id !== p.id); }); setPartId(null); }}><Trash2 size={13} /></button>
                </div>
              )}>
                <Text label="Name" value={p.name} onChange={(v) => editPart((q) => { q.name = v; })} />
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(p.attrs).map(([k, v]) => (typeof v === 'number'
                    ? <Num key={k} label={k} value={v} onChange={(n) => editPart((q) => { q.attrs[k] = n; })} />
                    : <div key={k} className="col-span-2"><Text multiline={k === 'd' || k === 'points'} rows={2} label={k} value={String(v)} onChange={(s) => editPart((q) => { q.attrs[k] = s; })} /></div>))}
                </div>
                <Color label="Fill" allowNone value={p.fill} onChange={(v) => editPart((q) => { q.fill = v; })} />
                <Color label="Stroke" allowNone value={p.stroke} onChange={(v) => editPart((q) => { q.stroke = v; })} />
                <div className="grid grid-cols-2 gap-2">
                  <Num label="Stroke W" min={0} value={p.strokeWidth} onChange={(v) => editPart((q) => { q.strokeWidth = v; })} />
                  <Num label="Opacity" step={0.05} min={0} max={1} value={p.opacity} onChange={(v) => editPart((q) => { q.opacity = v; })} />
                  <Num label="Move X" value={p.tx} onChange={(v) => editPart((q) => { q.tx = v; })} />
                  <Num label="Move Y" value={p.ty} onChange={(v) => editPart((q) => { q.ty = v; })} />
                  <Num label="Scale" step={0.05} value={p.s} onChange={(v) => editPart((q) => { q.s = v; })} />
                  <Num label="Rotate" value={p.r} onChange={(v) => editPart((q) => { q.r = v; })} />
                </div>
              </Section>
              <Section title="Part animation">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={p.anim.type} options={PART_ANIMS} onChange={(v) => editPart((q) => { q.anim.type = v; })} />
                  <Select value={(Array.isArray(p.anim.easing) ? 'easeOut' : p.anim.easing) as string} options={EASING_NAMES} onChange={(v) => editPart((q) => { q.anim.easing = v as Easing; })} />
                  <Num label="Delay" step={0.05} min={0} suffix="s" value={p.anim.delay} onChange={(v) => editPart((q) => { q.anim.delay = v; })} />
                  <Num label="Dur" step={0.05} min={0.05} suffix="s" value={p.anim.duration} onChange={(v) => editPart((q) => { q.anim.duration = v; })} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Select value={p.loop.type} options={LOOP_TYPES} onChange={(v) => editPart((q) => { q.loop.type = v; })} />
                  <Num label="Hz" step={0.05} value={p.loop.speed} onChange={(v) => editPart((q) => { q.loop.speed = v; })} />
                  <Num label="Amt" step={0.5} value={p.loop.amount} onChange={(v) => editPart((q) => { q.loop.amount = v; })} />
                </div>
                {editable && <button className="btn-soft w-full h-7 text-[12px]" onClick={() => edit((d) => { d.parts.forEach((q, i) => { q.anim.delay = +(i * 0.08).toFixed(2); }); })}>Re-stagger all parts (0.08s)</button>}
              </Section>
            </fieldset>
          ) : <div className="p-4 text-[12px] text-slate-500">Click a part on the canvas or in the layer list. {editable ? 'Drag parts on the canvas to move them.' : ''}</div>}
        </div>
      </div>
      <ExportDialog open={!!exp} source={exp} onClose={() => setExp(null)} />
    </div>
  );
}
