import { emptyProject, defaultCaptionStyle } from '../../shared/defaults.js';
import { navigate } from './router.js';

// Creates a project pre-filled with the global defaults from Settings.
export async function createProject(store, overrides = {}, { open = true, tab = '' } = {}) {
  const s = store.settings || {};
  const d = s.defaults || {};
  const capPreset = store.presets.find((p) => p.id === d.captionPresetId && p.kind === 'caption');
  const base = emptyProject({
    characterId: d.characterId && store.characters.some((c) => c.id === d.characterId) ? d.characterId : store.characters[0]?.id || null,
    format: d.format || 'shorts',
    thumbnail: { hue: Math.floor(Math.random() * 360), label: '' },
  });
  base.captions.style = { ...defaultCaptionStyle(), ...(capPreset?.data || {}) };
  base.voice.settings = { ...base.voice.settings, ...(s.voiceSettings || {}) };
  base.voice.voiceId = d.voiceId || null;
  base.voice.voiceName = d.voiceName || 'Quentin';
  base.script.engine = d.scriptEngine || 'local';
  const project = await store.createDoc('projects', { ...base, ...overrides });
  if (open) navigate(`/projects/${project.id}${tab ? `/${tab}` : ''}`);
  return project;
}
