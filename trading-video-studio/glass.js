/* STYLE 01 — Cinematic liquid glass. WebGL refraction over Canvas-drawn backdrops. */
(function(){
const K=KIT,{clamp,lerp,S,O,B,eo}=K;
const C=K.pal(K.buildAs||'glass',{ink:'#0A1120',deep:'#15243C',porc:'#F2F7FF',blue:'#599CFF',aqua:'#65D9D3',lav:'#B8ABFF',peach:'#FFC7AB',loss:'#FF8B7B',white:'#FFFFFF',muted:'#8B98B0'});
const DISP='"Bricolage Grotesque","Helvetica Neue",Arial,sans-serif',SER='"Newsreader",Georgia,serif',MONO='"JetBrains Mono",ui-monospace,Menlo,monospace';
const rgba=K.rgba;

/* ---------- GL glass renderer ---------- */
const VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uBg,uFg;uniform vec2 uRes,uLog;uniform float uScale;uniform vec4 uL[6];uniform vec4 uP[6];uniform int uN;uniform float uK;
float sdRB(vec2 p,vec2 b,float r){r=min(r,min(b.x,b.y));vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float field(vec2 p){float d=1e5;for(int i=0;i<6;i++){if(i>=uN)break;d=smin(d,sdRB(p-uL[i].xy,uL[i].zw,uP[i].x),uK);}return d;}
vec2 toUV(vec2 q){return vec2(q.x/uLog.x,1.-q.y/uLog.y);}
vec3 bg(vec2 q){return texture2D(uBg,clamp(toUV(q),vec2(.0005),vec2(.9995))).rgb;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y-gl_FragCoord.y)/uScale;
 vec3 col=bg(p);
 if(uN>0){
  float d=field(p);float ds=field(p-vec2(0.,34.));
  vec3 outside=col*(1.-(1.-smoothstep(-40.,120.,ds))*.45);
  float aa=1.2/uScale;float m=1.-smoothstep(-aa,aa,d);col=outside;
  if(m>0.){
   float e=1.5;vec2 g=vec2(field(p+vec2(e,0.))-field(p-vec2(e,0.)),field(p+vec2(0.,e))-field(p-vec2(0.,e)));g/=max(length(g),1e-4);
   float Bv=66.,dd=-d,t=clamp(dd/Bv,0.,1.),s=1.-t;float slope=min(s/sqrt(max(1.-s*s,.03)),5.);
   vec2 off=vec2(0.);float str=0.,tm=0.,ws=0.;
   for(int i=0;i<6;i++){if(i>=uN)break;float di=sdRB(p-uL[i].xy,uL[i].zw,uP[i].x);float w=exp(-max(di,0.)/30.);ws+=w;str+=uP[i].y*w;tm+=uP[i].w*w;off+=(uL[i].xy-p)*uP[i].z*smoothstep(0.,140.,-di);}
   str/=max(ws,1e-4);tm/=max(ws,1e-4);off+=g*slope*str*16.;
   float ca=s*s*str*7.;vec2 q=p+off;
   vec3 rf=vec3(bg(q+g*ca).r,bg(q).g,bg(q-g*ca).b);
   rf*=mix(vec3(1.),vec3(.86,.93,1.07),tm);rf+=vec3(.02,.03,.055)*tm;rf*=1.-s*s*.22;
   vec2 Ld=normalize(vec2(-.5,-.86));
   float spec=pow(max(dot(g,Ld),0.),2.5)*(exp(-dd/3.5)*.95+exp(-dd/24.)*.22);
   float back=pow(max(dot(g,-Ld),0.),3.)*exp(-dd/4.)*.4;
   float fres=pow(s,5.)*.16;float inner=exp(-abs(dd-Bv)/3.)*.05;
   col=mix(outside,rf+vec3(1.)*(spec+fres+inner)+vec3(.62,.82,1.)*back,m);
  }
 }
 vec4 f=texture2D(uFg,toUV(p));
 gl_FragColor=vec4(f.rgb+col*(1.-f.a),1.);
}`;
class GlassGL{
  constructor(W,H,scale){this.W=W;this.H=H;this.s=scale;
    const cw=Math.round(W*scale),ch=Math.round(H*scale);
    this.cv=document.createElement('canvas');this.cv.width=cw;this.cv.height=ch;
    this.bgC=document.createElement('canvas');this.fgC=document.createElement('canvas');[this.bgC,this.fgC].forEach(c=>{c.width=cw;c.height=ch});
    this.bx=this.bgC.getContext('2d');this.fx=this.fgC.getContext('2d');
    const gl=this.gl=this.cv.getContext('webgl',{preserveDrawingBuffer:true,antialias:false,premultipliedAlpha:false});
    if(!gl){this.fail=true;return}
    const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);gl.useProgram(pr);
    const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const al=gl.getAttribLocation(pr,'a');gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
    const U=this.U={};['uBg','uFg','uRes','uLog','uScale','uL','uP','uN','uK'].forEach(n=>U[n]=gl.getUniformLocation(pr,n));
    const tex=u=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+u);gl.bindTexture(gl.TEXTURE_2D,t);
      [[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR]].forEach(([k,v])=>gl.texParameteri(gl.TEXTURE_2D,k,v));return t};
    this.tBg=tex(0);this.tFg=tex(1);gl.uniform1i(U.uBg,0);gl.uniform1i(U.uFg,1);
    gl.uniform2f(U.uRes,cw,ch);gl.uniform2f(U.uLog,W,H);gl.uniform1f(U.uScale,scale);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    this.LA=new Float32Array(24);this.PA=new Float32Array(24);
  }
  render(bgFn,fgFn,lenses,k=60){
    const s=this.s;this.bx.setTransform(s,0,0,s,0,0);bgFn(this.bx);
    this.fx.setTransform(1,0,0,1,0,0);this.fx.clearRect(0,0,this.fgC.width,this.fgC.height);this.fx.setTransform(s,0,0,s,0,0);fgFn(this.fx);
    if(this.fail)return this.compose2d();
    const gl=this.gl,U=this.U;this.LA.fill(0);this.PA.fill(0);
    const ls=lenses.slice(0,6);ls.forEach((l,i)=>{this.LA.set([l.x,l.y,Math.max(l.hw,1),Math.max(l.hh,1)],i*4);this.PA.set([l.r,l.str??1,l.mag??0,l.tint??.3],i*4)});
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.tBg);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.bgC);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.tFg);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.fgC);
    gl.uniform4fv(U.uL,this.LA);gl.uniform4fv(U.uP,this.PA);gl.uniform1i(U.uN,ls.length);gl.uniform1f(U.uK,k);
    gl.viewport(0,0,this.cv.width,this.cv.height);gl.drawArrays(gl.TRIANGLES,0,3);return this.cv}
  compose2d(){const c=this.cv.getContext('2d');c.drawImage(this.bgC,0,0);c.drawImage(this.fgC,0,0);return this.cv}
}
const pool=new Map();
function getR(W,H,scale){const k=W+'x'+H+'@'+scale;let r=pool.get(k);if(!r){r=new GlassGL(W,H,scale);pool.set(k,r)}return r}

/* ---------- shared backdrop ---------- */
function base(c,W,H,gx,gy,gc,ga){
  const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0A1120');g.addColorStop(.55,'#111D33');g.addColorStop(1,'#0A1120');
  c.fillStyle=g;c.fillRect(0,0,W,H);
  const r=c.createRadialGradient(gx,gy,0,gx,gy,Math.max(W,H)*.42);r.addColorStop(0,rgba(gc,ga));r.addColorStop(1,rgba(gc,0));c.fillStyle=r;c.fillRect(0,0,W,H);
  c.strokeStyle='rgba(242,247,255,0.055)';c.lineWidth=1.6;c.beginPath();
  for(let x=0;x<=W;x+=60){c.moveTo(x,0);c.lineTo(x,H)}for(let y=0;y<=H;y+=60){c.moveTo(0,y);c.lineTo(W,y)}c.stroke()}
function makeSeries(n,seed,drift,vol){const r=K.rng(seed);let p=100;const out=[];
  for(let i=0;i<n;i++){const o=p,c=o+drift(i/n)+(r()-.5)*vol;out.push({o,c,h:Math.max(o,c)+r()*vol*.45,l:Math.min(o,c)-r()*vol*.45});p=c}return out}
function candles(c,s,x,y,w,h,reveal,up,dn,alpha=1){let mn=1e9,mx=-1e9;s.forEach(k=>{mn=Math.min(mn,k.l);mx=Math.max(mx,k.h)});
  const n=s.length,st=w/n,bw=st*.56,Y=v=>y+h-(v-mn)/(mx-mn)*h,shown=reveal*n;
  for(let i=0;i<n;i++){const a=clamp(shown-i);if(a<=0)break;const k=s[i],col=k.c>=k.o?up:dn,cx=x+i*st+st/2;
    c.globalAlpha=alpha*a;c.strokeStyle=col;c.fillStyle=col;c.lineWidth=3;c.beginPath();c.moveTo(cx,Y(k.h));c.lineTo(cx,Y(k.l));c.stroke();
    const t=Math.min(Y(k.o),Y(k.c));c.fillRect(cx-bw/2,t,bw,Math.max(4,Math.abs(Y(k.o)-Y(k.c))))}c.globalAlpha=1}
const tag=(c,t,x,y,col,a=1,align='left',size=24)=>{c.save();c.font=`500 ${size}px ${MONO}`;c.textAlign=align;c.fillStyle=col;c.globalAlpha=a;if('letterSpacing'in c)c.letterSpacing='2px';c.fillText(t,x,y);c.restore()};
const eyebrow=(c,t,col,a=1,x=90,y=214)=>K.block(c,{text:t,x,y,size:26,font:`500 26px ${MONO}`,color:col,alpha:a,track:'5px',maxW:1800});

/* ---------- reference film scenes (Reference Video 1, 1080x1920) ---------- */
const s1=makeSeries(44,7,t=>t>.56&&t<.68?-2.6:1.7,5.5),s4=makeSeries(58,31,t=>Math.sin(t*20)*1.2,9);
const eq3=[100,103,101,105,104,108,105,102,99,96,93,90,96],E3={x:i=>110+i/(eq3.length-1)*860,y:v=>1190-(v-86)/(112-86)*400};
const N5=120,dips=[[18,5,4],[46,13,6],[73,6,4],[98,8,5]],v5=[];{const r5=K.rng(51);for(let i=0;i<N5;i++){let v=i*.5;for(const[c0,d,w]of dips)v-=d*Math.exp(-(((i-c0)/w)**2));v+=(r5()-.5)*1.3;v5.push(v)}}
const mn5=Math.min(...v5),mx5=Math.max(...v5),X5=i=>90+i/(N5-1)*900,Y5=v=>1340-(v-mn5)/(mx5-mn5)*520;
let fI=40;for(let i=38;i<56;i++)if(v5[i]<v5[fI])fI=i;const FX=X5(fI),FY=Y5(v5[fI]);
const win=(()=>{const r=K.rng(99),a=[];for(let row=0;row<9;row++)for(let col=0;col<15;col++){const q=r();a.push({x:62+col*64,y:1330+row*48,lit:q<.13,c:q<.06?C.peach:C.lav})}return a})();
const cluster=[[0,0],[-95,-60],[90,-72],[112,52],[-82,84],[12,-124]].map(([dx,dy])=>[790+dx,930+dy]);
const W0=1080,H0=1920;
const REF=[
{bg(c,p){base(c,W0,H0,760,1000,C.aqua,.13);
  c.save();c.font=`800 300px ${DISP}`;c.strokeStyle='rgba(242,247,255,.07)';c.lineWidth=3;c.textAlign='center';c.strokeText('PROFIT',540,1180);c.restore();
  candles(c,s1,90,810,900,500,.3+.7*S(p,0,.42),C.aqua,C.loss);
  c.strokeStyle='rgba(242,247,255,.18)';c.lineWidth=2;c.beginPath();c.moveTo(90,1340);c.lineTo(990,1340);c.stroke();
  const la=.35+.65*S(p,.38,.62);tag(c,'WHAT IT ACTUALLY COSTS',90,1440,C.peach,la);
  [['Time','nights on the charts'],['Sleep','3 AM sessions'],['Social life','weekends you skip'],['Confidence','every red day']].forEach(([a,b],i)=>{const y=1505+i*62;c.globalAlpha=la;c.fillStyle=C.porc;c.font=`700 40px ${DISP}`;c.textAlign='left';c.fillText(a,90,y+30);c.font=`italic 400 36px ${SER}`;c.fillStyle='#B7C3D8';c.textAlign='right';c.fillText(b,990,y+30);c.strokeStyle='rgba(242,247,255,.12)';c.beginPath();c.moveTo(90,y+48);c.lineTo(990,y+48);c.stroke();c.globalAlpha=1})},
 lenses(p){const a1=S(p,0,.4),a2=S(p,.44,.8);return [{x:lerp(lerp(330,740,a1),540,a2),y:lerp(lerp(1215,990,a1),1590,a2),hw:lerp(200,478,a2),hh:lerp(200,150,a2)-34*Math.sin(Math.PI*a2),r:lerp(200,100,a2),str:1,mag:lerp(.22,.1,a2),tint:.3}]},
 fg(c,p){eyebrow(c,'THE DARK SIDE OF TRADING',C.aqua,S(p,0,.12));
  K.block(c,{text:'Everyone wants to become a profitable trader.',x:90,y:270,size:76,font:`700 76px ${DISP}`,color:C.porc,maxW:900,reveal:S(p,.02,.3),shadow:true});
  K.block(c,{text:'Nobody talks about what it costs.',x:90,y:560,size:66,font:`italic 500 66px ${SER}`,color:C.peach,maxW:900,reveal:S(p,.46,.66),shadow:true});
  tag(c,'WHAT EVERYONE SEES',990,790,C.aqua,S(p,.12,.28)*(1-.6*S(p,.45,.6)),'right')}},
{k:85,bg(c,p){base(c,W0,H0,300,950,C.lav,.13);
  c.save();c.font=`400 260px ${MONO}`;c.strokeStyle='rgba(242,247,255,.14)';c.lineWidth=3;c.textAlign='center';c.strokeText('03:14',540,1275);c.restore();
  win.forEach(w=>{if(w.lit){c.fillStyle=rgba(w.c,.55);c.fillRect(w.x,w.y,46,30)}else{c.strokeStyle='rgba(242,247,255,.07)';c.lineWidth=2;c.strokeRect(w.x,w.y,46,30)}});
  const fade=1-.75*S(p,.45,.95);c.strokeStyle=rgba(C.lav,.35*fade);c.lineWidth=2.5;c.beginPath();
  for(let i=0;i<cluster.length;i++)for(let j=i+1;j<cluster.length;j++){c.moveTo(...cluster[i]);c.lineTo(...cluster[j])}c.stroke();
  cluster.forEach(([x,y],i)=>{c.fillStyle=rgba(i%2?C.lav:C.peach,.35+.6*fade);c.beginPath();c.arc(x,y,14,0,7);c.fill()});
  c.setLineDash([10,12]);c.strokeStyle=rgba(C.porc,.35*(1-S(p,.15,.55)));c.lineWidth=2.5;c.beginPath();c.moveTo(258,930);c.lineTo(700,930);c.stroke();c.setLineDash([]);
  c.fillStyle=C.white;c.beginPath();c.arc(240,930,17,0,7);c.fill();c.strokeStyle=rgba(C.aqua,.8);c.lineWidth=3;c.beginPath();c.arc(240,930,32,0,7);c.stroke()},
 lenses(p){const a=S(p,.2,.68),dn=34*S(p,.7,1);return [{x:lerp(540,790,a),y:930,hw:lerp(380,175,a),hh:lerp(205,175,a),r:lerp(205,175,a),str:1,mag:.08,tint:.3+.55*S(p,.6,1)},{x:lerp(540,240,a),y:930+dn,hw:lerp(380,118,a),hh:lerp(205,118,a),r:lerp(205,118,a),str:1,mag:.3,tint:.2}]},
 fg(c,p){eyebrow(c,'LONELINESS',C.lav,S(p,0,.12));
  K.block(c,{text:'Charts at 3 AM. Plans you keep cancelling.',x:90,y:270,size:74,font:`700 74px ${DISP}`,color:C.porc,maxW:900,reveal:S(p,.02,.3),shadow:true});
  tag(c,'YOU',240,1112,C.porc,S(p,.3,.5),'center',28);tag(c,'FRIENDS · FAMILY · WEEKENDS',790,1150,C.lav,S(p,.3,.5)*(1-.6*S(p,.6,.95)),'center',22);
  K.block(c,{text:'The work is real. Nobody around you can see it.',x:540,y:1180,size:50,font:`italic 500 50px ${SER}`,color:C.peach,maxW:860,align:'center',reveal:S(p,.55,.85),shadow:true})}},
{bg(c,p){base(c,W0,H0,640,1100,C.loss,.1);
  const rv=.25+.75*S(p,0,.35),n=eq3.length,sh=rv*(n-1);
  const g=c.createLinearGradient(0,780,0,1200);g.addColorStop(0,rgba(C.blue,.18));g.addColorStop(1,rgba(C.blue,0));
  c.fillStyle=g;c.beginPath();c.moveTo(E3.x(0),1200);for(let i=0;i<=Math.floor(sh);i++)c.lineTo(E3.x(i),E3.y(eq3[i]));c.lineTo(E3.x(Math.floor(sh)),1200);c.fill();
  for(let i=0;i<n-1;i++){const a=clamp(sh-i);if(a<=0)break;const x0=E3.x(i),y0=E3.y(eq3[i]),x1=E3.x(i+1),y1=E3.y(eq3[i+1]);c.strokeStyle=eq3[i+1]<eq3[i]?C.loss:C.aqua;c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.lineTo(lerp(x0,x1,a),lerp(y0,y1,a));c.stroke()}
  for(let i=0;i<=Math.floor(sh);i++){c.fillStyle=C.porc;c.beginPath();c.arc(E3.x(i),E3.y(eq3[i]),7,0,7);c.fill()}
  c.setLineDash([12,12]);c.strokeStyle='rgba(242,247,255,.35)';c.lineWidth=2;c.beginPath();c.moveTo(E3.x(5),E3.y(108));c.lineTo(990,E3.y(108));c.stroke();c.setLineDash([]);
  tiles(c,106,1295,S(p,.02,.3))},
 lenses(p){const a1=S(p,.08,.55),a2=S(p,.62,.92),lx=E3.x(11),ly=E3.y(eq3[11]);return [{x:lerp(lerp(161,471,a1),lx,a2),y:lerp(1360,ly,a2),hw:lerp(lerp(78,385,a1),150,a2),hh:lerp(lerp(78,96,a1)-16*Math.sin(Math.PI*a1),150,a2),r:lerp(78,150,a2),str:1.05,mag:lerp(.07,.22,a2),tint:.28}]},
 fg(c,p){eyebrow(c,'LOSING STREAKS',C.loss,S(p,0,.12));
  K.block(c,{text:'Six losses in a row. Same plan. Same rules.',x:90,y:270,size:74,font:`700 74px ${DISP}`,color:C.porc,maxW:900,reveal:S(p,.02,.3),shadow:true});
  tag(c,'PREVIOUS HIGH',990,E3.y(108)-16,C.porc,.7*S(p,.2,.4),'right',22);tag(c,'ILLUSTRATIVE ACCOUNT',990,1240,C.muted,.8,'right',20);
  K.block(c,{text:'A streak doesn’t prove your plan is broken. Even profitable systems string losses together.',x:90,y:1480,size:46,font:`italic 500 46px ${SER}`,color:C.peach,maxW:900,reveal:S(p,.5,.85),shadow:true})}},
{k:90,bg(c,p){base(c,W0,H0,540,960,C.lav,.12);candles(c,s4,90,1500,900,240,1,C.aqua,C.loss,.3);ring(c,540,960,280,S(p,0,.25))},
 lenses(p){const ph=S(p,.08,.6)*Math.PI/2,cc=S(p,.66,.92),out=[];for(let k=0;k<4;k++){const a=-Math.PI/2+k*Math.PI/2+ph;out.push({x:lerp(540+280*Math.cos(a),540,cc),y:lerp(960+280*Math.sin(a),960,cc),hw:lerp(92,165,cc),hh:lerp(92,165,cc),r:lerp(92,165,cc),str:1,mag:.18,tint:.32})}return out},
 fg(c,p){eyebrow(c,'FRUSTRATION → SELF-DOUBT',C.lav,S(p,0,.12));
  K.block(c,{text:'The loop that quietly breaks traders.',x:90,y:270,size:74,font:`700 74px ${DISP}`,color:C.porc,maxW:900,reveal:S(p,.02,.3),shadow:true});
  ringLabels(c,540,960,280,['A loss','Frustration','Revenge trade','Self-doubt'],S(p,.1,.3),90,990);
  K.block(c,{text:'Frustration funds the revenge trade. The revenge trade funds the doubt.',x:540,y:1360,size:42,font:`italic 500 42px ${SER}`,color:C.peach,maxW:880,align:'center',reveal:S(p,.3,.55),shadow:true});
  ['Notice it.','Name it.','Step away.'].forEach((t,i)=>K.block(c,{text:t,x:540,y:864+i*48,size:40,font:`800 40px ${DISP}`,color:C.white,align:'center',reveal:S(p,.76+i*.05,.92+i*.03),shadow:true}))}},
{bg(c,p){base(c,W0,H0,700,900,C.aqua,.14);const z=lerp(1.8,1,S(p,.45,.88));c.save();c.translate(FX,FY);c.scale(z,z);c.translate(-FX,-FY);longCurve(c,X5,Y5);c.restore()},
 lenses(p){const a1=S(p,0,.25),a2=S(p,.48,.86);return [{x:lerp(lerp(540,FX,a1),540,a2),y:lerp(lerp(960,FY,a1),1075,a2),hw:lerp(lerp(165,200,a1),470,a2),hh:lerp(lerp(165,200,a1),320,a2),r:lerp(lerp(165,200,a1),130,a2),str:lerp(1,.7,a2),mag:lerp(lerp(.18,.32,a1),.03,a2),tint:.25}]},
 fg(c,p){eyebrow(c,'PERSPECTIVE',C.aqua,S(p,0,.12)*(1-S(p,.4,.5)));
  K.block(c,{text:'Zoom out.',x:90,y:270,size:96,font:`800 96px ${DISP}`,color:C.porc,reveal:S(p,.02,.18),alpha:1-S(p,.38,.5),shadow:true});
  K.block(c,{text:'One day, the struggle that almost made you quit',x:90,y:240,size:62,font:`italic 500 62px ${SER}`,color:C.peach,maxW:900,reveal:S(p,.5,.72),shadow:true});
  K.block(c,{text:'will become the reason you never give up.',x:90,y:430,size:72,font:`800 72px ${DISP}`,color:C.white,maxW:900,reveal:S(p,.64,.88),shadow:true});
  tag(c,'THIS WAS THE STREAK',FX,FY+250,C.peach,S(p,.15,.32),'center',24);tag(c,'STILL HERE',990,Y5(v5[N5-1])-30,C.aqua,S(p,.75,.9),'right',24);
  tag(c,'ILLUSTRATIVE',990,1440,C.muted,.7*S(p,.6,.8),'right',20);tag(c,'THE DARK SIDE OF TRADING',540,1700,C.muted,S(p,.85,1),'center',22)}}];
function tiles(c,x0,y,a){for(let i=0;i<7;i++){const t=clamp(a*8-i);if(t<=0)continue;const x=x0+i*124,L=i<6,col=L?C.loss:C.aqua;
  c.globalAlpha=t;c.fillStyle=rgba(col,.16);c.strokeStyle=col;c.lineWidth=3;K.rr(c,x,y,110,130,18);c.fill();c.stroke();
  c.fillStyle=col;c.textAlign='center';c.font=`800 58px ${DISP}`;c.fillText(L?'L':'W',x+55,y+70);c.font=`500 22px ${MONO}`;c.fillText(L?'−1R':'+2R',x+55,y+110);c.globalAlpha=1}}
function ring(c,cx,cy,R,rv){c.strokeStyle='rgba(242,247,255,.28)';c.lineWidth=4;c.beginPath();c.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+rv*Math.PI*2);c.stroke();
  c.strokeStyle='rgba(242,247,255,.08)';c.lineWidth=1.5;for(let k=0;k<3;k++){c.beginPath();c.arc(cx,cy,R-60-k*55,0,7);c.stroke()}
  for(let k=0;k<4;k++){const a=-Math.PI/4+k*Math.PI/2;if(rv<(k+.5)/4)continue;const x=cx+R*Math.cos(a),y=cy+R*Math.sin(a),t=a+Math.PI/2;
    c.fillStyle='rgba(242,247,255,.6)';c.beginPath();c.moveTo(x+Math.cos(t)*18,y+Math.sin(t)*18);c.lineTo(x+Math.cos(t+2.5)*14,y+Math.sin(t+2.5)*14);c.lineTo(x+Math.cos(t-2.5)*14,y+Math.sin(t-2.5)*14);c.fill()}
  [C.loss,C.peach,C.lav,C.blue].forEach((col,k)=>{if(rv<k/4)return;const a=-Math.PI/2+k*Math.PI/2;c.fillStyle=col;c.beginPath();c.arc(cx+R*Math.cos(a),cy+R*Math.sin(a),20,0,7);c.fill()})}
function ringLabels(c,cx,cy,R,labs,a,xl,xr){c.save();c.font=`700 36px ${DISP}`;c.fillStyle=C.porc;c.globalAlpha=a;c.shadowColor='rgba(10,17,32,.85)';c.shadowBlur=16;
  c.textAlign='center';c.fillText(labs[0]||'',cx,cy-R-40);c.fillText(labs[2]||'',cx,cy+R+70);c.textAlign='right';c.fillText(labs[1]||'',xr,cy+70);c.textAlign='left';c.fillText(labs[3]||'',xl,cy+70);c.restore()}
function longCurve(c,X,Y){const g=c.createLinearGradient(0,Y(mx5),0,Y(mn5)+20);g.addColorStop(0,rgba(C.aqua,.2));g.addColorStop(1,rgba(C.aqua,0));
  c.fillStyle=g;c.beginPath();c.moveTo(X(0),Y(mn5)+20);v5.forEach((v,i)=>c.lineTo(X(i),Y(v)));c.lineTo(X(N5-1),Y(mn5)+20);c.fill();
  c.strokeStyle=C.aqua;c.lineWidth=5;c.lineJoin='round';c.beginPath();v5.forEach((v,i)=>i?c.lineTo(X(i),Y(v)):c.moveTo(X(i),Y(v)));c.stroke();
  c.strokeStyle=C.peach;c.lineWidth=7;c.beginPath();for(let i=34;i<=58;i++){const x=X(i),y=Y(v5[i]);i===34?c.moveTo(x,y):c.lineTo(x,y)}c.stroke();
  c.strokeStyle=rgba(C.peach,.9);c.lineWidth=3;c.beginPath();c.arc(X(fI),Y(v5[fI]),22,0,7);c.stroke();
  [18,73,98].forEach(c0=>{let m=c0;for(let i=c0-6;i<c0+6;i++)if(v5[i]<v5[m])m=i;c.fillStyle='rgba(242,247,255,.5)';c.beginPath();c.arc(X(m),Y(v5[m]),7,0,7);c.fill();c.font=`400 20px ${MONO}`;c.textAlign='center';c.fillText('drawdown',X(m),Y(v5[m])+42)})}

/* ---------- motif generators for new scenes (1000x1000 visual box) ---------- */
const DEF={night:['Friends'],ledger:['Time','Sleep','Focus','Confidence'],loop:['A loss','Frustration','Revenge trade','Self-doubt'],shield:['Stop-loss','Daily limit','Position size'],split:['The crowd','You'],rise:['Goal'],word:['Discipline']};
const lab=(S0,m,i)=>(S0.labels&&S0.labels[i])||DEF[m]?.[i]||'';
const M={
 night:{k:85,bg(c,p,S0){const r=K.rng(S0.seed);c.save();c.font=`400 230px ${MONO}`;c.strokeStyle='rgba(242,247,255,.13)';c.lineWidth=3;c.textAlign='center';c.strokeText('03:14',500,640);c.restore();
   for(let row=0;row<6;row++)for(let col=0;col<14;col++){const q=r(),x=10+col*70,y=700+row*50;if(q<.14){c.fillStyle=rgba(q<.07?C.peach:C.lav,.55);c.fillRect(x,y,50,32)}else{c.strokeStyle='rgba(242,247,255,.07)';c.lineWidth=2;c.strokeRect(x,y,50,32)}}
   const cl=[[0,0],[-90,-60],[85,-70],[105,50],[-80,80],[10,-120]].map(([a,b])=>[720+a,300+b]),fade=1-.75*S(p,.45,.95);
   c.strokeStyle=rgba(C.lav,.35*fade);c.lineWidth=2.5;c.beginPath();for(let i=0;i<cl.length;i++)for(let j=i+1;j<cl.length;j++){c.moveTo(...cl[i]);c.lineTo(...cl[j])}c.stroke();
   cl.forEach(([x,y],i)=>{c.fillStyle=rgba(i%2?C.lav:C.peach,.35+.6*fade);c.beginPath();c.arc(x,y,14,0,7);c.fill()});
   c.setLineDash([10,12]);c.strokeStyle=rgba(C.porc,.35*(1-S(p,.15,.55)));c.lineWidth=2.5;c.beginPath();c.moveTo(240,300);c.lineTo(630,300);c.stroke();c.setLineDash([]);
   c.fillStyle=C.white;c.beginPath();c.arc(220,300,17,0,7);c.fill();c.strokeStyle=rgba(C.aqua,.8);c.lineWidth=3;c.beginPath();c.arc(220,300,32,0,7);c.stroke()},
  lenses(p){const a=S(p,.15,.6),dn=30*S(p,.65,1);return [{x:lerp(500,720,a),y:300,hw:lerp(360,165,a),hh:lerp(200,165,a),r:lerp(200,165,a),mag:.08,tint:.3+.5*S(p,.6,1)},{x:lerp(500,220,a),y:300+dn,hw:lerp(360,110,a),hh:lerp(200,110,a),r:lerp(200,110,a),mag:.3,tint:.2}]},
  fg(c,p,S0){tag(c,'YOU',220,470,C.porc,S(p,.3,.5),'center',28);tag(c,lab(S0,'night',0).toUpperCase(),720,500,C.lav,S(p,.3,.5)*(1-.6*S(p,.6,.95)),'center',22)}},
 ledger:{bg(c,p,S0){const r=K.rng(S0.seed),n=4;tag(c,'WHAT IT TAKES',20,90,C.peach,.9);
   for(let i=0;i<n;i++){const y=200+i*190,a=S(p,.05+i*.1,.3+i*.1),t=lab(S0,'ledger',i)||DEF.ledger[i];c.globalAlpha=.3+.7*a;
     c.font=`700 64px ${DISP}`;c.fillStyle=C.porc;c.textAlign='left';c.fillText(t,20,y+20);
     c.fillStyle='rgba(242,247,255,.1)';K.rr(c,20,y+60,960,18,9);c.fill();c.fillStyle=[C.aqua,C.lav,C.peach,C.blue][i];K.rr(c,20,y+60,960*(.35+.6*r())*a,18,9);c.fill();
     c.font=`500 22px ${MONO}`;c.fillStyle=C.muted;c.textAlign='right';c.fillText('0'+(i+1),980,y+16);c.globalAlpha=1}},
  lenses(p){const y=lerp(250,820,S(p,.1,.92));return [{x:500,y,hw:lerp(160,500,S(p,0,.15)),hh:110-20*Math.sin(Math.PI*S(p,.1,.92)),r:100,mag:.14,tint:.28}]},fg(){}},
 streak:{bg(c,p,S0){const n=eq3.length,sh=(.25+.75*S(p,0,.35))*(n-1),X=i=>40+i/(n-1)*920,Y=v=>550-(v-86)/(112-86)*420;
   for(let i=0;i<n-1;i++){const a=clamp(sh-i);if(a<=0)break;c.strokeStyle=eq3[i+1]<eq3[i]?C.loss:C.aqua;c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(X(i),Y(eq3[i]));c.lineTo(lerp(X(i),X(i+1),a),lerp(Y(eq3[i]),Y(eq3[i+1]),a));c.stroke()}
   for(let i=0;i<=Math.floor(sh);i++){c.fillStyle=C.porc;c.beginPath();c.arc(X(i),Y(eq3[i]),7,0,7);c.fill()}
   c.setLineDash([12,12]);c.strokeStyle='rgba(242,247,255,.35)';c.lineWidth=2;c.beginPath();c.moveTo(X(5),Y(108));c.lineTo(960,Y(108));c.stroke();c.setLineDash([]);
   tiles(c,66,680,S(p,.02,.3));tag(c,'ILLUSTRATIVE',980,620,C.muted,.8,'right',20)},
  lenses(p){const a1=S(p,.08,.55),a2=S(p,.62,.92),lx=40+11/12*920,ly=550-(90-86)/26*420;return [{x:lerp(lerp(121,431,a1),lx,a2),y:lerp(745,ly,a2),hw:lerp(lerp(78,385,a1),140,a2),hh:lerp(lerp(78,96,a1)-16*Math.sin(Math.PI*a1),140,a2),r:lerp(78,140,a2),str:1.05,mag:lerp(.07,.22,a2),tint:.28}]},fg(){}},
 loop:{k:90,bg(c,p){ring(c,500,520,330,S(p,0,.25))},
  lenses(p){const ph=S(p,.08,.6)*Math.PI/2,cc=S(p,.66,.92),o=[];for(let k=0;k<4;k++){const a=-Math.PI/2+k*Math.PI/2+ph;o.push({x:lerp(500+330*Math.cos(a),500,cc),y:lerp(520+330*Math.sin(a),520,cc),hw:lerp(95,170,cc),hh:lerp(95,170,cc),r:lerp(95,170,cc),mag:.18,tint:.32})}return o},
  fg(c,p,S0){ringLabels(c,500,520,330,[0,1,2,3].map(i=>lab(S0,'loop',i)),S(p,.1,.3),0,1000)}},
 shield:{bg(c,p,S0){const R=[150,250,350,450];R.forEach((r,i)=>{c.strokeStyle=rgba([C.aqua,C.blue,C.lav,C.aqua][i],.22+.4*S(p,i*.08,.2+i*.08));c.lineWidth=i===3?5:3;c.beginPath();c.arc(500,500,r,0,7);c.stroke()});
   for(let i=0;i<3;i++){const t=lab(S0,'shield',i);if(!t)continue;tag(c,t.toUpperCase(),500,500-R[i+1]-14,C.porc,S(p,.15+i*.1,.35+i*.1),'center',22)}
   c.fillStyle=C.deep;c.beginPath();c.arc(500,500,95,0,7);c.fill();c.strokeStyle=C.aqua;c.lineWidth=4;c.stroke();tag(c,'ACCOUNT',500,508,C.aqua,1,'center',22);
   const r=K.rng(S0.seed);for(let i=0;i<9;i++){const ang=r()*Math.PI*2,t0=r()*.6,u=clamp((p-t0)/.35);if(u<=0)continue;const d=u<.6?lerp(720,450,u/.6):lerp(450,560,(u-.6)/.4),a=u<.6?1:1-(u-.6)/.4;
     c.fillStyle=rgba(C.loss,.9*a);c.beginPath();c.arc(500+Math.cos(ang)*d,500+Math.sin(ang)*d,12,0,7);c.fill()}},
  lenses(p){const g=S(p,.1,.6);return [{x:500,y:500,hw:lerp(110,330,g),hh:lerp(110,330,g),r:lerp(110,330,g),mag:lerp(.3,.08,g),str:lerp(1,.8,g),tint:.3}]},fg(){}},
 zoomout:{bg(c,p){const X=i=>i/(N5-1)*1000,Y=v=>820-(v-mn5)/(mx5-mn5)*560,fx=X(fI),fy=Y(v5[fI]),z=lerp(1.8,1,S(p,.4,.85));c.save();c.translate(fx,fy);c.scale(z,z);c.translate(-fx,-fy);longCurve(c,X,Y);c.restore();tag(c,'ILLUSTRATIVE',1000,930,C.muted,.7,'right',20)},
  lenses(p){const fx=fI/(N5-1)*1000,fy=820-(v5[fI]-mn5)/(mx5-mn5)*560,a1=S(p,0,.25),a2=S(p,.45,.85);return [{x:lerp(lerp(500,fx,a1),500,a2),y:lerp(lerp(500,fy,a1),560,a2),hw:lerp(180,520,a2),hh:lerp(180,330,a2),r:lerp(180,130,a2),str:lerp(1,.7,a2),mag:lerp(.32,.03,a2),tint:.25}]},
  fg(c,p){const fx=fI/(N5-1)*1000,fy=820-(v5[fI]-mn5)/(mx5-mn5)*560;tag(c,'THE HARD PART',fx,fy+230,C.peach,S(p,.15,.3),'center',24)}},
 rise:{bg(c,p,S0){const n=7;for(let i=0;i<n;i++){const h=120+i*105,a=O(p,.04+i*.06,.2+i*.06),x=20+i*140;c.fillStyle=rgba(i===n-1?C.aqua:C.blue,.18+.5*a);K.rr(c,x,950-h*a,110,h*a,14);c.fill();c.strokeStyle=rgba(C.porc,.25*a);c.lineWidth=2;c.stroke()}
   const tx=20+6*140+55,ty=950-(120+6*105);c.strokeStyle=C.porc;c.lineWidth=4;c.beginPath();c.moveTo(tx,ty-10);c.lineTo(tx,ty-150*S(p,.5,.65));c.stroke();
   if(p>.6){c.fillStyle=C.peach;c.beginPath();c.moveTo(tx,ty-150);c.lineTo(tx+90*S(p,.6,.7),ty-125);c.lineTo(tx,ty-100);c.fill()}},
  lenses(p){const i=S(p,.1,.8)*6,x=20+i*140+55,y=950-(120+i*105)-40;return [{x,y,hw:150,hh:150,r:150,mag:.22,tint:.28}]},
  fg(c,p,S0){tag(c,lab(S0,'rise',0).toUpperCase(),20+6*140+55,950-(120+6*105)-180,C.peach,S(p,.62,.75),'center',26)}},
 split:{k:90,bg(c,p,S0){const r=K.rng(S0.seed);for(let i=0;i<70;i++){const x=80+r()*400,y=200+r()*600;c.fillStyle=rgba(i%3?C.lav:C.blue,.5);c.beginPath();c.arc(x,y,7+r()*6,0,7);c.fill()}
   c.fillStyle=C.peach;c.beginPath();c.arc(780,500,22,0,7);c.fill();c.strokeStyle=rgba(C.peach,.7);c.lineWidth=3;c.beginPath();c.arc(780,500,44,0,7);c.stroke();
   c.setLineDash([8,12]);c.strokeStyle=rgba(C.porc,.3*(1-S(p,.3,.7)));c.beginPath();c.moveTo(480,500);c.lineTo(740,500);c.stroke();c.setLineDash([])},
  lenses(p){const a=S(p,.15,.6);return [{x:lerp(560,280,a),y:500,hw:lerp(380,230,a),hh:lerp(300,300,a),r:lerp(200,200,a),mag:.06,tint:.4},{x:lerp(560,780,a),y:500,hw:lerp(380,130,a),hh:lerp(300,130,a),r:lerp(200,130,a),mag:.3,tint:.15}]},
  fg(c,p,S0){tag(c,lab(S0,'split',0).toUpperCase(),280,860,C.lav,S(p,.4,.6),'center',24);tag(c,lab(S0,'split',1).toUpperCase(),780,680,C.peach,S(p,.45,.65),'center',24)}},
 word:{bg(c,p,S0){const w=(lab(S0,'word',0)||'Discipline').toUpperCase();c.save();let fs=340;c.font=`800 ${fs}px ${DISP}`;while(c.measureText(w).width>980&&fs>80){fs-=10;c.font=`800 ${fs}px ${DISP}`}
   c.textAlign='center';c.strokeStyle='rgba(242,247,255,.35)';c.lineWidth=4;c.strokeText(w,500,560);c.fillStyle=rgba(C.blue,.12);c.fillText(w,500,560);c.restore();
   c.strokeStyle=rgba(C.aqua,.3);c.lineWidth=2;for(let i=0;i<5;i++){c.beginPath();c.moveTo(0,640+i*40);c.lineTo(1000*S(p,i*.05,.4+i*.05),640+i*40);c.stroke()}
   (S0.labels||[]).slice(1,4).forEach((t,i)=>tag(c,t.toUpperCase(),20+i*330,860,C.muted,S(p,.3+i*.1,.5+i*.1),'left',22))},
  lenses(p){const x=lerp(80,920,S(p,.05,.95));return [{x,y:470,hw:170,hh:200,r:170,mag:.25,tint:.25}]},fg(){}},
 media:{bg(c,p,S0,img){c.save();K.rr(c,0,0,1000,1000,40);c.clip();c.fillStyle=C.deep;c.fillRect(0,0,1000,1000);
   if(img){const iw=img.videoWidth||img.naturalWidth||img.width,ih=img.videoHeight||img.naturalHeight||img.height;if(iw){const s=Math.max(1000/iw,1000/ih)*(1+.08*p);c.drawImage(img,500-iw*s/2,500-ih*s/2,iw*s,ih*s)}}c.restore()},
  lenses(p){return [{x:lerp(250,750,S(p,.05,.95)),y:500,hw:170,hh:170,r:170,mag:.2,tint:.2}]},fg(){}}
};

function lensMap(l,m){const x=m.a*l.x+m.c*l.y+m.e,y=m.b*l.x+m.d*l.y+m.f,s=Math.hypot(m.a,m.b);return {...l,x,y,hw:l.hw*s,hh:l.hh*s,r:l.r*s}}

/* draw(ctx, spec, p, W, H, scale, media) — renders into ctx (already sized W*scale x H*scale). */
function draw(ctx,spec,p,W,H,scale,media){
  const r=getR(W,H,scale);let cv;
  if(spec.kind==='ref'){const R=REF[spec.ref];cv=r.render(c=>R.bg(c,p),c=>R.fg(c,p),R.lenses(p),R.k||60)}
  else{const L=K.layout(W,H),m=M[spec.motif]||M.word,S0=spec;
    const mat=new DOMMatrix();{const cx=L.vis.x+500*L.vis.s,cy=L.vis.y+500*L.vis.s,e=K.eio(p),amt=S0.motionAmt??1;let s=1,dx=0,dy=0,cam=S0.camera;
      if(cam==='push-in')s=1+.12*e*amt;else if(cam==='pull-back')s=1.14-.14*e*amt;else if(cam==='pan-left')dx=60*amt-120*e*amt;else if(cam==='pan-right')dx=-60*amt+120*e*amt;else if(cam==='drift-up')dy=50*amt-100*e*amt;
      mat.translateSelf(cx+dx,cy+dy).scaleSelf(s,s).translateSelf(-cx,-cy).translateSelf(L.vis.x,L.vis.y).scaleSelf(L.vis.s,L.vis.s)}
    const glow=[C.aqua,C.lav,C.blue,C.peach][S0.seed%4];
    cv=r.render(c=>{base(c,W,H,L.vis.x+500*L.vis.s,L.vis.y+500*L.vis.s,glow,.14);c.save();c.transform(mat.a,mat.b,mat.c,mat.d,mat.e,mat.f);m.bg(c,p,S0,media);c.restore()},
      c=>{c.save();c.transform(mat.a,mat.b,mat.c,mat.d,mat.e,mat.f);m.fg(c,p,S0);c.restore();
        if(S0.eyebrow)eyebrow(c,S0.eyebrow.toUpperCase(),glow,S(p,0,.12),L.text.x,L.text.y-56);
        if(S0.headline)K.block(c,{text:S0.headline,x:L.text.x,y:L.text.y,size:L.text.size,font:`700 ${L.text.size}px ${DISP}`,color:C.porc,maxW:L.text.w,reveal:S(p,.02,.28),shadow:true});
        if(S0.sub)K.block(c,{text:S0.sub,x:L.text.x,y:L.land?L.text.y+300:L.text.y+(S0.headline?240:0),size:50,font:`italic 500 50px ${SER}`,color:C.peach,maxW:L.text.w,reveal:S(p,.35,.6),shadow:true})},
      m.lenses(p,S0).map(l=>lensMap(l,mat)),m.k||60)}
  ctx.drawImage(cv,0,0,ctx.canvas.width,ctx.canvas.height);
}
function backdrop(c,W,H){base(c,W,H,W*.3,H*.5,C.aqua,.12)}

window[K.buildAs?'__BUILT':'STYLE_GLASS']={id:'glass',draw,backdrop,refCount:REF.length,motifs:Object.keys(M).filter(m=>m!=='media'),
  fonts:[`700 72px "Bricolage Grotesque"`,`800 72px "Bricolage Grotesque"`,`italic 500 60px "Newsreader"`,`500 26px "JetBrains Mono"`],
  palette:[C.ink,C.deep,C.porc,C.blue,C.aqua,C.lav,C.peach],caption:{font:DISP,color:C.porc,hi:C.peach,box:'rgba(10,17,32,.62)'},
  traits:{Palette:'Midnight graphite and deep blue with porcelain type; aqua, lavender and peach accents only on what matters.',Type:'Bricolage Grotesque headlines, Newsreader italic for the emotional line, JetBrains Mono labels.',Material:'Real refractive glass: lenses bend, magnify and split the backdrop, with bevel highlights, edge dispersion and cast shadows.',Motion:'Slow deliberate lens travel; merges and splits carry meaning; masked line-by-line headline reveals.',Camera:'Restrained push-ins and a signature pull-back reveal.',Atmosphere:'Nocturnal, quiet, honest. Thin grids and data lines give the glass something to bend.'}};
})();
