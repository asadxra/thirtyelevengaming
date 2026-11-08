/* STYLE 02 — Premium flat-vector editorial. Canvas 2D Bezier illustration. */
(function(){
const K=KIT,{clamp,lerp,S,O,B,eo,eb}=K;
const {INK,IV,CB,TL,CR,AM,PE,SL,SK,P2}=K.pal('vector',{INK:'#172235',IV:'#F6F5EE',CB:'#4667FF',TL:'#16B99A',CR:'#FF765E',AM:'#FFC65C',PE:'#A3A5F4',SL:'#73819A',SK:'#E9A688',P2:'#ECEADF'});
const DISP='"Archivo","Helvetica Neue",Arial,sans-serif',MONO='"IBM Plex Mono",ui-monospace,Menlo,monospace';
const rr=K.rr;
function font(c,w,size,fam=DISP,stretch='semi-expanded'){c.font=`${w} ${size}px ${fam}`;if('fontStretch'in c)c.fontStretch=fam===DISP?stretch:'normal'}
const vblock=(c,o)=>K.block(c,{...o,font:`${o.w||800} ${o.size}px ${DISP}`,stretch:o.stretch||'semi-expanded'});
function mono(c,t,x,y,col,size=24,align='left',a=1,w=600){c.save();font(c,w,size,MONO);c.fillStyle=col;c.textAlign=align;c.globalAlpha=a;if('letterSpacing'in c)c.letterSpacing='3px';c.fillText(t,x,y);c.restore()}
function epTag(c,x,y,label,sub,dark=false,a=1){c.save();c.globalAlpha=a;font(c,600,20,MONO);const w=c.measureText(label).width+44;rr(c,x,y,w,44,22);c.fillStyle=dark?IV:INK;c.fill();c.restore();mono(c,label,x+w/2,y+31,dark?INK:IV,20,'center',a);if(sub)mono(c,sub,x+w+22,y+31,dark?PE:SL,20,'left',a)}

/* ---------- vector kit ---------- */
function coin(c,x,y,r,a=1){c.save();c.globalAlpha=a;c.fillStyle='#E9A53A';c.beginPath();c.arc(x,y+r*.14,r,0,7);c.fill();c.fillStyle=AM;c.beginPath();c.arc(x,y,r,0,7);c.fill();
  c.strokeStyle='#E9A53A';c.lineWidth=r*.14;c.beginPath();c.arc(x,y,r*.66,0,7);c.stroke();c.lineCap='round';c.beginPath();c.moveTo(x,y-r*.32);c.lineTo(x,y+r*.32);c.stroke();
  c.strokeStyle=IV;c.lineWidth=r*.1;c.beginPath();c.arc(x,y,r*.82,3.6,4.4);c.stroke();c.restore()}
function arrowHead(c,[x,y],[dx,dy],s,col){c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle=col;c.beginPath();c.moveTo(s*.9,0);c.lineTo(-s*.5,-s*.7);c.lineTo(-s*.2,0);c.lineTo(-s*.5,s*.7);c.closePath();c.fill();c.restore()}
function person(c,x,y,s,o={}){c.save();c.translate(x,y);c.scale(s,s);
  const step=o.step||0;
  c.fillStyle=INK;c.save();c.translate(-24,-150);c.rotate(step*.35);rr(c,-16,0,32,150,14);c.fill();c.fillStyle=o.shoe||CR;rr(c,-26,136,48,20,10);c.fill();c.restore();
  c.save();c.translate(24,-150);c.rotate(-step*.35);c.fillStyle=INK;rr(c,-16,0,32,150,14);c.fill();c.fillStyle=o.shoe||CR;rr(c,-22,136,48,20,10);c.fill();c.restore();
  const sh=o.shirt||CB;c.lineCap='round';c.strokeStyle=sh;c.lineWidth=30;
  c.beginPath();c.moveTo(-58,-290);c.quadraticCurveTo(-92-step*20,-230,-82-step*20,-168);c.stroke();
  if(o.point){c.beginPath();c.moveTo(58,-292);c.quadraticCurveTo(108,-340,128,-410);c.stroke();c.fillStyle=SK;c.beginPath();c.arc(130,-424,17,0,7);c.fill()}
  else if(o.armsUp){c.beginPath();c.moveTo(58,-292);c.quadraticCurveTo(100,-350,96,-430);c.stroke();c.beginPath();c.moveTo(-58,-292);c.quadraticCurveTo(-100,-350,-96,-430);c.stroke();c.fillStyle=SK;c.beginPath();c.arc(96,-444,17,0,7);c.arc(-96,-444,17,0,7);c.fill()}
  else{c.beginPath();c.moveTo(58,-290);c.quadraticCurveTo(92+step*20,-230,82+step*20,-168);c.stroke();c.fillStyle=SK;c.beginPath();c.arc(82+step*20,-158,16,0,7);c.fill()}
  if(!o.armsUp){c.fillStyle=SK;c.beginPath();c.arc(-82-step*20,-158,16,0,7);c.fill()}
  c.fillStyle=sh;c.beginPath();c.moveTo(-66,-140);c.lineTo(-70,-280);c.quadraticCurveTo(-70,-318,-30,-318);c.lineTo(30,-318);c.quadraticCurveTo(70,-318,70,-280);c.lineTo(66,-140);c.closePath();c.fill();
  c.fillStyle='rgba(23,34,53,.18)';rr(c,-36,-205,72,34,12);c.fill();
  c.fillStyle=SK;rr(c,-14,-338,28,30,8);c.fill();const hx=o.look?8:0,hy=o.look?-6:(o.down?6:0);
  c.beginPath();c.arc(hx,-372+hy,46,0,7);c.fill();
  c.fillStyle=INK;c.beginPath();c.arc(hx,-380+hy,48,Math.PI*1.02,Math.PI*1.98);c.quadraticCurveTo(hx+30,-400+hy,hx-44,-372+hy);c.fill();
  c.beginPath();c.arc(hx+14,-366+hy+(o.down?6:0),4.5,0,7);c.arc(hx-12,-366+hy+(o.down?6:0),4.5,0,7);c.fill();
  if(o.smile){c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.arc(hx+1,-350+hy,12,.2,Math.PI-.2);c.stroke()}
  c.restore()}
function icon(c,k,x,y,col=INK){c.save();c.translate(x,y);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=6;c.lineCap='round';c.lineJoin='round';
  if(k===0){rr(c,-20,-4,40,30,6);c.fill();c.beginPath();c.moveTo(-12,-4);c.lineTo(-12,-16);c.arc(0,-16,12,Math.PI,0);c.lineTo(12,-24);c.stroke()}
  if(k===1){c.beginPath();c.rect(-20,-24,28,48);c.stroke();c.beginPath();c.moveTo(0,0);c.lineTo(24,0);c.moveTo(16,-8);c.lineTo(24,0);c.lineTo(16,8);c.stroke()}
  if(k===2){for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,14-i*13,20,7,0,0,7);c.fill()}}
  if(k===3){c.beginPath();c.moveTo(-18,-22);c.lineTo(18,-22);c.quadraticCurveTo(18,6,0,8);c.quadraticCurveTo(-18,6,-18,-22);c.fill();c.fillRect(-3,6,6,10);rr(c,-14,16,28,8,3);c.fill();c.beginPath();c.arc(-18,-12,8,Math.PI*.5,Math.PI*1.5);c.moveTo(18,-20);c.arc(18,-12,8,-Math.PI*.5,Math.PI*.5);c.stroke()}
  if(k===4){c.beginPath();c.moveTo(-22,-2);c.lineTo(0,-22);c.lineTo(22,-2);c.stroke();c.fillRect(-15,-2,30,24);c.fillStyle=IV;c.fillRect(-4,8,8,14)}
  c.restore()}
