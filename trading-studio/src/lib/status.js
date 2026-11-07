import { hashText, totalDuration } from '../../shared/scenes.js';
import { SECTIONS } from '../../shared/defaults.js';

export function scriptStatus(p) {
  const s = p.script || {};
  if (s.status === 'completed') return 'completed';
  if (SECTIONS.some((k) => (s.sections?.[k] || '').trim())) return 'draft';
  return 'empty';
}

// Per-scene voice clip state: missing | stale | ready | sample
export function clipState(project, scene) {
  const clip = project.voice?.clips?.[scene.id];
  if (!clip) return 'missing';
  if (clip.hash !== hashText(scene.voiceover || '')) return 'stale';
  return clip.sample && !clip.url ? 'sample' : 'ready';
}

export function voiceStatus(p) {
  const scenes = (p.scenes || []).filter((s) => s.voiceover?.trim());
  if (!scenes.length) return 'none';
  const states = scenes.map((s) => clipState(p, s));
  if (states.every((x) => x === 'ready' || x === 'sample')) return 'completed';
  if (states.some((x) => x === 'stale')) return 'outdated';
  if (states.some((x) => x !== 'missing')) return 'partial';
  return 'none';
}

export function readiness(p, characters = []) {
  const character = characters.find((c) => c.id === p.characterId);
  const checks = [
    { id: 'character', label: 'Approved character selected', ok: !!character && character.status === 'approved', hint: character ? 'Approve the character design in Character Design.' : 'Pick a character in the project overview.' },
    { id: 'examples', label: 'Real chart example approved', ok: (p.examples || []).some((e) => e.approved !== false), hint: 'Find and approve an example in Chart Research.' },
    { id: 'script', label: 'Script marked as completed', ok: scriptStatus(p) === 'completed', hint: 'Finish the script and click “Mark completed”.' },
    { id: 'scenes', label: 'Scenes built with timestamps', ok: (p.scenes || []).length > 0, hint: 'Build scenes from the script in the Scene Builder.' },
    { id: 'chart', label: 'Scenes synced to the chart', ok: (p.scenes || []).some((s) => s.chart), hint: 'Bind scenes to chart steps in the Video editor.' },
    { id: 'voice', label: 'Voiceover generated for every scene', ok: voiceStatus(p) === 'completed', hint: 'Generate missing or outdated clips in Voice Studio.' },
    { id: 'captions', label: 'Captions prepared', ok: (p.captions?.items || []).length > 0, hint: 'Generate captions in the Captions tab.' },
  ];

  return { checks, ready: checks.every((c) => c.ok), done: checks.filter((c) => c.ok).length };
}

// Overall pipeline stage used for filters and badges.
export function generationStatus(p, characters) {
  if (p.generation?.status === 'generated') return 'generated';
  if (p.generation?.status === 'approved') return 'approved';
  return readiness(p, characters).ready ? 'ready' : 'not_ready';
}

export function projectDuration(p) {
  return totalDuration(p.scenes || []);
}

export const STATUS_LABEL = {
  empty: 'No script',
  draft: 'Draft',
  completed: 'Completed',
  none: 'Not started',
  partial: 'Partial',
  outdated: 'Needs update',
  not_ready: 'In progress',
  ready: 'Ready to generate',
  approved: 'Approved · awaiting renderer',
  generated: 'Generated',
};

export const STATUS_TONE = {
  empty: 'muted', draft: 'warn', completed: 'ok', none: 'muted', partial: 'warn', outdated: 'bad',
  not_ready: 'muted', ready: 'accent', approved: 'accent', generated: 'ok',
};
