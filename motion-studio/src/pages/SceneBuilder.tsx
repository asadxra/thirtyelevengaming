import { ArrowDown, ArrowUp, BookmarkPlus, Copy, FolderOpen, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { cloneScene, newScene, uid } from '../lib/factory';
import { actions, findPreset, useStore } from '../store/store';
import { confirmAction, cx, Empty, Select, usePrompt } from '../ui/kit';
import { SceneThumb } from '../ui/Thumb';
import { Editor } from './editor/Editor';

export function SceneBuilder() {
  const projects = useStore((s) => s.projects);
  const templates = useStore((s) => s.templates);
  const ui = useStore((s) => s.ui);
  const ui$ = useStore((s) => s.ui$);
  const mutate = useStore((s) => s.mutate);
  const toast = useStore((s) => s.toast);
  const [listOpen, setListOpen] = useState(window.innerWidth > 900);
  const { ask, node } = usePrompt();

  const projectId = ui.target?.kind === 'scene' ? ui.target.projectId : ui.activeProjectId ?? projects[0]?.id;
  const project = projects.find((p) => p.id === projectId) ?? projects[0];

  // make sure a scene of the project is open
  useEffect(() => {
    if (!project) return;
    const t = ui.target;
    const ok = t?.kind === 'scene' && t.projectId === project.id && project.scenes.some((s) => s.id === t.sceneId);
    if (!ok && project.scenes[0]) actions.openScene(project.id, project.scenes[0].id);
  }, [project?.id, project?.scenes.length, ui.target]);

  if (!project) {
    return <Empty icon={<FolderOpen size={36} />} title="No projects yet" text="Create a project to start building scenes." action={<button className="btn-primary" onClick={() => { const p = actions.newProject(); actions.openScene(p.id, p.scenes[0].id); }}><Plus size={14} />New project</button>} />;
  }
  const activeId = ui.target?.kind === 'scene' ? ui.target.sceneId : null;
  const preset = findPreset(useStore.getState(), project.presetId);
  const fmt = project.formats.find((f) => f.id === ui.formatId) ?? project.formats[0];

  const addScene = (fromTemplate?: string) => {
    const tpl = templates.find((t) => t.id === fromTemplate);
    const sc = tpl ? cloneScene(tpl.scene, `${tpl.name} ${project.scenes.length + 1}`) : newScene(`Scene ${project.scenes.length + 1}`, preset, useStore.getState().settings.defaultFps);
    mutate((d) => { d.projects.find((p) => p.id === project.id)!.scenes.push(sc); });
    actions.openScene(project.id, sc.id);
  };
  const sceneOp = (fn: (scenes: typeof project.scenes) => void) => mutate((d) => { const p = d.projects.find((x) => x.id === project.id)!; fn(p.scenes as typeof project.scenes); p.updatedAt = Date.now(); });

  const list = (
    <div className="w-[230px] shrink-0 border-r border-white/[0.06] bg-ink-900/70 flex flex-col min-h-0 max-md:absolute max-md:z-40 max-md:h-full max-md:shadow-2xl">
      <div className="p-2 space-y-2 border-b border-white/[0.06]">
        <Select value={project.id} options={projects.map((p) => ({ value: p.id, label: p.title }))} onChange={(v) => { const p = projects.find((x) => x.id === v)!; ui$({ activeProjectId: v }); if (p.scenes[0]) actions.openScene(v, p.scenes[0].id); }} />
        <div className="flex gap-1">
          <button className="btn-primary h-7 flex-1 text-[12px]" onClick={() => addScene()}><Plus size={13} />Scene</button>
          <select className="input h-7 flex-1 text-[12px]" value="" onChange={(e) => e.target.value && addScene(e.target.value)}>
            <option value="">From template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {project.scenes.map((sc, i) => (
          <div key={sc.id} className={cx('group rounded-lg p-1.5 border cursor-pointer transition-all', sc.id === activeId ? 'border-accent bg-accent/10 shadow-glow' : 'border-white/[0.06] hover:border-white/20')} onClick={() => actions.openScene(project.id, sc.id)}>
            <SceneThumb scene={sc} format={fmt} className="w-full" />
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-[10px] text-slate-500 w-4">{i + 1}</span>
              <span className="text-[12px] truncate flex-1">{sc.name}</span>
              <span className="text-[10px] text-slate-500">{sc.duration}s</span>
            </div>
            <div className="flex gap-0.5 mt-1 opacity-60 group-hover:opacity-100">
              <button className="icon-btn w-6 h-6" title="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); sceneOp((s) => { [s[i - 1], s[i]] = [s[i], s[i - 1]]; }); }}><ArrowUp size={12} /></button>
              <button className="icon-btn w-6 h-6" title="Move down" disabled={i === project.scenes.length - 1} onClick={(e) => { e.stopPropagation(); sceneOp((s) => { [s[i + 1], s[i]] = [s[i], s[i + 1]]; }); }}><ArrowDown size={12} /></button>
              <button className="icon-btn w-6 h-6" title="Duplicate" onClick={(e) => { e.stopPropagation(); const c = cloneScene(sc, `${sc.name} copy`); sceneOp((s) => { s.splice(i + 1, 0, c); }); actions.openScene(project.id, c.id); }}><Copy size={12} /></button>
              <button className="icon-btn w-6 h-6" title="Save as reusable template" onClick={async (e) => { e.stopPropagation(); const name = await ask('Template name', sc.name); if (!name) return; mutate((d) => { d.templates.unshift({ id: uid('tp_'), name, scene: cloneScene(sc, name), createdAt: Date.now() }); }); toast('Saved as template'); }}><BookmarkPlus size={12} /></button>
              <div className="flex-1" />
              <button className="icon-btn w-6 h-6 hover:text-rose-300" title="Delete scene" disabled={project.scenes.length <= 1} onClick={(e) => { e.stopPropagation(); if (confirmAction(`Delete scene “${sc.name}”?`)) sceneOp((s) => { s.splice(i, 1); }); }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 text-[11px] text-slate-500 border-t border-white/[0.06]">{project.scenes.length} scenes · {project.scenes.reduce((s, x) => s + x.duration, 0).toFixed(1)}s total</div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 relative">
      {listOpen && list}
      <div className="flex-1 min-w-0">
        <Editor mode="scene" sideHeader={<button className="icon-btn" title="Toggle scene list" onClick={() => setListOpen(!listOpen)}>{listOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}</button>} />
      </div>
      {node}
    </div>
  );
}
