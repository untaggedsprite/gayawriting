// Small post-boot enhancements for GAYA.
// This file is loaded by blooms.js until the remaining inline app script is split into app.js.
(function(){
  const MARK='__gayaThreadEditInstalled';

  function available(){
    try{
      return typeof renderThread==='function' && typeof loadThreads==='function' && typeof safe==='function' && typeof toast==='function' && typeof state!=='undefined' && typeof supa!=='undefined' && supa;
    }catch(_e){
      return false;
    }
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

    document.getElementById('edit-thread-save').onclick=()=>safe(async()=>{
      const title=document.getElementById('edit-thread-title').value.trim();
      const summary=document.getElementById('edit-thread-summary').value.trim();
      if(!title)return toast('title required','err');
      const btn=document.getElementById('edit-thread-save');
      btn.disabled=true;
      btn.textContent='saving…';
      const saved=await updateThreadDetails(thread.id,title,summary);
      state.threadId=saved.id;
      close();
      renderThread();
      toast('thread updated');
    },'edit thread');
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
      if(!thread||!header||document.getElementById('edit-thread'))return;
      const btn=document.createElement('button');
      btn.id='edit-thread';
      btn.className='ghost';
      btn.type='button';
      btn.textContent='edit thread';
      btn.onclick=()=>renderEditThreadModal(thread);
      header.appendChild(btn);
    };

    window.renderEditThreadModal=renderEditThreadModal;
    window.updateThreadDetails=updateThreadDetails;

    try{
      if(state.session&&state.view==='thread')renderThread();
    }catch(_e){}
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{
      if(install())clearInterval(timer);
    },50);
    setTimeout(()=>clearInterval(timer),6000);
  }
})();
