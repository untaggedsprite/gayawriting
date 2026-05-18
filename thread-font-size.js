/*
  GAYA Thread Font Size
  Stores a thread-level text size in a hidden summary marker so story sections
  can be tuned without making font size a persona costume option.
*/

(function(){
  const MARK_START='<!-- GAYA_THREAD_FONT_SIZE:';
  const MARK_END=' -->';
  const VALID=['tiny','small','standard','large','huge'];

  function normalizeThreadFontSize(value){
    value=String(value||'').toLowerCase();
    return VALID.includes(value)?value:'standard';
  }

  function threadFontSizeFromSummary(summary){
    const match=String(summary||'').match(/<!--\s*GAYA_THREAD_FONT_SIZE:\s*(tiny|small|standard|large|huge)\s*-->/i);
    return normalizeThreadFontSize(match?.[1]||'standard');
  }

  function stripThreadFontSizeMarker(summary){
    return String(summary||'')
      .replace(/<!--\s*GAYA_THREAD_FONT_SIZE:\s*(tiny|small|standard|large|huge)\s*-->/ig,'')
      .trim();
  }

  function summaryWithThreadFontSize(summary,size){
    const clean=stripThreadFontSizeMarker(summary);
    size=normalizeThreadFontSize(size);
    if(size==='standard')return clean;
    return (clean?clean+'\n\n':'')+MARK_START+size+MARK_END;
  }

  function rawSummaryForThread(thread){
    if(!thread)return '';
    const current=String(thread.summary||'');
    const stored=String(thread._gaya_summary_raw||'');
    if(stored && stripThreadFontSizeMarker(stored)===current)return stored;
    return current;
  }

  function normalizeLoadedThreads(){
    if(!state?.threads)return;
    state.threads=state.threads.map(thread=>{
      if(!thread)return thread;
      const raw=rawSummaryForThread(thread);
      return Object.assign(thread,{
        _gaya_summary_raw:raw,
        _gaya_thread_font_size:threadFontSizeFromSummary(raw),
        summary:stripThreadFontSizeMarker(raw)
      });
    });
  }

  function currentThread(){
    return state?.threads?.find(t=>String(t.id)===String(state.threadId));
  }

  function currentThreadFontSize(thread){
    if(!thread)return 'standard';
    const raw=rawSummaryForThread(thread);
    return normalizeThreadFontSize(thread._gaya_thread_font_size||threadFontSizeFromSummary(raw));
  }

  function fontSizeOptionsHtml(current){
    current=normalizeThreadFontSize(current);
    const options=[
      ['tiny','tiny','very small text'],
      ['small','small','slightly smaller text'],
      ['standard','standard','default story text'],
      ['large','large','easier reading size'],
      ['huge','huge','big dramatic text']
    ];
    return options.map(([value,label,note])=>
      '<option value="'+esc(value)+'" '+(value===current?'selected':'')+'>'+esc(label)+' — '+esc(note)+'</option>'
    ).join('');
  }

  function fontSizeFieldHtml(current){
    return '<div class="mt thread-font-size-field"><label>thread font size</label><select id="thread-font-size">'+fontSizeOptionsHtml(current)+'</select><p class="muted preview-note">Applies to every post in this thread only.</p></div>';
  }

  function selectedThreadFontSize(){
    return normalizeThreadFontSize(document.getElementById('thread-font-size')?.value||'standard');
  }

  function setThreadFontAttr(node,size){
    if(!node)return;
    node.dataset.threadFontSize=normalizeThreadFontSize(size);
  }

  function clearThreadFontAttr(node){
    if(node)node.removeAttribute('data-thread-font-size');
  }

  function decorateThreadFontSize(){
    const main=document.getElementById('main');
    const posts=document.getElementById('posts');

    if(state.view!=='thread'){
      clearThreadFontAttr(document.body);
      clearThreadFontAttr(main);
      clearThreadFontAttr(posts);
      document.querySelectorAll('.post[data-thread-font-size]').forEach(post=>clearThreadFontAttr(post));
      return;
    }

    const size=currentThreadFontSize(currentThread());
    setThreadFontAttr(document.body,size);
    setThreadFontAttr(main,size);
    setThreadFontAttr(posts,size);
    document.querySelectorAll('#posts .post').forEach(post=>setThreadFontAttr(post,size));
    renderInlineThreadFontControl();
  }

  function canCurrentUserEditThread(thread){
    const uid=state?.user?.id?String(state.user.id):'';
    return !!(thread&&thread.created_by&&uid&&String(thread.created_by)===uid);
  }

  async function saveThreadFontSize(size){
    const thread=currentThread();
    if(!thread)return toast('thread not found','err');
    size=normalizeThreadFontSize(size);
    decorateThreadFontSize();

    try{
      if(typeof updateThreadDetails!=='function')throw new Error('thread editor is not ready yet');
      const raw=rawSummaryForThread(thread);
      const title=thread.title||'';
      const saved=await updateThreadDetails(thread.id,title,summaryWithThreadFontSize(raw,size));
      state.threadId=saved.id;
      await loadThreads();
      normalizeLoadedThreads();
      renderThread();
      toast('thread font size updated');
    }catch(e){
      console.error('thread font size update failed',e);
      toast('thread font size update failed: '+(e.message||String(e)),'err');
    }
  }

  function renderInlineThreadFontControl(){
    const thread=currentThread();
    const header=document.querySelector('#main .header');
    if(!header||!thread||document.getElementById('thread-font-size-page'))return;
    if(!canCurrentUserEditThread(thread))return;

    const wrap=document.createElement('label');
    wrap.className='thread-tool thread-font-size-page-control';
    wrap.style.display='inline-flex';
    wrap.style.alignItems='center';
    wrap.style.gap='.35rem';
    wrap.style.marginLeft='.5rem';
    wrap.innerHTML='<span>text</span><select id="thread-font-size-page" aria-label="thread font size">'+fontSizeOptionsHtml(currentThreadFontSize(thread))+'</select>';
    const select=wrap.querySelector('select');
    select.onchange=()=>{
      const size=normalizeThreadFontSize(select.value);
      thread._gaya_thread_font_size=size;
      decorateThreadFontSize();
      saveThreadFontSize(size);
    };
    header.appendChild(wrap);
  }

  function enhanceNewThreadModal(){
    const summary=document.getElementById('thread-summary');
    if(!summary||document.getElementById('thread-font-size'))return;
    summary.closest('.mt')?.insertAdjacentHTML('afterend',fontSizeFieldHtml('standard'));
  }

  function replaceNewThreadSave(){
    const btn=document.getElementById('create-thread');
    if(!btn||btn.dataset.threadFontReady)return;
    btn.dataset.threadFontReady='1';
    btn.onclick=()=>safe(async()=>{
      const title=document.getElementById('thread-title').value.trim();
      const summary=document.getElementById('thread-summary').value.trim();
      if(!title)return toast('title required','err');
      btn.disabled=true;
      btn.textContent='creating…';
      const thread=await createThread(title,summaryWithThreadFontSize(summary,selectedThreadFontSize()));
      document.querySelector('.modal-bg')?.remove();
      state.modal=null;
      state.posts=[];
      await loadThreads();
      normalizeLoadedThreads();
      go('thread/'+thread.id);
      setTimeout(decorateThreadFontSize,0);
      toast('thread created');
    },'create thread');
  }

  function enhanceEditThreadModal(){
    const summary=document.getElementById('edit-thread-summary');
    if(!summary)return;
    const thread=currentThread();

    if(thread && !summary.dataset.threadFontCleaned){
      summary.value=stripThreadFontSizeMarker(rawSummaryForThread(thread));
      summary.dataset.threadFontCleaned='1';
    }

    if(!document.getElementById('thread-font-size')){
      summary.closest('.mt')?.insertAdjacentHTML('afterend',fontSizeFieldHtml(currentThreadFontSize(thread)));
    }

    const btn=document.getElementById('edit-thread-save');
    if(!btn||btn.dataset.threadFontReady)return;
    btn.dataset.threadFontReady='1';
    btn.onclick=async()=>{
      const thread=currentThread();
      const title=document.getElementById('edit-thread-title').value.trim();
      const summary=document.getElementById('edit-thread-summary').value.trim();
      if(!thread)return toast('thread not found','err');
      if(!title)return toast('title required','err');
      try{
        btn.disabled=true;
        btn.textContent='saving…';
        const saved=await updateThreadDetails(thread.id,title,summaryWithThreadFontSize(summary,selectedThreadFontSize()));
        state.threadId=saved.id;
        document.getElementById('edit-thread-modal')?.remove();
        await loadThreads();
        normalizeLoadedThreads();
        renderThread();
        decorateThreadFontSize();
        toast('thread updated');
      }catch(e){
        btn.disabled=false;
        btn.textContent='save changes';
        console.error('thread edit failed',e);
        toast('thread edit failed: '+(e.message||String(e)),'err');
      }
    };
  }

  function watchModals(){
    const observer=new MutationObserver(()=>{
      enhanceNewThreadModal();
      replaceNewThreadSave();
      enhanceEditThreadModal();
      decorateThreadFontSize();
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(typeof loadThreads==='function'){
    const previousLoadThreads=loadThreads;
    loadThreads=async function(){
      const result=await previousLoadThreads();
      normalizeLoadedThreads();
      return result;
    };
  }

  if(typeof renderThread==='function'){
    const previousRenderThread=renderThread;
    renderThread=function(){
      previousRenderThread();
      decorateThreadFontSize();
    };
  }

  if(typeof renderThreads==='function'){
    const previousRenderThreads=renderThreads;
    renderThreads=function(){
      previousRenderThreads();
      decorateThreadFontSize();
    };
  }

  if(typeof renderPosts==='function'){
    const previousRenderPosts=renderPosts;
    renderPosts=function(){
      previousRenderPosts();
      decorateThreadFontSize();
    };
  }

  if(typeof renderNewThreadModal==='function'){
    const previousRenderNewThreadModal=renderNewThreadModal;
    renderNewThreadModal=function(){
      previousRenderNewThreadModal();
      enhanceNewThreadModal();
      replaceNewThreadSave();
    };
  }

  window.normalizeThreadFontSize=normalizeThreadFontSize;
  window.threadFontSizeFromSummary=threadFontSizeFromSummary;
  window.stripThreadFontSizeMarker=stripThreadFontSizeMarker;
  window.summaryWithThreadFontSize=summaryWithThreadFontSize;
  window.decorateThreadFontSize=decorateThreadFontSize;

  normalizeLoadedThreads();
  decorateThreadFontSize();
  watchModals();
})();