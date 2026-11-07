import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../lib/store.jsx';
import { navigate } from '../lib/router.js';
import { Button, Panel, Input, TextArea, Select, Slider, Tabs, Chips, ColorInput, Badge, Modal, Confirm, Prompt, Empty, Toggle, IconButton, Menu } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import CharacterRenderer from '../components/CharacterRenderer.jsx';
import { CHARACTER_STYLES, ANIMATIONS, EXPRESSIONS, CHARACTER_OPTIONS, defaultCharacter } from '../../shared/defaults.js';

const TABS = [
  { id: 'identity', label: 'Identity', icon: 'user' },
  { id: 'appearance', label: 'Appearance', icon: 'edit' },
  { id: 'style', label: 'Style', icon: 'sparkles' },
  { id: 'colors', label: 'Colors & material', icon: 'palette' },
  { id: 'animation', label: 'Animation', icon: 'play' },
  { id: 'presets', label: 'Presets', icon: 'layers' },
];

const strip = ({ id, createdAt, updatedAt, ...rest }) => rest;

export default function CharacterStudio({ id }) {
  const store = useStore();
  const { characters } = store;
  const current = characters.find((c) => c.id === id) || (id ? null : characters[0]);
  const [draft, setDraft] = useState(current);
  const [tab, setTab] = useState('identity');
  const [pose, setPose] = useState(null);
  const [expr, setExpr] = useState(null);
  const [overlay, setOverlay] = useState(false);
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [stageBg, setStageBg] = useState('scene');
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => { setDraft(current); setPose(null); setExpr(null); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => current && draft && JSON.stringify(strip(current)) !== JSON.stringify(strip(draft)), [current, draft]);
  const locked = draft?.locked;

  if (id && !current) {
    return <div className="page"><Empty icon="user" title="Character not found" action={<Button onClick={() => navigate('/characters')}>Back to characters</Button>} /></div>;
  }

  const set = (patch) => !locked && setDraft((d) => ({ ...d, ...patch }));
  const setA = (patch) => !locked && setDraft((d) => ({ ...d, appearance: { ...d.appearance, ...patch } }));
  const setC = (patch) => !locked && setDraft((d) => ({ ...d, colors: { ...d.colors, ...patch } }));
  const setAnim = (patch) => !locked && setDraft((d) => ({ ...d, animation: { ...d.animation, ...patch } }));

  const save = async (extra = {}, activity) => {
    setBusy(true);
    try {
      const next = { ...draft, ...extra };
      store.editDoc('characters', draft.id, strip(next), { immediate: true });
      setDraft(next);
      if (activity) store.logActivity('characters', draft.id, activity);
      store.toast(activity || 'Character saved', 'ok');
    } finally { setBusy(false); }
  };

  const createNew = async (name) => {
    setModal(null);
    try {
      const c = await store.createDoc('characters', defaultCharacter({ name }));
      navigate(`/characters/${c.id}`);
    } catch (e) { store.toast(e.message, 'bad'); }
  };

  const duplicate = async () => {
    try {
      const c = await store.duplicateDoc('characters', draft.id);
      navigate(`/characters/${c.id}`);
      store.toast('Character duplicated', 'ok');
    } catch (e) { store.toast(e.message, 'bad'); }
  };

  const remove = async () => {
    try {
      await store.deleteDoc('characters', draft.id);
      setModal(null);
      navigate('/characters');
      store.toast('Character deleted', 'ok');
    } catch (e) { store.toast(e.message, 'bad'); }
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return store.toast('Please choose an image file.', 'bad');
    try {
      const asset = await store.uploadAsset(file, ['character', 'reference']);
      setDraft((d) => ({ ...d, referenceAssetId: asset.id, referenceUrl: asset.url, style: d.style }));
      store.toast('Reference uploaded. Configure the design, then save and approve it — nothing is generated automatically.', 'ok', 6000);
    } catch (err) { store.toast(err.message, 'bad'); }
  };

  const projectsUsing = draft ? store.projects.filter((p) => p.characterId === draft.id).length : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Character Design Studio</p>
          <h1>{draft ? draft.name : 'Characters'}</h1>
          <p className="muted">One recognizable character, rendered identically in every scene. Edits only apply when you save.</p>
        </div>
        <div className="row gap-s wrap">
          <Button icon="plus" onClick={() => setModal('new')}>Create new character</Button>
          {draft && <Button icon="copy" onClick={duplicate}>Duplicate</Button>}
          {draft && <Button icon="eye" onClick={() => setModal('preview')}>Preview character</Button>}
          {draft && locked && <Button icon="edit" onClick={() => setModal('unlock')}>Edit character</Button>}
          {draft && !locked && <Button variant="primary" icon="save" loading={busy} disabled={!dirty} onClick={() => save({}, `Saved character “${draft.name}”`)}>Save character</Button>}
        </div>
      </header>

      {!draft ? (
        <Empty icon="user" title="No characters yet" action={<Button variant="primary" icon="plus" onClick={() => setModal('new')}>Create character</Button>}>Create your main character and upload a reference image.</Empty>
      ) : (
        <div className="char-layout">
          {/* character list */}
          <div className="char-list">
            {characters.map((c) => (
              <button key={c.id} className={`char-item ${c.id === draft.id ? 'active' : ''}`} onClick={() => {
                if (dirty && !window.confirm('Discard unsaved changes to this character?')) return;
                navigate(`/characters/${c.id}`);
              }}>
                <div className="char-item-art"><CharacterRenderer character={c} animate={false} showProps={false} /></div>
                <div>
                  <b>{c.name}</b>
                  <Badge tone={c.status === 'approved' ? 'ok' : 'warn'}>{c.status === 'approved' ? 'Approved' : 'Draft'}</Badge>
                  {store.settings?.defaults?.characterId === c.id && <Badge tone="accent">Default</Badge>}
                </div>
              </button>
            ))}
          </div>

          {/* preview */}
          <div className="col gap">
            <Panel pad={false} className="char-stage-panel">
              <div className={`char-stage bg-${stageBg}`}>
                {draft.referenceUrl && overlay && <img src={draft.referenceUrl} alt="" className="onion" style={{ opacity: overlayOpacity }} />}
                <CharacterRenderer character={draft} pose={pose || draft.animation?.default} expression={expr || undefined} />
                <div className="stage-tags">
                  <Badge tone={draft.status === 'approved' ? 'ok' : 'warn'} dot>{draft.status === 'approved' ? 'Approved design' : 'Draft — not approved'}</Badge>
                  {locked && <Badge tone="accent"><Icon name="lock" size={11} /> Locked</Badge>}
                  {dirty && <Badge tone="warn">Unsaved changes</Badge>}
                </div>
              </div>
              <div className="char-stage-controls">
                <Select label="Preview pose" value={pose || draft.animation?.default || 'idle'} onChange={(e) => setPose(e.target.value)} options={ANIMATIONS.map((a) => ({ value: a.id, label: a.label }))} />
                <Select label="Preview expression" value={expr || draft.appearance?.expression} onChange={(e) => setExpr(e.target.value)} options={EXPRESSIONS} />
                <Select label="Background" value={stageBg} onChange={(e) => setStageBg(e.target.value)} options={[{ value: 'scene', label: 'Trading room' }, { value: 'dark', label: 'Black' }, { value: 'light', label: 'White (reference)' }, { value: 'grid', label: 'Grid' }]} />
              </div>
            </Panel>

            <Panel title="Reference image" subtitle="Used as the visual target for consistency. Uploading never generates anything." actions={<>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
              <Button size="sm" icon="upload" disabled={locked} onClick={() => fileRef.current?.click()}>Upload reference image</Button>
              <Button size="sm" icon="image" disabled={locked} onClick={() => setModal('library')}>From library</Button>
            </>}>
              {draft.referenceUrl ? (
                <div className="ref-row">
                  <img src={draft.referenceUrl} alt="Character reference" className="ref-img" />
                  <div className="col gap-s grow">
                    <Toggle label="Overlay reference on preview" hint="Onion-skin comparison to match proportions" checked={overlay} onChange={setOverlay} />
                    {overlay && <Slider label="Overlay opacity" value={overlayOpacity} min={0.1} max={0.9} step={0.05} onChange={setOverlayOpacity} format={(v) => `${Math.round(v * 100)}%`} />}
                    <Button size="sm" variant="ghost" icon="x" disabled={locked} onClick={() => set({ referenceUrl: null, referenceAssetId: null })}>Remove from character</Button>
                  </div>
                </div>
              ) : <p className="muted small">No reference image yet. Upload the image of your main character.</p>}
            </Panel>

            <ApprovalPanel draft={draft} dirty={dirty} projectsUsing={projectsUsing} isDefault={store.settings?.defaults?.characterId === draft.id}
              onApprove={() => save({ status: 'approved', locked: true }, `Approved character “${draft.name}”`)}
              onMakeDefault={() => { store.updateSettings({ defaults: { characterId: draft.id } }); store.toast(`${draft.name} is now the default character`, 'ok'); }}
              onDelete={() => setModal('delete')} onDiscard={() => setDraft(current)} />
          </div>

          {/* editor */}
          <Panel pad={false} className="char-editor">
            <Tabs tabs={TABS} value={tab} onChange={setTab} />
            <fieldset className="panel-body editor-body" disabled={locked}>
              {locked && <div className="notice"><Icon name="lock" size={14} /> This design is approved and locked for consistency. Click “Edit character” to make changes.</div>}
              {tab === 'identity' && (
                <div className="col gap">
                  <Input label="Character name" value={draft.name} onChange={(e) => set({ name: e.target.value })} />
                  <TextArea label="Character description" hint="Shown to writers and used as the visual brief." rows={5} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
                  <div className="grid-2">
                    <Select label="Default pose" value={draft.defaultPose} onChange={(e) => set({ defaultPose: e.target.value, animation: { ...draft.animation, default: e.target.value } })} options={ANIMATIONS.map((a) => ({ value: a.id, label: a.label }))} />
                    <Select label="Default expression" value={draft.defaultExpression} onChange={(e) => set({ defaultExpression: e.target.value, appearance: { ...draft.appearance, expression: e.target.value } })} options={EXPRESSIONS} />
                  </div>
                </div>
              )}

              {tab === 'appearance' && (
                <div className="col gap">
                  <h5 className="sub">Head & face</h5>
                  <Field2 label="Head shape"><Chips options={CHARACTER_OPTIONS.headShape} value={draft.appearance.headShape} onChange={(v) => setA({ headShape: v })} /></Field2>
                  <Field2 label="Hair"><Chips options={CHARACTER_OPTIONS.hair} value={draft.appearance.hair} onChange={(v) => setA({ hair: v })} /></Field2>
                  <Slider label="Head size" value={draft.appearance.headSize} min={70} max={140} step={1} onChange={(v) => setA({ headSize: v })} format={(v) => `${v}%`} />
                  <Field2 label="Eyes"><Chips options={CHARACTER_OPTIONS.eyes} value={draft.appearance.eyes} onChange={(v) => setA({ eyes: v })} /></Field2>
                  <div className="grid-2">
                    <Slider label="Eye size" value={draft.appearance.eyeSize} min={50} max={170} step={1} onChange={(v) => setA({ eyeSize: v })} format={(v) => `${v}%`} />
                    <Slider label="Eye spacing" value={draft.appearance.eyeSpacing} min={60} max={150} step={1} onChange={(v) => setA({ eyeSpacing: v })} format={(v) => `${v}%`} />
                  </div>
                  <Field2 label="Facial expression"><Chips options={EXPRESSIONS} value={draft.appearance.expression} onChange={(v) => setA({ expression: v })} /></Field2>
                  <h5 className="sub">Body</h5>
                  <Field2 label="Body proportions"><Chips options={CHARACTER_OPTIONS.bodyProportions} value={draft.appearance.bodyProportions} onChange={(v) => setA({ bodyProportions: v })} /></Field2>
                  <div className="grid-2">
                    <Slider label="Height" value={draft.appearance.height} min={75} max={125} step={1} onChange={(v) => setA({ height: v })} format={(v) => `${v}%`} />
                    <Slider label="Width" value={draft.appearance.width} min={70} max={140} step={1} onChange={(v) => setA({ width: v })} format={(v) => `${v}%`} />
                  </div>
                  <div className="grid-2">
                    <Select label="Arms" value={draft.appearance.arms} onChange={(e) => setA({ arms: e.target.value })} options={CHARACTER_OPTIONS.arms} />
                    <Select label="Legs" value={draft.appearance.legs} onChange={(e) => setA({ legs: e.target.value })} options={CHARACTER_OPTIONS.legs} />
                    <Select label="Hands" value={draft.appearance.hands} onChange={(e) => setA({ hands: e.target.value })} options={CHARACTER_OPTIONS.hands} />
                    <Select label="Feet" value={draft.appearance.feet} onChange={(e) => setA({ feet: e.target.value })} options={CHARACTER_OPTIONS.feet} />
                  </div>
                  <h5 className="sub">Wardrobe</h5>
                  <div className="grid-2">
                    <Select label="Clothing" value={draft.appearance.clothing} onChange={(e) => setA({ clothing: e.target.value })} options={CHARACTER_OPTIONS.clothing} />
                    <Select label="Shoes" value={draft.appearance.shoes} onChange={(e) => setA({ shoes: e.target.value })} options={CHARACTER_OPTIONS.shoes} />
                  </div>
                  <Field2 label="Accessories"><Chips multi options={CHARACTER_OPTIONS.accessories} value={draft.appearance.accessories} onChange={(v) => setA({ accessories: v })} /></Field2>
                </div>
              )}

              {tab === 'style' && (
                <div className="style-grid">
                  {CHARACTER_STYLES.map((s) => (
                    <button key={s.id} className={`style-card ${draft.style === s.id ? 'on' : ''}`} onClick={() => set({ style: s.id })}>
                      <div className="style-art"><CharacterRenderer character={{ ...draft, style: s.id }} animate={false} showProps={false} /></div>
                      <span>{s.label}</span>
                    </button>
                  ))}
                  {draft.style === 'reference' && <p className="muted small span-all">Reference-based style keeps the silhouette build and uses your reference image overlay to match proportions. Enable the overlay in the reference panel.</p>}
                </div>
              )}

              {tab === 'colors' && (
                <div className="col gap">
                  <div className="grid-2">
                    <ColorInput label="Body / silhouette" value={draft.colors.body} onChange={(v) => setC({ body: v })} />
                    <ColorInput label="Eyes" value={draft.colors.eyes} onChange={(v) => setC({ eyes: v })} />
                    <ColorInput label="Clothing" value={draft.colors.clothing} onChange={(v) => setC({ clothing: v })} />
                    <ColorInput label="Clothing accent" value={draft.colors.clothingAccent} onChange={(v) => setC({ clothingAccent: v })} />
                    <ColorInput label="Shoes" value={draft.colors.shoes} onChange={(v) => setC({ shoes: v })} />
                    <ColorInput label="Accessories" value={draft.colors.accessory} onChange={(v) => setC({ accessory: v })} />
                    <ColorInput label="Outline / neon edge" value={draft.colors.outline} onChange={(v) => setC({ outline: v })} />
                  </div>
                  <Field2 label="Material"><Chips options={CHARACTER_OPTIONS.material} value={draft.appearance.material} onChange={(v) => setA({ material: v })} /></Field2>
                  <Field2 label="Texture"><Chips options={CHARACTER_OPTIONS.texture} value={draft.appearance.texture} onChange={(v) => setA({ texture: v })} /></Field2>
                </div>
              )}

              {tab === 'animation' && (
                <div className="col gap">
                  <p className="muted small">Click an animation to preview it. The default animation is used when a scene doesn’t specify a pose.</p>
                  <div className="anim-grid">
                    {ANIMATIONS.map((a) => {
                      const enabled = draft.animation.enabled.includes(a.id);
                      return (
                        <div key={a.id} className={`anim-card ${(pose || draft.animation.default) === a.id ? 'on' : ''}`} onClick={() => setPose(a.id)}>
                          <div className="anim-art"><CharacterRenderer character={draft} pose={a.id} showProps={false} /></div>
                          <div className="row between">
                            <span>{a.label}</span>
                            <input type="checkbox" title="Allowed in scenes" checked={enabled} onClick={(e) => e.stopPropagation()} onChange={() => setAnim({ enabled: enabled ? draft.animation.enabled.filter((x) => x !== a.id) : [...draft.animation.enabled, a.id] })} />
                          </div>
                          {draft.animation.default === a.id ? <Badge tone="accent">Default</Badge> : <button className="link small" onClick={(e) => { e.stopPropagation(); setAnim({ default: a.id }); set({ defaultPose: a.id }); }}>Set default</button>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid-2">
                    <Slider label="Animation speed" value={draft.animation.speed} min={0.3} max={2} step={0.05} onChange={(v) => setAnim({ speed: v })} format={(v) => `${v.toFixed(2)}×`} />
                    <Slider label="Motion intensity" value={draft.animation.intensity} min={0} max={2} step={0.05} onChange={(v) => setAnim({ intensity: v })} format={(v) => `${v.toFixed(2)}×`} />
                  </div>
                </div>
              )}

              {tab === 'presets' && <PresetsTab draft={draft} setDraft={(fn) => !locked && setDraft(fn)} toast={store.toast} />}
            </fieldset>
          </Panel>
        </div>
      )}

      <Prompt open={modal === 'new'} title="Create new character" label="Character name" initial="" confirmLabel="Create" onSubmit={createNew} onClose={() => setModal(null)} />
      <Confirm open={modal === 'delete'} danger title="Delete character" confirmLabel="Delete" onConfirm={remove} onClose={() => setModal(null)}
        message={`Delete “${draft?.name}”? ${projectsUsing ? `${projectsUsing} project(s) use this character and will need a new one.` : ''}`} />
      <Confirm open={modal === 'unlock'} title="Edit approved character" confirmLabel="Unlock for editing" onClose={() => setModal(null)}
        onConfirm={async () => { await save({ locked: false, status: 'draft' }, `Unlocked “${draft.name}” for editing`); setModal(null); }}
        message={`Unlocking returns “${draft?.name}” to draft. Changes will appear in all ${projectsUsing} project(s) that use it once saved — that keeps every video consistent. Re-approve when you’re done.`} />
      <PreviewModal open={modal === 'preview'} character={draft} onClose={() => setModal(null)} />
      <LibraryPicker open={modal === 'library'} assets={store.assets.filter((a) => a.kind === 'image')} onClose={() => setModal(null)}
        onPick={(a) => { setDraft((d) => ({ ...d, referenceAssetId: a.id, referenceUrl: a.url })); setModal(null); }} />
    </div>
  );
}

function Field2({ label, children }) {
  return <div className="field"><span className="field-label">{label}</span>{children}</div>;
}

function ApprovalPanel({ draft, dirty, projectsUsing, isDefault, onApprove, onMakeDefault, onDelete, onDiscard }) {
  return (
    <Panel title="Design approval" subtitle={`Used by ${projectsUsing} project${projectsUsing === 1 ? '' : 's'}`} actions={<Menu items={[
      { label: 'Discard unsaved changes', icon: 'refresh', onClick: onDiscard },
      !isDefault && { label: 'Set as default character', icon: 'check', onClick: onMakeDefault },
      { label: 'Delete character', icon: 'trash', danger: true, onClick: onDelete },
    ]} />}>
      {draft.status === 'approved' ? (
        <p className="small"><Icon name="check" size={14} className="ok-text" /> Approved. This exact design is used in every scene and project. {isDefault && <Badge tone="accent">Default character</Badge>}</p>
      ) : (
        <div className="col gap-s">
          <p className="small muted">Configure every feature, save, then approve. Projects can’t be marked ready for generation until their character is approved.</p>
          <div className="row gap-s wrap">
            <Button variant="primary" icon="check" onClick={onApprove}>{dirty ? 'Save & approve design' : 'Approve design'}</Button>
            {!isDefault && <Button variant="ghost" onClick={onMakeDefault}>Set as default</Button>}
          </div>
        </div>
      )}
    </Panel>
  );
}

function PresetsTab({ draft, setDraft, toast }) {
  const [name, setName] = useState('');
  const [aname, setAname] = useState('');
  const saveClothing = () => {
    if (!name.trim()) return;
    const p = { id: `cl_${Date.now().toString(36)}`, name: name.trim(), clothing: draft.appearance.clothing, shoes: draft.appearance.shoes, accessories: draft.appearance.accessories, colors: { ...draft.colors } };
    setDraft((d) => ({ ...d, clothingPresets: [...(d.clothingPresets || []), p] }));
    setName('');
    toast('Clothing preset added — save the character to keep it', 'ok');
  };
  const saveAnim = () => {
    if (!aname.trim()) return;
    const p = { id: `an_${Date.now().toString(36)}`, name: aname.trim(), default: draft.animation.default, speed: draft.animation.speed, intensity: draft.animation.intensity };
    setDraft((d) => ({ ...d, animationPresets: [...(d.animationPresets || []), p] }));
    setAname('');
    toast('Animation preset added — save the character to keep it', 'ok');
  };
  return (
    <div className="col gap">
      <h5 className="sub">Clothing presets</h5>
      {(draft.clothingPresets || []).map((p) => (
        <div key={p.id} className="preset-row">
          <span className="swatches">{Object.values(p.colors).slice(0, 5).map((c, i) => <i key={i} style={{ background: c }} />)}</span>
          <b>{p.name}</b><span className="muted small">{p.clothing} · {p.shoes}</span>
          <div className="row gap-s">
            <Button size="sm" onClick={() => setDraft((d) => ({ ...d, appearance: { ...d.appearance, clothing: p.clothing, shoes: p.shoes, accessories: p.accessories }, colors: { ...d.colors, ...p.colors } }))}>Apply</Button>
            <IconButton icon="trash" title="Remove preset" onClick={() => setDraft((d) => ({ ...d, clothingPresets: d.clothingPresets.filter((x) => x.id !== p.id) }))} />
          </div>
        </div>
      ))}
      <div className="row gap-s"><input className="input" placeholder="Preset name, e.g. Night hoodie" value={name} onChange={(e) => setName(e.target.value)} /><Button icon="plus" onClick={saveClothing} disabled={!name.trim()}>Save current outfit</Button></div>

      <h5 className="sub">Animation presets</h5>
      {(draft.animationPresets || []).map((p) => (
        <div key={p.id} className="preset-row">
          <Icon name="play" size={14} /><b>{p.name}</b><span className="muted small">{p.default} · {p.speed}× · intensity {p.intensity}</span>
          <div className="row gap-s">
            <Button size="sm" onClick={() => setDraft((d) => ({ ...d, defaultPose: p.default, animation: { ...d.animation, default: p.default, speed: p.speed, intensity: p.intensity } }))}>Apply</Button>
            <IconButton icon="trash" title="Remove preset" onClick={() => setDraft((d) => ({ ...d, animationPresets: d.animationPresets.filter((x) => x.id !== p.id) }))} />
          </div>
        </div>
      ))}
      <div className="row gap-s"><input className="input" placeholder="Preset name, e.g. Calm night trader" value={aname} onChange={(e) => setAname(e.target.value)} /><Button icon="plus" onClick={saveAnim} disabled={!aname.trim()}>Save current animation</Button></div>
    </div>
  );
}

function PreviewModal({ open, character, onClose }) {
  if (!character) return null;
  return (
    <Modal open={open} title={`${character.name} — full preview`} onClose={onClose} width={960}>
      <div className="preview-grid">
        {ANIMATIONS.filter((a) => character.animation.enabled.includes(a.id)).map((a) => (
          <div key={a.id} className="preview-cell">
            <div className="preview-art"><CharacterRenderer character={character} pose={a.id} /></div>
            <span className="small muted">{a.label}</span>
          </div>
        ))}
      </div>
      <h5 className="sub">Expressions</h5>
      <div className="preview-grid small-cells">
        {EXPRESSIONS.map((x) => (
          <div key={x} className="preview-cell">
            <div className="preview-art"><CharacterRenderer character={character} pose="idle" expression={x} animate={false} showProps={false} /></div>
            <span className="small muted">{x}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function LibraryPicker({ open, assets, onPick, onClose }) {
  return (
    <Modal open={open} title="Choose a reference image" onClose={onClose} width={720}>
      {assets.length ? (
        <div className="asset-pick-grid">
          {assets.map((a) => (
            <button key={a.id} className="asset-pick" onClick={() => onPick(a)}>
              <img src={a.url} alt="" />
              <span className="small">{a.name}</span>
            </button>
          ))}
        </div>
      ) : <p className="muted">No images in the asset library yet.</p>}
    </Modal>
  );
}
