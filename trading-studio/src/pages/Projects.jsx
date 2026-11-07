import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate, useRoute } from '../lib/router.js';
import { createProject } from '../lib/actions.js';
import { Button, Empty, Confirm, Prompt, Select } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import ProjectCard from '../components/ProjectCard.jsx';
import { scriptStatus, voiceStatus, generationStatus } from '../lib/status.js';
import { conceptById } from '../../shared/concepts.js';

const FILTERS = [
  { id: 'all', label: 'All Projects' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'scripts', label: 'Scripts Completed' },
  { id: 'voice', label: 'Voiceovers Completed' },
  { id: 'ready', label: 'Ready for Generation' },
  { id: 'generated', label: 'Rendered' },
  { id: 'published', label: 'Published' },
  { id: 'archived', label: 'Archived' },
];

export function useProjectActions() {
  const store = useStore();
  const [dialog, setDialog] = useState(null);
  const actionsFor = (p) => [
    { label: 'Open project', icon: 'right', onClick: () => navigate(`/projects/${p.id}`) },
    { label: 'Continue editing', icon: 'edit', onClick: () => navigate(`/projects/${p.id}/editor`) },
    { label: 'Find chart examples', icon: 'search', onClick: () => navigate(`/research?concept=${p.conceptId || 'fvg'}&project=${p.id}`) },
    { label: 'Rename', icon: 'type', onClick: () => setDialog({ type: 'rename', project: p }) },
    { label: 'Duplicate', icon: 'copy', onClick: async () => { try { await store.duplicateDoc('projects', p.id); store.toast('Project duplicated', 'ok'); } catch (e) { store.toast(e.message, 'bad'); } } },
    { label: p.archived ? 'Unarchive' : 'Archive', icon: 'archive', onClick: () => { store.editDoc('projects', p.id, { archived: !p.archived }, { immediate: true }); store.toast(p.archived ? 'Project restored' : 'Project archived', 'ok'); } },
    { label: 'Delete', icon: 'trash', danger: true, onClick: () => setDialog({ type: 'delete', project: p }) },
  ];
  const dialogs = (
    <>
      <Prompt open={dialog?.type === 'rename'} title="Rename project" label="Project title" initial={dialog?.project?.title || ''} confirmLabel="Rename"
        onSubmit={(title) => { store.editDoc('projects', dialog.project.id, { title }, { immediate: true }); setDialog(null); store.toast('Project renamed', 'ok'); }} onClose={() => setDialog(null)} />
      <Confirm open={dialog?.type === 'delete'} danger title="Delete project" confirmLabel="Delete permanently" onClose={() => setDialog(null)}
        message={`Permanently delete “${dialog?.project?.title}”? Its script, scenes, captions and settings will be removed. Generated audio files stay in the Asset Library.`}
        onConfirm={async () => { try { await store.deleteDoc('projects', dialog.project.id); store.toast('Project deleted', 'ok'); setDialog(null); navigate('/projects'); } catch (e) { store.toast(e.message, 'bad'); } }} />
    </>
  );
  return { actionsFor, dialogs };
}

export default function Projects() {
  const store = useStore();
  const { query } = useRoute();
  const [filter, setFilter] = useState(query.get('filter') || 'all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('updated');
  const { actionsFor, dialogs } = useProjectActions();
  const { projects, characters } = store;

  const matches = (p, f) => {
    if (f === 'archived') return p.archived;
    if (p.archived) return false;
    switch (f) {
      case 'drafts': return scriptStatus(p) !== 'completed';
      case 'scripts': return scriptStatus(p) === 'completed';
      case 'voice': return voiceStatus(p) === 'completed';
      case 'ready': return ['ready', 'approved'].includes(generationStatus(p, characters));
      case 'generated': return generationStatus(p, characters) === 'generated';
      case 'published': return p.publication?.status === 'published';
      default: return true;
    }
  };

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.id, projects.filter((p) => matches(p, f.id)).length])), [projects, characters]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = projects
    .filter((p) => matches(p, filter))
    .filter((p) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const ch = characters.find((c) => c.id === p.characterId)?.name || '';
      return [p.title, conceptById(p.conceptId)?.name, p.market?.symbol, ch].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)));

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Video Library</p>
          <h1>All explainer videos</h1>
          <p className="muted">Every project has its own workspace for script, scenes, voice, captions and visuals.</p>
        </div>
        <Button variant="primary" icon="plus" onClick={async () => { try { await createProject(store); } catch (e) { store.toast(e.message, 'bad'); } }}>New video project</Button>
      </header>

      <div className="filter-bar">
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button key={f.id} className={`chip ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>{f.label}<span className="chip-count">{counts[f.id]}</span></button>
          ))}
        </div>
        <div className="row gap-s">
          <div className="search"><Icon name="search" size={15} /><input placeholder="Search projects, themes, characters…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} options={[{ value: 'updated', label: 'Last modified' }, { value: 'created', label: 'Date created' }, { value: 'title', label: 'Title A–Z' }]} />
        </div>
      </div>

      {list.length ? (
        <div className="card-grid">
          {list.map((p) => <ProjectCard key={p.id} project={p} characters={characters} onOpen={() => navigate(`/projects/${p.id}`)} actions={actionsFor(p)} />)}
        </div>
      ) : (
        <Empty icon="search" title="No projects match" action={filter !== 'all' || search ? <Button onClick={() => { setFilter('all'); setSearch(''); }}>Clear filters</Button> : null}>
          {search ? `Nothing found for “${search}”.` : 'No projects in this view yet.'}
        </Empty>
      )}
      {dialogs}
    </div>
  );
}
