import { Check, ClipboardCopy, Download, FileArchive, FileText, Image as ImageIcon, Loader2, RefreshCw, Sparkles, Video, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { FormatDef, Scene } from '../engine/schema';
import { renderPNG } from '../export/frames';
import { buildPackage } from '../export/package';
import { buildPrompt } from '../export/prompt';
import { downloadBlob, exportGIF, exportMP4, exportPNGSequence, exportTransparentWebM, slug } from '../export/video';
import { actions, type ExportRecord, findPreset, selectAssets, useStore } from '../store/store';
import { cx, Modal, Num, Select, Tabs, Toggle } from './kit';
import { SceneThumb } from './Thumb';

export interface ExportSource {
  title: string;
  kind: ExportRecord['kind'];
  scenes: Scene[];
  formats: FormatDef[];
  onlyElementIds?: string[];
  presetId?: string;
  projectId?: string;
}

type FileType = 'package' | 'mp4' | 'gif' | 'png' | 'webm' | 'still' | 'prompt';

const TYPES: { id: FileType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'package', label: 'Claude package (ZIP)', icon: <FileArchive size={16} />, desc: 'Prompts + reference video + assets + keyframes + Remotion project' },
  { id: 'mp4', label: 'MP4 video', icon: <Video size={16} />, desc: 'Frame-exact H.264 reference' },
  { id: 'gif', label: 'Animated GIF', icon: <ImageIcon size={16} />, desc: 'Lightweight looping reference' },
  { id: 'png', label: 'PNG sequence (ZIP)', icon: <ImageIcon size={16} />, desc: 'Lossless frames, optional alpha' },
  { id: 'webm', label: 'Transparent video', icon: <Video size={16} />, desc: 'WebM VP9 with alpha channel' },
  { id: 'still', label: 'PNG still', icon: <ImageIcon size={16} />, desc: 'Current playhead frame' },
  { id: 'prompt', label: 'Claude prompt only', icon: <FileText size={16} />, desc: 'Editable replication prompt (MD / TXT)' },
];

