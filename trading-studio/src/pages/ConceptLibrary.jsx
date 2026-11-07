import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { createProject } from '../lib/actions.js';
import { Button, Panel, Input, TextArea, Select, Badge, Modal, Confirm, IconButton } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { CONCEPTS, CATEGORIES } from '../../shared/concepts.js';
import { DETECTORS } from '../../shared/detectors.js';
import { TIMEFRAMES } from '../../shared/market.js';

const EMPTY = { name: '', short: '', category: 'Custom', detector: '', conditions: '', hook: '', simple: '', technical: '', takeaway: '', timeframes: ['5m', '15m'] };

export default function ConceptLibrary() {
  const store = useStore();
  const custom = store.settings?.customConcepts || [];
  const all = [...CONCEPTS, ...custom.map((c) => ({ ...c, category: 'Custom', custom: true }))];
  const [selected, setSelected] = useState(all[0]?.id);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);
  const [del, setDel] = useState(null);
  const c = all.find((x) => x.id === selected) || all[0];
  const used = (id) => store.projects.filter((p) => p.conceptId === id).length;

  const saveCustom = (draft) => {
    const id = draft.id || `custom_${Date.now().toString(36)}`;
    const next = draft.id ? custom.map((x) => (x.id === id ? { ...draft } : x)) : [...custom, { ...draft, id }];
    store.updateSettings({ customConcepts: next });
    setSelected(id);
    setEditing(null);
    store.toast('Concept saved', 'ok');
  };

  const newVideo = async () => {
    try {
      const p = await createProject(store, { conceptId: c.id, title: `${c.name} explained` }, { open: false });
      navigate(`/research?concept=${c.id}&project=${p.id}`);
    } catch (e) { store.toast(e.message, 'bad'); }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Concept Library</p>
          <h1>Trading concepts</h1>
          <p className="muted">Choose what to teach. Each concept knows which market conditions demonstrate it and how to find them in real data.</p>
        </div>
        <Button variant="primary" icon="plus" onClick={() => setEditing({ ...EMPTY })}>Create custom concept</Button>
      </header>

      <div className="concept-layout">
        <div className="col gap">
          <div className="search"><Icon name="search" size={15} /><input placeholder="Search concepts…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          {CATEGORIES.map((cat) => {
            const list = all.filter((x) => x.category === cat && (!q || `${x.name} ${x.short}`.toLowerCase().includes(q.toLowerCase())));
            if (!list.length) return null;
            return (
              <Panel key={cat} title={cat} subtitle={`${list.length} topics`} pad={false}>
                <div className="concept-list">
                  {list.map((x) => (
                    <button key={x.id} className={`concept-item ${x.id === c?.id ? 'on' : ''}`} onClick={() => setSelected(x.id)}>
                      <span className="concept-short">{x.short}</span>
                      <span className="grow">{x.name}</span>
                      {used(x.id) > 0 && <Badge tone="accent">{used(x.id)}</Badge>}
                    </button>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>

        {c && (
          <Panel title={c.name} subtitle={c.category} actions={c.custom && <>
            <IconButton icon="edit" title="Edit" onClick={() => setEditing({ ...c })} />
            <IconButton icon="trash" title="Delete" onClick={() => setDel(c)} />
          </>}>
            <div className="concept-detail">
              <section><h5 className="sub">In plain words</h5><p>{c.simple || '—'}</p></section>
              <section><h5 className="sub">Technical definition</h5><p>{c.technical || '—'}</p></section>
              <section><h5 className="sub">What a real example needs</h5><p>{c.conditions || '—'}</p></section>
              <section>
                <h5 className="sub">Typical timeframes</h5>
                <div className="row gap-xs wrap">{(c.timeframes || []).map((t) => <Badge key={t} tone="muted">{TIMEFRAMES.find((x) => x.id === t)?.label || t}</Badge>)}</div>
              </section>
              <section>
                <h5 className="sub">Real-chart detection</h5>
                <p className="small">{c.detector ? <><Icon name="check" size={12} className="ok-text" /> Automatic: scans real bars for this pattern and builds the teaching steps.</> : 'Manual: use screenshots or chart exports and describe the example yourself.'}</p>
              </section>
              {c.hook && <section><h5 className="sub">Opening hook</h5><p className="quote">{c.hook}</p></section>}
              <section><h5 className="sub">Takeaway</h5><p>{c.takeaway || '—'}</p></section>
            </div>
            <div className="row gap-s wrap">
              <Button variant="primary" icon="search" onClick={() => navigate(`/research?concept=${c.id}`)}>Find real chart examples</Button>
              <Button icon="film" onClick={newVideo}>New video on this concept</Button>
            </div>
          </Panel>
        )}
      </div>

      <ConceptEditor draft={editing} onClose={() => setEditing(null)} onSave={saveCustom} />
      <Confirm open={!!del} danger title="Delete concept" confirmLabel="Delete" onClose={() => setDel(null)}
        message={`Delete “${del?.name}”? Projects using it keep their scripts and examples.`}
        onConfirm={() => { store.updateSettings({ customConcepts: custom.filter((x) => x.id !== del.id) }); setDel(null); setSelected(CONCEPTS[0].id); }} />
    </div>
  );
}

function ConceptEditor({ draft, onClose, onSave }) {
  const [d, setD] = useState(draft);
  React.useEffect(() => setD(draft), [draft]);
  if (!draft || !d) return null;
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  return (
    <Modal open title={d.id ? 'Edit concept' : 'Create custom concept'} onClose={onClose} width={720}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!d.name.trim()} onClick={() => onSave({ ...d, short: d.short || d.name.slice(0, 10), detector: d.detector || null })}>Save concept</Button></>}>
      <div className="brief-grid">
        <Input label="Name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Silver Bullet" />
        <Input label="Short label" value={d.short} onChange={(e) => set({ short: e.target.value })} placeholder="e.g. SB" />
        <Select label="Find real examples using" value={d.detector || ''} onChange={(e) => set({ detector: e.target.value })}
          options={[{ value: '', label: 'No detector (screenshots / manual)' }, ...Object.keys(DETECTORS).map((k) => ({ value: k, label: `Detector: ${k}` }))]} className="span-2" />
        <TextArea label="Plain-language explanation" rows={3} value={d.simple} onChange={(e) => set({ simple: e.target.value })} className="span-2" />
        <TextArea label="Technical definition" rows={3} value={d.technical} onChange={(e) => set({ technical: e.target.value })} className="span-2" />
        <TextArea label="What a real example needs" rows={2} value={d.conditions} onChange={(e) => set({ conditions: e.target.value })} className="span-2" />
        <Input label="Opening hook" value={d.hook} onChange={(e) => set({ hook: e.target.value })} className="span-2" />
        <Input label="Takeaway" value={d.takeaway} onChange={(e) => set({ takeaway: e.target.value })} className="span-2" />
      </div>
    </Modal>
  );
}
