import JSZip from 'jszip';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CharacterSVG, DEFAULT_POSE } from '../engine/character';
import { elementKeyTimes, layoutFor } from '../engine/evaluate';
import { IllustrationView } from '../engine/render';
import type { AssetBundle, Character, FormatDef, Illustration, Scene } from '../engine/schema';
import type { StylePreset } from '../lib/presets';
import { frameSVG, type RenderSource } from './frames';
import { buildPrompt } from './prompt';
import { exportGIF, exportMP4, exportPNGSequence, exportTransparentWebM, type Progress, slug } from './video';

const engineSources = import.meta.glob('../engine/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface PackageOptions {
  title: string;
  src: RenderSource;
  assets: AssetBundle;
  formats: FormatDef[];
  fps: number;
  preset?: StylePreset;
  include: { mp4: boolean; gif: boolean; webmAlpha: boolean; pngFrames: boolean; remotion: boolean; snapshots: boolean };
  gifMaxWidth: number;
  /** user-edited prompts keyed by format id (otherwise generated) */
  prompts?: Record<string, string>;
  onProgress?: Progress;
  signal?: AbortSignal;
}

export function collectAssets(scenes: Scene[], assets: AssetBundle): AssetBundle {
  const chars = new Set<string>(), ills = new Set<string>(), poses = new Set<string>(), moves = new Set<string>();
  scenes.forEach((s) => s.elements.forEach((e) => {
    if (e.type === 'character') {
      chars.add(e.props.characterId); poses.add(e.props.pose); moves.add(e.props.movement);
      e.tracks.pose?.forEach((k) => poses.add(String(k.value)));
      assets.movements[e.props.movement]?.steps?.forEach((st) => poses.add(st.pose));
    }
    if (e.type === 'illustration') ills.add(e.props.illustrationId);
  }));
  const pick = <T,>(rec: Record<string, T>, ids: Set<string>) => Object.fromEntries([...ids].filter((id) => rec[id]).map((id) => [id, rec[id]]));
  return { characters: pick(assets.characters, chars), illustrations: pick(assets.illustrations, ills), poses: pick(assets.poses, poses), movements: pick(assets.movements, moves) };
}

