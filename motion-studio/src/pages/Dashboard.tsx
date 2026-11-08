import { Clapperboard, FileArchive, FolderOpen, Library, PenTool, Plus, Sparkles, UserPlus, Wand2 } from 'lucide-react';
import React from 'react';
import { BackgroundView } from '../engine/render';
import { actions, allIllustrations, allPresets, useStore } from '../store/store';
import { timeAgo } from '../ui/kit';
import { SceneThumb } from '../ui/Thumb';

export function Dashboard() {
  const s = useStore();
  const presets = allPresets(s);
  const sceneCount = s.projects.reduce((n, p) => n + p.scenes.length, 0);
  const stats = [
    ['Projects', s.projects.length], ['Scenes', sceneCount], ['Characters', s.characters.length], ['Illustrations', allIllustrations(s).length], ['Motion clips', s.clips.length], ['Exports', s.exportHistory.length],
  ] as const;
  const recent = [...s.projects].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  const quick = [
    { icon: <Plus size={18} />, label: 'New project', desc: 'Start an explainer', go: () => { const p = actions.newProject(); actions.openScene(p.id, p.scenes[0].id); } },
    { icon: <Clapperboard size={18} />, label: 'Scene Builder', desc: 'Compose scenes', go: () => actions.go('scene') },
    { icon: <UserPlus size={18} />, label: 'New character', desc: 'Reusable cast', go: () => actions.newCharacter() },
    { icon: <PenTool size={18} />, label: 'Illustration', desc: 'Vector artwork', go: () => actions.go('illustration') },
    { icon: <Wand2 size={18} />, label: 'Motion Design', desc: 'Kinetic & data', go: () => actions.go('motion') },
    { icon: <FileArchive size={18} />, label: 'Export Center', desc: 'Claude packages', go: () => actions.go('export') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(800px 300px at 15% 0%, rgb(var(--accent) / 0.35), transparent 70%), radial-gradient(600px 300px at 90% 100%, rgba(34,211,238,0.15), transparent 70%)' }} />
        <div className="relative p-6 sm:p-8 max-w-6xl">
          <div className="chip mb-3 bg-accent/15 text-accent"><Sparkles size={12} />Scene Animation &amp; Motion Design Studio</div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight glow-text">Design your visual language,<br className="hidden sm:block" /> one animation at a time.</h1>
          <p className="text-slate-400 mt-3 max-w-2xl">Build characters, illustrations and motion graphics for YouTube explainers in both 16:9 and 9:16 — then export each piece with a frame-exact Claude replication package for Claude Code + Remotion.</p>
          <div className="flex flex-wrap gap-2 mt-5">
            <button className="btn-primary h-10 px-5" onClick={() => actions.go('scene')}><Clapperboard size={16} />Open Scene Builder</button>
            <button className="btn-soft h-10 px-5" onClick={() => actions.go('library')}><Library size={16} />Browse library</button>
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-6 max-w-[1600px]">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {stats.map(([l, v]) => <div key={l} className="panel p-4"><div className="text-2xl font-bold">{v}</div><div className="text-[12px] text-slate-400">{l}</div></div>)}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quick.map((q) => (
            <button key={q.label} onClick={q.go} className="card p-4 text-left group">
              <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center mb-3 group-hover:shadow-glow">{q.icon}</div>
              <div className="font-medium text-[14px]">{q.label}</div>
              <div className="text-[12px] text-slate-500">{q.desc}</div>
            </button>
          ))}
        </div>
        <div>
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Recent projects</h2><button className="btn-ghost h-7 text-[12px]" onClick={() => actions.go('projects')}><FolderOpen size={13} />All projects</button></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((p) => (
              <button key={p.id} className="card overflow-hidden text-left" onClick={() => actions.openScene(p.id, p.scenes[0].id)}>
                <SceneThumb scenes={p.scenes} format={p.formats[0]} className="rounded-none" />
                <div className="p-3"><div className="font-medium truncate">{p.title}</div><div className="text-[12px] text-slate-500">{p.scenes.length} scenes · edited {timeAgo(p.updatedAt)}</div></div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">Animation style presets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {presets.map((p) => (
              <button key={p.id} className="card overflow-hidden text-left" onClick={() => actions.go('settings')}>
                <svg viewBox="0 0 1920 1080" className="w-full block aspect-video"><BackgroundView bg={p.background} W={1920} H={1080} t={0} id={`dp-${p.id}`} />
                  <text x={960} y={600} textAnchor="middle" fontFamily={p.typography.fontFamily} fontWeight={p.typography.headingWeight} fontSize={200} fill={p.palette.text}>Aa</text>
                  {[p.palette.primary, p.palette.secondary, p.palette.accent].map((c, i) => <circle key={i} cx={760 + i * 200} cy={850} r={60} fill={c} />)}
                </svg>
                <div className="p-2"><div className="text-[12px] font-medium truncate">{p.name}</div><div className="text-[10px] text-slate-500 truncate">{p.characterStyle} · {p.animation.in.type}</div></div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
