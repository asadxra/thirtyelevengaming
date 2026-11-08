import { Copy, Download, Pause, Play, Plus, Save, Trash2, Upload, UserPlus, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { CharacterSVG, resolveCharacterPose } from '../engine/character';
import { EASING_NAMES } from '../engine/easing';
import { BUILTIN_POSES, EXPRESSIONS } from '../engine/poses';
import type { Character, Easing, MovementStep, Pose } from '../engine/schema';
import { characterSheetSVG } from '../export/package';
import { downloadBlob, slug } from '../export/video';
import { DEFAULT_FORMATS, newElement, newScene, uid } from '../lib/factory';
import { actions, allPresets, findPreset, selectAssets, useAssets, useStore } from '../store/store';
import { ExportDialog, type ExportSource } from '../ui/ExportDialog';
import { Color, confirmAction, cx, Empty, fileToDataURL, Num, PageHeader, Section, Select, Slider, Tabs, Text } from '../ui/kit';
import { useClock } from '../ui/playback';
import { insertIntoOpenTarget } from '../ui/useAsset';

const JOINTS: { k: keyof Pose; label: string; min: number; max: number }[] = [
  { k: 'lUpper', label: 'Left upper arm', min: -180, max: 180 }, { k: 'lLower', label: 'Left forearm', min: -170, max: 170 },
  { k: 'rUpper', label: 'Right upper arm', min: -180, max: 180 }, { k: 'rLower', label: 'Right forearm', min: -170, max: 170 },
  { k: 'lThigh', label: 'Left thigh', min: -120, max: 120 }, { k: 'lShin', label: 'Left shin', min: -150, max: 150 },
  { k: 'rThigh', label: 'Right thigh', min: -120, max: 120 }, { k: 'rShin', label: 'Right shin', min: -150, max: 150 },
  { k: 'torso', label: 'Torso lean', min: -40, max: 40 }, { k: 'head', label: 'Head tilt', min: -40, max: 40 }, { k: 'lift', label: 'Body lift', min: -120, max: 80 },
];

export function CharacterStudio() {
  const characters = useStore((s) => s.characters);
  const customPoses = useStore((s) => s.poses);
  const customMoves = useStore((s) => s.movements);
  const activeId = useStore((s) => s.ui.activeCharacterId);
  const ui$ = useStore((s) => s.ui$);
  const mutate = useStore((s) => s.mutate);
  const toast = useStore((s) => s.toast);
  const assets = useAssets();
  const c = characters.find((x) => x.id === activeId) ?? characters[0];
  const [pose, setPose] = useState('idle');
  const [expr, setExpr] = useState<string>('happy');
  const [move, setMove] = useState('idle');
  const [talking, setTalking] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [tab, setTab] = useState<'look' | 'pose' | 'movement'>('look');
  const [draftPose, setDraftPose] = useState<Pose>({ ...BUILTIN_POSES[0].pose });
  const [poseName, setPoseName] = useState('My pose');
  const [steps, setSteps] = useState<MovementStep[]>([{ pose: 'idle', duration: 0.5, easing: 'easeInOut' }, { pose: 'wave', duration: 0.5, easing: 'easeInOut' }]);
  const [moveName, setMoveName] = useState('My movement');
  const [exp, setExp] = useState<ExportSource | null>(null);
  const [t] = useClock(playing, 1000);

  const edit = (fn: (d: Character) => void) => mutate((d) => { const x = d.characters.find((y) => y.id === c!.id); if (x) fn(x as Character); });

  const previewPose = useMemo(() => {
    if (tab === 'pose') return { pose: draftPose, mouth: talking ? Math.max(0, Math.sin(t * 17)) : -1 };
    if (tab === 'movement') {
      const tmp = { ...assets, movements: { ...assets.movements, __draft: { id: '__draft', name: 'draft', steps } } };
      return resolveCharacterPose(tmp, 'idle', undefined, 0, '__draft', t, 1, talking);
    }
    return resolveCharacterPose(assets, pose, undefined, 0, move, t, 1, talking);
  }, [tab, draftPose, steps, pose, move, t, talking, assets]);

  if (!c) return <div className="p-6"><Empty icon={<UserPlus size={36} />} title="No characters" text="Create your first reusable character." action={<button className="btn-primary" onClick={() => actions.newCharacter()}><Plus size={14} />New character</button>} /></div>;

  const exportAnimated = () => {
    const st = useStore.getState();
    const preset = findPreset(st, st.settings.defaultPresetId);
    const sc = newScene(`${c.name} — ${move}`, preset, 30);
    sc.duration = 3;
    sc.background = { ...sc.background, type: 'transparent' };
    const formats = structuredClone(DEFAULT_FORMATS);
    const el = newElement('character', { preset, formats, formatId: 'landscape', assets: selectAssets(st), end: 3, props: { characterId: c.id, pose, expression: expr, movement: move, talking } });
    el.animIn = { type: 'none', duration: 0.1, easing: 'linear' };
    el.animOut = { type: 'none', duration: 0.1, easing: 'linear' };
    sc.elements.push(el);
    setExp({ title: `${c.name} — ${move}`, kind: 'character', scenes: [sc], formats, presetId: preset.id });
  };

  const bounds = c.style === 'image' ? { w: 380, h: 480 } : { w: c.proportions.armLength * 2.6 + c.proportions.torsoWidth, h: c.proportions.torsoLength + c.proportions.headSize * 2.6 + c.proportions.legLength + 120 };
  const size = Math.max(bounds.w, bounds.h) * 1.15;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <PageHeader title="Character Studio" subtitle="Design reusable characters. Scenes reference them by id, so appearance stays identical everywhere."
        actions={<>
          <select className="input h-8 w-auto" value="" onChange={(e) => e.target.value && actions.newCharacter(e.target.value)}>
            <option value="">＋ New from preset…</option>
            {allPresets(useStore.getState()).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.characterStyle})</option>)}
          </select>
          <button className="btn-soft" onClick={() => insertIntoOpenTarget('character', { characterId: c.id, pose, expression: expr, movement: move, talking }, c.name.split('—')[0].trim())}><Plus size={14} />Use in open scene</button>
          <button className="btn-soft" onClick={() => downloadBlob(new Blob([characterSheetSVG(c, assets, BUILTIN_POSES.slice(0, 8).map((p) => p.id))], { type: 'image/svg+xml' }), `${slug(c.name)}-sheet.svg`)}><Download size={14} />Pose sheet</button>
          <button className="btn-soft" onClick={() => downloadBlob(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' }), `${slug(c.name)}.json`)}><Download size={14} />JSON</button>
          <button className="btn-primary" onClick={exportAnimated}><Download size={14} />Export animation</button>
        </>} />
      <div className="grid xl:grid-cols-[220px_1fr_340px] lg:grid-cols-[200px_1fr] gap-4">
        <div className="panel p-2 space-y-1 max-h-[70vh] overflow-y-auto">
          {characters.map((x) => (
            <div key={x.id} onClick={() => ui$({ activeCharacterId: x.id })} className={cx('flex items-center gap-2 p-1.5 rounded-lg cursor-pointer border', x.id === c.id ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-white/[0.04]')}>
              <div className="w-10 h-12 shrink-0 rounded bg-slate-200 overflow-hidden">
                <svg viewBox="-200 -260 400 520" className="w-full h-full"><CharacterSVG c={x} opts={{ pose: BUILTIN_POSES[0].pose, expression: 'happy', mouth: -1, time: 0, draw: 1 }} /></svg>
              </div>
              <div className="min-w-0 flex-1"><div className="text-[13px] truncate">{x.name}</div><div className="text-[11px] text-slate-500">{x.style}</div></div>
            </div>
          ))}
        </div>

        <div className="space-y-3 min-w-0">
          <div className="panel p-3">
            <div className="grid sm:grid-cols-[1fr_auto] gap-3">
              <div className="checker rounded-xl overflow-hidden aspect-square max-h-[56vh] mx-auto w-full">
                <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} className="w-full h-full">
                  <line x1={-size / 2} x2={size / 2} y1={bounds.h * 0.43} y2={bounds.h * 0.43} stroke="#ffffff22" strokeDasharray="8 8" />
                  <CharacterSVG c={c} opts={{ pose: previewPose.pose, expression: expr, mouth: previewPose.mouth, time: t, draw: 1 }} />
                </svg>
              </div>
              {c.references.length > 0 && (
                <div className="flex sm:flex-col gap-2 overflow-auto sm:max-h-[56vh]">
                  {c.references.map((r, i) => (
                    <div key={i} className="relative group w-28 shrink-0">
                      <img src={r} className={cx('w-28 h-28 object-contain rounded-lg bg-ink-950 border', c.style === 'image' && (c.imageIndex ?? 0) === i ? 'border-accent' : 'border-white/10')} onClick={() => edit((d) => { d.imageIndex = i; })} />
                      <button className="absolute top-1 right-1 icon-btn w-6 h-6 bg-black/60 opacity-0 group-hover:opacity-100" onClick={() => edit((d) => { d.references.splice(i, 1); })}><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2 mt-3">
              <button className="btn-soft" onClick={() => setPlaying(!playing)}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
              {tab === 'look' && <>
                <Select label="Pose" value={pose} options={Object.keys(assets.poses)} onChange={setPose} />
                <Select label="Movement" value={move} options={Object.values(assets.movements).map((m) => ({ value: m.id, label: m.name }))} onChange={setMove} />
              </>}
              <Select label="Expression" value={expr} options={EXPRESSIONS} onChange={setExpr} />
              <label className="flex items-center gap-1 text-[12px] h-8"><input type="checkbox" checked={talking} onChange={(e) => setTalking(e.target.checked)} />Talking</label>
              <label className="btn-soft cursor-pointer ml-auto"><Upload size={14} />Upload reference
                <input type="file" accept="image/*" multiple hidden onChange={async (e) => { const fs = [...(e.target.files ?? [])]; const urls = await Promise.all(fs.map(fileToDataURL)); edit((d) => { d.references.push(...urls); }); toast(`${urls.length} reference(s) added`); e.target.value = ''; }} />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">References are stored with the character and shipped in every Claude export package. Choose style “image” to animate your uploaded artwork directly (click a reference to make it the body art).</p>
          </div>
        </div>

        <div className="panel overflow-hidden lg:col-span-2 xl:col-span-1">
          <div className="p-2 border-b border-white/[0.06]"><Tabs value={tab} onChange={setTab} tabs={[{ value: 'look', label: 'Appearance' }, { value: 'pose', label: 'Pose editor' }, { value: 'movement', label: 'Movement builder' }]} /></div>
          {tab === 'look' && (
            <div>
              <Section title="Identity">
                <Text label="Name" value={c.name} onChange={(v) => edit((d) => { d.name = v; })} />
                <Select label="Style" value={c.style} options={['stickman', 'minimal', 'cartoon', 'educational', 'image']} onChange={(v) => edit((d) => { d.style = v; })} />
                <div className="grid grid-cols-3 gap-2">
                  <Select label="Hair" value={c.hair} options={['none', 'short', 'long', 'spiky', 'bun', 'curly', 'cap']} onChange={(v) => edit((d) => { d.hair = v; })} />
                  <Select label="Outfit" value={c.outfit} options={['tshirt', 'suit', 'hoodie', 'dress', 'labcoat']} onChange={(v) => edit((d) => { d.outfit = v; })} />
                  <Select label="Extra" value={c.accessory} options={['none', 'glasses', 'tie', 'headset', 'beard', 'badge']} onChange={(v) => edit((d) => { d.accessory = v; })} />
                </div>
              </Section>
              <Section title="Proportions">
                {([['headSize', 'Head', 14, 90], ['torsoLength', 'Torso length', 50, 200], ['torsoWidth', 'Torso width', 20, 120], ['armLength', 'Arm length', 40, 200], ['legLength', 'Leg length', 40, 220], ['limbWidth', 'Limb thickness', 4, 40], ['lineWidth', 'Line width', 1, 20]] as const).map(([k, l, mn, mx]) => (
                  <Slider key={k} label={l} min={mn} max={mx} step={1} value={c.proportions[k]} onChange={(v) => edit((d) => { d.proportions[k] = v; })} />
                ))}
              </Section>
              <Section title="Colors">
                {(Object.keys(c.colors) as (keyof Character['colors'])[]).map((k) => <Color key={k} label={k} value={c.colors[k]} onChange={(v) => edit((d) => { d.colors[k] = v; })} />)}
              </Section>
              <Section title="Notes & asset">
                <Text multiline label="Notes (identity rules)" value={c.notes ?? ''} onChange={(v) => edit((d) => { d.notes = v; })} />
                <div className="flex gap-2">
                  <button className="btn-soft flex-1" onClick={() => { const n = { ...structuredClone(c), id: uid('ch_'), name: `${c.name} copy` }; mutate((d) => { d.characters.unshift(n); }); ui$({ activeCharacterId: n.id }); }}><Copy size={14} />Duplicate</button>
                  <button className="btn-danger" onClick={() => { if (confirmAction(`Delete ${c.name}? Scenes using it will show “Missing character”.`)) { mutate((d) => { d.characters = d.characters.filter((x) => x.id !== c.id); }); ui$({ activeCharacterId: null }); } }}><Trash2 size={14} /></button>
                </div>
              </Section>
            </div>
          )}
          {tab === 'pose' && (
            <div className="p-3 space-y-2">
              <Select label="Start from" value="" options={[{ value: '', label: 'Load a pose…' }, ...Object.keys(assets.poses).map((p) => ({ value: p, label: p }))]} onChange={(v) => v && setDraftPose({ ...assets.poses[v] })} />
              {JOINTS.map((j) => <Slider key={j.k} label={j.label} min={j.min} max={j.max} step={1} suffix={j.k === 'lift' ? 'px' : '°'} value={draftPose[j.k]} onChange={(v) => setDraftPose({ ...draftPose, [j.k]: v })} />)}
              <div className="flex gap-2 pt-1">
                <input className="input" value={poseName} onChange={(e) => setPoseName(e.target.value)} />
                <button className="btn-primary" onClick={() => { const id = `pose_${slug(poseName)}_${uid().slice(-4)}`; mutate((d) => { d.poses.unshift({ id, name: poseName, pose: { ...draftPose } }); }); toast(`Pose “${poseName}” saved — usable by every character`); }}><Save size={14} />Save</button>
              </div>
              {customPoses.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="label">Custom poses</div>
                  {customPoses.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-[12px]">
                      <button className="flex-1 text-left hover:text-accent truncate" onClick={() => setDraftPose({ ...p.pose })}>{p.name}</button>
                      <button className="icon-btn w-6 h-6" onClick={() => mutate((d) => { d.poses = d.poses.filter((x) => x.id !== p.id); })}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'movement' && (
            <div className="p-3 space-y-2">
              <p className="text-[11px] text-slate-500">A movement loops through poses. Each step blends to the next using its easing.</p>
              {steps.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_70px_1fr_auto] gap-1 items-center">
                  <select className="input h-7 text-[12px]" value={s.pose} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, pose: e.target.value } : x)))}>{Object.keys(assets.poses).map((p) => <option key={p}>{p}</option>)}</select>
                  <Num value={s.duration} step={0.05} min={0.05} suffix="s" onChange={(v) => setSteps(steps.map((x, j) => (j === i ? { ...x, duration: v } : x)))} />
                  <select className="input h-7 text-[12px]" value={s.easing as string} onChange={(e) => setSteps(steps.map((x, j) => (j === i ? { ...x, easing: e.target.value as Easing } : x)))}>{EASING_NAMES.map((n) => <option key={n}>{n}</option>)}</select>
                  <button className="icon-btn w-6 h-6" disabled={steps.length <= 2} onClick={() => setSteps(steps.filter((_, j) => j !== i))}><X size={12} /></button>
                </div>
              ))}
              <button className="btn-soft w-full h-7 text-[12px]" onClick={() => setSteps([...steps, { pose: 'idle', duration: 0.5, easing: 'easeInOut' }])}><Plus size={12} />Add step</button>
              <div className="flex gap-2 pt-1">
                <input className="input" value={moveName} onChange={(e) => setMoveName(e.target.value)} />
                <button className="btn-primary" onClick={() => { const id = `mv_${slug(moveName)}_${uid().slice(-4)}`; mutate((d) => { d.movements.unshift({ id, name: moveName, steps: structuredClone(steps) }); }); setMove(id); toast(`Movement “${moveName}” saved to library`); }}><Save size={14} />Save</button>
              </div>
              {customMoves.length > 0 && (
                <div className="space-y-1 pt-2">
                  <div className="label">Custom movements</div>
                  {customMoves.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-[12px]">
                      <button className="flex-1 text-left hover:text-accent truncate" onClick={() => { setSteps(structuredClone(m.steps ?? [])); setMoveName(m.name); }}>{m.name}</button>
                      <button className="icon-btn w-6 h-6" onClick={() => mutate((d) => { d.movements = d.movements.filter((x) => x.id !== m.id); })}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ExportDialog open={!!exp} source={exp} onClose={() => setExp(null)} />
    </div>
  );
}
