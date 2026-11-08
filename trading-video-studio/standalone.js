/* Standalone mode: when the page runs outside claude.ai, provide local stand-ins for
   the artifact runtime. Projects already fall back to browser storage in app.js;
   this adds file downloads and direct ElevenLabs voice generation with your own API key. */
(function(){
if(window.claude&&window.claude.use)return;
const KEY='tvs.elevenlabs.key',MODEL='tvs.elevenlabs.model',API='https://api.elevenlabs.io/v1';
const get=k=>{try{return localStorage.getItem(k)||''}catch(e){return''}};
const set=(k,v)=>{try{v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch(e){}};
const err=(m,code)=>Object.assign(new Error(m),{code});

async function el(path,opts={}){const key=get(KEY);if(!key)throw err('No ElevenLabs API key set','no_key');
  const r=await fetch(API+path,{...opts,headers:{'xi-api-key':key,...(opts.headers||{})}});
  if(!r.ok){let m=r.status+' '+r.statusText;try{const j=await r.json();m=(j.detail&&(j.detail.message||j.detail))||m}catch(e){}throw err(String(m),'http_'+r.status)}
  return r}

const mcp={
  async listTools(){return{servers:[{server:'ElevenLabs',authStatus:'ok',tools:[{name:'creative_generate_speech'},{name:'creative_list_voices'}]}]}},
  async callTool(server,name,args={}){
    if(name==='creative_list_voices'){const j=await(await el('/voices')).json();const q=(args.search||'').toLowerCase();
      let v=(j.voices||[]).map(x=>({voice_id:x.voice_id,name:x.name,description:x.description||Object.values(x.labels||{}).join(', ')}));
      if(q)v=v.filter(x=>(x.name+' '+x.description).toLowerCase().includes(q));return{payload:{voices:v}}}
    if(name==='creative_generate_speech'){
      const r=await el('/text-to-speech/'+encodeURIComponent(args.voice_id)+'?output_format=mp3_44100_128',{method:'POST',headers:{'Content-Type':'application/json',Accept:'audio/mpeg'},
        body:JSON.stringify({text:args.prompt,model_id:get(MODEL)||'eleven_multilingual_v2'})});
      const blob=await r.blob();return{payload:{_file:new File([blob],'voiceover-'+Date.now()+'.mp3',{type:'audio/mpeg'})}}}
    throw err('Unknown tool '+name,'unknown_tool')}
};

const downloads={async save({filename,data}){const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=filename||'download';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return{status:'delivered'}}};

window.claude={use:async n=>{if(n==='downloads')return downloads;if(n==='mcp')return get(KEY)?mcp:null;return null}};

/* Small key button in the nav. */
function addButton(){const host=document.querySelector('.projpick');if(!host)return;const b=document.createElement('button');b.className='btn sm ghost';
  const label=()=>b.textContent=get(KEY)?'ElevenLabs ✓':'Add ElevenLabs key';label();
  b.title='Your key is stored only in this browser and sent only to api.elevenlabs.io';
  b.onclick=()=>{const k=prompt('ElevenLabs API key (stored only in this browser). Leave empty to remove it.',get(KEY));if(k===null)return;set(KEY,k.trim());
    const m=prompt('Voice model ID',get(MODEL)||'eleven_multilingual_v2');if(m!==null)set(MODEL,m.trim());label();location.reload()};
  host.prepend(b)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',addButton):addButton();
})();
