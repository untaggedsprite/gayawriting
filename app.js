const SUPABASE_URL='https://yunwwocryohmvnfwbjig.supabase.co';
const SUPABASE_KEY='sb_publishable_XmVMsFZWZ_ZkMQVQyRnAmQ_FqllXED3';
const app=document.getElementById('app');
const state={session:null,user:null,view:'threads',threadId:null,threads:[],posts:[],personas:[],mine:[],selectedPersonaId:null,editPersonaId:null,modal:null,fatal:null};
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const $=id=>document.getElementById(id);let supa=null;
function md(v){let s=esc(v||'');s=s.replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\n{2,}/g,'</p><p>').replace(/\n/g,'<br>');return '<p>'+s+'</p>';}
function styleSafe(v){
  return String(v||'').replace(/[;{}<>]/g,'').trim();
}

function cssFontFamily(v){
  const raw=styleSafe(v||'');
  if(!raw)return 'inherit';

  const genericFamilies=new Set([
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'ui-serif',
    'ui-sans-serif',
    'ui-monospace',
    'emoji',
    'math',
    'fangsong'
  ]);

  return raw.split(',').map(part=>{
    let p=part.trim();
    if(!p)return '';
    if(/^var\(/i.test(p))return p;

    p=p.replace(/^['"]|['"]$/g,'').replace(/['"\\]/g,'').trim();
    if(!p)return '';

    if(genericFamilies.has(p.toLowerCase()))return p;
    return /\s/.test(p)?"'"+p+"'":p;
  }).filter(Boolean).join(', ');
}

function fontStyle(v){
  return 'font-family:'+cssFontFamily(v)+';';
}
function cleanCustomCss(v){
  return String(v||'')
    .replace(/<\/?style[^>]*>/gi,'')
    .replace(/@import[^;]+;/gi,'')
    .replace(/@font-face\s*{[^}]*}/gi,'')
    .replace(/[<>]/g,'')
    .trim()
    .slice(0,6000);
}

function cssScopeId(v){
  return 'persona-'+String(v||'preview').replace(/[^a-zA-Z0-9_-]/g,'-');
}

