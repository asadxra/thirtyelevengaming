import React, { useState } from 'react';
import { useStore, useProject } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { Empty, SaveIndicator, Tabs, Input } from '../components/ui.jsx';
import ProjectPicker from '../components/ProjectPicker.jsx';
import ScriptEditor from '../components/ScriptEditor.jsx';
import SceneBuilder from '../components/SceneBuilder.jsx';

export default function ScriptStudio({ projectId }) {
  const store = useStore();
  const id = projectId || null;
  const { project, update, saving } = useProject(id);
  const [tab, setTab] = useState('script');
  const character = project && store.characters.find((c) => c.id === project.characterId);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Script Studio</p>
          <h1>{project ? project.title : 'Write a trading motivation script'}</h1>
          <p className="muted">Hook → Problem → Story → Realization → Conclusion, then split into timed scenes.</p>
        </div>
        <div className="col gap-s align-end">
          <ProjectPicker value={id} basePath="/scripts" newLabel="New script project" />
          {project && <SaveIndicator state={saving} />}
        </div>
      </header>
      {!project ? (
        <Empty icon="script" title={id ? 'Project not found' : 'Choose a project to write for'}>
          Every script belongs to a video project so scenes, voiceover and captions stay together. Pick one above or create a new one.
          <div className="recent-list">
            {store.projects.filter((p) => !p.archived).slice(0, 5).map((p) => (
              <button key={p.id} className="link" onClick={() => navigate(`/scripts/${p.id}`)}>{p.title}</button>
            ))}
          </div>
        </Empty>
      ) : (
        <>
          <div className="row gap-s wrap between">
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'script', label: 'Script editor', icon: 'script' }, { id: 'scenes', label: 'Scene builder & timeline', icon: 'film', badge: project.scenes?.length || 0 }]} />
            <Input value={project.title} onChange={(e) => update({ title: e.target.value })} className="title-input" aria-label="Project title" />
          </div>
          {tab === 'script' ? <ScriptEditor key={project.id} project={project} update={update} /> : <SceneBuilder key={project.id} project={project} update={update} character={character} />}
        </>
      )}
    </div>
  );
}
