import React from 'react';
import { useStore } from './lib/store.jsx';
import { useRoute, navigate } from './lib/router.js';
import { Icon } from './components/Icon.jsx';
import { Button, Spinner, Toasts, Confirm, Prompt } from './components/ui.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ScriptStudio from './pages/ScriptStudio.jsx';
import VoiceStudio from './pages/VoiceStudio.jsx';
import Projects from './pages/Projects.jsx';
import ProjectWorkspace from './pages/ProjectWorkspace.jsx';
import AssetLibrary from './pages/AssetLibrary.jsx';
import Settings from './pages/Settings.jsx';
import ConceptLibrary from './pages/ConceptLibrary.jsx';
import ChartResearch from './pages/ChartResearch.jsx';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'concepts', label: 'Concept Library', icon: 'layers' },
  { id: 'research', label: 'Chart Research', icon: 'chart' },
  { id: 'scripts', label: 'Script Studio', icon: 'script' },
  { id: 'voice', label: 'Voice Studio', icon: 'mic' },
  { id: 'projects', label: 'Video Library', icon: 'film' },
  { id: 'assets', label: 'Asset Library', icon: 'folder' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export default function App() {
  const store = useStore();
  const { parts, query } = useRoute();
  const section = parts[0] || 'dashboard';

  let page;
  if (store.loading && !store.settings) page = <Spinner label="Loading studio…" />;
  else if (store.error && !store.settings) {
    page = (
      <div className="empty">
        <div className="empty-icon"><Icon name="alert" size={26} /></div>
        <h4>Could not load the studio</h4>
        <p className="muted">{store.error}</p>
        <Button variant="primary" icon="refresh" onClick={store.reload}>Retry</Button>
      </div>
    );
  } else {
    switch (section) {
      case 'concepts': page = <ConceptLibrary />; break;
      case 'research': page = <ChartResearch key={query.toString()} />; break;
      case 'scripts': page = <ScriptStudio projectId={parts[1] || query.get('project')} />; break;
      case 'voice': page = <VoiceStudio projectId={parts[1] || query.get('project')} />; break;
      case 'projects': page = parts[1] ? <ProjectWorkspace id={parts[1]} tab={parts[2]} /> : <Projects />; break;
      case 'assets': page = <AssetLibrary />; break;
      case 'settings': page = <Settings tab={parts[1]} />; break;
      default: page = <Dashboard />;
    }
  }

  const mode = store.settings?.theme?.mode || 'dark';

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand" onClick={() => navigate('/dashboard')}>
          <div className="brand-mark"><Icon name="chart" size={18} /></div>
          <div>
            <b>Thirty Eleven</b>
            <span>Trading Explainer Studio</span>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n.id} href={`#/${n.id}`} className={`nav-item ${section === n.id ? 'active' : ''}`}>
              <Icon name={n.icon} size={18} />
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <IntegrationPill label="ElevenLabs" on={store.integrations?.elevenlabs?.configured} off={store.integrations?.elevenlabs?.unavailable ? 'Self-hosted only' : 'Connect'} href="#/settings/integrations" />
          <IntegrationPill label="TradingView" on={store.integrations?.tradingview?.configured} off={store.integrations?.tradingview?.connector ? 'Not connected' : 'Web version'} href="#/settings/integrations" />
          <IntegrationPill label="Claude writer" on={store.integrations?.claude?.configured} off={store.integrations?.claude?.builtIn ? 'Unavailable' : 'Connect'} href="#/settings/integrations" />
          <IntegrationPill label="Video renderer" on={false} off="Not connected" href="#/settings/integrations" />
          <button className="mode-toggle" onClick={() => store.updateSettings({ theme: { mode: mode === 'dark' ? 'light' : 'dark' } })}>
            <Icon name={mode === 'dark' ? 'sun' : 'moon'} size={15} /> {mode === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>
      <main className="main">{page}</main>
      <Toasts toasts={store.toasts} />
      <Confirm open={store.dialog?.kind === 'confirm'} title={store.dialog?.title || 'Are you sure?'} message={store.dialog?.message} confirmLabel={store.dialog?.confirmLabel || 'Continue'}
        danger={store.dialog?.danger} onConfirm={() => store.closeDialog(true)} onClose={() => store.closeDialog(false)} />
      <Prompt open={store.dialog?.kind === 'prompt'} title={store.dialog?.title || ''} label={store.dialog?.label || 'Name'} initial={store.dialog?.initial || ''}
        confirmLabel={store.dialog?.confirmLabel || 'Save'} onSubmit={(v) => store.closeDialog(v)} onClose={() => store.closeDialog(null)} />
    </div>
  );
}

function IntegrationPill({ label, on, off = 'Connect', href }) {
  return (
    <a className="int-pill" href={href}>
      <i className={on ? 'on' : ''} />
      <span>{label}</span>
      <em>{on ? 'Connected' : off}</em>
    </a>
  );
}
