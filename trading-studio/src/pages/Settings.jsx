import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { api } from '../lib/api.js';
import { Button, Panel, Tabs, Select, Slider, ColorInput, Toggle, Chips, Badge, Input, Confirm, Prompt, IconButton, Menu } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { ElevenConnect, useEleven } from '../components/VoicePanel.jsx';
import { DEFAULT_THEME, FONT_CHOICES, FORMATS } from '../../shared/defaults.js';

const TABS = [
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'integrations', label: 'Integrations', icon: 'key' },
  { id: 'defaults', label: 'Defaults', icon: 'check' },
  { id: 'presets', label: 'Presets', icon: 'layers' },
  { id: 'storage', label: 'Project storage', icon: 'database' },
];

const THEME_PRESETS = [
  { name: 'Midnight neon', theme: DEFAULT_THEME },
  { name: 'Electric blue', theme: { ...DEFAULT_THEME, primary: '#3b82f6', secondary: '#22d3ee', background: '#030712' } },
  { name: 'Matrix terminal', theme: { ...DEFAULT_THEME, primary: '#22c55e', secondary: '#a3e635', background: '#020604', font: 'JetBrains Mono' } },
  { name: 'Crimson risk', theme: { ...DEFAULT_THEME, primary: '#f43f5e', secondary: '#f59e0b', background: '#0a0507' } },
  { name: 'Gold standard', theme: { ...DEFAULT_THEME, primary: '#eab308', secondary: '#a855f7', background: '#07060a' } },
];

export default function Settings({ tab = 'appearance' }) {
  const setTab = (t) => navigate(`/settings/${t}`);
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Settings & customization</h1>
          <p className="muted">Global presets and defaults apply to every new project.</p>
        </div>
      </header>
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      <div className="tab-body">
        {tab === 'appearance' && <Appearance />}
        {tab === 'integrations' && <Integrations />}
        {tab === 'defaults' && <Defaults />}
        {tab === 'presets' && <Presets />}
        {tab === 'storage' && <Storage />}
      </div>
    </div>
  );
}

function Appearance() {
  const store = useStore();
  const t = { ...DEFAULT_THEME, ...store.settings.theme };
  const set = (patch) => store.updateSettings({ theme: patch });
  return (
    <div className="settings-grid">
      <Panel title="Theme presets">
        <div className="theme-presets">
          {THEME_PRESETS.map((p) => (
            <button key={p.name} className="theme-preset" onClick={() => set({ ...p.theme, mode: t.mode })}>
              <span className="tp-swatch" style={{ background: `linear-gradient(135deg, ${p.theme.background} 30%, ${p.theme.primary} 65%, ${p.theme.secondary})` }} />
              {p.name}
            </button>
          ))}
        </div>
      </Panel>
      <Panel title="Colors & lighting">
        <div className="field"><span className="field-label">Mode</span><Chips options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={t.mode} onChange={(v) => set({ mode: v })} /></div>
        <div className="grid-2">
          <ColorInput label="Primary neon" value={t.primary} onChange={(v) => set({ primary: v })} />
          <ColorInput label="Secondary accent" value={t.secondary} onChange={(v) => set({ secondary: v })} />
          <ColorInput label="Background" value={t.background} onChange={(v) => set({ background: v })} />
        </div>
        <Slider label="Panel transparency" value={t.panelOpacity} min={0.15} max={1} step={0.01} onChange={(v) => set({ panelOpacity: v })} format={(v) => `${Math.round(v * 100)}% opaque`} />
        <Slider label="Glow intensity" value={t.glow} min={0} max={1.5} step={0.05} onChange={(v) => set({ glow: v })} format={(v) => v.toFixed(2)} />
      </Panel>
      <Panel title="Shape, type & motion">
        <Slider label="Border radius" value={t.radius} min={0} max={28} step={1} onChange={(v) => set({ radius: v })} format={(v) => `${v}px`} />
        <Select label="Font family" value={t.font} onChange={(e) => set({ font: e.target.value })} options={FONT_CHOICES} />
        <div className="field"><span className="field-label">Interface density</span><Chips options={['compact', 'comfortable', 'spacious']} value={t.density} onChange={(v) => set({ density: v })} /></div>
        <Slider label="Animation intensity" value={t.animation} min={0} max={2} step={0.1} onChange={(v) => set({ animation: v })} format={(v) => (v === 0 ? 'Off' : `${v.toFixed(1)}×`)} />
        <Button variant="ghost" icon="refresh" onClick={() => set({ ...DEFAULT_THEME })}>Reset to default theme</Button>
      </Panel>
      <Panel title="Live preview">
        <div className="theme-preview">
          <div className="row gap-s wrap"><Button variant="primary" icon="zap">Primary action</Button><Button>Secondary</Button><Button variant="ghost">Ghost</Button></div>
          <div className="row gap-s wrap"><Badge tone="ok" dot>Completed</Badge><Badge tone="warn" dot>Draft</Badge><Badge tone="accent">Ready</Badge><Badge tone="bad">Outdated</Badge></div>
          <Input placeholder="Input field" />
          <Slider label="Slider" value={0.6} onChange={() => {}} />
          <div className="glow-demo">Selected element glow</div>
        </div>
      </Panel>
    </div>
  );
}

