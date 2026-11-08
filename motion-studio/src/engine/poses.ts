import { ease, lerp } from './easing';
import type { MovementDef, Pose, PoseDef } from './schema';

const P = (o: Partial<Pose>): Pose => ({
  lUpper: -12, lLower: -4, rUpper: 12, rLower: 4,
  lThigh: -5, lShin: 0, rThigh: 5, rShin: 0,
  torso: 0, head: 0, lift: 0, ...o,
});

export const BUILTIN_POSES: PoseDef[] = [
  { id: 'idle', name: 'Idle', pose: P({}) },
  { id: 'wave', name: 'Wave', pose: P({ rUpper: 145, rLower: 25 }) },
  { id: 'point', name: 'Point Right', pose: P({ rUpper: 82, rLower: 4 }) },
  { id: 'pointLeft', name: 'Point Left', pose: P({ lUpper: -82, lLower: -4 }) },
  { id: 'pointUp', name: 'Point Up', pose: P({ rUpper: 160, rLower: 10, head: -4 }) },
  { id: 'thinking', name: 'Thinking', pose: P({ rUpper: 25, rLower: 150, lUpper: -25, lLower: 95, head: 8 }) },
  { id: 'celebrate', name: 'Celebrate', pose: P({ lUpper: -150, lLower: -15, rUpper: 150, rLower: 15, lift: -6 }) },
  { id: 'shrug', name: 'Shrug', pose: P({ lUpper: -35, lLower: -95, rUpper: 35, rLower: 95, head: -6 }) },
  { id: 'present', name: 'Presenting', pose: P({ rUpper: 55, rLower: 35, lUpper: -15, lLower: -10, torso: -3 }) },
  { id: 'handsHips', name: 'Hands on Hips', pose: P({ lUpper: -40, lLower: 100, rUpper: 40, rLower: -100 }) },
  { id: 'armsCrossed', name: 'Arms Crossed', pose: P({ lUpper: -20, lLower: 110, rUpper: 20, rLower: -110 }) },
  { id: 'walkA', name: 'Walk A', pose: P({ lThigh: -24, lShin: 8, rThigh: 22, rShin: 22, lUpper: 20, rUpper: -20, lLower: 10, rLower: 10 }) },
  { id: 'walkB', name: 'Walk B', pose: P({ lThigh: 22, lShin: 22, rThigh: -24, rShin: 8, lUpper: -20, rUpper: 20, lLower: -10, rLower: -10 }) },
  { id: 'run', name: 'Run', pose: P({ lThigh: -40, lShin: 60, rThigh: 35, rShin: 10, lUpper: 40, lLower: 70, rUpper: -40, rLower: -70, torso: 8 }) },
  { id: 'jump', name: 'Jump', pose: P({ lThigh: -30, lShin: 50, rThigh: 30, rShin: -50, lUpper: -140, rUpper: 140, lift: -40 }) },
  { id: 'crouch', name: 'Crouch', pose: P({ lThigh: -50, lShin: 90, rThigh: 50, rShin: -90, lift: 30, lUpper: -30, rUpper: 30 }) },
  { id: 'sit', name: 'Sit', pose: P({ lThigh: 88, lShin: -88, rThigh: 92, rShin: -92, lUpper: 20, lLower: 40, rUpper: 30, rLower: 40 }) },
  { id: 'sad', name: 'Sad / Slumped', pose: P({ torso: 4, head: 14, lUpper: -4, rUpper: 4, lift: 4 }) },
  { id: 'stop', name: 'Stop Gesture', pose: P({ rUpper: 95, rLower: 80 }) },
  { id: 'facepalm', name: 'Facepalm', pose: P({ rUpper: 20, rLower: 165, head: 10 }) },
  { id: 'typing', name: 'Typing', pose: P({ lUpper: -25, lLower: 85, rUpper: 25, rLower: -85, head: 6 }) },
  { id: 'holdUp', name: 'Hold Item Up', pose: P({ rUpper: 120, rLower: 40 }) },
].map((p) => ({ ...p, builtin: true }));

export const BUILTIN_MOVEMENTS: MovementDef[] = [
  { id: 'none', name: 'Static (no movement)' },
  { id: 'idle', name: 'Idle Breathing', description: 'Subtle torso sway and breathing bob.' },
  { id: 'wave', name: 'Wave', description: 'Right arm raised, forearm waving 1.5 Hz ±25°.' },
  { id: 'walk', name: 'Walk Cycle', description: 'In-place walk; combine with an x keyframe to travel.' },
  { id: 'run', name: 'Run Cycle', description: 'Fast in-place run with bent arms.' },
  { id: 'jump', name: 'Jump', description: 'Crouch → airborne → land, loops each second.' },
  { id: 'talk', name: 'Talking', description: 'Mouth flaps, head nods, small hand gestures.' },
  { id: 'nod', name: 'Nod Yes', description: 'Head tilt oscillation.' },
  { id: 'shakeHead', name: 'Shake Head No', description: 'Fast side head tilts.' },
  { id: 'celebrate', name: 'Celebrate', description: 'Arms raised pumping with hops.' },
  { id: 'pointPulse', name: 'Point Emphasis', description: 'Pointing arm pulses forward.' },
  { id: 'think', name: 'Thinking Sway', description: 'Hand to chin with slow head tilt.' },
  { id: 'dance', name: 'Dance', description: 'Torso groove with alternating arms.' },
  { id: 'typing', name: 'Typing', description: 'Arms forward with jittering hands.' },
  { id: 'shiver', name: 'Nervous Shiver', description: 'Small fast tremble.' },
].map((m) => ({ ...m, builtin: true }));

