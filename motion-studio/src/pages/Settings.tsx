import { Copy, Download, FileUp, Palette, RotateCcw, Settings as Cog, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { EASING_NAMES } from '../engine/easing';
import { BUILTIN_MOVEMENTS } from '../engine/poses';
import { BackgroundView, FONT_OPTIONS } from '../engine/render';
import type { Easing } from '../engine/schema';
import { downloadBlob } from '../export/video';
import { uid } from '../lib/factory';
import type { StylePreset } from '../lib/presets';
import { buildSeed } from '../store/seed';
import { allPresets, pickData, useStore } from '../store/store';
import { Color, confirmAction, cx, Num, PageHeader, Section, Select, Slider, Text, Toggle } from '../ui/kit';
import { ANIM_TYPES, BackgroundEditor, LOOP_TYPES, TRANSITIONS } from './editor/Inspector';

const ACCENTS = ['#9b5cff', '#7c3aed', '#c026d3', '#ec4899', '#22d3ee', '#22c55e', '#f59e0b', '#ef4444'];

export function Settings() {
  const s = useStore();
  const set = (fn: (st: typeof s.settings) => void) => s.mutate((d) => fn(d.settings), false);
  const presets = allPresets(s);
  const [pid, setPid] = useState(presets[0].id);
  const preset = presets.find((p) => p.id === pid) ?? presets[0];
  const editable = !preset.builtin;
  const [usage, setUsage] = useState<string>('');

  const editP = (fn: (p: StylePreset) => void) => s.mutate((d) => { const p = d.presets.find((x) => x.id === preset.id); if (p) fn(p as StylePreset); });
  const dupPreset = () => { const n = { ...structuredClone(preset), id: uid('preset_'), name: `${preset.name} (custom)`, builtin: false }; s.mutate((d) => { d.presets.push(n); }); setPid(n.id); };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <PageHeader icon={<Cog size={20} />} title="Settings" subtitle="Interface, defaults, animation style presets and data." />
      <div className="grid xl:grid-cols-[380px_1fr] gap-5">
        <div className="space-y-4">
          <div className="panel">
            <Section title="Appearance">
              <div className="label">Accent lighting</div>
              <div className="flex flex-wrap gap-2 items-center">
                {ACCENTS.map((c) => <button key={c} className={cx('w-7 h-7 rounded-full border-2', s.settings.accent === c ? 'border-white' : 'border-transparent')} style={{ background: c, boxShadow: `0 0 14px ${c}88` }} onClick={() => set((x) => { x.accent = c; })} />)}
                <input type="color" className="w-7 h-7" value={s.settings.accent} onChange={(e) => set((x) => { x.accent = e.target.value; })} />
              </div>
              <Slider label="Glow intensity" min={0} max={2} step={0.05} value={s.settings.glow} onChange={(v) => set((x) => { x.glow = v; })} />
              <Toggle label="Reduce motion (UI previews)" value={s.settings.reduceMotion} onChange={(v) => set((x) => { x.reduceMotion = v; })} />
              <Toggle label="Show safe zones in editor" value={s.settings.showSafeZones} onChange={(v) => set((x) => { x.showSafeZones = v; })} />
            </Section>
            <Section title="Defaults">
              <div className="grid grid-cols-2 gap-2">
                <Select label="Frame rate" value={String(s.settings.defaultFps)} options={['24', '30', '60']} onChange={(v) => set((x) => { x.defaultFps = +v; })} />
                <Select label="Format" value={s.settings.defaultFormat} options={[{ value: 'landscape', label: '16:9' }, { value: 'shorts', label: '9:16' }]} onChange={(v) => set((x) => { x.defaultFormat = v; })} />
              </div>
              <Select label="Default style preset" value={s.settings.defaultPresetId} options={presets.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => set((x) => { x.defaultPresetId = v; })} />
              <Num label="GIF max width" suffix="px" value={s.settings.gifMaxWidth} onChange={(v) => set((x) => { x.gifMaxWidth = v; })} />
            </Section>
            <Section title="Data">
              <p className="text-[12px] text-slate-400">Everything is saved automatically in this browser (IndexedDB). Back up regularly.</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-soft" onClick={() => downloadBlob(new Blob([JSON.stringify({ schema: 'motion-studio/backup@1', at: new Date().toISOString(), data: pickData(useStore.getState()) })], { type: 'application/json' }), `motion-studio-backup-${new Date().toISOString().slice(0, 10)}.json`)}><Download size={14} />Backup</button>
                <label className="btn-soft cursor-pointer"><FileUp size={14} />Restore<input type="file" accept=".json" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j.data?.projects) throw new Error('not a backup'); if (confirmAction('Replace ALL current data with this backup?')) { s.replaceData(j.data); s.toast('Backup restored'); } } catch (err) { s.toast(`Restore failed: ${(err as Error).message}`, 'err'); } e.target.value = ''; }} /></label>
                <button className="btn-danger" onClick={() => { if (confirmAction('Reset everything to the demo content? Your work will be lost unless backed up.')) { s.replaceData(buildSeed()); s.toast('Reset to demo data'); } }}><RotateCcw size={14} />Reset</button>
                <button className="btn-ghost" onClick={async () => { const e = await navigator.storage?.estimate?.(); setUsage(e ? `${((e.usage ?? 0) / 1048576).toFixed(1)} MB used of ${((e.quota ?? 0) / 1073741824).toFixed(1)} GB` : 'Unavailable'); }}>Storage usage</button>
              </div>
              {usage && <div className="text-[12px] text-slate-400">{usage}</div>}
            </Section>
          </div>
        </div>

        <div className="panel">
          <div className="flex flex-wrap items-center gap-2 p-3 border-b border-white/[0.06]">
            <Palette size={16} className="text-accent" /><span className="font-semibold mr-2">Animation style presets</span>
            <select className="input h-8 w-auto" value={preset.id} onChange={(e) => setPid(e.target.value)}>{presets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.builtin ? '' : ' ✎'}</option>)}</select>
            <button className="btn-soft h-8" onClick={dupPreset}><Copy size={14} />{editable ? 'Duplicate' : 'Duplicate to edit'}</button>
            {editable && <button className="btn-danger h-8" onClick={() => { if (confirmAction(`Delete ${preset.name}?`)) { s.mutate((d) => { d.presets = d.presets.filter((x) => x.id !== preset.id); }); setPid(presets[0].id); } }}><Trash2 size={14} /></button>}
          </div>
          <div className="grid lg:grid-cols-[1fr_1fr]">
            <fieldset disabled={!editable} className="min-w-0">
              {!editable && <div className="mx-3 mt-3 text-[12px] text-amber-300/90">Built-in preset — duplicate it to customise.</div>}
              <Section title="Identity">
                <Text label="Name" value={preset.name} onChange={(v) => editP((p) => { p.name = v; })} />
                <Text multiline label="Description" value={preset.description} onChange={(v) => editP((p) => { p.description = v; })} />
                <Select label="Character style" value={preset.characterStyle} options={['stickman', 'minimal', 'cartoon', 'educational', 'image']} onChange={(v) => editP((p) => { p.characterStyle = v; })} />
                <div className="grid grid-cols-2 gap-2">
                  <Select label="Character hair" value={preset.character.hair} options={['none', 'short', 'long', 'spiky', 'bun', 'curly', 'cap']} onChange={(v) => editP((p) => { p.character.hair = v; })} />
                  <Select label="Character outfit" value={preset.character.outfit} options={['tshirt', 'suit', 'hoodie', 'dress', 'labcoat']} onChange={(v) => editP((p) => { p.character.outfit = v; })} />
                </div>
                {(['skin', 'shirt', 'pants', 'hair', 'outline'] as const).map((k) => <Color key={k} label={`char ${k}`} value={preset.character.colors[k] ?? '#888888'} onChange={(v) => editP((p) => { p.character.colors[k] = v; })} />)}
              </Section>
              <Section title="Colors & visual identity">
                {(Object.keys(preset.palette) as (keyof StylePreset['palette'])[]).map((k) => <Color key={k} label={k} value={preset.palette[k]} onChange={(v) => editP((p) => { p.palette[k] = v; })} />)}
                <Text label="Illustration fills (comma separated)" value={preset.illustration.fills.join(', ')} onChange={(v) => editP((p) => { p.illustration.fills = v.split(',').map((x) => x.trim()).filter(Boolean); })} />
                <div className="grid grid-cols-2 gap-2">
                  <Num label="Line width" value={preset.lineWidth} onChange={(v) => editP((p) => { p.lineWidth = v; })} />
                  <Num label="Outline W" value={preset.illustration.outlineWidth} onChange={(v) => editP((p) => { p.illustration.outlineWidth = v; })} />
                </div>
              </Section>
              <Section title="Typography">
                <Select label="Font" value={preset.typography.fontFamily} options={FONT_OPTIONS} onChange={(v) => editP((p) => { p.typography.fontFamily = v; })} />
                <div className="grid grid-cols-2 gap-2">
                  <Num label="Heading wt" step={100} value={preset.typography.headingWeight} onChange={(v) => editP((p) => { p.typography.headingWeight = v; })} />
                  <Num label="Body wt" step={100} value={preset.typography.bodyWeight} onChange={(v) => editP((p) => { p.typography.bodyWeight = v; })} />
                  <Num label="Heading size" value={preset.typography.headingSize} onChange={(v) => editP((p) => { p.typography.headingSize = v; })} />
                  <Num label="Spacing" value={preset.typography.letterSpacing} onChange={(v) => editP((p) => { p.typography.letterSpacing = v; })} />
                </div>
                <Toggle small label="Uppercase" value={preset.typography.uppercase} onChange={(v) => editP((p) => { p.typography.uppercase = v; })} />
              </Section>
            </fieldset>
            <fieldset disabled={!editable} className="min-w-0 lg:border-l border-white/[0.06]">
              <div className="p-3">
                <svg viewBox="0 0 1920 1080" className="w-full rounded-lg block">
                  <BackgroundView bg={preset.background} W={1920} H={1080} t={0} id="sp-prev" />
                  <text x={960} y={470} textAnchor="middle" fontFamily={preset.typography.fontFamily} fontWeight={preset.typography.headingWeight} fontSize={preset.typography.headingSize * 1.4} fill={preset.palette.text} letterSpacing={preset.typography.letterSpacing}>{preset.typography.uppercase ? 'YOUR STYLE' : 'Your Style'}</text>
                  {preset.illustration.fills.map((c, i) => <rect key={i} x={560 + i * 220} y={640} width={180} height={180} rx={28} fill={c} stroke={preset.illustration.outline} strokeWidth={preset.illustration.outlineWidth} />)}
                </svg>
              </div>
              <Section title="Background style"><BackgroundEditor bg={preset.background} onChange={(fn) => editP((p) => fn(p.background))} /></Section>
              <Section title="Animation behaviour">
                <div className="grid grid-cols-3 gap-2">
                  <Select label="Entrance" value={preset.animation.in.type} options={ANIM_TYPES} onChange={(v) => editP((p) => { p.animation.in.type = v; })} />
                  <Num label="Dur" step={0.05} value={preset.animation.in.duration} onChange={(v) => editP((p) => { p.animation.in.duration = v; })} />
                  <Select label="Easing" value={preset.animation.in.easing as string} options={EASING_NAMES} onChange={(v) => editP((p) => { p.animation.in.easing = v as Easing; })} />
                  <Select label="Exit" value={preset.animation.out.type} options={ANIM_TYPES} onChange={(v) => editP((p) => { p.animation.out.type = v; })} />
                  <Num label="Dur" step={0.05} value={preset.animation.out.duration} onChange={(v) => editP((p) => { p.animation.out.duration = v; })} />
                  <Num label="Stagger" step={0.01} value={preset.animation.stagger} onChange={(v) => editP((p) => { p.animation.stagger = v; })} />
                </div>
              </Section>
              <Section title="Movement characteristics">
                <div className="grid grid-cols-2 gap-2">
                  <Select label="Default movement" value={preset.movement.default} options={BUILTIN_MOVEMENTS.map((m) => ({ value: m.id, label: m.name }))} onChange={(v) => editP((p) => { p.movement.default = v; })} />
                  <Num label="Speed" step={0.05} value={preset.movement.speed} onChange={(v) => editP((p) => { p.movement.speed = v; })} />
                  <Select label="Idle loop" value={preset.movement.loop.type} options={LOOP_TYPES} onChange={(v) => editP((p) => { p.movement.loop.type = v; })} />
                  <Num label="Loop amt" step={0.5} value={preset.movement.loop.amount} onChange={(v) => editP((p) => { p.movement.loop.amount = v; })} />
                </div>
              </Section>
              <Section title="Transitions & effects">
                <div className="grid grid-cols-3 gap-2">
                  <Select label="Transition" value={preset.transition.type} options={TRANSITIONS} onChange={(v) => editP((p) => { p.transition.type = v; })} />
                  <Num label="Dur" step={0.05} value={preset.transition.duration} onChange={(v) => editP((p) => { p.transition.duration = v; })} />
                  <Select label="Easing" value={preset.transition.easing as string} options={EASING_NAMES} onChange={(v) => editP((p) => { p.transition.easing = v as Easing; })} />
                </div>
                <Toggle small label="Glow on text, counters & charts" value={preset.effects.glow} onChange={(v) => editP((p) => { p.effects.glow = v; })} />
                {preset.effects.glow && <div className="grid grid-cols-[1fr_90px] gap-2"><Color value={preset.effects.glowColor} onChange={(v) => editP((p) => { p.effects.glowColor = v; })} /><Num label="Size" value={preset.effects.glowSize} onChange={(v) => editP((p) => { p.effects.glowSize = v; })} /></div>}
                <Toggle small label="Soft drop shadows" value={preset.effects.shadow} onChange={(v) => editP((p) => { p.effects.shadow = v; })} />
              </Section>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}
