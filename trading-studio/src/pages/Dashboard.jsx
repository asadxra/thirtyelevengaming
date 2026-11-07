import React from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { createProject } from '../lib/actions.js';
import { Button, Panel, Stat, Badge, Empty, timeAgo } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import CharacterRenderer from '../components/CharacterRenderer.jsx';
import { scriptStatus, generationStatus } from '../lib/status.js';

const ACT_ICON = { project: 'film', script: 'script', character: 'user', asset: 'folder', settings: 'settings', preset: 'layers' };

export default function Dashboard() {
  const store = useStore();
  const { projects, characters, activity } = store;
  const live = projects.filter((p) => !p.archived);
  const drafts = live.filter((p) => scriptStatus(p) === 'draft').length;
  const completed = live.filter((p) => scriptStatus(p) === 'completed').length;
  const ready = live.filter((p) => generationStatus(p, characters) === 'ready').length;
  const recent = [...live].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const main = characters.find((c) => c.id === store.settings?.defaults?.characterId) || characters[0];

  const newProject = async () => {
    try { await createProject(store); } catch (e) { store.toast(e.message, 'bad'); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Production overview</p>
          <h1>Studio Dashboard</h1>
          <p className="muted">Design your character, write the story, record the voice — generation only starts when you approve it.</p>
        </div>
        <div className="row gap-s wrap">
          <Button icon="upload" onClick={() => navigate('/assets')}>Upload asset</Button>
          <Button variant="primary" icon="plus" onClick={newProject}>New video project</Button>
        </div>
      </header>

      <div className="stats-grid">
        <Stat label="Total video projects" value={live.length} icon="film" onClick={() => navigate('/projects')} />
        <Stat label="Draft scripts" value={drafts} icon="edit" tone="warn" onClick={() => navigate('/projects?filter=drafts')} />
        <Stat label="Completed scripts" value={completed} icon="check" tone="ok" onClick={() => navigate('/projects?filter=scripts')} />
        <Stat label="Ready for generation" value={ready} icon="zap" tone="secondary" onClick={() => navigate('/projects?filter=ready')} />
        <Stat label="Characters" value={characters.length} icon="user" onClick={() => navigate('/characters')} />
      </div>

      <div className="dash-grid">
        <Panel title="Recent projects" subtitle="Your most recently edited videos" actions={<Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>View all <Icon name="right" size={14} /></Button>} className="span-2">
          {recent.length ? (
            <div className="card-grid compact">
              {recent.map((p) => <ProjectCard key={p.id} project={p} characters={characters} onOpen={() => navigate(`/projects/${p.id}`)} />)}
            </div>
          ) : (
            <Empty icon="film" title="No projects yet" action={<Button variant="primary" icon="plus" onClick={newProject}>Create your first project</Button>}>Start a project to write a script and build scenes.</Empty>
          )}
        </Panel>

        <div className="col gap">
          <Panel title="Quick access">
            <div className="quick-grid">
              <QuickBtn icon="script" label="Write a script" onClick={() => navigate('/scripts')} />
              <QuickBtn icon="user" label="Design character" onClick={() => navigate(main ? `/characters/${main.id}` : '/characters')} />
              <QuickBtn icon="mic" label="Voice Studio" onClick={() => navigate('/voice')} />
              <QuickBtn icon="layers" label="Visual library" onClick={() => navigate('/assets?tab=visuals')} />
              <QuickBtn icon="palette" label="Appearance" onClick={() => navigate('/settings/appearance')} />
              <QuickBtn icon="key" label="Integrations" onClick={() => navigate('/settings/integrations')} />
            </div>
          </Panel>

          {main && (
            <Panel title="Main character" actions={<Badge tone={main.status === 'approved' ? 'ok' : 'warn'} dot>{main.status === 'approved' ? 'Approved' : 'Awaiting approval'}</Badge>}>
              <div className="main-char" onClick={() => navigate(`/characters/${main.id}`)}>
                <div className="main-char-art"><CharacterRenderer character={main} pose={main.animation?.default} /></div>
                <div>
                  <h4>{main.name}</h4>
                  <p className="muted small clamp-3">{main.description || 'No description yet.'}</p>
                  <Button size="sm" icon="edit">Open in studio</Button>
                </div>
              </div>
            </Panel>
          )}
        </div>

        <Panel title="Recent activity" className="span-3">
          {activity.length ? (
            <ul className="activity">
              {activity.slice(0, 10).map((a) => (
                <li key={a.id} onClick={() => a.ref?.startsWith('proj') ? navigate(`/projects/${a.ref}`) : a.ref?.startsWith('char') ? navigate(`/characters/${a.ref}`) : null}>
                  <span className="act-icon"><Icon name={ACT_ICON[a.type] || 'activity'} size={14} /></span>
                  <span className="act-text">{a.text}</span>
                  <span className="muted small">{timeAgo(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="muted">No activity yet.</p>}
        </Panel>
      </div>
    </div>
  );
}

function QuickBtn({ icon, label, onClick }) {
  return (
    <button className="quick-btn" onClick={onClick}>
      <Icon name={icon} size={20} />
      <span>{label}</span>
    </button>
  );
}
