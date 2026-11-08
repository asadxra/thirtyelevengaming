/* Audio engine: procedural music per style, scene voiceovers, transition SFX, ducking. Same graph for live preview and offline export. */
(function(){
const hz=m=>440*Math.pow(2,(m-69)/12);
const STY={
  glass:{bpm:84,prog:[[50,53,57],[46,50,53],[53,57,60],[48,52,55]],arcProg:[[50,53,57],[46,50,53],[53,57,60],[48,52,55],[46,50,53],[53,57,60],[55,58,62],[53,57,60]],bell:[74,77,81,84,79,76],kind:'glass'},
  vector:{bpm:104,prog:[[57,61,64],[52,56,59],[54,57,61],[50,54,57]],arcProg:[[57,61,64],[52,56,59],[54,57,61],[50,54,57],[50,54,57],[52,56,59],[57,61,64],[57,61,64]],bell:[69,73,76,81,78,76],kind:'vector'}
};
function rng(s){return()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let noiseCache=new WeakMap();
function noise(ac){let b=noiseCache.get(ac);if(!b){b=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const d=b.getChannelData(0);let x=1;for(let i=0;i<d.length;i++){x=(x*16807)%2147483647;d[i]=(x/2147483647)*2-1}noiseCache.set(ac,b)}return b}

/* Build the full mix. opts: {from, at, total, scenes:[{start,end}], voices:[{buffer,start,trimStart,trimEnd,vol}], music:{enabled,vol,fadeIn,fadeOut,mode}, sfx:{enabled,vol}, voiceVol, style, solo} */
function build(ac,out,o){
  const nodes=[],T=τ=>o.at+(τ-o.from),from=o.from,total=o.total;
  const master=ac.createGain();master.gain.value=.9;const comp=ac.createDynamicsCompressor();comp.threshold.value=-10;comp.ratio.value=4;master.connect(comp);comp.connect(out);nodes.push(master,comp);
  const solo=o.solo;
  /* ---------- voice ---------- */
  const vBus=ac.createGain();vBus.gain.value=(o.voiceVol??1)*(solo&&solo!=='voice'?0:1);vBus.connect(master);
  const clips=[];
  (o.voices||[]).forEach(v=>{if(!v.buffer)return;const dur=Math.max(0,v.buffer.duration-(v.trimStart||0)-(v.trimEnd||0)),a=v.start,b=a+dur;clips.push([a,b]);if(b<=from)return;
    const src=ac.createBufferSource();src.buffer=v.buffer;const g=ac.createGain();g.gain.value=v.vol??1;src.connect(g);g.connect(vBus);
    const off=Math.max(0,from-a);src.start(T(Math.max(a,from)),(v.trimStart||0)+off,dur-off);nodes.push(src)});
  /* ---------- music ---------- */
  const m=o.music||{};
  if(false){ /* no music: videos are voice-only */
    const st=STY[o.style]||STY.glass,beat=60/st.bpm,bar=beat*4,prog=m.mode==='loop'?st.prog:st.arcProg,r=rng(7),vol=m.vol??.6;
    const bus=ac.createGain();bus.connect(master);nodes.push(bus);
    const fi=m.fadeIn??1.5,fo=m.fadeOut??2.5,G=bus.gain,lvl=τ=>vol*Math.min(1,τ/Math.max(fi,.01),(total-τ)/Math.max(fo,.01));
    G.setValueAtTime(Math.max(0,lvl(from)),T(from));
    if(from<fi)G.linearRampToValueAtTime(vol,T(fi));
    const duck=o.voices&&o.voices.length&&!solo?(m.duck??.35):1;
    clips.forEach(([a,b])=>{if(b<from)return;const a0=Math.max(from,a-.25);if(a0>=fi&&a0<total-fo){G.setValueAtTime(lvl(a0),T(a0));G.linearRampToValueAtTime(vol*duck,T(Math.max(a0,a)));G.setValueAtTime(vol*duck,T(Math.min(b,total-fo)));G.linearRampToValueAtTime(lvl(Math.min(b+.4,total-fo)),T(Math.min(b+.4,total-fo)))}});
    G.setValueAtTime(lvl(Math.max(from,total-fo)),T(Math.max(from,total-fo)));G.linearRampToValueAtTime(0,T(total));
    const nBars=Math.ceil(total/bar),arc=m.mode!=='loop';
    const note=(type,f,t0,dur,gain,att=.01,lp=null)=>{if(t0+dur<from||t0>=total)return;const s=Math.max(t0,from),os=ac.createOscillator();os.type=type;os.frequency.value=f;const g=ac.createGain();
      g.gain.setValueAtTime(0,T(s));g.gain.linearRampToValueAtTime(gain,T(s)+att);g.gain.exponentialRampToValueAtTime(.0001,T(Math.min(t0+dur,total+.5)));
      if(lp){const fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=lp;os.connect(fl);fl.connect(g)}else os.connect(g);g.connect(bus);os.start(T(s));os.stop(T(Math.min(t0+dur,total+.5))+.05);nodes.push(os)};
    for(let b=0;b<nBars;b++){const t0=b*bar,ch=prog[b%prog.length],last=b>=nBars-2,first=b<1||(arc&&b<2);
      if(t0>=total)break;
      ch.forEach(n=>{if(st.kind==='glass'){note('sawtooth',hz(n),t0,bar*1.3,.022,.9,900);note('sawtooth',hz(n)*1.004,t0,bar*1.3,.018,1,800)}else note('triangle',hz(n+12),t0,bar*1.1,.018,.4,2400)});
      note(st.kind==='glass'?'sine':'triangle',hz(ch[0]-12),t0,bar*.95,st.kind==='glass'?.11:.1,.02);
      if(st.kind==='vector'&&!first&&!last)note('triangle',hz(ch[0]-12),t0+beat*2,beat*1.5,.08,.02);
      for(let q=0;q<4;q++){const bt=t0+q*beat;
        if(!first&&!last&&(st.kind==='vector'||q%2===0)){if(bt<from||bt>=total)continue;const os=ac.createOscillator(),g=ac.createGain();os.frequency.setValueAtTime(st.kind==='glass'?110:140,T(bt));os.frequency.exponentialRampToValueAtTime(42,T(bt)+.25);g.gain.setValueAtTime(st.kind==='glass'?.22:.3,T(bt));g.gain.exponentialRampToValueAtTime(.0001,T(bt)+.35);os.connect(g);g.connect(bus);os.start(T(bt));os.stop(T(bt)+.4);nodes.push(os)}
        if(st.kind==='vector'&&!first&&!last){const ht=bt+beat/2;if(ht>=from&&ht<total){const ns=ac.createBufferSource();ns.buffer=noise(ac);const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=7000;const g=ac.createGain();g.gain.setValueAtTime(.035,T(ht));g.gain.exponentialRampToValueAtTime(.0001,T(ht)+.06);ns.connect(hp);hp.connect(g);g.connect(bus);ns.start(T(ht),r()*.5,.08);nodes.push(ns)}}}
      const steps=st.kind==='glass'?4:8;for(let k=0;k<steps;k++){const pr=r();if(st.kind==='glass'?pr<.45:pr<.75){const n=st.kind==='glass'?st.bell[Math.floor(r()*st.bell.length)]:ch[k%3]+24,tt=t0+k*bar/steps;
        note('sine',hz(n),tt,st.kind==='glass'?1.8:.35,st.kind==='glass'?.045:.05,.005);note('sine',hz(n)*(st.kind==='glass'?2.76:4),tt,st.kind==='glass'?.6:.12,.012,.003)}}}
    if(arc){const endCh=prog[0];endCh.forEach(n=>note('sine',hz(n+12),Math.max(0,total-bar*1.5),bar*1.6,.03,.6))}
  }
  /* ---------- transition SFX ---------- */
  const sx=o.sfx||{};
  if(sx.enabled&&!(solo&&solo!=='sfx')){const bus=ac.createGain();bus.gain.value=sx.vol??.5;bus.connect(master);nodes.push(bus);
    (o.scenes||[]).slice(1).forEach(s=>{const t0=s.start-.35;if(t0<from||t0>=total)return;const ns=ac.createBufferSource();ns.buffer=noise(ac);const bp=ac.createBiquadFilter();bp.type='bandpass';bp.Q.value=1.2;
      bp.frequency.setValueAtTime(o.style==='glass'?500:900,T(t0));bp.frequency.exponentialRampToValueAtTime(o.style==='glass'?2600:3200,T(t0)+.5);const g=ac.createGain();g.gain.setValueAtTime(0,T(t0));g.gain.linearRampToValueAtTime(.25,T(t0)+.25);g.gain.exponentialRampToValueAtTime(.0001,T(t0)+.6);
      ns.connect(bp);bp.connect(g);g.connect(bus);ns.start(T(t0),0,.7);nodes.push(ns);
      if(o.style==='glass'){const os=ac.createOscillator();os.type='sine';os.frequency.value=hz(86);const g2=ac.createGain();g2.gain.setValueAtTime(0,T(s.start));g2.gain.linearRampToValueAtTime(.05,T(s.start)+.01);g2.gain.exponentialRampToValueAtTime(.0001,T(s.start)+1.2);os.connect(g2);g2.connect(bus);os.start(T(s.start));os.stop(T(s.start)+1.3);nodes.push(os)}
      else{const os=ac.createOscillator();os.frequency.setValueAtTime(520,T(s.start));os.frequency.exponentialRampToValueAtTime(900,T(s.start)+.08);const g2=ac.createGain();g2.gain.setValueAtTime(.12,T(s.start));g2.gain.exponentialRampToValueAtTime(.0001,T(s.start)+.15);os.connect(g2);g2.connect(bus);os.start(T(s.start));os.stop(T(s.start)+.2);nodes.push(os)}})}
  nodes.push(vBus);
  return {stop(){nodes.forEach(n=>{try{n.stop&&n.stop()}catch(e){}try{n.disconnect()}catch(e){}})}};
}
async function renderOffline(o,sr=48000){const len=Math.ceil(o.total*sr);const ac=new OfflineAudioContext(2,len,sr);build(ac,ac.destination,{...o,from:0,at:0});return ac.startRendering()}
function waveform(cv,buf,col='#65D9D3',bg=null,trimStart=0,trimEnd=0){const c=cv.getContext('2d'),w=cv.width,h=cv.height;c.clearRect(0,0,w,h);if(bg){c.fillStyle=bg;c.fillRect(0,0,w,h)}if(!buf)return;
  const d=buf.getChannelData(0),step=Math.max(1,Math.floor(d.length/w));c.fillStyle=col;
  for(let x=0;x<w;x++){let mx=0;for(let i=x*step;i<(x+1)*step&&i<d.length;i+=4)mx=Math.max(mx,Math.abs(d[i]));const bh=Math.max(1,mx*h*.95);c.fillRect(x,(h-bh)/2,1,bh)}
  const D=buf.duration;c.fillStyle='rgba(0,0,0,.55)';if(trimStart)c.fillRect(0,0,w*trimStart/D,h);if(trimEnd)c.fillRect(w*(1-trimEnd/D),0,w*trimEnd/D,h)}
window.AUDIO={build,renderOffline,waveform};
})();