function signBoard(c,x0,y,w,right,a,col,label,tc,k,al=1,lift=0,outline=0){const dir=right?1:-1;
  c.save();c.globalAlpha=al;c.translate(x0,y+lift);c.scale(dir*a,1);
  c.fillStyle='rgba(23,34,53,.16)';c.beginPath();c.moveTo(0,10);c.lineTo(w-50,10);c.lineTo(w+6,70);c.lineTo(w-50,130);c.lineTo(0,130);c.fill();
  c.fillStyle=col;c.beginPath();c.moveTo(0,0);c.lineTo(w-56,0);c.lineTo(w,60);c.lineTo(w-56,120);c.lineTo(0,120);c.closePath();c.fill();
  if(outline>0){c.strokeStyle=INK;c.lineWidth=6*outline;c.stroke()}
  c.fillStyle='rgba(23,34,53,.35)';c.beginPath();c.arc(18,22,5,0,7);c.arc(18,98,5,0,7);c.fill();c.restore();
  if(a>.6){c.save();c.globalAlpha=al*O(a,.6,1);const ix=right?x0+80:x0-80;c.fillStyle=IV;c.beginPath();c.arc(ix,y+60+lift,40,0,7);c.fill();icon(c,k,ix,y+60+lift,INK);
    let fs=30;font(c,750,fs,DISP,'normal');while(c.measureText(label).width>w-170&&fs>18){fs-=2;font(c,750,fs,DISP,'normal')}
    c.fillStyle=tc;c.textAlign=right?'left':'right';c.fillText(label,right?x0+136:x0-136,y+70+lift);c.restore()}}
function rocket(c,x,y,rot,bands,tf,labelsA,showLabels,labX){c.save();c.translate(x,y);c.rotate(rot);
  if(tf>0){c.save();c.globalAlpha=tf;c.fillStyle=TL;c.beginPath();c.moveTo(-58,270);c.quadraticCurveTo(0,270+300*tf,58,270);c.fill();c.fillStyle=IV;c.beginPath();c.moveTo(-26,270);c.quadraticCurveTo(0,270+150*tf,26,270);c.fill();c.restore()}
  c.fillStyle=CB;c.beginPath();c.moveTo(-100,110);c.quadraticCurveTo(-180,170,-170,262);c.lineTo(-100,220);c.fill();c.beginPath();c.moveTo(100,110);c.quadraticCurveTo(180,170,170,262);c.lineTo(100,220);c.fill();
  c.fillStyle='#DCDAD0';rr(c,-100,-200,200,440,30);c.fill();c.fillStyle=IV;rr(c,-100,-200,182,440,30);c.fill();
  [CB,TL,PE,AM].forEach((col,k)=>{c.fillStyle=col;c.fillRect(-100,-82+k*64,200,52)});
  c.fillStyle=INK;c.beginPath();c.arc(0,-140,34,0,7);c.fill();c.fillStyle=CB;c.beginPath();c.arc(0,-140,24,0,7);c.fill();c.fillStyle=IV;c.beginPath();c.arc(-8,-148,7,0,7);c.fill();
  c.fillStyle=INK;c.beginPath();c.moveTo(-60,240);c.lineTo(60,240);c.lineTo(78,276);c.lineTo(-78,276);c.fill();
  c.fillStyle=TL;c.beginPath();c.moveTo(-100,-198);c.quadraticCurveTo(-100,-330,0,-400);c.quadraticCurveTo(100,-330,100,-198);c.closePath();c.fill();
  c.fillStyle='rgba(23,34,53,.15)';c.beginPath();c.moveTo(30,-198);c.quadraticCurveTo(70,-300,0,-400);c.quadraticCurveTo(100,-330,100,-198);c.fill();c.restore();
  bands.forEach(([t,d],k)=>{const a=showLabels(k);if(a<=0)return;const ly=-56+k*64,wx=x+Math.cos(rot)*100-Math.sin(rot)*ly,wy=y+Math.sin(rot)*100+Math.cos(rot)*ly,tx=labX;
    c.strokeStyle='rgba(246,245,238,.5)';c.lineWidth=3;c.beginPath();c.moveTo(wx,wy);c.lineTo(lerp(wx,tx-14,a),wy);c.stroke();c.fillStyle=IV;c.beginPath();c.arc(wx,wy,6,0,7);c.fill();
    c.save();c.globalAlpha=a;font(c,800,34,DISP,'normal');c.fillStyle=IV;c.fillText(t,tx,wy+4);c.restore();if(d)mono(c,d,tx,wy+32,PE,17,'left',a,500)})}
