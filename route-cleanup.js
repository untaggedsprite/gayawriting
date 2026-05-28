/* GAYA route cleanup / first-class extension tabs */
(function(){
  const MARK='__gayaRouteCleanupInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  function readKnownRoute(){
    const h=(location.hash||'#threads').slice(1);
    if(h.startsWith('thread/')){state.view='thread';state.threadId=h.slice(7);return;}
    if(h==='personas'){state.view='personas';state.threadId=null;return;}
    if(h==='chronicle'){state.view='chronicle';state.threadId=null;return;}
    if(h==='cabinet'||h==='oc-cabinet'){state.view='ocCabinet';state.threadId=null;return;}
    state.view='threads';
    state.threadId=null;
  }

  function moduleMissing(name){
    const main=$('main');
    if(main)main.innerHTML='<div class="error"><h2>'+esc(name)+' module not ready</h2><p class="muted">Refresh and try again.</p></div>';
  }

  async function openChronicleView(expectedRun){
    if(typeof window.openChronicle==='function'){
      await window.openChronicle(expectedRun);
      return;
    }
    moduleMissing('chronicle');
  }

  readRoute=readKnownRoute;

  refreshRoute=async function(){
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
    if(run!==routeRun)return;

    if(state.session&&state.view==='chronicle'){
      await openChronicleView(run);
      if(run!==routeRun)return;
    }
  };

  renderShell=function(){
    const ta=state.view==='thread'||state.view==='threads'?'active':'';
    const pa=state.view==='personas'?'active':'';
    const ca=state.view==='chronicle'?'active':'';
    const oa=state.view==='ocCabinet'?'active':'';
    app.innerHTML='<div class="app"><div class="top"><div class="brand" id="brand"><span class="leaf">❦</span> GAYA</div><nav class="tabs"><a class="'+ta+'" href="#threads">threads</a><a class="'+pa+'" href="#personas">personas</a><a class="'+ca+'" href="#chronicle">chronicle</a><a class="'+oa+'" href="#cabinet">OC cabinet</a></nav><div class="user"><span>'+esc(state.user?.email||'')+'</span><button class="ghost" id="signout">sign out</button></div></div><main class="main" id="main"></main></div>';
    $('brand').onclick=()=>go('threads');
    $('signout').onclick=()=>safe(signOut,'sign out');
    if(state.view==='thread')renderThread();
    else if(state.view==='personas')renderPersonas();
    else if(state.view==='chronicle'){
      const main=$('main');
      if(main)main.innerHTML='<div class="empty"><div><h2>opening chronicle</h2><p class="muted">consulting the haunted municipal records…</p></div></div>';
    }
    else if(state.view==='ocCabinet'){
      if(typeof renderOcCabinet==='function')renderOcCabinet();
      else moduleMissing('OC cabinet');
    }
    else renderThreads();
    if(state.modal==='new-thread')renderNewThreadModal();
  };

  window.openChronicleView=openChronicleView;
})();