import { Copy, Eye, Library as LibIcon, Pencil, Plus, Search, Trash2, Type } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CharacterSVG, resolveCharacterPose } from '../engine/character';
import { BUILTIN_MOVEMENTS } from '../engine/poses';
import { BackgroundView, IllustrationView } from '../engine/render';
import type { Background, Effects, LoopSpec, Scene, TransitionType } from '../engine/schema';
import { LANDSCAPE } from '../engine/schema';
import { SequenceSVG } from '../engine/sequence';
import { cloneScene, newScene, uid } from '../lib/factory';
import { BUILTIN_PRESETS } from '../lib/presets';
import { actions, allIllustrations, resolveTarget, useAssets, useStore } from '../store/store';
import { mutateElement, mutateScene } from '../ui/editing';
import { confirmAction, cx, Empty, Modal, PageHeader, Tabs, usePrompt } from '../ui/kit';
import { useClock } from '../ui/playback';
import { SceneThumb } from '../ui/Thumb';
import { insertIntoOpenTarget } from '../ui/useAsset';
import { TRANSITIONS } from './editor/Inspector';

type Cat = 'all' | 'characters' | 'movements' | 'animations' | 'illustrations' | 'motion' | 'transitions' | 'backgrounds' | 'effects' | 'scenes';

interface Item {
  id: string;
  name: string;
  cat: Exclude<Cat, 'all'>;
  sub?: string;
  builtin?: boolean;
  preview: (t: number) => React.ReactNode;
  duration?: number;
  use?: () => void;
  useLabel?: string;
  edit?: () => void;
  duplicate?: () => void;
  rename?: (n: string) => void;
  remove?: () => void;
}

const BUILTIN_EFFECTS: { id: string; name: string; effects: Effects; loop: LoopSpec }[] = [
  { id: 'fx-neon', name: 'Neon glow', effects: { glow: { color: '#9b5cff', size: 14 } }, loop: { type: 'glowPulse', speed: 1, amount: 0 } },
  { id: 'fx-shadow', name: 'Soft shadow', effects: { shadow: { color: '#00000088', blur: 14, dx: 0, dy: 12 } }, loop: { type: 'none', speed: 1, amount: 0 } },
  { id: 'fx-float', name: 'Gentle float', effects: {}, loop: { type: 'float', speed: 0.5, amount: 12 } },
  { id: 'fx-pulse', name: 'Pulse', effects: {}, loop: { type: 'pulse', speed: 1.2, amount: 0.06 } },
  { id: 'fx-swing', name: 'Swing', effects: {}, loop: { type: 'swing', speed: 0.8, amount: 8 } },
  { id: 'fx-shake', name: 'Alarm shake', effects: {}, loop: { type: 'shake', speed: 1, amount: 6 } },
  { id: 'fx-spin', name: 'Slow spin', effects: {}, loop: { type: 'spin', speed: 0.2, amount: 0 } },
  { id: 'fx-dreamy', name: 'Dreamy blur', effects: { blur: 3, glow: { color: '#ffffff', size: 10 } }, loop: { type: 'float', speed: 0.3, amount: 6 } },
];

function transitionDemo(type: TransitionType): Scene[] {
  const a = newScene('A'); a.duration = 0.8; a.background = { ...a.background, type: 'solid', color: '#1d2133', motion: 'none' };
  const b = newScene('B'); b.duration = 1.4; b.background = { ...b.background, type: 'linear', color: '#7c5cff', color2: '#22d3ee', motion: 'none' };
  b.transitionIn = { type, duration: 0.8, easing: 'easeInOutCubic' };
  return [a, b];
}

function selectedElementId() {
  const st = useStore.getState();
  return st.ui.selectedIds[0] ?? null;
}

