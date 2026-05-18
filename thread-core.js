/*
  GAYA Thread Core UI
  Owns thread list rendering, single-thread rendering, post rendering, composer,
  and the new-thread modal. Data/API helpers still live in app.js for now.
*/

function renderThreads(){
  let body='<div class="header"><div><p class="kicker">the little green house</p><h1>Threads</h1></div><button id="new-thread">＋ new thread</button></div>';

  if(!state.threads.length){
    body+='<div class="empty"><div><h2>nothing planted yet</h2><p class="muted">start the first thread above</p></div></div>';
  }else{
    body+='<div class="thread-list">'+state.threads.map(t=>
      '<a class="thread" href="#thread/'+esc(t.id)+'" data-id="'+esc(t.id)+'">'+
        '<h3>'+esc(t.title)+'</h3>'+
        (t.summary?'<div class="summary">'+esc(t.summary).slice(0,240)+'</div>':'')+
        '<div class="meta">last activity · '+dateLabel(t.updated_at||t.created_at)+'</div>'+
      '</a>'
    ).join('')+'</div>';
  }

  $('main').innerHTML=body;
  $('new-thread').onclick=()=>{state.modal='new-thread';render();};
  document.querySelectorAll('.thread').forEach(el=>{
    el.onclick=()=>{if(el.dataset.id)go('thread/'+el.dataset.id);};
  });
}

function renderThread(){
  const thread=state.threads.find(t=>String(t.id)===String(state.threadId));

  if(!thread){
    $('main').innerHTML='<a class="back" href="#threads">← back to threads</a><div class="error"><h2>thread not found</h2><p class="muted">This thread is not visible to the current user.</p></div>';
    return;
  }

  $('main').innerHTML=
    '<a class="back" href="#threads">← back to threads</a>'+
    '<div class="header"><div><p class="kicker">thread</p><h1>'+esc(thread.title)+'</h1></div></div>'+
    (thread.summary?'<div class="thread-summary">'+md(thread.summary)+'</div>':'')+
    '<div class="divider">❦</div><div id="posts"></div><div id="composer"></div>';

  renderPosts();
  renderComposer();
}

function renderPosts(){
  const list=$('posts');

  if(!state.posts.length){
    list.innerHTML='<div class="empty"><div><h2>no posts yet</h2><p class="muted">be the first little goblin to write</p></div></div>';
    return;
  }

  list.innerHTML=state.posts.map((p,i)=>{
    const per=p.persona||{};
    const f=fontStyle(per.font_family);
    const av=per.avatar_url?'background-image:url('+JSON.stringify(per.avatar_url)+')':'';
    const banner=per.banner_url?'<div class="banner" style="background-image:url('+JSON.stringify(per.banner_url)+')"></div>':'';
    const scopeId=cssScopeId(per.id||p.persona_id||('post-'+i));
    const scope='[data-persona-style="'+scopeId+'"]';
    const custom=customCssTag(per.custom_css,scope);

    return custom+'<article class="post" data-persona-style="'+esc(scopeId)+'" style="'+
      (per.bg_color?'background:'+esc(per.bg_color)+';':'')+
      (per.text_color?'color:'+esc(per.text_color)+';':'')+
      (per.border_color?'border-color:'+esc(per.border_color)+';':'')+
      f+
      '">'+
      banner+
      '<div class="post-head"><div class="avatar" style="background-color:'+esc(per.accent_color||'#a8854f')+';'+av+'"></div><div class="post-name" style="'+f+'">'+esc(per.name||'unknown persona')+'</div><div class="post-meta">'+dateLabel(p.created_at)+'</div></div>'+
      '<div class="post-body" style="'+f+'">'+md(p.body)+'</div>'+
      (per.signature?'<div class="signature-block" style="'+f+'">'+md(per.signature)+'</div>':'')+
      '</article>';
  }).join('');
}

function renderComposer(){
  const wrap=$('composer');

  if(!state.mine.length){
    wrap.innerHTML='<div class="composer"><h3>reply disabled</h3><p class="muted">No persona is visible for this account yet. Create one on the personas page.</p></div>';
    return;
  }

  if(!state.mine.some(p=>p.id===state.selectedPersonaId))state.selectedPersonaId=state.mine[0].id;

  wrap.innerHTML=
    '<div class="composer"><h3>reply</h3><div class="row"><label style="margin:0">as</label><select id="persona-select">'+
      state.mine.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===state.selectedPersonaId?'selected':'')+'>'+esc(p.name)+'</option>').join('')+
    '</select></div><textarea id="body" class="mt" placeholder="markdown welcome"></textarea><div class="spread mt"><p class="muted">markdown renders in the post</p><button id="post-btn">post</button></div></div>';

  $('persona-select').onchange=e=>{state.selectedPersonaId=e.target.value;};
  $('post-btn').onclick=()=>safe(async()=>{
    const body=$('body').value.trim();
    if(!body)return toast('write something first','err');
    const btn=$('post-btn');
    btn.disabled=true;
    btn.textContent='posting…';
    await createPost(body);
    $('body').value='';
    btn.disabled=false;
    btn.textContent='post';
    renderPosts();
    toast('posted');
  },'create post');
}

function renderNewThreadModal(){
  const wrap=document.createElement('div');
  wrap.className='modal-bg';
  wrap.innerHTML='<div class="modal"><button class="close" id="modal-close">×</button><h2>New thread</h2><div class="mt"><label>title</label><input id="thread-title" placeholder="give it a name"></div><div class="mt"><label>summary or opening note</label><textarea id="thread-summary" placeholder="optional; markdown welcome"></textarea></div><div class="spread mt"><button class="ghost" id="cancel-thread">cancel</button><button id="create-thread">create</button></div></div>';
  document.body.appendChild(wrap);

  const close=()=>{state.modal=null;wrap.remove();};
  $('modal-close').onclick=close;
  $('cancel-thread').onclick=close;
  wrap.onclick=e=>{if(e.target===wrap)close();};
  setTimeout(()=>$('thread-title')?.focus(),0);

  $('create-thread').onclick=()=>safe(async()=>{
    const title=$('thread-title').value.trim();
    const summary=$('thread-summary').value.trim();
    if(!title)return toast('title required','err');
    const btn=$('create-thread');
    btn.disabled=true;
    btn.textContent='creating…';
    const thread=await createThread(title,summary);
    close();
    state.posts=[];
    go('thread/'+thread.id);
    toast('thread created');
  },'create thread');
}