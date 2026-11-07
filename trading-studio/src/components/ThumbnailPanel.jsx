import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { Button, Panel, Input, Select, Chips, ColorInput, Toggle, Empty } from './ui.jsx';
import ThumbnailArt, { THUMB_TEMPLATES, defaultThumb, svgToPng } from './ThumbnailArt.jsx';

export default function ThumbnailPanel({ project, update }) {
  const store = useStore();
  const ref = useRef(null);
  const [busy, setBusy] = useState(null);
  const t = { ...defaultThumb(project), ...(project.thumb || {}) };
  const set = (patch) => update((p) => ({ thumb: { ...defaultThumb(p), ...(p.thumb || {}), ...patch } }));
  const examples = (project.examples || []).filter((e) => e.kind === 'historical');
  const ex = examples.find((e) => e.id === t.exampleId) || examples[0];
  const fileName = `${project.title.replace(/[^\w-]+/g, '_')}_${t.template}_thumbnail.png`;

  const download = async () => {
    setBusy('download');
    try {
      const png = await svgToPng(ref.current);
      await api.saveFile(png, fileName);
    } catch (e) { if (e?.code !== 'declined') store.toast(e.message || 'Export failed', 'bad'); } finally { setBusy(null); }
  };
  const toLibrary = async () => {
    setBusy('lib');
    try {
      const png = await svgToPng(ref.current);
      await store.uploadAsset(new File([png], fileName, { type: 'image/png' }), ['thumbnail']);
      store.toast('Thumbnail saved to the Asset Library', 'ok');
    } catch (e) { store.toast(e.message, 'bad'); } finally { setBusy(null); }
  };

  return (
    <div className="thumb-layout">
      <Panel title="Thumbnail preview" subtitle="1280 × 720 · built from this video’s real chart">
        <div className="thumb-preview"><ThumbnailArt ref={ref} project={project} /></div>
        <div className="row gap-s wrap">
          <Button variant="primary" icon="download" loading={busy === 'download'} onClick={download}>Download PNG</Button>
          <Button icon="image" loading={busy === 'lib'} onClick={toLibrary}>Save to Asset Library</Button>
        </div>
        {!examples.length && <Empty icon="chart" title="No real chart example yet">Approve an example in Chart Research so the thumbnail can show the actual chart.</Empty>}
      </Panel>
      <Panel title="Thumbnail settings">
        <div className="field"><span className="field-label">Style</span>
          <Chips options={THUMB_TEMPLATES.map((x) => ({ value: x.id, label: x.label }))} value={t.template} onChange={(v) => set({ template: v })} /></div>
        <Input label="Headline" value={t.headline} onChange={(e) => set({ headline: e.target.value })} hint="Short and readable on a phone: 2–4 words work best." />
        <Input label="Sub-line" value={t.subline} onChange={(e) => set({ subline: e.target.value })} />
        <Input label="Tag" value={t.tag} onChange={(e) => set({ tag: e.target.value })} placeholder="e.g. FVG" />
        {examples.length > 0 && <Select label="Chart example" value={ex?.id || ''} onChange={(e) => set({ exampleId: e.target.value, stepId: null })} options={examples.map((x, k) => ({ value: x.id, label: `#${k + 1} ${x.summary.slice(0, 60)}` }))} />}
        {ex?.steps?.length > 0 && <Select label="Chart moment" value={t.stepId || ''} onChange={(e) => set({ stepId: e.target.value || null })} options={[{ value: '', label: 'Automatic (the key step)' }, ...ex.steps.map((s) => ({ value: s.id, label: s.label }))]} />}
        {t.template === 'chart' && <>
          <ColorInput label="Accent color" value={t.accent} onChange={(v) => set({ accent: v })} />
          <Toggle label="Arrow pointing at the chart" checked={t.arrow} onChange={(v) => set({ arrow: v })} />
        </>}
        <Button size="sm" variant="ghost" icon="refresh" onClick={() => update({ thumb: null })}>Reset to defaults</Button>
        <p className="small muted">The chart is the real example from this video, and the date and instrument appear on the thumbnail.</p>
      </Panel>
    </div>
  );
}
