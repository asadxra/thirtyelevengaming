import { del, get, set } from 'idb-keyval';
import { produce, type Draft } from 'immer';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { builtinIllustrations } from '../engine/illustrations';
import { BUILTIN_MOVEMENTS, BUILTIN_POSES } from '../engine/poses';
import type { AssetBundle, Background, Character, Effects, FormatDef, Illustration, LoopSpec, MovementDef, PoseDef, Scene } from '../engine/schema';
import { cloneScene, DEFAULT_FORMATS, newCharacter, uid } from '../lib/factory';
import { BUILTIN_PRESETS, type StylePreset } from '../lib/presets';
import { buildSeed } from './seed';

export type Page = 'dashboard' | 'scene' | 'character' | 'illustration' | 'motion' | 'library' | 'projects' | 'export' | 'settings';

export interface ExportRecord {
  id: string;
  at: number;
  label: string;
  kind: 'scene' | 'sequence' | 'clip' | 'illustration' | 'character' | 'package' | 'prompt' | 'project';
  fileType: string;
  formats: string[];
  dims: string;
  fps: number;
  status: 'done' | 'failed';
  sizeBytes?: number;
  projectId?: string;
  note?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  formatId: string;
  presetId: string;
  formats: FormatDef[];
  scenes: Scene[];
  clipIds: string[];
  exportHistory: ExportRecord[];
  createdAt: number;
  updatedAt: number;
}

export type ClipKind = 'animation' | 'motion' | 'transition' | 'effect' | 'movement';

export interface Clip {
  id: string;
  name: string;
  kind: ClipKind;
  category: string;
  tags: string[];
  scene: Scene;
  formats: FormatDef[];
  presetId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SceneTemplate { id: string; name: string; scene: Scene; createdAt: number }
export interface SavedBackground { id: string; name: string; background: Background }
export interface SavedEffect { id: string; name: string; effects: Effects; loop: LoopSpec }

export interface Settings {
  accent: string;
  glow: number;
  defaultFps: number;
  defaultFormat: string;
  showSafeZones: boolean;
  reduceMotion: boolean;
  defaultPresetId: string;
  gifMaxWidth: number;
}

export interface StudioData {
  projects: Project[];
  clips: Clip[];
  characters: Character[];
  illustrations: Illustration[];
  poses: PoseDef[];
  movements: MovementDef[];
  presets: StylePreset[];
  templates: SceneTemplate[];
  backgrounds: SavedBackground[];
  effects: SavedEffect[];
  exportHistory: ExportRecord[];
  settings: Settings;
}

/** What the editor is currently editing. */
export type EditTarget = { kind: 'scene'; projectId: string; sceneId: string } | { kind: 'clip'; clipId: string };

export interface UIState {
  page: Page;
  sidebarCollapsed: boolean;
  activeProjectId: string | null;
  target: EditTarget | null;
  selectedIds: string[];
  selectedKeyframe: { elementId: string; prop: string; id: string } | null;
  time: number;
  playing: boolean;
  loop: boolean;
  playbackRate: number;
  formatId: string;
  zoom: number;
  showGrid: boolean;
  autoKey: boolean;
  sequencePreview: boolean;
  activeCharacterId: string | null;
  activeIllustrationId: string | null;
  toast: { id: number; text: string; tone: 'ok' | 'err' | 'info' } | null;
}

interface Store extends StudioData {
  ui: UIState;
  past: StudioData[];
  future: StudioData[];
  hydrated: boolean;
  /** mutate persisted data (records undo history unless history=false) */
  mutate: (fn: (d: Draft<StudioData>) => void, history?: boolean) => void;
  ui$: (patch: Partial<UIState> | ((u: UIState) => Partial<UIState>)) => void;
  undo: () => void;
  redo: () => void;
  checkpoint: () => void;
  toast: (text: string, tone?: 'ok' | 'err' | 'info') => void;
  replaceData: (d: StudioData) => void;
}

export const DEFAULT_SETTINGS: Settings = {
  accent: '#9b5cff', glow: 1, defaultFps: 30, defaultFormat: 'landscape', showSafeZones: true, reduceMotion: false,
  defaultPresetId: 'preset-motion2d', gifMaxWidth: 720,
};

const DATA_KEYS: (keyof StudioData)[] = ['projects', 'clips', 'characters', 'illustrations', 'poses', 'movements', 'presets', 'templates', 'backgrounds', 'effects', 'exportHistory', 'settings'];

export const pickData = (s: StudioData): StudioData => Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]])) as unknown as StudioData;

