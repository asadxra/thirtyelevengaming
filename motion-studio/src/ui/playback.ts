import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/store';

/** Drives ui.time while playing (editor transport). */
export function usePlaybackLoop(duration: number) {
  const playing = useStore((s) => s.ui.playing);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const st = useStore.getState();
      let t = st.ui.time + dt * st.ui.playbackRate;
      if (t >= duration) {
        if (st.ui.loop) t = t % Math.max(duration, 0.001);
        else { st.ui$({ time: duration, playing: false }); return; }
      }
      st.ui$({ time: t });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);
}

/** Local clock for previews (thumbnails, studios). */
export function useClock(running: boolean, duration: number, loop = true) {
  const [t, setT] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      ref.current += (now - last) / 1000;
      last = now;
      if (ref.current > duration) ref.current = loop ? ref.current % Math.max(0.001, duration) : duration;
      setT(ref.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, duration, loop]);
  return [t, (v: number) => { ref.current = v; setT(v); }] as const;
}
