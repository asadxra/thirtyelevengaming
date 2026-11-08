/**
 * Minimal WebM (Matroska) writer for VP9 video with an alpha channel.
 *
 * Colour frames go in the Block; the alpha plane is encoded as a separate grayscale
 * VP9 stream and stored in BlockAdditions (BlockAddID 1) — the layout Chrome/libwebm
 * use for transparent WebM, so it plays with transparency in Chrome, Firefox,
 * ffmpeg (libvpx-vp9 decoder), After Effects, Premiere, DaVinci, etc.
 */

type El = { id: number; data: El[] | Uint8Array };

const enc = new TextEncoder();

function idBytes(id: number) {
  const out: number[] = [];
  let v = id;
  while (v > 0) { out.unshift(v & 0xff); v = Math.floor(v / 256); }
  return out;
}
function uint(n: number) {
  const out: number[] = [];
  let v = Math.max(0, Math.floor(n));
  do { out.unshift(v & 0xff); v = Math.floor(v / 256); } while (v > 0);
  return new Uint8Array(out);
}
function sint16(n: number) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setInt16(0, n);
  return b;
}
function sint(n: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setInt32(0, n);
  return b;
}
function f64(n: number) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setFloat64(0, n);
  return b;
}
const str = (s: string) => enc.encode(s);

/** 8-byte EBML size vint. */
function sizeBytes(n: number) {
  const b = new Uint8Array(8);
  b[0] = 0x01;
  let v = n;
  for (let i = 7; i >= 1; i--) { b[i] = v & 0xff; v = Math.floor(v / 256); }
  return b;
}

function serialize(el: El, out: Uint8Array[]): number {
  const head = new Uint8Array(idBytes(el.id));
  if (el.data instanceof Uint8Array) {
    out.push(head, sizeBytes(el.data.length), el.data);
    return head.length + 8 + el.data.length;
  }
  const parts: Uint8Array[] = [];
  let size = 0;
  for (const c of el.data) size += serialize(c, parts);
  out.push(head, sizeBytes(size), ...parts);
  return head.length + 8 + size;
}

export interface AlphaFrame { color: Uint8Array; alpha: Uint8Array; key: boolean; timestampMs: number }

export function buildAlphaWebM(frames: AlphaFrame[], width: number, height: number, fps: number): Blob {
  const frameMs = 1000 / fps;
  const durationMs = frames.length * frameMs;
  const header: El = { id: 0x1a45dfa3, data: [
    { id: 0x4286, data: uint(1) }, { id: 0x42f7, data: uint(1) }, { id: 0x42f2, data: uint(4) }, { id: 0x42f3, data: uint(8) },
    { id: 0x4282, data: str('webm') }, { id: 0x4287, data: uint(4) }, { id: 0x4285, data: uint(2) },
  ] };
  const clusters: El[] = [];
  let cur: El | null = null;
  let clusterStart = 0;
  for (const f of frames) {
    const t = Math.round(f.timestampMs);
    if (!cur || f.key || t - clusterStart > 30000) {
      clusterStart = t;
      cur = { id: 0x1f43b675, data: [{ id: 0xe7, data: uint(t) }] };
      clusters.push(cur);
    }
    const block = new Uint8Array(4 + f.color.length);
    block[0] = 0x81; // track 1
    block.set(sint16(t - clusterStart), 1);
    block[3] = 0x00;
    block.set(f.color, 4);
    const group: El[] = [
      { id: 0xa1, data: block },
      { id: 0x75a1, data: [{ id: 0xa6, data: [{ id: 0xee, data: uint(1) }, { id: 0xa5, data: f.alpha }] }] },
      { id: 0x9b, data: uint(Math.round(frameMs)) },
    ];
    if (!f.key) group.push({ id: 0xfb, data: sint(-Math.round(frameMs)) });
    (cur.data as El[]).push({ id: 0xa0, data: group });
  }
  const segment: El = { id: 0x18538067, data: [
    { id: 0x1549a966, data: [
      { id: 0x2ad7b1, data: uint(1_000_000) },
      { id: 0x4d80, data: str('Motion Studio') },
      { id: 0x5741, data: str('Motion Studio') },
      { id: 0x4489, data: f64(durationMs) },
    ] },
    { id: 0x1654ae6b, data: [{ id: 0xae, data: [
      { id: 0xd7, data: uint(1) }, { id: 0x73c5, data: uint(1) }, { id: 0x83, data: uint(1) },
      { id: 0x9c, data: uint(0) }, { id: 0x86, data: str('V_VP9') }, { id: 0x55ee, data: uint(1) },
      { id: 0x23e383, data: uint(Math.round(1e9 / fps)) },
      { id: 0xe0, data: [{ id: 0xb0, data: uint(width) }, { id: 0xba, data: uint(height) }, { id: 0x53c0, data: uint(1) }] },
    ] }] },
    ...clusters,
  ] };
  const out: Uint8Array[] = [];
  serialize(header, out);
  serialize(segment, out);
  return new Blob(out as BlobPart[], { type: 'video/webm' });
}
