import React, { useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { Button, Panel, Select, Slider, ColorInput, Toggle, Chips, Empty, IconButton, Badge } from './ui.jsx';
import TimelinePlayer from './TimelinePlayer.jsx';
import { captionsFromScenes, retimeCaptionWords, fmtTime, parseTime } from '../../shared/scenes.js';
import { CAPTION_FONTS, CAPTION_ANIMATIONS, defaultCaptionStyle } from '../../shared/defaults.js';

export default function CaptionsEditor({ project, update, character }) {
  const store = useStore();
  const cap = project.captions || { items: [], style: defaultCaptionStyle(), mode: 'sentence' };
  const style = { ...defaultCaptionStyle(), ...cap.style };
  const items = cap.items || [];
  const [selected, setSelected] = useState(null);
  const presets = store.presets.filter((p) => p.kind === 'caption');

  const setCap = (patch) => update((p) => ({ captions: { ...p.captions, ...patch } }));
  const setStyle = (patch) => setCap({ style: { ...style, ...patch } });
  const setItem = (id, patch, retimeWords) => setCap({ items: items.map((c) => (c.id === id ? (retimeWords ? retimeCaptionWords({ ...c, ...patch }) : { ...c, ...patch }) : c)) });

  const generate = async (mode = cap.mode) => {
    if (items.length && !(await store.ask({ title: 'Regenerate captions', message: 'Replace the current captions with freshly generated ones? Manual caption edits will be lost (the script is not affected).', confirmLabel: 'Replace captions' }))) return;
    const next = captionsFromScenes(project.scenes || [], mode);
    setCap({ items: next, mode, generatedAt: new Date().toISOString() });
    store.toast(`Generated ${next.length} captions from scene ${mode === 'word' ? 'text (word bursts)' : 'text (sentences)'}`, 'ok');
  };

  const commitTime = (c, key, raw) => {
    const v = parseTime(raw);
    if (!Number.isFinite(v) || v < 0) return store.toast('Invalid time', 'warn');
    if ((key === 'start' && v >= c.end) || (key === 'end' && v <= c.start)) return store.toast('End must be after start', 'warn');
    setItem(c.id, { [key]: +v.toFixed(2) }, true);
  };

  const split = (c) => {
    const words = c.text.split(/\s+/);
    if (words.length < 2) return;
    const half = Math.ceil(words.length / 2);
    const mid = +(c.start + (c.end - c.start) * (half / words.length)).toFixed(2);
    const a = retimeCaptionWords({ ...c, text: words.slice(0, half).join(' '), end: mid });
    const b = retimeCaptionWords({ ...c, id: `${c.id}b${Date.now().toString(36)}`, text: words.slice(half).join(' '), start: mid });
    setCap({ items: items.flatMap((x) => (x.id === c.id ? [a, b] : [x])) });
  };

  const merge = (idx) => {
    const a = items[idx];
    const b = items[idx + 1];
    if (!b) return;
    const m = retimeCaptionWords({ ...a, text: `${a.text} ${b.text}`, end: b.end });
    setCap({ items: items.filter((x) => x.id !== b.id).map((x) => (x.id === a.id ? m : x)) });
  };

  const add = () => {
    const last = items[items.length - 1];
    const c = retimeCaptionWords({ id: `cap_${Date.now().toString(36)}`, start: last ? last.end : 0, end: (last ? last.end : 0) + 2, text: 'New caption', words: [] });
    setCap({ items: [...items, c] });
    setSelected(c.id);
  };

  return (
    <div className="captions-layout">
      <div className="col gap">
        <Panel title="Captions" subtitle="Independent from the voiceover script — editing captions never changes the script."
          actions={<>
            <Select value={cap.mode} onChange={(e) => setCap({ mode: e.target.value })} options={[{ value: 'sentence', label: 'Sentence-based' }, { value: 'word', label: 'Word-by-word bursts' }]} />
            <Button variant="primary" icon="sparkles" disabled={!project.scenes?.length} onClick={() => generate()}>{items.length ? 'Regenerate captions' : 'Generate captions'}</Button>
          </>}>
          {!items.length ? (
            <Empty icon="type" title="No captions yet">{project.scenes?.length ? 'Generate captions automatically from the scene voiceover / caption text, then fine-tune text and timing.' : 'Build scenes first, then generate captions from them.'}</Empty>
          ) : (
            <div className="caption-list">
              {items.map((c, i) => (
                <div key={c.id} className={`cap-row ${selected === c.id ? 'on' : ''}`} onClick={() => setSelected(c.id)}>
                  <span className="mono small muted">{String(i + 1).padStart(2, '0')}</span>
                  <TimeInput value={c.start} onCommit={(v) => commitTime(c, 'start', v)} />
                  <TimeInput value={c.end} onCommit={(v) => commitTime(c, 'end', v)} />
                  <input className="input grow" value={c.text} onChange={(e) => setItem(c.id, { text: e.target.value }, true)} />
                  <div className="row gap-xs">
                    <IconButton icon="scissors" title="Split caption" onClick={(e) => { e.stopPropagation(); split(c); }} />
                    <IconButton icon="down" title="Merge with next" disabled={i === items.length - 1} onClick={(e) => { e.stopPropagation(); merge(i); }} />
                    <IconButton icon="trash" title="Delete caption" onClick={(e) => { e.stopPropagation(); setCap({ items: items.filter((x) => x.id !== c.id) }); }} />
                  </div>
                  {selected === c.id && c.words?.length > 0 && (
                    <div className="word-timings">
                      {c.words.map((w, k) => <span key={k} className="word-chip" title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s`}>{w.w}<em>{w.start.toFixed(1)}</em></span>)}
                    </div>
                  )}
                </div>
              ))}
              <Button size="sm" variant="ghost" icon="plus" onClick={add}>Add caption</Button>
            </div>
          )}
        </Panel>
      </div>

      <div className="col gap">
        <Panel title="Caption preview" subtitle={`${items.length} captions`}>
          <div className="preview-wrap small-preview">
            <TimelinePlayer project={project} character={character} startAt={items.find((c) => c.id === selected)?.start ?? 0} playAudio />
          </div>
        </Panel>
        <Panel title="Caption style" actions={
          <Select value="" onChange={(e) => { const p = presets.find((x) => x.id === e.target.value); if (p) { setStyle(p.data); store.toast(`Applied preset “${p.name}”`, 'ok'); } }}
            options={[{ value: '', label: 'Apply preset…' }, ...presets.map((p) => ({ value: p.id, label: p.name }))]} />}>
          <div className="field"><span className="field-label">Animation</span><Chips options={CAPTION_ANIMATIONS.map((a) => ({ value: a.id, label: a.label }))} value={style.animation} onChange={(v) => setStyle({ animation: v })} /></div>
          <div className="grid-2">
            <Select label="Font" value={style.font} onChange={(e) => setStyle({ font: e.target.value })} options={CAPTION_FONTS} />
            <Select label="Font weight" value={style.weight} onChange={(e) => setStyle({ weight: Number(e.target.value) })} options={[400, 500, 600, 700, 800, 900].map((w) => ({ value: w, label: String(w) }))} />
          </div>
          <Slider label="Font size (px at 1080p)" value={style.size} min={28} max={120} step={1} onChange={(v) => setStyle({ size: v })} format={(v) => `${v}px`} />
          <div className="grid-2">
            <ColorInput label="Text color" value={style.color} onChange={(v) => setStyle({ color: v })} />
            <ColorInput label="Highlight color" value={style.highlight} onChange={(v) => setStyle({ highlight: v })} />
            <ColorInput label="Outline color" value={style.outlineColor} onChange={(v) => setStyle({ outlineColor: v })} />
            <Slider label="Outline" value={style.outline} min={0} max={12} step={1} onChange={(v) => setStyle({ outline: v })} format={(v) => `${v}px`} />
          </div>
          <Slider label="Shadow" value={style.shadow} min={0} max={40} step={1} onChange={(v) => setStyle({ shadow: v })} format={(v) => `${v}px`} />
          <div className="grid-2">
            <div className="field"><span className="field-label">Position</span><Chips options={['upper', 'middle', 'lower']} value={style.position} onChange={(v) => setStyle({ position: v })} /></div>
            <div className="field"><span className="field-label">Alignment</span><Chips options={['left', 'center', 'right']} value={style.align} onChange={(v) => setStyle({ align: v })} /></div>
          </div>
          <Toggle label="Uppercase" checked={style.uppercase} onChange={(v) => setStyle({ uppercase: v })} />
          <div className="row gap-s">
            <Button size="sm" variant="ghost" onClick={async () => {
              const name = await store.askText({ title: 'Save caption preset', label: 'Preset name', initial: 'My caption style' });
              if (!name) return;
              try { await store.createDoc('presets', { kind: 'caption', name, data: style }); store.toast('Caption preset saved', 'ok'); } catch (e) { store.toast(e.message, 'bad'); }
            }}>Save as global preset</Button>
            {cap.generatedAt && <Badge tone="muted">Auto-generated {new Date(cap.generatedAt).toLocaleDateString()}</Badge>}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TimeInput({ value, onCommit }) {
  const [v, setV] = useState(fmtTime(value));
  React.useEffect(() => setV(fmtTime(value)), [value]);
  return <input className="input mono time-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onCommit(v)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} onClick={(e) => e.stopPropagation()} />;
}
