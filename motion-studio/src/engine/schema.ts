/**
 * Motion Studio animation schema.
 *
 * Everything the renderer needs is plain JSON. A scene + the assets it references
 * (characters, illustrations, poses, movements) fully describe an animation, so it
 * can be re-rendered anywhere (this app, Remotion, a Node script) frame-exactly.
 *
 * Conventions
 *  - Time is in seconds (scene-relative). Frames = round(time * fps).
 *  - Positions are composition pixels; element (x, y) is the element's CENTER.
 *  - Keyframed x / y are OFFSETS added to the per-format base layout, so motion and
 *    timing are shared by every format while composition stays independent.
 *  - Angles are degrees, clockwise positive (SVG convention).
 */

export type EasingName =
  | 'linear'
  | 'easeIn' | 'easeOut' | 'easeInOut'
  | 'easeInCubic' | 'easeOutCubic' | 'easeInOutCubic'
  | 'easeInExpo' | 'easeOutExpo' | 'easeInOutExpo'
  | 'easeInBack' | 'easeOutBack' | 'easeInOutBack'
  | 'easeOutElastic' | 'easeOutBounce'
  | 'step';

/** Either a named easing or a CSS-style cubic-bezier [x1, y1, x2, y2]. */
export type Easing = EasingName | [number, number, number, number];

export interface FormatDef {
  id: string;
  name: string;
  width: number;
  height: number;
}

export const LANDSCAPE: FormatDef = { id: 'landscape', name: 'Landscape 16:9', width: 1920, height: 1080 };
export const SHORTS: FormatDef = { id: 'shorts', name: 'Shorts 9:16', width: 1080, height: 1920 };

export interface LayoutBox {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  /** Multiplier applied to keyframed x/y offsets in this format (default 1). */
  motionScale?: number;
  /** true = auto-derived from the other format; becomes false after a manual edit. */
  auto?: boolean;
}

export type AnimType =
  | 'none' | 'fade'
  | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight'
  | 'pop' | 'scale' | 'rotate' | 'blur' | 'bounce' | 'drop'
  | 'draw' | 'typewriter' | 'wipe' | 'flip';

export interface AnimSpec {
  type: AnimType;
  duration: number;
  delay?: number;
  easing: Easing;
  /** distance in px for slides (default 200) */
  distance?: number;
}

export type LoopType = 'none' | 'float' | 'pulse' | 'spin' | 'shake' | 'swing' | 'bob' | 'blink' | 'glowPulse';

export interface LoopSpec {
  type: LoopType;
  /** cycles per second */
  speed: number;
  /** amplitude (px for float/shake/bob, degrees for swing, factor for pulse) */
  amount: number;
}

export type TrackProp = 'x' | 'y' | 'scale' | 'sx' | 'sy' | 'rotation' | 'opacity' | 'progress' | 'blur' | 'pose';

export interface Keyframe {
  id: string;
  time: number;
  value: number | string;
  /** easing applied from this keyframe to the next */
  easing: Easing;
}

