// Shared defaults & constants used by both the server and the React client.

export const FORMATS = {
  shorts: { id: 'shorts', label: 'YouTube Shorts', ratio: '9:16', width: 1080, height: 1920, note: 'Vertical · optimized for YouTube Shorts' },
  landscape: { id: 'landscape', label: 'YouTube Landscape', ratio: '16:9', width: 1920, height: 1080, note: 'Horizontal · optimized for standard YouTube videos' },
};

export const SCRIPT_THEMES = [
  'Why people start trading',
  'Trading discipline',
  'Trading psychology',
  'Fear of missing out',
  'Revenge trading',
  'Consistency',
  'Patience',
  'Risk management',
  'Financial freedom',
  'Losing streaks',
  'The reality of trading',
  'The psychology of successful traders',
  'Motivation after failure',
  'Building a trading mindset',
];

export const EMOTIONAL_DIRECTIONS = ['Reflective', 'Intense', 'Hopeful', 'Somber', 'Defiant', 'Calm & grounded', 'Urgent'];
export const STORY_STYLES = ['Documentary narrator', 'Second-person (you)', 'First-person confession', 'Character story (third person)', 'Mentor speaking to student'];
export const TONES = ['Cinematic', 'Raw & honest', 'Calm', 'Aggressive', 'Inspirational', 'Dark', 'Warm'];

// Trading explainer script structure.
export const SECTIONS = ['hook', 'intro', 'simple', 'technical', 'demo', 'breakdown', 'takeaway', 'ending'];
export const SECTION_LABELS = {
  hook: 'Opening hook', intro: 'Introduction', simple: 'Simple explanation', technical: 'Technical explanation',
  demo: 'Real chart demonstration', breakdown: 'Step-by-step breakdown', takeaway: 'Practical takeaway', ending: 'Ending',
};
export const SECTION_HELP = {
  hook: 'Grab attention in the first seconds with the real chart moment.',
  intro: 'Name the concept and what the viewer will learn.',
  simple: 'Plain-language explanation anyone can follow.',
  technical: 'The precise rules and definitions.',
  demo: 'Walk through the real historical example. One paragraph per chart step.',
  breakdown: 'Step-by-step: outcome, trade idea, invalidation, more examples. One paragraph per chart step.',
  takeaway: 'What to do with this on your own charts.',
  ending: 'Professional close and risk reminder.',
};

export const CHARACTER_STYLES = [
  { id: 'silhouette', label: 'Minimalist silhouette' },
  { id: 'stickman', label: 'Stickman' },
  { id: 'minimal2d', label: 'Minimalist 2D animation' },
  { id: 'cartoon', label: '2D cartoon' },
  { id: '3d', label: '3D animation' },
  { id: 'anime', label: 'Anime-inspired' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'reference', label: 'Custom reference-based style' },
];

export const ANIMATIONS = [
  { id: 'idle', label: 'Idle' },
  { id: 'walking', label: 'Walking' },
  { id: 'running', label: 'Running' },
  { id: 'sitting', label: 'Sitting' },
  { id: 'thinking', label: 'Thinking' },
  { id: 'typing', label: 'Typing' },
  { id: 'trading', label: 'Trading' },
  { id: 'celebrating', label: 'Celebrating' },
  { id: 'frustrated', label: 'Frustrated' },
  { id: 'motivational', label: 'Motivational gesture' },
];

export const EXPRESSIONS = ['neutral', 'focused', 'determined', 'worried', 'sad', 'happy', 'angry', 'surprised'];

export const CHARACTER_OPTIONS = {
  headShape: ['round', 'oval', 'square', 'tall', 'wide'],
  hair: ['spiky', 'swept', 'short', 'messy', 'none', 'hood'],
  bodyProportions: ['slim', 'average', 'broad', 'chibi', 'heroic'],
  arms: ['thin', 'average', 'muscular', 'long'],
  legs: ['thin', 'average', 'long', 'short'],
  hands: ['mitten', 'simple', 'detailed', 'hidden'],
  feet: ['simple', 'pointed', 'rounded', 'hidden'],
  eyes: ['dots', 'round', 'glowing', 'anime', 'narrow', 'none'],
  clothing: ['none (silhouette)', 'hoodie', 't-shirt', 'suit jacket', 'tech jacket', 'trench coat'],
  shoes: ['none', 'sneakers', 'boots', 'dress shoes'],
  accessories: ['headphones', 'glasses', 'watch', 'cap', 'scarf', 'visor'],
  material: ['flat matte', 'soft gradient', 'glossy', 'metallic', 'holographic'],
  texture: ['none', 'paper grain', 'film grain', 'scanlines', 'halftone'],
};