function booster(c,x,y,rot,flame,label){c.save();c.translate(x,y);c.rotate(rot);
  if(flame>0){c.fillStyle=CR;c.globalAlpha=flame;c.beginPath();c.moveTo(-60,330);c.quadraticCurveTo(0,500,60,330);c.fill();c.fillStyle=AM;c.beginPath();c.moveTo(-32,330);c.quadraticCurveTo(0,430,32,330);c.fill();c.globalAlpha=1}
  c.fillStyle='#E9A53A';rr(c,-100,0,200,300,24);c.fill();c.fillStyle=AM;rr(c,-100,0,184,300,24);c.fill();
  c.fillStyle=INK;c.beginPath();c.moveTo(-60,300);c.lineTo(60,300);c.lineTo(76,336);c.lineTo(-76,336);c.fill();
  let fs=44;font(c,900,fs,DISP,'expanded');while(c.measureText(label).width>170&&fs>20){fs-=2;font(c,900,fs,DISP,'expanded')}c.fillStyle=INK;c.textAlign='center';c.fillText(label,-8,168);c.restore()}
function house(c,p,ox,oy,labs,leftDoor){const cols=[CB,TL,PE,AM];
  for(let row=0;row<4;row++)for(let i=0;i<5;i++){const k=row*5+i,a=O(p,.12+k*.022,.24+k*.022);if(a<=0)continue;if(row>=1&&i===2)continue;
    const x=ox-256+i*104,y=oy+228-row*76;c.save();c.globalAlpha=a;c.fillStyle=cols[(k+row)%4];rr(c,x,y-180*(1-a),96,68,10);c.fill();c.restore();
    if(i===0&&a>.9&&labs[row])mono(c,labs[row].toLowerCase(),x+48,y+42,row===3?INK:IV,15,'center',1,600)}
  const dt=S(p,.3,.62),dx=lerp(leftDoor[0],ox-52,dt),dy=lerp(leftDoor[1],oy+84,dt),dw=lerp(132,104,dt),dh=lerp(270,236,dt);
  c.save();c.translate(dx+dw/2,dy+dh);c.rotate(-.25*Math.sin(Math.PI*dt));c.fillStyle=PE;rr(c,-dw/2,-dh,dw,dh,10);c.fill();c.fillStyle='#8B8DE6';rr(c,-dw/2+14,-dh+16,dw-28,dh*.4,6);c.fill();c.fillStyle=INK;c.beginPath();c.arc(dw/2-20,-dh*.45,6,0,7);c.fill();
  if(dt<.5){rr(c,-40,-dh-42,80,30,6);c.fillStyle=TL;c.globalAlpha=1-dt*2;c.fill();mono(c,'EXIT',0,-dh-20,IV,16,'center',1-dt*2)}c.restore();
  const rf=B(p,.6,.76);if(rf>0){c.save();c.translate(ox,oy);c.scale(1,rf);c.fillStyle='rgba(23,34,53,.18)';c.beginPath();c.moveTo(-310,16);c.lineTo(0,-210);c.lineTo(310,16);c.fill();c.fillStyle=CR;c.beginPath();c.moveTo(-310,0);c.lineTo(0,-226);c.lineTo(310,0);c.closePath();c.fill();c.fillStyle=INK;rr(c,140,-170,44,90,6);c.fill();c.restore()}}
function phone(c,cx,cy,p,rot=-.07){c.save();c.translate(cx,cy);c.rotate(rot);c.globalAlpha=O(p,.05,.2);
  c.fillStyle='rgba(23,34,53,.25)';rr(c,-170,-345,360,720,52);c.fill();c.fillStyle=INK;rr(c,-180,-360,360,720,52);c.fill();c.fillStyle='#24345A';rr(c,-160,-336,320,672,36);c.fill();c.fillStyle=INK;rr(c,-50,-336,100,22,11);c.fill();
  c.strokeStyle='rgba(163,165,244,.22)';c.lineWidth=2;for(let i=0;i<6;i++){c.beginPath();c.moveTo(-140,-260+i*100);c.lineTo(140,-260+i*100);c.stroke()}
  const r=K.rng(3);for(let i=0;i<8;i++){const x=-125+i*36,h=30+r()*60,y=200-i*40+r()*30,up=r()>.3;c.fillStyle=up?TL:CR;c.globalAlpha=.55*O(p,.1,.3);rr(c,x-8,y-h/2,16,h,4);c.fill()}c.restore();c.globalAlpha=1}
function tagCard(c,x,y,rot,a,l1,l2){c.save();c.translate(x,y);c.rotate(rot);c.globalAlpha=a;c.fillStyle='rgba(23,34,53,.2)';rr(c,-140,-40,300,110,22);c.fill();c.fillStyle=CR;rr(c,-150,-55,300,110,22);c.fill();c.fillStyle=IV;c.beginPath();c.arc(-118,0,12,0,7);c.fill();
  let fs=36;font(c,900,fs,DISP,'expanded');const mw=Math.max(c.measureText(l1).width,c.measureText(l2||'').width);if(mw>230){fs=Math.max(18,fs*230/mw);font(c,900,fs,DISP,'expanded')}
  c.textAlign='center';c.fillStyle=IV;c.fillText(l1,20,l2?-6:12);if(l2){c.fillStyle=AM;c.fillText(l2,20,36)}c.restore()}

/* ---------- reference film scenes (Reference Video 2, 1080x1920) ---------- */
const stars=(()=>{const r=K.rng(5),a=[];for(let i=0;i<70;i++)a.push([r()*1920,r()*1920,1.5+r()*3,r()]);return a})();
const REF=[
 c=>{},c=>{},c=>{},c=>{},c=>{}];
