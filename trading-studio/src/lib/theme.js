// Applies the theme settings to CSS custom properties so every panel follows them.
const FONT_STACK = {
  Inter: "'Inter', system-ui, sans-serif",
  'Space Grotesk': "'Space Grotesk', system-ui, sans-serif",
  Sora: "'Sora', system-ui, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', ui-monospace, monospace",
  Manrope: "'Manrope', system-ui, sans-serif",
  'IBM Plex Sans': "'IBM Plex Sans', system-ui, sans-serif",
  'System UI': 'system-ui, -apple-system, Segoe UI, sans-serif',
};

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(hex, target, amt) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  return a.map((c, i) => Math.round(c + (b[i] - c) * amt));
}
const mix = (hex, target, amt) => `rgb(${mixRgb(hex, target, amt).join(',')})`;

export function applyTheme(t) {
  const r = document.documentElement;
  const light = t.mode === 'light';
  const bg = light ? '#eef0f7' : t.background;
  const set = (k, v) => r.style.setProperty(k, v);
  set('--primary', t.primary);
  set('--secondary', t.secondary);
  set('--primary-rgb', hexToRgb(t.primary).join(','));
  set('--secondary-rgb', hexToRgb(t.secondary).join(','));
  set('--bg', bg);
  set('--bg-2', light ? '#ffffff' : mix(bg, '#1e1b4b', 0.25));
  set('--panel-rgb', light ? '255,255,255' : mixRgb(bg, '#0f172a', 0.6).join(','));
  set('--panel-alpha', String(light ? Math.max(0.6, t.panelOpacity) : t.panelOpacity));
  set('--text', light ? '#0b1020' : '#e6e8f2');
  set('--muted', light ? '#5b6175' : '#8a90a8');
  set('--border', light ? 'rgba(15,23,42,.12)' : 'rgba(255,255,255,.08)');
  set('--input', light ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)');
  set('--glow', String(t.glow));
  set('--radius', `${t.radius}px`);
  set('--font', FONT_STACK[t.font] || FONT_STACK.Inter);
  set('--anim', String(t.animation));
  set('--density', t.density === 'compact' ? '0.75' : t.density === 'spacious' ? '1.25' : '1');
  r.dataset.mode = light ? 'light' : 'dark';
  r.dataset.motion = t.animation <= 0 ? 'off' : 'on';
}

// Chart colors (candles, FVG, liquidity, levels) as CSS variables used by CandleChart.
export function applyChartTheme(chart = {}) {
  const r = document.documentElement;
  for (const [k, v] of Object.entries(chart)) r.style.setProperty(`--c-${k}`, v);
}
