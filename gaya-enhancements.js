// Small post-boot enhancements for GAYA.
// Loads after app.js. Keep this file boring and utility-focused until the app is fully split/refactored.
(function(){
  const MARK='__gayaEnhancementsInstalled';

  function available(){
    try{
      return typeof renderThread==='function' &&
        typeof renderPosts==='function' &&
        typeof loadThreads==='function' &&
        typeof loadPosts==='function' &&
        typeof toast==='function' &&
        typeof esc==='function' &&
        typeof state!=='undefined' &&
        typeof supa!=='undefined' && supa;
    }catch(_e){
      return false;
    }
  }

  function catchUtilityError(label, error){
    console.error(label, error);
    toast(label+': '+(error&&error.message?error.message:String(error)),'err');
  }

  function findCurrentThread(){
    return state.threads.find(t=>String(t.id)===String(state.threadId));
  }

  async function updateThreadDetails(id,title,summary){
    const payload={title,summary:summary||null,updated_at:new Date().toISOString()};
    const {data,error}=await supa.from('threads').update(payload).eq('id',id).select('*').single();
    if(error)throw error;
    await loadThreads();
    return data;
  }

  async function updatePostBody(post,body){
    const {data,error}=await supa.from('posts').update({body}).eq('id',post.id).select('*, persona:personas(*)').single();
    if(error)throw error;
    const index=state.posts.findIndex(p=>String(p.id)===String(post.id));
    if(index>=0)state.posts[index]=data;
    else await loadPosts(state.threadId);
    try{await supa.from('threads').update({updated_at:new Date().toISOString()}).eq('id',state.threadId);}catch(_e){}
    return data;
  }

  function renderEditThreadModal(thread){
    if(!thread)return toast('thread not found','err');
    const existing=document.getElementById('edit-thread-modal');
    if(existing)existing.remove();
    const wrap=document.createElement('div');
    wrap.className='modal-bg';
    wrap.id='edit-thread-modal';
    wrap.innerHTML='<div class="modal"><button class="close" id="edit-thread-close">×</button><h2>Edit thread</h2><div class="mt"><label>title</label><input id="edit-thread-title" value="'+esc(thread.title||'')+'"></div><div class="mt"><label>summary or opening note</label><textarea id="edit-thread-summary" placeholder="optional; markdown welcome">'+esc(thread.summary||'')+'</textarea></div><div class="spread mt"><button class="ghost" id="edit-thread-cancel">cancel</button><button id="edit-thread-save">save changes</button></div></div>';
    document.body.appendChild(wrap);
    const close=()=>wrap.remove();
    document.getElementById('edit-thread-close').onclick=close;
    document.getElementById('edit-thread-cancel').onclick=close;
    wrap.onclick=e=>{if(e.target===wrap)close();};
    setTimeout(()=>document.getElementById('edit-thread-title')?.focus(),0);
    document.getElementById('edit-thread-save').onclick=async()=>{
      const title=document.getElementById('edit-thread-title').value.trim();
      const summary=document.getElementById('edit-thread-summary').value.trim();
      if(!title)return toast('title required','err');
      const btn=document.getElementById('edit-thread-save');
      try{btn.disabled=true;btn.textContent='saving…';const saved=await updateThreadDetails(thread.id,title,summary);state.threadId=saved.id;close();renderThread();toast('thread updated');}
      catch(e){btn.disabled=false;btn.textContent='save changes';catchUtilityError('thread edit failed',e);}
    };
  }

  function canEditPost(post){
    if(!post||!post.id)return false;
    const uid=state.user&&state.user.id;
    return !post.author_id || !uid || String(post.author_id)===String(uid);
  }

  function renderEditPostModal(post){
    if(!post)return toast('reply not found','err');
    const existing=document.getElementById('edit-post-modal');
    if(existing)existing.remove();
    const name=(post.persona&&post.persona.name)||'reply';
    const wrap=document.createElement('div');
    wrap.className='modal-bg';
    wrap.id='edit-post-modal';
    wrap.innerHTML='<div class="modal"><button class="close" id="edit-post-close">×</button><h2>Edit reply</h2><p class="muted">Editing '+esc(name)+' post.</p><div class="mt"><label>reply body</label><textarea id="edit-post-body" placeholder="markdown welcome">'+esc(post.body||'')+'</textarea></div><div class="spread mt"><button class="ghost" id="edit-post-cancel">cancel</button><button id="edit-post-save">save reply</button></div></div>';
    document.body.appendChild(wrap);
    const close=()=>wrap.remove();
    document.getElementById('edit-post-close').onclick=close;
    document.getElementById('edit-post-cancel').onclick=close;
    wrap.onclick=e=>{if(e.target===wrap)close();};
    setTimeout(()=>document.getElementById('edit-post-body')?.focus(),0);
    document.getElementById('edit-post-save').onclick=async()=>{
      const body=document.getElementById('edit-post-body').value.trim();
      if(!body)return toast('reply body required','err');
      const btn=document.getElementById('edit-post-save');
      try{btn.disabled=true;btn.textContent='saving…';await updatePostBody(post,body);close();renderPosts();toast('reply updated');}
      catch(e){btn.disabled=false;btn.textContent='save reply';catchUtilityError('reply edit failed',e);}
    };
  }

  function addPostEditButtons(){
    const nodes=document.querySelectorAll('#posts .post');
    nodes.forEach((node,index)=>{
      const post=state.posts[index];
      if(!canEditPost(post)||node.querySelector('.edit-post'))return;
      const head=node.querySelector('.post-head');
      if(!head)return;
      const btn=document.createElement('button');
      btn.className='ghost edit-post';
      btn.type='button';
      btn.textContent='edit reply';
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();renderEditPostModal(post);};
      head.appendChild(btn);
    });
  }

  function install(){
    if(window[MARK])return true;
    if(!available())return false;
    window[MARK]=true;
    const originalRenderThread=renderThread;
    renderThread=function(){
      originalRenderThread();
      const thread=findCurrentThread();
      const header=document.querySelector('#main .header');
      if(thread&&header&&!document.getElementById('edit-thread')){
        const btn=document.createElement('button');
        btn.id='edit-thread';
        btn.className='ghost';
        btn.type='button';
        btn.textContent='edit thread';
        btn.onclick=()=>renderEditThreadModal(thread);
        header.appendChild(btn);
      }
      addPostEditButtons();
    };
    const originalRenderPosts=renderPosts;
    renderPosts=function(){originalRenderPosts();addPostEditButtons();};
    window.renderEditThreadModal=renderEditThreadModal;
    window.updateThreadDetails=updateThreadDetails;
    window.renderEditPostModal=renderEditPostModal;
    window.updatePostBody=updatePostBody;
    try{if(state.session&&state.view==='thread')renderThread();}catch(e){console.warn('enhancement refresh skipped',e);}
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer);},50);
    setTimeout(()=>clearInterval(timer),6000);
  }
})();
