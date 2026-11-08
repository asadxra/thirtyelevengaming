import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import JSZip from 'jszip';
import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from 'webm-muxer';
import type { AssetBundle, FormatDef } from '../engine/schema';
import { drawFrame, frameSVG, makeCanvas, type RenderSource, sourceDuration } from './frames';

export type Progress = (p: number, label?: string) => void;

export interface RenderJob {
  src: RenderSource;
  assets: AssetBundle;
  format: FormatDef;
  fps: number;
  onProgress?: Progress;
  signal?: AbortSignal;
}

export interface RenderResult { blob: Blob; ext: string; mime: string; note?: string }

const frameCount = (job: RenderJob) => Math.max(1, Math.round(sourceDuration(job.src) * job.fps));
const check = (s?: AbortSignal) => { if (s?.aborted) throw new DOMException('Export cancelled', 'AbortError'); };

async function* frames(job: RenderJob, transparent: boolean, scale = 1) {
  const n = frameCount(job);
  const w = Math.round(job.format.width * scale / 2) * 2, h = Math.round(job.format.height * scale / 2) * 2;
  const { canvas, ctx } = makeCanvas(w, h);
  for (let i = 0; i < n; i++) {
    check(job.signal);
    const t = i / job.fps;
    await drawFrame(ctx, frameSVG(job.src, job.assets, job.format, t, transparent), w, h, transparent);
    job.onProgress?.((i + 1) / n, `Frame ${i + 1}/${n}`);
    yield { i, n, canvas, ctx, w, h };
  }
}

export function webCodecsAvailable() {
  return typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;
}

async function pickConfig(candidates: VideoEncoderConfig[]): Promise<VideoEncoderConfig | null> {
  for (const c of candidates) {
    try {
      const r = await VideoEncoder.isConfigSupported(c);
      if (r.supported) return r.config ?? c;
    } catch { /* try next */ }
  }
  return null;
}

/** Frame-exact MP4 (H.264, falls back to VP9-in-MP4) via WebCodecs. */
export async function exportMP4(job: RenderJob): Promise<RenderResult> {
  if (!webCodecsAvailable()) return exportRealtime(job, false);
  const { width: W, height: H } = job.format;
  const w = Math.round(W / 2) * 2, h = Math.round(H / 2) * 2;
  const bitrate = Math.round(w * h * job.fps * 0.2);
  const avc = await pickConfig(['avc1.640033', 'avc1.64002A', 'avc1.640028', 'avc1.4D0033', 'avc1.42E033'].map((codec) => ({ codec, width: w, height: h, bitrate, framerate: job.fps, avc: { format: 'avc' } } as VideoEncoderConfig)));
  const vp9 = avc ? null : await pickConfig([{ codec: 'vp09.00.41.08', width: w, height: h, bitrate, framerate: job.fps }]);
  const cfg = avc ?? vp9;
  if (!cfg) return exportRealtime(job, false);
  const target = new Mp4Target();
  const muxer = new Mp4Muxer({ target, video: { codec: avc ? 'avc' : 'vp9', width: w, height: h, frameRate: job.fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' });
  let err: unknown = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { err = e; } });
  enc.configure(cfg);
  const dur = 1e6 / job.fps;
  for await (const f of frames(job, false)) {
    if (err) throw err;
    const vf = new VideoFrame(f.canvas, { timestamp: Math.round(f.i * dur), duration: Math.round(dur) });
    enc.encode(vf, { keyFrame: f.i % (job.fps * 2) === 0 });
    vf.close();
    while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
  }
  await enc.flush();
  enc.close();
  if (err) throw err;
  muxer.finalize();
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), ext: 'mp4', mime: 'video/mp4', note: avc ? `H.264 ${cfg.codec}` : 'VP9 in MP4 (H.264 encoder unavailable in this browser)' };
}