function Integrations() {
  const store = useStore();
  const eleven = useEleven();
  const claude = store.integrations?.claude || {};
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOff, setConfirmOff] = useState(null);

  const connectClaude = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const out = await api.post('/api/integrations/claude', { apiKey: key });
      store.setIntegrations(out);
      setKey('');
      store.toast('Claude script writer connected', 'ok');
    } catch (err) { store.toast(err.message, 'bad', 6000); } finally { setBusy(false); }
  };

  return (
    <div className="settings-grid">
      <Panel title="ElevenLabs" subtitle="Voiceover generation (default voice: Quentin)"
        actions={eleven.status?.connected ? <Badge tone="ok" dot>Connected · {eleven.status.source === 'environment' ? 'env variable' : 'stored on server'}</Badge> : <Badge tone="warn" dot>Not connected</Badge>}>
        {eleven.status?.connected ? (
          <div className="col gap-s">
            <p className="small">{eleven.voices?.length || 0} voices available · Quentin {eleven.quentin ? 'found ✓' : 'not found in this account'}</p>
            {eleven.status.subscription && <p className="small muted">Plan: {eleven.status.subscription.tier} · {eleven.status.subscription.used?.toLocaleString()} / {eleven.status.subscription.limit?.toLocaleString()} characters used</p>}
            <div className="row gap-s">
              <Button icon="refresh" onClick={eleven.refresh}>Test connection</Button>
              {eleven.status.source === 'stored' && <Button variant="danger" icon="unlink" onClick={() => setConfirmOff('eleven')}>Disconnect</Button>}
              {eleven.status.source === 'environment' && <span className="small muted">Key comes from ELEVENLABS_API_KEY — remove it from the server environment to disconnect.</span>}
            </div>
          </div>
        ) : <ElevenConnect eleven={eleven} compact />}
      </Panel>

      <Panel title="Claude (AI script writer)" subtitle={`Model: ${claude.model || 'claude-opus-5-5'} · optional — the local writer works without it`}
        actions={claude.configured ? <Badge tone="ok" dot>Connected · {claude.source === 'environment' ? 'env variable' : 'stored on server'}</Badge> : <Badge tone="muted" dot>Not connected</Badge>}>
        {claude.builtIn ? (
          <p className="small">{claude.configured ? 'Script Studio writes with Claude through claude.ai — no API key needed. The first time you use it, claude.ai asks you to allow it.' : 'Claude isn’t available in this view. The local writer still works.'}</p>
        ) : claude.configured ? (
          <div className="row gap-s">
            <p className="small grow">Script Studio can use Claude for generation, rewrites, tone changes, expand and shorten.</p>
            {claude.source === 'stored' && <Button variant="danger" icon="unlink" onClick={() => setConfirmOff('claude')}>Disconnect</Button>}
          </div>
        ) : (
          <form className="col gap-s" onSubmit={connectClaude}>
            <p className="small muted">Paste an Anthropic API key. It’s verified, then stored only on the studio server (or set <code>ANTHROPIC_API_KEY</code> in the server environment).</p>
            <div className="row gap-s">
              <input className="input" type="password" autoComplete="off" placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
              <Button variant="primary" icon="link" loading={busy} disabled={key.trim().length < 20}>Connect</Button>
            </div>
          </form>
        )}
      </Panel>

      <Panel title="Video rendering engine" actions={<Badge tone="muted" dot>Not connected</Badge>}>
        <p className="small">No rendering engine is connected, so the studio never renders video. “Generate Video” records your approval and shows the project as ready for generation.</p>
        <p className="small muted">The planned pipeline: scene-by-scene rendering, character animation, code animations, backgrounds, voice & caption sync, music/SFX and final composition.</p>
      </Panel>

      {!store.integrations?.standalone && <Panel title="Security">
        <ul className="checklist">
          <li className="ok"><Icon name="lock" size={14} /><span>API keys are never included in the frontend bundle or returned by any API route.</span></li>
          <li className="ok"><Icon name="lock" size={14} /><span>Keys entered here are stored server-side in <code>data/secrets.json</code> (file mode 600, git-ignored).</span></li>
          <li className="ok"><Icon name="lock" size={14} /><span>Environment variables (<code>ELEVENLABS_API_KEY</code>, <code>ANTHROPIC_API_KEY</code>) take precedence.</span></li>
        </ul>
      </Panel>}

      <Confirm open={!!confirmOff} danger title="Disconnect integration" confirmLabel="Disconnect" onClose={() => setConfirmOff(null)}
        message="The stored API key will be deleted from the server. Existing generated audio stays in your projects."
        onConfirm={async () => {
          try {
            if (confirmOff === 'eleven') await eleven.disconnect();
            else store.setIntegrations(await api.del('/api/integrations/claude'));
            store.toast('Disconnected', 'ok');
          } catch (e) { store.toast(e.message, 'bad'); }
          setConfirmOff(null);
        }} />
    </div>
  );
}