export function Library() {
  const s = useStore();
  const assets = useAssets();
  const [cat, setCat] = useState<Cat>('all');
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<Item | null>(null);
  const { ask, node } = usePrompt();
  const target = resolveTarget(s, s.ui.target);
  const defChar = s.characters[0];

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    s.characters.forEach((c) => out.push({
      id: c.id, name: c.name, cat: 'characters', sub: c.style, duration: 4,
      preview: (t) => <svg viewBox="-220 -280 440 560" className="w-full h-full bg-gradient-to-b from-slate-200 to-slate-300"><CharacterSVG c={c} opts={{ ...resolveCharacterPose(assets, 'idle', undefined, 0, 'idle', t, 1, false), expression: 'happy', time: t, draw: 1 }} /></svg>,
      use: () => insertIntoOpenTarget('character', { characterId: c.id }, c.name.split('—')[0].trim()),
      edit: () => s.ui$({ page: 'character', activeCharacterId: c.id }),
      duplicate: () => s.mutate((d) => { d.characters.unshift({ ...structuredClone(c), id: uid('ch_'), name: `${c.name} copy` }); }),
      rename: (n) => s.mutate((d) => { d.characters.find((x) => x.id === c.id)!.name = n; }),
      remove: () => s.mutate((d) => { d.characters = d.characters.filter((x) => x.id !== c.id); }),
    }));
    [...BUILTIN_MOVEMENTS.filter((m) => m.id !== 'none'), ...s.movements].forEach((m) => out.push({
      id: m.id, name: m.name, cat: 'movements', sub: m.builtin ? 'built-in' : 'custom', builtin: m.builtin, duration: 4,
      preview: (t) => defChar ? <svg viewBox="-220 -280 440 560" className="w-full h-full bg-gradient-to-b from-slate-200 to-slate-300"><CharacterSVG c={defChar} opts={{ ...resolveCharacterPose(assets, 'idle', undefined, 0, m.id, t, 1, m.id === 'talk'), expression: 'happy', time: t, draw: 1 }} /></svg> : null,
      useLabel: 'Apply to selected',
      use: () => { const id = selectedElementId(); const el = target?.scene.elements.find((e) => e.id === id); if (el?.type !== 'character') return s.toast('Select a character layer in the editor first', 'err'); mutateElement(el.id, (d) => { (d.props as any).movement = m.id; }); s.toast(`Movement “${m.name}” applied`); },
      edit: m.builtin ? undefined : () => s.ui$({ page: 'character' }),
      rename: m.builtin ? undefined : (n) => s.mutate((d) => { d.movements.find((x) => x.id === m.id)!.name = n; }),
      duplicate: m.steps ? () => s.mutate((d) => { d.movements.unshift({ ...structuredClone(m), id: uid('mv_'), name: `${m.name} copy`, builtin: false }); }) : undefined,
      remove: m.builtin ? undefined : () => s.mutate((d) => { d.movements = d.movements.filter((x) => x.id !== m.id); }),
    }));
    s.clips.forEach((c) => out.push({
      id: c.id, name: c.name, cat: c.kind === 'motion' ? 'motion' : c.kind === 'transition' ? 'transitions' : c.kind === 'effect' ? 'effects' : 'animations', sub: c.category, duration: c.scene.duration,
      preview: (t) => <SceneStill scenes={[c.scene]} t={t} />,
      useLabel: 'Add to project',
      use: () => {
        const pid = s.ui.activeProjectId ?? s.projects[0]?.id;
        if (!pid) return s.toast('Create a project first', 'err');
        const sc = cloneScene(c.scene, c.name);
        s.mutate((d) => { d.projects.find((p) => p.id === pid)!.scenes.push(sc); });
        actions.openScene(pid, sc.id);
        s.toast(`“${c.name}” added as a new scene`);
      },
      edit: () => actions.openClip(c.id),
      duplicate: () => s.mutate((d) => { d.clips.unshift({ ...structuredClone(c), id: uid('cl_'), name: `${c.name} copy`, createdAt: Date.now() }); }),
      rename: (n) => s.mutate((d) => { const x = d.clips.find((y) => y.id === c.id)!; x.name = n; x.scene.name = n; }),
      remove: () => s.mutate((d) => { d.clips = d.clips.filter((x) => x.id !== c.id); }),
    }));
    allIllustrations(s).forEach((il) => out.push({
      id: il.id, name: il.name, cat: 'illustrations', sub: il.category, builtin: il.builtin, duration: 3,
      preview: (t) => <svg viewBox={`${-il.w * 0.6} ${-il.h * 0.6} ${il.w * 1.2} ${il.h * 1.2}`} className="w-full h-full"><IllustrationView il={il} local={t} /></svg>,
      use: () => insertIntoOpenTarget('illustration', { illustrationId: il.id, partAnimations: true }, il.name),
      edit: () => s.ui$({ page: 'illustration', activeIllustrationId: il.id }),
      duplicate: () => s.mutate((d) => { d.illustrations.unshift({ ...structuredClone(il), id: uid('il_'), name: `${il.name} copy`, builtin: false }); }),
      rename: il.builtin ? undefined : (n) => s.mutate((d) => { d.illustrations.find((x) => x.id === il.id)!.name = n; }),
      remove: il.builtin ? undefined : () => s.mutate((d) => { d.illustrations = d.illustrations.filter((x) => x.id !== il.id); }),
    }));
    TRANSITIONS.filter((x) => x !== 'none').forEach((tt) => out.push({
      id: `tr-${tt}`, name: tt, cat: 'transitions', sub: 'scene transition', builtin: true, duration: 2.2,
      preview: (t) => <SceneStill scenes={transitionDemo(tt)} t={t} />,
      useLabel: 'Apply to open scene',
      use: () => { if (!target) return s.toast('Open a scene first', 'err'); mutateScene((sc) => { sc.transitionIn.type = tt; }); s.toast(`Transition “${tt}” set`); },
    }));
    const bgs: { id: string; name: string; background: Background; builtin?: boolean }[] = [...BUILTIN_PRESETS.map((p) => ({ id: `bg-${p.id}`, name: `${p.name} bg`, background: p.background, builtin: true })), ...s.backgrounds];
    bgs.forEach((b) => out.push({
      id: b.id, name: b.name, cat: 'backgrounds', builtin: b.builtin, duration: 6,
      preview: (t) => <svg viewBox="0 0 1920 1080" className="w-full h-full"><BackgroundView bg={b.background} W={1920} H={1080} t={t} id={`lb-${b.id}`} /></svg>,
      useLabel: 'Apply to open scene',
      use: () => { if (!target) return s.toast('Open a scene first', 'err'); mutateScene((sc) => { sc.background = structuredClone(b.background); }); s.toast('Background applied'); },
      rename: b.builtin ? undefined : (n) => s.mutate((d) => { d.backgrounds.find((x) => x.id === b.id)!.name = n; }),
      duplicate: () => s.mutate((d) => { d.backgrounds.unshift({ id: uid('bg_'), name: `${b.name} copy`, background: structuredClone(b.background) }); }),
      remove: b.builtin ? undefined : () => s.mutate((d) => { d.backgrounds = d.backgrounds.filter((x) => x.id !== b.id); }),
    }));
    [...BUILTIN_EFFECTS.map((e) => ({ ...e, builtin: true })), ...s.effects.map((e) => ({ ...e, builtin: false }))].forEach((fx) => out.push({
      id: fx.id, name: fx.name, cat: 'effects', builtin: fx.builtin, sub: fx.loop.type !== 'none' ? `loop: ${fx.loop.type}` : 'filter', duration: 4,
      preview: (t) => <EffectPreview effects={fx.effects} loop={fx.loop} t={t} />,
      useLabel: 'Apply to selected',
      use: () => { const id = selectedElementId(); if (!id || !target?.scene.elements.some((e) => e.id === id)) return s.toast('Select a layer in the editor first', 'err'); mutateElement(id, (d) => { d.effects = structuredClone(fx.effects); d.loop = structuredClone(fx.loop); }); s.toast(`Effect “${fx.name}” applied`); },
      duplicate: () => s.mutate((d) => { d.effects.unshift({ id: uid('fx_'), name: `${fx.name} copy`, effects: structuredClone(fx.effects), loop: structuredClone(fx.loop) }); }),
      rename: fx.builtin ? undefined : (n) => s.mutate((d) => { d.effects.find((x) => x.id === fx.id)!.name = n; }),
      remove: fx.builtin ? undefined : () => s.mutate((d) => { d.effects = d.effects.filter((x) => x.id !== fx.id); }),
    }));
    s.templates.forEach((tp) => out.push({
      id: tp.id, name: tp.name, cat: 'scenes', sub: 'template', duration: tp.scene.duration,
      preview: (t) => <SceneStill scenes={[tp.scene]} t={t} />,
      useLabel: 'Add to project',
      use: () => { const pid = s.ui.activeProjectId ?? s.projects[0]?.id; if (!pid) return; const sc = cloneScene(tp.scene, tp.name); s.mutate((d) => { d.projects.find((p) => p.id === pid)!.scenes.push(sc); }); actions.openScene(pid, sc.id); },
      duplicate: () => s.mutate((d) => { d.templates.unshift({ ...structuredClone(tp), id: uid('tp_'), name: `${tp.name} copy` }); }),
      rename: (n) => s.mutate((d) => { d.templates.find((x) => x.id === tp.id)!.name = n; }),
      remove: () => s.mutate((d) => { d.templates = d.templates.filter((x) => x.id !== tp.id); }),
    }));
    s.projects.forEach((p) => p.scenes.forEach((sc) => out.push({
      id: sc.id, name: sc.name, cat: 'scenes', sub: p.title, duration: sc.duration,
      preview: (t) => <SceneStill scenes={[sc]} t={t} />,
      useLabel: 'Open',
      use: () => actions.openScene(p.id, sc.id),
      edit: () => actions.openScene(p.id, sc.id),
      duplicate: () => s.mutate((d) => { d.templates.unshift({ id: uid('tp_'), name: `${sc.name} (template)`, scene: cloneScene(sc), createdAt: Date.now() }); s.toast('Saved as template'); }),
      rename: (n) => s.mutate((d) => { d.projects.find((x) => x.id === p.id)!.scenes.find((x) => x.id === sc.id)!.name = n; }),
    })));
    return out;
  }, [s.characters, s.movements, s.clips, s.illustrations, s.backgrounds, s.effects, s.templates, s.projects, assets, target?.scene]);

  const counts = items.reduce<Record<string, number>>((m, i) => { m[i.cat] = (m[i.cat] ?? 0) + 1; return m; }, {});
  const shown = items.filter((i) => (cat === 'all' || i.cat === cat) && `${i.name} ${i.sub ?? ''}`.toLowerCase().includes(q.toLowerCase()));
  const CATS: { value: Cat; label: string }[] = [
    { value: 'all', label: `All (${items.length})` }, { value: 'characters', label: 'Characters' }, { value: 'movements', label: 'Movements' }, { value: 'animations', label: 'Animations' },
    { value: 'illustrations', label: 'Illustrations' }, { value: 'motion', label: 'Motion graphics' }, { value: 'transitions', label: 'Transitions' },
    { value: 'backgrounds', label: 'Backgrounds' }, { value: 'effects', label: 'Effects' }, { value: 'scenes', label: 'Complete scenes' },
  ].map((c) => ({ ...c, label: c.value === 'all' ? c.label : `${c.label} (${counts[c.value] ?? 0})` })) as { value: Cat; label: string }[];

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <PageHeader icon={<LibIcon size={20} />} title="Animation Library" subtitle={`Everything you've built, searchable and reusable.${target ? ` Insert target: ${target.label}` : ' Open a scene to insert items into it.'}`} />
      <div className="flex flex-col gap-3 mb-4">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-8 h-9" placeholder="Search animations, assets, scenes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs value={cat} onChange={setCat} tabs={CATS} />
      </div>
      {shown.length === 0 ? <Empty title="Nothing found" text="Try another search or category." /> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 gap-3">
          {shown.map((it) => <LibCard key={`${it.cat}-${it.id}`} it={it} onPreview={() => setPreview(it)} ask={ask} />)}
        </div>
      )}
      <Modal open={!!preview} onClose={() => setPreview(null)} wide title={preview?.name ?? ''} footer={preview?.use && <button className="btn-primary" onClick={() => { preview.use!(); setPreview(null); }}><Plus size={14} />{preview.useLabel ?? 'Use in open scene'}</button>}>
        {preview && <BigPreview it={preview} />}
      </Modal>
      {node}
    </div>
  );
}

