import { ArrowUpRight, BarChart3, ChevronDown, ChevronUp, Circle, Hash, ImagePlus, Layers, PersonStanding, Plus, Shapes, Sparkles, Type, Video } from 'lucide-react';
import React, { useState } from 'react';
import { CharacterSVG, DEFAULT_POSE } from '../../engine/character';
import { IllustrationView } from '../../engine/render';
import type { ElementPropsMap, ElementType, FormatDef, Scene, SceneElement } from '../../engine/schema';
import { newElement, uid } from '../../lib/factory';
import type { StylePreset } from '../../lib/presets';
import { allIllustrations, selectAssets, useStore } from '../../store/store';
import { mutateScene } from '../../ui/editing';
import { cx, fileToDataURL, Tabs } from '../../ui/kit';
import { SvgBox } from '../../ui/Thumb';

export function insertElement<T extends ElementType>(type: T, opts: { scene: Scene; formats: FormatDef[]; format: FormatDef; preset: StylePreset; props?: Partial<ElementPropsMap[T]>; name?: string; patch?: (e: SceneElement) => void }) {
  const st = useStore.getState();
  const assets = selectAssets(st);
  const t = st.ui.time;
  const el = newElement(type, { preset: opts.preset, formats: opts.formats, formatId: opts.format.id, assets, props: opts.props, name: opts.name, start: Math.min(t, Math.max(0, opts.scene.duration - 0.5)), end: opts.scene.duration });
  opts.patch?.(el);
  mutateScene((s) => { if (type === 'fx') s.elements.unshift(el); else s.elements.push(el); });
  st.ui$({ selectedIds: [el.id], selectedKeyframe: null });
  return el;
}

type Ctx = { scene: Scene; formats: FormatDef[]; format: FormatDef; preset: StylePreset; mode: 'scene' | 'motion' };

export function LeftPanel(ctx: Ctx) {
  const [tab, setTab] = useState<'insert' | 'layers'>('insert');
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-2 border-b border-white/[0.06]">
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'insert', label: <span className="flex items-center gap-1"><Plus size={13} />Insert</span> }, { value: 'layers', label: <span className="flex items-center gap-1"><Layers size={13} />Layers ({ctx.scene.elements.length})</span> }]} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{tab === 'insert' ? <InsertPanel {...ctx} /> : <LayersPanel scene={ctx.scene} />}</div>
    </div>
  );
}

function Group({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="px-2 py-2 border-b border-white/[0.04]">
      <div className="label flex items-center gap-1.5 mb-1.5 px-1">{icon}{title}</div>
      <div className="grid grid-cols-2 gap-1.5">{children}</div>
    </div>
  );
}

function Tile({ label, onClick, children, title }: { label: string; onClick: () => void; children?: React.ReactNode; title?: string }) {
  return (
    <button title={title ?? `Insert ${label}`} onClick={onClick} className="group rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-accent/50 hover:bg-accent/10 p-1.5 text-left transition-all">
      {children && <div className="h-14 mb-1 rounded-md overflow-hidden">{children}</div>}
      <div className="text-[11px] text-slate-300 group-hover:text-white truncate">{label}</div>
    </button>
  );
}

