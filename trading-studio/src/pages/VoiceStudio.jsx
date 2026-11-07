import React from 'react';
import { useStore, useProject } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { Empty, Panel, SaveIndicator } from '../components/ui.jsx';
import ProjectPicker from '../components/ProjectPicker.jsx';
import VoicePanel, { useEleven, ElevenConnect } from '../components/VoicePanel.jsx';

export default function VoiceStudio({ projectId }) {
  const store = useStore();
  const { project, update, saving } = useProject(projectId);
  const eleven = useEleven();
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Voice Studio · ElevenLabs</p>
          <h1>{project ? project.title : 'Voiceover'}</h1>
          <p className="muted">Default narrator: Quentin. Audio is generated per scene and synchronized to scene timestamps.</p>
        </div>
        <div className="col gap-s align-end">
          <ProjectPicker value={projectId} basePath="/voice" />
          {project && <SaveIndicator state={saving} />}
        </div>
      </header>
      {project ? (
        <VoicePanel key={project.id} project={project} update={update} />
      ) : (
        <div className="col gap">
          {!eleven.status?.connected && !eleven.loading && <Panel><ElevenConnect eleven={eleven} /></Panel>}
          <Empty icon="mic" title="Select a project to voice">
            Pick a project above. Projects with scenes ready for voiceover:
            <div className="recent-list">
              {store.projects.filter((p) => !p.archived && p.scenes?.length).map((p) => (
                <button key={p.id} className="link" onClick={() => navigate(`/voice/${p.id}`)}>{p.title}</button>
              ))}
            </div>
          </Empty>
        </div>
      )}
    </div>
  );
}
