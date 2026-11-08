import { Copy, Download, FileUp, FolderOpen, Monitor, Plus, Smartphone, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { downloadBlob, slug } from '../export/video';
import { cloneScene, syncAutoLayouts, uid } from '../lib/factory';
import { actions, allIllustrations, allPresets, type Project, selectAssets, useStore } from '../store/store';
import { confirmAction, Empty, Modal, Num, PageHeader, Select, Text, timeAgo } from '../ui/kit';
import { SceneThumb } from '../ui/Thumb';

export function Projects() {
  const projects = useStore((s) => s.projects);
  const characters = useStore((s) => s.characters);
  const mutate = useStore((s) => s.mutate);
  const toast = useStore((s) => s.toast);
  const [edit, setEdit] = useState<Project | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', formatId: 'landscape', presetId: useStore.getState().settings.defaultPresetId });
  const presets = allPresets(useStore.getState());

  const create = () => {
    const p = actions.newProject(draft.title || 'Untitled Explainer');
    const preset = presets.find((x) => x.id === draft.presetId);
    mutate((d) => { const x = d.projects.find((y) => y.id === p.id)!; x.description = draft.description; x.formatId = draft.formatId; x.presetId = draft.presetId; if (preset) { x.scenes[0].background = structuredClone(preset.background); x.scenes[0].presetId = preset.id; x.scenes[0].transitionIn = structuredClone(preset.transition); } }, false);
    useStore.getState().ui$({ formatId: draft.formatId });
    setCreating(false);
    actions.openScene(p.id, p.scenes[0].id);
  };

  const importProject = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const p: Project = data.project ?? data;
      if (!p?.scenes) throw new Error('Not a project file');
      const fresh: Project = { ...p, id: uid('pr_'), title: `${p.title} (imported)`, scenes: p.scenes.map((s) => cloneScene(s, s.name)), createdAt: Date.now(), updatedAt: Date.now(), exportHistory: [] };
      mutate((d) => {
        d.projects.unshift(fresh);
        (data.characters ?? []).forEach((c: any) => { if (!d.characters.some((x) => x.id === c.id)) d.characters.push(c); });
        (data.illustrations ?? []).forEach((c: any) => { if (!d.illustrations.some((x) => x.id === c.id)) d.illustrations.push(c); });
      });
      toast('Project imported');
    } catch (e) { toast(`Import failed: ${(e as Error).message}`, 'err'); }
  };

  const exportProject = (p: Project) => {
    const st = useStore.getState();
    const charIds = new Set<string>(), illIds = new Set<string>();
    p.scenes.forEach((s) => s.elements.forEach((e) => { if (e.type === 'character') charIds.add(e.props.characterId); if (e.type === 'illustration') illIds.add(e.props.illustrationId); }));
    const data = { schema: 'motion-studio/project@1', project: p, characters: st.characters.filter((c) => charIds.has(c.id)), illustrations: st.illustrations.filter((i) => illIds.has(i.id)), poses: st.poses, movements: st.movements };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${slug(p.title)}.motionstudio.json`);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <PageHeader icon={<FolderOpen size={20} />} title="Project Library" subtitle="Each project is one explainer video: its scenes, style preset, formats and export history."
        actions={<>
          <label className="btn-soft cursor-pointer"><FileUp size={14} />Import<input type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importProject(f); e.target.value = ''; }} /></label>
          <button className="btn-primary" onClick={() => { setDraft({ ...draft, title: '' }); setCreating(true); }}><Plus size={14} />New project</button>
        </>} />
      {projects.length === 0 ? <Empty icon={<FolderOpen size={36} />} title="No projects" action={<button className="btn-primary" onClick={() => setCreating(true)}>Create one</button>} /> : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const chars = new Set<string>(), ills = new Set<string>();
            let mg = 0;
            p.scenes.forEach((s) => s.elements.forEach((e) => { if (e.type === 'character') chars.add(e.props.characterId); if (e.type === 'illustration') ills.add(e.props.illustrationId); if (['text', 'counter', 'chart', 'arrow', 'fx'].includes(e.type)) mg++; }));
            const fmt = p.formats.find((f) => f.id === p.formatId) ?? p.formats[0];
            const preset = presets.find((x) => x.id === p.presetId);
            return (
              <div key={p.id} className="card overflow-hidden flex flex-col">
                <div className="cursor-pointer" onClick={() => actions.openScene(p.id, p.scenes[0].id)}>
                  <SceneThumb scenes={p.scenes} format={p.formats[0]} className="rounded-none" />
                </div>
                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div>
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-[12px] text-slate-400 line-clamp-2 min-h-[2.4em]">{p.description || 'No description'}</div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="chip">{fmt.id === 'shorts' ? <Smartphone size={11} /> : <Monitor size={11} />}{fmt.name}</span>
                    <span className="chip">{preset?.name ?? 'No preset'}</span>
                    <span className="chip">{p.scenes.length} scenes</span>
                    <span className="chip">{chars.size} characters</span>
                    <span className="chip">{ills.size} illustrations</span>
                    <span className="chip">{mg} motion layers</span>
                    <span className="chip">{p.exportHistory.length} exports</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Edited {timeAgo(p.updatedAt)} · {characters.filter((c) => chars.has(c.id)).map((c) => c.name.split('—')[0].trim()).join(', ') || 'no characters'}</div>
                  <div className="flex gap-1 mt-auto">
                    <button className="btn-primary h-7 text-[12px]" onClick={() => actions.openScene(p.id, p.scenes[0].id)}>Open</button>
                    <button className="btn-soft h-7 text-[12px]" onClick={() => setEdit(structuredClone(p))}>Details</button>
                    <div className="flex-1" />
                    <button className="icon-btn" title="Download project file (.json)" onClick={() => exportProject(p)}><Download size={14} /></button>
                    <button className="icon-btn" title="Duplicate" onClick={() => mutate((d) => { d.projects.unshift({ ...structuredClone(p), id: uid('pr_'), title: `${p.title} copy`, scenes: p.scenes.map((s) => cloneScene(s, s.name)), exportHistory: [], createdAt: Date.now(), updatedAt: Date.now() }); })}><Copy size={14} /></button>
                    <button className="icon-btn hover:text-rose-300" title="Delete" onClick={() => { if (confirmAction(`Delete project “${p.title}”? This cannot be undone after reload.`)) mutate((d) => { d.projects = d.projects.filter((x) => x.id !== p.id); }); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New explainer project" footer={<><button className="btn-ghost" onClick={() => setCreating(false)}>Cancel</button><button className="btn-primary" onClick={create}>Create &amp; open</button></>}>
        <div className="space-y-3">
          <Text label="Title" value={draft.title} placeholder="e.g. How inflation eats your savings" onChange={(v) => setDraft({ ...draft, title: v })} />
          <Text multiline label="Description" value={draft.description} onChange={(v) => setDraft({ ...draft, description: v })} />
          <Select label="Primary video format" value={draft.formatId} options={[{ value: 'landscape', label: 'Landscape 16:9 (1920×1080)' }, { value: 'shorts', label: 'YouTube Shorts 9:16 (1080×1920)' }]} onChange={(v) => setDraft({ ...draft, formatId: v })} />
          <Select label="Animation style preset" value={draft.presetId} options={presets.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => setDraft({ ...draft, presetId: v })} />
          <p className="text-[12px] text-slate-500">Both 16:9 and 9:16 compositions are always maintained; the primary format is just the default view.</p>
        </div>
      </Modal>

      <Modal open={!!edit} onClose={() => setEdit(null)} wide title="Project details" footer={<><button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" onClick={() => { mutate((d) => { const i = d.projects.findIndex((x) => x.id === edit!.id); if (i >= 0) { d.projects[i] = { ...edit!, updatedAt: Date.now() } as any; const assets = selectAssets(useStore.getState()); d.projects[i].scenes.forEach((sc) => sc.elements.forEach((el) => syncAutoLayouts(el as any, edit!.formats, 'landscape', assets))); } }); setEdit(null); }}>Save</button></>}>
        {edit && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
              <Text label="Title" value={edit.title} onChange={(v) => setEdit({ ...edit, title: v })} />
              <Text multiline label="Description" value={edit.description} onChange={(v) => setEdit({ ...edit, description: v })} />
              <Select label="Primary format" value={edit.formatId} options={edit.formats.map((f) => ({ value: f.id, label: f.name }))} onChange={(v) => setEdit({ ...edit, formatId: v })} />
              <Select label="Style preset" value={edit.presetId} options={presets.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => setEdit({ ...edit, presetId: v })} />
              <div>
                <div className="label mb-1">Compositions</div>
                {edit.formats.map((f, i) => (
                  <div key={f.id} className="grid grid-cols-[1fr_80px_80px_auto] gap-1 mb-1 items-center">
                    <input className="input h-7" value={f.name} onChange={(e) => { const fs = [...edit.formats]; fs[i] = { ...f, name: e.target.value }; setEdit({ ...edit, formats: fs }); }} />
                    <Num value={f.width} onChange={(v) => { const fs = [...edit.formats]; fs[i] = { ...f, width: Math.round(v) }; setEdit({ ...edit, formats: fs }); }} />
                    <Num value={f.height} onChange={(v) => { const fs = [...edit.formats]; fs[i] = { ...f, height: Math.round(v) }; setEdit({ ...edit, formats: fs }); }} />
                    <button className="icon-btn" disabled={f.id === 'landscape' || f.id === 'shorts'} onClick={() => setEdit({ ...edit, formats: edit.formats.filter((x) => x.id !== f.id) })}><Trash2 size={13} /></button>
                  </div>
                ))}
                <div className="flex gap-1 flex-wrap mt-1">
                  {[['Square 1:1', 1080, 1080], ['Portrait 4:5', 1080, 1350], ['4K 16:9', 3840, 2160], ['Custom', 1280, 720]].map(([n, w, h]) => (
                    <button key={n as string} className="btn-soft h-7 text-[12px]" onClick={() => setEdit({ ...edit, formats: [...edit.formats, { id: uid('fmt_'), name: n as string, width: w as number, height: h as number }] })}><Plus size={12} />{n}</button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">New compositions auto-adapt every layer (no stretching) and can then be adjusted independently.</p>
              </div>
            </div>
            <div>
              <div className="label mb-2">Export history</div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {edit.exportHistory.length === 0 && <div className="text-[12px] text-slate-500">No exports yet.</div>}
                {edit.exportHistory.map((r) => (
                  <div key={r.id} className="text-[12px] flex justify-between gap-2 border-b border-white/5 py-1">
                    <span className="truncate">{r.fileType} · {r.label}</span>
                    <span className={r.status === 'done' ? 'text-emerald-300' : 'text-rose-300'}>{r.status}</span>
                    <span className="text-slate-500 shrink-0">{timeAgo(r.at)}</span>
                  </div>
                ))}
              </div>
              <div className="label mt-4 mb-2">Assets used</div>
              <div className="text-[12px] text-slate-400">
                {(() => { const ids = new Set<string>(); edit.scenes.forEach((s) => s.elements.forEach((e) => { if (e.type === 'illustration') ids.add(e.props.illustrationId); })); return allIllustrations(useStore.getState()).filter((i) => ids.has(i.id)).map((i) => i.name).join(', ') || 'No illustrations'; })()}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