/* debounced IndexedDB storage */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const idbStorage: StateStorage = {
  getItem: async (name) => (await get(name)) ?? null,
  setItem: (name, value) => {
    clearTimeout(timers.get(name));
    timers.set(name, setTimeout(() => { set(name, value).catch((e) => console.error('persist failed', e)); }, 350));
  },
  removeItem: (name) => del(name),
};

const initialUI: UIState = {
  page: 'dashboard', sidebarCollapsed: false, activeProjectId: null, target: null, selectedIds: [], selectedKeyframe: null,
  time: 0, playing: false, loop: true, playbackRate: 1, formatId: 'landscape', zoom: 0, showGrid: false, autoKey: false,
  sequencePreview: false, activeCharacterId: null, activeIllustrationId: null, toast: null,
};

let lastHistoryAt = 0;

export const useStore = create<Store>()(
  persist(
    (setState, getState) => ({
      ...buildSeed(),
      ui: initialUI,
      past: [],
      future: [],
      hydrated: false,
      mutate: (fn, history = true) => {
        const s = getState();
        const before = pickData(s);
        const after = produce(before, fn);
        if (after === before) return;
        const now = Date.now();
        // coalesce rapid edits (drags / slider scrubs) into one undo step
        const push = history && now - lastHistoryAt > 400;
        if (history) lastHistoryAt = now;
        setState({ ...after, past: push ? [...s.past.slice(-80), before] : s.past, future: history ? [] : s.future });
      },
      checkpoint: () => { lastHistoryAt = 0; },
      ui$: (patch) => setState((s) => ({ ui: { ...s.ui, ...(typeof patch === 'function' ? patch(s.ui) : patch) } })),
      undo: () => {
        const s = getState();
        const prev = s.past[s.past.length - 1];
        if (!prev) return;
        lastHistoryAt = 0;
        setState({ ...prev, past: s.past.slice(0, -1), future: [pickData(s), ...s.future].slice(0, 80) });
      },
      redo: () => {
        const s = getState();
        const next = s.future[0];
        if (!next) return;
        lastHistoryAt = 0;
        setState({ ...next, past: [...s.past, pickData(s)], future: s.future.slice(1) });
      },
      toast: (text, tone = 'ok') => setState((s) => ({ ui: { ...s.ui, toast: { id: Date.now(), text, tone } } })),
      replaceData: (d) => setState({ ...d, past: [], future: [] }),
    }),
    {
      name: 'motion-studio-v1',
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({ ...pickData(s), ui: { sidebarCollapsed: s.ui.sidebarCollapsed, activeProjectId: s.ui.activeProjectId, target: s.ui.target, formatId: s.ui.formatId, page: s.ui.page, activeCharacterId: s.ui.activeCharacterId, activeIllustrationId: s.ui.activeIllustrationId } }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store> & { ui?: Partial<UIState> };
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) }, ui: { ...current.ui, ...(p.ui ?? {}) } } as Store;
      },
      onRehydrateStorage: () => (state) => { useStore.setState({ hydrated: true }); void state; },
    },
  ),
);

/* --------------------------------------------------------------- selectors */

const BUILTIN_ILLS = builtinIllustrations();
export const builtinIllustrationList = () => BUILTIN_ILLS;

let bundleCache: { key: unknown[]; value: AssetBundle } | null = null;
export function selectAssets(s: StudioData): AssetBundle {
  const key = [s.characters, s.illustrations, s.poses, s.movements];
  if (bundleCache && bundleCache.key.every((k, i) => k === key[i])) return bundleCache.value;
  const value: AssetBundle = {
    characters: Object.fromEntries(s.characters.map((c) => [c.id, c])),
    illustrations: Object.fromEntries([...BUILTIN_ILLS, ...s.illustrations].map((i) => [i.id, i])),
    poses: Object.fromEntries([...BUILTIN_POSES, ...s.poses].map((p) => [p.id, p.pose])),
    movements: Object.fromEntries([...BUILTIN_MOVEMENTS, ...s.movements].map((m) => [m.id, m])),
  };
  bundleCache = { key, value };
  return value;
}

export const useAssets = () => useStore((s) => selectAssets(s));

export function allPresets(s: StudioData): StylePreset[] {
  return [...BUILTIN_PRESETS, ...s.presets];
}

