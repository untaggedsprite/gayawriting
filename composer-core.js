/*
  GAYA Composer Core
  Owns the reply composer and local draft protection. Drafts live only in this
  browser's localStorage and clear after a successful post.
*/

function draftGuardKey(){
  const user=state.user?.id||state.user?.email||'anon';
  const thread=state.threadId||'no-thread';
  const persona=state.selectedPersonaId||state.mine?.[0]?.id||'no-persona';
  return 'gaya:draft:v1:'+user+':'+thread+':'+persona;
}

function draftGuardLegacyPrefix(){
  const user=state.user?.id||state.user?.email||'anon';
  const thread=state.threadId||'no-thread';
  return 'gaya:draft:v1:'+user+':'+thread+':';
}

function draftGuardSave(){
  const body=$('body');
  if(!body)return;
  const value=body.value;
  const key=draftGuardKey();

  if(value&&value.trim()){
    localStorage.setItem(key,JSON.stringify({body:value,updated_at:new Date().toISOString()}));
  }else{
    localStorage.removeItem(key);
  }

  draftGuardStatus(value&&value.trim()?'draft saved':'');
}

function draftGuardLoad(){
  const body=$('body');
  if(!body)return;

  const currentKey=draftGuardKey();
  let raw=localStorage.getItem(currentKey);

  if(!raw){
    const prefix=draftGuardLegacyPrefix();
    const candidates=[];

    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key&&key.startsWith(prefix)){
        try{
          const parsed=JSON.parse(localStorage.getItem(key)||'{}');
          if(parsed.body)candidates.push({key,body:parsed.body,updated_at:parsed.updated_at||''});
        }catch(_e){}
      }
    }

    candidates.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
    if(candidates[0])raw=JSON.stringify(candidates[0]);
  }

  if(!raw)return;

  try{
    const draft=JSON.parse(raw);
    if(draft.body&&!body.value){
      body.value=draft.body;
      draftGuardStatus('draft restored');
    }
  }catch(_e){}
}

function draftGuardClear(){
  const key=draftGuardKey();
  localStorage.removeItem(key);
}

function draftGuardStatus(text){
  const el=$('draft-status');
  if(!el)return;
  el.textContent=text||'';
}

function renderComposer(){
  const wrap=$('composer');
  if(!wrap)return;

  if(!state.mine.length){
    wrap.innerHTML='<div class="composer"><h3>reply disabled</h3><p class="muted">No persona is visible for this account yet. Create one on the personas page.</p></div>';
    return;
  }

  if(!state.mine.some(p=>p.id===state.selectedPersonaId))state.selectedPersonaId=state.mine[0].id;

  wrap.innerHTML='<div class="composer"><h3>reply</h3><div class="row"><label style="margin:0">as</label><select id="persona-select">'+state.mine.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===state.selectedPersonaId?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></div><textarea id="body" class="mt" placeholder="markdown welcome"></textarea><div class="spread mt"><p class="muted">markdown renders in the post <span id="draft-status" class="draft-status"></span></p><button id="post-btn">post</button></div></div>';

  const body=$('body');
  const personaSelect=$('persona-select');

  draftGuardLoad();

  body.addEventListener('input',draftGuardSave);
  body.addEventListener('blur',draftGuardSave);

  personaSelect.onchange=e=>{
    draftGuardSave();
    state.selectedPersonaId=e.target.value;
    draftGuardLoad();
  };

  $('post-btn').onclick=()=>safe(async()=>{
    const bodyEl=$('body');
    const text=bodyEl.value.trim();
    if(!text)return toast('write something first','err');

    const btn=$('post-btn');

    try{
      draftGuardSave();
      btn.disabled=true;
      btn.textContent='posting…';
      await createPost(text);
      draftGuardClear();
      bodyEl.value='';
      draftGuardStatus('');
      renderPosts();
      toast('posted');
    }catch(e){
      console.error('post failed, draft kept',e);
      draftGuardSave();
      toast('post failed; draft kept','err');
      throw e;
    }finally{
      const again=$('post-btn');
      if(again){
        again.disabled=false;
        again.textContent='post';
      }
    }
  },'create post');
}