REF[0]=(c,p)=>{c.fillStyle=IV;c.fillRect(0,0,1080,1920);
  const dr=440*B(p,0,.2);c.fillStyle=CB;c.beginPath();c.arc(540,1340,dr,0,7);c.fill();c.fillStyle='rgba(246,245,238,.14)';c.beginPath();c.arc(540,1340,dr*.72,0,7);c.fill();
  phone(c,540,lerp(1600,1330,O(p,.05,.25)),p);
  const up=[[430,1590],[480,1520],[520,1548],[566,1440],[602,1462],[642,1330],[682,1180],[704,1030],[736,890],[774,800]];
  c.strokeStyle=CR;c.lineWidth=22;c.lineCap='round';c.lineJoin='round';
  const tip=p<.6?K.polyPart(c,up,S(p,.1,.45)):K.polyPart(c,[...up,[824,846],[868,940]],lerp(.88,1,S(p,.6,.8)));if(S(p,.1,.45)>.05)arrowHead(c,tip.end,tip.dir,44,CR);
  const fall=S(p,.62,.95);[[850,740],[920,920],[640,760],[910,1120],[190,1080]].forEach(([x,y],i)=>{const a=O(p,.22+i*.05,.34+i*.05);if(a<=0)return;coin(c,x,y-30*(1-a)+380*fall*fall*(1+i*.15),40*eb(a),1-fall*.8)});
  const ta=O(p,.18,.36);if(ta>0)tagCard(c,250,1000,-.18+.25*fall,ta,'GET RICH','QUICK');
  epTag(c,90,150,'EP 01','WHY PEOPLE START TRADING',false,O(p,0,.12));
  vblock(c,{text:'If you started trading because you wanted to get rich quickly,',x:90,y:250,size:66,color:INK,reveal:S(p,0,.28)});
  vblock(c,{text:'you might already be making your first mistake.',x:90,y:560,size:66,color:CR,reveal:S(p,.58,.78)})};
REF[1]=(c,p)=>{c.fillStyle=IV;c.fillRect(0,0,1080,1920);c.fillStyle=P2;c.fillRect(0,1650,1080,270);c.fillStyle='#E1DFD2';c.beginPath();c.ellipse(540,1652,180,26,0,0,7);c.fill();
  const ph=1080*S(p,0,.15);c.fillStyle=INK;rr(c,527,1650-ph,26,ph,8);c.fill();c.beginPath();c.arc(540,1650-ph,18,0,7);c.fill();
  const L=[['Financial freedom',TL,0,IV],['Escape the 9-to-5',PE,1,INK],['Make money',AM,2,INK],['Prove myself',CR,3,IV],['A better future',CB,4,IV]],hi=S(p,.78,.92);
  L.forEach(([t,col,k,tc],i)=>{const a=B(p,.12+i*.08,.26+i*.08);if(a<=0)return;const focus=i===1||i===2;signBoard(c,i%2===0?554:526,640+i*150,450,i%2===0,a,col,t,tc,k,focus?1:1-.7*hi,focus?-12*hi:0,focus?hi:0)});
  person(c,lerp(-80,236,O(p,.05,.3)),1690,.9,{shirt:CB,point:p>.45,look:p>.45,step:p<.3?Math.sin(p*60)*.6:0});
  epTag(c,90,150,'EP 01','WHY PEOPLE START TRADING',false,O(p,0,.1));
  vblock(c,{text:'Five reasons people start trading',x:90,y:250,size:72,color:INK,reveal:S(p,.04,.3)});
  vblock(c,{text:'All valid. Each one pulls you differently.',x:990,y:1730,size:36,w:650,color:INK,align:'right',maxW:560,reveal:S(p,.6,.8),stretch:'normal'})};
REF[2]=(c,p)=>{c.fillStyle=IV;c.fillRect(0,0,1080,1920);epTag(c,90,150,'EP 01','WHY PEOPLE START TRADING',false,O(p,0,.1));
  vblock(c,{text:'The motive shapes the method.',x:90,y:250,size:72,color:INK,reveal:S(p,0,.2)});
  const panels=[{y:440,tint:'#FFE0D8',col:CR,dark:'#C9452F',title:'Trading to get rich fast',size:.92,stop:false,dots:14,line:[[0,.2],[.14,.35],[.28,.5],[.4,.78],[.5,.95],[.58,.42],[.66,.62],[.76,.14],[.88,.2],[1,.04]],dx:-1},
                {y:1090,tint:'#CFEFE6',col:TL,dark:'#0E7D68',title:'Trading to build',size:.3,stop:true,dots:3,line:[[0,.2],[.1,.26],[.2,.23],[.3,.33],[.4,.31],[.5,.42],[.6,.39],[.7,.5],[.8,.48],[.9,.6],[1,.68]],dx:1}];
  panels.forEach((P,k)=>{const a=O(p,.04+k*.06,.24+k*.06);c.save();c.translate((1-a)*1100*P.dx,0);c.fillStyle=P.tint;rr(c,60,P.y,960,600,40);c.fill();
    vblock(c,{text:P.title,x:110,y:P.y+40,size:42,color:P.dark,reveal:S(p,.18+k*.05,.32+k*.05)});
    const y1=P.y+150;mono(c,'POSITION SIZE',110,y1,SL,20);c.fillStyle='rgba(23,34,53,.1)';rr(c,110,y1+22,400,30,15);c.fill();c.fillStyle=P.col;rr(c,110,y1+22,Math.max(30,400*P.size*S(p,.28,.5)),30,15);c.fill();
    const y2=P.y+270;mono(c,'STOP-LOSS',110,y2,SL,20);const on=P.stop&&p>.42;c.fillStyle=on?TL:'rgba(23,34,53,.18)';rr(c,110,y2+20,120,56,28);c.fill();c.fillStyle=IV;c.beginPath();c.arc(on?202:138,y2+48,22,0,7);c.fill();mono(c,p>.42?(P.stop?'ON':'OFF'):'—',252,y2+58,P.dark,24);
    const y3=P.y+400;mono(c,'TRADES',110,y3,SL,20);const nd=Math.round(P.dots*S(p,.42,.62));for(let i=0;i<nd;i++){c.fillStyle=P.col;c.beginPath();c.arc(122+i*28,y3+40,11,0,7);c.fill()}
    c.fillStyle=IV;rr(c,570,P.y+130,410,330,24);c.fill();mono(c,'ILLUSTRATIVE',960,P.y+440,SL,16,'right');
    c.strokeStyle=P.col;c.lineWidth=8;c.lineCap='round';c.lineJoin='round';const pts=P.line.map(([u,v])=>[600+u*350,P.y+410-v*250]);const tp=S(p,.5+k*.08,.75+k*.06),tip=K.polyPart(c,pts,tp);if(tp>.02){c.fillStyle=P.col;c.beginPath();c.arc(...tip.end,11,0,7);c.fill()}c.restore()});
  c.save();c.globalAlpha=O(p,.3,.4);c.fillStyle=INK;c.beginPath();c.arc(540,1065,34,0,7);c.fill();c.restore();mono(c,'VS',542,1073,IV,20,'center',O(p,.3,.4));
  vblock(c,{text:'Need it fast → bigger size, no stop, more trades.',x:90,y:1722,size:36,w:650,color:INK,maxW:900,reveal:S(p,.76,.92),stretch:'normal'})};