function Defaults() {
  const store = useStore();
  const eleven = useEleven();
  const d = store.settings.defaults || {};
  const set = (patch) => { store.updateSettings({ defaults: patch }); store.toast('Default saved', 'ok', 1500); };
  const caps = store.presets.filter((p) => p.kind === 'caption');
  const anims = store.presets.filter((p) => p.kind === 'animation');
  return (
    <div className="settings-grid">
      <Panel title="New project defaults" subtitle="Applied when you create a project">
        <Select label="Default character" value={d.characterId || ''} onChange={(e) => set({ characterId: e.target.value })} options={store.characters.map((c) => ({ value: c.id, label: `${c.name}${c.status === 'approved' ? '' : ' (draft)'}` }))} />
        <Select label="Default video format" value={d.format} onChange={(e) => set({ format: e.target.value })} options={Object.values(FORMATS).map((f) => ({ value: f.id, label: `${f.label} · ${f.ratio} · ${f.width}×${f.height}` }))} />
        <Select label="Default script writer" value={d.scriptEngine || 'local'} onChange={(e) => set({ scriptEngine: e.target.value })} options={[{ value: 'local', label: 'Local writer' }, { value: 'claude', label: 'Claude' }]} />
        <Select label="Default caption preset" value={d.captionPresetId || ''} onChange={(e) => set({ captionPresetId: e.target.value })} options={caps.map((p) => ({ value: p.id, label: p.name }))} />
        <Select label="Default animation preset" value={d.animationPresetId || ''} onChange={(e) => set({ animationPresetId: e.target.value })} options={anims.map((p) => ({ value: p.id, label: p.name }))} />
      </Panel>
      <Panel title="Default voice" subtitle="Quentin is the default narrator">
        {eleven.status?.connected && eleven.voices ? (
          <Select label="Voice" value={d.voiceId || eleven.quentin?.id || ''} onChange={(e) => { const v = eleven.voices.find((x) => x.id === e.target.value); set({ voiceId: v.id, voiceName: v.name }); }}
            options={eleven.voices.map((v) => ({ value: v.id, label: v.name }))} />
        ) : (
          <p className="small">Current default: <b>{d.voiceName || 'Quentin'}</b>. <a href="#/settings/integrations">Connect ElevenLabs</a> to choose from your voices.</p>
        )}
        <VoiceDefaults />
      </Panel>
    </div>
  );
}