function InsertPanel(ctx: Ctx) {
  const characters = useStore((s) => s.characters);
  const ills = allIllustrations(useStore.getState());
  const assets = selectAssets(useStore.getState());
  const pal = ctx.preset.palette;
  const ins = <T extends ElementType>(type: T, props?: Partial<ElementPropsMap[T]>, name?: string, patch?: (e: SceneElement) => void) => insertElement(type, { ...ctx, props, name, patch });
  const camMove = (name: string, keys: Partial<Record<'x' | 'y' | 'zoom' | 'rotation', [number, number]>>, shake = 0) => {
    mutateScene((s) => {
      s.camera.tracks = {};
      Object.entries(keys).forEach(([p, [a, b]]) => {
        (s.camera.tracks as any)[p] = [{ id: uid('kf_'), time: 0, value: a, easing: 'easeInOutCubic' }, { id: uid('kf_'), time: s.duration, value: b, easing: 'linear' }];
      });
      s.camera.shake = shake;
    });
    useStore.getState().toast(`Camera: ${name}`);
  };
  const [illFilter, setIllFilter] = useState('');

  return (
    <div>
      <Group title="Text & typography" icon={<Type size={12} />}>
        <Tile label="Headline" onClick={() => ins('text', {}, 'Headline')} />
        <Tile label="Subtitle" onClick={() => ins('text', { text: 'A short supporting line', fontSize: 56, fontWeight: 500, kinetic: 'none' }, 'Subtitle')} />
        <Tile label="Word stagger" onClick={() => ins('text', { text: 'Every word lands', kinetic: 'words', stagger: 0.12 }, 'Kinetic words', (e) => { e.animIn = { type: 'slideUp', duration: 0.5, easing: 'easeOutBack', delay: 0, distance: 160 }; })} />
        <Tile label="Letter cascade" onClick={() => ins('text', { text: 'CASCADE', kinetic: 'letters', stagger: 0.05, uppercase: true }, 'Letter cascade', (e) => { e.animIn = { type: 'drop', duration: 0.45, easing: 'easeOutBounce', delay: 0, distance: 120 }; })} />
        <Tile label="Typewriter" onClick={() => ins('text', { text: 'Typing this out…', kinetic: 'none', fontFamily: '"Courier New", Courier, monospace', fontSize: 72 }, 'Typewriter', (e) => { e.animIn = { type: 'typewriter', duration: 1.6, easing: 'linear', delay: 0 }; })} />
        <Tile label="Caption pill" onClick={() => ins('text', { text: 'Caption goes here', fontSize: 54, background: '#000000aa', color: '#ffffff', kinetic: 'none', padding: 26 }, 'Caption', (e) => { const f = ctx.format; e.layout[f.id].y = f.height * (f.height > f.width ? 0.62 : 0.86); })} />
        <Tile label="Highlight" onClick={() => ins('text', { text: 'Make the key word pop', highlight: 'key', highlightColor: pal.accent }, 'Highlighted text')} />
        <Tile label="Outlined" onClick={() => ins('text', { text: 'OUTLINE', stroke: '#000000', strokeWidth: 10, color: '#ffffff', uppercase: true }, 'Outlined text')} />
      </Group>

      <Group title="Numbers & charts" icon={<Hash size={12} />}>
        <Tile label="Counter $" onClick={() => ins('counter', {}, 'Counter')} />
        <Tile label="Percent" onClick={() => ins('counter', { from: 0, to: 73, prefix: '', suffix: '%' }, 'Percent')} />
        {(['bar', 'hbar', 'line', 'area', 'pie', 'donut', 'candlestick'] as const).map((c) => (
          <Tile key={c} label={`${c} chart`} onClick={() => ins('chart', c === 'pie' || c === 'donut' ? { chartType: c, data: [45, 30, 25], labels: ['A', 'B', 'C'], w: 600, h: 600 } : c === 'hbar' ? { chartType: c, w: 900, h: 420 } : { chartType: c }, `${c[0].toUpperCase()}${c.slice(1)} chart`)} />
        ))}
      </Group>

      <Group title="Arrows & connectors" icon={<ArrowUpRight size={12} />}>
        <Tile label="Straight arrow" onClick={() => ins('arrow', { curve: 0 }, 'Arrow')} />
        <Tile label="Curved arrow" onClick={() => ins('arrow', { curve: 0.35, dy: -120 }, 'Curved arrow')} />
        <Tile label="Dashed connector" onClick={() => ins('arrow', { curve: 0.2, dashed: true, headSize: 0 }, 'Connector')} />
        <Tile label="Sketch arrow" onClick={() => ins('arrow', { curve: -0.3, style: 'sketch' }, 'Sketch arrow')} />
        <Tile label="Double arrow" onClick={() => ins('arrow', { curve: 0, doubleHead: true }, 'Double arrow')} />
        <Tile label="Underline" onClick={() => ins('shape', { shape: 'line', w: 520, h: 10, stroke: pal.accent, strokeWidth: 12 }, 'Underline', (e) => { e.animIn = { type: 'draw', duration: 0.6, easing: 'easeOutCubic', delay: 0 }; })} />
      </Group>

      <Group title="Shapes & infographics" icon={<Shapes size={12} />}>
        {(['rect', 'circle', 'triangle', 'star', 'polygon', 'ring', 'heart', 'blob'] as const).map((s) => (
          <Tile key={s} label={s} onClick={() => ins('shape', { shape: s, w: s === 'rect' ? 360 : 260, h: s === 'rect' ? 220 : 260 }, s[0].toUpperCase() + s.slice(1))} />
        ))}
        <Tile label="Info card" onClick={() => {
          const card = ins('shape', { shape: 'rect', w: 560, h: 300, fill: '#ffffff12', stroke: pal.primary, strokeWidth: 3, radius: 32 }, 'Info card');
          const L = card.layout[ctx.format.id];
          ins('text', { text: 'Key insight', fontSize: 54, kinetic: 'none' }, 'Card title', (e) => { Object.keys(e.layout).forEach((k) => { e.layout[k] = { ...card.layout[k], y: card.layout[k].y - 60 * card.layout[k].scale, scale: card.layout[k].scale }; }); e.animIn.delay = 0.15; });
          ins('text', { text: 'Supporting explanation', fontSize: 36, fontWeight: 400, kinetic: 'none', color: pal.muted }, 'Card body', (e) => { Object.keys(e.layout).forEach((k) => { e.layout[k] = { ...card.layout[k], y: card.layout[k].y + 40 * card.layout[k].scale }; }); e.animIn.delay = 0.3; });
          void L;
        }} />
        <Tile label="Backdrop panel" onClick={() => ins('shape', { shape: 'rect', w: 1920, h: 1920, fill: '#00000066', radius: 0 }, 'Backdrop panel')} />
      </Group>

      <Group title="Characters" icon={<PersonStanding size={12} />}>
        {characters.map((c) => (
          <Tile key={c.id} label={c.name} onClick={() => ins('character', { characterId: c.id }, c.name.split('—')[0].trim())}>
            <SvgBox light w={360} h={520} className="h-full"><CharacterSVG c={c} opts={{ pose: DEFAULT_POSE, expression: 'happy', mouth: -1, time: 0, draw: 1 }} /></SvgBox>
          </Tile>
        ))}
        {!characters.length && <div className="col-span-2 text-[11px] text-slate-500 px-1">Create characters in Character Studio.</div>}
      </Group>

      <Group title="Illustrations" icon={<Circle size={12} />}>
        <input className="input col-span-2 h-7" placeholder="Filter illustrations…" value={illFilter} onChange={(e) => setIllFilter(e.target.value)} />
        {ills.filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(illFilter.toLowerCase())).map((il) => (
          <Tile key={il.id} label={il.name} onClick={() => ins('illustration', { illustrationId: il.id }, il.name)}>
            <SvgBox w={il.w * 1.1} h={il.h * 1.1} className="h-full"><IllustrationView il={il} local={99} /></SvgBox>
          </Tile>
        ))}
      </Group>

      <Group title="Media & background FX" icon={<Sparkles size={12} />}>
        <label className="rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-accent/50 hover:bg-accent/10 p-1.5 cursor-pointer text-[11px] text-slate-300 flex items-center gap-1.5">
          <ImagePlus size={14} /> Upload image
          <input type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const src = await fileToDataURL(f);
            const img = new Image(); img.src = src; await img.decode().catch(() => undefined);
            const r = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5;
            ins('image', { src, w: r >= 1 ? 640 : 640 * r, h: r >= 1 ? 640 / r : 640 }, f.name.replace(/\.[^.]+$/, ''));
            e.target.value = '';
          }} />
        </label>
        {(['particles', 'stars', 'grid', 'rays', 'waves', 'bokeh', 'confetti', 'scanlines'] as const).map((k) => (
          <Tile key={k} label={k} onClick={() => ins('fx', { kind: k, count: k === 'rays' ? 18 : k === 'waves' ? 4 : k === 'confetti' ? 90 : 60 }, `${k[0].toUpperCase()}${k.slice(1)} FX`)} />
        ))}
      </Group>

      <Group title="Camera moves" icon={<Video size={12} />}>
        <Tile label="Push in" onClick={() => camMove('push in', { zoom: [1, 1.15] })} />
        <Tile label="Pull out" onClick={() => camMove('pull out', { zoom: [1.2, 1] })} />
        <Tile label="Pan right" onClick={() => camMove('pan right', { x: [-120, 120], zoom: [1.12, 1.12] })} />
        <Tile label="Pan up" onClick={() => camMove('pan up', { y: [120, -120], zoom: [1.12, 1.12] })} />
        <Tile label="Dutch tilt" onClick={() => camMove('dutch tilt', { rotation: [-4, 3], zoom: [1.1, 1.15] })} />
        <Tile label="Handheld shake" onClick={() => camMove('handheld', { zoom: [1.05, 1.05] }, 4)} />
        <Tile label="Reset camera" onClick={() => camMove('reset', {})} />
      </Group>
      {void assets}
    </div>
  );
}