export function ExportDialog({ source, open, onClose, initialTab = 'export' }: { source: ExportSource | null; open: boolean; onClose: () => void; initialTab?: 'export' | 'prompt' }) {
  const settings = useStore((s) => s.settings);
  const playhead = useStore((s) => s.ui.time);
  const [tab, setTab] = useState<'export' | 'prompt'>(initialTab);
  const [type, setType] = useState<FileType>('package');
  const [fmtIds, setFmtIds] = useState<string[]>([]);
  const [fps, setFps] = useState(30);
  const [transparent, setTransparent] = useState(false);
  const [gifW, setGifW] = useState(settings.gifMaxWidth);
  const [inc, setInc] = useState({ mp4: true, gif: true, webmAlpha: false, pngFrames: false, remotion: true, snapshots: true });
  const [prompts, setPrompts] = useState<Record<string, string>>({});
  const [promptFmt, setPromptFmt] = useState('');
  const [busy, setBusy] = useState<{ p: number; label: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || !source) return;
    setTab(initialTab);
    setFmtIds(source.formats.slice(0, 2).map((f) => f.id));
    setFps(source.scenes[0]?.fps ?? settings.defaultFps);
    setTransparent(!!source.onlyElementIds);
    setPrompts({});
    setPromptFmt(source.formats[0]?.id ?? '');
    setDone(null);
  }, [open, source]);

  const genPrompt = (f: FormatDef) => {
    const st = useStore.getState();
    return buildPrompt({ title: source!.title, scenes: source!.scenes, assets: selectAssets(st), format: f, fps, preset: findPreset(st, source!.presetId), onlyElementIds: source!.onlyElementIds, referenceFiles: [`${slug(source!.title)}-${f.width > f.height ? '16x9' : '9x16'}.mp4`] });
  };

  const promptText = useMemo(() => {
    if (!source || !promptFmt) return '';
    const f = source.formats.find((x) => x.id === promptFmt);
    if (!f) return '';
    return prompts[promptFmt] ?? genPrompt(f);
  }, [source, promptFmt, prompts, fps, tab]);

  if (!source) return null;
  const formats = source.formats.filter((f) => fmtIds.includes(f.id));
  const total = source.scenes.reduce((s, x) => s + x.duration, 0);
  const base = slug(source.title);
  const tag = (f: FormatDef) => (f.width > f.height ? '16x9' : f.width < f.height ? '9x16' : `${f.width}x${f.height}`);

  const run = async () => {
    if (!formats.length) return;
    const st = useStore.getState();
    const assets = selectAssets(st);
    const ctrl = new AbortController();
    abort.current = ctrl;
    setDone(null);
    const src = { scenes: source.scenes, onlyElementIds: source.onlyElementIds };
    let bytes = 0;
    let note = '';
    try {
      if (type === 'package') {
        setBusy({ p: 0, label: 'Preparing' });
        const edited: Record<string, string> = {};
        formats.forEach((f) => { if (prompts[f.id]) edited[f.id] = prompts[f.id]; });
        const blob = await buildPackage({ title: source.title, src, assets, formats, fps, preset: findPreset(st, source.presetId), include: inc, gifMaxWidth: gifW, prompts: edited, signal: ctrl.signal, onProgress: (p, label) => setBusy({ p, label: label ?? '' }) });
        bytes = blob.size;
        downloadBlob(blob, `${base}-claude-package.zip`);
      } else if (type === 'prompt') {
        for (const f of formats) {
          const text = prompts[f.id] ?? genPrompt(f);
          downloadBlob(new Blob([text], { type: 'text/markdown' }), `${base}-claude-prompt-${tag(f)}.md`);
          bytes += text.length;
        }
      } else {
        for (let i = 0; i < formats.length; i++) {
          const f = formats[i];
          const job = { src, assets, format: f, fps, signal: ctrl.signal, onProgress: (p: number, l?: string) => setBusy({ p: (i + p) / formats.length, label: `${tag(f)} · ${l ?? ''}` }) };
          setBusy({ p: i / formats.length, label: `Rendering ${tag(f)}` });
          if (type === 'still') {
            const b = await renderPNG(src, assets, f, Math.min(playhead, total), transparent);
            bytes += b.size; downloadBlob(b, `${base}-${tag(f)}-t${playhead.toFixed(2)}.png`);
          } else {
            const r = type === 'mp4' ? await exportMP4(job) : type === 'gif' ? await exportGIF(job, gifW, transparent) : type === 'webm' ? await exportTransparentWebM(job) : await exportPNGSequence(job, transparent);
            bytes += r.blob.size; note = r.note ?? '';
            downloadBlob(r.blob, `${base}-${tag(f)}${type === 'webm' ? '-transparent' : type === 'png' ? '-frames' : ''}.${r.ext}`);
          }
        }
      }
      actions.logExport({ label: source.title, kind: type === 'package' ? 'package' : type === 'prompt' ? 'prompt' : source.kind, fileType: TYPES.find((t) => t.id === type)!.label, formats: formats.map((f) => f.name), dims: formats.map((f) => `${f.width}×${f.height}`).join(', '), fps, status: 'done', sizeBytes: bytes, projectId: source.projectId, note });
      setDone(`Exported ${formats.length} format${formats.length > 1 ? 's' : ''}${note ? ` · ${note}` : ''}`);
      st.toast('Export complete');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if ((e as DOMException)?.name !== 'AbortError') {
        actions.logExport({ label: source.title, kind: source.kind, fileType: type, formats: formats.map((f) => f.name), dims: '', fps, status: 'failed', projectId: source.projectId, note: msg });
        st.toast(`Export failed: ${msg}`, 'err');
      }
      setDone(null);
    } finally {
      setBusy(null);
      abort.current = null;
    }
  };

  const copy = async () => { await navigator.clipboard.writeText(promptText); useStore.getState().toast('Prompt copied'); };

  return (
    <Modal open={open} onClose={() => { if (!busy) onClose(); }} wide="xl" title={<span className="flex items-center gap-2"><Sparkles size={16} className="text-accent" />Export · {source.title}</span>}>
      <div className="grid lg:grid-cols-[300px_1fr] gap-5">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {source.formats.map((f) => <SceneThumb key={f.id} scenes={source.scenes} format={f} autoplay={open} transparent={!!source.onlyElementIds} className="max-h-48 mx-auto" />)}
          </div>
          <div className="text-[12px] text-slate-400 space-y-1">
            <div>{source.scenes.length} scene{source.scenes.length > 1 ? 's' : ''} · {total.toFixed(2)} s · {Math.round(total * fps)} frames @ {fps} fps</div>
            {source.onlyElementIds && <div className="text-amber-300">Isolated element export (transparent background)</div>}
          </div>
          <div>
            <div className="label mb-1.5">Compositions</div>
            {source.formats.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-[13px] py-1 cursor-pointer">
                <input type="checkbox" checked={fmtIds.includes(f.id)} onChange={(e) => setFmtIds(e.target.checked ? [...fmtIds, f.id] : fmtIds.filter((x) => x !== f.id))} />
                {f.name} <span className="text-slate-500">{f.width}×{f.height}</span>
              </label>
            ))}
          </div>
          <Select label="Frame rate" value={String(fps)} options={['24', '30', '60']} onChange={(v) => setFps(+v)} />
        </div>

        <div className="min-w-0">
          <Tabs value={tab} onChange={setTab} className="mb-3" tabs={[{ value: 'export', label: 'Export files' }, { value: 'prompt', label: 'Claude replication prompt' }]} />
          {tab === 'export' ? (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-2">
                {TYPES.map((t) => (
                  <button key={t.id} onClick={() => setType(t.id)} className={cx('text-left rounded-xl p-3 border transition-all', type === t.id ? 'border-accent bg-accent/10 shadow-glow' : 'border-white/[0.07] hover:border-white/20 bg-white/[0.02]')}>
                    <div className="flex items-center gap-2 text-[13px] font-medium"><span className="text-accent">{t.icon}</span>{t.label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{t.desc}</div>
                  </button>
                ))}
              </div>
              {type === 'package' && (
                <div className="panel p-3 grid sm:grid-cols-2 gap-2">
                  <Toggle small label="MP4 reference" value={inc.mp4} onChange={(v) => setInc({ ...inc, mp4: v })} />
                  <Toggle small label="GIF reference" value={inc.gif} onChange={(v) => setInc({ ...inc, gif: v })} />
                  <Toggle small label="Transparent video" value={inc.webmAlpha} onChange={(v) => setInc({ ...inc, webmAlpha: v })} />
                  <Toggle small label="PNG frame sequence" value={inc.pngFrames} onChange={(v) => setInc({ ...inc, pngFrames: v })} />
                  <Toggle small label="Remotion project + engine" value={inc.remotion} onChange={(v) => setInc({ ...inc, remotion: v })} />
                  <Toggle small label="Key-moment SVG snapshots" value={inc.snapshots} onChange={(v) => setInc({ ...inc, snapshots: v })} />
                  <div className="sm:col-span-2 text-[11px] text-slate-500">Always included: per-format prompts (.md + .txt), scene.json, keyframes.json, timing.json, layers.json, metadata, style preset, illustration SVGs, character sheets &amp; references.</div>
                </div>
              )}
              {(type === 'gif' || type === 'package') && <Num label="GIF max width" suffix="px" step={10} min={120} max={1920} value={gifW} onChange={setGifW} />}
              {(type === 'gif' || type === 'png' || type === 'still') && <Toggle small label="Transparent background" value={transparent} onChange={setTransparent} />}
              {type === 'webm' && <p className="text-[12px] text-slate-400">Uses WebCodecs VP9 alpha where the browser supports it; otherwise records in real time with MediaRecorder. For guaranteed alpha, use the PNG sequence.</p>}
              {busy ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12px] text-slate-300"><span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{busy.label}</span><span>{Math.round(busy.p * 100)}%</span></div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-accent shadow-glow transition-all" style={{ width: `${busy.p * 100}%` }} /></div>
                  <button className="btn-danger" onClick={() => abort.current?.abort()}><X size={14} />Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button className="btn-primary h-10 px-5" disabled={!formats.length} onClick={run}><Download size={16} />Export {formats.length > 1 ? `${formats.length} formats` : ''}</button>
                  {done && <span className="text-[12px] text-emerald-300 flex items-center gap-1"><Check size={14} />{done}</span>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Tabs value={promptFmt} onChange={setPromptFmt} tabs={source.formats.map((f) => ({ value: f.id, label: `${f.name}` }))} />
                <div className="flex-1" />
                <button className="btn-soft" onClick={() => setPrompts((p) => { const n = { ...p }; delete n[promptFmt]; return n; })}><RefreshCw size={13} />Regenerate</button>
                <button className="btn-soft" onClick={copy}><ClipboardCopy size={13} />Copy</button>
                <button className="btn-soft" onClick={() => downloadBlob(new Blob([promptText], { type: 'text/markdown' }), `${base}-claude-prompt-${promptFmt}.md`)}>.md</button>
                <button className="btn-soft" onClick={() => downloadBlob(new Blob([promptText], { type: 'text/plain' }), `${base}-claude-prompt-${promptFmt}.txt`)}>.txt</button>
              </div>
              <textarea className="input h-[55vh] font-mono text-[11.5px] leading-relaxed py-2 resize-none" value={promptText} spellCheck={false}
                onChange={(e) => setPrompts({ ...prompts, [promptFmt]: e.target.value })} />
              <div className="text-[11px] text-slate-500">{prompts[promptFmt] ? 'Edited — your version is used in downloads and the package.' : 'Auto-generated from the animation data. Edit freely; edits are used in the package.'} {promptText.length.toLocaleString()} chars.</div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
