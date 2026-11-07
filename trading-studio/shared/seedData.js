// Initial data: settings, presets, a draft character based on the uploaded reference,
// and realistic sample projects (flagged `sample: true`) until real projects exist.
import {
  DEFAULT_THEME, defaultCharacter, defaultCaptionStyle, emptyProject, emptyScript, DEFAULT_VOICE_SETTINGS, defaultVisualProps,
} from './defaults.js';
import { buildScenes, captionsFromScenes, hashText, scriptToText } from './scenes.js';
import { composeScript } from './writer.js';
import { conceptById } from './concepts.js';
import { toBars } from './market.js';
import { DETECTORS } from './detectors.js';
import { snapshotExample } from './examples.js';
import NQ5M from './seed-market/nq5m.js';

const iso = (daysAgo, h = 10) => new Date(Date.now() - daysAgo * 864e5 - h * 36e5).toISOString();

function settings() {
  return {
    theme: { ...DEFAULT_THEME },
    defaults: { characterId: 'char_shadow', voiceName: 'Quentin', voiceId: null, format: 'shorts', captionPresetId: 'cp_highlight', animationPresetId: 'ap_cinematic', scriptEngine: 'local' },
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
    storage: { autosave: true, autosaveDelay: 1200, keepScriptVersions: 15 },
    explainerVersion: 2,
    customConcepts: [],
  };
}

function presets() {
  return [
    { id: 'cp_highlight', kind: 'caption', name: 'Neon highlight (Shorts)', data: defaultCaptionStyle() },
    { id: 'cp_minimal', kind: 'caption', name: 'Minimal documentary', data: defaultCaptionStyle({ font: 'Inter', size: 44, weight: 500, animation: 'minimal', outline: 0, shadow: 8, highlight: '#ffffff' }) },
    { id: 'cp_punch', kind: 'caption', name: 'Bold pop-up', data: defaultCaptionStyle({ font: 'Anton', size: 76, weight: 700, animation: 'pop', uppercase: true, highlight: '#a855f7', position: 'middle' }) },
    { id: 'ap_cinematic', kind: 'animation', name: 'Slow cinematic', data: { speed: 0.8, intensity: 0.8, camera: 'Slow dolly-in', transitions: 'Crossfade 0.6s' } },
    { id: 'ap_energetic', kind: 'animation', name: 'Energetic Shorts', data: { speed: 1.3, intensity: 1.2, camera: 'Punch-in zooms', transitions: 'Hard cut + glitch' } },
    { id: 'ap_calm', kind: 'animation', name: 'Calm reflective', data: { speed: 0.6, intensity: 0.6, camera: 'Static with slow drift', transitions: 'Fade through black' } },
    {
      id: 'vp_terminal_room', kind: 'visual', name: 'Late-night trading room',
      data: [
        { type: 'screens', props: defaultVisualProps('screens') },
        { type: 'code', props: defaultVisualProps('code') },
        { type: 'lighting', props: defaultVisualProps('lighting') },
      ],
    },
    {
      id: 'vp_red_day', kind: 'visual', name: 'Red day pressure',
      data: [
        { type: 'ticker', props: { ...defaultVisualProps('ticker'), color: '#ef4444' } },
        { type: 'candles', props: { ...defaultVisualProps('candles'), color: '#ef4444' } },
        { type: 'terminal', props: { ...defaultVisualProps('terminal'), color: '#ef4444' } },
      ],
    },
  ].map((p) => ({ ...p, createdAt: iso(20), updatedAt: iso(20) }));
}

const NQ_META = { symbol: NQ5M.symbol, interval: NQ5M.interval, source: NQ5M.source };

export function seedDataset() {
  return { ...NQ5M, name: `${NQ5M.label} · ${NQ5M.interval} · Nov 5–6 2026`, createdAt: '2026-11-07T00:00:00.000Z', updatedAt: '2026-11-07T00:00:00.000Z' };
}

