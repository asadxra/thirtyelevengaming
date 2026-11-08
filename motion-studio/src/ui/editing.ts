import type { Draft } from 'immer';
import { useMemo } from 'react';
import { sampleTrack, TRACK_DEFAULTS } from '../engine/evaluate';
import type { CameraProp, Easing, FormatDef, Keyframe, LayoutBox, Scene, SceneElement, TrackProp } from '../engine/schema';
import { syncAutoLayouts, uid } from '../lib/factory';
import { draftScene, findPreset, resolveTarget, selectAssets, useStore } from '../store/store';

export function useEditing() {
  const target = useStore((s) => s.ui.target);
  const projects = useStore((s) => s.projects);
  const clips = useStore((s) => s.clips);
  const presets = useStore((s) => s.presets);
  const settings = useStore((s) => s.settings);
  const formatId = useStore((s) => s.ui.formatId);
  const ctx = useMemo(() => resolveTarget(useStore.getState(), target), [target, projects, clips]);
  const preset = useMemo(() => findPreset(useStore.getState(), ctx?.presetId), [ctx?.presetId, presets, settings.defaultPresetId]);
  const format: FormatDef | undefined = ctx ? ctx.formats.find((f) => f.id === formatId) ?? ctx.formats[0] : undefined;
  return { target, ctx, scene: ctx?.scene ?? null, formats: ctx?.formats ?? [], format, preset };
}

/* ------------------------------------------------------------- mutations */

export function mutateScene(fn: (s: Draft<Scene>) => void, history = true) {
  const st = useStore.getState();
  st.mutate((d) => { const sc = draftScene(d, st.ui.target); if (sc) fn(sc); }, history);
}

export function mutateElement(id: string, fn: (e: Draft<SceneElement>, s: Draft<Scene>) => void, history = true) {
  mutateScene((s) => { const e = s.elements.find((x) => x.id === id); if (e) fn(e, s); }, history);
}

export function currentFormats(): FormatDef[] {
  const st = useStore.getState();
  return resolveTarget(st, st.ui.target)?.formats ?? [];
}

/** Edit the resting layout in the current format and re-derive auto layouts of other formats. */
export function setLayout(id: string, patch: Partial<LayoutBox>, formatId = useStore.getState().ui.formatId) {
  const formats = currentFormats();
  const assets = selectAssets(useStore.getState());
  mutateElement(id, (e) => {
    const cur = e.layout[formatId] ?? { x: 0, y: 0, scale: 1, rotation: 0 };
    e.layout[formatId] = { ...cur, ...patch, auto: false };
    syncAutoLayouts(e as SceneElement, formats, formatId, assets);
  });
}

/* ------------------------------------------------------------- keyframes */

export function setKeyframe(elId: string, prop: TrackProp, time: number, value: number | string, easing?: Easing) {
  mutateElement(elId, (e) => {
    const tr = (e.tracks[prop] ??= []);
    const t = +time.toFixed(4);
    const hit = tr.find((k) => Math.abs(k.time - t) < 1e-3);
    if (hit) { hit.value = value; if (easing) hit.easing = easing; }
    else tr.push({ id: uid('kf_'), time: t, value, easing: easing ?? (prop === 'pose' ? 'easeInOut' : 'easeInOutCubic') });
    tr.sort((a, b) => a.time - b.time);
  });
}

export function removeKeyframe(elId: string, prop: string, kfId: string) {
  mutateElement(elId, (e) => {
    const tr = e.tracks[prop as TrackProp];
    if (!tr) return;
    const i = tr.findIndex((k) => k.id === kfId);
    if (i >= 0) tr.splice(i, 1);
    if (!tr.length) delete e.tracks[prop as TrackProp];
  });
}

export function updateKeyframe(elId: string, prop: string, kfId: string, patch: Partial<Keyframe>) {
  if (elId === '__camera') {
    mutateScene((s) => { const k = s.camera.tracks[prop as CameraProp]?.find((x) => x.id === kfId); if (k) Object.assign(k, patch); s.camera.tracks[prop as CameraProp]?.sort((a, b) => a.time - b.time); });
    return;
  }
  mutateElement(elId, (e) => {
    const tr = e.tracks[prop as TrackProp];
    const k = tr?.find((x) => x.id === kfId);
    if (k) Object.assign(k, patch);
    tr?.sort((a, b) => a.time - b.time);
  });
}

export function keyAt(tr: Keyframe[] | undefined, t: number) {
  return tr?.find((k) => Math.abs(k.time - t) < 1e-3);
}

export function trackValue(e: SceneElement, prop: Exclude<TrackProp, 'pose'>, t: number) {
  return sampleTrack(e.tracks[prop], t, TRACK_DEFAULTS[prop]);
}

export function setCameraKey(prop: CameraProp, time: number, value: number) {
  mutateScene((s) => {
    const tr = (s.camera.tracks[prop] ??= []);
    const t = +time.toFixed(4);
    const hit = tr.find((k) => Math.abs(k.time - t) < 1e-3);
    if (hit) hit.value = value; else tr.push({ id: uid('kf_'), time: t, value, easing: 'easeInOutCubic' });
    tr.sort((a, b) => a.time - b.time);
  });
}

export function removeCameraKey(prop: CameraProp, id: string) {
  mutateScene((s) => {
    const tr = s.camera.tracks[prop];
    if (!tr) return;
    const i = tr.findIndex((k) => k.id === id);
    if (i >= 0) tr.splice(i, 1);
    if (!tr.length) delete s.camera.tracks[prop];
  });
}

export const snapTime = (t: number, fps: number) => Math.round(t * fps) / fps;