export function illustrationSVG(il: Illustration, local = 999) {
  return renderToStaticMarkup(
    h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${il.w} ${il.h}`, width: il.w, height: il.h },
      h('g', { transform: `translate(${il.w / 2} ${il.h / 2})` }, h(IllustrationView, { il, local }))),
  );
}

export function characterSheetSVG(c: Character, assets: AssetBundle, poseIds: string[]) {
  const ids = poseIds.length ? poseIds : ['idle'];
  const cell = 420, W = cell * ids.length, H = 560;
  return renderToStaticMarkup(
    h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H },
      h('rect', { width: W, height: H, fill: '#ffffff' }),
      ...ids.map((pid, i) => h('g', { key: pid, transform: `translate(${cell * i + cell / 2} ${H / 2 - 10})` },
        h(CharacterSVG, { c, opts: { pose: assets.poses[pid] ?? DEFAULT_POSE, expression: 'neutral', mouth: -1, time: 0, draw: 1 } }),
        h('text', { y: H / 2 - 20, textAnchor: 'middle', fontFamily: 'Arial', fontSize: 22, fill: '#333' }, pid))),
    ),
  );
}

function dataUrlToBlob(url: string): { blob: Blob; ext: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/.exec(url);
  if (!m) return null;
  const bin = atob(m[2]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const ext = m[1].split('/')[1]?.replace('jpeg', 'jpg').replace('svg+xml', 'svg') ?? 'bin';
  return { blob: new Blob([arr], { type: m[1] }), ext };
}

export function timingData(scenes: Scene[], fps: number) {
  let offset = 0;
  return scenes.map((s) => {
    const r = {
      scene: s.name, id: s.id, startSec: offset, durationSec: s.duration, startFrame: Math.round(offset * fps), frames: Math.round(s.duration * fps), fps,
      transitionIn: s.transitionIn,
      elements: s.elements.map((e) => ({
        id: e.id, name: e.name, type: e.type, startSec: e.start, endSec: e.end, startFrame: Math.round(e.start * fps), endFrame: Math.round(e.end * fps),
        entrance: e.animIn, exit: e.animOut, loop: e.loop, keyTimesSec: elementKeyTimes(e),
      })),
    };
    offset += s.duration;
    return r;
  });
}

export function layersData(scenes: Scene[], formats: FormatDef[]) {
  return scenes.map((s) => ({
    scene: s.name,
    layers: s.elements.map((e, z) => ({ z, id: e.id, name: e.name, type: e.type, hidden: !!e.hidden, layout: Object.fromEntries(formats.map((f) => [f.id, layoutFor(e, f.id)])), effects: e.effects })),
  }));
}

export function keyframesData(scenes: Scene[]) {
  return scenes.map((s) => ({ scene: s.name, camera: s.camera, elements: s.elements.map((e) => ({ id: e.id, name: e.name, tracks: e.tracks })) }));
}

export async function buildPackage(o: PackageOptions): Promise<Blob> {
  const zip = new JSZip();
  const base = slug(o.title);
  const used = collectAssets(o.src.scenes, o.assets);
  const files: string[] = [];
  const steps = o.formats.length * ((o.include.mp4 ? 1 : 0) + (o.include.gif ? 1 : 0) + (o.include.webmAlpha ? 1 : 0) + (o.include.pngFrames ? 1 : 0)) || 1;
  let step = 0;
  const prog = (label: string) => (p: number) => o.onProgress?.((step + p) / steps, label);

  for (const f of o.formats) {
    const tag = f.width > f.height ? '16x9' : f.width < f.height ? '9x16' : `${f.width}x${f.height}`;
    const job = { src: o.src, assets: o.assets, format: f, fps: o.fps, signal: o.signal };
    const refs: string[] = [];
    if (o.include.mp4) {
      const r = await exportMP4({ ...job, onProgress: prog(`MP4 ${tag}`) });
      const name = `reference/${base}-${tag}.${r.ext}`;
      zip.file(name, r.blob); refs.push(name); step++;
    }
    if (o.include.gif) {
      const r = await exportGIF({ ...job, onProgress: prog(`GIF ${tag}`) }, o.gifMaxWidth);
      const name = `reference/${base}-${tag}.gif`;
      zip.file(name, r.blob); refs.push(name); step++;
    }
    if (o.include.webmAlpha) {
      const r = await exportTransparentWebM({ ...job, onProgress: prog(`Alpha video ${tag}`) });
      const name = `reference/${base}-${tag}-transparent.${r.ext}`;
      zip.file(name, r.blob); refs.push(name); step++;
    }
    if (o.include.pngFrames) {
      await exportPNGSequence({ ...job, onProgress: prog(`PNG frames ${tag}`) }, false, zip, `frames/${tag}`);
      refs.push(`frames/${tag}/`); step++;
    }
    const prompt = o.prompts?.[f.id] ?? buildPrompt({ title: o.title, scenes: o.src.scenes, assets: o.assets, format: f, fps: o.fps, preset: o.preset, referenceFiles: refs, onlyElementIds: o.src.onlyElementIds });
    zip.file(`prompts/claude-prompt-${tag}.md`, prompt);
    zip.file(`prompts/claude-prompt-${tag}.txt`, prompt);
    files.push(...refs, `prompts/claude-prompt-${tag}.md`);

    if (o.include.snapshots) {
      const times = new Set<number>([0]);
      let acc = 0;
      o.src.scenes.forEach((s) => { s.elements.forEach((e) => elementKeyTimes(e).forEach((t) => times.add(+(acc + t).toFixed(3)))); acc += s.duration; });
      const total = acc;
      [...times].filter((t) => t >= 0 && t < total).sort((a, b) => a - b).slice(0, 40).forEach((t) => {
        const frame = Math.round(t * o.fps);
        zip.file(`snapshots/${tag}/frame_${String(frame).padStart(5, '0')}.svg`, frameSVG(o.src, o.assets, f, frame / o.fps, !!o.src.onlyElementIds));
      });
    }
  }

  // assets
  Object.values(used.illustrations).forEach((il) => {
    zip.file(`assets/illustrations/${il.id}.svg`, illustrationSVG(il));
    zip.file(`assets/illustrations/${il.id}.json`, JSON.stringify(il, null, 2));
  });
  Object.values(used.characters).forEach((c) => {
    const { references, ...rest } = c;
    zip.file(`characters/${c.id}.json`, JSON.stringify({ ...rest, references: references.map((_, i) => `references/${c.id}-${i + 1}`) }, null, 2));
    zip.file(`characters/${c.id}-sheet.svg`, characterSheetSVG(c, o.assets, Object.keys(used.poses).length ? Object.keys(used.poses) : ['idle']));
    references.forEach((r, i) => { const b = dataUrlToBlob(r); if (b) zip.file(`characters/references/${c.id}-${i + 1}.${b.ext}`, b.blob); });
  });
  o.src.scenes.forEach((s) => s.elements.forEach((e) => {
    if (e.type === 'image' && e.props.src) { const b = dataUrlToBlob(e.props.src); if (b) zip.file(`assets/images/${e.id}.${b.ext}`, b.blob); }
  }));

  // data
  const scenesJson = { schema: 'motion-studio/scene@1', title: o.title, fps: o.fps, formats: o.formats, onlyElementIds: o.src.onlyElementIds ?? null, scenes: o.src.scenes, assets: used };
  zip.file('data/scene.json', JSON.stringify(scenesJson, null, 2));
  zip.file('data/keyframes.json', JSON.stringify(keyframesData(o.src.scenes), null, 2));
  zip.file('data/timing.json', JSON.stringify(timingData(o.src.scenes, o.fps), null, 2));
  zip.file('data/layers.json', JSON.stringify(layersData(o.src.scenes, o.formats), null, 2));
  if (o.preset) zip.file('data/style-preset.json', JSON.stringify(o.preset, null, 2));
  const total = o.src.scenes.reduce((s, x) => s + x.duration, 0);
  zip.file('data/metadata.json', JSON.stringify({ title: o.title, exportedAt: new Date().toISOString(), fps: o.fps, durationSec: total, frames: Math.round(total * o.fps), formats: o.formats.map((f) => ({ id: f.id, name: f.name, width: f.width, height: f.height })), scenes: o.src.scenes.map((s) => s.name) }, null, 2));

  if (o.include.remotion) addRemotionProject(zip, o, scenesJson);

  zip.file('README.md', packageReadme(o, files));
  o.onProgress?.(1, 'Compressing');
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

function packageReadme(o: PackageOptions, files: string[]) {
  const total = o.src.scenes.reduce((s, x) => s + x.duration, 0);
  return `# ${o.title} — Claude export package

Generated by Motion Studio on ${new Date().toISOString()}.

- Duration: ${total.toFixed(3)} s · ${o.fps} fps · ${Math.round(total * o.fps)} frames
- Formats: ${o.formats.map((f) => `${f.name} (${f.width}×${f.height})`).join(', ')}

## How to use with Claude Code

1. Copy this folder into your Remotion project (or anywhere Claude Code can read it).
2. Ask Claude Code:

   > Recreate the animation in this folder exactly. First inspect the reference video in \`reference/\`,
   > then follow \`prompts/claude-prompt-16x9.md\` (or \`-9x16.md\`) as the implementation guide.
   > Use the original assets and the renderer in \`remotion/\`. Do not redesign or simplify anything.

3. Fastest exact route: \`remotion/\` already contains a working composition that renders \`data/scene.json\`
   with the original engine — \`cd remotion && npm i && npx remotion studio\`.

## Contents

| Path | What |
|---|---|
| \`prompts/\` | Claude replication prompts (Markdown + TXT) per format |
| \`reference/\` | Visual reference renders (MP4 / GIF / transparent WebM) |
| \`frames/\` | PNG sequences (if exported) |
| \`snapshots/\` | Exact vector SVG frames at key moments |
| \`assets/illustrations/\` | Original illustrations as SVG + JSON (layer-separated) |
| \`characters/\` | Character definitions, pose sheets, reference uploads |
| \`data/\` | scene.json, keyframes.json, timing.json, layers.json, metadata.json, style-preset.json |
| \`remotion/\` | Remotion project with the original renderer source |

Files: ${files.map((f) => `\`${f}\``).join(', ')}
`;
}

function addRemotionProject(zip: JSZip, o: PackageOptions, scenesJson: unknown) {
  const r = zip.folder('remotion')!;
  Object.entries(engineSources).forEach(([path, code]) => r.file(`src/engine/${path.split('/').pop()}`, code));
  r.file('src/scene.json', JSON.stringify(scenesJson, null, 2));
  const total = o.src.scenes.reduce((s, x) => s + x.duration, 0);
  r.file('package.json', JSON.stringify({
    name: slug(o.title), private: true, scripts: { studio: 'remotion studio', render: 'remotion render' },
    dependencies: { react: '18.3.1', 'react-dom': '18.3.1', remotion: '4.0.242', '@remotion/cli': '4.0.242' },
    devDependencies: { typescript: '5.6.3', '@types/react': '18.3.12' },
  }, null, 2));
  r.file('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: false, skipLibCheck: true, resolveJsonModule: true, esModuleInterop: true } }, null, 2));
  r.file('remotion.config.ts', `import { Config } from '@remotion/cli/config';\nConfig.setVideoImageFormat('png');\n`);
  r.file('src/index.ts', `import { registerRoot } from 'remotion';\nimport { RemotionRoot } from './Root';\nregisterRoot(RemotionRoot);\n`);
  r.file('src/Animation.tsx', `import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { SceneSVG } from './engine/render';
