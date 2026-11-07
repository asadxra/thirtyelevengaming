// Server seeding: copies the reference image into uploads, then builds the shared seed data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeedData } from '../shared/seedData.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function buildSeed({ uploadDir, settingsOnly = false } = {}) {
  if (settingsOnly) return buildSeedData({ settingsOnly: true });
  let refUrl = null;
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.copyFileSync(path.join(here, 'seed', 'reference-character.png'), path.join(uploadDir, 'reference-character.png'));
    refUrl = '/uploads/reference-character.png';
  } catch { /* reference image optional */ }
  return buildSeedData({ refUrl });
}