REF[3]=(c,p)=>{c.fillStyle=INK;c.fillRect(0,0,1080,1920);
  stars.forEach(([x,y,r,t])=>{if(x>1080)return;c.fillStyle=PE;c.globalAlpha=.25+.45*t;c.beginPath();c.arc(x,(y+p*120*t)%1920,r,0,7);c.fill()});c.globalAlpha=1;
  c.setLineDash([4,22]);c.strokeStyle='rgba(163,165,244,.45)';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(200,1920);c.bezierCurveTo(300,1500,560,1500,580,600);c.stroke();c.setLineDash([]);
  const rx=575,ry=1170-110*S(p,0,1),rot=.06,sep=S(p,.3,.55);booster(c,rx-150*sep,ry+282+230*sep,rot-.4*sep,1-sep,'MONEY');
  rocket(c,rx,ry,rot,[['Plan','entry · exit · stop'],['Risk rules','same small risk'],['Journal','log every trade'],['Patience','wait for the setup']],S(p,.42,.6),null,k=>O(p,.55+k*.06,.7+k*.06),740);
  mono(c,'MONEY',90,1470,AM,24,'left',O(p,.45,.6));mono(c,'why you start',90,1504,PE,20,'left',O(p,.48,.62),500);
  epTag(c,90,150,'EP 01','WHY PEOPLE START TRADING',true,O(p,0,.1));
  vblock(c,{text:'Money can be the reason you start.',x:90,y:250,size:62,color:AM,reveal:S(p,0,.22)});
  vblock(c,{text:'Discipline must be the reason you continue.',x:90,y:420,size:62,color:IV,reveal:S(p,.45,.65)})};
REF[4]=(c,p)=>{c.fillStyle=IV;c.fillRect(0,0,1080,1920);
  const sr=380*O(p,0,.35);c.fillStyle=AM;c.beginPath();c.arc(540,1560,sr,Math.PI,0);c.fill();c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.arc(540,1560,sr*.7,Math.PI,0);c.fill();
  c.fillStyle=INK;c.fillRect(0,1560,1080,360);
  c.save();c.setLineDash([12,10]);c.strokeStyle=SL;c.lineWidth=4;rr(c,96,1290,132,270,10);c.globalAlpha=O(p,.3,.45)*.8;c.stroke();c.restore();
  mono(c,'escape',162,1268,SL,22,'center',O(p,.05,.2));if(p>.22){c.strokeStyle=CR;c.lineWidth=6;c.beginPath();c.moveTo(110,1260);c.lineTo(lerp(110,214,O(p,.22,.3)),1260);c.stroke()}
  house(c,p,540,1240,['plan','risk','journal','patience'],[96,1290]);
  epTag(c,90,150,'EP 01','WHY PEOPLE START TRADING',false,O(p,0,.1));
  vblock(c,{text:'Don’t trade to escape your life.',x:90,y:250,size:70,color:INK,reveal:S(p,.04,.26)});
  vblock(c,{text:'Trade to build a better version of it.',x:90,y:430,size:70,color:CB,reveal:S(p,.66,.86)});
  mono(c,'EPISODE 01 · WHY PEOPLE START TRADING',540,1760,PE,22,'center',O(p,.8,.95))};

