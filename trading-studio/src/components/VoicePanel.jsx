import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { Button, Panel, Input, Slider, Toggle, Badge, IconButton, Empty, Spinner } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { clipState, voiceStatus, STATUS_LABEL, STATUS_TONE } from '../lib/status.js';
import { hashText, fmtTime, retime, totalDuration } from '../../shared/scenes.js';
import { DEFAULT_VOICE_SETTINGS } from '../../shared/defaults.js';

// ---------- connection + voices (shared cache across pages) ----------
let cache = { status: null, voices: null, quentin: null };

export function useEleven() {
  const store = useStore();
  const [status, setStatus] = useState(cache.status);
  const [voices, setVoices] = useState(cache.voices);
  const [quentin, setQuentin] = useState(cache.quentin);
  const [loading, setLoading] = useState(!cache.status);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const st = await api.get('/api/elevenlabs/status');
      cache.status = st;
      setStatus(st);
      if (st.connected) {
        const v = await api.get('/api/elevenlabs/voices');
        cache = { ...cache, voices: v.voices, quentin: v.quentin };
        setVoices(v.voices);
        setQuentin(v.quentin);
      } else {
        cache = { ...cache, voices: null, quentin: null };
        setVoices(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (!cache.status) refresh(); }, [refresh]);

  const connect = async (apiKey) => {
    const st = await api.post('/api/elevenlabs/connect', { apiKey });
    cache.status = st;
    setStatus(st);
    store.setIntegrations({ ...store.integrations, elevenlabs: { configured: true, source: st.source } });
    await refresh();
    return st;
  };
  const disconnect = async () => {
    const st = await api.del('/api/elevenlabs/connect');
    cache = { status: st, voices: null, quentin: null };
    setStatus(st);
    setVoices(null);
    store.setIntegrations({ ...store.integrations, elevenlabs: { configured: !!st.source, source: st.source } });
    if (st.source) refresh();
  };
  return { status, voices, quentin, loading, error, refresh, connect, disconnect };
}

export function ElevenConnect({ eleven, compact }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const store = useStore();
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await eleven.connect(key);
      setKey('');
      store.toast('ElevenLabs connected', 'ok');
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <div className={`connect-box ${compact ? 'compact' : ''}`}>
      <div className="connect-icon"><Icon name="mic" size={24} /></div>
      <div className="grow">
        <h4>Connect ElevenLabs</h4>
        <p className="small muted">Voiceovers are generated through your ElevenLabs account. The key is verified and stored only on the studio server (data/secrets.json, never sent back to the browser). You can also set <code>ELEVENLABS_API_KEY</code> in the server environment.</p>
        {eleven.status?.error && <p className="small bad-text"><Icon name="alert" size={12} /> {eleven.status.error}</p>}
        <form className="row gap-s" onSubmit={submit}>
          <input className="input" type="password" autoComplete="off" placeholder="ElevenLabs API key (xi-api-key)" value={key} onChange={(e) => setKey(e.target.value)} />
          <Button variant="primary" icon="link" loading={busy} disabled={key.trim().length < 10}>Connect</Button>
        </form>
        {err && <p className="small bad-text">{err}</p>}
      </div>
    </div>
  );
}

// ---------- audio duration helper ----------
function useClipDurations(project) {
  const [durations, setDurations] = useState({});
  useEffect(() => {
    let alive = true;
    const clips = project.voice?.clips || {};
    Object.entries(clips).forEach(([sceneId, clip]) => {
      if (!clip.url || durations[clip.url]) return;
      const a = new Audio();
      a.preload = 'metadata';
      a.src = clip.url;
      a.onloadedmetadata = () => alive && setDurations((d) => ({ ...d, [clip.url]: a.duration }));
    });
    return () => { alive = false; };
  }, [project.voice?.clips]); // eslint-disable-line react-hooks/exhaustive-deps
  return durations;
}