function LayersPanel({ scene }: { scene: Scene }) {
  const selectedIds = useStore((s) => s.ui.selectedIds);
  const ui$ = useStore((s) => s.ui$);
  const [dragId, setDragId] = useState<string | null>(null);
  const rows = [...scene.elements].reverse();
  const move = (id: string, dir: 1 | -1) => mutateScene((s) => {
    const i = s.elements.findIndex((e) => e.id === id);
    const j = i + dir;
    if (j < 0 || j >= s.elements.length) return;
    [s.elements[i], s.elements[j]] = [s.elements[j], s.elements[i]];
  });
  return (
    <div className="p-2 space-y-1">
      <div className="text-[10px] text-slate-500 px-1 pb-1">Top of list = front-most. Drag to reorder.</div>
      {rows.map((el) => (
        <div key={el.id} draggable onDragStart={() => setDragId(el.id)} onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (!dragId || dragId === el.id) return;
            mutateScene((s) => { const from = s.elements.findIndex((e) => e.id === dragId); const [it] = s.elements.splice(from, 1); const to = s.elements.findIndex((e) => e.id === el.id); s.elements.splice(to + 1, 0, it); });
            setDragId(null);
          }}
          onClick={(e) => ui$({ selectedIds: e.shiftKey ? [...selectedIds, el.id] : [el.id], selectedKeyframe: null })}
          className={cx('flex items-center gap-2 px-2 h-8 rounded-md cursor-pointer text-[12px] border', selectedIds.includes(el.id) ? 'bg-accent/15 border-accent/40 text-white' : 'border-transparent hover:bg-white/[0.04] text-slate-300', el.hidden && 'opacity-50')}>
          <TypeIcon type={el.type} />
          <span className="truncate flex-1">{el.name}</span>
          <button className="icon-btn w-5 h-5" title="Bring forward" onClick={(e) => { e.stopPropagation(); move(el.id, 1); }}><ChevronUp size={12} /></button>
          <button className="icon-btn w-5 h-5" title="Send backward" onClick={(e) => { e.stopPropagation(); move(el.id, -1); }}><ChevronDown size={12} /></button>
        </div>
      ))}
      {!rows.length && <div className="text-[12px] text-slate-500 p-2">No layers.</div>}
    </div>
  );
}

export function TypeIcon({ type }: { type: ElementType }) {
  const m: Record<ElementType, React.ReactNode> = {
    text: <Type size={13} />, shape: <Shapes size={13} />, arrow: <ArrowUpRight size={13} />, chart: <BarChart3 size={13} />, counter: <Hash size={13} />,
    character: <PersonStanding size={13} />, illustration: <Circle size={13} />, image: <ImagePlus size={13} />, fx: <Sparkles size={13} />,
  };
  return <span className="text-accent/80 shrink-0">{m[type]}</span>;
}