function VoiceDefaults() {
  const store = useStore();
  const v = store.settings.voiceSettings || {};
  const set = (patch) => store.updateSettings({ voiceSettings: patch });
  return (
    <>
      <Slider label="Stability" value={v.stability ?? 0.45} onChange={(x) => set({ stability: x })} format={(x) => x.toFixed(2)} />
      <Slider label="Similarity" value={v.similarity ?? 0.8} onChange={(x) => set({ similarity: x })} format={(x) => x.toFixed(2)} />
      <Slider label="Style" value={v.style ?? 0.25} onChange={(x) => set({ style: x })} format={(x) => x.toFixed(2)} />
      <Slider label="Speaking speed" value={v.speed ?? 1} min={0.7} max={1.2} step={0.01} onChange={(x) => set({ speed: x })} format={(x) => `${x.toFixed(2)}×`} />
    </>
  );
}

function Presets() {
  const store = useStore();
  const [dialog, setDialog] = useState(null);
  const groups = [['caption', 'Caption presets', 'Created from a project’s Captions tab'], ['animation', 'Animation presets', 'Motion feel for scenes'], ['visual', 'Visual presets', 'Saved layer stacks from a project’s Visuals tab']];
  return (
    <div className="settings-grid">
      {groups.map(([kind, title, sub]) => (
        <Panel key={kind} title={title} subtitle={sub} actions={kind === 'animation' && <Button size="sm" icon="plus" onClick={() => setDialog({ type: 'new-anim' })}>New</Button>}>
          {store.presets.filter((p) => p.kind === kind).map((p) => (
            <div key={p.id} className="preset-row">
              <b>{p.name}</b>
              <span className="small muted grow">{kind === 'caption' ? `${p.data.font} · ${p.data.size}px · ${p.data.animation}` : kind === 'animation' ? `${p.data.speed}× speed · ${p.data.camera}` : `${p.data.length} layers`}</span>
              {kind === 'animation' && <IconButton icon="edit" title="Edit" onClick={() => setDialog({ type: 'edit-anim', preset: p })} />}
              <Menu items={[
                { label: 'Rename', icon: 'type', onClick: () => setDialog({ type: 'rename', preset: p }) },
                { label: 'Delete', icon: 'trash', danger: true, onClick: () => setDialog({ type: 'delete', preset: p }) },
              ]} />
            </div>
          ))}
          {!store.presets.some((p) => p.kind === kind) && <p className="small muted">No presets yet.</p>}
        </Panel>
      ))}
      <Prompt open={dialog?.type === 'rename'} title="Rename preset" label="Name" initial={dialog?.preset?.name || ''} onClose={() => setDialog(null)}
        onSubmit={(name) => { store.editDoc('presets', dialog.preset.id, { name }, { immediate: true }); setDialog(null); }} />
      <Prompt open={dialog?.type === 'new-anim'} title="New animation preset" label="Name" onClose={() => setDialog(null)}
        onSubmit={async (name) => { await store.createDoc('presets', { kind: 'animation', name, data: { speed: 1, intensity: 1, camera: 'Slow dolly-in', transitions: 'Crossfade 0.5s' } }); setDialog(null); }} />
      <Confirm open={dialog?.type === 'delete'} danger title="Delete preset" confirmLabel="Delete" message={`Delete “${dialog?.preset?.name}”?`} onClose={() => setDialog(null)}
        onConfirm={async () => { await store.deleteDoc('presets', dialog.preset.id); setDialog(null); }} />
      {dialog?.type === 'edit-anim' && <AnimPresetEditor preset={store.presets.find((p) => p.id === dialog.preset.id)} onClose={() => setDialog(null)} />}
    </div>
  );
}

