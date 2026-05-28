const SUPABASE_URL='https://yunwwocryohmvnfwbjig.supabase.co';
const SUPABASE_KEY='sb_publishable_XmVMsFZWZ_ZkMQVQyRnAmQ_FqllXED3';
const app=document.getElementById('app');
const state={session:null,user:null,view:'threads',threadId:null,threads:[],posts:[],personas:[],mine:[],ocProfiles:[],ocProfilesLoaded:false,ocProfilesLoading:false,ocProfileLoadError:null,selectedPersonaId:null,editPersonaId:null,editOcProfileId:null,modal:null,fatal:null};
let supa=null;
let routeRun=0;
let authUserId=null;

function readRoute(){
  const h=(location.hash||'#threads').slice(1);
  if(h.startsWith('thread/')){state.view='thread';state.threadId=h.slice(7);}
  else if(h==='personas'){state.view='personas';state.threadId=null;}
  else{state.view='threads';state.threadId=null;}
}

function go(hash){
  if(location.hash==='#'+hash){
    readRoute();
    return refreshRoute();
  }
  location.hash=hash;
}

window.addEventListener('hashchange',()=>safe(refreshRoute,'hash navigation'));

async function refreshRoute(){
  const run=++routeRun;
  readRoute();

  if(state.session&&state.view==='thread'&&state.threadId){
    const loadingThread=state.threads.find(t=>String(t.id)===String(state.threadId));
    const main=$('main');
    if(main){
      main.innerHTML='<a class="back" href="#threads">← back to threads</a><div class="empty"><div><h2>opening '+esc(loadingThread?.title||'thread')+'</h2><p class="muted">gathering the little papers…</p></div></div>';
    }
    await loadPosts(state.threadId);
    if(run!==routeRun)return;
  }

  render();
}

async function boot(){
  await safe(async()=>{
    if(!window.supabase||!window.supabase.createClient)throw new Error('Supabase browser library did not load. CDN may be blocked.');

    supa=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
    readRoute();

    await checkSession();
    authUserId=state.user?.id||null;

    supa.auth.onAuthStateChange((event,session)=>safe(async()=>{
      if(event==='INITIAL_SESSION')return;

      const nextUser=session?.user?.id||null;
      const sameUser=nextUser&&nextUser===authUserId;

      state.session=session;
      state.user=session&&session.user?session.user:null;

      if(!session){
        authUserId=null;
        Object.assign(state,{threads:[],posts:[],personas:[],mine:[],ocProfiles:[],ocProfilesLoaded:false,ocProfilesLoading:false,ocProfileLoadError:null,view:'threads',threadId:null});
        await refreshRoute();
        return;
      }

      if(event==='TOKEN_REFRESHED'||sameUser){
        authUserId=nextUser;
        await refreshRoute();
        return;
      }

      authUserId=nextUser;
      await loadAll();
      await refreshRoute();
    },'auth change'));

    if(state.session){
      await loadAll();
    }

    await refreshRoute();
  },'boot');
}

function render(){
  if(state.fatal)return renderFatal();
  if(!state.session)return renderLogin();
  renderShell();
}

function renderFatal(){
  app.innerHTML='<div class="main"><div class="error"><h1>GAYA tripped on a root.</h1><p class="muted">The app caught the error instead of staying blank.</p><pre>'+esc(state.fatal?.where)+'\n'+esc(state.fatal?.message)+'\n'+esc(state.fatal?.stack)+'</pre><div class="row"><button id="retry">try again</button><button class="ghost" id="hard-reload">refresh page</button></div></div></div>';
  $('retry').onclick=()=>{state.fatal=null;boot();};
  $('hard-reload').onclick=()=>location.reload();
}

function renderLogin(){
  app.innerHTML='<div class="login"><div class="card"><div class="brand"><span class="leaf">❦</span> GAYA <span class="leaf">❦</span></div><p class="muted">a little garden, for the two of us</p><form id="login-form"><label for="email">email</label><input id="email" type="email" required autocomplete="email" placeholder="you@somewhere.com"><button class="mt" type="submit">send the link</button><div class="msg" id="login-msg"></div></form></div></div>';
  $('login-form').onsubmit=e=>safe(async()=>{
    e.preventDefault();
    const msg=$('login-msg');
    msg.className='msg';
    msg.textContent='sending…';
    const {error}=await magicLink($('email').value.trim());
    if(error){
      msg.className='msg err';
      msg.textContent=error.message||'something went wrong.';
    }else msg.textContent='check your inbox. the link will sign you in.';
  },'send magic link');
}

function renderShell(){
  const ta=state.view==='thread'||state.view==='threads'?'active':'';
  const pa=state.view==='personas'?'active':'';
  app.innerHTML='<div class="app"><div class="top"><div class="brand" id="brand"><span class="leaf">❦</span> GAYA</div><nav class="tabs"><a class="'+ta+'" href="#threads">threads</a><a class="'+pa+'" href="#personas">personas</a></nav><div class="user"><span>'+esc(state.user?.email||'')+'</span><button class="ghost" id="signout">sign out</button></div></div><main class="main" id="main"></main></div>';
  $('brand').onclick=()=>go('threads');
  $('signout').onclick=()=>safe(signOut,'sign out');
  if(state.view==='thread')renderThread();
  else if(state.view==='personas')renderPersonas();
  else renderThreads();
  if(state.modal==='new-thread')renderNewThreadModal();
}

// Boot is intentionally called from boot-last.js after every enhancement module loads.