export default function VoicePanel({ project, update }) {
  const store = useStore();
  const eleven = useEleven();
  const [busy, setBusy] = useState({});
  const [batch, setBatch] = useState(null);
  const [filter, setFilter] = useState('');
  const playing = useRef(null);
  const [nowPlaying, setNowPlaying] = useState(null);
  const durations = useClipDurations(project);
  const voice = project.voice || {};
  const settings = { ...DEFAULT_VOICE_SETTINGS, ...(voice.settings || {}) };
  const connected = eleven.status?.connected;

  // Default to Quentin once the voice list is available.
  useEffect(() => {
    if (connected && !voice.voiceId && eleven.quentin) {
      update((p) => ({ voice: { ...p.voice, voiceId: eleven.quentin.id, voiceName: eleven.quentin.name } }));
    }
  }, [connected, eleven.quentin, voice.voiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setVoice = (patch) => update((p) => ({ voice: { ...p.voice, ...patch } }));
  const setSettings = (patch) => setVoice({ settings: { ...settings, ...patch } });

  const play = (url, key) => {
    if (playing.current) { playing.current.pause(); if (nowPlaying === key) { setNowPlaying(null); playing.current = null; return; } }
    const a = new Audio(url);
    a.onended = () => setNowPlaying(null);
    a.play().catch((e) => store.toast(`Playback failed: ${e.message}`, 'bad'));
    playing.current = a;
    setNowPlaying(key);
  };

  const generateScene = async (scene) => {
    setBusy((b) => ({ ...b, [scene.id]: true }));
    try {
      const out = await api.post('/api/elevenlabs/tts', { text: scene.voiceover, voiceId: voice.voiceId, settings, projectId: project.id, sceneId: scene.id });
      update((p) => ({ voice: { ...p.voice, clips: { ...(p.voice?.clips || {}), [scene.id]: { url: out.url, assetId: out.assetId, hash: hashText(scene.voiceover), generatedAt: new Date().toISOString(), voiceId: voice.voiceId, settings } } } }));
      store.refreshActivity();
      return true;
    } catch (err) {
      store.toast(`Scene ${project.scenes.findIndex((s) => s.id === scene.id) + 1}: ${err.message}`, 'bad', 6000);
      return false;
    } finally {
      setBusy((b) => ({ ...b, [scene.id]: false }));
    }
  };

  const runBatch = async (list, label) => {
    if (!list.length) return store.toast('Nothing to generate.', 'info');
    setBatch({ label, done: 0, total: list.length });
    let ok = 0;
    for (const s of list) {
      // eslint-disable-next-line no-await-in-loop
      if (await generateScene(s)) ok += 1;
      setBatch((b) => b && { ...b, done: b.done + 1 });
    }
    setBatch(null);
    store.toast(`${label}: ${ok}/${list.length} scene(s) generated`, ok === list.length ? 'ok' : 'warn');
    if (ok) store.logActivity('projects', project.id, `Generated voiceover for ${ok} scene(s) in “${project.title}”`);
  };

  const testSettings = async () => {
    setBusy((b) => ({ ...b, test: true }));
    try {
      const sample = project.scenes?.[0]?.voiceover || 'Most people start trading because they want to become rich. That is exactly where the problem begins.';
      const out = await api.post('/api/elevenlabs/tts', { text: sample.slice(0, 220), voiceId: voice.voiceId, settings, preview: true });
      play(out.url, 'test');
    } catch (err) { store.toast(err.message, 'bad'); } finally { setBusy((b) => ({ ...b, test: false })); }
  };

  const syncToAudio = () => {
    const scenes = (project.scenes || []).map((s) => {
      const clip = voice.clips?.[s.id];
      const d = clip?.url && durations[clip.url];
      return d ? { ...s, end: s.start + d + 0.3 } : s;
    });
    update({ scenes: retime(scenes) });
    store.toast('Scene timestamps synced to voiceover lengths', 'ok');
  };

  if (eleven.loading && !eleven.status) return <Spinner label="Checking ElevenLabs connection…" />;

  const scenes = (project.scenes || []).filter((s) => s.voiceover?.trim());
  const missing = scenes.filter((s) => clipState(project, s) === 'missing');
  const stale = scenes.filter((s) => clipState(project, s) === 'stale');
  const vs = voiceStatus(project);
  const total = Math.max(1, totalDuration(project.scenes));
  const selectedVoice = eleven.voices?.find((v) => v.id === voice.voiceId);
  const visibleVoices = (eleven.voices || []).filter((v) => !filter || v.name.toLowerCase().includes(filter.toLowerCase()) || Object.values(v.labels).join(' ').toLowerCase().includes(filter.toLowerCase()));
  const hasRealClips = Object.values(voice.clips || {}).some((c) => c.url);

  return (
    <div className="col gap">
      {!connected ? (
        <Panel><ElevenConnect eleven={eleven} /></Panel>
      ) : (
        <div className="voice-top">
          <Panel title="Voice" subtitle={`Default voice: Quentin${eleven.quentin ? '' : ' (not found in your account — pick another)'}`}
            actions={<><Badge tone="ok" dot>Connected{eleven.status?.subscription ? ` · ${eleven.status.subscription.tier}` : ''}</Badge><IconButton icon="refresh" title="Reload voices" onClick={eleven.refresh} /></>}>
            {eleven.status?.subscription && (
              <div className="quota">
                <span className="small muted">Characters used: {eleven.status.subscription.used?.toLocaleString()} / {eleven.status.subscription.limit?.toLocaleString()}</span>
                <div className="bar"><i style={{ width: `${Math.min(100, (eleven.status.subscription.used / Math.max(1, eleven.status.subscription.limit)) * 100)}%` }} /></div>
              </div>
            )}
            <input className="input" placeholder="Search voices (name, accent, style)…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <div className="voice-list">
              {eleven.voices == null ? <Spinner /> : visibleVoices.map((v) => (
                <div key={v.id} className={`voice-item ${voice.voiceId === v.id ? 'on' : ''}`} onClick={() => setVoice({ voiceId: v.id, voiceName: v.name })}>
                  <IconButton icon={nowPlaying === v.id ? 'pause' : 'play'} title="Play ElevenLabs preview" disabled={!v.previewUrl} onClick={(e) => { e.stopPropagation(); play(v.previewUrl, v.id); }} />
                  <div className="grow">
                    <b>{v.name}</b> {v.name === eleven.quentin?.name && <Badge tone="accent">Default</Badge>}
                    <div className="small muted">{[v.labels.accent, v.labels.gender, v.labels.age, v.labels.description || v.labels.use_case, v.category].filter(Boolean).join(' · ')}</div>
                  </div>
                  {voice.voiceId === v.id && <Icon name="check" size={16} className="accent-text" />}
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Voice settings" subtitle={selectedVoice ? `Applied to ${selectedVoice.name}` : 'Select a voice'}>
            <Slider label="Stability" value={settings.stability} onChange={(v) => setSettings({ stability: v })} format={(v) => v.toFixed(2)} />
            <Slider label="Similarity" value={settings.similarity} onChange={(v) => setSettings({ similarity: v })} format={(v) => v.toFixed(2)} />
            <Slider label="Style exaggeration" value={settings.style} onChange={(v) => setSettings({ style: v })} format={(v) => v.toFixed(2)} />
            <Slider label="Speaking speed" value={settings.speed} min={0.7} max={1.2} step={0.01} onChange={(v) => setSettings({ speed: v })} format={(v) => `${v.toFixed(2)}×`} />
            <Toggle label="Speaker boost" checked={settings.speakerBoost} onChange={(v) => setSettings({ speakerBoost: v })} />
            <div className="row gap-s wrap">
              <Button icon="volume" loading={busy.test} disabled={!voice.voiceId} onClick={testSettings}>Preview with these settings</Button>
              <Button variant="ghost" onClick={() => { store.updateSettings({ voiceSettings: settings, defaults: { voiceId: voice.voiceId, voiceName: voice.voiceName } }); store.toast('Saved as default voice & settings', 'ok'); }}>Save as default</Button>
            </div>
            <p className="small muted">Previews use your ElevenLabs character quota and are not attached to the project.</p>
          </Panel>
        </div>
      )}

      <Panel title="Scene voiceovers" subtitle="Each scene is generated separately so you can regenerate only what changed."
        actions={<>
          <Badge tone={STATUS_TONE[vs]} dot>{STATUS_LABEL[vs]}</Badge>
          {hasRealClips && <a className="btn btn-default btn-sm" href={`/api/projects/${project.id}/voiceover.mp3`} download><Icon name="download" size={14} /><span>Download full voiceover</span></a>}
        </>}>
        {!scenes.length ? (
          <Empty icon="film" title="No scenes with voiceover text">Build scenes from the script first — each scene’s voiceover becomes one audio clip.</Empty>
        ) : (
          <>
            <div className="row gap-s wrap voice-actions">
              <Button variant="primary" icon="mic" disabled={!connected || !voice.voiceId || !!batch || !missing.length} onClick={() => runBatch(missing, 'Generate missing')}>Generate voiceover ({missing.length} missing)</Button>
              <Button icon="refresh" disabled={!connected || !voice.voiceId || !!batch || !stale.length} onClick={() => runBatch(stale, 'Regenerate changed')}>Regenerate changed scenes ({stale.length})</Button>
              <Button variant="ghost" icon="refresh" disabled={!connected || !voice.voiceId || !!batch} onClick={() => window.confirm(`Regenerate all ${scenes.length} scenes? This uses ElevenLabs credits.`) && runBatch(scenes, 'Regenerate all')}>Regenerate all</Button>
              <Button variant="ghost" icon="clock" disabled={!Object.keys(durations).length} onClick={syncToAudio} title="Set each scene’s duration to its audio length">Sync timestamps to audio</Button>
              {batch && <span className="small accent-text"><span className="spinner" /> {batch.label}: {batch.done}/{batch.total}</span>}
            </div>
            {!connected && <div className="notice warn"><Icon name="alert" size={14} /> Connect ElevenLabs above to generate audio.</div>}

            <div className="audio-timeline">
              <div className="at-ruler">{Array.from({ length: Math.ceil(total / 5) + 1 }, (_, i) => <span key={i} style={{ left: `${(i * 5 / total) * 100}%` }}>{i * 5}s</span>)}</div>
              <div className="at-track">
                {project.scenes.map((s, i) => {
                  const st = clipState(project, s);
                  const clip = voice.clips?.[s.id];
                  const d = clip?.url ? durations[clip.url] : null;
                  const over = d && d > s.end - s.start + 0.05;
                  return (
                    <div key={s.id} className={`at-block st-${st} ${over ? 'over' : ''}`} style={{ left: `${(s.start / total) * 100}%`, width: `${((s.end - s.start) / total) * 100}%` }} title={`Scene ${i + 1}: ${st}${d ? ` · audio ${d.toFixed(1)}s` : ''}`}>
                      {d && <i className="at-audio" style={{ width: `${Math.min(100, (d / (s.end - s.start)) * 100)}%` }} />}
                      <span>{i + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div className="at-legend small muted"><i className="st-ready" /> generated <i className="st-stale" /> text changed <i className="st-missing" /> missing <i className="over-legend" /> audio longer than scene</div>
            </div>

            <div className="scene-voice-list">
              {project.scenes.map((s, i) => {
                const st = clipState(project, s);
                const clip = voice.clips?.[s.id];
                const d = clip?.url ? durations[clip.url] : null;
                return (
                  <div key={s.id} className={`sv-row st-${st}`}>
                    <span className="scene-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mono small">{fmtTime(s.start)}–{fmtTime(s.end)}</span>
                    <p className="grow">{s.voiceover || <em className="muted">No text</em>}</p>
                    <Badge tone={{ ready: 'ok', sample: 'muted', stale: 'bad', missing: 'muted' }[st]}>{{ ready: d ? `${d.toFixed(1)}s` : 'Ready', sample: 'Sample (no audio)', stale: 'Text changed', missing: 'Not generated' }[st]}</Badge>
                    <div className="row gap-xs">
                      {clip?.url && <IconButton icon={nowPlaying === s.id ? 'pause' : 'play'} title="Play" onClick={() => play(clip.url, s.id)} />}
                      {clip?.url && <a className="icon-btn" href={clip.url} download={`scene-${i + 1}.mp3`} title="Download"><Icon name="download" size={16} /></a>}
                      <Button size="sm" variant={st === 'stale' ? 'primary' : 'default'} loading={busy[s.id]} disabled={!connected || !voice.voiceId || !s.voiceover?.trim() || !!batch} onClick={() => generateScene(s)}>
                        {st === 'missing' || st === 'sample' ? 'Generate' : 'Regenerate'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
