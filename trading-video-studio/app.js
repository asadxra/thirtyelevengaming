/* Trading Video Studio — app shell, state, renderer, player, pages, export. */
(()=>{
const K=KIT,STY={glass:STYLE_GLASS,vector:STYLE_VECTOR};
const $=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-5);
const rseed=()=>Math.floor(Math.random()*1e6);
const fmtT=t=>{t=Math.max(0,t||0);return `${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`};
const fmtD=t=>{t=Math.round(t||0);return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`};
const slug=s=>String(s||'video').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'video';
const CAMS=['push-in','pull-back','pan-left','pan-right','drift-up','static'];
const TRANS={lens:'Lens iris',wipe:'Shape wipe',dissolve:'Dissolve',push:'Push',cut:'Cut'};
const CATS=['Trading motivation','Trading psychology','Trading discipline','Risk management','Prop firm challenges','Futures trading','Account rotation','Overtrading','Trading mistakes','Consistency and patience','Trading education'];
const STATUSES=['Draft','Script Ready','Generating','Editing','Ready to Export','Exported'];
const VOICE_LEAD=.15,QUENTIN={id:'Aa6nEBJJMKJwJkCx8VU2',name:'Quentin – Narrator and Educator'};
const EL='ElevenLabs';
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600)}

/* ---------- blob store (audio, uploaded media) ---------- */
const mem=new Map();
const IDB={db:null,async open(){if(this.db)return this.db;this.db=await new Promise((res,rej)=>{const r=indexedDB.open('tvstudio',1);r.onupgradeneeded=()=>r.result.createObjectStore('blobs');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});return this.db},
  async put(k,v){mem.set(k,v);try{const db=await this.open();await new Promise((res,rej)=>{const tx=db.transaction('blobs','readwrite');tx.objectStore('blobs').put(v,k);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}catch(e){}},
  async get(k){if(mem.has(k))return mem.get(k);try{const db=await this.open();return await new Promise(res=>{const r=db.transaction('blobs').objectStore('blobs').get(k);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)})}catch(e){return null}},
  async del(k){mem.delete(k);try{const db=await this.open();db.transaction('blobs','readwrite').objectStore('blobs').delete(k)}catch(e){}}};

/* ---------- capabilities ---------- */
const cap={db:null,user:null,sample:null,downloads:null,mcp:null,uid:null,ready:false};
async function initCaps(){if(!window.claude||!window.claude.use){cap.ready=true;return}
  const names=['db','user','sample','downloads','mcp'];const got=await Promise.all(names.map(n=>window.claude.use(n).catch(()=>null)));names.forEach((n,i)=>cap[n]=got[i]);
  if(cap.user&&cap.db){try{cap.uid=await cap.user.id()}catch(e){}}cap.ready=true}

/* ---------- state ---------- */
const DEF_SET={accent:'#65D9D3',styleNames:{glass:'Style 01 — Liquid Glass',vector:'Style 02 — Flat Vector'},defaultStyle:'glass',defaultFormat:'9:16',defaultDuration:45,voice:{...QUENTIN},
  captions:{enabled:true,size:58,pos:'lower',words:4,anim:'pop',hi:'',hiColor:''},audio:{musicVol:.55,voiceVol:1,sfx:false,sfxVol:.45,duck:.35,mode:'arc',fadeIn:1.5,fadeOut:2.5},
  anim:{motion:1,trans:.6},export:{fps:30,quality:'high',audioKbps:192,res:'1080'}};
const state={settings:structuredClone(DEF_SET),projects:[],cur:null,genBusy:null};
function mergeSet(s){const d=structuredClone(DEF_SET);for(const k in s){if(s[k]&&typeof s[k]==='object'&&!Array.isArray(s[k])&&d[k]&&typeof d[k]==='object')d[k]={...d[k],...s[k]};else d[k]=s[k]}return d}

/* reference films */
const REFDEF={
 glass:{id:'ref-glass',title:'Nobody Talks About the Dark Side of Trading',durs:[8,9,9,9,10],trans:'lens',
  lines:['Everyone wants to become a profitable trader. Nobody talks about what it costs.','Charts at 3 AM. Plans you keep cancelling. The work is real, and nobody around you can see it.','Six losses in a row. Same plan. Same rules. A streak doesn’t prove your plan is broken.','Frustration funds the revenge trade. The revenge trade funds the doubt. Notice it. Name it. Step away.','Zoom out. One day, the struggle that almost made you quit will become the reason you never give up.']},
 vector:{id:'ref-vector',title:'EP 01 — Why People Start Trading',durs:[9,15,12,14,10],trans:'wipe',
  lines:['If you started trading because you wanted to get rich quickly, you might already be making your first mistake.','Freedom. Escape. Money. Proving yourself. A better future. All valid reasons, but each one pulls you differently.','The motive shapes the method. Need it fast, and you size up, skip the stop and trade too much.','Money can be the reason you start. Discipline must be the reason you continue.','Don’t trade to escape your life. Trade to build a better version of it.']}};
function refProject(style){const R=REFDEF[style];return{id:R.id,ref:true,title:R.title,style,format:'9:16',createdAt:Date.UTC(2026,10,8),status:'Reference',topic:'',message:'',category:'Trading motivation',tone:'',target:R.durs.reduce((a,b)=>a+b),
  voice:{...QUENTIN},scenes:R.lines.map((l,i)=>({id:R.id+'-'+i,kind:'ref',ref:i,narration:l,headline:l,sub:'',eyebrow:'',visual:'Reference scene',emotion:'',labels:[],motif:'auto',camera:'static',seed:i,duration:R.durs[i],transition:R.trans,media:null,voice:null,captionText:null,captionOffset:0})),
  captions:{...state.settings.captions,enabled:false},music:{enabled:false,vol:.6,fadeIn:1.5,fadeOut:2.5,mode:'arc',duck:.35},sfx:{enabled:false,vol:.45},voiceVol:1,exports:[]}}
let REFS={};function buildRefs(){REFS={glass:refProject('glass'),vector:refProject('vector')}}
const allProjects=()=>[REFS.glass,REFS.vector,...state.projects];
const getP=id=>allProjects().find(p=>p.id===(id||state.cur));
const styleName=s=>state.settings.styleNames[s]||s;

/* ---------- persistence ---------- */
const LS='tvstudio:v1';
const saveTimers={};
function lsWrite(){try{localStorage.setItem(LS,JSON.stringify({settings:state.settings,projects:state.projects.map(clean),cur:state.cur}))}catch(e){}}
function clean(p){const o={};for(const k in p)if(!k.startsWith('_'))o[k]=k==='scenes'?p.scenes.map(s=>{const c={};for(const j in s)if(!j.startsWith('_'))c[j]=s[j];return c}):p[k];return o}
function col(){return cap.db&&cap.uid?cap.db.collection('data/users/'+cap.uid):null}
function saveProject(p){if(!p||p.ref)return;p.updatedAt=Date.now();lsWrite();clearTimeout(saveTimers[p.id]);saveTimers[p.id]=setTimeout(async()=>{const c=col();if(!c)return;try{await c.doc('p_'+p.id).set({data:JSON.stringify(clean(p)),updatedAt:p.updatedAt})}catch(e){console.warn('save failed',e)}},900)}
function saveSettings(){lsWrite();clearTimeout(saveTimers._s);saveTimers._s=setTimeout(async()=>{const c=col();if(!c)return;try{await c.doc('settings').set({data:JSON.stringify(state.settings)})}catch(e){}},700)}
async function deleteStored(p){lsWrite();const c=col();if(c){try{await c.doc('p_'+p.id).delete()}catch(e){}}}
function loadLocal(){try{const d=JSON.parse(localStorage.getItem(LS)||'null');if(d){state.settings=mergeSet(d.settings||{});state.projects=d.projects||[];state.cur=d.cur||null}}catch(e){}}
async function loadRemote(){const c=col();if(!c)return false;
  try{const snap=await Promise.race([c.get(),new Promise((_,r)=>setTimeout(()=>r(new Error('timeout')),10000))]);let projects=[],settings=null;
    snap.docs.forEach(d=>{const v=d.data()||{};try{if(d.id==='settings')settings=JSON.parse(v.data);else if(d.id.startsWith('p_'))projects.push(JSON.parse(v.data))}catch(e){}});
    if(settings)state.settings=mergeSet(settings);
    const byId=new Map(projects.map(p=>[p.id,p]));state.projects.forEach(p=>{const r=byId.get(p.id);if(!r||(p.updatedAt||0)>(r.updatedAt||0)){byId.set(p.id,p);saveProject(p)}});
    state.projects=[...byId.values()].sort((a,b)=>b.createdAt-a.createdAt);lsWrite();return true}catch(e){console.warn(e);return false}}

/* ---------- model ---------- */
const words=t=>String(t||'').trim().split(/\s+/).filter(Boolean).length;
const estDur=t=>Math.max(3,Math.round((words(t)/2.5+1)*10)/10);
function newProject(o={}){const s=state.settings;return{id:uid(),title:o.title||'Untitled video',topic:'',message:'',category:'Trading motivation',tone:'Calm, honest, hopeful',style:o.style||s.defaultStyle,format:o.format||s.defaultFormat,target:o.target||s.defaultDuration,
  createdAt:Date.now(),updatedAt:Date.now(),status:'Draft',voice:{...s.voice},scenes:[],captions:{...s.captions},
  music:{enabled:true,vol:s.audio.musicVol,fadeIn:s.audio.fadeIn,fadeOut:s.audio.fadeOut,mode:s.audio.mode,duck:s.audio.duck},sfx:{enabled:s.audio.sfx,vol:s.audio.sfxVol},voiceVol:s.audio.voiceVol,exports:[]}}
function newScene(p,o={}){const text=o.narration||'';return{id:uid(),kind:'motif',narration:text,headline:o.headline??K.headlineFrom(text),sub:o.sub||'',eyebrow:o.eyebrow||'',visual:o.visual||'',emotion:o.emotion||'',
  labels:o.labels&&o.labels.length?o.labels.slice(0,5):K.extractLabels(text),labelsAuto:!(o.labels&&o.labels.length),motif:o.motif&&STY[p.style].motifs.includes(o.motif)?o.motif:'auto',camera:CAMS.includes(o.camera)?o.camera:CAMS[rseed()%5],seed:rseed(),
  duration:Math.max(o.duration||0,estDur(text)),transition:o.transition||(p.style==='glass'?'lens':'wipe'),media:null,voice:null,captionText:null,captionOffset:0,role:o.role||'body'}}
function times(p){let t=0;return p.scenes.map((s,i)=>{const st=t;t+=s.duration;return{s,i,start:st,end:t}})}
const total=p=>p.scenes.reduce((a,s)=>a+(+s.duration||0),0);
function resolve(p){let prev=null;const used=new Set();p.scenes.forEach(s=>{if(s.kind==='ref'){s._m='ref';return}
  let m=s.media?'media':s.motif!=='auto'?s.motif:K.pickMotif(p.style,`${s.narration} ${s.headline} ${s.visual}`,prev,s.seed);
  s._m=m;const sig=m+':'+s.seed;if(used.has(sig))s.seed=(s.seed+7919)%1e6;used.add(m+':'+s.seed);prev=m})}
function touch(p,status){if(p.ref)return;if(status)p.status=status;else if(p.status!=='Generating'){const allV=p.scenes.length&&p.scenes.every(s=>s.voice);p.status=allV?'Ready to Export':p.scenes.length?'Editing':'Draft'}saveProject(p);syncNav()}

/* ---------- media + voice caches ---------- */
const mediaEls=new Map(),voiceBufs=new Map();let decAC=null;
async function loadMedia(m){if(!m)return null;if(mediaEls.has(m.key))return mediaEls.get(m.key);const blob=await IDB.get(m.key);if(!blob)return null;const url=URL.createObjectURL(blob);let e;
  if(m.type.startsWith('video')){const v=document.createElement('video');v.src=url;v.muted=true;v.playsInline=true;v.preload='auto';await new Promise(r=>{v.onloadeddata=r;v.onerror=r;setTimeout(r,4000)});e={el:v,type:'video'}}
  else{const img=new Image();img.src=url;try{await img.decode()}catch(x){}e={el:img,type:'image'}}mediaEls.set(m.key,e);return e}
async function decodeBlob(blob){decAC=decAC||new OfflineAudioContext(2,1,48000);return decAC.decodeAudioData(await blob.arrayBuffer())}
async function loadVoice(v){if(!v)return null;if(voiceBufs.has(v.key))return voiceBufs.get(v.key);const blob=await IDB.get(v.key);if(!blob)return null;try{const b=await decodeBlob(blob);voiceBufs.set(v.key,b);return b}catch(e){return null}}
async function warm(p){if(!p)return;await Promise.all(p.scenes.flatMap(s=>[loadMedia(s.media),loadVoice(s.voice)]))}

/* ---------- renderer ---------- */
const bufs=new Map();function buf(n,w,h){let c=bufs.get(n);if(!c){c=document.createElement('canvas');bufs.set(n,c)}if(c.width!==w||c.height!==h){c.width=w;c.height=h}return c}
function dims(fmt){return fmt==='16:9'?[1920,1080]:[1080,1920]}
function specFor(p,s){if(s.kind==='ref')return{kind:'ref',ref:s.ref};return{kind:'motif',motif:s._m||'word',headline:s.headline,sub:s.sub,eyebrow:s.eyebrow,labels:s.labelsAuto&&s._m!=='word'?[]:s.labels,seed:s.seed,camera:s.camera,motionAmt:state.settings.anim.motion}}
function drawScene(ctx,p,s,lp,W,H){const st=STY[p.style],media=s.media?mediaEls.get(s.media.key)?.el:null,sc=ctx.canvas.width/W;
  if(s._m===undefined)resolve(p);
  if(media&&media.tagName==='VIDEO'&&!exporting&&media.duration){const want=(lp*s.duration)%media.duration;if(Math.abs(media.currentTime-want)>.25)media.currentTime=want}
  if(s.kind==='ref'&&W>H){ctx.save();ctx.setTransform(sc,0,0,sc,0,0);st.backdrop(ctx,W,H);ctx.restore();
    const ph=H-90,pw=Math.round(ph*9/16),pc=buf('refpanel',Math.round(pw*sc),Math.round(ph*sc));st.draw(pc.getContext('2d'),{kind:'ref',ref:s.ref},lp,1080,1920,pc.width/1080,null);
    ctx.save();ctx.setTransform(sc,0,0,sc,0,0);const x=W-pw-120,y=45;ctx.save();K.rr(ctx,x,y,pw,ph,28);ctx.clip();ctx.drawImage(pc,x,y,pw,ph);ctx.restore();
    ctx.strokeStyle=p.style==='glass'?'rgba(242,247,255,.18)':'rgba(23,34,53,.2)';ctx.lineWidth=3;K.rr(ctx,x,y,pw,ph,28);ctx.stroke();
    const cc=st.caption;ctx.font=`500 24px ${p.style==='glass'?'"JetBrains Mono"':'"IBM Plex Mono"'},monospace`;ctx.fillStyle=cc.hi;if('letterSpacing'in ctx)ctx.letterSpacing='4px';ctx.fillText(p.title.toUpperCase().slice(0,48),120,250);if('letterSpacing'in ctx)ctx.letterSpacing='0px';
    K.block(ctx,{text:s.headline,x:120,y:300,size:66,font:`800 66px ${cc.font}`,color:cc.color,maxW:W-pw-360,reveal:K.S(lp,.02,.3)});ctx.restore();return}
  st.draw(ctx,specFor(p,s),lp,W,H,sc,media)}
let exporting=false;
function composite(ctx,A,B,k,kind,style,idx){const w=ctx.canvas.width,h=ctx.canvas.height;ctx.save();ctx.setTransform(1,0,0,1,0,0);
  if(kind==='push'){const e=K.eio(k);ctx.drawImage(A,-w*e,0);ctx.drawImage(B,w*(1-e),0)}
  else if(kind==='dissolve'){ctx.drawImage(A,0,0);ctx.globalAlpha=k;ctx.drawImage(B,0,0)}
  else if(kind==='lens'){ctx.drawImage(A,0,0);const R=Math.hypot(w,h)*.6*K.eio(k),cx=w/2,cy=h*.55;ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.clip();ctx.drawImage(B,0,0);ctx.restore();
    ctx.strokeStyle=`rgba(242,247,255,${.7*(1-k)})`;ctx.lineWidth=Math.max(2,w*.005);ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.stroke();ctx.strokeStyle=`rgba(101,217,211,${.3*(1-k)})`;ctx.lineWidth=w*.025;ctx.beginPath();ctx.arc(cx,cy,R+w*.014,0,7);ctx.stroke()}
  else{ctx.drawImage(A,0,0);const e=K.eio(k),R=Math.hypot(w,h)*1.05*e,band=w*.09*(1-e);ctx.fillStyle=['#4667FF','#16B99A','#FF765E','#FFC65C','#A3A5F4'][idx%5];ctx.beginPath();ctx.arc(0,h,R+band,0,7);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(0,h,R,0,7);ctx.clip();ctx.drawImage(B,0,0);ctx.restore()}
  ctx.restore()}
function renderFrame(ctx,p,t,fmt,opt={}){const [W,H]=dims(fmt),T=times(p);
  if(!T.length){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=p.style==='vector'?'#F6F5EE':'#0A1120';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();return}
  let i=T.findIndex(x=>t<x.end);if(i<0)i=T.length-1;const cur=T[i],lp=K.clamp((t-cur.start)/cur.s.duration),tr=state.settings.anim.trans,into=t-cur.start;
  if(i>0&&cur.s.transition!=='cut'&&into<tr&&opt.transitions!==false){const cw=ctx.canvas.width,ch=ctx.canvas.height,A=buf('A',cw,ch),B=buf('B',cw,ch);
    drawScene(A.getContext('2d'),p,T[i-1].s,1,W,H);drawScene(B.getContext('2d'),p,cur.s,lp,W,H);composite(ctx,A,B,into/tr,cur.s.transition,p.style,i)}
  else drawScene(ctx,p,cur.s,lp,W,H);
  if(opt.captions!==false&&p.captions&&p.captions.enabled)drawCaptions(ctx,p,cur,t,W,H)}
function capChunks(p,cur){const s=cur.s,txt=(s.captionText??s.narration)||'';const hiw=(p.captions.hi||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const ws=txt.split(/\s+/).filter(Boolean).map(w=>{const star=/\*/.test(w),c=w.replace(/\*/g,'');return{w:c,hi:star||hiw.includes(c.toLowerCase().replace(/[^\w’']/g,''))}});if(!ws.length)return[];
  const vb=s.voice?voiceBufs.get(s.voice.key):null,span=vb?Math.max(.5,vb.duration-(s.voice.trimStart||0)-(s.voice.trimEnd||0)):s.duration*.9,st=cur.start+(vb?VOICE_LEAD:s.duration*.04)+(+s.captionOffset||0);
  const wt=ws.map(x=>x.w.length+3),sum=wt.reduce((a,b)=>a+b,0);let acc=0;ws.forEach((x,i)=>{x.t0=st+span*acc/sum;acc+=wt[i];x.t1=st+span*acc/sum});
  const n=Math.max(1,+p.captions.words||4),out=[];let c=[];ws.forEach((x,i)=>{c.push(x);if(c.length>=n||/[.!?…,]$/.test(x.w)&&c.length>=2||i===ws.length-1){out.push({w:c,t0:c[0].t0,t1:c[c.length-1].t1});c=[]}});return out}
function drawCaptions(ctx,p,cur,t,W,H){const ch=capChunks(p,cur);const k=ch.find(c=>t>=c.t0&&t<c.t1+.12);if(!k)return;const st=STY[p.style].caption,cp=p.captions,L=K.layout(W,H),sc=ctx.canvas.width/W;
  const size=+cp.size||58,y=cp.pos==='center'?H*.5:cp.pos==='upper'?(L.land?H*.2:H*.3):L.cap.y,hi=cp.hiColor||st.hi;
  ctx.save();ctx.setTransform(sc,0,0,sc,0,0);ctx.font=`800 ${size}px ${st.font}`;if('fontStretch'in ctx)ctx.fontStretch='normal';ctx.textBaseline='middle';
  const lines=[];let line=[],lw=0;const sp=ctx.measureText(' ').width;k.w.forEach(x=>{const ww=ctx.measureText(x.w).width;if(line.length&&lw+sp+ww>L.cap.w){lines.push({ws:line,w:lw});line=[];lw=0}line.push({...x,ww});lw+=(line.length>1?sp:0)+ww});if(line.length)lines.push({ws:line,w:lw});
  const age=t-k.t0,a=cp.anim==='fade'?K.clamp(age/.18):1,s=cp.anim==='pop'?.86+.14*K.eb(K.clamp(age/.2)):1,lh=size*1.28,top=y-lines.length*lh/2;
  ctx.globalAlpha=a;ctx.translate(L.cap.x,y);ctx.scale(s,s);ctx.translate(-L.cap.x,-y);
  lines.forEach((ln,li)=>{const ly=top+li*lh+lh/2,x0=L.cap.x-ln.w/2;ctx.fillStyle=st.box;K.rr(ctx,x0-size*.4,ly-lh/2+4,ln.w+size*.8,lh-8,size*.32);ctx.fill();let x=x0;
    ln.ws.forEach(w=>{const active=cp.anim==='karaoke'?t>=w.t0:true;ctx.fillStyle=w.hi?hi:(cp.anim==='karaoke'&&!active?(p.style==='glass'?'rgba(242,247,255,.45)':'rgba(23,34,53,.4)'):st.color);ctx.fillText(w.w,x,ly);x+=w.ww+sp})});ctx.restore()}

/* ---------- audio context + mix options ---------- */
let AC=null;function ac(){if(!AC){AC=new (window.AudioContext||window.webkitAudioContext)()}if(AC.state==='suspended')AC.resume();return AC}
function mixOpts(p,from,at,solo){const T=times(p);return{from,at,total:total(p),style:p.style,solo,voiceVol:p.voiceVol??1,music:p.music,sfx:p.sfx,
  scenes:T.map(x=>({start:x.start,end:x.end})),voices:T.filter(x=>x.s.voice&&voiceBufs.get(x.s.voice.key)).map(x=>({buffer:voiceBufs.get(x.s.voice.key),start:x.start+VOICE_LEAD,trimStart:x.s.voice.trimStart||0,trimEnd:x.s.voice.trimEnd||0,vol:x.s.voice.vol??1}))}}

/* ---------- player ---------- */
const players=new Set();
class Player{constructor(cv,o){this.cv=cv;this.o=o;this.t=o.start??0;this.playing=false;this.audio=o.audio!==false;this.dirty=true;players.add(this)}
  get p(){return this.o.get()}
  range(){const r=this.o.range&&this.o.range();return r||[0,total(this.p)]}
  size(){const [W,H]=dims(this.o.fmt());const s=this.o.scale||.5,w=Math.round(W*s),h=Math.round(H*s);if(this.cv.width!==w||this.cv.height!==h){this.cv.width=w;this.cv.height=h}}
  play(){if(this.playing)return;const [a,b]=this.range();if(this.t>=b-.05||this.t<a)this.t=a;this.playing=true;this.last=performance.now();if(this.audio)this.startAudio();this.o.onState&&this.o.onState(true)}
  pause(){if(!this.playing)return;this.playing=false;this.stopAudio();this.o.onState&&this.o.onState(false)}
  toggle(){this.playing?this.pause():this.play()}
  seek(t){const [a,b]=this.range();this.t=K.clamp(t,a,b);if(this.playing&&this.audio){this.stopAudio();this.startAudio()}this.dirty=true}
  startAudio(){const c=ac(),p=this.p;this.at=c.currentTime+.06;this.t0=this.t;try{this.mix=AUDIO.build(c,c.destination,mixOpts(p,this.t,this.at,this.o.solo&&this.o.solo()))}catch(e){console.warn(e)}}
  stopAudio(){if(this.mix){this.mix.stop();this.mix=null}}
  tick(now){if(!this.cv.isConnected){this.pause();players.delete(this);return}
    if(this.playing){if(this.mix&&AC){this.t=this.t0+Math.max(0,AC.currentTime-this.at)}else{this.t+=(now-this.last)/1000}this.last=now;
      const [a,b]=this.range();if(this.t>=b){if(this.o.loop){this.t=a;if(this.audio){this.stopAudio();this.startAudio()}}else{this.t=b;this.pause()}}this.dirty=true}
    if(this.dirty&&!this.o.noVisual){this.size();const ctx=this.cv.getContext('2d');try{renderFrame(ctx,this.p,this.t,this.o.fmt(),{captions:this.o.captions?this.o.captions():true})}catch(e){console.error(e)}this.dirty=false}
    this.o.onTime&&this.o.onTime(this.t)}}
function loop(now){players.forEach(pl=>pl.tick(now));requestAnimationFrame(loop)}
function stopPlayers(){players.forEach(p=>{p.pause()});players.clear()}
function thumb(cv,p,t,fmt){const [W,H]=dims(fmt||p.format);const s=cv.dataset.scale?+cv.dataset.scale:.2;cv.width=Math.round(W*s);cv.height=Math.round(H*s);resolve(p);
  try{renderFrame(cv.getContext('2d'),p,t??(p.scenes.length?Math.min(total(p)-.01,p.scenes[0].duration*.75):0),fmt||p.format,{captions:false,transitions:false})}catch(e){console.error(e)}}

/* ---------- nav + router ---------- */
function syncNav(){const sel=$('#projSel'),cur=state.cur;sel.innerHTML=`<optgroup label="Reference films">${[REFS.glass,REFS.vector].map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</optgroup>`+(state.projects.length?`<optgroup label="Your projects">${state.projects.map(p=>`<option value="${p.id}">${esc(p.title)}</option>`).join('')}</optgroup>`:'');sel.value=getP(cur)?cur:REFS.glass.id}
$('#projSel').addEventListener('change',e=>{state.cur=e.target.value;lsWrite();route()});
const PAGES={};let page='home';
function route(){const r=(location.hash||'#home').slice(1);page=PAGES[r]?r:'home';stopPlayers();document.querySelectorAll('#links a').forEach(a=>a.setAttribute('aria-current',a.getAttribute('href')==='#'+page?'page':'false'));
  if(!getP())state.cur=REFS.glass.id;syncNav();app.innerHTML='';const el=document.createElement('div');el.className='page';app.appendChild(el);PAGES[page](el);guide(el);window.scrollTo({top:0})}
function rerender(){const y=window.scrollY;stopPlayers();app.innerHTML='';const el=document.createElement('div');el.className='page';el.style.animation='none';app.appendChild(el);PAGES[page](el);guide(el);window.scrollTo({top:y})}
window.addEventListener('hashchange',route);
/* ---------- friendly step guide ---------- */
const STEPS=[['script','Write','Write or generate what the narrator says'],['scenes','Scenes','Check the visuals for each line'],['voice','Voice','Add a voiceover to every scene'],['preview','Watch','Play it through before you export'],['export','Export','Save your MP4 file']];
function stepDone(p,k){if(!p||p.ref)return false;const n=p.scenes.length;return k==='script'?n>0:k==='scenes'?n>0&&['Editing','Ready to Export','Exported'].includes(p.status)||n>0&&p.scenes.some(s=>s.voice):k==='voice'?n>0&&p.scenes.every(s=>s.voice):k==='preview'?['Ready to Export','Exported'].includes(p.status):k==='export'?p.status==='Exported':false}
function guide(el){const i=STEPS.findIndex(x=>x[0]===page);const p=getP();if(i<0||!p||p.ref)return;
  const bar=document.createElement('nav');bar.className='stepbar';bar.setAttribute('aria-label','Steps');
  bar.innerHTML=`<div class="stepname"><span class="dim small">Working on</span><b>${esc(p.title)}</b></div><ol>${STEPS.map(([k,l],j)=>`<li><a href="#${k}" class="${j===i?'now':''} ${stepDone(p,k)?'done':''}"${j===i?' aria-current="step"':''}><span class="sn">${stepDone(p,k)&&j!==i?'✓':j+1}</span>${l}</a></li>`).join('')}</ol>`;
  el.prepend(bar);
  const nx=STEPS[i+1],pv=STEPS[i-1],foot=document.createElement('div');foot.className='nextbar';
  foot.innerHTML=`${pv?`<a class="btn ghost" href="#${pv[0]}">← ${pv[1]}</a>`:'<span></span>'}<div class="nexttip"><b>Step ${i+1} of 5 · ${STEPS[i][1]}</b><span class="muted small">${STEPS[i][2]}</span></div>${nx?`<a class="btn primary big" href="#${nx[0]}">Next: ${nx[1]} →</a>`:`<a class="btn primary big" href="#home">Back to my videos</a>`}`;
  el.appendChild(foot)}
const go=h=>{if(location.hash==='#'+h)route();else location.hash=h};
function applyAccent(){const a=state.settings.accent||'#65D9D3',n=parseInt(a.slice(1),16);document.documentElement.style.setProperty('--accent',a);document.documentElement.style.setProperty('--accent-rgb',`${n>>16},${n>>8&255},${n&255}`)}
const chip=st=>`<span class="chip st-${String(st).replace(/\s/g,'')}"><i></i>${esc(st)}</span>`;
const hero=(k,t,l,right='')=>`<div class="hero"><div><div class="kicker">${k}</div><h1>${t}</h1>${l?`<p class="lede">${l}</p>`:''}</div><div class="row">${right}</div></div>`;
const opt=(v,l,cur)=>`<option value="${esc(v)}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`;
const segBtns=(name,items,cur)=>`<div class="seg" role="group">${items.map(([v,l])=>`<button type="button" data-seg="${name}" data-v="${v}" aria-pressed="${String(v)===String(cur)}">${l}</button>`).join('')}</div>`;
function needProject(el,what){const p=getP();if(p&&!p.ref)return p;el.innerHTML=hero(what,'Open a project first',p&&p.ref?`<b>${esc(p.title)}</b> is a reference film and stays locked. Duplicate it to work on a copy, or start a new video.`:'Pick a project from the menu at the top, or start a new one.',`${p&&p.ref?`<button class="btn" data-act="dupRef">Duplicate reference</button>`:''}<button class="btn primary" data-act="newProj">New video</button>`);return null}

/* ---------- PAGE: Dashboard ---------- */
let libFilter='All',newForm=false,confirmDel=null;
PAGES.home=el=>{const ps=state.projects,counts=STATUSES.map(s=>[s,ps.filter(p=>p.status===s).length]);
  const list=[REFS.glass,REFS.vector,...ps].filter(p=>libFilter==='All'||p.status===libFilter||(libFilter==='Reference'&&p.ref));
  el.innerHTML=`${hero('Welcome back','Make a trading video in 5 easy steps.','Start a new video, then follow the steps at the top of each page. Your work saves automatically.',`<button class="btn primary big" data-act="toggleNew">+ Start a new video</button>`)}
  ${(()=>{const last=[...ps].sort((a,b)=>(b.updatedAt||b.createdAt)-(a.updatedAt||a.createdAt))[0];const howto=`<ol class="howto">${STEPS.map(([k,l,d],j)=>`<li><span class="sn">${j+1}</span><div><b>${l}</b><span class="muted small">${d}</span></div></li>`).join('')}</ol>`;
    if(!last)return`<div class="card glow"><div class="cardhead"><h2>How it works</h2></div>${howto}<p class="note" style="margin-top:14px">New here? Watch one of the two example films below to see what you can make.</p></div>`;
    const nxt=STEPS.find(([k])=>!stepDone(last,k))||STEPS[4];
    return`<div class="card glow"><div class="cardhead"><div><div class="kicker">Continue where you left off</div><h2 style="margin-top:6px">${esc(last.title)}</h2></div><button class="btn primary big" data-act="open" data-id="${last.id}" data-to="${nxt[0]}">Continue: ${nxt[1]} →</button></div>${howto.replace('<ol class="howto">','<ol class="howto compact">')}</div>`})()}
  ${newForm?`<div class="card glow"><div class="cardhead"><h2>New video</h2><button class="btn ghost sm" data-act="toggleNew">Cancel</button></div>
    <div class="grid g4"><label class="field"><span>Title</span><input type="text" id="nfTitle" placeholder="e.g. The day I stopped revenge trading"></label>
    <label class="field"><span>Style</span><select id="nfStyle">${opt('glass',styleName('glass'),state.settings.defaultStyle)}${opt('vector',styleName('vector'),state.settings.defaultStyle)}</select></label>
    <label class="field"><span>Format</span><select id="nfFmt">${opt('9:16','Shorts 9:16',state.settings.defaultFormat)}${opt('16:9','Landscape 16:9',state.settings.defaultFormat)}</select></label>
    <label class="field"><span>Target length (s)</span><input type="number" id="nfDur" min="15" max="180" value="${state.settings.defaultDuration}"></label></div>
    <div class="row" style="margin-top:14px"><button class="btn primary big" data-act="createProj">Create video and start writing →</button></div></div>`:''}
  <div class="grid g4">${[['Projects',ps.length],['In progress',ps.filter(p=>['Script Ready','Editing','Generating'].includes(p.status)).length],['Ready to export',ps.filter(p=>p.status==='Ready to Export').length],['Exported',ps.filter(p=>p.status==='Exported').length]].map(([l,v])=>`<div class="card"><div class="kicker" style="color:var(--muted)">${l}</div><div style="font-family:var(--disp);font-size:38px;font-weight:800;margin-top:4px">${v}</div></div>`).join('')}</div>
  <div class="card"><div class="cardhead"><h2>My videos</h2>${segBtns('lib',[['All','All'],['Reference','Reference'],...STATUSES.map(s=>[s,s])],libFilter)}</div>
    ${list.length?`<div class="projects">${list.map(p=>`<article class="pcard"><div class="pthumb"><canvas data-thumb="${p.id}" data-scale=".2"></canvas></div><div class="pbody">
      <div class="row">${chip(p.status)}<span class="chip">${esc(styleName(p.style).split('—')[0].trim())}</span></div><h3>${esc(p.title)}</h3>
      <div class="meta"><span>${new Date(p.createdAt).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'})}</span><span>${fmtD(total(p))}</span><span>${p.format}</span><span>${p.scenes.length} scenes</span></div>
      <div class="row">${p.ref?`<button class="btn sm primary" data-act="open" data-id="${p.id}" data-to="preview">Watch</button><button class="btn sm" data-act="dupRef" data-id="${p.id}">Duplicate</button>`:
        confirmDel===p.id?`<span class="small">Delete for good?</span><button class="btn sm danger" data-act="delProj" data-id="${p.id}">Delete</button><button class="btn sm ghost" data-act="cancelDel">Keep</button>`:
        `<button class="btn sm primary" data-act="open" data-id="${p.id}" data-to="${p.scenes.length?'scenes':'script'}">Open</button><button class="btn sm" data-act="dupProj" data-id="${p.id}">Duplicate</button><button class="btn sm ghost" data-act="askDel" data-id="${p.id}">Delete</button>`}</div></div></article>`).join('')}</div>`:`<div class="empty">No projects with this status yet.</div>`}</div>
  <p class="note">${cap.db&&cap.uid?'Projects and settings are saved to your Claude account. Voiceover audio and uploaded media are kept in this browser.':'Projects are saved in this browser. Voiceover audio and uploaded media are kept in this browser too.'}</p>`;
  el.querySelectorAll('canvas[data-thumb]').forEach(cv=>{const p=getP(cv.dataset.thumb);warm(p).then(()=>thumb(cv,p))})};

/* ---------- PAGE: Style Library ---------- */
const PAL_NAMES={glass:{ink:'Background',deep:'Deep shade',porc:'Text',blue:'Blue',aqua:'Aqua',lav:'Lavender',peach:'Highlight',loss:'Loss red',muted:'Muted'},
  vector:{IV:'Background',P2:'Paper',INK:'Ink / text',CB:'Blue',TL:'Teal',CR:'Coral',AM:'Amber',PE:'Periwinkle',SK:'Skin',SL:'Slate'}};
STY.glass._pal=K.pal('glass',K.palDefaults.glass);STY.vector._pal=K.pal('vector',K.palDefaults.vector);
document.addEventListener('change',e=>{const t=e.target;if(!t.dataset||!t.dataset.pal)return;K.palSet(t.dataset.pal,t.dataset.k,t.value);sessionStorage.setItem('tvs.toast','Colours updated');location.reload()});
document.addEventListener('click',e=>{const b=e.target.closest('[data-palreset]');if(!b)return;K.palReset(b.dataset.palreset);sessionStorage.setItem('tvs.toast','Colours reset');location.reload()});
setTimeout(()=>{try{const m=sessionStorage.getItem('tvs.toast');if(m){sessionStorage.removeItem('tvs.toast');toast(m)}}catch(e){}},400);
PAGES.styles=el=>{el.innerHTML=hero('Style library','Two styles. One look per video.','Each style is a reusable profile built from your two reference films. Every scene in a video uses the style chosen for that video, and the two never mix.')+
  ['glass','vector'].map(id=>{const st=STY[id],def=state.settings.defaultStyle===id;return`<section class="card glow"><div class="stylecard">
    <div class="grid" style="gap:10px"><div class="screen portrait"><canvas data-styleplay="${id}"></canvas></div><div class="row"><button class="btn sm" data-act="stylePlay" data-id="${id}">Pause</button><button class="btn sm primary" data-act="open" data-id="ref-${id}" data-to="preview">Watch full film</button></div></div>
    <div class="grid" style="gap:16px">
      <div class="row"><span class="kicker">${id==='glass'?'Reference video 1':'Reference video 2'}</span>${def?'<span class="chip st-Exported"><i></i>Default style</span>':''}</div>
      <label class="field"><span>Style name</span><input type="text" data-stylename="${id}" value="${esc(styleName(id))}"></label>
      <div class="grid" style="gap:8px"><div class="row"><b class="small">Colours</b><span class="small muted">Click a colour to change it. Every video in this style updates.</span><span class="spacer"></span><button class="btn sm ghost" data-palreset="${id}">Reset colours</button></div>
        <div class="palgrid">${Object.entries(PAL_NAMES[id]).map(([k,l])=>{const v=STY[id]._pal[k];return`<label class="palsw" title="${l}"><input type="color" data-pal="${id}" data-k="${k}" value="${v}"><span>${l}</span></label>`}).join('')}</div></div>
      <dl class="traits">${Object.entries(st.traits).map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}<div><dt>Scene kit</dt><dd>${st.motifs.map(m=>`<span class="chip" style="margin:0 4px 4px 0">${m}</span>`).join('')}</dd></div></dl>
      <div class="row"><button class="btn primary" data-act="newWithStyle" data-id="${id}">New video in this style</button>${def?'':`<button class="btn" data-act="setDefStyle" data-id="${id}">Make default</button>`}
        <label class="btn ghost">Attach the original recording<input type="file" accept="video/*" data-refupload="${id}" hidden></label></div>
      <div data-refvid="${id}"></div></div></div></section>`}).join('');
  ['glass','vector'].forEach(id=>{const cv=el.querySelector(`[data-styleplay="${id}"]`),p=REFS[id];const pl=new Player(cv,{get:()=>p,fmt:()=>'9:16',loop:true,audio:false,scale:.34,captions:()=>false});pl.play();cv._pl=pl;
    IDB.get('refvid_'+id).then(b=>{if(!b)return;const box=el.querySelector(`[data-refvid="${id}"]`);const v=document.createElement('video');v.src=URL.createObjectURL(b);v.controls=true;v.playsInline=true;v.style.cssText='width:100%;max-height:320px;border-radius:12px;background:#000';box.innerHTML='<div class="small muted" style="margin-bottom:6px">Attached original recording</div>';box.appendChild(v)})})};

/* ---------- PAGE: Script Studio ---------- */
let scriptMode='generate',streamText='',genError='',ownText='';
const MOTIF_DESC={glass:{night:'a lone glowing dot separating from a circle of friends over a night city',ledger:'a list of personal costs magnified by a sliding glass bar',streak:'a row of loss tiles and a falling equity line (only for losing streaks)',loop:'a four-node emotional cycle with orbiting glass droplets',shield:'an account protected by concentric rule rings deflecting threats',zoomout:'a long-term curve; the lens pulls back from one dip to the whole climb',rise:'a rising staircase of bars toward a goal flag',split:'a crowd on one side and one person on the other',word:'one giant keyword swept by a lens'},
  vector:{desk:'the character alone at a laptop at night, clock on the wall',signpost:'a signpost with up to five labelled boards and the character pointing',compare:'two coin jars: one drains through a crack, one fills steadily',rocket:'a two-stage rocket; the labelled booster burns out, the banded upper stage continues',house:'a house built from labelled bricks; an exit door becomes its front door',phone:'a phone with a get-rich-quick arrow, coins and a tag',stairs:'the character climbing labelled steps to a flag',scale:'a balance scale weighing two labels until level',word:'one big keyword with morphing flat shapes'}};
function scriptBrief(p){return`Video title: ${p.title}\nTopic: ${p.topic||'(not given)'}\nMain message: ${p.message||'(not given)'}\nTone and emotional direction: ${p.tone}\nFormat: ${p.format==='9:16'?'vertical Shorts/Reels':'landscape YouTube'}\nVisual style: ${styleName(p.style)}`}
function motifList(p){return Object.entries(MOTIF_DESC[p.style]).map(([k,v])=>`- ${k}: ${v}`).join('\n')}
const RULES=`Rules:
- Written for the ear: short spoken sentences, contractions, natural rhythm. No lists, headings, hashtags or emojis.
- Never invent statistics, percentages, win rates, prices, account balances or results. No financial promises or guarantees.
- Only reference charts when the narration is genuinely about a chart.
- headline: on-screen text, at most 9 words, may paraphrase the narration.
- visual: one sentence describing an original illustration for this exact narration in the chosen style.
- labels: 1 to 4 short words or phrases drawn on the illustration.
- camera: one of push-in, pull-back, pan-left, pan-right, drift-up, static.`;
function parseJSON(t){const s=t.indexOf('{'),e=t.lastIndexOf('}');if(s<0||e<s)throw new Error('No JSON in the reply');return JSON.parse(t.slice(s,e+1))}
async function genScript(p){if(!cap.sample){genError='Script generation needs Claude access, which this view doesn’t have. You can still write your own script below.';rerender();return}
  const n=Math.max(4,Math.min(12,Math.round(p.target/5.5)));state.genBusy={id:p.id,what:'all'};p.status='Generating';streamText='';genError='';rerender();
  const prompt=`You write narration scripts for short trading education and motivation videos, read aloud by a calm, deep male narrator.\n\n${scriptBrief(p)}\nTarget length: about ${p.target} seconds spoken (about 2.5 words per second), in ${n} scenes.\n\nThe first scene is the opening hook (role "hook"); the last scene is a positive, memorable ending (role "ending"); the rest are role "body".\nmotif: pick the illustration from this list that fits each scene best, and vary them:\n${motifList(p)}\n\n${RULES}\n\nReturn ONLY JSON, no commentary:\n{"title":string,"scenes":[{"role":"hook"|"body"|"ending","narration":string,"headline":string,"visual":string,"emotion":string,"camera":string,"motif":string,"labels":[string],"seconds":number}]}`;
  try{const r=await cap.sample(prompt,{modelTier:'default',onText:u=>{streamText=u.text;const b=document.getElementById('stream');if(b){b.textContent=streamText;b.scrollTop=b.scrollHeight}}});
    const j=parseJSON(r.text);if(!Array.isArray(j.scenes)||!j.scenes.length)throw new Error('The reply had no scenes');
    p.scenes.forEach(s=>{if(s.voice)IDB.del(s.voice.key)});p.scenes=j.scenes.map(s=>newScene(p,{...s,duration:+s.seconds||0}));if(j.title&&(!p.title||p.title==='Untitled video'))p.title=j.title;resolve(p);p.status='Script Ready';toast('Script ready: '+p.scenes.length+' scenes')}
  catch(e){genError=(e&&e.code==='not_granted')?'Claude access was declined for this page. Allow it from the page permissions to generate scripts.':(e&&e.code==='rate_limited')?'Too many requests right now. Wait a moment, then try again.':'Generation failed: '+(e.message||e.code||e);p.status=p.scenes.length?'Editing':'Draft'}
  state.genBusy=null;saveProject(p);if(page==='script')rerender()}
async function regenScene(p,i){if(!cap.sample){toast('Claude access isn’t available in this view');return}const s=p.scenes[i],role=i===0?'hook':i===p.scenes.length-1?'ending':'body';state.genBusy={id:p.id,what:s.id};rerender();
  const ctxt=p.scenes.map((x,k)=>`${k+1}. ${x.narration}`).join('\n');
  const prompt=`You are revising one scene of a narrated trading video script.\n\n${scriptBrief(p)}\n\nCurrent script:\n${ctxt}\n\nRewrite scene ${i+1} (role: ${role}${role==='hook'?', a strong opening hook':role==='ending'?', a positive, memorable ending':''}) so it flows with the scenes around it. Keep it around ${Math.round(s.duration)} seconds spoken.\nmotif options:\n${motifList(p)}\n\n${RULES}\n\nReturn ONLY JSON: {"narration":string,"headline":string,"visual":string,"emotion":string,"camera":string,"motif":string,"labels":[string],"seconds":number}`;
  try{const r=await cap.sample(prompt,{modelTier:'default'});const j=parseJSON(r.text);const ns=newScene(p,{...j,duration:+j.seconds||0});ns.id=s.id;ns.transition=s.transition;
    if(s.voice){IDB.del(s.voice.key)}p.scenes[i]=ns;resolve(p);touch(p);toast(`Scene ${i+1} rewritten`)}catch(e){toast('Couldn’t rewrite that scene: '+(e.message||e.code||e))}
  state.genBusy=null;if(page==='script')rerender()}
function splitOwn(p,text){const sents=String(text).replace(/\s+/g,' ').trim().match(/[^.!?…]+[.!?…]+["”’]?|[^.!?…]+$/g)||[];const groups=[];let g='';sents.forEach(s=>{s=s.trim();if(!s)return;if(g&&words(g+' '+s)>24){groups.push(g);g=s}else g=g?g+' '+s:s});if(g)groups.push(g);
  p.scenes.forEach(s=>{if(s.voice)IDB.del(s.voice.key)});p.scenes=groups.map((t,i)=>newScene(p,{narration:t,role:i===0?'hook':i===groups.length-1?'ending':'body'}));resolve(p);p.status=p.scenes.length?'Script Ready':'Draft';saveProject(p)}
PAGES.script=el=>{const p=needProject(el,'Script studio');if(!p)return;const busy=state.genBusy&&state.genBusy.id===p.id,T=times(p);
  el.innerHTML=`${hero('Script studio',esc(p.title),'Generate a spoken script with Claude, or write your own. Every scene can be edited or rewritten on its own without touching the rest.',`<button class="btn" data-act="go" data-to="scenes" ${p.scenes.length?'':'disabled'}>Open Scene Editor</button>`)}
  <div class="split"><div class="card"><div class="cardhead"><h2>Brief</h2>${segBtns('smode',[['generate','Generate'],['own','Write my own']],scriptMode)}</div>
    <div class="formgrid"><label class="field full"><span>Video title</span><input type="text" data-pf="title" value="${esc(p.title)}"></label>
    <label class="field full"><span>Topic</span><input type="text" data-pf="topic" value="${esc(p.topic)}" placeholder="e.g. Why most prop firm challenges fail in week one"></label>
    <label class="field full"><span>Main message</span><textarea data-pf="message" rows="2" placeholder="The one idea viewers should leave with">${esc(p.message)}</textarea></label>
    
    <label class="field full"><span>Tone and emotion</span><input type="text" data-pf="tone" value="${esc(p.tone)}"></label>
    <label class="field"><span>Visual style</span><select data-act-change="style">${['glass','vector'].map(s=>opt(s,styleName(s),p.style)).join('')}</select></label>
    <label class="field"><span>Format</span><select data-pf="format">${opt('9:16','Shorts 9:16',p.format)}${opt('16:9','Landscape 16:9',p.format)}</select></label>
    <label class="field"><span>Desired duration (s)</span><input type="number" min="15" max="180" data-pf="target" value="${p.target}"></label></div>
    ${scriptMode==='generate'?`<div class="row" style="margin-top:16px"><button class="btn primary" data-act="genScript" ${busy||!cap.ready?'disabled':''}>${busy&&state.genBusy.what==='all'?'Writing…':p.scenes.length?'Regenerate whole script':'Generate script'}</button>${p.scenes.length?'<span class="small muted">Replaces every scene and its voiceover.</span>':''}</div>
      ${cap.sample?'':`<p class="note" style="margin-top:12px">${cap.ready?'Claude script generation isn’t available in this view. Use “Write my own”.':'Connecting to Claude…'}</p>`}`
    :`<label class="field" style="margin-top:16px"><span>Your script</span><textarea id="ownText" rows="8" placeholder="Paste or write the full narration. It will be split into scenes of one to two sentences.">${esc(ownText)}</textarea></label><div class="row" style="margin-top:12px"><button class="btn primary" data-act="splitOwn">Split into scenes</button>${p.scenes.length?'<span class="small muted">Replaces current scenes.</span>':''}</div>`}
    ${genError?`<div class="errbox" style="margin-top:14px">${esc(genError)}</div>`:''}</div>
  <div class="card"><div class="cardhead"><h2>Script</h2><span class="tc">${p.scenes.length} scenes · ${fmtT(total(p))} of ${fmtD(p.target)} target</span></div>
    ${busy&&state.genBusy.what==='all'?`<div class="stream" id="stream">${esc(streamText||'Thinking…')}</div>`:''}
    ${p.scenes.length?T.map(({s,start,end},i)=>`<div class="scriptscene"><div><div class="ts">${fmtT(start)}<br>${fmtT(end)}</div><div class="small muted" style="margin-top:6px">${i===0?'Hook':i===p.scenes.length-1?'Ending':'Scene '+(i+1)}</div></div>
      <div class="grid" style="gap:8px"><label class="field"><span>Voiceover</span><textarea rows="2" data-sf="narration" data-sid="${s.id}">${esc(s.narration)}</textarea></label>
      <div class="formgrid"><label class="field"><span>Visual</span><input type="text" data-sf="visual" data-sid="${s.id}" value="${esc(s.visual)}"></label><label class="field"><span>Emotional direction</span><input type="text" data-sf="emotion" data-sid="${s.id}" value="${esc(s.emotion)}"></label></div>
      <div class="row"><button class="btn sm" data-act="regenScene" data-i="${i}" ${busy||!cap.sample?'disabled':''}>${busy&&state.genBusy.what===s.id?'Rewriting…':'Rewrite this scene'}</button><button class="btn sm ghost" data-act="editScene" data-sid="${s.id}">Edit visuals</button><span class="small muted">${words(s.narration)} words · ~${estDur(s.narration)}s spoken</span></div></div></div>`).join(''):`<div class="empty">${scriptMode==='generate'?'Fill in the brief and generate a script.':'Write your script, then split it into scenes.'}</div>`}
  </div></div>`};

/* ---------- PAGE: Scene Editor ---------- */
let selScene=null,confirmSceneDel=null;
PAGES.scenes=el=>{const p=getP();if(!p){needProject(el,'Scene editor');return}resolve(p);if(!p.scenes.find(s=>s.id===selScene))selScene=p.scenes[0]?.id;const s=p.scenes.find(x=>x.id===selScene),T=times(p),tt=T.find(x=>x.s===s),lock=p.ref,isRef=s&&s.kind==='ref',st=STY[p.style];
  const vb=s&&s.voice?voiceBufs.get(s.voice.key):null,need=vb?Math.round((VOICE_LEAD+vb.duration-(s.voice.trimStart||0)-(s.voice.trimEnd||0)+.45)*10)/10:0;
  el.innerHTML=`${hero('Scene editor',esc(p.title),`${p.scenes.length} scenes · ${fmtT(total(p))} · ${esc(styleName(p.style))}`,lock?`<button class="btn primary" data-act="dupRef">Duplicate to edit</button>`:`<button class="btn" data-act="addScene">Add scene</button><button class="btn primary" data-act="go" data-to="preview">Preview video</button>`)}
  ${lock?'<div class="note">Reference films are locked. Duplicate this one to edit its scenes, captions or voiceover.</div>':''}
  ${p.scenes.length?`<div class="card"><div class="cardhead"><h2>Timeline</h2><span class="small muted">Click a scene to edit it. Width follows duration.</span></div><div class="strip">${T.map(({s:x,start},i)=>`<button type="button" class="sblock" data-act="selScene" data-sid="${x.id}" aria-pressed="${x.id===selScene}" style="width:${Math.max(118,x.duration*16)}px"><canvas data-sthumb="${x.id}" data-scale=".1"></canvas><div class="sl"><b>${String(i+1).padStart(2,'0')}</b><span>${fmtT(start)}</span><span>${x.duration.toFixed(1)}s</span><span class="dot ${x.voice?'on':''}" title="${x.voice?'Voiceover attached':'No voiceover yet'}"></span></div></button>`).join('')}</div></div>`:`<div class="empty">This project has no scenes yet. <button class="btn sm" data-act="go" data-to="script">Write the script</button> or <button class="btn sm" data-act="addScene">add a blank scene</button>.</div>`}
  ${s?`<div class="split"><div class="card"><div class="cardhead"><h2>Scene ${tt.i+1}</h2><span class="tc">${fmtT(tt.start)} – ${fmtT(tt.end)}</span></div>
      <div class="screen ${p.format==='16:9'?'land':'portrait'}" style="${p.format==='9:16'?'height:min(62vh,640px)':''}"><canvas id="scv"></canvas></div>
      <div class="transport" style="margin-top:12px"><button class="btn sm" data-act="scPlay">Play scene</button><input type="range" id="scScrub" min="0" max="1000" value="0" aria-label="Scrub scene"><span class="tc" id="scTc"></span></div>
      ${!lock?`<div class="row" style="margin-top:12px"><button class="btn sm" data-act="moveScene" data-d="-1" ${tt.i===0?'disabled':''}>← Move</button><button class="btn sm" data-act="moveScene" data-d="1" ${tt.i===p.scenes.length-1?'disabled':''}>Move →</button><button class="btn sm" data-act="dupScene">Duplicate</button>
        ${confirmSceneDel===s.id?`<button class="btn sm danger" data-act="delScene">Confirm delete</button><button class="btn sm ghost" data-act="cancelSceneDel">Keep</button>`:`<button class="btn sm ghost" data-act="askSceneDel">Delete</button>`}</div>`:''}</div>
    <div class="card"><div class="formgrid">
      <label class="field full"><span>Voiceover text</span><textarea rows="3" data-sf="narration" data-sid="${s.id}" ${lock?'disabled':''}>${esc(s.narration)}</textarea></label>
      ${isRef?`<div class="full note">This scene comes from the reference film, so its artwork is fixed. You can change its text for captions, its timing, transition and voiceover.</div>`:`
      <label class="field full"><span>On-screen headline</span><input type="text" data-sf="headline" data-sid="${s.id}" value="${esc(s.headline)}" ${lock?'disabled':''}></label>
      <label class="field"><span>Second line</span><input type="text" data-sf="sub" data-sid="${s.id}" value="${esc(s.sub)}" placeholder="optional"></label>
      <label class="field"><span>Eyebrow label</span><input type="text" data-sf="eyebrow" data-sid="${s.id}" value="${esc(s.eyebrow)}" placeholder="optional"></label>
      <label class="field full"><span>Illustration labels (comma separated)</span><input type="text" data-sf="labels" data-sid="${s.id}" value="${s.labelsAuto&&s._m!=='word'?'':esc((s.labels||[]).join(', '))}" placeholder="${s.labelsAuto?'Using the illustration’s default labels':''}"></label>
      <label class="field full"><span>Visual description</span><textarea rows="2" data-sf="visual" data-sid="${s.id}">${esc(s.visual)}</textarea></label>
      <label class="field"><span>Illustration</span><select data-sf="motif" data-sid="${s.id}" ${s.media?'disabled':''}>${opt('auto',`Auto from narration (${s._m})`,s.motif)}${st.motifs.map(m=>opt(m,m,s.motif)).join('')}</select></label>
      <label class="field"><span>Camera move</span><select data-sf="camera" data-sid="${s.id}">${CAMS.map(c=>opt(c,c,s.camera)).join('')}</select></label>`}
      <label class="field"><span>Transition in</span><select data-sf="transition" data-sid="${s.id}" ${lock?'disabled':''}>${Object.entries(TRANS).map(([k,v])=>opt(k,v,s.transition)).join('')}</select></label>
      <label class="field"><span>Duration (s)</span><input type="number" min="1.5" max="60" step=".1" data-sf="duration" data-sid="${s.id}" value="${s.duration}" ${lock?'disabled':''}></label>
      ${!isRef?`<label class="field"><span>Emotion</span><input type="text" data-sf="emotion" data-sid="${s.id}" value="${esc(s.emotion)}"></label>`:''}</div>
      ${vb&&need>s.duration+.05?`<div class="warnbox" style="margin-top:14px">The voiceover needs ${need.toFixed(1)} s but the scene is ${s.duration.toFixed(1)} s. <button class="btn sm" data-act="fitVoice">Extend scene to ${need.toFixed(1)} s</button></div>`:''}
      ${!lock&&!isRef?`<div class="row" style="margin-top:16px"><button class="btn" data-act="newVisual">New visual</button><button class="btn" data-act="newAnim">New animation</button>
        <label class="btn ghost">${s.media?'Replace':'Use'} my image or video<input type="file" accept="image/*,video/*" data-sceneupload="${s.id}" hidden></label>${s.media?`<button class="btn ghost" data-act="rmMedia">Remove ${esc(s.media.name)}</button>`:''}</div>
        <p class="small muted" style="margin-top:10px">New visual redraws this scene’s illustration with a fresh layout and colours. New animation picks a different camera move and transition. Other scenes are never touched.</p>`:''}
    </div></div>`:''}`;
  el.querySelectorAll('canvas[data-sthumb]').forEach(cv=>{const x=p.scenes.find(z=>z.id===cv.dataset.sthumb),i=p.scenes.indexOf(x),st0=T[i].start;thumb(cv,p,st0+x.duration*.62)});
  if(s){warm(p);const cv=el.querySelector('#scv'),pl=new Player(cv,{get:()=>p,fmt:()=>p.format,range:()=>{const q=times(p).find(x=>x.s.id===selScene);return q?[q.start,q.end]:[0,0]},loop:true,audio:true,start:tt.start+s.duration*.62,
    onTime:t=>{const q=times(p).find(x=>x.s.id===selScene);if(!q)return;const sc=document.getElementById('scScrub'),tc=document.getElementById('scTc');if(sc)sc.value=Math.round((t-q.start)/q.s.duration*1000);if(tc)tc.textContent=fmtT(t-q.start)+' / '+fmtT(q.s.duration)},
    onState:on=>{const b=el.querySelector('[data-act="scPlay"]');if(b)b.textContent=on?'Pause':'Play scene'}});el._pl=pl;
    el.querySelector('#scScrub').addEventListener('input',e=>{const q=times(p).find(x=>x.s.id===selScene);pl.seek(q.start+e.target.value/1000*q.s.duration)})}};
function refreshSceneThumb(p,s){const cv=document.querySelector(`canvas[data-sthumb="${s.id}"]`);if(!cv)return;const q=times(p).find(x=>x.s===s);thumb(cv,p,q.start+s.duration*.62);players.forEach(pl=>pl.dirty=true)}

/* ---------- PAGE: Voice Studio ---------- */
let voiceList=null,voiceSearch='Quentin',elStatus={state:'unknown',msg:''},pendingGen=null,genBusyScene=null,soloPlayer=null;
function payloadOf(r){if(!r)return null;if(r.payload!==undefined&&r.payload!==null)return r.payload;if(r.structuredContent)return r.structuredContent;const t=(r.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('\n');try{return JSON.parse(t)}catch(e){return{text:t}}}
function findKey(o,k,depth=0){if(!o||typeof o!=='object'||depth>6)return null;if(typeof o[k]==='string')return o[k];for(const v of Object.values(o)){const f=findKey(v,k,depth+1);if(f)return f}return null}
async function elCheck(){if(!cap.mcp){elStatus={state:'off',msg:'Your ElevenLabs connector isn’t reachable from this view.'};return}
  try{const r=await cap.mcp.listTools(EL);const s=(r.servers||[]).find(x=>x.server===EL)||r.servers?.[0];if(!s){elStatus={state:'off',msg:'ElevenLabs isn’t connected to your Claude account. Add it under Settings → Connectors on claude.ai.'};return}
    const names=(s.tools||[]).map(t=>t.name);elStatus={state:s.authStatus==='needs_reauth'?'reauth':'on',msg:s.authStatus==='needs_reauth'?'ElevenLabs needs you to sign in again on claude.ai.':'Connected through your claude.ai ElevenLabs connector.',canGen:names.includes('creative_generate_speech'),canList:names.includes('creative_list_voices')}}
  catch(e){elStatus={state:'off',msg:e.code==='not_granted'?'You declined ElevenLabs access for this page. Use the page’s Permissions menu to allow it.':e.code==='server_not_connected'||e.code==='server_not_found'?'ElevenLabs isn’t connected to your Claude account.':'Couldn’t reach ElevenLabs: '+(e.message||e.code)}}}
async function elVoices(){try{const r=await cap.mcp.callTool(EL,'creative_list_voices',{context:'Choose a narrator voice for trading videos in the studio dashboard.',search:voiceSearch||undefined});const pl=payloadOf(r);voiceList=(pl&&pl.voices||[]).map(v=>({id:v.voice_id,name:v.name,desc:v.description||''}));const seen=new Set();voiceList=voiceList.filter(v=>!seen.has(v.id)&&seen.add(v.id))}catch(e){toast('Couldn’t list voices: '+(e.message||e.code))}if(page==='voice')rerender()}
async function elGenerate(p,s,i){genBusyScene=s.id;pendingGen=null;rerender();
  try{const r=await cap.mcp.callTool(EL,'creative_generate_speech',{prompt:s.narration,model_id:'eleven_v4',voice_id:p.voice.id,generations_count:1,context:`Voiceover for scene ${i+1} of the trading video "${p.title}".`},{cache:false});
    const pl=payloadOf(r);if(pl&&pl._file){genBusyScene=null;await attachVoice(p,s,pl._file);toast(`Scene ${i+1}: voiceover added`);if(page==='voice')rerender();return}const url=findKey(pl,'url');s.take={url:url||'',flow:findKey(pl,'flow_id')||'',at:Date.now(),text:s.narration};saveProject(p);toast(`Scene ${i+1}: generation started in ElevenLabs`)}
  catch(e){toast(e.code==='not_granted'?'ElevenLabs access was declined for this page':'ElevenLabs couldn’t generate this take: '+(e.message||e.code))}
  genBusyScene=null;if(page==='voice')rerender()}
async function attachVoice(p,s,file){if(!file)return;if(!/^audio\//.test(file.type)&&!/\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(file.name)){toast('That file isn’t audio');return}
  let b;try{b=await decodeBlob(file)}catch(e){toast('Couldn’t read that audio file');return}
  if(s.voice)IDB.del(s.voice.key);const key='v_'+s.id+'_'+uid();await IDB.put(key,file);voiceBufs.set(key,b);
  s.voice={key,name:file.name,duration:b.duration,source:s.take?'elevenlabs':'upload',voiceName:s.take?p.voice.name:'',trimStart:0,trimEnd:0,vol:1};touch(p);
  const need=VOICE_LEAD+b.duration+.45;toast(need>s.duration+.05?`Voiceover attached. It runs ${b.duration.toFixed(1)} s, longer than the scene.`:`Voiceover attached · ${b.duration.toFixed(1)} s`);if(page==='voice'||page==='scenes')rerender()}
function fitVoice(s){const b=s.voice&&voiceBufs.get(s.voice.key);if(!b)return false;s.duration=Math.max(s.duration,Math.round((VOICE_LEAD+b.duration-(s.voice.trimStart||0)-(s.voice.trimEnd||0)+.45)*10)/10);return true}
PAGES.voice=el=>{const p=needProject(el,'Voice studio');if(!p)return;const T=times(p),D=total(p),ready=p.scenes.filter(s=>s.voice).length;
  el.innerHTML=`${hero('Voice studio','Quentin, scene by scene.','Every scene has its own voiceover track. Generate takes with your ElevenLabs account, attach the audio, trim it, and the scene timing follows the voice so no word is cut off.',`<button class="btn" data-act="fitAll" ${ready?'':'disabled'}>Fit all scenes to their voice</button><button class="btn primary" data-act="playVO" ${ready?'':'disabled'}>Play full voiceover</button>`)}
  <div class="split"><div class="card glow"><div class="cardhead"><h2>ElevenLabs</h2><span class="chip ${elStatus.state==='on'?'st-ReadytoExport':elStatus.state==='unknown'?'':'st-Generating'}"><i></i>${elStatus.state==='on'?'Connected':elStatus.state==='unknown'?'Not checked':'Not available'}</span></div>
    <p class="small ${elStatus.state==='on'?'muted':''}">${esc(elStatus.msg||'Check the connection to load your voices. No API key is stored in this page: calls go through your claude.ai ElevenLabs connector.')}</p>
    <div class="row"><button class="btn sm" data-act="elCheck">Check connection</button>${elStatus.state==='on'&&elStatus.canList!==false?`<input type="search" id="vSearch" value="${esc(voiceSearch)}" placeholder="Search voices" style="max-width:200px"><button class="btn sm" data-act="elVoices">Find voices</button>`:''}</div>
    <label class="field" style="margin-top:14px"><span>Voice for this project</span><select data-act-change="voice">${[{id:p.voice.id,name:p.voice.name},...(voiceList||[]).filter(v=>v.id!==p.voice.id)].map(v=>opt(v.id,v.name,p.voice.id)).join('')}</select></label>
    <p class="small muted" style="margin-top:10px">Stability, similarity and style aren’t exposed by your current ElevenLabs connection. Adjust them in the ElevenLabs take you open, then download that version.</p></div>
  <div class="card"><div class="cardhead"><h2>Audio timeline</h2><div class="row"><button class="btn sm primary" data-act="mixPlay" data-solo="">Play full mix</button><span class="tc" id="mixTc">0:00.0 / ${fmtT(D)}</span></div></div>
    <div class="tracks">
      <div class="track"><div class="tctl"><b>Voiceovers</b><span class="muted">${ready}/${p.scenes.length} scenes</span><label class="small">Volume <input type="range" min="0" max="1.5" step=".05" data-pf="voiceVol" value="${p.voiceVol??1}"></label><button class="btn sm ghost" data-act="mixPlay" data-solo="voice">Solo</button></div><canvas data-track="voice"></canvas></div>
      
      <div class="track"><div class="tctl"><b>Sound effects</b><label class="small row"><input type="checkbox" data-pf="sfx.enabled" ${p.sfx.enabled?'checked':''}> On</label><label class="small">Volume <input type="range" min="0" max="1" step=".05" data-pf="sfx.vol" value="${p.sfx.vol}"></label><button class="btn sm ghost" data-act="mixPlay" data-solo="sfx">Solo</button></div><canvas data-track="sfx"></canvas></div>
    </div>


    <p class="small muted" style="margin-top:8px">Videos are voice-only: no background music is added.</p></div></div>
  <div class="card"><div class="cardhead"><h2>Scene voiceovers</h2><span class="small muted">Voice: ${esc(p.voice.name)}</span></div>
    ${p.scenes.length?T.map(({s,start},i)=>{const b=s.voice&&voiceBufs.get(s.voice.key),need=b?VOICE_LEAD+b.duration-(s.voice.trimStart||0)-(s.voice.trimEnd||0)+.45:0,stale=s.take&&s.take.text!==s.narration;
      return`<div class="vrow"><div class="num">${String(i+1).padStart(2,'0')}</div><div class="grid" style="gap:8px"><div class="small muted mono">${fmtT(start)} · scene ${s.duration.toFixed(1)} s${b?` · voice ${b.duration.toFixed(1)} s`:''}</div><div>${esc(s.narration)||'<span class="muted">No narration yet</span>'}</div>
        ${b?`<canvas class="wave" data-wave="${s.id}"></canvas><div class="formgrid"><label class="field"><span>Trim start (s)</span><input type="number" min="0" step=".05" data-vf="trimStart" data-sid="${s.id}" value="${s.voice.trimStart||0}"></label><label class="field"><span>Trim end (s)</span><input type="number" min="0" step=".05" data-vf="trimEnd" data-sid="${s.id}" value="${s.voice.trimEnd||0}"></label></div>`:''}
        ${b&&need>s.duration+.05?`<div class="warnbox">Voice needs ${need.toFixed(1)} s; the scene is ${s.duration.toFixed(1)} s. <button class="btn sm" data-act="fitOne" data-sid="${s.id}">Extend scene</button></div>`:''}
        ${s.take?`<div class="okbox">Take requested in ElevenLabs${s.take.url?`: <a href="${esc(s.take.url)}" target="_blank" rel="noopener">open it ↗</a>`:''}. Download the audio there, then drop the file on this scene.${stale?' The narration has changed since this take.':''}</div>`:''}</div>
      <div class="grid" style="gap:8px">${b?`<div class="row"><button class="btn sm" data-act="playClip" data-sid="${s.id}">Play</button><button class="btn sm ghost" data-act="rmVoice" data-sid="${s.id}">Remove</button><span class="small muted">${esc(s.voice.name)}</span></div>`:''}
        ${pendingGen===s.id?`<div class="warnbox">This uses your ElevenLabs credits. <div class="row" style="margin-top:6px"><button class="btn sm primary" data-act="elGen" data-sid="${s.id}" data-i="${i}">Generate take</button><button class="btn sm ghost" data-act="cancelGen">Cancel</button></div></div>`:
          `<button class="btn sm ${b?'':'primary'}" data-act="askGen" data-sid="${s.id}" ${elStatus.state==='on'&&elStatus.canGen!==false&&s.narration&&!genBusyScene?'':'disabled'}>${genBusyScene===s.id?'Requesting…':(b?'New take with ':'Generate with ')+esc(p.voice.name.split(/[ –-]/)[0])}</button>`}
        <label class="drop" data-dropvoice="${s.id}">${b?'Replace audio':'Drop audio here or'} <u>choose a file</u><input type="file" accept="audio/*" data-voiceupload="${s.id}" hidden></label></div></div>`}).join(''):'<div class="empty">Write the script first.</div>'}</div>`;
  warm(p).then(()=>{el.querySelectorAll('canvas[data-wave]').forEach(cv=>{const s=p.scenes.find(x=>x.id===cv.dataset.wave);cv.width=cv.clientWidth*2||600;cv.height=92;AUDIO.waveform(cv,voiceBufs.get(s.voice.key),getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),null,s.voice.trimStart,s.voice.trimEnd)});drawTracks(p,0)});
};
function drawTracks(p,t){const D=total(p)||1,T=times(p),acc=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
  document.querySelectorAll('canvas[data-track]').forEach(cv=>{const w=cv.width=Math.max(300,cv.clientWidth*2),h=cv.height=108,c=cv.getContext('2d'),X=x=>x/D*w;c.clearRect(0,0,w,h);
    c.strokeStyle='rgba(255,255,255,.06)';T.forEach(x=>{c.beginPath();c.moveTo(X(x.start),0);c.lineTo(X(x.start),h);c.stroke()});const k=cv.dataset.track;
    if(k==='voice')T.forEach(x=>{const b=x.s.voice&&voiceBufs.get(x.s.voice.key);if(!b){c.fillStyle='rgba(255,255,255,.04)';c.fillRect(X(x.start)+2,20,X(x.s.duration)-4,h-40);return}
      const dur=b.duration-(x.s.voice.trimStart||0)-(x.s.voice.trimEnd||0),x0=X(x.start+VOICE_LEAD),ww=X(dur);c.fillStyle='rgba(101,217,211,.12)';c.fillRect(x0,10,ww,h-20);
      const d=b.getChannelData(0),sr=b.sampleRate,s0=Math.floor((x.s.voice.trimStart||0)*sr),n=Math.floor(dur*sr);c.fillStyle=acc;for(let px=0;px<ww;px+=2){let m=0;const a=s0+Math.floor(px/ww*n),e=s0+Math.floor((px+2)/ww*n);for(let j=a;j<e;j+=8)m=Math.max(m,Math.abs(d[j]||0));const bh=Math.max(1,m*(h-24));c.fillRect(x0+px,(h-bh)/2,1.5,bh)}
      if(dur+VOICE_LEAD>x.s.duration){c.fillStyle='rgba(255,122,122,.5)';c.fillRect(X(x.end)-3,0,6,h)}});
    if(k==='music'&&p.music.enabled){c.fillStyle='rgba(184,171,255,.25)';c.beginPath();c.moveTo(0,h);const v=p.music.vol;for(let px=0;px<=w;px+=4){const tt=px/w*D;let l=v*Math.min(1,tt/Math.max(p.music.fadeIn,.01),(D-tt)/Math.max(p.music.fadeOut,.01));T.forEach(x=>{if(x.s.voice&&voiceBufs.get(x.s.voice.key)){const b=voiceBufs.get(x.s.voice.key);if(tt>x.start&&tt<x.start+VOICE_LEAD+b.duration)l=Math.min(l,v*(p.music.duck??.35))}});c.lineTo(px,h-l*(h-12))}c.lineTo(w,h);c.fill()}
    if(k==='sfx'&&p.sfx.enabled)T.slice(1).forEach(x=>{c.fillStyle='#FFC7AB';c.beginPath();c.arc(X(x.start-.1),h/2,7,0,7);c.fill()});
    c.fillStyle='#fff';c.fillRect(X(t)-1,0,2,h)})}

/* ---------- PAGE: Video Preview (+ captions) ---------- */
let pvFmt=null,pvAudio=true;
PAGES.preview=el=>{const p=getP();if(!p){needProject(el,'Video preview');return}resolve(p);const fmt=pvFmt||p.format,T=times(p),D=total(p),cp=p.captions,lock=p.ref;
  el.innerHTML=`${hero('Video preview',esc(p.title),`${esc(styleName(p.style))} · ${p.scenes.length} scenes · ${fmtT(D)}`,`${segBtns('pvfmt',[['9:16','Shorts 9:16'],['16:9','Landscape 16:9']],fmt)}<button class="btn primary" data-act="go" data-to="export">Export</button>`)}
  <div class="split"><div class="card"><div class="screen ${fmt==='16:9'?'land':'portrait'}" id="pvScreen"><canvas id="pv"></canvas></div>
    <div class="transport" style="margin-top:14px"><button class="btn primary sm" data-act="pvPlay">Play</button><button class="btn sm" data-act="pvRestart">Restart</button><button class="btn sm ghost" data-act="pvStep" data-d="-1">◀ Scene</button><button class="btn sm ghost" data-act="pvStep" data-d="1">Scene ▶</button>
      <input type="range" id="pvScrub" min="0" max="${Math.round(D*100)}" value="0" aria-label="Timeline"><span class="tc" id="pvTc">0:00.0 / ${fmtT(D)}</span></div>
    <div class="row" style="margin-top:10px"><label class="small row"><input type="checkbox" data-act-change="pvCaps" ${cp.enabled?'checked':''} ${lock?'disabled':''}> Captions</label><label class="small row"><input type="checkbox" data-act-change="pvAudio" ${pvAudio?'checked':''}> Sound</label><span class="spacer"></span><button class="btn sm ghost" data-act="pvFull">Fullscreen</button><button class="btn sm ghost" data-act="pvRefresh">Refresh</button></div>
    <div class="row" style="margin-top:12px;gap:6px">${T.map((x,i)=>`<button class="btn sm ghost" data-act="pvJump" data-t="${x.start}" title="${esc(x.s.headline)}">${String(i+1).padStart(2,'0')}</button>`).join('')}</div>
    ${!lock?`<p class="small muted" style="margin-top:10px">To replace a scene, open it in the Scene Editor; the preview updates as soon as you come back.</p>`:''}</div>
  <div class="card"><div class="cardhead"><h2>Captions</h2>${lock?'<span class="small muted">Locked on reference films</span>':''}</div>
    <fieldset ${lock?'disabled':''} style="border:0;padding:0;margin:0;display:grid;gap:14px"><div class="formgrid">
      <label class="field"><span>Size</span><input type="range" min="36" max="96" data-cap="size" value="${cp.size}"></label>
      <label class="field"><span>Words per caption</span><input type="number" min="1" max="8" data-cap="words" value="${cp.words}"></label>
      <label class="field"><span>Position</span><select data-cap="pos">${opt('lower','Lower third',cp.pos)}${opt('center','Centre',cp.pos)}${opt('upper','Upper',cp.pos)}</select></label>
      <label class="field"><span>Animation</span><select data-cap="anim">${opt('pop','Pop in',cp.anim)}${opt('fade','Fade',cp.anim)}${opt('karaoke','Word by word',cp.anim)}${opt('none','None',cp.anim)}</select></label>
      <label class="field"><span>Highlight words</span><input type="text" data-cap="hi" value="${esc(cp.hi)}" placeholder="discipline, patience"></label>
      <label class="field"><span>Highlight colour</span><div class="row"><input type="color" data-cap="hiColor" value="${cp.hiColor||STY[p.style].caption.hi}"><button class="btn sm ghost" data-act="capHiReset">Style default</button></div></label></div>
      <p class="small muted">Captions follow each scene’s voiceover, word by word. Wrap a word in *asterisks* in the caption text to highlight just that instance. Timing shifts move a scene’s captions earlier or later.</p>
      <div class="tablewrap"><table><thead><tr><th>#</th><th>Caption text</th><th>Shift (s)</th></tr></thead><tbody>${T.map(({s},i)=>`<tr><td class="mono">${i+1}</td><td><textarea rows="2" data-capsf="captionText" data-sid="${s.id}" placeholder="${esc(s.narration)}">${esc(s.captionText??'')}</textarea></td><td style="width:90px"><input type="number" step=".1" data-capsf="captionOffset" data-sid="${s.id}" value="${s.captionOffset||0}"></td></tr>`).join('')}</tbody></table></div></fieldset></div></div>`;
  warm(p).then(()=>players.forEach(x=>x.dirty=true));
  const cv=el.querySelector('#pv'),sc=el.querySelector('#pvScrub'),tc=el.querySelector('#pvTc'),pb=el.querySelector('[data-act="pvPlay"]');
  const pl=new Player(cv,{get:()=>p,fmt:()=>pvFmt||p.format,loop:false,audio:pvAudio,start:Math.min(D*.2,4),onTime:t=>{sc.value=Math.round(t*100);tc.textContent=fmtT(t)+' / '+fmtT(total(p))},onState:on=>pb.textContent=on?'Pause':'Play'});el._pl=pl;
  sc.addEventListener('input',()=>pl.seek(sc.value/100))};

/* ---------- PAGE: Export Center ---------- */
let expState={fmts:'9:16',busy:false,prog:0,msg:'',err:'',ask:null,results:[],abort:null},codecInfo=null;
async function checkCodecs(){if(codecInfo)return codecInfo;const info={webcodecs:typeof VideoEncoder!=='undefined',avc:false,aac:false,opus:false,mb:false,err:''};
  try{const MB=await loadMB();info.mb=true;info.avc=await MB.canEncodeVideo('avc',{width:1080,height:1920});info.aac=await MB.canEncodeAudio('aac');info.opus=await MB.canEncodeAudio('opus')}catch(e){info.err=String(e.message||e)}codecInfo=info;return info}
let MBmod=null;async function loadMB(){if(!MBmod)MBmod=await import('https://cdn.jsdelivr.net/npm/mediabunny@1.62.1/dist/bundles/mediabunny.min.mjs');return MBmod}
async function encode(p,fmt,o,onProg,signal){const MB=await loadMB();const [W,H]=dims(fmt),s=o.res==='720'?720/1080:1,w=Math.round(W*s/2)*2,h=Math.round(H*s/2)*2;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d',{alpha:false});resolve(p);await warm(p);
  const D=total(p),fps=+o.fps,N=Math.round(D*fps),Q={medium:MB.QUALITY_MEDIUM,high:MB.QUALITY_HIGH,veryhigh:MB.QUALITY_VERY_HIGH}[o.quality]||MB.QUALITY_HIGH;
  if(!(await MB.canEncodeVideo('avc',{width:w,height:h})))throw new Error('This browser can’t encode H.264 video at '+w+'×'+h+'.');
  const out=new MB.Output({format:new MB.Mp4OutputFormat({fastStart:'in-memory'}),target:new MB.BufferTarget()});
  const vs=new MB.CanvasSource(cv,{codec:'avc',quality:Q,keyFrameInterval:2});out.addVideoTrack(vs,{frameRate:fps});
  const wantAudio=p.scenes.some(x=>x.voice)||p.sfx.enabled;let as=null,acodec=null;
  if(wantAudio){acodec=(await MB.canEncodeAudio('aac'))?'aac':(await MB.canEncodeAudio('opus'))?'opus':null;if(acodec){as=new MB.AudioBufferSource({codec:acodec,bitrate:(+o.audioKbps||192)*1000});out.addAudioTrack(as)}}
  await out.start();exporting=true;
  try{if(as){onProg(0,'Mixing audio');const ab=await AUDIO.renderOffline(mixOpts(p,0,0,null));await as.add(ab);as.close()}
    const T=times(p);
    for(let i=0;i<N;i++){if(signal.aborted)throw new Error('cancelled');const t=i/fps;
      const cur=T.find(x=>t<x.end)||T[T.length-1];const m=cur.s.media&&mediaEls.get(cur.s.media.key);
      if(m&&m.type==='video'&&m.el.duration){const want=((t-cur.start))%m.el.duration;if(Math.abs(m.el.currentTime-want)>.001){await new Promise(r=>{m.el.onseeked=r;m.el.currentTime=want;setTimeout(r,800)})}}
      renderFrame(ctx,p,t,fmt,{});await vs.add(t,1/fps);if(i%6===0){onProg(i/N,`Frame ${i+1} of ${N}`);await new Promise(r=>setTimeout(r,0))}}
    vs.close();onProg(1,'Finalising MP4');await out.finalize()}finally{exporting=false}
  return{buffer:out.target.buffer,w,h,acodec,fps,D}}
async function verify(blob){return new Promise(res=>{const v=document.createElement('video');v.preload='metadata';v.muted=true;const u=URL.createObjectURL(blob);v.src=u;
  const done=ok=>{res(ok?{ok:true,w:v.videoWidth,h:v.videoHeight,d:v.duration}:{ok:false});};v.onloadedmetadata=()=>done(true);v.onerror=()=>done(false);setTimeout(()=>done(false),6000)})}
async function saveFile(name,blob){if(!cap.downloads)return{ok:false,msg:'Saving files isn’t available in this view. Use the player below to check the video; open this studio on claude.ai to download it.'};
  try{const r=await cap.downloads.save({filename:name,data:blob});return{ok:true,msg:r.status==='delivered'?'Sent to your downloads.':'Saved.'}}catch(e){return{ok:false,msg:e.code==='declined'?'You cancelled the save.':e.code==='too_large'?'The file is too large to save from here. Try 720p.':'Couldn’t save: '+(e.message||e.code)}}}
async function runExport(p,fmts,o,base){expState={...expState,busy:true,prog:0,msg:'Loading encoder',err:'',ask:null};const ac0=new AbortController();expState.abort=ac0;rerender();
  for(const fmt of fmts){const name=`${base}-${fmt==='9:16'?'shorts':'landscape'}.mp4`;
    try{const r=await encode(p,fmt,o,(f,m)=>{expState.prog=f;expState.msg=`${fmt==='9:16'?'Shorts':'Landscape'} · ${m}`;const b=document.getElementById('expBar'),t=document.getElementById('expMsg');if(b)b.style.width=(f*100).toFixed(1)+'%';if(t)t.textContent=expState.msg},ac0.signal);
      const blob=new Blob([r.buffer],{type:'video/mp4'}),vf=await verify(blob),url=URL.createObjectURL(blob);
      const rec={name,fmt,size:blob.size,w:r.w,h:r.h,fps:r.fps,acodec:r.acodec,d:r.D,verified:vf.ok,at:Date.now()};expState.results.unshift({...rec,url,blob});
      const sv=await saveFile(name,blob);rec.saved=sv.ok;rec.saveMsg=sv.msg;expState.results[0].saveMsg=sv.msg;expState.results[0].saved=sv.ok;
      if(!p.ref){p.exports=[rec,...(p.exports||[]).filter(x=>x.name!==name)].slice(0,30);p.status='Exported';saveProject(p)}}
    catch(e){expState.err=e.message==='cancelled'?'Export cancelled.':'Export failed: '+(e.message||e);break}}
  expState.busy=false;expState.abort=null;if(page==='export')rerender()}
PAGES.export=el=>{const p=getP();if(!p){needProject(el,'Export center');return}const o=state.settings.export,D=total(p),base=expState.base??slug(p.title);
  el.innerHTML=`${hero('Export center','Real MP4 files, both formats.','Each format is composed for its own frame, not stretched: Landscape moves the headline to the left and the illustration to the right, with captions kept in the safe area.')}
  <div class="split"><div class="card glow"><div class="cardhead"><h2>${esc(p.title)}</h2>${chip(p.status)}</div>
    <div class="formgrid"><div class="field full"><span>Export</span>${segBtns('expf',[['9:16','Shorts 9:16'],['16:9','Landscape 16:9'],['both','Both']],expState.fmts)}</div>
      <label class="field"><span>Resolution</span><select data-set="export.res">${opt('1080','Full HD (1080 × 1920 / 1920 × 1080)',o.res)}${opt('720','HD (720 × 1280 / 1280 × 720)',o.res)}</select></label>
      <label class="field"><span>Frame rate</span><select data-set="export.fps">${[24,30,60].map(f=>opt(f,f+' fps',o.fps)).join('')}</select></label>
      <label class="field"><span>Video quality</span><select data-set="export.quality">${opt('medium','Medium (smaller file)',o.quality)}${opt('high','High',o.quality)}${opt('veryhigh','Very high',o.quality)}</select></label>
      <label class="field"><span>Audio quality</span><select data-set="export.audioKbps">${[128,192,256].map(k=>opt(k,k+' kbps',o.audioKbps)).join('')}</select></label>
      <label class="field full"><span>File name</span><input type="text" id="expName" value="${esc(base)}"></label></div>
    <p class="small muted" style="margin-top:8px">Files are named <span class="mono">${esc(base)}-shorts.mp4</span> and <span class="mono">${esc(base)}-landscape.mp4</span>. Length ${fmtT(D)}.</p>
    ${expState.ask?`<div class="warnbox" style="margin-top:12px">${esc(expState.ask.names.join(' and '))} ${expState.ask.names.length>1?'were':'was'} exported before. <div class="row" style="margin-top:8px"><button class="btn sm primary" data-act="expGo" data-mode="rename">Save as new copy</button><button class="btn sm" data-act="expGo" data-mode="replace">Replace</button><button class="btn sm ghost" data-act="expCancelAsk">Cancel</button></div></div>`:''}
    <div class="row" style="margin-top:16px">${expState.busy?`<button class="btn danger" data-act="expAbort">Cancel export</button>`:`<button class="btn primary" data-act="expStart" ${p.scenes.length?'':'disabled'}>Export ${expState.fmts==='both'?'both formats':expState.fmts==='9:16'?'Shorts':'Landscape'}</button>`}</div>
    ${expState.busy||expState.prog>0?`<div style="margin-top:14px"><div class="progress"><i id="expBar" style="width:${(expState.prog*100).toFixed(1)}%"></i></div><div class="small muted" id="expMsg" style="margin-top:6px">${esc(expState.msg)}</div></div>`:''}
    ${expState.err?`<div class="errbox" style="margin-top:12px">${esc(expState.err)}</div>`:''}
    <div id="codecs" class="small muted" style="margin-top:14px">Checking this browser’s encoders…</div></div>
  <div class="card"><div class="cardhead"><h2>This session’s exports</h2></div>${expState.results.length?expState.results.map((r,i)=>`<div style="padding:12px 0;border-top:${i?'1px solid var(--line)':'0'}"><div class="row"><b class="mono small">${esc(r.name)}</b><span class="spacer"></span><span class="small muted">${(r.size/1048576).toFixed(1)} MB</span></div>
      <div class="small ${r.verified?'muted':''}" style="margin:4px 0 8px">${r.verified?`Checked: plays as MP4, ${r.w}×${r.h}, ${r.fps} fps, ${fmtT(r.d)}, audio ${r.acodec?r.acodec.toUpperCase():'none'}.`:'The browser couldn’t open this file for checking.'} ${esc(r.saveMsg||'')}</div>
      ${i===0?`<video src="${r.url}" controls playsinline style="width:100%;max-height:420px;border-radius:12px;background:#000"></video>`:''}<div class="row" style="margin-top:8px"><button class="btn sm" data-act="expResave" data-i="${i}">Save again</button></div></div>`).join(''):'<div class="empty">Nothing exported in this session yet.</div>'}
    ${(p.exports||[]).length?`<h3 style="margin-top:18px">Export history</h3><div class="tablewrap"><table><thead><tr><th>File</th><th>Size</th><th>When</th></tr></thead><tbody>${p.exports.map(x=>`<tr><td class="mono small">${esc(x.name)}</td><td>${(x.size/1048576).toFixed(1)} MB</td><td class="small">${new Date(x.at).toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`:''}</div></div>`;
  el.querySelector('#expName').addEventListener('input',e=>{expState.base=slug(e.target.value)});
  checkCodecs().then(i=>{const b=document.getElementById('codecs');if(!b)return;b.innerHTML=!i.webcodecs?'<span style="color:var(--bad)">This browser has no WebCodecs encoder, so MP4 export won’t work here. Use a current Chrome or Edge.</span>':
    `Encoder: H.264 video ${i.avc?'✓':'✗ unavailable'} · audio ${i.aac?'AAC ✓':i.opus?'Opus (AAC unavailable on this system)':'✗ unavailable'}${i.err?' · '+esc(i.err):''} · Saving files ${cap.downloads?'✓':'unavailable in this view'}`})};

/* ---------- PAGE: Settings ---------- */
const ACCENTS=['#65D9D3','#59A8FF','#B98CFF','#FF5FA2','#A6F35B','#FFC65C'];
PAGES.prefs=el=>{const S=state.settings;
  el.innerHTML=`${hero('Settings','Studio defaults and connections.','')}
  <div class="grid g2"><div class="card glow"><h2>Connections</h2>
    <div style="display:grid;gap:12px;margin-top:14px"><div class="row"><b>ElevenLabs</b>${chip(elStatus.state==='on'?'Ready to Export':'Draft').replace(/Ready to Export|Draft/,elStatus.state==='on'?'Connected':'Not checked')}<span class="spacer"></span><button class="btn sm" data-act="elCheck">Check</button></div>
      <p class="small muted">${esc(elStatus.msg||'Runs through your claude.ai ElevenLabs connector. Your API key never enters this page or the browser.')}</p>
      <div class="row"><b>Claude scripts</b><span class="chip ${cap.sample?'st-ReadytoExport':''}"><i></i>${cap.sample?'Available':cap.ready?'Unavailable here':'Connecting'}</span></div>
      <div class="row"><b>Project sync</b><span class="chip ${cap.db&&cap.uid?'st-ReadytoExport':''}"><i></i>${cap.db&&cap.uid?'Saved to your account':'This browser only'}</span></div>
      <div class="row"><b>File saving</b><span class="chip ${cap.downloads?'st-ReadytoExport':''}"><i></i>${cap.downloads?'Available':'Unavailable here'}</span></div>
      <div class="row"><button class="btn sm ghost" data-act="perms">Manage page permissions</button></div></div></div>
  <div class="card"><h2>Look</h2><div style="display:grid;gap:14px;margin-top:14px"><div class="field"><span>Neon accent</span><div class="row">${ACCENTS.map(a=>`<button type="button" class="btn sm" data-act="accent" data-v="${a}" style="width:34px;height:34px;padding:0;background:${a};border-color:${a===S.accent?'#fff':'transparent'}" aria-label="Accent ${a}"></button>`).join('')}<input type="color" data-set="accent" value="${S.accent}"></div></div>
    <label class="field"><span>Style 01 name</span><input type="text" data-stylename="glass" value="${esc(styleName('glass'))}"></label><label class="field"><span>Style 02 name</span><input type="text" data-stylename="vector" value="${esc(styleName('vector'))}"></label></div></div>
  <div class="card"><h2>New video defaults</h2><div class="formgrid" style="margin-top:14px">
    <label class="field"><span>Style</span><select data-set="defaultStyle">${['glass','vector'].map(s=>opt(s,styleName(s),S.defaultStyle)).join('')}</select></label>
    <label class="field"><span>Format</span><select data-set="defaultFormat">${opt('9:16','Shorts 9:16',S.defaultFormat)}${opt('16:9','Landscape 16:9',S.defaultFormat)}</select></label>
    <label class="field"><span>Length (s)</span><input type="number" min="15" max="180" data-set="defaultDuration" value="${S.defaultDuration}"></label>
    <label class="field"><span>Voice</span><input type="text" value="${esc(S.voice.name)}" disabled></label>
    <label class="field"><span>Caption size</span><input type="range" min="36" max="96" data-set="captions.size" value="${S.captions.size}"></label>
    <label class="field"><span>Caption position</span><select data-set="captions.pos">${opt('lower','Lower third',S.captions.pos)}${opt('center','Centre',S.captions.pos)}${opt('upper','Upper',S.captions.pos)}</select></label>
    <label class="field"><span>Caption animation</span><select data-set="captions.anim">${opt('pop','Pop in',S.captions.anim)}${opt('fade','Fade',S.captions.anim)}${opt('karaoke','Word by word',S.captions.anim)}${opt('none','None',S.captions.anim)}</select></label>
    <label class="field"><span>Captions on new videos</span><select data-set="captions.enabled">${opt('true','On',S.captions.enabled)}${opt('false','Off',S.captions.enabled)}</select></label></div></div>
  <div class="card"><h2>Audio, motion and export</h2><div class="formgrid" style="margin-top:14px">

    <label class="field"><span>Sound effects on new videos</span><select data-set="audio.sfx">${opt('false','Off',S.audio.sfx)}${opt('true','On',S.audio.sfx)}</select></label>
    <label class="field"><span>Motion intensity</span><input type="range" min="0" max="1.6" step=".1" data-set="anim.motion" value="${S.anim.motion}"></label>
    <label class="field"><span>Transition length (s)</span><input type="number" min=".2" max="1.5" step=".1" data-set="anim.trans" value="${S.anim.trans}"></label>
    <label class="field"><span>Export resolution</span><select data-set="export.res">${opt('1080','Full HD',S.export.res)}${opt('720','HD 720p',S.export.res)}</select></label>
    <label class="field"><span>Export frame rate</span><select data-set="export.fps">${[24,30,60].map(f=>opt(f,f+' fps',S.export.fps)).join('')}</select></label></div>
    <div class="row" style="margin-top:14px"><button class="btn sm ghost" data-act="resetSet">Reset all settings</button></div></div></div>`};

/* ---------- events ---------- */
function setPath(o,path,v){const ks=path.split('.');let x=o;for(let i=0;i<ks.length-1;i++)x=x[ks[i]];x[ks[ks.length-1]]=v}
function getPath(o,path){return path.split('.').reduce((a,k)=>a&&a[k],o)}
function coerce(el,old){if(el.type==='checkbox')return el.checked;if(el.type==='number'||el.type==='range'){const n=parseFloat(el.value);return isNaN(n)?old:n}if(el.tagName==='SELECT'&&(el.value==='true'||el.value==='false'))return el.value==='true';if(el.tagName==='SELECT'&&typeof old==='number')return +el.value;return el.value}
let typingT=null;
document.addEventListener('input',e=>{const el=e.target,p=getP();
  if(el.dataset.pf&&p&&!p.ref){const old=getPath(p,el.dataset.pf);setPath(p,el.dataset.pf,coerce(el,old));if(el.dataset.pf==='format'){resolve(p)}touch(p);if(page==='voice')drawTracks(p,0);if(el.dataset.pf==='title')syncNav();return}
  if(el.dataset.sf&&p&&!p.ref){const s=p.scenes.find(x=>x.id===el.dataset.sid);if(!s)return;const f=el.dataset.sf;let v=coerce(el,s[f]);
    if(f==='labels'){v=String(el.value).split(',').map(x=>x.trim()).filter(Boolean).slice(0,5);s.labelsAuto=false}if(f==='duration')v=Math.max(1.5,Math.min(60,+v||s.duration));
    s[f]=v;resolve(p);touch(p);clearTimeout(typingT);typingT=setTimeout(()=>refreshSceneThumb(p,s),250);return}
  if(el.dataset.vf&&p&&!p.ref){const s=p.scenes.find(x=>x.id===el.dataset.sid);if(!s||!s.voice)return;s.voice[el.dataset.vf]=Math.max(0,+el.value||0);touch(p);const cv=document.querySelector(`canvas[data-wave="${s.id}"]`);if(cv)AUDIO.waveform(cv,voiceBufs.get(s.voice.key),getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),null,s.voice.trimStart,s.voice.trimEnd);drawTracks(p,0);return}
  if(el.dataset.cap&&p&&!p.ref){p.captions[el.dataset.cap]=coerce(el,p.captions[el.dataset.cap]);touch(p);players.forEach(x=>x.dirty=true);return}
  if(el.dataset.capsf&&p&&!p.ref){const s=p.scenes.find(x=>x.id===el.dataset.sid);if(!s)return;if(el.dataset.capsf==='captionText')s.captionText=el.value.trim()?el.value:null;else s.captionOffset=+el.value||0;touch(p);players.forEach(x=>x.dirty=true);return}
  if(el.dataset.set){const old=getPath(state.settings,el.dataset.set);setPath(state.settings,el.dataset.set,coerce(el,old));if(el.dataset.set==='accent')applyAccent();saveSettings();players.forEach(x=>x.dirty=true);return}
  if(el.dataset.stylename){state.settings.styleNames[el.dataset.stylename]=el.value||(el.dataset.stylename==='glass'?'Style 01':'Style 02');saveSettings();return}
  if(el.id==='ownText'){ownText=el.value}
  if(el.id==='vSearch'){voiceSearch=el.value}});
document.addEventListener('change',async e=>{const el=e.target,p=getP(),ac0=el.dataset.actChange;
  if(el.dataset.sf==='motif'||el.dataset.sf==='transition'||el.dataset.sf==='duration'){rerender();return}
  if(ac0==='style'&&p&&!p.ref){if(p.scenes.some(s=>s.kind==='ref')){toast('This project uses reference scenes, so its style is fixed');el.value=p.style;return}p.style=el.value;p.scenes.forEach(s=>{if(!STY[p.style].motifs.includes(s.motif))s.motif='auto';if(['lens','wipe'].includes(s.transition))s.transition=p.style==='glass'?'lens':'wipe'});resolve(p);touch(p);toast('Whole video switched to '+styleName(p.style));return}
  if(ac0==='voice'&&p&&!p.ref){const v=(voiceList||[]).find(x=>x.id===el.value);if(v)p.voice={id:v.id,name:v.name};touch(p);rerender();return}
  if(ac0==='pvCaps'&&p&&!p.ref){p.captions.enabled=el.checked;touch(p);players.forEach(x=>x.dirty=true);return}
  if(ac0==='pvAudio'){pvAudio=el.checked;players.forEach(x=>{x.audio=pvAudio;if(!pvAudio)x.stopAudio();else if(x.playing){x.stopAudio();x.startAudio()}});return}
  if(el.dataset.voiceupload&&p){const s=p.scenes.find(x=>x.id===el.dataset.voiceupload);await attachVoice(p,s,el.files[0]);return}
  if(el.dataset.sceneupload&&p){const s=p.scenes.find(x=>x.id===el.dataset.sceneupload),f=el.files[0];if(!f)return;if(f.size>200*1048576){toast('That file is over 200 MB');return}
    if(s.media)IDB.del(s.media.key);const key='m_'+s.id+'_'+uid();await IDB.put(key,f);s.media={key,type:f.type||'image/png',name:f.name.slice(0,40)};await loadMedia(s.media);resolve(p);touch(p);rerender();return}
  if(el.dataset.refupload){const f=el.files[0];if(!f)return;await IDB.put('refvid_'+el.dataset.refupload,f);toast('Original recording attached');rerender();return}});
['dragover','dragleave','drop'].forEach(ev=>document.addEventListener(ev,async e=>{const z=e.target.closest&&e.target.closest('[data-dropvoice]');if(!z)return;e.preventDefault();z.classList.toggle('over',ev==='dragover');
  if(ev==='drop'){const p=getP(),s=p.scenes.find(x=>x.id===z.dataset.dropvoice);const f=e.dataTransfer.files[0];if(f)await attachVoice(p,s,f)}}));
document.addEventListener('click',async e=>{const b=e.target.closest('[data-act],[data-seg]');if(!b)return;const p=getP();
  if(b.dataset.seg){const v=b.dataset.v,n=b.dataset.seg;if(n==='lib')libFilter=v;if(n==='smode')scriptMode=v;if(n==='pvfmt')pvFmt=v;if(n==='expf')expState.fmts=v;rerender();return}
  const A=b.dataset.act,s=p&&p.scenes?p.scenes.find(x=>x.id===(b.dataset.sid||selScene)):null;
  switch(A){
  case'go':go(b.dataset.to);break;
  case'toggleNew':newForm=!newForm;rerender();if(newForm)setTimeout(()=>$('#nfTitle')?.focus(),50);break;
  case'newProj':newForm=true;go('home');break;
  case'createProj':{const np=newProject({title:$('#nfTitle').value.trim()||'Untitled video',style:$('#nfStyle').value,format:$('#nfFmt').value,target:+$('#nfDur').value||45});state.projects.unshift(np);state.cur=np.id;newForm=false;saveProject(np);syncNav();scriptMode='generate';go('script');break}
  case'newWithStyle':{const np=newProject({style:b.dataset.id});state.projects.unshift(np);state.cur=np.id;saveProject(np);go('script');break}
  case'open':state.cur=b.dataset.id;lsWrite();syncNav();go(b.dataset.to||'scenes');break;
  case'dupRef':case'dupProj':{const src=getP(b.dataset.id||state.cur);const cp=JSON.parse(JSON.stringify(clean(src)));cp.id=uid();cp.ref=false;cp.createdAt=Date.now();cp.title=src.ref?src.title+' (copy)':src.title+' copy';cp.status=cp.scenes.length?'Editing':'Draft';cp.exports=[];
    cp.scenes.forEach(x=>{x.id=uid();x.voice=null;x.media=null;x.take=null});state.projects.unshift(cp);state.cur=cp.id;saveProject(cp);syncNav();toast('Copy created. Voiceovers and media start empty.');if(page==='home')rerender();else go('scenes');break}
  case'askDel':confirmDel=b.dataset.id;rerender();break;case'cancelDel':confirmDel=null;rerender();break;
  case'delProj':{const x=getP(b.dataset.id);state.projects=state.projects.filter(q=>q.id!==x.id);x.scenes.forEach(q=>{if(q.voice)IDB.del(q.voice.key);if(q.media)IDB.del(q.media.key)});await deleteStored(x);if(state.cur===x.id)state.cur=REFS.glass.id;confirmDel=null;syncNav();rerender();toast('Project deleted');break}
  case'stylePlay':{const cv=document.querySelector(`[data-styleplay="${b.dataset.id}"]`);cv._pl.toggle();b.textContent=cv._pl.playing?'Pause':'Play';break}
  case'setDefStyle':state.settings.defaultStyle=b.dataset.id;saveSettings();rerender();break;
  case'genScript':if(p&&!p.ref)genScript(p);break;
  case'regenScene':if(p&&!p.ref)regenScene(p,+b.dataset.i);break;
  case'splitOwn':{const t=$('#ownText').value;if(!t.trim()){toast('Write the script first');break}splitOwn(p,t);toast(`Split into ${p.scenes.length} scenes`);rerender();break}
  case'editScene':selScene=b.dataset.sid;go('scenes');break;
  case'selScene':selScene=b.dataset.sid;confirmSceneDel=null;rerender();break;
  case'addScene':{if(!p||p.ref)break;const i=s?p.scenes.indexOf(s)+1:p.scenes.length;const ns=newScene(p,{narration:'',headline:'New scene'});ns.duration=5;p.scenes.splice(i,0,ns);selScene=ns.id;resolve(p);touch(p);rerender();break}
  case'dupScene':{const i=p.scenes.indexOf(s),c=JSON.parse(JSON.stringify(clean(s)));c.id=uid();c.seed=rseed();c.voice=null;c.take=null;c.media=null;p.scenes.splice(i+1,0,c);selScene=c.id;resolve(p);touch(p);toast('Scene duplicated with a fresh visual');rerender();break}
  case'askSceneDel':confirmSceneDel=s.id;rerender();break;case'cancelSceneDel':confirmSceneDel=null;rerender();break;
  case'delScene':{const i=p.scenes.indexOf(s);if(s.voice)IDB.del(s.voice.key);if(s.media)IDB.del(s.media.key);p.scenes.splice(i,1);selScene=p.scenes[Math.max(0,i-1)]?.id;confirmSceneDel=null;resolve(p);touch(p);rerender();break}
  case'moveScene':{const i=p.scenes.indexOf(s),j=i+(+b.dataset.d);if(j<0||j>=p.scenes.length)break;[p.scenes[i],p.scenes[j]]=[p.scenes[j],p.scenes[i]];resolve(p);touch(p);rerender();break}
  case'newVisual':{s.seed=rseed();resolve(p);touch(p);rerender();toast('New visual for this scene');break}
  case'newAnim':{const opts=CAMS.filter(c=>c!==s.camera);s.camera=opts[rseed()%opts.length];const tr=Object.keys(TRANS).filter(t=>t!=='cut'&&t!==s.transition);s.transition=tr[rseed()%tr.length];touch(p);rerender();toast(`Camera: ${s.camera} · transition: ${TRANS[s.transition]}`);break}
  case'rmMedia':{IDB.del(s.media.key);s.media=null;resolve(p);touch(p);rerender();break}
  case'scPlay':{const el=app.querySelector('.page');el._pl&&el._pl.toggle();break}
  case'fitVoice':case'fitOne':{if(fitVoice(s)){touch(p);rerender();toast('Scene extended to fit the voice')}break}
  case'fitAll':{let n=0;p.scenes.forEach(x=>{const d=x.duration;if(fitVoice(x)&&x.duration!==d)n++});touch(p);rerender();toast(n?`${n} scene${n>1?'s':''} extended`:'Every scene already fits its voice');break}
  case'elCheck':b.disabled=true;await elCheck();rerender();break;
  case'elVoices':await elVoices();break;
  case'askGen':pendingGen=b.dataset.sid;rerender();break;case'cancelGen':pendingGen=null;rerender();break;
  case'elGen':await elGenerate(p,s,+b.dataset.i);break;
  case'rmVoice':IDB.del(s.voice.key);s.voice=null;touch(p);rerender();break;
  case'playClip':{const buf0=voiceBufs.get(s.voice.key);if(!buf0)break;const c=ac(),src=c.createBufferSource(),g=c.createGain();g.gain.value=(s.voice.vol??1)*(p.voiceVol??1);src.buffer=buf0;src.connect(g);g.connect(c.destination);src.start(0,s.voice.trimStart||0,Math.max(.1,buf0.duration-(s.voice.trimStart||0)-(s.voice.trimEnd||0)));break}
  case'playVO':case'mixPlay':{const solo=A==='playVO'?'voice':b.dataset.solo||null;if(soloPlayer&&soloPlayer.playing){soloPlayer.pause();soloPlayer=null;document.querySelectorAll('[data-act="mixPlay"],[data-act="playVO"]').forEach(x=>x.classList.remove('primary'));break}
    await warm(p);const cv=document.createElement('canvas');cv.style.display='none';app.appendChild(cv);soloPlayer=new Player(cv,{get:()=>p,fmt:()=>p.format,noVisual:true,loop:false,audio:true,solo:()=>solo,onTime:t=>{const tc=document.getElementById('mixTc');if(tc)tc.textContent=fmtT(t)+' / '+fmtT(total(p));drawTracks(p,t)},onState:on=>{if(!on)b.textContent=b.dataset.solo?'Solo':A==='playVO'?'Play full voiceover':'Play full mix'}});soloPlayer.play();b.textContent='Stop';break}
  case'pvPlay':app.querySelector('.page')._pl.toggle();break;
  case'pvRestart':{const pl=app.querySelector('.page')._pl;pl.seek(0);pl.play();break}
  case'pvStep':{const pl=app.querySelector('.page')._pl,T=times(p);let i=T.findIndex(x=>pl.t<x.end);i=K.clamp(i+(+b.dataset.d),0,T.length-1);pl.seek(T[i].start+.001);break}
  case'pvJump':app.querySelector('.page')._pl.seek(+b.dataset.t+.001);break;
  case'pvFull':{const sc=$('#pvScreen');try{await sc.requestFullscreen()}catch(err){toast('Fullscreen isn’t available here')}break}
  case'pvRefresh':{resolve(p);await warm(p);players.forEach(x=>x.dirty=true);toast('Preview refreshed');break}
  case'capHiReset':p.captions.hiColor='';touch(p);rerender();break;
  case'expStart':{const fm=expState.fmts==='both'?['9:16','16:9']:[expState.fmts],base=expState.base??slug(p.title),names=fm.map(f=>`${base}-${f==='9:16'?'shorts':'landscape'}.mp4`);
    const taken=names.filter(n=>(p.exports||[]).some(x=>x.name===n)||expState.results.some(x=>x.name===n));if(taken.length){expState.ask={names:taken,fm,base};rerender();break}runExport(p,fm,state.settings.export,base);break}
  case'expGo':{const a=expState.ask;expState.ask=null;let base=a.base;if(b.dataset.mode==='rename'){let k=2;const used=n=>(p.exports||[]).some(x=>x.name===n)||expState.results.some(x=>x.name===n);while(a.fm.some(f=>used(`${a.base}-${k}-${f==='9:16'?'shorts':'landscape'}.mp4`)))k++;base=`${a.base}-${k}`}runExport(p,a.fm,state.settings.export,base);break}
  case'expCancelAsk':expState.ask=null;rerender();break;
  case'expAbort':expState.abort&&expState.abort.abort();break;
  case'expResave':{const r=expState.results[+b.dataset.i];const sv=await saveFile(r.name,r.blob);r.saveMsg=sv.msg;rerender();break}
  case'accent':state.settings.accent=b.dataset.v;applyAccent();saveSettings();rerender();break;
  case'perms':{try{const pm=await window.claude.use('permissions');if(pm&&pm.manage)await pm.manage();else toast('Open the page’s Permissions menu to manage access')}catch(err){toast('Open the page’s Permissions menu to manage access')}break}
  case'resetSet':state.settings=structuredClone(DEF_SET);applyAccent();saveSettings();buildRefs();rerender();toast('Settings reset');break}
});

/* ---------- boot ---------- */
(async()=>{loadLocal();buildRefs();applyAccent();if(!state.cur)state.cur=state.projects[0]?.id||REFS.glass.id;
  const fonts=[...STY.glass.fonts,...STY.vector.fonts,'800 40px "Unbounded"'];await Promise.race([Promise.all(fonts.map(f=>document.fonts.load(f))),new Promise(r=>setTimeout(r,2500))]).catch(()=>{});
  route();requestAnimationFrame(loop);
  await initCaps();if(cap.db&&cap.uid){const ok=await loadRemote();if(ok){buildRefs();applyAccent();if(!getP())state.cur=REFS.glass.id}}
  if(['home','prefs','script'].includes(page)||cap.db)rerender();
  window.renderAt=(t,fmt)=>{const p=getP(),[W,H]=dims(fmt||p.format),c=document.createElement('canvas');c.width=W/2;c.height=H/2;renderFrame(c.getContext('2d'),p,t,fmt||p.format);return c}})();
})();