function SceneStill({ scenes, t }: { scenes: Scene[]; t: number }) {
  const assets = useAssets();
  return <SequenceSVG scenes={scenes} assets={assets} format={LANDSCAPE} time={t} idPrefix={`l${scenes[0]?.id}`} style={{ width: '100%', height: '100%' }} />;
}

function EffectPreview({ effects, loop, t }: { effects: Effects; loop: LoopSpec; t: number }) {
  const sc = useMemo(() => {
    const s = newScene('fx'); s.duration = 4; s.background = { ...s.background, type: 'radial', color: '#0b0c16', color2: '#1c1650', motion: 'none' };
    s.elements = [{ id: 'fx-el', type: 'shape', name: 'demo', start: 0, end: 4, layout: { landscape: { x: 960, y: 540, scale: 1, rotation: 0 } }, props: { shape: 'star', w: 420, h: 420, fill: '#9b5cff', stroke: 'none', strokeWidth: 0, radius: 0, sides: 5 }, animIn: { type: 'none', duration: 0.1, easing: 'linear' }, animOut: { type: 'none', duration: 0.1, easing: 'linear' }, loop, tracks: {}, effects }];
    return s;
  }, [effects, loop]);
  return <SceneStill scenes={[sc]} t={t} />;
}

function LibCard({ it, onPreview, ask }: { it: Item; onPreview: () => void; ask: (t: string, v?: string) => Promise<string | null> }) {
  const [hover, setHover] = useState(false);
  const [t] = useClock(hover, it.duration ?? 3);
  return (
    <div className="card overflow-hidden group" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <div className="aspect-video bg-ink-950 cursor-pointer" onClick={onPreview}>{it.preview(hover ? t : (it.duration ?? 3) * 0.7)}</div>
      <div className="p-2">
        <div className="flex items-center gap-1">
          <div className="text-[13px] font-medium truncate flex-1" title={it.name}>{it.name}</div>
          {it.builtin && <span className="chip text-[10px]">built-in</span>}
        </div>
        <div className="text-[11px] text-slate-500 truncate">{it.cat}{it.sub ? ` · ${it.sub}` : ''}</div>
        <div className="flex items-center gap-0.5 mt-1.5 opacity-70 group-hover:opacity-100">
          <button className="icon-btn" title="Preview" onClick={onPreview}><Eye size={13} /></button>
          {it.use && <button className="icon-btn" title={it.useLabel ?? 'Use in open scene'} onClick={it.use}><Plus size={14} /></button>}
          {it.edit && <button className="icon-btn" title="Edit" onClick={it.edit}><Pencil size={13} /></button>}
          {it.duplicate && <button className="icon-btn" title="Duplicate" onClick={it.duplicate}><Copy size={13} /></button>}
          {it.rename && <button className="icon-btn" title="Rename" onClick={async () => { const n = await ask('Rename', it.name); if (n) it.rename!(n); }}><Type size={13} /></button>}
          <div className="flex-1" />
          {it.remove && <button className={cx('icon-btn hover:text-rose-300')} title="Delete" onClick={() => { if (confirmAction(`Delete “${it.name}”?`)) it.remove!(); }}><Trash2 size={13} /></button>}
        </div>
      </div>
    </div>
  );
}

function BigPreview({ it }: { it: Item }) {
  const [t] = useClock(true, it.duration ?? 3);
  return <div className="aspect-video bg-ink-950 rounded-xl overflow-hidden">{it.preview(t)}</div>;
}

export { SceneThumb };
