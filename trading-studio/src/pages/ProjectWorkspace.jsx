import React, { useState } from 'react';
import { useStore, useProject } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { api } from '../lib/api.js';
import { Button, Panel, Tabs, SaveIndicator, Badge, Empty, Modal, Select, Slider, Toggle, Menu, Input, fmtDate, timeAgo } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import ScriptEditor from '../components/ScriptEditor.jsx';
import SceneBuilder from '../components/SceneBuilder.jsx';
import VoicePanel from '../components/VoicePanel.jsx';
import CaptionsEditor from '../components/CaptionsEditor.jsx';
import VisualsEditor from '../components/VisualsEditor.jsx';
import ChartEditor from '../components/ChartEditor.jsx';
import ExamplesPanel from '../components/ExamplesPanel.jsx';
import ThumbnailPanel from '../components/ThumbnailPanel.jsx';
import { CONCEPTS, CATEGORIES, conceptById } from '../../shared/concepts.js';
import TimelinePlayer from '../components/TimelinePlayer.jsx';
import { useProjectActions } from './Projects.jsx';
import { readiness, generationStatus, scriptStatus, voiceStatus, STATUS_LABEL, STATUS_TONE, projectDuration } from '../lib/status.js';
import { FORMATS } from '../../shared/defaults.js';
import { fmtShort } from '../../shared/scenes.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: 'dashboard' },
  { id: 'examples', label: 'Chart examples', icon: 'chart' },
  { id: 'script', label: 'Script', icon: 'script' },
  { id: 'scenes', label: 'Scenes & timeline', icon: 'film' },
  { id: 'voice', label: 'Voiceover', icon: 'mic' },
  { id: 'captions', label: 'Captions', icon: 'type' },
  { id: 'editor', label: 'Scene editor', icon: 'edit' },
  { id: 'visuals', label: 'Overlays', icon: 'layers' },
  { id: 'thumbnail', label: 'Thumbnail', icon: 'image' },
  { id: 'generate', label: 'Generate', icon: 'zap' },
];

export default function ProjectWorkspace({ id, tab = 'overview' }) {
  const store = useStore();
  const { project, update, save, saving } = useProject(id);
  const { actionsFor, dialogs } = useProjectActions();
  const [genOpen, setGenOpen] = useState(false);

  if (!project) {
    return <div className="page"><Empty icon="film" title="Project not found" action={<Button onClick={() => navigate('/projects')}>Back to projects</Button>}>It may have been deleted.</Empty>{dialogs}</div>;
  }
  const character = store.characters.find((c) => c.id === project.characterId);
  const gs = generationStatus(project, store.characters);
  const setTab = (t) => navigate(`/projects/${project.id}/${t}`);

  return (
    <div className="page">
      <header className="page-head workspace-head">
        <div className="grow">
          <button className="link small" onClick={() => navigate('/projects')}><Icon name="left" size={12} /> All projects</button>
          <input className="title-edit" value={project.title} onChange={(e) => update({ title: e.target.value })} aria-label="Project title" />
          <div className="row gap-s wrap">
            <Badge tone="accent">{FORMATS[project.format]?.label} · {FORMATS[project.format]?.ratio}</Badge>
            <Badge tone={STATUS_TONE[gs]} dot>{STATUS_LABEL[gs]}</Badge>
            {project.sample && <Badge tone="muted">Sample data</Badge>}
            {project.archived && <Badge tone="warn">Archived</Badge>}
            <SaveIndicator state={saving} />
          </div>
        </div>
        <div className="row gap-s">
          <Button icon="save" onClick={() => { save(); store.toast('Project saved', 'ok'); }}>Save changes</Button>
          <Button variant="generate" icon="zap" onClick={() => setGenOpen(true)}>Generate Video</Button>
          <Menu items={actionsFor(project).filter((a) => a.label !== 'Open project')} />
        </div>
      </header>

      <Tabs tabs={TABS.map((t) => ({ ...t, badge: t.id === 'examples' ? project.examples?.length || 0 : t.id === 'scenes' ? project.scenes?.length || 0 : t.id === 'captions' ? project.captions?.items?.length || 0 : undefined }))} value={tab} onChange={setTab} />

      <div className="tab-body">
        {tab === 'overview' && <Overview project={project} update={update} character={character} onTab={setTab} />}
        {tab === 'examples' && <ExamplesPanel project={project} update={update} />}
        {tab === 'thumbnail' && <ThumbnailPanel project={project} update={update} />}
        {tab === 'script' && <ScriptEditor project={project} update={update} />}
        {tab === 'editor' && <ChartEditor project={project} update={update} character={character} />}
        {tab === 'scenes' && <SceneBuilder project={project} update={update} character={character} />}
        {tab === 'voice' && <VoicePanel project={project} update={update} />}
        {tab === 'captions' && <CaptionsEditor project={project} update={update} character={character} />}
        {tab === 'visuals' && <VisualsEditor project={project} update={update} character={character} />}
        {tab === 'generate' && <GeneratePanel project={project} onGenerate={() => setGenOpen(true)} onTab={setTab} />}
      </div>

      <GenerateModal open={genOpen} project={project} onClose={() => setGenOpen(false)} onTab={(t) => { setGenOpen(false); setTab(t); }} />
      {dialogs}
    </div>
  );
}

