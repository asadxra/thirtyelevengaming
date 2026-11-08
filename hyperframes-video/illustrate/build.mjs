#!/usr/bin/env node
/* Build one HyperFrames composition per scene from a script, in the chosen theme.
   Usage: node illustrate/build.mjs <scenes.json> <outDir>
   scenes.json: {"style":"glass"|"vector","scenes":[{"id","text","duration"}]}
   Each scene picks an illustration idea from what its line says, then varies layout,
   timing and details from a per-scene seed so no two scenes look alike. */
import fs from 'node:fs';
import path from 'node:path';

const THEMES = {
  glass: { bg: '#15243C', bg2: '#0A1120', ink: '#F2F7FF', mute: '#8B98B0', a: '#65D9D3', b: '#599CFF', c: '#B8ABFF', hi: '#FFC7AB', bad: '#FF8B7B', glass: true },
  vector: { bg: '#F6F5EE', bg2: '#ECEADF', ink: '#172235', mute: '#73819A', a: '#16B99A', b: '#4667FF', c: '#A3A5F4', hi: '#FF765E', bad: '#FF765E', glass: false },
};

const rng = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (str) => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const STOP = new Set('the a an and or but if then you your youre i me my we our to of in on at for with from that this these those is are was were be been it its not no nobody everyone every all just really very what when why how who will would can could should might about into over under more most less than as so because do does did have has had get got make made one day become actually there their they them same'.split(' '));
const VOCAB = ['profit','profits','trader','traders','losses','loss','streak','plan','rules','risk','reward','discipline','patience','frustration','revenge','doubt','fear','greed','emotion','money','freedom','escape','future','struggle','consistency','journey','charts','chart','sleep','work','stop','size','capital','account','payout','challenge','funded','edge','process','focus','habits','mindset','growth','goal','dream','success','time','years','progress','cost','costs','pressure','confidence','trust','system','strategy'];
const WEAK = new Set('wants want talks talk funds fund keep keeps cancelling around notice name step away almost quit reason never give become things thing something people'.split(' '));
const NUMW = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const countIn = (t) => { const m = String(t).toLowerCase().match(/\b(\d+|two|three|four|five|six|seven|eight|nine|ten)\b(?=[^.]*\b(loss|losses|in a row|trades|days))/); return m ? (NUMW[m[1]] || +m[1]) : null; };
const keywords0 = (t) => { const out = []; for (const w of String(t).replace(/[^\w’'\- ]/g, ' ').split(/\s+/)) { const k = w.toLowerCase(); if (w.length > 3 && !STOP.has(k) && !out.some((o) => o.toLowerCase() === k)) out.push(w[0].toUpperCase() + w.slice(1).toLowerCase()); } return out; };
const keywords = (t) => { const low = String(t).toLowerCase(); const v = []; for (const w of VOCAB) { const i = low.search(new RegExp('\\b' + w + '\\b')); if (i >= 0 && !v.some((x) => x.w.startsWith(w.slice(0, 5)))) v.push({ w, i }); } v.sort((a, b) => a.i - b.i); const out = v.map((x) => x.w[0].toUpperCase() + x.w.slice(1)); for (const w of keywords0(t)) if (!WEAK.has(w.toLowerCase()) && !out.some((o) => o.toLowerCase().startsWith(w.toLowerCase().slice(0, 5)))) out.push(w); return out; };
const numberIn = (t) => { const m = String(t).match(/(\$\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?%|\b\d{2,}[\d,]*)/); return m ? m[1] : null; };

/* Idea picker: ordered rules, first match not used by the previous scene wins. */
const IDEAS = [
  ['clock', (t) => /night|\d ?am\b|sleep|alone|late at|midnight/i.test(t)],
  ['stat', (t) => /\$\d|\d%|\b\d{2,}[\d,]*\b/.test(t)],
  ['tiles', (t) => /loss|losses|in a row|streak|red|drawdown/i.test(t)],
  ['cycle', (t) => /frustrat|revenge|doubt|emotion|anger|tilt|fear|greed|cycle|loop/i.test(t)],
  ['zoom', (t) => /zoom out|long|years|journey|one day|someday|never give up|patien|time/i.test(t)],
  ['scale', (t) => /risk|reward|vs|versus|instead|compare|balance|rule|disciplin/i.test(t)],
  ['fork', (t) => /why|reason|choose|choice|start|motive|path|decid|escape|freedom/i.test(t)],
  ['chart', (t) => /profit|chart|price|market|win|grow|money|rich|success|trader/i.test(t)],
];
const ALL = ['chart', 'clock', 'tiles', 'cycle', 'zoom', 'scale', 'fork', 'stat', 'orbit'];
function pickIdea(text, prev, seed) {
  for (const [k, test] of IDEAS) if (k !== prev && test(text)) return k;
  const pool = ALL.filter((k) => k !== prev && k !== 'stat');
  return pool[seed % pool.length];
}

/* Each recipe returns {svg, anim} where anim is GSAP code using `tl` and duration `D`. */
const R = {
  chart(T, r, words) {
    const n = 22, pts = []; let y = 620;
    const dip = 0.35 + r() * 0.3;
    for (let i = 0; i < n; i++) { const f = i / (n - 1); y += (f < dip ? 1 : -1.6) * (18 + r() * 26) + (r() - 0.5) * 30; pts.push([110 + f * 860, Math.max(160, Math.min(900, y))]); }
    const candles = pts.map(([x, yy], i) => { const up = i === 0 || yy < pts[i - 1][1]; const h = 30 + r() * 60; return `<g class="cd" data-i="${i}"><line x1="${x}" x2="${x}" y1="${yy - h * .9}" y2="${yy + h * .9}" stroke="${up ? T.a : T.bad}" stroke-width="3"/><rect x="${x - 11}" y="${yy - h / 2}" width="22" height="${h}" rx="4" fill="${up ? T.a : T.bad}"/></g>`; }).join('');
    const line = pts.map((p) => p.join(',')).join(' ');
    const lbl = words[0] || 'Progress';
    return {
      svg: `${grid(T)}<polyline id="ln" points="${line}" fill="none" stroke="${T.b}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>${candles}
        <g id="tag" transform="translate(${pts[n - 1][0] - 230},${pts[n - 1][1] - 120})"><rect width="230" height="70" rx="35" fill="${T.hi}"/><text x="115" y="46" text-anchor="middle" class="lab" fill="${T.bg2}">${esc(lbl.toUpperCase())}</text></g>`,
      anim: `const L=document.getElementById('ln'),len=L.getTotalLength();L.style.strokeDasharray=len;L.style.strokeDashoffset=len;
        tl.to(L,{strokeDashoffset:0,duration:D*.55,ease:'power2.inOut'},.2);
        tl.from('.cd',{scaleY:0,opacity:0,transformOrigin:'50% 50%',duration:.35,stagger:D*.5/${n},ease:'back.out(2)'},.25);
        tl.from('#tag',{y:40,opacity:0,scale:.6,transformOrigin:'50% 50%',duration:.6,ease:'back.out(2.2)'},D*.62);
        tl.to('#tag',{y:-14,duration:1.1,yoyo:true,repeat:Math.max(0,Math.floor(D*.35/1.1)),ease:'sine.inOut'},D*.62+.6);`,
    };
  },
  clock(T, r, words) {
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${540 + Math.sin(a) * 270}" y1="${540 - Math.cos(a) * 270}" x2="${540 + Math.sin(a) * 300}" y2="${540 - Math.cos(a) * 300}" stroke="${T.ink}" stroke-width="${i % 3 ? 4 : 9}" stroke-linecap="round" opacity=".8"/>`; }).join('');
    const stars = Array.from({ length: 26 }, () => `<circle class="st" cx="${r() * 1080}" cy="${r() * 1080}" r="${1.5 + r() * 3}" fill="${T.ink}" opacity="${0.3 + r() * 0.6}"/>`).join('');
    return {
      svg: `${stars}<circle cx="540" cy="540" r="330" fill="${T.bg2}" stroke="${T.b}" stroke-width="6" ${T.glass ? 'opacity=".92"' : ''}/>${ticks}
        <line id="hh" x1="540" y1="540" x2="540" y2="380" stroke="${T.ink}" stroke-width="16" stroke-linecap="round"/>
        <line id="mh" x1="540" y1="540" x2="540" y2="290" stroke="${T.a}" stroke-width="9" stroke-linecap="round"/>
        <circle cx="540" cy="540" r="16" fill="${T.hi}"/>
        <g id="moon" transform="translate(870,190)"><circle r="70" fill="${T.hi}"/><circle cx="32" cy="-18" r="62" fill="${T.bg}"/></g>
        <g id="am"><rect x="380" y="910" width="320" height="96" rx="48" fill="${T.hi}"/><text x="540" y="975" text-anchor="middle" class="big" fill="${T.bg2}">3:00 AM</text></g>
        ${words[0] ? `<text id="w1" x="90" y="120" class="lab" fill="${T.mute}">${esc(words[0].toUpperCase())}</text>` : ''}`,
      anim: `tl.from('.st',{opacity:0,duration:.4,stagger:.04},0);
        tl.fromTo('#mh',{rotation:0},{rotation:360*4,svgOrigin:'540 540',duration:D*.6,ease:'power2.inOut'},.2);
        tl.fromTo('#hh',{rotation:-60},{rotation:90,svgOrigin:'540 540',duration:D*.6,ease:'power2.inOut'},.2);
        tl.from('#moon',{x:-200,y:120,opacity:0,duration:1.2,ease:'power3.out'},.4);
        tl.from('#am',{y:80,opacity:0,duration:.6,ease:'back.out(2)'},D*.62);
        ${words[0] ? "tl.from('#w1',{opacity:0,x:-30,duration:.6},.6);" : ''}
        tl.to('.st',{opacity:.15,duration:.8,yoyo:true,repeat:Math.max(1,Math.floor(D/1.6)),stagger:{each:.08,from:'random'},ease:'sine.inOut'},1);`,
    };
  },
  tiles(T, r, words, text) {
    const want = Math.min(9, (countIn(text) || 5) + 1), rows = want > 6 ? 3 : 2, cols = Math.ceil(want / rows), n = want, w = 820 / cols;
    const tiles = Array.from({ length: n }, (_, i) => { const x = 130 + (i % cols) * w, y = 300 + Math.floor(i / cols) * (rows > 2 ? 190 : 230); const last = i === n - 1; return `<g class="tl${last ? ' last' : ''}" transform="translate(${x + w / 2 - 10},${y + 100})"><rect x="${-w / 2 + 15}" y="-95" width="${w - 30}" height="190" rx="26" fill="${last ? T.a : T.bad}"/><text y="22" text-anchor="middle" class="big" fill="${T.bg2}">${last ? '+R' : '−1R'}</text></g>`; }).join('');
    return {
      svg: `${grid(T)}<text x="130" y="230" class="lab" fill="${T.mute}">${esc((words.find((w) => /loss/i.test(w)) || 'Losses').toUpperCase())} · ${n - 1} IN A ROW</text>${tiles}
        <polyline id="eq" points="130,880 300,900 470,925 640,945 810,960 950,880" fill="none" stroke="${T.ink}" stroke-width="6" stroke-linejoin="round" opacity=".7"/>`,
      anim: `tl.from('.tl:not(.last)',{rotationX:90,opacity:0,transformOrigin:'50% 50%',duration:.45,stagger:D*.45/${n},ease:'back.out(2)'},.3);
        tl.from('.tl.last',{scale:0,transformOrigin:'50% 50%',duration:.7,ease:'elastic.out(1,.5)'},D*.6);
        const E=document.getElementById('eq'),el=E.getTotalLength();E.style.strokeDasharray=el;E.style.strokeDashoffset=el;tl.to(E,{strokeDashoffset:0,duration:D*.6,ease:'none'},.3);
        tl.to('.tl.last',{scale:1.08,transformOrigin:'50% 50%',duration:.5,yoyo:true,repeat:Math.max(1,Math.floor(D*.35/.5)),ease:'sine.inOut'},D*.6+.7);`,
    };
  },
  cycle(T, r, words) {
    const labs = [...new Set([...words.filter((w) => /frustrat|revenge|doubt|fear|greed|emotion|tilt|anger|loss|pressure/i.test(w)), 'Pause'])].slice(0, 4); while (labs.length < 3) labs.unshift(['Fear', 'Tilt'][labs.length % 2]);
    const k = labs.length, rad = 300, cols = [T.bad, T.hi, T.c, T.a];
    const fs = (l) => Math.min(34, Math.floor(200 / Math.max(4, l.length) * 1.55));
    const nodes = labs.map((l, i) => { const a = (i / k) * Math.PI * 2 - Math.PI / 2; const x = 540 + Math.cos(a) * rad, y = 540 + Math.sin(a) * rad; return `<g class="nd" transform="translate(${x},${y})"><circle r="112" fill="${cols[i % 4]}"/><text y="${fs(l) * .35}" text-anchor="middle" style="font:800 ${fs(l)}px Inter,sans-serif;letter-spacing:1px" fill="${T.bg2}">${esc(l.slice(0, 12).toUpperCase())}</text></g>`; }).join('');
    return {
      svg: `<circle id="ring" cx="540" cy="540" r="${rad}" fill="none" stroke="${T.mute}" stroke-width="5" stroke-dasharray="14 18" opacity=".7"/>${nodes}
        <circle id="dot" cx="540" cy="${540 - rad}" r="22" fill="${T.ink}"/>`,
      anim: `tl.from('#ring',{scale:.6,opacity:0,transformOrigin:'540px 540px',duration:.8,ease:'power3.out'},.1);
        tl.from('.nd',{scale:0,transformOrigin:'50% 50%',duration:.55,stagger:.3,ease:'back.out(2.4)'},.4);
        tl.to('#dot',{rotation:360*2,svgOrigin:'540 540',duration:D-1.6,ease:'none'},1.2);
        tl.to('.nd',{scale:1.1,transformOrigin:'50% 50%',duration:.35,yoyo:true,repeat:1,stagger:{each:${'(D-2)/8'},repeat:0}},1.6);`,
    };
  },
  zoom(T, r, words, text) {
    const pts = []; let y = 700;
    for (let i = 0; i <= 60; i++) { const f = i / 60; y = 820 - f * 600 + Math.sin(i * 1.7 + r() * 3) * 60 * (1 - f * 0.4); pts.push(`${80 + f * 920},${y.toFixed(1)}`); }
    return {
      svg: `${grid(T)}<g id="world"><polyline points="${pts.join(' ')}" fill="none" stroke="${T.a}" stroke-width="7" stroke-linejoin="round"/>
        <circle id="you" cx="${pts[18].split(',')[0]}" cy="${pts[18].split(',')[1]}" r="16" fill="${T.hi}"/>
        <text x="${+pts[18].split(',')[0] + 26}" y="${+pts[18].split(',')[1] + 50}" class="lab" fill="${T.hi}">YOU</text>
        <g id="flag" transform="translate(${pts[60].split(',')[0] - 20},${pts[60].split(',')[1] - 120})"><line x1="0" y1="0" x2="0" y2="120" stroke="${T.ink}" stroke-width="6"/><path d="M0 0 L90 25 L0 50Z" fill="${T.hi}"/></g></g>
        <text id="cap" x="540" y="1010" text-anchor="middle" class="lab" fill="${T.mute}">${esc(/zoom out/i.test(text) ? 'ZOOM OUT' : (words[0] || 'Zoom out').toUpperCase())}</text>`,
      anim: `const you=document.getElementById('you'),cx=+you.getAttribute('cx'),cy=+you.getAttribute('cy');
        tl.fromTo('#world',{scale:3.4,transformOrigin:cx+'px '+cy+'px'},{scale:1,duration:D*.7,ease:'power3.inOut'},.3);
        tl.from('#flag',{scaleY:0,transformOrigin:'0% 100%',duration:.6,ease:'back.out(2)'},D*.7);
        tl.from('#cap',{opacity:0,y:30,duration:.6},D*.5);
        tl.to('#you',{attr:{r:22},duration:.6,yoyo:true,repeat:Math.max(1,Math.floor(D/1.2)),ease:'sine.inOut'},0);`,
    };
  },
  scale(T, r, words) {
    const L = words[0] || 'Risk', Rr = words[1] || 'Reward';
    return {
      svg: `<rect x="520" y="300" width="40" height="560" rx="14" fill="${T.mute}"/><rect x="380" y="850" width="320" height="50" rx="25" fill="${T.mute}"/>
        <g id="beam"><rect x="160" y="290" width="760" height="24" rx="12" fill="${T.ink}"/>
          <g id="pl"><line x1="210" y1="302" x2="210" y2="520" stroke="${T.ink}" stroke-width="4"/><rect x="90" y="520" width="240" height="40" rx="20" fill="${T.bad}"/><text x="210" y="620" text-anchor="middle" class="lab" fill="${T.ink}">${esc(L.toUpperCase())}</text></g>
          <g id="pr"><line x1="870" y1="302" x2="870" y2="520" stroke="${T.ink}" stroke-width="4"/><rect x="750" y="520" width="240" height="40" rx="20" fill="${T.a}"/><text x="870" y="620" text-anchor="middle" class="lab" fill="${T.ink}">${esc(Rr.toUpperCase())}</text></g></g>
        ${Array.from({ length: 4 }, (_, i) => `<circle class="wt" cx="${800 + (i % 2) * 70}" cy="${470 - Math.floor(i / 2) * 60}" r="28" fill="${T.hi}"/>`).join('')}
        <circle cx="540" cy="302" r="26" fill="${T.hi}"/>`,
      anim: `tl.from('#beam',{opacity:0,y:-40,duration:.6,ease:'power3.out'},.1);
        tl.from('.wt',{y:-500,opacity:0,duration:.6,stagger:.35,ease:'bounce.out'},.7);
        tl.fromTo('#beam',{rotation:-9},{rotation:9,svgOrigin:'540 302',duration:D*.45,ease:'elastic.out(1,.4)'},.9);
        tl.fromTo(['#pl','#pr'],{rotation:9},{rotation:-9,svgOrigin:'540 302',duration:D*.45,ease:'elastic.out(1,.4)'},.9);`,
    };
  },
  fork(T, r, words) {
    const labs = (words.length ? words : ['Why', 'Freedom', 'Money']).slice(0, 3);
    const boards = labs.map((l, i) => { const left = i % 2 === 0; const y = 290 + i * 150; return `<g class="bd" transform="translate(540,${y})"><path d="${left ? 'M-20 -45 L-330 -45 L-380 0 L-330 45 L-20 45Z' : 'M20 -45 L330 -45 L380 0 L330 45 L20 45Z'}" fill="${[T.b, T.hi, T.a][i]}"/><text x="${left ? -195 : 195}" y="13" text-anchor="middle" class="lab" fill="${T.bg2}">${esc(l.slice(0, 12).toUpperCase())}</text></g>`; }).join('');
    return {
      svg: `<rect x="525" y="200" width="30" height="760" rx="12" fill="${T.ink}"/>${boards}<ellipse cx="540" cy="965" rx="220" ry="30" fill="${T.mute}" opacity=".4"/>`,
      anim: `tl.from('rect',{scaleY:0,transformOrigin:'50% 100%',duration:.6,ease:'power3.out'},.1);
        tl.from('.bd',{scaleX:0,transformOrigin:'50% 50%',duration:.6,stagger:.45,ease:'back.out(2)'},.6);
        tl.to('.bd',{rotation:4,transformOrigin:'50% 50%',duration:.9,yoyo:true,repeat:Math.max(1,Math.floor((D-2)/0.9)),stagger:.2,ease:'sine.inOut'},2);`,
    };
  },
  stat(T, r, words, text) {
    const raw = numberIn(text) || '100%'; const num = parseFloat(raw.replace(/[$,%]/g, '')) || 100; const pre = raw.startsWith('$') ? '$' : ''; const suf = raw.endsWith('%') ? '%' : '';
    const bars = Array.from({ length: 7 }, (_, i) => `<rect class="br" x="${150 + i * 115}" y="${900 - (120 + r() * 260 + i * 30)}" width="80" height="${120 + r() * 260 + i * 30}" rx="14" fill="${i === 6 ? T.hi : T.b}" opacity="${i === 6 ? 1 : 0.55}"/>`).join('');
    return {
      svg: `${bars}<text id="num" x="540" y="420" text-anchor="middle" class="huge" fill="${T.ink}">${pre}0${suf}</text>
        <text x="540" y="500" text-anchor="middle" class="lab" fill="${T.mute}">${esc((words[0] || '').toUpperCase())}</text>`,
      anim: `tl.from('.br',{scaleY:0,transformOrigin:'50% 100%',duration:.6,stagger:.12,ease:'back.out(1.6)'},.2);
        const o={v:0},N=document.getElementById('num');tl.to(o,{v:${num},duration:D*.5,ease:'power2.out',onUpdate:()=>{N.textContent='${pre}'+Math.round(o.v).toLocaleString('en-US')+'${suf}'}},.3);
        tl.from('#num',{scale:.5,transformOrigin:'50% 50%',opacity:0,duration:.6,ease:'back.out(2)'},.3);`,
    };
  },
  orbit(T, r, words) {
    const labs = (words.length ? words : ['Focus', 'Plan', 'Patience']).slice(0, 3);
    const rings = [180, 290, 400].map((rr, i) => `<circle cx="540" cy="540" r="${rr}" fill="none" stroke="${T.mute}" stroke-width="3" opacity=".5"/><g class="orb o${i}"><circle cx="${540 + rr}" cy="540" r="${46 - i * 6}" fill="${[T.a, T.hi, T.c][i]}"/><text x="${540 + rr}" y="${540 + 90}" text-anchor="middle" class="lab" fill="${T.ink}">${esc((labs[i] || '').slice(0, 10).toUpperCase())}</text></g>`).join('');
    return {
      svg: `<circle id="core" cx="540" cy="540" r="90" fill="${T.b}"/>${rings}`,
      anim: `tl.from('#core',{scale:0,transformOrigin:'540px 540px',duration:.7,ease:'back.out(2)'},.1);
        tl.from('.orb',{opacity:0,duration:.5,stagger:.25},.5);
        [0,1,2].forEach(i=>tl.to('.o'+i,{rotation:(i%2?-1:1)*(220-i*50),svgOrigin:'540 540',duration:D,ease:'none'},0));
        tl.to('#core',{scale:1.12,transformOrigin:'540px 540px',duration:.8,yoyo:true,repeat:Math.max(1,Math.floor(D/.8)),ease:'sine.inOut'},.8);`,
    };
  },
};
function grid(T) { let g = ''; for (let i = 1; i < 10; i++) g += `<line x1="${i * 108}" y1="0" x2="${i * 108}" y2="1080" stroke="${T.ink}" stroke-width="1" opacity=".06"/><line x1="0" y1="${i * 108}" x2="1080" y2="${i * 108}" stroke="${T.ink}" stroke-width="1" opacity=".06"/>`; return g; }

function page(T, idea, svg, anim, D, seed) {
  const r = rng(seed);
  const tilt = ((r() - 0.5) * 4).toFixed(2), drift = (r() > 0.5 ? 1 : -1) * (20 + r() * 30);
  return `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1080">
<script src="gsap.min.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}html,body{width:1080px;height:1080px;overflow:hidden;background:${T.bg}}
#root{position:relative;width:1080px;height:1080px;overflow:hidden;background:radial-gradient(circle at 30% 20%,${T.bg} 0%,${T.bg2} 100%)}
svg{position:absolute;inset:0;width:1080px;height:1080px}
.lab{font:700 34px "Inter",sans-serif;letter-spacing:2px}.big{font:800 52px "Inter",sans-serif}.huge{font:800 190px "Inter Display","Inter",sans-serif;letter-spacing:-6px}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${D}" data-width="1080" data-height="1080">
<svg id="art" class="clip" data-start="0" data-duration="${D}" data-track-index="0" viewBox="0 0 1080 1080"><g id="cam">${svg}</g></svg>
</div>
<script>
const D=${D};const tl=gsap.timeline({paused:true});
tl.fromTo('#cam',{rotation:${tilt},x:${drift.toFixed(1)}},{rotation:0,x:0,svgOrigin:'540 540',duration:D,ease:'sine.inOut'},0);
${anim}
window.__timelines=window.__timelines||{};window.__timelines["main"]=tl;tl.seek(0);
</script></body></html>`;
}

const [, , inFile, outDir] = process.argv;
if (!inFile || !outDir) { console.error('Usage: node illustrate/build.mjs <scenes.json> <outDir>'); process.exit(1); }
const spec = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const T = THEMES[spec.style] || THEMES.glass;
let prev = null; const used = []; const manifest = [];
for (const [i, s] of spec.scenes.entries()) {
  const seed = hash(s.id + s.text);
  const idea = s.idea || pickIdea(s.text, prev, seed);
  prev = idea;
  const words = keywords(s.text);
  const { svg, anim } = R[idea](T, rng(seed), words, s.text);
  const D = Math.max(2, Math.round((s.duration || 8) * 10) / 10);
  const dir = path.join(outDir, s.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(new URL('../assets/gsap.min.js', import.meta.url), path.join(dir, 'gsap.min.js'));
  fs.writeFileSync(path.join(dir, 'index.html'), page(T, idea, svg, anim, D, seed));
  manifest.push({ id: s.id, scene: i + 1, idea, duration: D, text: s.text, style: spec.style });
  used.push(idea);
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(manifest.map((m) => `${m.scene}. ${m.idea} (${m.duration}s) — ${m.text.slice(0, 60)}`).join('\n'));
