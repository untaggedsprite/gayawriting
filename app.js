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
// Boot is intentionally called from boot-last.js after every enhancement module loads.
