import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { useRoute } from '../lib/router.js';
import { Button, Panel, Tabs, Empty, Confirm, Prompt, Menu, Badge, fmtDate } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { VisualLibraryGrid } from '../components/VisualsEditor.jsx';

const TABS = [
  { id: 'all', label: 'All files', icon: 'folder' },
  { id: 'image', label: 'Images', icon: 'image' },
  { id: 'audio', label: 'Audio & music', icon: 'music' },
  { id: 'voiceover', label: 'Voiceovers', icon: 'mic' },
  { id: 'video', label: 'Video', icon: 'film' },
  { id: 'visuals', label: 'Visual elements', icon: 'layers' },
];

const size = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${Math.round(b / 1e3)} KB` : b ? `${b} B` : '—');

export default function AssetLibrary() {
  const store = useStore();
  const { query } = useRoute();
  const [tab, setTab] = useState(query.get('tab') || 'all');
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [q, setQ] = useState('');
  const input = useRef(null);

  const upload = async (files) => {
    const list = [...files];
    if (!list.length) return;
    setBusy(list.length);
    for (const f of list) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await store.uploadAsset(f, f.type.startsWith('audio') ? ['music'] : []);
      } catch (e) { store.toast(`${f.name}: ${e.message}`, 'bad'); }
      setBusy((n) => n - 1);
    }
    store.toast(`Uploaded ${list.length} file(s)`, 'ok');
  };

  const isVo = (a) => (a.tags || []).includes('voiceover');
  const filtered = store.assets.filter((a) => {
    if (tab === 'image' && a.kind !== 'image') return false;
    if (tab === 'audio' && (a.kind !== 'audio' || isVo(a))) return false;
    if (tab === 'voiceover' && !isVo(a)) return false;
    if (tab === 'video' && a.kind !== 'video') return false;
    return !q || a.name.toLowerCase().includes(q.toLowerCase()) || (a.tags || []).join(' ').includes(q.toLowerCase());
  });
  const counts = { all: store.assets.length, image: store.assets.filter((a) => a.kind === 'image').length, audio: store.assets.filter((a) => a.kind === 'audio' && !isVo(a)).length, voiceover: store.assets.filter(isVo).length, video: store.assets.filter((a) => a.kind === 'video').length };

  return (
    <div className="page"
      onDragOver={(e) => { if (tab !== 'visuals') { e.preventDefault(); setDrag(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDrag(false); }}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (tab !== 'visuals') upload(e.dataTransfer.files); }}>
      <header className="page-head">
        <div>
          <p className="eyebrow">Asset Library</p>
          <h1>Assets</h1>
          <p className="muted">Reference images, music, generated voiceovers and the code-animation library.</p>
        </div>
        <div className="row gap-s">
          <input ref={input} type="file" multiple hidden accept="image/*,audio/*,video/mp4" onChange={(e) => { upload(e.target.files); e.target.value = ''; }} />
          <Button variant="primary" icon="upload" loading={busy > 0} onClick={() => input.current?.click()}>{busy ? `Uploading ${busy}…` : 'Upload files'}</Button>
        </div>
      </header>

      <div className="row between wrap gap-s">
        <Tabs tabs={TABS.map((t) => ({ ...t, badge: counts[t.id] }))} value={tab} onChange={setTab} />
        {tab !== 'visuals' && <div className="search"><Icon name="search" size={15} /><input placeholder="Search assets…" value={q} onChange={(e) => setQ(e.target.value)} /></div>}
      </div>

      {tab === 'visuals' ? (
        <Panel title="Code animation & visual library" subtitle="Add these to scenes from a project’s Visuals tab, where speed, color, opacity, blur, glow, position, scale, duration and layer order are editable.">
          <VisualLibraryGrid />
        </Panel>
      ) : (
        <div className={`dropzone-wrap ${drag ? 'dragging' : ''}`}>
          {drag && <div className="dropzone-overlay"><Icon name="upload" size={32} /> Drop files to upload</div>}
          {filtered.length ? (
            <div className="asset-grid">
              {filtered.map((a) => (
                <article key={a.id} className="asset-card panel">
                  <div className="asset-preview">
                    {a.kind === 'image' && <img src={a.url} alt={a.name} loading="lazy" />}
                    {a.kind === 'audio' && <div className="audio-prev"><Icon name={isVo(a) ? 'mic' : 'music'} size={28} /><audio controls preload="none" src={a.url} /></div>}
                    {a.kind === 'video' && <video src={a.url} controls preload="metadata" />}
                  </div>
                  <div className="asset-body">
                    <div className="row between start">
                      <b className="clamp-2">{a.name}</b>
                      <Menu items={[
                        { label: 'Rename', icon: 'type', onClick: () => setDialog({ type: 'rename', asset: a }) },
                        { label: 'Download', icon: 'download', onClick: () => { const l = document.createElement('a'); l.href = a.url; l.download = a.name; l.click(); } },
                        { label: 'Delete', icon: 'trash', danger: true, onClick: () => setDialog({ type: 'delete', asset: a }) },
                      ]} />
                    </div>
                    <div className="row gap-xs wrap">{(a.tags || []).map((t) => <Badge key={t} tone="muted">{t}</Badge>)}</div>
                    <span className="small muted">{size(a.size)} · {fmtDate(a.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty icon="upload" title="No assets here yet" action={<Button icon="upload" onClick={() => input.current?.click()}>Upload files</Button>}>Drag & drop images, music or video anywhere on this page.</Empty>
          )}
        </div>
      )}

      <Prompt open={dialog?.type === 'rename'} title="Rename asset" label="Name" initial={dialog?.asset?.name || ''} confirmLabel="Rename" onClose={() => setDialog(null)}
        onSubmit={(name) => { store.editDoc('assets', dialog.asset.id, { name }, { immediate: true }); setDialog(null); }} />
      <Confirm open={dialog?.type === 'delete'} danger title="Delete asset" confirmLabel="Delete" onClose={() => setDialog(null)}
        message={`Delete “${dialog?.asset?.name}”? The file is removed from the server.${(dialog?.asset?.tags || []).includes('voiceover') ? ' Projects using this clip will show it as missing.' : ''}`}
        onConfirm={async () => { try { await store.deleteDoc('assets', dialog.asset.id); store.toast('Asset deleted', 'ok'); setDialog(null); } catch (e) { store.toast(e.message, 'bad', 6000); } }} />
    </div>
  );
}