/* ---------- motif generators (1000x1000 visual box) ---------- */
const DEF={signpost:['Freedom','Escape','Money','Respect','Future'],compare:['Fast money','Slow build'],rocket:['MONEY','Plan','Risk rules','Journal','Patience'],house:['plan','risk','journal','patience'],phone:['GET RICH','QUICK'],stairs:['Show up','Follow the plan','Review','Repeat'],scale:['Risk','Reward'],word:['Discipline']};
const lab=(S0,m,i)=>(S0.labels&&S0.labels[i])||DEF[m]?.[i]||'';
const M={
 desk:{dark:true,draw(c,p,S0){c.fillStyle='#22304A';rr(c,40,60,280,300,20);c.fill();c.fillStyle=INK;c.fillRect(176,60,8,300);c.fillRect(40,206,280,8);
   c.fillStyle=AM;c.beginPath();c.arc(250,130,34,0,7);c.fill();c.fillStyle='#22304A';c.beginPath();c.arc(266,120,30,0,7);c.fill();
   const r=K.rng(S0.seed);for(let i=0;i<14;i++){c.fillStyle=PE;c.globalAlpha=.6*r();c.beginPath();c.arc(50+r()*260,70+r()*130,2+r()*2,0,7);c.fill()}c.globalAlpha=1;
   c.fillStyle=IV;c.beginPath();c.arc(780,170,92,0,7);c.fill();c.strokeStyle=INK;c.lineWidth=8;c.stroke();
   const hm=-Math.PI/2+(3+14/60)/12*Math.PI*2+p*.4,mm=-Math.PI/2+14/60*Math.PI*2+p*Math.PI*2;c.lineCap='round';c.lineWidth=10;c.beginPath();c.moveTo(780,170);c.lineTo(780+Math.cos(hm)*48,170+Math.sin(hm)*48);c.stroke();c.lineWidth=6;c.beginPath();c.moveTo(780,170);c.lineTo(780+Math.cos(mm)*72,170+Math.sin(mm)*72);c.stroke();
   const glow=c.createRadialGradient(500,700,10,500,700,420);glow.addColorStop(0,'rgba(255,198,92,'+(.35+.1*Math.sin(p*20))+')');glow.addColorStop(1,'rgba(255,198,92,0)');c.fillStyle=glow;c.fillRect(0,300,1000,700);
   person(c,500,930,1.02,{shirt:S0.accentShirt||CB,down:true});
   c.fillStyle='#2B3B5C';rr(c,-20,760,1040,60,12);c.fill();c.fillStyle='#1E2B45';c.fillRect(40,820,40,180);c.fillRect(920,820,40,180);
   c.fillStyle='#C9C7BC';c.beginPath();c.moveTo(350,770);c.lineTo(650,770);c.lineTo(628,640);c.lineTo(372,640);c.closePath();c.fill();c.fillStyle=IV;c.beginPath();c.arc(500,705,12,0,7);c.fill();
   c.fillStyle=TL;c.save();c.translate(170,760);rr(c,-20,-10,40,10,4);c.fill();c.strokeStyle=TL;c.lineWidth=8;c.beginPath();c.moveTo(0,-10);c.lineTo(30,-130);c.lineTo(100,-150);c.stroke();c.fillStyle=AM;c.beginPath();c.moveTo(80,-170);c.lineTo(140,-160);c.lineTo(120,-120);c.fill();c.restore();
   c.fillStyle=IV;rr(c,740,700,90,60,8);c.fill();c.strokeStyle=IV;c.lineWidth=8;c.beginPath();c.arc(835,730,18,-1.2,1.2);c.stroke();
   for(let i=0;i<3;i++){const t=(p*1.5+i/3)%1;c.strokeStyle='rgba(246,245,238,'+(.5*(1-t))+')';c.lineWidth=4;c.beginPath();c.moveTo(770+i*14,690-t*80);c.quadraticCurveTo(760+i*14,670-t*80,775+i*14,650-t*80);c.stroke()}}},
 signpost:{draw(c,p,S0){const n=Math.min(5,Math.max(3,(S0.labels||[]).length||5)),cols=[TL,PE,AM,CR,CB],tcs=[IV,INK,INK,IV,IV];
   c.fillStyle=P2;rr(c,-60,930,1120,100,30);c.fill();const ph=900*S(p,0,.15);c.fillStyle=INK;rr(c,487,960-ph,26,ph,8);c.fill();c.beginPath();c.arc(500,960-ph,18,0,7);c.fill();
   for(let i=0;i<n;i++){const a=B(p,.12+i*.09,.28+i*.09);if(a<=0)continue;const y=100+i*(760/n);signBoard(c,i%2===0?514:486,y,420,i%2===0,a,cols[i],lab(S0,'signpost',i),tcs[i],i)}
   person(c,lerp(-60,150,O(p,.05,.3)),990,.66,{shirt:CR,point:p>.45,look:p>.45,step:p<.3?Math.sin(p*60)*.6:0})}},
 compare:{draw(c,p,S0){const jar=(x,col,lvl,title,dark,drain)=>{c.fillStyle=col+'26';rr(c,x-230,60,460,900,40);c.fill();
     vblock(c,{text:title,x,y:90,size:40,color:dark,align:'center',maxW:420,reveal:S(p,.05,.25),stretch:'normal'});
     c.fillStyle='rgba(23,34,53,.08)';rr(c,x-150,320,300,500,40);c.fill();c.strokeStyle=INK;c.lineWidth=8;rr(c,x-150,320,300,500,40);c.stroke();c.fillStyle=INK;rr(c,x-120,290,240,40,12);c.fill();
     const n=Math.round(lvl*14);for(let i=0;i<n;i++){const row=Math.floor(i/2),cx=x-50+(i%2)*100+(row%2)*12,cy=780-row*40;c.fillStyle='#E9A53A';c.beginPath();c.ellipse(cx,cy+6,46,16,0,0,7);c.fill();c.fillStyle=AM;c.beginPath();c.ellipse(cx,cy,46,16,0,0,7);c.fill()}
     if(drain>0){c.strokeStyle=INK;c.lineWidth=5;c.beginPath();c.moveTo(x+90,600);c.lineTo(x+110,640);c.lineTo(x+95,670);c.lineTo(x+120,720);c.stroke();for(let i=0;i<3;i++){const t=(p*2+i/3)%1;if(drain*t>0)coin(c,x+130+t*30,700+t*220,20,drain*(1-t))}}};
   const f=S(p,.15,.45),d=S(p,.5,.85);jar(255,CR,clamp(f*1.1-d*.9),lab(S0,'compare',0),'#C9452F',d);jar(745,TL,S(p,.15,.9)*.85,lab(S0,'compare',1),'#0E7D68',0);
   c.fillStyle=INK;c.beginPath();c.arc(500,560,34,0,7);c.fill();mono(c,'VS',502,568,IV,20,'center');
   if(S0.labels&&S0.labels[2])mono(c,S0.labels[2].toUpperCase(),255,900,SL,20,'center',S(p,.6,.8));if(S0.labels&&S0.labels[3])mono(c,S0.labels[3].toUpperCase(),745,900,SL,20,'center',S(p,.6,.8))}},
 rocket:{dark:true,draw(c,p,S0){stars.forEach(([x,y,r,t])=>{if(x>1000||y>1000)return;c.fillStyle=PE;c.globalAlpha=.25+.45*t;c.beginPath();c.arc(x,(y+p*80*t)%1000,r,0,7);c.fill()});c.globalAlpha=1;
   const rx=420,ry=480-80*S(p,0,1),sep=S(p,.3,.55);booster(c,rx-130*sep,ry+282+160*sep,.06-.4*sep,1-sep,lab(S0,'rocket',0).toUpperCase());
   c.save();c.translate(rx,ry);c.scale(.82,.82);c.translate(-rx,-ry);rocket(c,rx,ry,.06,[1,2,3,4].map(i=>[lab(S0,'rocket',i),'']),S(p,.42,.6),null,()=>0,700);c.restore();
   [1,2,3,4].forEach((i,k)=>{const a=O(p,.55+k*.06,.7+k*.06);if(a<=0)return;const wy=ry+(-56+k*64)*.82;c.strokeStyle='rgba(246,245,238,.5)';c.lineWidth=3;c.beginPath();c.moveTo(rx+84,wy);c.lineTo(lerp(rx+84,650,a),wy);c.stroke();c.save();c.globalAlpha=a;font(c,800,34,DISP,'normal');c.fillStyle=IV;c.fillText(lab(S0,'rocket',i),664,wy+12);c.restore()})}},
 house:{draw(c,p,S0){const sr=380*O(p,0,.35);c.fillStyle=AM;c.beginPath();c.arc(500,780,sr,Math.PI,0);c.fill();c.fillStyle=INK;c.fillRect(-60,780,1120,240);
   c.save();c.setLineDash([12,10]);c.strokeStyle=SL;c.lineWidth=4;rr(c,40,510,132,270,10);c.globalAlpha=O(p,.3,.45)*.8;c.stroke();c.restore();
   house(c,p,500,460,[0,1,2,3].map(i=>lab(S0,'house',i)),[40,510])}},
 phone:{draw(c,p,S0){const dr=400*B(p,0,.2);c.fillStyle=CB;c.beginPath();c.arc(500,620,dr,0,7);c.fill();c.fillStyle='rgba(246,245,238,.14)';c.beginPath();c.arc(500,620,dr*.72,0,7);c.fill();
   c.save();c.translate(500,600);c.scale(.82,.82);phone(c,0,0,p);c.restore();
   const up=[[390,840],[430,790],[465,810],[505,720],[535,738],[570,630],[600,500],[620,380],[650,250],[690,170]];c.strokeStyle=CR;c.lineWidth=20;c.lineCap='round';c.lineJoin='round';
   const tip=p<.6?K.polyPart(c,up,S(p,.1,.45)):K.polyPart(c,[...up,[740,210],[780,300]],lerp(.88,1,S(p,.6,.8)));if(S(p,.1,.45)>.05)arrowHead(c,tip.end,tip.dir,40,CR);
   const fall=S(p,.62,.95);[[790,160],[860,330],[560,150],[860,520],[150,460]].forEach(([x,y],i)=>{const a=O(p,.22+i*.05,.34+i*.05);if(a<=0)return;coin(c,x,y-30*(1-a)+300*fall*fall*(1+i*.15),36*eb(a),1-fall*.8)});
   const ta=O(p,.18,.36);if(ta>0)tagCard(c,190,380,-.18+.25*fall,ta,lab(S0,'phone',0).toUpperCase(),(S0.labels&&S0.labels.length===1)?'':lab(S0,'phone',1).toUpperCase())}},
 stairs:{draw(c,p,S0){const n=4,sw=200,sh=150;for(let i=0;i<n;i++){const a=B(p,.05+i*.07,.2+i*.07);if(a<=0)continue;const x=60+i*sw,y=960-(i+1)*sh;c.save();c.translate(x,960);c.scale(1,a);
     c.fillStyle=[CB,TL,PE,AM][i];c.fillRect(0,-(i+1)*sh,sw,(i+1)*sh);c.fillStyle='rgba(23,34,53,.12)';c.fillRect(0,-(i+1)*sh,sw,14);c.restore();
     if(a>.9)mono(c,lab(S0,'stairs',i).toUpperCase(),x+sw/2,y+60,i===2||i===3?INK:IV,18,'center',O(p,.25+i*.07,.35+i*.07))}
   const fx=60+n*sw-20,fy=960-n*sh;c.strokeStyle=INK;c.lineWidth=8;c.beginPath();c.moveTo(fx,fy);c.lineTo(fx,fy-180*S(p,.3,.45));c.stroke();if(p>.4){c.fillStyle=CR;c.beginPath();c.moveTo(fx,fy-180);c.lineTo(fx-110*S(p,.4,.5),fy-150);c.lineTo(fx,fy-120);c.fill()}
   const prog=S(p,.3,.92)*(n-1),i0=Math.floor(prog),f=prog-i0,hop=Math.sin(Math.PI*K.eio(f))*60;const px=60+sw/2+(i0+K.eio(f))*sw,py=960-(i0+1)*sh-(f>.5?sh*K.eio((f-.5)*2):0)-hop;
   person(c,px,py,.62,{shirt:CR,step:Math.sin(f*Math.PI*2)*.6,armsUp:prog>=n-1.05,smile:prog>=n-1.05})}},
 scale:{draw(c,p,S0){c.fillStyle=INK;rr(c,470,300,60,640,12);c.fill();rr(c,330,920,340,50,16);c.fill();
   const ang=lerp(-.32,0,S(p,.3,.75))+.03*Math.sin(p*12)*(1-S(p,.6,.9));c.save();c.translate(500,300);c.rotate(ang);
   c.fillStyle=CB;rr(c,-400,-18,800,36,18);c.fill();c.fillStyle=AM;c.beginPath();c.arc(0,0,30,0,7);c.fill();c.restore();
   const end=s=>[500+Math.cos(ang)*380*s,300+Math.sin(ang)*380*s];
   [[-1,CR,lab(S0,'scale',0),lerp(3,2,S(p,.3,.75))],[1,TL,lab(S0,'scale',1),lerp(1,2,S(p,.3,.75))]].forEach(([s,col,t,w])=>{const [ex,ey]=end(s);c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.moveTo(ex,ey);c.lineTo(ex-110,ey+220);c.moveTo(ex,ey);c.lineTo(ex+110,ey+220);c.stroke();
     c.fillStyle=INK;c.beginPath();c.ellipse(ex,ey+226,130,22,0,0,Math.PI);c.fill();for(let i=0;i<Math.round(w*2);i++){c.fillStyle=col;rr(c,ex-90+(i%3)*62,ey+150-Math.floor(i/3)*58,54,54,10);c.fill()}
     let fs=34;font(c,800,fs,DISP,'normal');c.fillStyle=INK;c.textAlign='center';c.globalAlpha=S(p,.1,.3);c.fillText(t,ex,ey+300);c.globalAlpha=1})}},
 word:{draw(c,p,S0){const w=(lab(S0,'word',0)).toUpperCase(),r=K.rng(S0.seed);
   const shapes=[[CB,180,260,120],[TL,820,240,90],[CR,760,780,140],[AM,220,800,100],[PE,520,150,70]];
   shapes.forEach(([col,x,y,sz],i)=>{const m=(Math.sin(p*Math.PI*2+i)+1)/2,k=K.eio(m),a=O(p,i*.06,.2+i*.06);c.save();c.translate(x,y+Math.sin(p*6+i)*12);c.rotate(p*.8*(i%2?1:-1));c.globalAlpha=a;c.fillStyle=col;
     c.beginPath();const N=40;for(let j=0;j<=N;j++){const t=j/N*Math.PI*2,ct=Math.cos(t),st=Math.sin(t),e=lerp(2,8,k),rx=Math.sign(ct)*Math.pow(Math.abs(ct),2/e)*sz*a,ry=Math.sign(st)*Math.pow(Math.abs(st),2/e)*sz*a;j?c.lineTo(rx,ry):c.moveTo(rx,ry)}c.fill();c.restore()});
   let fs=300;font(c,900,fs,DISP,'expanded');while(c.measureText(w).width>940&&fs>70){fs-=10;font(c,900,fs,DISP,'expanded')}
   c.save();c.beginPath();c.rect(0,0,1000*S(p,.08,.4),1000);c.clip();c.fillStyle=INK;c.textAlign='center';c.fillText(w,500,500+fs*.35);c.restore();
   c.fillStyle=CR;rr(c,500-c.measureText(w).width/2,520+fs*.4,c.measureText(w).width*S(p,.35,.55),18,9);c.fill();
   (S0.labels||[]).slice(1,4).forEach((t,i)=>mono(c,t.toUpperCase(),500,720+fs*.3+i*40,SL,22,'center',S(p,.5+i*.08,.6+i*.08)))}},
 media:{draw(c,p,S0,img){c.fillStyle=TL;rr(c,-20,-20,1040,1040,48);c.globalAlpha=O(p,0,.2);c.fill();c.globalAlpha=1;c.save();rr(c,20,20,960,960,40);c.clip();c.fillStyle=P2;c.fillRect(0,0,1000,1000);
   if(img){const iw=img.videoWidth||img.naturalWidth||img.width,ih=img.videoHeight||img.naturalHeight||img.height;if(iw){const s=Math.max(960/iw,960/ih)*(1+.08*p);c.drawImage(img,500-iw*s/2,500-ih*s/2,iw*s,ih*s)}}c.restore();
   c.fillStyle=AM;c.beginPath();c.arc(960,60,70*B(p,.1,.3),0,7);c.fill();c.fillStyle=CR;rr(c,-40,880,180*O(p,.15,.35),80,40);c.fill()}}
};

