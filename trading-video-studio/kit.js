/* Shared drawing + timing kit for both style engines. */
(function(){
const K={};
K.clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
K.lerp=(a,b,t)=>a+(b-a)*t;
K.seg=(p,a,b)=>K.clamp((p-a)/(b-a));
K.eio=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
K.eo=t=>1-Math.pow(1-t,3);
K.eb=t=>{const c=1.4;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
K.S=(p,a,b)=>K.eio(K.seg(p,a,b));
K.O=(p,a,b)=>K.eo(K.seg(p,a,b));
K.B=(p,a,b)=>K.eb(K.seg(p,a,b));
K.rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
K.hash=str=>{let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
K.rgba=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
K.rr=(c,x,y,w,h,r)=>{c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h)};
K.wrapLines=(c,t,mw)=>{const ws=String(t).split(/\s+/).filter(Boolean),o=[];let l='';for(const w of ws){const s=l?l+' '+w:w;if(c.measureText(s).width>mw&&l){o.push(l);l=w}else l=s}if(l)o.push(l);return o};
/* Masked line-by-line headline reveal. o: text,x,y,size,font,color,maxW,lh,reveal,align,alpha,shadow,track */
K.block=(c,o)=>{c.save();c.font=o.font;if(o.stretch&&'fontStretch'in c)c.fontStretch=o.stretch;c.fillStyle=o.color;c.textAlign=o.align||'left';
  if(o.track&&'letterSpacing'in c)c.letterSpacing=o.track;
  if(o.shadow){c.shadowColor=o.shadow===true?'rgba(10,17,32,.75)':o.shadow;c.shadowBlur=o.size*.32}
  const ls=K.wrapLines(c,o.text,o.maxW||900),lh=o.size*(o.lh||1.08),n=ls.length,r=o.reveal??1;
  ls.forEach((ln,i)=>{const lp=K.eo(K.clamp(r*(1+(n-1)*.28)-i*.28));if(lp<=0)return;const by=o.y+o.size*.88+i*lh;
    c.save();c.beginPath();c.rect(-5000,by-o.size*1.05,10000,lh+o.size*.34);c.clip();c.globalAlpha=(o.alpha??1)*lp;c.fillText(ln,o.x,by+(1-lp)*o.size*.85);c.restore()});
  c.restore();return o.y+n*lh};
K.polyPart=(c,pts,t)=>{const sg=[];let L=0;for(let i=1;i<pts.length;i++){const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);sg.push(d);L+=d}
  let tg=L*t,end=pts[0],dir=[1,0];c.beginPath();c.moveTo(...pts[0]);
  for(let i=1;i<pts.length&&tg>0;i++){const f=Math.min(1,tg/sg[i-1]);end=[K.lerp(pts[i-1][0],pts[i][0],f),K.lerp(pts[i-1][1],pts[i][1],f)];dir=[pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]];c.lineTo(...end);tg-=sg[i-1]}
  c.stroke();return{end,dir}};
/* Layout: where headline and hero visual live for each format. Visual space is a 1000x1000 box. */
K.layout=(W,H)=>{const land=W>H;
  return land?{W,H,land,text:{x:120,y:250,w:720,size:76},vis:{x:930,y:90,s:.9},cap:{x:W/2,y:H-150,w:1500}}
             :{W,H,land,text:{x:90,y:250,w:900,size:74},vis:{x:90,y:690,s:.9},cap:{x:W/2,y:1440,w:900}}};
K.visTo=(c,L)=>{c.translate(L.vis.x,L.vis.y);c.scale(L.vis.s,L.vis.s)};
/* Camera transform applied around the visual box centre. */
K.camera=(c,L,cam,p,amt=1)=>{const cx=L.vis.x+500*L.vis.s,cy=L.vis.y+500*L.vis.s,e=K.eio(p);let s=1,dx=0,dy=0;
  if(cam==='push-in')s=1+.12*e*amt;else if(cam==='pull-back')s=1.14-.14*e*amt;else if(cam==='pan-left')dx=60*amt-120*e*amt;else if(cam==='pan-right')dx=-60*amt+120*e*amt;else if(cam==='drift-up')dy=50*amt-100*e*amt;
  c.translate(cx+dx,cy+dy);c.scale(s,s);c.translate(-cx,-cy)};
K.KEYS={
  night:/night|alone|lonel|sleep|3 ?am|isolat|quiet|nobody|friends|miss|dark/i,
  loss:/streak|drawdown|in a row|red days|losses/i,
  loop:/frustrat|revenge|emotion|anger|angry|doubt|tilt|overtrad|fear|greed|cycle|impuls/i,
  long:/zoom out|long[- ]term|years|consisten|patien|journey|time|later|someday|one day/i,
  risk:/risk|protect|stop[- ]?loss|rule|disciplin|plan|capital|drawdown limit|position size/i,
  rise:/profit|rich|goal|dream|success|win|growth|grow|freedom|future|funded|payout/i,
  choose:/why|reason|choose|choice|decid|path|start|begin|motive/i,
  compare:/ vs |versus|instead|differen|compare|either|rather than|fast|slow/i,
  build:/build|foundation|brick|house|life|better version|step by step/i,
  money:/money|cash|quick|lambo|get rich|\$|dollar/i,
  launch:/continue|keep going|fuel|launch|momentum|push/i,
  chart:/chart|candle|price|market|trend|level|liquidity|order block/i
};
K.pickMotif=(style,text,prev,seed)=>{const t=' '+text+' ',order=style==='glass'
   ?[['loss','streak'],['night','night'],['loop','loop'],['risk','shield'],['long','zoomout'],['rise','rise'],['money','rise'],['compare','split'],['choose','word'],['build','rise']]
   :[['night','desk'],['choose','signpost'],['compare','compare'],['money','phone'],['launch','rocket'],['risk','scale'],['build','house'],['long','stairs'],['rise','stairs'],['loop','scale']];
  const hits=order.filter(([k])=>K.KEYS[k].test(t)).map(x=>x[1]);
  const cand=[...new Set(hits)].filter(m=>m!==prev);
  if(cand.length)return cand[0];
  const fall=style==='glass'?['word','ledger','split','rise']:['word','stairs','signpost','scale'];
  const f=fall.filter(m=>m!==prev);return f[seed%f.length]};
K.extractLabels=text=>{const stop=new Set('the a an and or but if then you your youre you’re i me my we our to of in on at for with from that this these those is are was were be been it its it’s not no nobody everyone every all just really very what when why how who will would can could should might about into over under more most less than as so because do does did have has had get got make made one day become actually there their they them'.split(' '));
  const words=String(text).replace(/[^\w’'\- ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!stop.has(w.toLowerCase()));
  const seen=[],out=[];for(const w of words){const k=w.toLowerCase();if(!seen.includes(k)){seen.push(k);out.push(w[0].toUpperCase()+w.slice(1).toLowerCase())}}
  return out.sort((a,b)=>b.length-a.length).slice(0,4)};
K.headlineFrom=text=>{const s=String(text).split(/(?<=[.!?…])\s+/)[0]||'';const w=s.split(/\s+/);return w.length>11?w.slice(0,10).join(' ')+'…':s};
window.KIT=K;
})();
