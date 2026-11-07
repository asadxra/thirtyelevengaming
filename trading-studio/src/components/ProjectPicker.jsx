import React from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { createProject } from '../lib/actions.js';
import { Button, Select } from './ui.jsx';

// Shared project selector for the Script Studio and Voice Studio pages.
export default function ProjectPicker({ value, basePath, newLabel = 'New project' }) {
  const store = useStore();
  const options = store.projects.filter((p) => !p.archived || p.id === value);
  return (
    <div className="row gap-s wrap project-picker">
      <Select value={value || ''} onChange={(e) => navigate(`${basePath}/${e.target.value}`)}
        options={[{ value: '', label: 'Select a project…' }, ...options.map((p) => ({ value: p.id, label: p.title }))]} />
      <Button icon="plus" onClick={async () => {
        try {
          const p = await createProject(store, {}, { open: false });
          navigate(`${basePath}/${p.id}`);
        } catch (e) { store.toast(e.message, 'bad'); }
      }}>{newLabel}</Button>
      {value && <Button variant="ghost" icon="film" onClick={() => navigate(`/projects/${value}`)}>Open workspace</Button>}
    </div>
  );
}