function Overview({ project, update, character, onTab }) {
  const store = useStore();
  const r = readiness(project, store.characters);
  return (
    <div className="overview-grid">
      <Panel title="Preview" subtitle="Full timeline with captions and generated voice clips">
        {project.scenes?.length ? (
          <div className="preview-wrap"><TimelinePlayer project={project} character={character} /></div>
        ) : <Empty icon="film" title="Nothing to preview yet" action={<Button onClick={() => onTab('script')}>Write the script</Button>}>Write a script and build scenes to see the composition.</Empty>}
      </Panel>
      <div className="col gap">
        <Panel title="Trading concept" actions={<Button size="sm" variant="ghost" icon="search" onClick={() => navigate(`/research?concept=${project.conceptId || 'fvg'}&project=${project.id}`)}>Find real examples</Button>}>
          <Select value={project.conceptId || ''} onChange={(e) => update({ conceptId: e.target.value || null })}
            options={[{ value: '', label: 'Choose a concept…' }, ...CATEGORIES.flatMap((cat) => [...CONCEPTS, ...(store.settings?.customConcepts || []).map((c) => ({ ...c, category: 'Custom' }))].filter((c) => c.category === cat).map((c) => ({ value: c.id, label: `${cat === 'ICT Concepts' ? 'ICT' : cat === 'Custom' ? 'Custom' : 'TA'} · ${c.name}` })))]} />
          <p className="small muted">{conceptById(project.conceptId, store.settings?.customConcepts || [])?.simple || 'The concept drives the script, the chart research and the annotations.'}</p>
          <p className="small"><b>{project.examples?.length || 0}</b> approved chart example{project.examples?.length === 1 ? '' : 's'} · market {project.market?.symbol} {project.market?.timeframe}</p>
        </Panel>
        <Panel title="Video format" subtitle="Only YouTube formats are supported. Chart layout and captions adapt automatically.">
          <div className="format-grid">
            {Object.values(FORMATS).map((f) => (
              <button key={f.id} className={`format-card ${project.format === f.id ? 'on' : ''}`} onClick={() => update({ format: f.id })}>
                <div className={`format-shape fs-${f.id}`} />
                <b>{f.label}</b>
                <span className="small muted">{f.ratio} · {f.width} × {f.height}</span>
                <span className="small muted">{f.note}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Readiness" subtitle={`${r.done}/${r.checks.length} complete`}>
          <ul className="checklist">
            {r.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : ''}>
                <Icon name={c.ok ? 'check' : 'clock'} size={14} />
                <span className="grow">{c.label}{!c.ok && <span className="small muted block">{c.hint}</span>}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Music & sound">
          <Select label="Background music" value={project.audio?.music || 'none'} onChange={(e) => update({ audio: { ...project.audio, music: e.target.value } })}
            options={[{ value: 'none', label: 'None' }, ...store.assets.filter((a) => a.kind === 'audio' && !(a.tags || []).includes('voiceover')).map((a) => ({ value: a.id, label: a.name }))]}
            hint="Upload music tracks in the Asset Library." />
          <Slider label="Music volume" value={project.audio?.musicVolume ?? 0.3} onChange={(v) => update({ audio: { ...project.audio, musicVolume: v } })} format={(v) => `${Math.round(v * 100)}%`} />
          <Toggle label="Use scene sound-effect suggestions" checked={project.audio?.sfxEnabled !== false} onChange={(v) => update({ audio: { ...project.audio, sfxEnabled: v } })} />
        </Panel>
        <Panel title="Publication">
          <Select label="Status" value={project.publication?.status || 'unpublished'} onChange={(e) => update({ publication: { ...project.publication, status: e.target.value } })}
            options={[{ value: 'unpublished', label: 'Not published' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'published', label: 'Published' }]} />
          <Input label="YouTube link" placeholder="https://youtube.com/…" value={project.publication?.url || ''} onChange={(e) => update({ publication: { ...project.publication, url: e.target.value } })} />
          <Input label="Publish date" type="date" value={project.publication?.date || ''} onChange={(e) => update({ publication: { ...project.publication, date: e.target.value } })} />
          <p className="small muted">Tracked for your library only. The studio never uploads or publishes anything.</p>
        </Panel>
        <Panel title="Details">
          <dl className="details">
            <dt>Created</dt><dd>{fmtDate(project.createdAt)}</dd>
            <dt>Last modified</dt><dd>{timeAgo(project.updatedAt)}</dd>
            <dt>Duration</dt><dd>{projectDuration(project) ? fmtShort(projectDuration(project)) : '—'}</dd>
            <dt>Script</dt><dd>{STATUS_LABEL[scriptStatus(project)]}</dd>
            <dt>Voiceover</dt><dd>{STATUS_LABEL[voiceStatus(project)]}</dd>
            <dt>Concept</dt><dd>{conceptById(project.conceptId, store.settings?.customConcepts || [])?.name || '—'}</dd>
          </dl>
        </Panel>
      </div>
    </div>
  );
}

const PIPELINE = [
  ['Scene-by-scene generation', 'Each timed scene is rendered independently so a single scene can be re-rendered.'],
  ['Chart animations', 'Real chart frames, camera moves and annotation reveals are rendered from the saved example data.'],
  ['Background generation', 'Environment and background descriptions become the scene backdrop.'],
  ['Voiceover synchronization', 'ElevenLabs clips are aligned to scene timestamps.'],
  ['Caption synchronization', 'Captions render with word timings and the selected animation preset.'],
  ['Music and sound effects', 'Background music and scene SFX are mixed under the voice.'],
  ['Final video composition', 'Scenes are composed into a 1080 × 1920 or 1920 × 1080 MP4.'],
];

function GeneratePanel({ project, onGenerate, onTab }) {
  const store = useStore();
  const r = readiness(project, store.characters);
  const gs = generationStatus(project, store.characters);
  return (
    <div className="generate-grid">
      <Panel title="Video generation control" subtitle="Generation is inactive until you explicitly approve it. Nothing renders automatically.">
        <div className="gen-status">
          <div className={`gen-orb ${r.ready ? 'ready' : ''}`}><Icon name="zap" size={28} /></div>
          <div>
            <h3>{STATUS_LABEL[gs]}</h3>
            <p className="muted small">{r.ready ? 'All production steps are complete.' : `${r.checks.length - r.done} step(s) remaining before this project is ready.`}</p>
            {project.generation?.approvedAt && <p className="small">Approved {timeAgo(project.generation.approvedAt)} — waiting for a rendering engine to be connected.</p>}
          </div>
        </div>
        <ul className="checklist">
          {r.checks.map((c) => (
            <li key={c.id} className={c.ok ? 'ok' : ''}><Icon name={c.ok ? 'check' : 'clock'} size={14} /><span className="grow">{c.label}</span>
              {!c.ok && <button className="link small" onClick={() => onTab({ character: 'overview', examples: 'examples', script: 'script', scenes: 'scenes', chart: 'editor', voice: 'voice', captions: 'captions' }[c.id])}>Fix</button>}
            </li>
          ))}
        </ul>
        <div className="row gap-s wrap">
          <Button variant="generate" icon="zap" onClick={onGenerate}>Generate Video</Button>
          {gs === 'approved' && <Button variant="ghost" onClick={async () => { try { const p = await api.post(`/api/projects/${project.id}/generate/cancel`); store.replaceDoc('projects', p); store.toast('Approval withdrawn', 'ok'); } catch (e) { store.toast(e.message, 'bad'); } }}>Withdraw approval</Button>}
        </div>
      </Panel>
      <Panel title="Planned generation pipeline" subtitle="These stages will run only after you confirm generation and a renderer is connected.">
        <ol className="pipeline">
          {PIPELINE.map(([t, d], i) => (
            <li key={t}><span className="pipe-num">{i + 1}</span><div><b>{t}</b><p className="small muted">{d}</p></div><Badge tone="muted">Inactive</Badge></li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function GenerateModal({ open, project, onClose, onTab }) {
  const store = useStore();
  const [step, setStep] = useState('confirm');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const r = readiness(project, store.characters);
  React.useEffect(() => { if (open) { setStep('confirm'); setMessage(''); } }, [open]);

  const confirm = async () => {
    setBusy(true);
    try {
      await store.flushDoc('projects', project.id);
      const res = await api.post(`/api/projects/${project.id}/generate`, { confirmed: true });
      store.replaceDoc('projects', res.project);
      store.refreshActivity();
      setMessage(res.message);
      setStep('done');
    } catch (e) { store.toast(e.message, 'bad'); } finally { setBusy(false); }
  };

  return (
    <Modal open={open} title="Generate video" onClose={onClose} width={580}
      footer={step === 'confirm' ? (
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="generate" icon="zap" loading={busy} disabled={!r.ready} onClick={confirm}>Yes, approve generation</Button>
        </>
      ) : <Button variant="primary" onClick={onClose}>Close</Button>}>
      {step === 'confirm' ? (
        <div className="col gap">
          {r.ready ? (
            <p>All production steps are complete for <b>{project.title}</b>. Confirm to approve this project for video generation in <b>{FORMATS[project.format].label}</b> ({FORMATS[project.format].width} × {FORMATS[project.format].height}).</p>
          ) : (
            <p>This project isn’t ready yet. Complete the remaining steps before generating:</p>
          )}
          <ul className="checklist">
            {r.checks.map((c) => (
              <li key={c.id} className={c.ok ? 'ok' : ''}><Icon name={c.ok ? 'check' : 'x'} size={14} /><span className="grow">{c.label}</span>
                {!c.ok && <button className="link small" onClick={() => onTab({ character: 'overview', examples: 'examples', script: 'script', scenes: 'scenes', chart: 'editor', voice: 'voice', captions: 'captions' }[c.id])}>Go</button>}</li>
            ))}
          </ul>
          <div className="notice subtle"><Icon name="alert" size={14} /> The video rendering engine is not connected yet. Confirming records your approval — no video will be rendered.</div>
        </div>
      ) : (
        <div className="gen-done">
          <div className="gen-orb ready"><Icon name="check" size={28} /></div>
          <h3>Ready for generation</h3>
          <p className="muted">{message}</p>
        </div>
      )}
    </Modal>
  );
}
