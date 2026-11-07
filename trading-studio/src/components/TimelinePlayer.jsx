// Timeline preview: plays the scene composition with captions and (when generated) the voiceover clips.
import React, { useEffect, useRef, useState } from 'react';
import Stage from './Stage.jsx';
import { IconButton, Badge } from './ui.jsx';
import { fmtTime, totalDuration, sectionLabel } from '../../shared/scenes.js';

export default function TimelinePlayer({ project, character, startAt = 0, captionsOverride, showCaptions = true, playAudio = true, compact }) {
  const scenes = project.scenes || [];
  const total = Math.max(0.1, totalDuration(scenes));
  const [time, setTime] = useState(startAt);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const last = useRef(0);
  const audio = useRef(null);
  const audioScene = useRef(null);

  useEffect(() => setTime(startAt), [startAt]);
  const scene = scenes.find((s) => time >= s.start && time < s.end) || scenes[scenes.length - 1];

  useEffect(() => {
    if (!playing) return undefined;
    last.current = performance.now();
    const tick = (now) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setTime((t) => {
        const n = t + dt;
        if (n >= total) { setPlaying(false); return total; }
        return n;
      });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, total]);

  // Start the matching voice clip when playback enters a scene.
  useEffect(() => {
    if (!playing || !playAudio || !scene) { if (!playing) audio.current?.pause(); return; }
    if (audioScene.current === scene.id) return;
    audioScene.current = scene.id;
    audio.current?.pause();
    const clip = project.voice?.clips?.[scene.id];
    if (clip?.url) {
      const a = new Audio(clip.url);
      a.currentTime = Math.max(0, time - scene.start);
      a.play().catch(() => {});
      audio.current = a;
    }
  }, [playing, scene?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => audio.current?.pause(), []);

  const toggle = () => {
    if (!playing && time >= total - 0.05) setTime(0);
    audioScene.current = null;
    setPlaying((p) => !p);
  };

  return (
    <div className={`player ${compact ? 'compact' : ''}`}>
      <Stage project={project} scene={scene} character={character} time={time} showCaptions={showCaptions} captionsOverride={captionsOverride} />
      <div className="player-bar">
        <IconButton icon={playing ? 'pause' : 'play'} title={playing ? 'Pause' : 'Play preview'} onClick={toggle} className="play-btn" />
        <span className="mono small">{fmtTime(time)} / {fmtTime(total)}</span>
        <input type="range" min={0} max={total} step={0.05} value={time} onChange={(e) => { audioScene.current = null; setTime(Number(e.target.value)); }} className="grow" />
        {scene && <Badge tone="accent">{sectionLabel(scene.section)}</Badge>}
      </div>
      <div className="player-strip">
        {scenes.map((s, i) => (
          <button key={s.id} className={`strip-seg sec-${s.section} ${scene?.id === s.id ? 'on' : ''}`} style={{ flexGrow: Math.max(0.3, s.end - s.start) }} title={`Scene ${i + 1}`} onClick={() => { audioScene.current = null; setTime(s.start); }}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