/** Transparent-background WebM (VP9 + alpha). */
export async function exportTransparentWebM(job: RenderJob): Promise<RenderResult> {
  const { width: W, height: H } = job.format;
  const w = Math.round(W / 2) * 2, h = Math.round(H / 2) * 2;
  if (webCodecsAvailable()) {
    const cfg = await pickConfig([
      { codec: 'vp09.00.41.08', width: w, height: h, bitrate: Math.round(w * h * job.fps * 0.25), framerate: job.fps, alpha: 'keep' } as VideoEncoderConfig,
      { codec: 'vp8', width: w, height: h, bitrate: Math.round(w * h * job.fps * 0.25), framerate: job.fps, alpha: 'keep' } as VideoEncoderConfig,
    ]);
    if (cfg) {
      const target = new WebmTarget();
      const muxer = new WebmMuxer({ target, video: { codec: cfg.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width: w, height: h, frameRate: job.fps, alpha: true }, firstTimestampBehavior: 'offset' });
      let err: unknown = null;
      const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => { err = e; } });
      enc.configure(cfg);
      const dur = 1e6 / job.fps;
      for await (const f of frames(job, true)) {
        if (err) throw err;
        const vf = new VideoFrame(f.canvas, { timestamp: Math.round(f.i * dur), duration: Math.round(dur), alpha: 'keep' });
        enc.encode(vf, { keyFrame: f.i % (job.fps * 2) === 0 });
        vf.close();
        while (enc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2));
      }
      await enc.flush();
      enc.close();
      if (err) throw err;
      muxer.finalize();
      return { blob: new Blob([target.buffer], { type: 'video/webm' }), ext: 'webm', mime: 'video/webm', note: `Transparent ${cfg.codec}` };
    }
  }
  return exportRealtime(job, true);
}

/** Fallback: MediaRecorder, paced in real time (used when WebCodecs is missing). */
async function exportRealtime(job: RenderJob, transparent: boolean): Promise<RenderResult> {
  const w = job.format.width, h = job.format.height;
  const { canvas, ctx } = makeCanvas(w, h);
  const types = transparent ? ['video/webm;codecs=vp9', 'video/webm;codecs=vp8'] : ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => { rec.onstop = () => r(); });
  rec.start();
  const n = frameCount(job);
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    check(job.signal);
    await drawFrame(ctx, frameSVG(job.src, job.assets, job.format, i / job.fps, transparent), w, h, transparent);
    track.requestFrame();
    job.onProgress?.((i + 1) / n, `Recording ${i + 1}/${n}`);
    const wait = t0 + ((i + 1) * 1000) / job.fps - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  rec.stop();
  await done;
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext, mime, note: 'Real-time MediaRecorder capture (WebCodecs unavailable)' };
}

/** Animated GIF (palette per frame). GIF delays are in 1/100 s, so timing is rounded. */
export async function exportGIF(job: RenderJob, maxWidth = 720, transparent = false): Promise<RenderResult> {
  const scale = Math.min(1, maxWidth / job.format.width);
  const gif = GIFEncoder();
  const delay = Math.round(1000 / job.fps);
  for await (const f of frames(job, transparent, scale)) {
    const data = f.ctx.getImageData(0, 0, f.w, f.h).data;
    const palette = quantize(data, 256, { format: transparent ? 'rgba4444' : 'rgb565', oneBitAlpha: transparent });
    const index = applyPalette(data, palette, transparent ? 'rgba4444' : 'rgb565');
    const ti = transparent ? palette.findIndex((c: number[]) => c[3] === 0) : -1;
    gif.writeFrame(index, f.w, f.h, { palette, delay, repeat: 0, transparent: ti >= 0, transparentIndex: Math.max(0, ti), dispose: transparent ? 2 : -1 });
    if (f.i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  gif.finish();
  return { blob: new Blob([gif.bytes()], { type: 'image/gif' }), ext: 'gif', mime: 'image/gif', note: `${Math.round(job.format.width * scale)}px wide, frame delay ${delay}ms` };
}

/** Lossless PNG sequence zipped (optionally transparent). */
export async function exportPNGSequence(job: RenderJob, transparent = false, zip?: JSZip, folder = 'frames'): Promise<RenderResult & { zip: JSZip }> {
  const z = zip ?? new JSZip();
  const dir = z.folder(folder)!;
  const n = frameCount(job);
  const pad = String(n).length < 4 ? 4 : String(n).length;
  for await (const f of frames(job, transparent)) {
    const blob = await new Promise<Blob>((res, rej) => f.canvas.toBlob((b) => (b ? res(b) : rej(new Error('png failed'))), 'image/png'));
    dir.file(`frame_${String(f.i).padStart(pad, '0')}.png`, blob);
  }
  dir.file('README.txt', `PNG sequence\nframes: ${n}\nfps: ${job.fps}\nsize: ${job.format.width}x${job.format.height}\ntransparent: ${transparent}\nframe_N.png is time N/${job.fps} s\n`);
  if (zip) return { blob: new Blob(), ext: 'zip', mime: 'application/zip', zip: z };
  const blob = await z.generateAsync({ type: 'blob', compression: 'STORE' });
  return { blob, ext: 'zip', mime: 'application/zip', zip: z, note: `${n} frames` };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'animation';