export function mixPose(a: Pose, b: Pose, t: number): Pose {
  const out = { ...a };
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => { out[k] = lerp(a[k], b[k], t); });
  return out;
}

export interface MovementResult { pose: Pose; mouth: number }

const S = Math.sin;
const TAU = Math.PI * 2;

/**
 * Apply a movement (loop) on top of a base pose at local time t (seconds).
 */
export function applyMovement(
  base: Pose,
  movement: string,
  t: number,
  speed: number,
  talking: boolean,
  movements: Record<string, MovementDef>,
  poses: Record<string, Pose>,
): MovementResult {
  const p: Pose = { ...base };
  const ph = t * speed * TAU;
  let mouth = talking ? talkMouth(t) : -1;

  const custom = movements[movement];
  if (custom?.steps && custom.steps.length) {
    const total = custom.steps.reduce((s, x) => s + x.duration, 0) || 1;
    let u = ((t * speed) % total + total) % total;
    for (let i = 0; i < custom.steps.length; i++) {
      const st = custom.steps[i];
      if (u <= st.duration || i === custom.steps.length - 1) {
        const next = custom.steps[(i + 1) % custom.steps.length];
        const a = poses[st.pose] ?? base, b = poses[next.pose] ?? base;
        return { pose: mixPose(a, b, ease(st.easing, u / (st.duration || 1))), mouth };
      }
      u -= st.duration;
    }
  }

  switch (movement) {
    case 'idle':
      p.torso += S(ph * 0.5) * 1.5; p.lift += S(ph) * 1.5; p.lUpper -= S(ph * 0.5) * 2; p.rUpper += S(ph * 0.5) * 2; p.head += S(ph * 0.35) * 2;
      break;
    case 'wave':
      p.rUpper = 145; p.rLower = 20 + S(ph * 1.5) * 25;
      break;
    case 'walk': {
      const s = S(ph);
      p.lThigh = s * 24; p.rThigh = -s * 24;
      p.lShin = Math.max(0, -Math.cos(ph)) * 30; p.rShin = Math.max(0, Math.cos(ph)) * 30;
      p.lUpper = -s * 20 - 6; p.rUpper = s * 20 + 6; p.lLower = -8; p.rLower = 8;
      p.lift = -Math.abs(Math.cos(ph)) * 4;
      break;
    }
    case 'run': {
      const s = S(ph * 1.6);
      p.lThigh = s * 42; p.rThigh = -s * 42;
      p.lShin = Math.max(0, -Math.cos(ph * 1.6)) * 70; p.rShin = Math.max(0, Math.cos(ph * 1.6)) * 70;
      p.lUpper = -s * 40; p.rUpper = s * 40; p.lLower = 70; p.rLower = -70; p.torso = 8;
      p.lift = -Math.abs(Math.cos(ph * 1.6)) * 10;
      break;
    }
    case 'jump': {
      const c = ((t * speed) % 1 + 1) % 1;
      if (c < 0.25) { const k = S((c / 0.25) * Math.PI); p.lift = k * 18; p.lThigh = -k * 30; p.rThigh = k * 30; p.lShin = k * 50; p.rShin = -k * 50; }
      else if (c < 0.8) { const k = (c - 0.25) / 0.55; p.lift = -S(k * Math.PI) * 90; p.lUpper = -150; p.rUpper = 150; p.lThigh = -20; p.lShin = 35; p.rThigh = 20; p.rShin = -35; }
      break;
    }
    case 'talk':
      mouth = talkMouth(t);
      p.head += S(ph * 0.9) * 3; p.rUpper = 35 + S(ph * 0.7) * 12; p.rLower = 60 + S(ph * 1.1) * 10;
      break;
    case 'nod': p.head += S(ph * 1.2) * 9; break;
    case 'shakeHead': p.head += S(ph * 2.4) * 12; break;
    case 'celebrate': {
      const s = Math.abs(S(ph * 1.2));
      p.lUpper = -150 + s * 20; p.rUpper = 150 - s * 20; p.lLower = -15; p.rLower = 15; p.lift = -s * 18;
      break;
    }
    case 'pointPulse': p.rUpper = 82 + S(ph * 2) * 4; p.rLower = 4 + Math.max(0, S(ph * 2)) * 10; break;
    case 'think': p.rUpper = 25; p.rLower = 150; p.lUpper = -25; p.lLower = 95; p.head = 8 + S(ph * 0.4) * 5; break;
    case 'dance': {
      const s = S(ph * 1.4);
      p.torso = s * 8; p.lift = -Math.abs(s) * 10; p.lUpper = -60 - s * 60; p.rUpper = 60 - s * 60; p.lLower = -40; p.rLower = 40; p.lThigh = -10 + s * 10; p.rThigh = 10 + s * 10; p.head = -s * 6;
      break;
    }
    case 'typing': p.lUpper = -25; p.lLower = 85 + S(ph * 6) * 6; p.rUpper = 25; p.rLower = -85 + S(ph * 6 + 1) * 6; p.head = 6; break;
    case 'shiver': p.torso += S(ph * 9) * 1.5; p.lUpper += S(ph * 11) * 3; p.rUpper += S(ph * 10) * 3; p.head += S(ph * 8) * 2; break;
  }
  return { pose: p, mouth };
}

function talkMouth(t: number) {
  return Math.max(0, S(t * 17) * 0.5 + S(t * 11.3) * 0.5);
}

export const EXPRESSIONS = ['neutral', 'happy', 'excited', 'sad', 'surprised', 'angry', 'thinking', 'wink', 'confident', 'worried'] as const;
export type Expression = (typeof EXPRESSIONS)[number];
