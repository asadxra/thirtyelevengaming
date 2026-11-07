// Initial data: settings, presets, a draft character based on the uploaded reference,
// and realistic sample projects (flagged `sample: true`) until real projects exist.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_THEME, defaultCharacter, defaultCaptionStyle, emptyProject, emptyScript, DEFAULT_VOICE_SETTINGS, defaultVisualProps,
} from '../shared/defaults.js';
import { buildScenes, captionsFromScenes, hashText, scriptToText } from '../shared/scenes.js';
import { localGenerate } from './scriptwriter.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const iso = (daysAgo, h = 10) => new Date(Date.now() - daysAgo * 864e5 - h * 36e5).toISOString();

function settings() {
  return {
    theme: { ...DEFAULT_THEME },
    defaults: { characterId: 'char_shadow', voiceName: 'Quentin', voiceId: null, format: 'shorts', captionPresetId: 'cp_highlight', animationPresetId: 'ap_cinematic', scriptEngine: 'local' },
    voiceSettings: { ...DEFAULT_VOICE_SETTINGS },
    storage: { autosave: true, autosaveDelay: 1200, keepScriptVersions: 15 },
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

function makeProject({ id, title, theme, daysAgo, stage, format = 'shorts', hue, archived = false, seed }) {
  const p = emptyProject({ id, title, format, archived, sample: true, characterId: 'char_shadow', thumbnail: { hue, label: theme } });
  p.script = emptyScript();
  p.script.inputs = { ...p.script.inputs, theme, topic: title, duration: format === 'shorts' ? 45 : 90 };
  p.createdAt = iso(daysAgo + 3);
  p.updatedAt = iso(daysAgo);
  if (stage === 'empty') return p;
  p.script.sections = localGenerate(p.script.inputs, { seed });
  p.script.status = stage === 'draft' ? 'draft' : 'completed';
  p.script.engine = 'local';
  p.script.lastGeneratedAt = p.updatedAt;
  if (stage === 'draft') return p;
  p.scenes = buildScenes(p.script.sections);
  p.scenesSourceHash = hashText(scriptToText(p.script.sections));
  p.captions.items = captionsFromScenes(p.scenes, 'sentence');
  p.captions.generatedAt = p.updatedAt;
  p.visuals = p.scenes.flatMap((s, i) => s.visualTypes.map((type, j) => ({ id: `vis_${id}_${i}_${j}`, sceneId: s.id, type, props: defaultVisualProps(type) })));
  if (stage === 'script') return p;
  // Sample voiceover markers (no audio file — the UI labels them as samples).
  p.voice.clips = Object.fromEntries(p.scenes.map((s) => [s.id, { url: null, sample: true, hash: hashText(s.voiceover), generatedAt: p.updatedAt }]));
  if (stage === 'voice') return p;
  if (stage === 'generated') p.generation = { status: 'generated', approvedAt: iso(daysAgo + 1), lastCheckAt: iso(daysAgo + 1) };
  return p;
}

export function buildSeed({ uploadDir, settingsOnly = false } = {}) {
  if (settingsOnly) return { settings: settings() };

  // Copy the reference image into uploads so it is managed like any other asset.
  let refUrl = null;
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.copyFileSync(path.join(here, 'seed', 'reference-character.png'), path.join(uploadDir, 'reference-character.png'));
    refUrl = '/uploads/reference-character.png';
  } catch { /* reference image optional */ }

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
    makeProject({ id: 'proj_why', title: 'Why Most Traders Start for the Wrong Reason', theme: 'Why people start trading', daysAgo: 0.2, stage: 'voice', hue: 270, seed: 11 }),
    makeProject({ id: 'proj_revenge', title: 'The Trade After the Loss', theme: 'Revenge trading', daysAgo: 1, stage: 'script', hue: 350, seed: 22 }),
    makeProject({ id: 'proj_patience', title: 'Six Hours of Doing Nothing', theme: 'Patience', daysAgo: 2.5, stage: 'draft', hue: 190, seed: 33 }),
    makeProject({ id: 'proj_streak', title: 'Seven Losses in a Row', theme: 'Losing streaks', daysAgo: 4, stage: 'generated', hue: 220, seed: 44, format: 'landscape' }),
    makeProject({ id: 'proj_risk', title: 'Right Direction, Wrong Size', theme: 'Risk management', daysAgo: 6, stage: 'empty', hue: 150, seed: 55 }),
    makeProject({ id: 'proj_fomo', title: 'Forty Percent Too Late', theme: 'Fear of missing out', daysAgo: 12, stage: 'script', hue: 30, seed: 66, archived: true }),
  ];

  const assets = refUrl
    ? [{ id: 'asset_reference', name: 'Main character reference', kind: 'image', url: refUrl, mime: 'image/png', size: 0, tags: ['character', 'reference'], createdAt: iso(21), updatedAt: iso(21) }]
    : [];

  const activity = [
    { id: 'act_1', type: 'project', text: 'Updated scenes in “Why Most Traders Start for the Wrong Reason”', ref: 'proj_why', createdAt: iso(0.2) },
    { id: 'act_2', type: 'script', text: 'Completed script for “The Trade After the Loss”', ref: 'proj_revenge', createdAt: iso(1) },
    { id: 'act_3', type: 'script', text: 'Drafted script for “Six Hours of Doing Nothing”', ref: 'proj_patience', createdAt: iso(2.5) },
    { id: 'act_4', type: 'project', text: 'Marked “Seven Losses in a Row” as generated (sample)', ref: 'proj_streak', createdAt: iso(4) },
    { id: 'act_5', type: 'character', text: 'Uploaded reference image for “The Shadow Trader”', ref: 'char_shadow', createdAt: iso(21) },
  ];

  return { settings: settings(), projects, characters: [character], assets, activity, presets: presets(), meta: { seededAt: new Date().toISOString(), version: 1 } };
}
