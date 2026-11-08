import { Clapperboard, FileArchive, FolderOpen, LayoutDashboard, Library as LibIcon, Menu, PanelLeftClose, PanelLeftOpen, PenTool, PersonStanding, Settings as Cog, Wand2 } from 'lucide-react';
import React, { useEffect } from 'react';
import { CharacterStudio } from './pages/CharacterStudio';
import { Dashboard } from './pages/Dashboard';
import { ExportCenter } from './pages/ExportCenter';
import { IllustrationStudio } from './pages/IllustrationStudio';
import { Library } from './pages/Library';
import { MotionStudio } from './pages/MotionStudio';
import { Projects } from './pages/Projects';
import { SceneBuilder } from './pages/SceneBuilder';
import { Settings } from './pages/Settings';
import { type Page, resolveTarget, useStore } from './store/store';
import { cx } from './ui/kit';

const NAV: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'scene', label: 'Scene Builder', icon: <Clapperboard size={18} /> },
  { id: 'character', label: 'Character Studio', icon: <PersonStanding size={18} /> },
  { id: 'illustration', label: 'Illustration Studio', icon: <PenTool size={18} /> },
  { id: 'motion', label: 'Motion Design Studio', icon: <Wand2 size={18} /> },
  { id: 'library', label: 'Animation Library', icon: <LibIcon size={18} /> },
  { id: 'projects', label: 'Project Library', icon: <FolderOpen size={18} /> },
  { id: 'export', label: 'Export Center', icon: <FileArchive size={18} /> },
  { id: 'settings', label: 'Settings', icon: <Cog size={18} /> },
];

function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
  return m ? `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}` : '155 92 255';
}

export default function App() {
  const page = useStore((s) => s.ui.page);
  const collapsed = useStore((s) => s.ui.sidebarCollapsed);
  const settings = useStore((s) => s.settings);
  const hydrated = useStore((s) => s.hydrated);
  const toast = useStore((s) => s.ui.toast);
  const ui$ = useStore((s) => s.ui$);
  const target = useStore((s) => s.ui.target);
  const [mobileNav, setMobileNav] = React.useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', hexToRgb(settings.accent));
    document.documentElement.style.setProperty('--glow', String(settings.glow));
    document.documentElement.classList.toggle('reduce-motion', settings.reduceMotion);
  }, [settings.accent, settings.glow, settings.reduceMotion]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => ui$({ toast: null }), 2800);
    return () => clearTimeout(id);
  }, [toast?.id]);

  // stale persisted target (deleted scene) → clear
  useEffect(() => {
    if (hydrated && target && !resolveTarget(useStore.getState(), target)) ui$({ target: null });
  }, [hydrated]);

  if (!hydrated) return <div className="h-full flex items-center justify-center text-slate-500">Loading studio…</div>;

  const go = (p: Page) => { ui$({ page: p, playing: false }); setMobileNav(false); };
  const body = {
    dashboard: <Dashboard />, scene: <SceneBuilder />, character: <CharacterStudio />, illustration: <IllustrationStudio />, motion: <MotionStudio />,
    library: <Library />, projects: <Projects />, export: <ExportCenter />, settings: <Settings />,
  }[page];

  const sidebar = (
    <nav className={cx('flex flex-col h-full bg-ink-950 border-r border-white/[0.06] transition-all duration-200', collapsed ? 'w-[60px]' : 'w-[220px]')}>
      <div className="flex items-center gap-2.5 px-3 h-14 border-b border-white/[0.06]">
        <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-accent to-fuchsia-500 flex items-center justify-center shadow-glow">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round"><path d="M4 18 L9 8 L13 14 L16 9 L20 18" /><circle cx="16" cy="5" r="1.6" fill="white" /></svg>
        </div>
        {!collapsed && <div className="min-w-0"><div className="font-bold text-[14px] leading-tight">Motion Studio</div><div className="text-[10px] text-slate-500">Scene animation suite</div></div>}
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {NAV.map((n) => (
          <button key={n.id} title={collapsed ? n.label : undefined} onClick={() => go(n.id)}
            className={cx('w-full flex items-center gap-3 rounded-lg h-9 transition-all text-[13px]', collapsed ? 'justify-center' : 'px-3',
              page === n.id ? 'bg-accent/15 text-white accent-ring' : 'text-slate-400 hover:text-white hover:bg-white/[0.05]')}>
            <span className={cx(page === n.id && 'text-accent')}>{n.icon}</span>{!collapsed && <span className="truncate">{n.label}</span>}
          </button>
        ))}
      </div>
      <button className="hidden md:flex items-center justify-center h-10 border-t border-white/[0.06] text-slate-500 hover:text-white" onClick={() => ui$({ sidebarCollapsed: !collapsed })} title="Collapse sidebar">
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </nav>
  );

  return (
    <div className="flex h-full">
      <div className="hidden md:block shrink-0">{sidebar}</div>
      {mobileNav && <div className="md:hidden fixed inset-0 z-50 flex"><div onClick={() => setMobileNav(false)} className="absolute inset-0 bg-black/60" /><div className="relative">{sidebar}</div></div>}
      <main className="flex-1 min-w-0 flex flex-col h-full">
        <div className="md:hidden flex items-center gap-2 h-11 px-2 border-b border-white/[0.06]">
          <button className="icon-btn" onClick={() => setMobileNav(true)} aria-label="Menu"><Menu size={18} /></button>
          <span className="font-semibold text-[14px]">{NAV.find((n) => n.id === page)?.label}</span>
        </div>
        <div key={page} className="flex-1 min-h-0 fade-up">{body}</div>
      </main>
      {toast && (
        <div className={cx('fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg text-[13px] shadow-2xl fade-up border', toast.tone === 'err' ? 'bg-rose-950 border-rose-500/40 text-rose-100' : toast.tone === 'info' ? 'bg-ink-800 border-white/10' : 'bg-ink-800 border-accent/40 text-white shadow-glow')}>{toast.text}</div>
      )}
    </div>
  );
}