import { SequenceSVG } from './engine/sequence';
import data from './scene.json';

/**
 * Renders the exported animation frame-exactly with the original Motion Studio engine.
 * Time is derived only from the frame number, so every render is deterministic.
 */
export const Animation: React.FC<{ formatId: string; transparent?: boolean }> = ({ formatId, transparent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const format = (data as any).formats.find((f: any) => f.id === formatId) ?? (data as any).formats[0];
  const scenes = (data as any).scenes;
  const assets = (data as any).assets;
  const only = (data as any).onlyElementIds ?? undefined;
  const t = frame / fps;
  const style = { width: '100%', height: '100%' };
  return (
    <AbsoluteFill>
      {scenes.length === 1
        ? <SceneSVG scene={scenes[0]} assets={assets} format={format} time={t} transparent={transparent || !!only} onlyElementIds={only} style={style} />
        : <SequenceSVG scenes={scenes} assets={assets} format={format} time={t} transparent={transparent} style={style} />}
    </AbsoluteFill>
  );
};
`);
  r.file('src/Root.tsx', `import React from 'react';
import { Composition } from 'remotion';
import { Animation } from './Animation';

export const RemotionRoot: React.FC = () => (
  <>
${o.formats.map((f) => `    <Composition id="${slug(o.title)}-${f.id}" component={Animation} defaultProps={{ formatId: '${f.id}' }} width={${f.width}} height={${f.height}} fps={${o.fps}} durationInFrames={${Math.round(total * o.fps)}} />`).join('\n')}
  </>
);
`);
  r.file('README.md', `# Remotion project\n\n\`\`\`bash\nnpm install\nnpx remotion studio src/index.ts\nnpx remotion render src/index.ts ${slug(o.title)}-${o.formats[0]?.id} out.mp4\n\`\`\`\n\n\`src/engine/\` is the exact renderer used by Motion Studio (pure React + SVG, no other dependencies).\n\`src/scene.json\` holds the scenes and every asset they reference. Edit the JSON to tweak, or import \`SceneSVG\` into your own compositions:\n\n\`\`\`tsx\n<SceneSVG scene={scene} assets={assets} format={{ id: 'landscape', name: '', width: 1920, height: 1080 }} time={frame / fps} />\n\`\`\`\n`);
}