function makeProject({ id, title, conceptId, daysAgo, stage, format = 'shorts', hue, n = 1 }) {
  const p = emptyProject({ id, title, format, sample: true, characterId: 'char_shadow', conceptId, thumbnail: { hue, label: conceptById(conceptId)?.short || '' } });
  p.market = { symbol: NQ5M.symbol, timeframe: '5m' };
  p.script = emptyScript();
  p.script.inputs = { ...p.script.inputs, length: format === 'shorts' ? 'short' : 'long', duration: format === 'shorts' ? 60 : 240 };
  p.createdAt = iso(daysAgo + 2);
  p.updatedAt = iso(daysAgo);
  const bars = toBars(NQ5M);
  const concept = conceptById(conceptId);
  const found = DETECTORS[concept.detector](bars).slice(0, n);
  p.examples = found.map((ex) => ({ ...snapshotExample(bars, ex, { ...NQ_META, conceptId }), id: `ex_${id}_${ex.rank}` }));
  if (stage === 'examples') return p;
  p.script.sections = composeScript({ concept, examples: p.examples, inputs: p.script.inputs });
  p.script.status = stage === 'draft' ? 'draft' : 'completed';
  p.script.engine = 'local';
  p.script.lastGeneratedAt = p.updatedAt;
  if (stage === 'draft') return p;
  p.scenes = buildScenes(p.script.sections, { examples: p.examples });
  p.scenesSourceHash = hashText(scriptToText(p.script.sections));
  p.captions.items = captionsFromScenes(p.scenes, 'sentence');
  p.captions.generatedAt = p.updatedAt;
  return p;
}

export function buildSeedData({ refUrl = null, settingsOnly = false } = {}) {
  if (settingsOnly) return { settings: settings() };

  const character = {
    ...defaultCharacter({
      name: 'The Shadow Trader',
      description: 'Solid black silhouette, spiky swept hair, two round white eyes, no mouth. Narrow shoulders, simple rounded torso. Calm, quiet presence — the everyday trader in the dark.',
      referenceAssetId: refUrl ? 'asset_reference' : null,
      referenceUrl: refUrl,
      style: 'silhouette',
      status: 'draft',
    }),
    id: 'char_shadow',
    createdAt: iso(21),
    updatedAt: iso(21),
  };
  character.clothingPresets = [{ id: 'cl_default', name: 'Pure silhouette', clothing: 'none (silhouette)', shoes: 'none', accessories: [], colors: { ...character.colors } }];
  character.animationPresets = [{ id: 'an_default', name: 'Night trader', default: 'sitting', speed: 0.9, intensity: 0.8 }];

  const projects = [
    makeProject({ id: 'proj_fvg', title: 'Fair Value Gaps on a Real NQ Chart', conceptId: 'fvg', daysAgo: 0.2, stage: 'scenes', hue: 270 }),
    makeProject({ id: 'proj_sweep', title: 'Liquidity Sweeps Explained (NQ, Nov 6)', conceptId: 'sweep', daysAgo: 1, stage: 'draft', hue: 45, format: 'landscape', n: 2 }),
    makeProject({ id: 'proj_mss', title: 'Market Structure Shift: Spot the Turn', conceptId: 'mss', daysAgo: 2, stage: 'examples', hue: 190 }),
  ];

  const assets = refUrl
    ? [{ id: 'asset_reference', name: 'Main character reference', kind: 'image', url: refUrl, mime: 'image/png', size: 0, tags: ['character', 'reference'], createdAt: iso(21), updatedAt: iso(21) }]
    : [];

  const activity = [
    { id: 'act_1', type: 'project', text: 'Built scenes for “Fair Value Gaps on a Real NQ Chart”', ref: 'proj_fvg', createdAt: iso(0.2) },
    { id: 'act_2', type: 'script', text: 'Drafted script for “Liquidity Sweeps Explained (NQ, Nov 6)”', ref: 'proj_sweep', createdAt: iso(1) },
    { id: 'act_3', type: 'project', text: 'Approved a real MSS example from NQ 5m (TradingView data)', ref: 'proj_mss', createdAt: iso(2) },
    { id: 'act_4', type: 'character', text: 'Uploaded reference image for “The Shadow Trader”', ref: 'char_shadow', createdAt: iso(21) },
  ];

  return { settings: settings(), projects, characters: [character], assets, activity, presets: presets(), datasets: [seedDataset()], meta: { seededAt: new Date().toISOString(), version: 2 } };
}
