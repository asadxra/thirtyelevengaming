import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SceneSVG } from '../engine/render';
import type { AssetBundle, FormatDef, Scene } from '../engine/schema';
import { SequenceSVG } from '../engine/sequence';

export interface RenderSource {
  scenes: Scene[];
  /** when set (single scene), only these element ids are rendered */
  onlyElementIds?: string[];
}

export function sourceDuration(src: RenderSource) {
  return src.scenes.reduce((s, x) => s + x.duration, 0);
}

/** Serialise one frame to a standalone SVG string. */
export function frameSVG(src: RenderSource, assets: AssetBundle, format: FormatDef, time: number, transparent = false): string {
  const el = src.scenes.length === 1
    ? createElement(SceneSVG, { scene: src.scenes[0], assets, format, time, transparent, idPrefix: 'x', onlyElementIds: src.onlyElementIds })
    : createElement(SequenceSVG, { scenes: src.scenes, assets, format, time, transparent, idPrefix: 'x' });
  return renderToStaticMarkup(el);
}

/** Draw a frame onto a canvas (exact pixel dimensions of the format). */
export async function drawFrame(ctx: CanvasRenderingContext2D, svg: string, w: number, h: number, transparent: boolean) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    ctx.clearRect(0, 0, w, h);
    if (!transparent) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(img, 0, 0, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { alpha: true, willReadFrequently: false })!;
  return { canvas: c, ctx };
}

export async function renderPNG(src: RenderSource, assets: AssetBundle, format: FormatDef, time: number, transparent = false, scale = 1): Promise<Blob> {
  const w = Math.round(format.width * scale), h = Math.round(format.height * scale);
  const { canvas, ctx } = makeCanvas(w, h);
  await drawFrame(ctx, frameSVG(src, assets, format, time, transparent), w, h, transparent);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}
