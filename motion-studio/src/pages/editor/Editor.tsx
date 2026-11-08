import { Download, Film, PanelLeft, PanelRight, Grid3x3, Maximize, Monitor, Redo2, ScanLine, Smartphone, Sparkles, Undo2, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import type { Scene, TrackProp } from '../../engine/schema';
import { cloneElement } from '../../lib/factory';
import { useStore } from '../../store/store';
import { mutateScene, removeCameraKey, removeKeyframe, setLayout, useEditing } from '../../ui/editing';
import { ExportDialog, type ExportSource } from '../../ui/ExportDialog';
import { cx, Empty } from '../../ui/kit';
import { usePlaybackLoop } from '../../ui/playback';
import { Inspector } from './Inspector';
import { LeftPanel } from './InsertPanel';
import { Stage } from './Stage';
import { Timeline } from './Timeline';
import { layoutFor } from '../../engine/evaluate';
import type { CameraProp } from '../../engine/schema';

export function Editor({ mode, sideHeader }: { mode: 'scene' | 'motion'; sideHeader?: React.ReactNode }) {
  const { ctx, scene, formats, format, preset } = useEditing();
  const ui = useStore((s) => s.ui);
  const ui$ = useStore((s) => s.ui$);
  const settings = useStore((s) => s.settings);
  const mutate = useStore((s) => s.mutate);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const [exp, setExp] = useState<{ src: ExportSource; tab: 'export' | 'prompt' } | null>(null);
  const [panels, setPanels] = useState({ left: true, right: true });

  const sequence = ui.sequencePreview && ctx?.project ? ctx.project.scenes : undefined;
  const duration = sequence ? sequence.reduce((s, x) => s + x.duration, 0) : scene?.duration ?? 1;
  usePlaybackLoop(duration);

  useEffect(() => {
    const narrow = window.innerWidth < 1100;
    if (narrow) setPanels({ left: false, right: false });
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const st = useStore.getState();
      const sc = scene;
      if (!sc) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === ' ') { e.preventDefault(); ui$({ playing: !st.ui.playing }); return; }
      if (e.key === ',' || e.key === '.') { const f = Math.round(st.ui.time * sc.fps) + (e.key === '.' ? 1 : -1); ui$({ playing: false, time: Math.min(duration, Math.max(0, f / sc.fps)) }); return; }
      if (e.key === 'Home') { ui$({ time: 0 }); return; }
      if (e.key === 'End') { ui$({ time: duration }); return; }
      const sel = st.ui.selectedIds;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const kf = st.ui.selectedKeyframe;
        if (kf) { kf.elementId === '__camera' ? removeCameraKey(kf.prop as CameraProp, kf.id) : removeKeyframe(kf.elementId, kf.prop as TrackProp, kf.id); ui$({ selectedKeyframe: null }); return; }
        if (sel.length) { mutateScene((s) => { s.elements = s.elements.filter((x) => !sel.includes(x.id)); }); ui$({ selectedIds: [] }); }
        return;
      }
      if (mod && e.key.toLowerCase() === 'd' && sel.length) {
        e.preventDefault();
        const copies = sc.elements.filter((x) => sel.includes(x.id)).map(cloneElement);
        mutateScene((s) => { s.elements.push(...copies); });
        ui$({ selectedIds: copies.map((c) => c.id) });
        return;
      }
      if (e.key.startsWith('Arrow') && sel.length && format) {
        e.preventDefault();
        const d = e.shiftKey ? 10 : 1;
        sel.forEach((id) => {
          const el = sc.elements.find((x) => x.id === id);
          if (!el) return;
          const L = layoutFor(el, format.id);
          setLayout(id, { x: L.x + (e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0), y: L.y + (e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0) }, format.id);
        });
        return;
      }
      if (e.key === 'Escape') ui$({ selectedIds: [], selectedKeyframe: null });
      if (e.key.toLowerCase() === 'k' && !mod) ui$({ autoKey: !st.ui.autoKey });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scene, format, duration]);

  const exportSrc = useMemo<ExportSource | null>(() => {
    if (!ctx || !scene) return null;
    return { title: ctx.clip ? ctx.clip.name : `${ctx.project!.title} — ${scene.name}`, kind: ctx.clip ? 'clip' : 'scene', scenes: [scene], formats, presetId: ctx.presetId, projectId: ctx.project?.id };
  }, [ctx, scene, formats]);

  if (!ctx || !scene || !format) {
    return <Empty icon={<Film size={36} />} title="Nothing open" text={mode === 'scene' ? 'Pick a scene from the list, or create a project first.' : 'Pick or create a motion clip.'} />;
  }

  const selEls = scene.elements.filter((e) => ui.selectedIds.includes(e.id));
  const fmtIcon = (id: string) => (id === 'shorts' ? <Smartphone size={14} /> : <Monitor size={14} />);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* toolbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.06] bg-ink-900/80">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto [&>*]:shrink-0">
        {sideHeader}
        <div className="flex items-center rounded-lg bg-ink-950 border border-white/[0.07] p-0.5">
          {formats.map((f) => (
            <button key={f.id} onClick={() => ui$({ formatId: f.id, zoom: 0 })} className={cx('h-7 px-2.5 rounded-md text-[12px] flex items-center gap-1.5 transition-all', format.id === f.id ? 'bg-accent text-white shadow-glow' : 'text-slate-400 hover:text-white')} title={`${f.width}×${f.height}`}>
              {fmtIcon(f.id)}<span className="hidden xl:inline">{f.name}</span><span className="xl:hidden">{f.width > f.height ? '16:9' : f.width < f.height ? '9:16' : '1:1'}</span>
            </button>
          ))}
        </div>
        <span className="text-[11px] text-slate-500 hidden 2xl:inline">{format.width}×{format.height}</span>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button className="icon-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={15} /></button>
        <button className="icon-btn" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}><Redo2 size={15} /></button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button className={cx('icon-btn', ui.showGrid && 'icon-btn-on')} title="Rule-of-thirds grid" onClick={() => ui$({ showGrid: !ui.showGrid })}><Grid3x3 size={15} /></button>
        <button className={cx('icon-btn', settings.showSafeZones && 'icon-btn-on')} title="Safe zones (captions, Shorts UI)" onClick={() => mutate((d) => { d.settings.showSafeZones = !d.settings.showSafeZones; }, false)}><ScanLine size={15} /></button>
        <button className="icon-btn" title="Zoom out" onClick={() => ui$({ zoom: Math.max(0.05, (ui.zoom || 0.4) * 0.8) })}><ZoomOut size={15} /></button>
        <button className="icon-btn" title="Zoom in (Ctrl+wheel)" onClick={() => ui$({ zoom: Math.min(2, (ui.zoom || 0.4) * 1.25) })}><ZoomIn size={15} /></button>
        <button className={cx('icon-btn', !ui.zoom && 'icon-btn-on')} title="Fit" onClick={() => ui$({ zoom: 0 })}><Maximize size={15} /></button>
        <button className={cx('btn h-7 px-2 text-[12px] border', ui.autoKey ? 'bg-rose-500/20 border-rose-500/50 text-rose-200' : 'border-white/10 text-slate-400 hover:text-white')} title="Auto-key (K): canvas drags record keyframes at the playhead" onClick={() => ui$({ autoKey: !ui.autoKey })}>
          <span className={cx('w-2 h-2 rounded-full', ui.autoKey ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-slate-600')} />Auto-key
        </button>
        {ctx.project && (
          <button className={cx('btn h-7 px-2 text-[12px] border', ui.sequencePreview ? 'bg-accent/20 border-accent/50 text-white' : 'border-white/10 text-slate-400 hover:text-white')} title="Preview the full scene sequence with transitions"
            onClick={() => ui$({ sequencePreview: !ui.sequencePreview, time: 0, playing: !ui.sequencePreview, selectedIds: [] })}>
            <Film size={13} />{ui.sequencePreview ? 'Sequence' : 'Scene'}
          </button>
        )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
        <button className={cx('icon-btn hidden lg:inline-flex', panels.left && 'icon-btn-on')} title="Toggle insert / layers panel" onClick={() => setPanels({ ...panels, left: !panels.left })}><PanelLeft size={15} /></button>
        <button className={cx('icon-btn hidden lg:inline-flex', panels.right && 'icon-btn-on')} title="Toggle inspector" onClick={() => setPanels({ ...panels, right: !panels.right })}><PanelRight size={15} /></button>
        {selEls.length === 1 && (
          <button className="btn-soft h-7 text-[12px]" title="Export only the selected layer as its own animation" onClick={() => setExp({ tab: 'export', src: { ...exportSrc!, title: `${exportSrc!.title} — ${selEls[0].name}`, kind: 'clip', onlyElementIds: [selEls[0].id] } })}>
            <Download size={13} /><span className="hidden 2xl:inline">Export layer</span><span className="2xl:hidden">Layer</span>
          </button>
        )}
        <button className="btn-soft h-7 text-[12px]" onClick={() => setExp({ src: exportSrc!, tab: 'prompt' })}><Sparkles size={13} /><span className="hidden 2xl:inline">Claude prompt</span><span className="2xl:hidden">Prompt</span></button>
        <button className="btn-primary h-7 text-[12px]" onClick={() => setExp({ src: sequence && ctx.project ? { title: ctx.project.title, kind: 'sequence', scenes: ctx.project.scenes, formats, presetId: ctx.project.presetId, projectId: ctx.project.id } : exportSrc!, tab: 'export' })}><Download size={13} />Export</button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* left */}
        <div className={cx('w-[236px] shrink-0 border-r border-white/[0.06] bg-ink-900/60 min-h-0', panels.left ? 'block' : 'hidden', 'max-lg:absolute max-lg:z-30 max-lg:h-[calc(100%-260px)] max-lg:shadow-2xl max-lg:bg-ink-900')}>
          <LeftPanel scene={scene} formats={formats} format={format} preset={preset} mode={mode} />
        </div>
        {/* centre */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <Stage scene={scene} format={format} sequence={sequence} />
          <div className="h-[230px] shrink-0">
            <Timeline scene={scene as Scene} duration={duration} sequence={!!sequence} />
          </div>
        </div>
        {/* right */}
        <div className={cx('w-[300px] shrink-0 border-l border-white/[0.06] bg-ink-900/60 min-h-0', panels.right ? 'block' : 'hidden', 'max-lg:absolute max-lg:right-0 max-lg:z-30 max-lg:h-[calc(100%-260px)] max-lg:shadow-2xl max-lg:bg-ink-900')}>
          <Inspector scene={scene} format={format} formats={formats} />
        </div>
      </div>
      <div className="lg:hidden flex gap-1 p-1 border-t border-white/[0.06]">
        <button className="btn-soft flex-1 h-7 text-[12px]" onClick={() => setPanels({ left: !panels.left, right: false })}>Insert / Layers</button>
        <button className="btn-soft flex-1 h-7 text-[12px]" onClick={() => setPanels({ right: !panels.right, left: false })}>Inspector</button>
      </div>
      <ExportDialog open={!!exp} source={exp?.src ?? null} initialTab={exp?.tab} onClose={() => setExp(null)} />
    </div>
  );
}