export function findPreset(s: StudioData, id?: string): StylePreset {
  return allPresets(s).find((p) => p.id === id) ?? allPresets(s).find((p) => p.id === s.settings.defaultPresetId) ?? BUILTIN_PRESETS[2];
}

export function allIllustrations(s: StudioData): Illustration[] {
  return [...BUILTIN_ILLS, ...s.illustrations];
}

/** Resolve the scene currently being edited plus its context. */
export function resolveTarget(s: StudioData, t: EditTarget | null) {
  if (!t) return null;
  if (t.kind === 'scene') {
    const project = s.projects.find((p) => p.id === t.projectId);
    const scene = project?.scenes.find((x) => x.id === t.sceneId);
    if (!project || !scene) return null;
    return { scene, formats: project.formats, presetId: scene.presetId ?? project.presetId, project, clip: null as Clip | null, label: `${project.title} › ${scene.name}` };
  }
  const clip = s.clips.find((c) => c.id === t.clipId);
  if (!clip) return null;
  return { scene: clip.scene, formats: clip.formats, presetId: clip.presetId, project: null as Project | null, clip, label: `Clip › ${clip.name}` };
}

/** Get a mutable draft scene for the edit target inside a mutate() recipe. */
export function draftScene(d: Draft<StudioData>, t: EditTarget | null): Draft<Scene> | null {
  if (!t) return null;
  if (t.kind === 'scene') {
    const p = d.projects.find((x) => x.id === t.projectId);
    const sc = p?.scenes.find((x) => x.id === t.sceneId) ?? null;
    if (p && sc) { p.updatedAt = Date.now(); sc.updatedAt = Date.now(); }
    return sc;
  }
  const c = d.clips.find((x) => x.id === t.clipId);
  if (c) c.updatedAt = Date.now();
  return c?.scene ?? null;
}

/* --------------------------------------------------------------- actions */

export const actions = {
  go(page: Page) { useStore.getState().ui$({ page }); },

  newProject(title = 'Untitled Explainer'): Project {
    const s = useStore.getState();
    const preset = findPreset(s, s.settings.defaultPresetId);
    const sc = cloneScene(s.templates[0]?.scene ?? { id: '', name: 'Scene 1', duration: 5, fps: s.settings.defaultFps, background: structuredClone(preset.background), elements: [], camera: { tracks: {}, shake: 0 }, transitionIn: structuredClone(preset.transition) }, 'Scene 1');
    sc.elements = [];
    sc.background = structuredClone(preset.background);
    sc.fps = s.settings.defaultFps;
    sc.presetId = preset.id;
    const p: Project = {
      id: uid('pr_'), title, description: '', formatId: s.settings.defaultFormat, presetId: preset.id, formats: structuredClone(DEFAULT_FORMATS),
      scenes: [sc], clipIds: [], exportHistory: [], createdAt: Date.now(), updatedAt: Date.now(),
    };
    s.mutate((d) => { d.projects.unshift(p as Draft<Project>); });
    s.ui$({ activeProjectId: p.id });
    return p;
  },

  openScene(projectId: string, sceneId: string) {
    useStore.getState().ui$({ page: 'scene', activeProjectId: projectId, target: { kind: 'scene', projectId, sceneId }, selectedIds: [], time: 0, playing: false, selectedKeyframe: null, sequencePreview: false });
  },

  openClip(clipId: string) {
    useStore.getState().ui$({ page: 'motion', target: { kind: 'clip', clipId }, selectedIds: [], time: 0, playing: false, selectedKeyframe: null, sequencePreview: false });
  },

  newCharacter(presetId?: string) {
    const s = useStore.getState();
    const c = newCharacter(findPreset(s, presetId ?? s.settings.defaultPresetId), `Character ${s.characters.length + 1}`);
    s.mutate((d) => { d.characters.unshift(c); });
    s.ui$({ activeCharacterId: c.id, page: 'character' });
    return c;
  },

  logExport(rec: Omit<ExportRecord, 'id' | 'at'>) {
    const r: ExportRecord = { ...rec, id: uid('ex_'), at: Date.now() };
    useStore.getState().mutate((d) => {
      d.exportHistory.unshift(r);
      if (d.exportHistory.length > 300) d.exportHistory.length = 300;
      if (rec.projectId) {
        const p = d.projects.find((x) => x.id === rec.projectId);
        if (p) p.exportHistory.unshift(r);
      }
    }, false);
  },
};
