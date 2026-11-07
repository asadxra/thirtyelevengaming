import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { Button, Panel, Input, TextArea, Select, Badge, IconButton, Modal, timeAgo } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { SCRIPT_THEMES, EMOTIONAL_DIRECTIONS, STORY_STYLES, TONES, SECTIONS, SECTION_LABELS } from '../../shared/defaults.js';
import { splitSentences, wordCount, estimateDuration, fmtShort } from '../../shared/scenes.js';

const SECTION_HELP = {
  hook: 'Capture attention immediately (first 2–3 seconds).',
  problem: 'Present a relatable trading struggle.',
  story: 'Develop the message through storytelling.',
  realization: 'Deliver the important lesson.',
  conclusion: 'End with a powerful motivational statement.',
};

export default function ScriptEditor({ project, update }) {
  const store = useStore();
  const script = project.script;
  const claudeOn = !!store.integrations?.claude?.configured;
  const [engine, setEngine] = useState(script.engine === 'claude' && claudeOn ? 'claude' : 'local');
  const [busy, setBusy] = useState(null);
  const [briefOpen, setBriefOpen] = useState(!SECTIONS.some((s) => script.sections[s]));
  const [sentenceView, setSentenceView] = useState({});
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [rewrite, setRewrite] = useState(null); // { section, start, end, text }
  const refs = useRef({});
  const hasText = SECTIONS.some((s) => (script.sections[s] || '').trim());
  const fullText = SECTIONS.map((s) => script.sections[s]).join(' ');
  const words = wordCount(fullText);
  const est = estimateDuration(fullText);
  const keep = store.settings?.storage?.keepScriptVersions || 15;

  const setScript = (patch) => update((p) => ({ script: { ...p.script, ...patch } }));
  const setInputs = (patch) => update((p) => ({ script: { ...p.script, inputs: { ...p.script.inputs, ...patch } } }));
  const setSection = (s, text) => update((p) => ({ script: { ...p.script, sections: { ...p.script.sections, [s]: text }, status: p.script.status === 'empty' ? 'draft' : p.script.status } }));

  const snapshot = (label) => (hasText ? [{ id: `v_${Date.now().toString(36)}`, label, at: new Date().toISOString(), sections: { ...script.sections } }, ...(script.versions || [])].slice(0, keep) : script.versions || []);

  const run = async (op, extra = {}, label) => {
    setBusy(op + (extra.section || ''));
    try {
      const res = await api.post('/api/script', { engine, op, inputs: script.inputs, sections: script.sections, tone: script.tone, ...extra });
      if (res.sections) {
        update((p) => ({
          script: {
            ...p.script,
            sections: res.sections,
            versions: snapshot(label || op),
            status: 'draft',
            engine,
            lastGeneratedAt: new Date().toISOString(),
          },
        }));
        store.toast(`${label || 'Script updated'}${engine === 'local' ? ' (local writer)' : ' (Claude)'}`, 'ok');
      }
      return res;
    } catch (err) {
      store.toast(err.message, 'bad', 6000);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = async () => {
    setScript({ versions: snapshot('Manual save'), status: hasText ? (script.status === 'completed' ? 'completed' : 'draft') : 'empty' });
    setTimeout(() => store.flushDoc('projects', project.id), 0);
    store.toast('Draft saved', 'ok');
  };

  const openRewrite = (s) => {
    const el = refs.current[s];
    const text = script.sections[s] || '';
    let start = 0, end = text.length;
    if (el && el.selectionEnd > el.selectionStart) { start = el.selectionStart; end = el.selectionEnd; }
    setRewrite({ section: s, start, end, text: text.slice(start, end), instruction: '' });
  };

  const doRewrite = async () => {
    const r = rewrite;
    const res = await run('rewrite', { text: r.text, instruction: r.instruction }, null);
    if (res?.text) {
      const full = script.sections[r.section] || '';
      const next = full.slice(0, r.start) + res.text + full.slice(r.end);
      update((p) => ({ script: { ...p.script, sections: { ...p.script.sections, [r.section]: next }, versions: snapshot(`Rewrite ${r.section}`) } }));
      store.toast('Passage rewritten', 'ok');
      setRewrite(null);
    }
  };

  const i = script.inputs;
  return (
    <div className="col gap">
      <Panel title="Script brief" subtitle="Everything the writer needs. Generation only runs when you click a button."
        actions={<Button variant="ghost" size="sm" icon={briefOpen ? 'up' : 'down'} onClick={() => setBriefOpen((o) => !o)}>{briefOpen ? 'Collapse' : 'Expand'}</Button>}>
        {briefOpen ? (
          <div className="brief-grid">
            <Input label="Video topic" placeholder="e.g. Why most traders quit after 3 months" value={i.topic} onChange={(e) => setInputs({ topic: e.target.value })} />
            <Select label="Theme" value={i.theme} onChange={(e) => setInputs({ theme: e.target.value })} options={SCRIPT_THEMES} />
            <Input label="Main message" placeholder="What should viewers walk away believing?" value={i.message} onChange={(e) => setInputs({ message: e.target.value })} className="span-2" />
            <Input label="Target audience" value={i.audience} onChange={(e) => setInputs({ audience: e.target.value })} />
            <Input label="Desired duration (seconds)" type="number" min={15} max={600} value={i.duration} onChange={(e) => setInputs({ duration: Number(e.target.value) })} />
            <Select label="Emotional direction" value={i.emotion} onChange={(e) => setInputs({ emotion: e.target.value })} options={EMOTIONAL_DIRECTIONS} />
            <Select label="Storytelling style" value={i.storyStyle} onChange={(e) => setInputs({ storyStyle: e.target.value })} options={STORY_STYLES} />
            <Input label="Main lesson" placeholder="e.g. Walk away after two losses" value={i.lesson} onChange={(e) => setInputs({ lesson: e.target.value })} />
            <Input label="Ending message" placeholder="The final line you want to land" value={i.ending} onChange={(e) => setInputs({ ending: e.target.value })} />
            <Input label="Optional keywords" placeholder="comma separated" value={i.keywords} onChange={(e) => setInputs({ keywords: e.target.value })} className="span-2" />
          </div>
        ) : (
          <p className="small muted">{i.theme} · {i.duration}s · {i.emotion} · {i.storyStyle}{i.topic ? ` · “${i.topic}”` : ''}</p>
        )}
      </Panel>

      <Panel pad={false} className="script-toolbar-panel">
        <div className="script-toolbar">
          <div className="row gap-s wrap">
            <Select value={engine} onChange={(e) => { setEngine(e.target.value); setScript({ engine: e.target.value }); }}
              options={[{ value: 'local', label: 'Writer · Local (offline)' }, { value: 'claude', label: claudeOn ? 'Writer · Claude' : 'Writer · Claude (not connected)' }]} />
            <Select value={script.tone} onChange={(e) => setScript({ tone: e.target.value })} options={TONES.map((t) => ({ value: t, label: `Tone · ${t}` }))} />
          </div>
          <div className="row gap-s wrap">
            {!hasText
              ? <Button variant="primary" icon="sparkles" loading={busy === 'generate'} disabled={engine === 'claude' && !claudeOn} onClick={() => run('generate', {}, 'Generated script')}>Generate script</Button>
              : <>
                <Button icon="refresh" loading={busy === 'variant'} onClick={() => run('variant', {}, 'Generated another version')}>Another version</Button>
                <Button icon="expand" loading={busy === 'expand'} onClick={() => run('expand', {}, 'Expanded script')}>Expand</Button>
                <Button icon="shrink" loading={busy === 'shorten'} onClick={() => run('shorten', {}, 'Shortened script')}>Shorten</Button>
                <Button icon="wand" loading={busy === 'tone'} onClick={() => run('tone', {}, `Changed tone to ${script.tone}`)}>Apply tone</Button>
              </>}
          </div>
        </div>
        {engine === 'claude' && !claudeOn && (
          <div className="notice warn"><Icon name="alert" size={14} /> Claude is not connected. <a href="#/settings/integrations">Connect it in Settings</a>, or switch to the local writer.</div>
        )}
        {engine === 'local' && (
          <div className="notice subtle"><Icon name="sparkles" size={14} /> The local writer composes scripts from a curated trading-psychology line bank and works offline. Connect Claude in Settings for fully original AI writing.</div>
        )}
      </Panel>

      <div className="script-meta row between wrap">
        <div className="row gap-s wrap">
          <Badge tone={script.status === 'completed' ? 'ok' : hasText ? 'warn' : 'muted'} dot>{script.status === 'completed' ? 'Completed' : hasText ? 'Draft' : 'Empty'}</Badge>
          <span className="small muted">{words} words · ~{fmtShort(est)} spoken · target {fmtShort(i.duration)}</span>
          {est > i.duration * 1.15 && <Badge tone="warn">Longer than target — try Shorten</Badge>}
          {hasText && est < i.duration * 0.7 && <Badge tone="warn">Shorter than target — try Expand</Badge>}
        </div>
        <div className="row gap-s">
          <Button size="sm" variant="ghost" icon="clock" onClick={() => setVersionsOpen(true)}>Versions ({(script.versions || []).length})</Button>
          <Button size="sm" icon="save" onClick={saveDraft}>Save draft</Button>
          {script.status === 'completed'
            ? <Button size="sm" icon="edit" onClick={() => setScript({ status: 'draft' })}>Reopen as draft</Button>
            : <Button size="sm" variant="primary" icon="check" disabled={!hasText} onClick={() => { setScript({ status: 'completed' }); store.logActivity('projects', project.id, `Completed script for “${project.title}”`); }}>Mark completed</Button>}
        </div>
      </div>

      {SECTIONS.map((s, idx) => {
        const text = script.sections[s] || '';
        const sv = sentenceView[s];
        return (
          <Panel key={s} className={`section-panel sec-${s}`} title={<span><span className="sec-num">{idx + 1}</span>{SECTION_LABELS[s].toUpperCase()}</span>} subtitle={SECTION_HELP[s]}
            actions={<>
              <span className="small muted">{wordCount(text)}w · {estimateDuration(text)}s</span>
              <IconButton icon={sv ? 'type' : 'scissors'} title={sv ? 'Paragraph view' : 'Edit individual sentences'} onClick={() => setSentenceView((v) => ({ ...v, [s]: !v[s] }))} />
              <Button size="sm" variant="ghost" icon="wand" disabled={!text} onClick={() => openRewrite(s)}>Rewrite selection</Button>
              <Button size="sm" variant="ghost" icon="refresh" loading={busy === `section${s}`} disabled={!hasText}
                onClick={() => run('section', { section: s }, `Regenerated ${SECTION_LABELS[s].toLowerCase()}`)}>
                {s === 'hook' ? 'Regenerate hook' : s === 'conclusion' ? 'Regenerate ending' : 'Regenerate'}
              </Button>
            </>}>
            {sv ? (
              <div className="sentences">
                {splitSentences(text).map((sent, k, arr) => (
                  <div key={k} className="sentence-row">
                    <span className="mono small muted">{k + 1}</span>
                    <input className="input" value={sent} onChange={(e) => { const next = [...arr]; next[k] = e.target.value; setSection(s, next.join(' ')); }} />
                    <IconButton icon="wand" title="Rewrite this sentence" onClick={() => { const start = text.indexOf(sent); setRewrite({ section: s, start, end: start + sent.length, text: sent, instruction: '' }); }} />
                    <IconButton icon="trash" title="Delete sentence" onClick={() => setSection(s, arr.filter((_, j) => j !== k).join(' '))} />
                  </div>
                ))}
                <Button size="sm" variant="ghost" icon="plus" onClick={() => setSection(s, `${text.trim()} New sentence.`.trim())}>Add sentence</Button>
              </div>
            ) : (
              <TextArea autoGrow rows={2} value={text} placeholder={`Write the ${SECTION_LABELS[s].toLowerCase()}…`} ref={undefined}
                onChange={(e) => setSection(s, e.target.value)}
                onSelect={(e) => { refs.current[s] = e.target; }} onFocus={(e) => { refs.current[s] = e.target; }} />
            )}
          </Panel>
        );
      })}

      <Modal open={!!rewrite} title="Rewrite passage" onClose={() => setRewrite(null)} width={620}
        footer={<><Button variant="ghost" onClick={() => setRewrite(null)}>Cancel</Button><Button variant="primary" icon="wand" loading={busy === 'rewrite'} onClick={doRewrite}>Rewrite</Button></>}>
        {rewrite && (
          <div className="col gap">
            <p className="small muted">Section: {SECTION_LABELS[rewrite.section]} · Tip: select text in the paragraph before clicking “Rewrite selection” to rewrite just that part.</p>
            <blockquote className="quote">{rewrite.text}</blockquote>
            <Input label="Instruction (optional)" placeholder="e.g. make it more personal, add a specific trading detail" value={rewrite.instruction} onChange={(e) => setRewrite((r) => ({ ...r, instruction: e.target.value }))} />
            {engine === 'local' && <p className="small muted">The local writer tightens and reorders the passage. Instructions are used by Claude only.</p>}
          </div>
        )}
      </Modal>

      <Modal open={versionsOpen} title="Script versions" onClose={() => setVersionsOpen(false)} width={680}>
        {(script.versions || []).length ? (
          <ul className="versions">
            {script.versions.map((v) => (
              <li key={v.id}>
                <div>
                  <b>{v.label}</b> <span className="muted small">· {timeAgo(v.at)}</span>
                  <p className="small muted clamp-2">{v.sections.hook}</p>
                </div>
                <Button size="sm" icon="refresh" onClick={() => { update((p) => ({ script: { ...p.script, sections: { ...v.sections }, versions: snapshot('Before restore') } })); setVersionsOpen(false); store.toast('Version restored', 'ok'); }}>Restore</Button>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Versions are saved automatically before every rewrite and when you click Save draft.</p>}
      </Modal>
    </div>
  );
}