export interface Effects {
  glow?: { color: string; size: number } | null;
  shadow?: { color: string; blur: number; dx: number; dy: number } | null;
  blur?: number;
  blend?: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export type ElementType =
  | 'text' | 'shape' | 'arrow' | 'chart' | 'counter'
  | 'character' | 'illustration' | 'image' | 'fx';

export interface TextProps {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'start' | 'middle' | 'end';
  lineHeight: number;
  letterSpacing: number;
  italic?: boolean;
  uppercase?: boolean;
  stroke?: string;
  strokeWidth?: number;
  /** background pill behind the text */
  background?: string;
  padding?: number;
  /** kinetic split for entrance staggering */
  kinetic: 'none' | 'words' | 'letters' | 'lines';
  stagger: number;
  /** words (case-insensitive) to color with highlightColor */
  highlight?: string;
  highlightColor?: string;
}

export type ShapeKind = 'rect' | 'circle' | 'ellipse' | 'triangle' | 'star' | 'polygon' | 'line' | 'ring' | 'heart' | 'blob';

export interface ShapeProps {
  shape: ShapeKind;
  w: number;
  h: number;
  fill: string;
  fill2?: string; // gradient end color
  stroke: string;
  strokeWidth: number;
  radius: number;
  sides: number;
  dashed?: boolean;
}

export interface ArrowProps {
  dx: number;
  dy: number;
  curve: number;
  color: string;
  strokeWidth: number;
  headSize: number;
  doubleHead: boolean;
  dashed: boolean;
  style: 'solid' | 'sketch';
}

export interface Candle { o: number; h: number; l: number; c: number }

export interface ChartProps {
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'candlestick' | 'hbar';
  w: number;
  h: number;
  data: number[];
  candles: Candle[];
  labels: string[];
  colors: string[];
  upColor: string;
  downColor: string;
  axisColor: string;
  textColor: string;
  showAxis: boolean;
  showLabels: boolean;
  showValues: boolean;
  strokeWidth: number;
  fontFamily: string;
  stagger: number;
}

export interface CounterProps {
  from: number;
  to: number;
  decimals: number;
  prefix: string;
  suffix: string;
  separator: boolean;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

export interface CharacterInstanceProps {
  characterId: string;
  pose: string;
  expression: string;
  movement: string;
  movementSpeed: number;
  flip: boolean;
  talking: boolean;
}

export interface IllustrationInstanceProps {
  illustrationId: string;
  /** animate the illustration's own per-part animations */
  partAnimations: boolean;
}

export interface ImageProps {
  src: string;
  w: number;
  h: number;
  radius: number;
  fit: 'contain' | 'cover';
}

export interface FxProps {
  kind: 'particles' | 'grid' | 'rays' | 'waves' | 'bokeh' | 'confetti' | 'stars' | 'scanlines';
  w: number;
  h: number;
  color: string;
  color2: string;
  count: number;
  speed: number;
  size: number;
  seed: number;
}

export interface ElementPropsMap {
  text: TextProps;
  shape: ShapeProps;
  arrow: ArrowProps;
  chart: ChartProps;
  counter: CounterProps;
  character: CharacterInstanceProps;
  illustration: IllustrationInstanceProps;
  image: ImageProps;
  fx: FxProps;
}

export interface BaseElement<T extends ElementType = ElementType> {
  id: string;
  type: T;
  name: string;
  start: number;
  end: number;
  hidden?: boolean;
  locked?: boolean;
  layout: Record<string, LayoutBox>;
  props: ElementPropsMap[T];
  animIn: AnimSpec;
  animOut: AnimSpec;
  loop: LoopSpec;
  tracks: Partial<Record<TrackProp, Keyframe[]>>;
  effects: Effects;
}

export type SceneElement =
  | BaseElement<'text'> | BaseElement<'shape'> | BaseElement<'arrow'> | BaseElement<'chart'>
  | BaseElement<'counter'> | BaseElement<'character'> | BaseElement<'illustration'>
  | BaseElement<'image'> | BaseElement<'fx'>;

export interface Background {
  type: 'solid' | 'linear' | 'radial' | 'grid' | 'dots' | 'paper' | 'transparent';
  color: string;
  color2: string;
  angle: number;
  /** pattern color for grid / dots / paper lines */
  patternColor: string;
  patternSize: number;
  /** subtle animation */
  motion: 'none' | 'drift' | 'gradientShift' | 'pulse';
  motionSpeed: number;
}

export type TransitionType = 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'zoomIn' | 'zoomOut' | 'wipe' | 'circle' | 'blur';

export interface TransitionSpec {
  type: TransitionType;
  duration: number;
  easing: Easing;
}

export type CameraProp = 'x' | 'y' | 'zoom' | 'rotation';

export interface Camera {
  tracks: Partial<Record<CameraProp, Keyframe[]>>;
  shake: number;
}

export interface Scene {
  id: string;
  name: string;
  duration: number;
  fps: number;
  background: Background;
  elements: SceneElement[];
  camera: Camera;
  transitionIn: TransitionSpec;
  notes?: string;
  /** style preset this scene was built with */
  presetId?: string;
  updatedAt?: number;
}

/* ---------------------------------------------------------------- characters */

export type CharacterStyle = 'stickman' | 'minimal' | 'cartoon' | 'educational' | 'image';

export interface Character {
  id: string;
  name: string;
  style: CharacterStyle;
  proportions: {
    headSize: number;
    torsoLength: number;
    torsoWidth: number;
    armLength: number;
    legLength: number;
    limbWidth: number;
    lineWidth: number;
  };
  colors: {
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
    shoes: string;
    outline: string;
    accent: string;
    eyes: string;
  };
  hair: 'none' | 'short' | 'long' | 'spiky' | 'bun' | 'curly' | 'cap';
  outfit: 'tshirt' | 'suit' | 'hoodie' | 'dress' | 'labcoat';
  accessory: 'none' | 'glasses' | 'tie' | 'headset' | 'beard' | 'badge';
  /** uploaded reference images (data URLs) */
  references: string[];
  /** for style "image": which reference is the body art */
  imageIndex?: number;
  notes?: string;
  createdAt?: number;
}

/** Joint angles in degrees. Limb angles: 0 = pointing straight down, +90 = pointing screen-right. */
export interface Pose {
  lUpper: number; lLower: number;
  rUpper: number; rLower: number;
  lThigh: number; lShin: number;
  rThigh: number; rShin: number;
  torso: number;
  head: number;
  /** vertical body offset (px, negative = up) */
  lift: number;
}

export interface PoseDef { id: string; name: string; pose: Pose; builtin?: boolean }

export interface MovementStep { pose: string; duration: number; easing: Easing }

export interface MovementDef {
  id: string;
  name: string;
  builtin?: boolean;
  /** custom movements loop through steps */
  steps?: MovementStep[];
  description?: string;
}

/* ------------------------------------------------------------- illustrations */

export type PartKind = 'rect' | 'circle' | 'ellipse' | 'path' | 'polygon' | 'line' | 'text';

export interface IllustrationPart {
  id: string;
  name: string;
  kind: PartKind;
  /** geometry attributes (x, y, w, h, rx, cx, cy, r, ry, d, points, x1, y1, x2, y2, text, fontSize) */
  attrs: Record<string, number | string>;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  hidden?: boolean;
  /** extra transform applied around the part's center */
  tx: number;
  ty: number;
  s: number;
  r: number;
  anim: { type: 'none' | 'fade' | 'pop' | 'draw' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'grow' | 'spin'; delay: number; duration: number; easing: Easing };
  loop: LoopSpec;
}

export interface Illustration {
  id: string;
  name: string;
  category: string;
  w: number;
  h: number;
  parts: IllustrationPart[];
  builtin?: boolean;
  createdAt?: number;
}

/* -------------------------------------------------------------- render input */

/** Asset bundle a renderer needs to draw a scene (resolved references). */
export interface AssetBundle {
  characters: Record<string, Character>;
  illustrations: Record<string, Illustration>;
  poses: Record<string, Pose>;
  movements: Record<string, MovementDef>;
}

export interface ElementState {
  visible: boolean;
  x: number;
  y: number;
  scale: number;
  sx: number;
  sy: number;
  rotation: number;
  opacity: number;
  progress: number;
  blur: number;
  /** local time since element start (s) */
  local: number;
  /** pose name (from track) and blend info */
  pose?: string;
  poseTo?: string;
  poseMix?: number;
  /** wipe clip progress for 'wipe' entrance (0..1), undefined = none */
  wipe?: number;
  /** 'flip' animations scale X */
  flip?: number;
}
