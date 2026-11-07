// YouTube thumbnails (1280×720) drawn from the video's real chart example.
// Pure SVG with explicit colors and system fonts, so the same artwork can be shown
// in the library and exported to PNG without any external assets.
import React, { forwardRef, useMemo } from 'react';
import CandleChart from './CandleChart.jsx';
import { exampleBars } from '../../shared/examples.js';
import { LIGHT_VIDEO_PALETTE } from '../../shared/defaults.js';
import { conceptById } from '../../shared/concepts.js';

export const THUMB_TEMPLATES = [
  { id: 'chart', label: 'Clean chart' },
  { id: 'crt', label: 'CRT monitor' },
];

export function defaultThumb(project) {
  const c = conceptById(project.conceptId);
  return {
    template: 'chart',
    headline: (c?.name || project.title).replace(/\s*\(.*?\)\s*/g, ' ').trim().toUpperCase(),
    subline: 'Real chart breakdown',
    tag: c?.short || '',
    accent: '#7c3aed',
    exampleId: null,
    stepId: null,
    arrow: true,
  };
}

const HEAD_FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Courier New', ui-monospace, monospace";

function pickStep(ex, stepId) {
  const steps = ex?.steps || [];
  return steps.find((s) => s.id === stepId) || steps.find((s) => s.reveal?.length) || steps[0] || null;
}