export function defaultCharacter(overrides = {}) {
  return {
    name: 'New Character',
    description: '',
    referenceAssetId: null,
    referenceUrl: null,
    style: 'silhouette',
    status: 'draft', // draft | approved
    locked: false,
    appearance: {
      headShape: 'round',
      hair: 'spiky',
      bodyProportions: 'average',
      height: 100,
      width: 100,
      headSize: 100,
      arms: 'average',
      legs: 'average',
      hands: 'mitten',
      feet: 'simple',
      eyes: 'round',
      eyeSize: 100,
      eyeSpacing: 100,
      expression: 'neutral',
      clothing: 'none (silhouette)',
      shoes: 'none',
      accessories: [],
      material: 'flat matte',
      texture: 'none',
    },
    colors: {
      body: '#050507',
      eyes: '#ffffff',
      clothing: '#111827',
      clothingAccent: '#7c3aed',
      shoes: '#0b0b0f',
      accessory: '#22d3ee',
      outline: '#22d3ee',
    },
    animation: {
      default: 'idle',
      enabled: ANIMATIONS.map((a) => a.id),
      speed: 1,
      intensity: 1,
    },
    defaultExpression: 'neutral',
    defaultPose: 'idle',
    clothingPresets: [],
    animationPresets: [],
    ...overrides,
  };
}

export const DEFAULT_CHART_THEME = {
  bg: '#0b0e14',
  grid: '#1b2130',
  text: '#8b93a7',
  bull: '#26a69a',
  bear: '#ef5350',
  fvg: '#a855f7',
  ifvg: '#f472b6',
  liquidity: '#facc15',
  ob: '#38bdf8',
  breaker: '#fb923c',
  structure: '#e2e8f0',
  entry: '#38bdf8',
  stop: '#ef4444',
  target: '#22c55e',
  fib: '#c084fc',
  session: '#64748b',
  info: '#94a3b8',
  highlight: '#fde047',
};

export const DEFAULT_THEME = {
  mode: 'dark',
  primary: '#a855f7',
  secondary: '#22d3ee',
  background: '#07080c',
  chart: { ...DEFAULT_CHART_THEME },
  panelOpacity: 0.55,
  glow: 0.6,
  radius: 14,
  font: 'Inter',
  density: 'comfortable',
  animation: 1,
};

export const FONT_CHOICES = ['Inter', 'Space Grotesk', 'Sora', 'JetBrains Mono', 'Manrope', 'IBM Plex Sans', 'System UI'];
export const CAPTION_FONTS = ['Montserrat', 'Inter', 'Bebas Neue', 'Anton', 'Poppins', 'Space Grotesk', 'JetBrains Mono'];

export const CAPTION_ANIMATIONS = [
  { id: 'word-reveal', label: 'Word-by-word reveal' },
  { id: 'typewriter', label: 'Typewriter' },
  { id: 'fade', label: 'Fade-in' },
  { id: 'pop', label: 'Pop-up' },
  { id: 'highlight', label: 'Highlight current word' },
  { id: 'minimal', label: 'Minimal subtitles' },
];

export function defaultCaptionStyle(overrides = {}) {
  return {
    font: 'Montserrat',
    size: 64,
    weight: 800,
    color: '#ffffff',
    highlight: '#22d3ee',
    outline: 4,
    outlineColor: '#000000',
    shadow: 12,
    position: 'lower', // upper | middle | lower
    align: 'center',
    animation: 'highlight',
    uppercase: false,
    ...overrides,
  };
}

export const DEFAULT_VOICE_SETTINGS = {
  stability: 0.45,
  similarity: 0.8,
  style: 0.25,
  speed: 1.0,
  speakerBoost: true,
};

export const DEFAULT_VOICE_NAME = 'Quentin';

export function emptyScript() {
  return {
    inputs: {
      level: 'Beginner',
      tone: 'Educational',
      length: 'short',
      duration: 60,
      complexity: 'Standard',
      voiceSpeed: 1,
      notes: '',
    },
    sections: Object.fromEntries(SECTIONS.map((s) => [s, ''])),
    status: 'empty', // empty | draft | completed
    engine: null,
    versions: [],
    lastGeneratedAt: null,
  };
}

