import { Copy, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DEFAULT_FORMATS, newElement, newScene, uid } from '../lib/factory';
import { actions, type Clip, findPreset, selectAssets, useStore } from '../store/store';
import { confirmAction, cx, Select } from '../ui/kit';
import { SceneThumb } from '../ui/Thumb';
import { Editor } from './editor/Editor';

const STARTERS = [
  { id: 'blank', label: 'Blank canvas' },
  { id: 'kinetic', label: 'Kinetic typography' },
  { id: 'stat', label: 'Animated statistic' },
  { id: 'chart', label: 'Chart animation' },
  { id: 'connector', label: 'Arrows & connectors' },
  { id: 'infographic', label: 'Infographic steps' },
  { id: 'camera', label: 'Camera zoom move' },
  { id: 'background', label: 'Background animation' },
] as const;

export function MotionStudio() {
  const clips = useStore((s) => s.clips);
  const ui = useStore((s) => s.ui);
  const mutate = useStore((s) => s.mutate);
  const [listOpen, setListOpen] = useState(window.innerWidth > 900);
  const [kind, setKind] = useState<'all' | Clip['kind']>('all');

  useEffect(() => {
    const ok = ui.target?.kind === 'clip' && clips.some((c) => c.id === (ui.target as { clipId: string }).clipId);
    if (!ok && clips[0]) actions.openClip(clips[0].id);
  }, [ui.target, clips.length]);

  const create = (starter: string) => {
    const st = useStore.getState();
    const preset = findPreset(st, st.settings.defaultPresetId);
    const assets = selectAssets(st);
    const formats = structuredClone(DEFAULT_FORMATS);
    const sc = newScene(STARTERS.find((s) => s.id === starter)?.label ?? 'Motion clip', preset, st.settings.defaultFps);
    sc.duration = 3;
    const add = (type: Parameters<typeof newElement>[0], o: Record<string, unknown> = {}, patch?: (e: any) => void) => {
      const e = newElement(type, { preset, formats, formatId: 'landscape', assets, end: sc.duration, ...(o as object) });
      patch?.(e);
      sc.elements.push(e);
      return e;
    };
    switch (starter) {
      case 'kinetic': add('text', { props: { text: 'Motion that\nexplains', kinetic: 'words', stagger: 0.1 } }, (e) => { e.animIn = { type: 'slideUp', duration: 0.55, easing: 'easeOutBack', delay: 0, distance: 150 }; }); break;
      case 'stat':
        add('counter', { props: { from: 0, to: 92, suffix: '%', prefix: '' } }, (e) => { e.animIn = { type: 'draw', duration: 1.4, easing: 'easeOutExpo', delay: 0 }; });
        add('text', { at: { x: 960, y: 760 }, props: { text: 'of people never check this', fontSize: 52, kinetic: 'words' } }, (e) => { e.animIn.delay = 0.6; });
        break;
      case 'chart': add('chart', { props: { chartType: 'line', data: [12, 18, 15, 26, 31, 44, 52] } }, (e) => { e.animIn = { type: 'draw', duration: 1.8, easing: 'easeInOutCubic', delay: 0 }; }); break;
      case 'connector':
        add('shape', { at: { x: 500, y: 540 }, props: { shape: 'circle', w: 220, h: 220 } });
        add('shape', { at: { x: 1420, y: 540 }, props: { shape: 'circle', w: 220, h: 220 } }, (e) => { e.animIn.delay = 0.3; });
        add('arrow', { props: { dx: 560, dy: 0, curve: 0.3 } }, (e) => { e.animIn = { type: 'draw', duration: 0.8, easing: 'easeInOutCubic', delay: 0.6 }; });
        break;
      case 'infographic':
        [0, 1, 2].forEach((i) => {
          add('shape', { at: { x: 480 + i * 480, y: 520 }, props: { shape: 'rect', w: 360, h: 360, radius: 40 } }, (e) => { e.animIn.delay = i * 0.25; });
          add('counter', { at: { x: 480 + i * 480, y: 520 }, props: { from: 0, to: i + 1, prefix: '', fontSize: 140, color: '#ffffff' } }, (e) => { e.animIn = { type: 'pop', duration: 0.4, easing: 'easeOutBack', delay: i * 0.25 + 0.2 }; });
        });
        break;
      case 'camera':
        add('illustration', { props: { illustrationId: 'ill-city' } });
        sc.camera.tracks.zoom = [{ id: uid('kf_'), time: 0, value: 1, easing: 'easeInOutCubic' }, { id: uid('kf_'), time: 3, value: 1.6, easing: 'linear' }];
        sc.camera.tracks.x = [{ id: uid('kf_'), time: 0, value: 0, easing: 'easeInOutCubic' }, { id: uid('kf_'), time: 3, value: 160, easing: 'linear' }];
        break;
      case 'background': add('fx', { props: { kind: 'bokeh', count: 30 } }); add('fx', { props: { kind: 'particles', count: 70 } }); break;
    }
    const clip: Clip = { id: uid('cl_'), name: sc.name, kind: 'motion', category: starter === 'blank' ? 'Custom' : STARTERS.find((s) => s.id === starter)!.label, tags: [], scene: sc, formats, presetId: preset.id, createdAt: Date.now(), updatedAt: Date.now() };
    mutate((d) => { d.clips.unshift(clip); });
    actions.openClip(clip.id);
  };

  const activeId = ui.target?.kind === 'clip' ? ui.target.clipId : null;
  const active = clips.find((c) => c.id === activeId);
  const shown = clips.filter((c) => kind === 'all' || c.kind === kind);

  return (
    <div className="flex h-full min-h-0 relative">
      {listOpen && (
        <div className="w-[230px] shrink-0 border-r border-white/[0.06] bg-ink-900/70 flex flex-col min-h-0 max-md:absolute max-md:z-40 max-md:h-full">
          <div className="p-2 space-y-2 border-b border-white/[0.06]">
            <select className="input h-8 text-[12px]" value="" onChange={(e) => e.target.value && create(e.target.value)}>
              <option value="">＋ New motion clip…</option>
              {STARTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <Select value={kind} options={[{ value: 'all', label: 'All clips' }, { value: 'motion', label: 'Motion graphics' }, { value: 'animation', label: 'Animations' }, { value: 'transition', label: 'Transitions' }, { value: 'effect', label: 'Effects' }]} onChange={(v) => setKind(v)} />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {shown.map((c) => (
              <div key={c.id} className={cx('group rounded-lg p-1.5 border cursor-pointer', c.id === activeId ? 'border-accent bg-accent/10 shadow-glow' : 'border-white/[0.06] hover:border-white/20')} onClick={() => actions.openClip(c.id)}>
                <SceneThumb scene={c.scene} format={c.formats.find((f) => f.id === ui.formatId) ?? c.formats[0]} />
                <div className="text-[12px] truncate mt-1">{c.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="chip">{c.category}</span>
                  <div className="flex-1" />
                  <button className="icon-btn w-6 h-6 opacity-60 group-hover:opacity-100" title="Duplicate" onClick={(e) => { e.stopPropagation(); const n = { ...structuredClone(c), id: uid('cl_'), name: `${c.name} copy`, createdAt: Date.now() }; mutate((d) => { d.clips.unshift(n); }); }}><Copy size={12} /></button>
                  <button className="icon-btn w-6 h-6 opacity-60 group-hover:opacity-100 hover:text-rose-300" title="Delete" onClick={(e) => { e.stopPropagation(); if (confirmAction(`Delete “${c.name}”?`)) mutate((d) => { d.clips = d.clips.filter((x) => x.id !== c.id); }); }}><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
            {!shown.length && <div className="text-[12px] text-slate-500 p-2">No clips — create one above.</div>}
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        {active && (
          <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 border-b border-white/[0.06] text-[12px]">
            <input className="input h-7 w-56" value={active.name} onChange={(e) => mutate((d) => { const c = d.clips.find((x) => x.id === active.id)!; c.name = e.target.value; c.scene.name = e.target.value; })} />
            <Select value={active.kind} options={['motion', 'animation', 'transition', 'effect']} onChange={(v) => mutate((d) => { d.clips.find((x) => x.id === active.id)!.kind = v; })} />
            <input className="input h-7 w-40" placeholder="Category" value={active.category} onChange={(e) => mutate((d) => { d.clips.find((x) => x.id === active.id)!.category = e.target.value; })} />
            <input className="input h-7 w-48" placeholder="tags, comma separated" value={active.tags.join(', ')} onChange={(e) => mutate((d) => { d.clips.find((x) => x.id === active.id)!.tags = e.target.value.split(',').map((t) => t.trim()).filter(Boolean); })} />
          </div>
        )}
        <div className="flex-1 min-h-0">
          <Editor mode="motion" sideHeader={<button className="icon-btn" title="Toggle clip list" onClick={() => setListOpen(!listOpen)}>{listOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}</button>} />
        </div>
      </div>
      {!clips.length && <div className="absolute inset-0 flex items-center justify-center"><button className="btn-primary" onClick={() => create('kinetic')}><Plus size={14} />Create first clip</button></div>}
    </div>
  );
}