function scopedCustomCss(css,scope){
  css=cleanCustomCss(css);
  if(!css)return '';

  return css.replace(/(^|[{};])\s*([^{}@][^{]*?)\s*\{/g,(match,prefix,selector)=>{
    const scoped=selector.split(',').map(sel=>{
      sel=sel.trim();
      if(!sel)return '';
      if(sel.includes('&'))return sel.replace(/&/g,scope);
      if(sel.startsWith(scope))return sel;
      return scope+' '+sel;
    }).filter(Boolean).join(', ');

    return prefix+' '+scoped+'{';
  });
}

function customCssTag(css,scope){
  const scoped=scopedCustomCss(css,scope);
  return scoped?'<style>'+scoped.replace(/<\/style/gi,'')+'</style>':'';
}
function dateLabel(iso){const d=new Date(iso||'');return Number.isNaN(d.getTime())?'undated':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
function toast(m,k='ok'){const el=document.createElement('div');el.className='toast'+(k==='err'?' err':'');el.textContent=m;document.body.appendChild(el);setTimeout(()=>el.remove(),3200);}
function fail(e,w='runtime'){console.error(w,e);state.fatal={where:w,message:e&&e.message?e.message:String(e),stack:e&&e.stack?e.stack:''};renderFatal();}
async function safe(fn,w){try{return await fn();}catch(e){fail(e,w);return null;}}
function withTimeout(promise,label,ms=12000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timed out after '+Math.round(ms/1000)+'s')),ms))]);}
function setStatus(kind,msg){const el=$('persona-status');if(!el)return;el.className=kind==='err'?'inline-error':'inline-ok';el.textContent=msg||'';}
window.addEventListener('error',e=>fail(e.error||e.message,'runtime error'));window.addEventListener('unhandledrejection',e=>fail(e.reason,'unhandled promise'));
function readRoute(){const h=(location.hash||'#threads').slice(1);if(h.startsWith('thread/')){state.view='thread';state.threadId=h.slice(7);}else if(h==='personas'){state.view='personas';state.threadId=null;}else{state.view='threads';state.threadId=null;}}
function go(hash){if(location.hash==='#'+hash){readRoute();return refreshRoute();}location.hash=hash;}
window.addEventListener('hashchange',()=>safe(refreshRoute,'hash navigation'));
async function refreshRoute(){readRoute();if(state.session&&state.view==='thread'&&state.threadId)await loadPosts(state.threadId);render();}
async function boot(){await safe(async()=>{if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase browser library did not load. CDN may be blocked.');supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);readRoute();await checkSession();supa.auth.onAuthStateChange((_event,session)=>safe(async()=>{state.session=session;state.user=session&&session.user?session.user:null;if(session)await loadAll();render();},'auth change'));if(state.session){await loadAll();if(state.view==='thread'&&state.threadId)await loadPosts(state.threadId);}render();},'boot');}
async function checkSession(){const {data,error}=await supa.auth.getSession();if(error)throw error;state.session=data.session;state.user=data.session&&data.session.user?data.session.user:null;}
async function loadThreads(){const {data,error}=await supa.from('threads').select('*').order('updated_at',{ascending:false});if(error)throw error;state.threads=data||[];}
async function loadPersonas(){const {data,error}=await supa.from('personas').select('*').order('created_at',{ascending:true});if(error)throw error;state.personas=data||[];state.mine=state.personas.filter(p=>p.user_id===state.user?.id);}
async function loadPosts(id){const {data,error}=await supa.from('posts').select('*, persona:personas(*)').eq('thread_id',id).order('created_at',{ascending:true});if(error)throw error;state.posts=data||[];}
async function loadAll(){await Promise.all([loadThreads(),loadPersonas()]);}
async function magicLink(email){const redirectTo=window.location.origin+window.location.pathname;return await supa.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:false}});}
async function signOut(){await supa.auth.signOut();Object.assign(state,{session:null,user:null,threads:[],posts:[],personas:[],mine:[],view:'threads',threadId:null});render();}
async function createThread(title,summary){const {data,error}=await supa.from('threads').insert({title,summary:summary||null,created_by:state.user.id}).select('*').single();if(error)throw error;await loadThreads();return data;}
async function createPost(body){
  const personaId=state.selectedPersonaId||state.mine[0]?.id;

  if(!personaId)throw new Error('No persona is visible for this account yet. Create one on the personas page first.');
  if(!state.threadId)throw new Error('No active thread selected.');
  if(!state.user?.id)throw new Error('No signed-in user for post.');

  const insert=await withTimeout(
    supa.from('posts').insert({
      thread_id:state.threadId,
      persona_id:personaId,
      author_id:state.user.id,
      body
    }),
    'post insert',
    30000
  );

  if(insert.error)throw insert.error;

  const bump=await withTimeout(
    supa.from('threads').update({updated_at:new Date().toISOString()}).eq('id',state.threadId),
    'thread activity update',
    12000
  ).catch(e=>({error:e}));

  if(bump.error)console.warn('thread activity update failed',bump.error);

  await withTimeout(loadPosts(state.threadId),'reload posts',30000);
  await withTimeout(loadThreads(),'reload threads',30000).catch(e=>console.warn('thread reload failed',e));

  return true;
}
async function savePersona(payload,id){
  if(!state.user?.id)throw new Error('No signed-in user for persona save.');

  const saveWait=(promise,label)=>withTimeout(promise,label,30000);
  const clean={...payload,updated_at:new Date().toISOString()};

  if(id){
    const {data,error}=await saveWait(
      supa.from('personas')
        .update(clean)
        .eq('id',id)
        .eq('user_id',state.user.id)
        .select('id')
        .maybeSingle(),
      'persona update'
    );

    if(error)throw error;

    await saveWait(loadPersonas(),'reload personas');
    return personaById(id)||{id:data?.id||id,...clean,user_id:state.user.id};
  }

  clean.user_id=state.user.id;

  const {data,error}=await saveWait(
    supa.from('personas')
      .insert(clean)
      .select('id')
      .single(),
    'persona insert'
  );

  if(error)throw error;

  await saveWait(loadPersonas(),'reload personas');
  return personaById(data?.id)||{id:data?.id,...clean,user_id:state.user.id};
}
async function deletePersona(id){const {error}=await supa.from('personas').delete().eq('id',id);if(error)throw error;await loadPersonas();}
function render(){if(state.fatal)return renderFatal();if(!state.session)return renderLogin();renderShell();}
function renderFatal(){app.innerHTML='<div class="main"><div class="error"><h1>GAYA tripped on a root.</h1><p class="muted">The app caught the error instead of staying blank.</p><pre>'+esc(state.fatal?.where)+'\n'+esc(state.fatal?.message)+'\n'+esc(state.fatal?.stack)+'</pre><button id="retry">try again</button></div></div>';$('retry').onclick=()=>{state.fatal=null;boot();};}
function renderLogin(){app.innerHTML='<div class="login"><div class="card"><div class="brand"><span class="leaf">❦</span> GAYA <span class="leaf">❦</span></div><p class="muted">a little garden, for the two of us</p><form id="login-form"><label for="email">email</label><input id="email" type="email" required autocomplete="email" placeholder="you@somewhere.com"><button class="mt" type="submit">send the link</button><div class="msg" id="login-msg"></div></form></div></div>';$('login-form').onsubmit=e=>safe(async()=>{e.preventDefault();const msg=$('login-msg');msg.className='msg';msg.textContent='sending…';const {error}=await magicLink($('email').value.trim());if(error){msg.className='msg err';msg.textContent=error.message||'something went wrong.';}else msg.textContent='check your inbox. the link will sign you in.';},'send magic link');}
function renderShell(){const ta=state.view==='thread'||state.view==='threads'?'active':'';const pa=state.view==='personas'?'active':'';app.innerHTML='<div class="app"><div class="top"><div class="brand" id="brand"><span class="leaf">❦</span> GAYA</div><nav class="tabs"><a class="'+ta+'" href="#threads">threads</a><a class="'+pa+'" href="#personas">personas</a></nav><div class="user"><span>'+esc(state.user?.email||'')+'</span><button class="ghost" id="signout">sign out</button></div></div><main class="main" id="main"></main></div>';$('brand').onclick=()=>go('threads');$('signout').onclick=()=>safe(signOut,'sign out');if(state.view==='thread')renderThread();else if(state.view==='personas')renderPersonas();else renderThreads();if(state.modal==='new-thread')renderNewThreadModal();}
function defaultPersona(){return {id:null,name:'New Persona',avatar_url:'',banner_url:'',signature:'',bg_color:'#fff9ed',text_color:'#2b241c',accent_color:'#a9854d',border_color:'#cdbf9f',font_family:"Sorts Mill Goudy, Georgia, serif",custom_css:''};}
function personaById(id){return state.mine.find(p=>String(p.id)===String(id));}
function renderPersonas(){if(!state.editPersonaId&&state.mine[0])state.editPersonaId=state.mine[0].id;let body='<div class="header"><div><p class="kicker">costume department</p><h1>Personas</h1></div><button id="new-persona">＋ new persona</button></div><div class="persona-layout"><aside><h3>yours</h3><div class="persona-list">';if(!state.mine.length)body+='<p class="muted">none yet</p>';else body+=state.mine.map(p=>'<div class="persona-card '+(String(p.id)===String(state.editPersonaId)?'active':'')+'" data-id="'+esc(p.id)+'"><span class="dot" style="background:'+esc(p.accent_color||'#a9854d')+'"></span>'+esc(p.name)+'</div>').join('');body+='</div></aside><section id="persona-editor"></section></div>';$('main').innerHTML=body;$('new-persona').onclick=()=>{state.editPersonaId='new';renderPersonas();};document.querySelectorAll('.persona-card[data-id]').forEach(el=>el.onclick=()=>{state.editPersonaId=el.dataset.id;renderPersonas();});renderPersonaEditor();}
function renderPersonaEditor(){const area=$('persona-editor');if(!area)return;const isNew=state.editPersonaId==='new'||!state.editPersonaId;const p=isNew?defaultPersona():Object.assign(defaultPersona(),personaById(state.editPersonaId)||{});area.innerHTML='<div class="editor"><h2>'+(isNew?'New persona':'Edit persona')+'</h2><div class="editor-grid mt"><div class="field full"><label>name</label><input id="pe-name" value="'+esc(p.name||'')+'"></div><div class="field"><label>avatar url</label><input id="pe-avatar" value="'+esc(p.avatar_url||'')+'"></div><div class="field"><label>banner url</label><input id="pe-banner" value="'+esc(p.banner_url||'')+'"></div>'+colorField('bg','background',p.bg_color)+colorField('text','text',p.text_color)+colorField('accent','accent',p.accent_color)+colorField('border','border',p.border_color)+'<div class="field full"><label>font family</label><input id="pe-font" list="font-options" value="'+esc(p.font_family||'')+'"><datalist id="font-options"><option value="Sorts Mill Goudy, Georgia, serif"><option value="IM Fell English, Sorts Mill Goudy, Georgia, serif"><option value="Literata, Georgia, serif"><option value="Fixedsys, Fixedsys Excelsior, Lucida Console, Courier New, monospace"><option value="Georgia, serif"><option value="Times New Roman, serif"><option value="Arial, sans-serif"><option value="Courier New, monospace"></datalist><p class="muted preview-note">Multi-word fonts are auto-quoted when rendered.</p></div><div class="field full"><label>signature markdown</label><textarea id="pe-signature">'+esc(p.signature||'')+'</textarea></div><div class="field full"><label>custom css notes</label><textarea id="pe-css" placeholder="saved, but not executed yet while we keep the app stable">'+esc(p.custom_css||'')+'</textarea><p class="muted preview-note">Custom CSS is scoped to this persona’s posts. Use & for the post card itself.</p></div></div><div class="spread mt"><div class="row"><button id="save-persona">save persona</button><button class="ghost" id="reset-persona">reset</button></div>'+(isNew?'':'<button class="danger" id="delete-persona">delete persona</button>')+'</div><div id="persona-status"></div><div class="mt2"><h3>preview</h3><div id="persona-preview"></div></div></div>';['name','avatar','banner','bg-c','bg-t','text-c','text-t','accent-c','accent-t','border-c','border-t','font','signature','css'].forEach(key=>{const el=$('pe-'+key);if(el)el.oninput=updatePersonaPreview;});[['bg','bg_color'],['text','text_color'],['accent','accent_color'],['border','border_color']].forEach(([k])=>{const c=$('pe-'+k+'-c');const t=$('pe-'+k+'-t');c.oninput=()=>{t.value=c.value;updatePersonaPreview();};t.oninput=()=>{if(/^#[0-9a-fA-F]{6}$/.test(t.value)){c.value=t.value;}updatePersonaPreview();};});$('save-persona').onclick=async()=>{const payload=readPersonaForm();if(!payload.name.trim())return toast('name required','err');const btn=$('save-persona');try{btn.disabled=true;btn.textContent='saving…';setStatus('ok','saving…');const saved=await savePersona(payload,isNew?null:p.id);state.editPersonaId=saved.id;toast('persona saved');renderPersonas();}catch(e){console.error('persona save failed',e);setStatus('err','Save failed: '+(e.message||String(e))+(e.details?'\n'+e.details:'')+(e.hint?'\nHint: '+e.hint:''));toast('persona save failed','err');}finally{const again=$('save-persona');if(again){again.disabled=false;again.textContent='save persona';}}};$('reset-persona').onclick=()=>renderPersonaEditor();if(!isNew)$('delete-persona').onclick=()=>safe(async()=>{if(!confirm('Delete '+p.name+'?'))return;await deletePersona(p.id);state.editPersonaId=state.mine[0]?.id||'new';toast('persona deleted');renderPersonas();},'delete persona');updatePersonaPreview();}
function colorField(k,label,value){return '<div class="field"><label>'+label+'</label><div class="color-pair"><input id="pe-'+k+'-c" type="color" value="'+esc(value||'#000000')+'"><input id="pe-'+k+'-t" value="'+esc(value||'')+'"></div></div>';}
function readPersonaForm(){return {name:$('pe-name').value.trim(),avatar_url:$('pe-avatar').value.trim()||null,banner_url:$('pe-banner').value.trim()||null,signature:$('pe-signature').value.trim()||null,bg_color:$('pe-bg-t').value.trim()||'#fff9ed',text_color:$('pe-text-t').value.trim()||'#2b241c',accent_color:$('pe-accent-t').value.trim()||'#a9854d',border_color:$('pe-border-t').value.trim()||'#cdbf9f',font_family:$('pe-font').value.trim()||null,custom_css:$('pe-css').value.trim()||null,updated_at:new Date().toISOString()};}
function updatePersonaPreview(){
  const box=$('persona-preview');
  if(!box)return;

  const p=readPersonaForm();
  const f=fontStyle(p.font_family);
  const banner=p.banner_url?'<div class="banner" style="background-image:url('+JSON.stringify(p.banner_url)+')"></div>':'';
  const avatar=p.avatar_url?'background-image:url('+JSON.stringify(p.avatar_url)+')':'';
  const scopeId='persona-preview';
  const scope='[data-persona-style="'+scopeId+'"]';
  const custom=customCssTag(p.custom_css,scope);

  box.innerHTML=custom+'<article class="post" data-persona-style="'+scopeId+'" style="background:'+esc(p.bg_color)+';color:'+esc(p.text_color)+';border-color:'+esc(p.border_color)+';'+f+'">'+
    banner+
    '<div class="post-head"><div class="avatar" style="background-color:'+esc(p.accent_color)+';'+avatar+'"></div><div class="post-name" style="'+f+'">'+esc(p.name||'unnamed')+'</div><div class="post-meta">preview</div></div>'+
    '<div class="post-body" style="'+f+'"><p>This is how the persona speaks on the page.</p><blockquote>A line worth setting apart.</blockquote></div>'+
    (p.signature?'<div class="signature-block" style="'+f+'">'+md(p.signature)+'</div>':'')+
    '</article>';
}
// Boot is intentionally called from boot-last.js after every enhancement module loads.