export function emptyProject(overrides = {}) {
  return {
    title: 'Untitled explainer',
    conceptId: null,
    market: { symbol: 'CME_MINI:NQ1!', timeframe: '5m' },
    examples: [], // approved real chart examples (bar snapshots + source)
    publication: { status: 'unpublished', url: '', date: '' },
    characterId: null,
    format: 'shorts',
    archived: false,
    sample: false,
    thumbnail: { hue: 270, label: '' },
    script: emptyScript(),
    scenes: [],
    captions: { mode: 'sentence', items: [], style: defaultCaptionStyle(), generatedAt: null },
    voice: { voiceId: null, voiceName: DEFAULT_VOICE_NAME, settings: { ...DEFAULT_VOICE_SETTINGS }, clips: {} },
    visuals: [],
    audio: { music: 'none', musicVolume: 0.3, sfxEnabled: true },
    generation: { status: 'not_ready', lastCheckAt: null, approvedAt: null },
    ...overrides,
  };
}

export const VISUAL_TYPES = [
  { id: 'code', label: 'Scrolling programming code', story: 'The logic behind every decision — discipline written as rules.' },
  { id: 'ticker', label: 'Green & red trading numbers', story: 'Wins and losses flashing past — emotional volatility.' },
  { id: 'stats', label: 'Floating financial statistics', story: 'Win-rate, drawdown, R-multiple — the cold truth of performance.' },
  { id: 'terminal', label: 'Terminal window', story: 'A trader’s internal monologue typed out as commands.' },
  { id: 'candles', label: 'Candlestick animation', story: 'Price action unfolding — patience vs. impulse.' },
  { id: 'chart', label: 'Trading chart', story: 'Equity curve — the long game made visible.' },
  { id: 'market', label: 'Market data table', story: 'Information overload — the noise traders must filter.' },
  { id: 'screens', label: 'Computer screens', story: 'The trader’s isolation — glowing monitors in a dark room.' },
  { id: 'glow-ui', label: 'Glowing interface elements', story: 'Focus and clarity — the moment of realization.' },
  { id: 'particles', label: 'Digital particles', story: 'Transition energy — momentum and change.' },
  { id: 'lighting', label: 'Cinematic lighting', story: 'Mood — spotlight on the character’s choice.' },
  { id: 'abstract', label: 'Abstract background', story: 'Mental space — the mind of the trader.' },
];

export function defaultVisualProps(type) {
  const base = { speed: 1, color: '#22d3ee', opacity: 0.8, blur: 0, glow: 0.5, x: 50, y: 50, scale: 1, duration: 5, layer: 1 };
  const tweaks = {
    code: { color: '#a855f7', opacity: 0.55, scale: 1.2, layer: 0 },
    ticker: { color: '#22c55e', y: 20 },
    stats: { color: '#22d3ee', y: 30 },
    terminal: { color: '#22c55e', y: 35, scale: 0.9 },
    candles: { color: '#22c55e', y: 55 },
    chart: { color: '#22d3ee', y: 55 },
    market: { color: '#e5e7eb', y: 40, opacity: 0.6 },
    screens: { color: '#3b82f6', y: 45, layer: 0 },
    'glow-ui': { color: '#a855f7', layer: 2 },
    particles: { color: '#a855f7', opacity: 0.7, layer: 3, scale: 1.5 },
    lighting: { color: '#7c3aed', opacity: 0.5, blur: 30, layer: 4, scale: 1.6 },
    abstract: { color: '#1e1b4b', opacity: 0.9, layer: 0, scale: 1.6 },
  };
  return { ...base, ...(tweaks[type] || {}) };
}

// ---------- Video look ----------
// Light theme is the default for videos: clean white chart, dark text.
export const LIGHT_VIDEO_PALETTE = {
  bg: '#ffffff', grid: '#eef1f5', text: '#5b6475',
  bull: '#089981', bear: '#f23645',
  fvg: '#7c3aed', ifvg: '#db2777', liquidity: '#d97706', ob: '#0284c7', breaker: '#ea580c',
  structure: '#0f172a', entry: '#2563eb', stop: '#dc2626', target: '#16a34a', fib: '#9333ea',
  session: '#94a3b8', info: '#475569', highlight: '#ca8a04', ote: '#9333ea', premium: '#dc2626', discount: '#16a34a',
};

export const CANDLE_PRESETS = [
  { id: 'tv', label: 'TradingView', bull: '#089981', bear: '#f23645' },
  { id: 'classic', label: 'Green / Red', bull: '#16a34a', bear: '#dc2626' },
  { id: 'mono', label: 'Black / White', bull: '#ffffff', bear: '#111827', bullWick: '#111827', bearWick: '#111827', bullBorder: '#111827', bearBorder: '#111827' },
  { id: 'blue', label: 'Blue / Orange', bull: '#2563eb', bear: '#f97316' },
  { id: 'purple', label: 'Teal / Purple', bull: '#14b8a6', bear: '#8b5cf6' },
];

export const DEFAULT_VIDEO_STYLE = { theme: 'light', focusMode: 'one', bull: null, bear: null };
