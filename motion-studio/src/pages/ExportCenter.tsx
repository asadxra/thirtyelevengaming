import { CheckCircle2, Download, FileArchive, Film, Image as ImageIcon, PersonStanding, Sparkles, Trash2, XCircle } from 'lucide-react';
import React, { useState } from 'react';
import type { FormatDef } from '../engine/schema';
import { characterSheetSVG, illustrationSVG } from '../export/package';
import { downloadBlob, slug } from '../export/video';
import { DEFAULT_FORMATS, newElement, newScene } from '../lib/factory';
import { allIllustrations, findPreset, selectAssets, useStore } from '../store/store';
import { ExportDialog, type ExportSource } from '../ui/ExportDialog';
import { cx, fmtBytes, PageHeader, Tabs, timeAgo } from '../ui/kit';
import { SceneThumb } from '../ui/Thumb';

export function ExportCenter() {
  const projects = useStore((s) => s.projects);
  const clips = useStore((s) => s.clips);
  const characters = useStore((s) => s.characters);
  const history = useStore((s) => s.exportHistory);
  const custom = useStore((s) => s.illustrations);
  const mutate = useStore((s) => s.mutate);
  const [src, setSrc] = useState<ExportSource | null>(null);
  const [tab, setTab] = useState<'export' | 'prompt'>('export');
  const [section, setSection] = useState<'projects' | 'clips' | 'illustrations' | 'characters' | 'history'>('projects');
  const st = useStore.getState();

  const open = (s: ExportSource, t: 'export' | 'prompt' = 'export') => { setTab(t); setSrc(s); };
  const onlyFormat = (fs: FormatDef[], id: string) => fs.filter((f) => f.id === id);

  const assetScene = (type: 'illustration' | 'character', props: Record<string, unknown>, title: string): ExportSource => {
    const preset = findPreset(st, st.settings.defaultPresetId);
    const sc = newScene(title, preset); sc.duration = 3; sc.background = { ...sc.background, type: 'transparent' };
    const formats = structuredClone(DEFAULT_FORMATS);
    const el = newElement(type, { preset, formats, formatId: 'landscape', assets: selectAssets(st), end: 3, props: props as never });
    el.animIn = { type: 'none', duration: 0.1, easing: 'linear' }; el.animOut = { type: 'none', duration: 0.1, easing: 'linear' };
    sc.elements.push(el);
    return { title, kind: type, scenes: [sc], formats, presetId: preset.id };
  };

  const ok = history.filter((h) => h.status === 'done').length;
  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <PageHeader icon={<FileArchive size={20} />} title="Export Center" subtitle="Export any animation, illustration, scene or full project — in Shorts, Landscape or both — with its Claude replication package." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[['Exports done', ok, 'text-emerald-300'], ['Failed', history.length - ok, 'text-rose-300'], ['Projects', projects.length, 'text-accent'], ['Exportable items', projects.reduce((s, p) => s + p.scenes.length, 0) + clips.length + characters.length + allIllustrations(st).length, 'text-sky-300']].map(([l, v, c]) => (
          <div key={l as string} className="panel p-4"><div className={cx('text-2xl font-bold', c as string)}>{v}</div><div className="text-[12px] text-slate-400">{l}</div></div>
        ))}
      </div>
      <Tabs className="mb-4" value={section} onChange={setSection} tabs={[{ value: 'projects', label: 'Projects & scenes' }, { value: 'clips', label: 'Animations & motion' }, { value: 'illustrations', label: 'Illustrations' }, { value: 'characters', label: 'Characters' }, { value: 'history', label: `History (${history.length})` }]} />

      {section === 'projects' && projects.map((p) => (
        <div key={p.id} className="panel p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="font-semibold mr-auto">{p.title} <span className="text-[12px] text-slate-500 font-normal">· {p.scenes.length} scenes · {p.scenes.reduce((s, x) => s + x.duration, 0).toFixed(1)}s</span></div>
            {p.formats.slice(0, 2).map((f) => <button key={f.id} className="btn-soft h-7 text-[12px]" onClick={() => open({ title: `${p.title} (${f.name})`, kind: 'sequence', scenes: p.scenes, formats: onlyFormat(p.formats, f.id), presetId: p.presetId, projectId: p.id })}><Film size={13} />{f.name} sequence</button>)}
            <button className="btn-primary h-7 text-[12px]" onClick={() => open({ title: p.title, kind: 'project', scenes: p.scenes, formats: p.formats, presetId: p.presetId, projectId: p.id })}><FileArchive size={13} />Complete project</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {p.scenes.map((sc, i) => (
              <div key={sc.id} className="rounded-lg border border-white/[0.06] p-1.5">
                <SceneThumb scene={sc} format={p.formats[0]} />
                <div className="text-[12px] truncate mt-1">{i + 1}. {sc.name}</div>
                <div className="text-[10px] text-slate-500">{sc.duration}s · {sc.fps}fps · {sc.elements.length} layers</div>
                <div className="flex gap-1 mt-1">
                  <button className="btn-soft h-6 px-2 text-[11px] flex-1" onClick={() => open({ title: `${p.title} — ${sc.name}`, kind: 'scene', scenes: [sc], formats: p.formats, presetId: sc.presetId ?? p.presetId, projectId: p.id })}><Download size={11} />Export</button>
                  <button className="btn-soft h-6 px-2 text-[11px]" title="Claude prompt" onClick={() => open({ title: `${p.title} — ${sc.name}`, kind: 'scene', scenes: [sc], formats: p.formats, presetId: sc.presetId ?? p.presetId, projectId: p.id }, 'prompt')}><Sparkles size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {section === 'clips' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {clips.map((c) => (
            <div key={c.id} className="panel p-2">
              <SceneThumb scene={c.scene} format={c.formats[0]} />
              <div className="text-[12px] truncate mt-1">{c.name}</div>
              <div className="text-[10px] text-slate-500">{c.kind} · {c.scene.duration}s</div>
              <div className="flex gap-1 mt-1">
                <button className="btn-soft h-6 px-2 text-[11px] flex-1" onClick={() => open({ title: c.name, kind: 'clip', scenes: [c.scene], formats: c.formats, presetId: c.presetId })}><Download size={11} />Export</button>
                <button className="btn-soft h-6 px-2 text-[11px]" onClick={() => open({ title: c.name, kind: 'clip', scenes: [c.scene], formats: c.formats, presetId: c.presetId }, 'prompt')}><Sparkles size={11} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'illustrations' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {allIllustrations(st).map((il) => (
            <div key={il.id} className="panel p-2">
              <div className="aspect-square bg-ink-950 rounded-lg" dangerouslySetInnerHTML={{ __html: illustrationSVG(il).replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
              <div className="text-[12px] truncate mt-1">{il.name}</div>
              <div className="flex gap-1 mt-1">
                <button className="btn-soft h-6 px-2 text-[11px]" onClick={() => downloadBlob(new Blob([illustrationSVG(il)], { type: 'image/svg+xml' }), `${slug(il.name)}.svg`)}><ImageIcon size={11} />SVG</button>
                <button className="btn-soft h-6 px-2 text-[11px] flex-1" onClick={() => open(assetScene('illustration', { illustrationId: il.id, partAnimations: true }, `Illustration — ${il.name}`))}><Film size={11} />Animated</button>
              </div>
            </div>
          ))}
          {void custom}
        </div>
      )}

      {section === 'characters' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {characters.map((c) => (
            <div key={c.id} className="panel p-2">
              <div className="aspect-square bg-white rounded-lg overflow-hidden" dangerouslySetInnerHTML={{ __html: characterSheetSVG(c, selectAssets(st), ['idle']).replace('<svg ', '<svg style="width:100%;height:100%" ') }} />
              <div className="text-[12px] truncate mt-1">{c.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <button className="btn-soft h-6 px-2 text-[11px]" onClick={() => downloadBlob(new Blob([characterSheetSVG(c, selectAssets(st), ['idle', 'wave', 'point', 'thinking', 'celebrate', 'shrug', 'walkA', 'walkB'])], { type: 'image/svg+xml' }), `${slug(c.name)}-sheet.svg`)}><PersonStanding size={11} />Sheet</button>
                <button className="btn-soft h-6 px-2 text-[11px]" onClick={() => downloadBlob(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' }), `${slug(c.name)}.json`)}>JSON</button>
                <button className="btn-soft h-6 px-2 text-[11px] flex-1" onClick={() => open(assetScene('character', { characterId: c.id, pose: 'idle', expression: 'happy', movement: 'idle', movementSpeed: 1, flip: false, talking: false }, `${c.name} — idle`))}><Film size={11} />Animated</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'history' && (
        <div className="panel overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="text-slate-500 text-left"><tr>{['Status', 'Item', 'File', 'Formats', 'Dimensions', 'FPS', 'Size', 'Project', 'When', 'Note'].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-white/[0.05]">
                  <td className="px-3 py-2">{h.status === 'done' ? <CheckCircle2 size={15} className="text-emerald-400" /> : <XCircle size={15} className="text-rose-400" />}</td>
                  <td className="px-3 py-2 max-w-[220px] truncate">{h.label}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.fileType}</td>
                  <td className="px-3 py-2">{h.formats.join(', ')}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{h.dims}</td>
                  <td className="px-3 py-2">{h.fps}</td>
                  <td className="px-3 py-2">{fmtBytes(h.sizeBytes)}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate">{projects.find((p) => p.id === h.projectId)?.title ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{timeAgo(h.at)}</td>
                  <td className="px-3 py-2 text-slate-500 max-w-[220px] truncate" title={h.note}>{h.note}</td>
                </tr>
              ))}
              {!history.length && <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">No exports yet.</td></tr>}
            </tbody>
          </table>
          {history.length > 0 && <div className="p-2 border-t border-white/[0.05]"><button className="btn-ghost h-7 text-[12px]" onClick={() => mutate((d) => { d.exportHistory = []; })}><Trash2 size={12} />Clear history</button></div>}
        </div>
      )}
      <ExportDialog open={!!src} source={src} initialTab={tab} onClose={() => setSrc(null)} />
    </div>
  );
}