function AnimPresetEditor({ preset, onClose }) {
  const store = useStore();
  if (!preset) return null;
  const set = (patch) => store.editDoc('presets', preset.id, { data: { ...preset.data, ...patch } });
  return (
    <Panel title={`Edit “${preset.name}”`} actions={<IconButton icon="x" title="Close" onClick={onClose} />} className="span-all">
      <div className="grid-2">
        <Slider label="Speed" value={preset.data.speed} min={0.3} max={2} step={0.05} onChange={(v) => set({ speed: v })} format={(v) => `${v.toFixed(2)}×`} />
        <Slider label="Intensity" value={preset.data.intensity} min={0} max={2} step={0.05} onChange={(v) => set({ intensity: v })} format={(v) => `${v.toFixed(2)}×`} />
        <Input label="Camera style" value={preset.data.camera} onChange={(e) => set({ camera: e.target.value })} />
        <Input label="Transitions" value={preset.data.transitions} onChange={(e) => set({ transitions: e.target.value })} />
      </div>
    </Panel>
  );
}

function Storage() {
  const store = useStore();
  const s = store.settings.storage || {};
  const set = (patch) => store.updateSettings({ storage: patch });
  const [reset, setReset] = useState(false);
  const [typed, setTyped] = useState('');
  return (
    <div className="settings-grid">
      <Panel title="Autosave">
        <Toggle label="Autosave edits" hint="Projects and captions save automatically after you stop typing" checked={s.autosave !== false} onChange={(v) => set({ autosave: v })} />
        <Slider label="Autosave delay" value={s.autosaveDelay ?? 1200} min={300} max={5000} step={100} onChange={(v) => set({ autosaveDelay: v })} format={(v) => `${(v / 1000).toFixed(1)}s`} />
        <Slider label="Script versions kept per project" value={s.keepScriptVersions ?? 15} min={3} max={50} step={1} onChange={(v) => set({ keepScriptVersions: v })} />
      </Panel>
      <Panel title="Data">
        {store.integrations?.standalone
          ? <p className="small muted">{store.integrations.storage === 'cloud' ? 'Projects, characters, presets and settings are saved to your private storage for this page on claude.ai, so they follow you to any device where you’re signed in.' : 'Cloud storage isn’t available in this view, so data is saved in this browser only.'} Uploaded images use the page’s asset store.</p>
          : <p className="small muted">All projects, characters, presets and settings are stored in <code>data/db.json</code> on the studio server; uploads and voiceovers in <code>data/uploads/</code>.</p>}
        <div className="row gap-s wrap">
          <Button icon="download" onClick={async () => { try { await api.exportBackup(); } catch (e) { if (e?.code !== 'declined') store.toast(e.message || 'Export failed', 'bad'); } }}>Export backup (JSON)</Button>
          <Button variant="danger" icon="trash" onClick={() => setReset(true)}>Reset to sample data</Button>
        </div>
        <p className="small muted">{store.projects.length} projects · {store.characters.length} characters · {store.assets.length} assets · {store.presets.length} presets</p>
      </Panel>
      <Confirm open={reset} danger title="Reset all data" confirmLabel="Reset everything" onClose={() => setReset(false)}
        onConfirm={async () => {
          if (typed !== 'RESET') { store.toast('Type RESET to confirm', 'warn'); return; }
          try { await api.post('/api/settings/reset-data', { confirm: 'RESET' }); await store.reload(); setReset(false); store.toast('Data reset to samples', 'ok'); navigate('/dashboard'); } catch (e) { store.toast(e.message, 'bad'); }
        }}>
        <p>This replaces all projects, characters, presets and settings with the original sample data. Uploaded files are kept on disk. Export a backup first.</p>
        <Input label="Type RESET to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} />
      </Confirm>
    </div>
  );
}
