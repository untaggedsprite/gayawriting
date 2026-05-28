/*
  GAYA Composer Core
  Owns the reply composer and local draft protection. Drafts live only in this
  browser's localStorage and clear after a successful post.
*/

function draftGuardUserKey(){
  return state.user?.id||state.user?.email||'anon';
}

function draftGuardThreadKey(){
  return state.threadId||'no-thread';
}

function draftGuardPersonaId(){
  return state.selectedPersonaId||state.mine?.[0]?.id||null;
}

function draftGuardKey(){
  const user=draftGuardUserKey();
  const thread=draftGuardThreadKey();
  return 'gaya:draft:v2:'+user+':'+thread;
}

function draftGuardAttemptKey(){
  const user=draftGuardUserKey();
  const thread=draftGuardThreadKey();
  return 'gaya:last-post:v1:'+user+':'+thread;
}

function draftGuardLegacyPrefix(){
  const user=draftGuardUserKey();
  const thread=draftGuardThreadKey();
  return 'gaya:draft:v1:'+user+':'+thread+':';
}

function draftGuardPayload(value,extra={}){
  return {
    body:String(value||''),
    persona_id:draftGuardPersonaId(),
    thread_id:state.threadId||null,
    updated_at:new Date().toISOString(),
    ...extra
  };
}

function draftGuardRead(key){
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return null;
    return JSON.parse(raw);
  }catch(_e){
    return null;
  }
}

function draftGuardFindLegacy(){
  const prefix=draftGuardLegacyPrefix();
  const candidates=[];

  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(!key||!key.startsWith(prefix))continue;
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'{}');
      if(parsed.body){
        candidates.push({
          ...parsed,
          persona_id:parsed.persona_id||key.slice(prefix.length)||null,
          updated_at:parsed.updated_at||'',
          legacy_key:key
        });
      }
    }catch(_e){}
  }

  candidates.sort((a,b)=>String(b.updated_at).localeCompare(String(a.updated_at)));
  return candidates[0]||null;
}

function draftGuardFindRestorable(){
  const current=draftGuardRead(draftGuardKey());
  if(current?.body)return current;

  const legacy=draftGuardFindLegacy();
  if(legacy?.body)return legacy;

  const attempt=draftGuardRead(draftGuardAttemptKey());
  if(attempt?.body&&attempt.status!=='synced')return attempt;

  return null;
}

function draftGuardSave(showStatus=true){
  const body=$('body');
  if(!body)return;
  const value=body.value;
  const key=draftGuardKey();

  if(value&&value.trim()){
    localStorage.setItem(key,JSON.stringify(draftGuardPayload(value)));
  }else{
    localStorage.removeItem(key);
  }

  if(showStatus)draftGuardStatus(value&&value.trim()?'draft saved':'');
}

function draftGuardSaveAttempt(value,status='posting'){
  if(!value||!String(value).trim())return;
  localStorage.setItem(draftGuardAttemptKey(),JSON.stringify(draftGuardPayload(value,{
    status,
    attempted_at:new Date().toISOString()
  })));
}

function draftGuardMarkAttemptSynced(){
  const key=draftGuardAttemptKey();
  const attempt=draftGuardRead(key);
  if(!attempt)return;
  localStorage.setItem(key,JSON.stringify({
    ...attempt,
    status:'synced',
    synced_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  }));
}

function draftGuardApplyPersona(personaId){
  if(!personaId)return;
  if(!state.mine?.some(p=>String(p.id)===String(personaId)))return;

  state.selectedPersonaId=personaId;
  const select=$('persona-select');
  if(select)select.value=personaId;
}

function draftGuardLoad(){
  const body=$('body');
  if(!body)return;

  const draft=draftGuardFindRestorable();
  if(!draft?.body)return;

  draftGuardApplyPersona(draft.persona_id);

  if(!body.value){
    body.value=draft.body;
    localStorage.setItem(draftGuardKey(),JSON.stringify(draftGuardPayload(draft.body,{
      restored_from:draft.legacy_key?'legacy':draft.status?'attempt':'draft',
      original_updated_at:draft.updated_at||null
    })));
    draftGuardStatus(draft.status&&draft.status!=='synced'?'unsynced draft restored':'draft restored');
  }
}

function draftGuardClear(){
  localStorage.removeItem(draftGuardKey());
}

function draftGuardStatus(text){
  const el=$('draft-status');
  if(!el)return;
  el.textContent=text||'';
}

function draftGuardPostVisible(text,personaId,startedAt){
  const started=Date.parse(startedAt||'')||0;
  const target=String(text||'').trim();
  return (state.posts||[]).some(post=>{
    if(String(post.body||'').trim()!==target)return false;
    const postPersona=post.persona_id||post.persona?.id||'';
    if(personaId&&String(postPersona)!==String(personaId))return false;
    const created=Date.parse(post.created_at||'')||Date.now();
    return !started||created>=started-5000;
  });
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

  body.addEventListener('input',()=>draftGuardSave());
  body.addEventListener('blur',()=>draftGuardSave());

  personaSelect.onchange=e=>{
    state.selectedPersonaId=e.target.value;
    draftGuardSave();
  };

  $('post-btn').onclick=()=>safe(async()=>{
    const bodyEl=$('body');
    const text=bodyEl.value.trim();
    if(!text)return toast('write something first','err');

    const btn=$('post-btn');
    const personaId=state.selectedPersonaId;
    const startedAt=new Date().toISOString();

    try{
      draftGuardSave();
      draftGuardSaveAttempt(text,'posting');
      btn.disabled=true;
      btn.textContent='posting…';
      await createPost(text);

      if(!draftGuardPostVisible(text,personaId,startedAt)){
        draftGuardSaveAttempt(text,'posted-unconfirmed');
        draftGuardStatus('post may have saved; draft kept');
        toast('post may have saved; draft kept','err');
        return;
      }

      draftGuardMarkAttemptSynced();
      draftGuardClear();
      bodyEl.value='';
      draftGuardStatus('');
      renderPosts();
      toast('posted');
    }catch(e){
      console.error('post failed, draft kept',e);
      draftGuardSave();
      draftGuardSaveAttempt(text,'failed');
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