function wrap(text, max) {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = `${cur} ${w}`.trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

const ThumbnailArt = forwardRef(function ThumbnailArt({ project, thumb }, ref) {
  const t = { ...defaultThumb(project), ...(project.thumb || {}), ...(thumb || {}) };
  const examples = (project.examples || []).filter((e) => e.kind === 'historical');
  const ex = examples.find((e) => e.id === t.exampleId) || examples[0];
  const bars = useMemo(() => exampleBars(ex), [ex]);
  const step = pickStep(ex, t.stepId);
  const reveal = new Set(step?.reveal || []);
  const anns = ex ? ex.annotations.filter((a) => reveal.has(a.id) || a.type === 'box') : [];
  const focus = step?.focus || ex?.range;
  const lines = wrap(t.headline, t.template === 'crt' ? 11 : 10);
  // Fit the longest line into the text column (heavy fonts are ~0.62em wide per character).
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fit = (avail, max, k) => Math.min(max, Math.floor(avail / (longest * k)));
  const date = ex?.keyLabel?.split(' ')[0] || '';
  const sym = (ex?.symbol || '').split(':').pop().replace('1!', '');

  if (t.template === 'crt') {
    const phosphor = { ...LIGHT_VIDEO_PALETTE, bg: '#03140a', grid: '#0b2a16', text: '#4ade80', bull: '#4ade80', bear: '#f87171', fvg: '#a3e635', liquidity: '#fde047', structure: '#d1fae5', info: '#86efac', entry: '#67e8f9', stop: '#f87171', target: '#4ade80', fib: '#a3e635', highlight: '#fde047', session: '#166534', ob: '#67e8f9', breaker: '#fdba74', ifvg: '#f9a8d4' };
    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" className="thumb-art">
        <defs>
          <linearGradient id="bezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2a2e" /><stop offset="1" stopColor="#0e0e10" /></linearGradient>
          <radialGradient id="crtVig" cx="50%" cy="50%" r="70%"><stop offset="55%" stopColor="#000" stopOpacity="0" /><stop offset="100%" stopColor="#000" stopOpacity=".75" /></radialGradient>
          <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity=".28" /></pattern>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <clipPath id="screen"><rect x="70" y="56" width="1140" height="608" rx="46" /></clipPath>
        </defs>
        <rect width="1280" height="720" fill="#0a0a0c" />
        <rect x="24" y="14" width="1232" height="692" rx="64" fill="url(#bezel)" />
        <rect x="58" y="44" width="1164" height="632" rx="54" fill="#050505" />
        <g clipPath="url(#screen)">
          <rect x="70" y="56" width="1140" height="608" fill={phosphor.bg} />
          {ex && <g filter="url(#glow)"><CandleChart bars={bars} focus={focus} annotations={anns} palette={phosphor} width={760} height={470} compact showVolume={false} showSessions={false} axis={false} labelScale={1.4} embed={{ x: 470, y: 120, width: 720, height: 470 }} /></g>}
          <g filter="url(#glow)" fontFamily={MONO} fontWeight="700" fill="#b9ffc9">
            <text x="110" y="118" fontSize="26" fill="#4ade80">{`> ${sym || 'MARKET'} ${ex?.interval || ''} ${date}`}</text>
            {(() => { const fs = fit(360, 84, 0.62); const lh = fs * 1.1; return (<>
              {lines.map((l, i) => <text key={i} x="106" y={150 + fs + i * lh} fontSize={fs} letterSpacing="-1">{l}</text>)}
              {t.subline && <text x="110" y={170 + fs + lines.length * lh} fontSize="28" fill="#86efac">{t.subline.slice(0, 26)}</text>}
              {t.tag && <g><rect x="108" y={205 + fs + lines.length * lh} width={t.tag.length * 22 + 40} height="52" rx="6" fill="none" stroke="#4ade80" strokeWidth="3" /><text x="128" y={241 + fs + lines.length * lh} fontSize="30" fill="#4ade80">{t.tag}</text></g>}
            </>); })()}
          </g>
          <rect x="70" y="56" width="1140" height="608" fill="url(#scan)" />
          <rect x="70" y="56" width="1140" height="608" fill="url(#crtVig)" />
          <ellipse cx="420" cy="140" rx="380" ry="90" fill="#fff" opacity=".05" />
        </g>
        <circle cx="1200" cy="690" r="6" fill="#22c55e" filter="url(#glow)" />
      </svg>
    );
  }

  // Clean light chart thumbnail
  const pal = { ...LIGHT_VIDEO_PALETTE, grid: '#f1f3f7' };
  const accent = t.accent || '#7c3aed';
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" className="thumb-art">
      <rect width="1280" height="720" fill="#ffffff" />
      <rect x="0" y="0" width="1280" height="720" fill={accent} opacity=".05" />
      <rect x="500" y="40" width="750" height="640" rx="22" fill="#fff" stroke="#e5e7eb" strokeWidth="2" />
      {ex ? <CandleChart bars={bars} focus={focus} annotations={anns} palette={pal} width={760} height={600} compact showVolume={false} showSessions={false} axis={false} labelScale={1.5} embed={{ x: 515, y: 60, width: 720, height: 600 }} />
        : <text x="875" y="370" textAnchor="middle" fontSize="28" fill="#94a3b8" fontFamily={HEAD_FONT}>Approve a chart example</text>}
      <rect x="0" y="0" width="16" height="720" fill={accent} />
      <g fontFamily={HEAD_FONT} fill="#0f172a">
        {t.tag && <g><rect x="60" y="70" width={t.tag.length * 24 + 40} height="56" rx="28" fill={accent} /><text x="80" y="108" fontSize="30" fill="#fff" fontWeight="900">{t.tag}</text></g>}
        {(() => { const fs = fit(410, 96, 0.66); const lh = fs * 1.08; return (<>
          {lines.map((l, i) => <text key={i} x="56" y={150 + fs + i * lh} fontSize={fs} fontWeight="900" letterSpacing="-2">{l}</text>)}
          {t.subline && <text x="60" y={180 + fs + lines.length * lh} fontSize="32" fill="#475569" fontWeight="700" fontFamily="'Helvetica Neue', Arial, sans-serif">{t.subline.slice(0, 24)}</text>}
        </>); })()}
        {ex && <text x="60" y="660" fontSize="24" fill="#64748b" fontWeight="700" fontFamily="'Helvetica Neue', Arial, sans-serif">{`${sym} ${ex.interval} · ${date} · real chart`}</text>}
      </g>
      {t.arrow && ex && <path d="M420 500 C 470 470, 500 430, 540 400" fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round" markerEnd="url(#arr)" />}
      <defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={accent} /></marker></defs>
    </svg>
  );
});

export default ThumbnailArt;

// Render an SVG element to a PNG Blob at 1280×720.
export async function svgToPng(svgEl, w = 1280, h = 720) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Could not draw the thumbnail.')); img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    return await new Promise((res) => canvas.toBlob(res, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
