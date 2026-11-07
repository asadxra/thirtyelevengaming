import React, { useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { api } from '../lib/api.js';
import { Button, Panel, Input, TextArea, Select, Badge, IconButton, Modal, timeAgo } from './ui.jsx';
import { Icon } from './Icon.jsx';
import { SECTIONS, SECTION_LABELS, SECTION_HELP } from '../../shared/defaults.js';
import { conceptById, LEVELS, TONES, LENGTHS, COMPLEXITY } from '../../shared/concepts.js';
import { navigate } from '../lib/router.js';
import { check, clean, cleanSections } from '../../shared/styleGuard.js';
import { splitSentences, wordCount, estimateDuration, fmtShort } from '../../shared/scenes.js';

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
      const res = await api.post('/api/script', { engine, op, inputs: script.inputs, sections: script.sections, conceptId: project.conceptId, customConcepts: store.settings?.customConcepts || [], examples: project.examples || [], ...extra });
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

  const aiFlags = SECTIONS.reduce((n, k) => n + check(script.sections[k] || '').length, 0);
  const i = script.inputs;
  const concept = conceptById(project.conceptId, store.settings?.customConcepts || []);
  const approved = (project.examples || []).filter((e) => e.approved !== false);
  const len = LENGTHS.find((l) => l.id === i.length) || LENGTHS[0];
  return (
    <div className="col gap">
      <Panel title="Script brief" subtitle={concept ? `${concept.name} · ${approved.length} approved chart example${approved.length === 1 ? '' : 's'}` : 'Choose a concept in the project overview first'}
        actions={<Button variant="ghost" size="sm" icon={briefOpen ? 'up' : 'down'} onClick={() => setBriefOpen((o) => !o)}>{briefOpen ? 'Collapse' : 'Expand'}</Button>}>
        {!approved.length && (
          <div className="notice warn small"><Icon name="alert" size={14} /> No approved chart examples yet. The script can’t reference a real chart until you approve one. <button className="link" onClick={() => navigate(`/research?concept=${project.conceptId || 'fvg'}&project=${project.id}`)}>Open Chart Research</button></div>
        )}
        {briefOpen ? (
          <div className="brief-grid">
            <Select label="Audience level" value={i.level} onChange={(e) => setInputs({ level: e.target.value })} options={LEVELS} />
            <Select label="Tone" value={i.tone} onChange={(e) => setInputs({ tone: e.target.value })} options={TONES} />
            <Select label="Format" value={i.length} onChange={(e) => { const l = LENGTHS.find((x) => x.id === e.target.value); setInputs({ length: l.id, duration: l.def }); }} options={LENGTHS.map((l) => ({ value: l.id, label: l.label }))} />
            <Input label={`Target duration (seconds, ${len.min}–${len.max})`} type="number" min={len.min} max={len.max} value={i.duration} onChange={(e) => setInputs({ duration: Number(e.target.value) })} />
            <Select label="Script complexity" value={i.complexity} onChange={(e) => setInputs({ complexity: e.target.value })} options={COMPLEXITY} />
            <Input label="Voiceover speed" type="number" step="0.05" min={0.7} max={1.2} value={i.voiceSpeed} onChange={(e) => { const v = Number(e.target.value); setInputs({ voiceSpeed: v }); update((p) => ({ voice: { ...p.voice, settings: { ...p.voice.settings, speed: v } } })); }} />
            <Input label="Notes for the writer (optional)" placeholder="e.g. mention the London session, keep it beginner friendly" value={i.notes} onChange={(e) => setInputs({ notes: e.target.value })} className="span-2" />
          </div>
        ) : (
          <p className="small muted">{i.level} · {i.tone} · {len.label} · {i.duration}s · {i.complexity}</p>
        )}
      </Panel>

      <Panel pad={false} className="script-toolbar-panel">
        <div className="script-toolbar">
          <div className="row gap-s wrap">
            <Select value={engine} onChange={(e) => { setEngine(e.target.value); setScript({ engine: e.target.value }); }}
              options={[{ value: 'local', label: 'Writer · Local (offline)' }, { value: 'claude', label: claudeOn ? 'Writer · Claude' : 'Writer · Claude (not connected)' }]} />

          </div>
          <div className="row gap-s wrap">
            {!hasText
              ? <Button variant="primary" icon="sparkles" loading={busy === 'generate'} disabled={(engine === 'claude' && !claudeOn) || !concept} onClick={() => run('generate', {}, 'Generated script')}>Generate script</Button>
              : <>
                <Button icon="refresh" loading={busy === 'variant'} onClick={() => run('variant', {}, 'Generated another version')}>Another version</Button>
                <Button icon="expand" loading={busy === 'expand'} onClick={() => run('expand', {}, 'Expanded script')}>Expand</Button>
                <Button icon="shrink" loading={busy === 'shorten'} onClick={() => run('shorten', {}, 'Shortened script')}>Shorten</Button>
                <Button icon="wand" loading={busy === 'tone'} onClick={() => run('tone', {}, `Applied ${i.tone.toLowerCase()} tone`)}>Apply tone</Button>
              </>}
          </div>
        </div>
        {engine === 'claude' && !claudeOn && (
          <div className="notice warn"><Icon name="alert" size={14} /> Claude is not connected. <a href="#/settings/integrations">Connect it in Settings</a>, or switch to the local writer.</div>
        )}
        {engine === 'local' && (
          <div className="notice subtle"><Icon name="sparkles" size={14} /> The local writer builds the script from the concept library and the exact facts of your approved chart examples, and works offline. Claude writes more natural narration from the same facts.</div>
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
          {aiFlags > 0
            ? <Button size="sm" icon="wand" onClick={() => { update((p) => ({ script: { ...p.script, sections: cleanSections(p.script.sections), versions: snapshot('Before AI-phrasing cleanup') } })); store.toast('Cleaned up AI-style phrasing. Review anything still flagged.', 'ok'); }}>Clean up AI phrasing ({aiFlags})</Button>
            : hasText && <Badge tone="ok"><Icon name="check" size={11} /> No AI-style phrasing</Badge>}
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
                {s === 'hook' ? 'Regenerate hook' : s === 'ending' ? 'Regenerate ending' : 'Regenerate'}
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
            <StyleFlags text={text} onFix={() => setSection(s, clean(text))} />
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

// "Avoid AI writing" checker shown under each script section.
function StyleFlags({ text, onFix }) {
  const issues = check(text);
  const [open, setOpen] = useState(false);
  if (!issues.length) return null;
  const fixable = clean(text) !== text;
  return (
    <div className="style-flags">
      <div className="row gap-s wrap">
        <button className="link small" onClick={() => setOpen((o) => !o)}><Icon name="alert" size={12} /> {issues.length} AI-style phrase{issues.length === 1 ? '' : 's'}</button>
        {fixable && <Button size="sm" variant="ghost" icon="wand" onClick={onFix}>Fix automatically</Button>}
      </div>
      {open && (
        <ul>
          {issues.map((x, k) => <li key={k}><b>{x.label}</b> <code>{x.match}</code> <span className="muted">· {x.tip}</span></li>)}
        </ul>
      )}
    </div>
  );
}