function draw(ctx,spec,p,W,H,scale,media){ctx.save();ctx.setTransform(ctx.canvas.width/W,0,0,ctx.canvas.height/H,0,0);
  if(spec.kind==='ref'){REF[spec.ref](ctx,p);ctx.restore();return}
  const L=K.layout(W,H),m=M[spec.motif]||M.word,S0=spec,dark=!!m.dark,acc=[CB,TL,CR,PE][S0.seed%4];
  ctx.fillStyle=dark?INK:IV;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=dark?'rgba(163,165,244,.08)':K.rgba(acc,.12);const bx=L.vis.x+500*L.vis.s,by=L.vis.y+500*L.vis.s;ctx.beginPath();ctx.arc(bx,by,560*L.vis.s*B(p,0,.25),0,7);ctx.fill();
  ctx.save();K.camera(ctx,L,S0.camera,p,S0.motionAmt??1);K.visTo(ctx,L);m.draw(ctx,p,S0,media);ctx.restore();
  if(S0.eyebrow)epTag(ctx,L.text.x,L.text.y-100,S0.eyebrow.toUpperCase(),'',dark,O(p,0,.12));
  const hc=dark?IV:INK;if(S0.headline)vblock(ctx,{text:S0.headline,x:L.text.x,y:L.text.y,size:L.text.size*.92,color:hc,maxW:L.text.w,reveal:S(p,.02,.28)});
  if(S0.sub)vblock(ctx,{text:S0.sub,x:L.text.x,y:L.land?L.text.y+300:L.text.y+240,size:50,w:750,color:dark?AM:CR,maxW:L.text.w,reveal:S(p,.35,.6),stretch:'normal'});
  ctx.restore()}
function backdrop(c,W,H){c.fillStyle=IV;c.fillRect(0,0,W,H);c.fillStyle='rgba(70,103,255,.1)';c.beginPath();c.arc(W*.25,H*.6,H*.5,0,7);c.fill()}

window.STYLE_VECTOR={id:'vector',draw,backdrop,refCount:REF.length,motifs:Object.keys(M).filter(m=>m!=='media'),
  fonts:[`800 60px "Archivo"`,`900 60px "Archivo"`,`750 30px "Archivo"`,`600 20px "IBM Plex Mono"`,`500 20px "IBM Plex Mono"`],
  palette:[INK,IV,CB,TL,CR,AM,PE],caption:{font:DISP,color:INK,hi:CR,box:'rgba(246,245,238,.9)'},
  traits:{Palette:'Midnight ink on soft ivory; cobalt, teal, coral, amber and periwinkle used as solid flat fills.',Type:'Archivo heavy and semi-expanded for headlines, IBM Plex Mono for labels and counters.',Illustration:'Hand-built Bezier objects with internal detail: phone, signpost boards with icons, rockets, bricks, jars, a hooded character.',Motion:'Overshoot pops, unfolding boards, tumbling stages, masked headline reveals; objects hand off into the next idea.',Camera:'Gentle 2D push-ins and pans; flat, no perspective.',Atmosphere:'Bright, confident, editorial. Night scenes flip to ink with periwinkle stars.'}};
})();
