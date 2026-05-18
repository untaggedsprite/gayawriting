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

  function normalizeLoadedThreads(){
    if(!state?.threads)return;
    state.threads=state.threads.map(thread=>{
      if(!thread)return thread;
      const raw=thread._gaya_summary_raw!==undefined?thread._gaya_summary_raw:(thread.summary||'');
      return Object.assign(thread,{
        _gaya_summary_raw:raw,
        _gaya_thread_font_size:threadFontSizeFromSummary(raw),
        summary:stripThreadFontSizeMarker(raw)
      });
    });
  }

  function currentThreadFontSize(thread){
    if(!thread)return 'standard';
    return normalizeThreadFontSize(thread._gaya_thread_font_size||threadFontSizeFromSummary(thread._gaya_summary_raw||thread.summary));
  }

  function currentThreadRawSummary(thread){
    if(!thread)return '';
    return thread._gaya_summary_raw!==undefined?thread._gaya_summary_raw:(thread.summary||'');
  }

  function fontSizeFieldHtml(current){
    current=normalizeThreadFontSize(current);
    const options=[
      ['tiny','tiny','very small text'],
      ['small','small','slightly smaller text'],
      ['standard','standard','default story text'],
      ['large','large','easier reading size'],
      ['huge','huge','big dramatic text']
    ];
    return '<div class="mt"><label>thread font size</label><select id="thread-font-size">'+options.map(([value,label,note])=>
      '<option value="'+esc(value)+'" '+(value===current?'selected':'')+'>'+esc(label)+' — '+esc(note)+'</option>'
    ).join('')+'</select><p class="muted preview-note">Applies to every post in this thread only.</p></div>';
  }

  function selectedThreadFontSize(){
    return normalizeThreadFontSize(document.getElementById('thread-font-size')?.value||'standard');
  }

  function decorateMainForThread(){
    const main=document.getElementById('main');
    if(!main)return;
    if(state.view!=='thread'){
      main.removeAttribute('data-thread-font-size');
      return;
    }
    const thread=state.threads.find(t=>String(t.id)===String(state.threadId));
    main.dataset.threadFontSize=currentThreadFontSize(thread);
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
      toast('thread created');
    },'create thread');
  }

  function enhanceEditThreadModal(){
    const summary=document.getElementById('edit-thread-summary');
    if(!summary)return;
    const thread=state.threads.find(t=>String(t.id)===String(state.threadId));
    if(thread){
      summary.value=stripThreadFontSizeMarker(currentThreadRawSummary(thread));
    }
    if(!document.getElementById('thread-font-size')){
      summary.closest('.mt')?.insertAdjacentHTML('afterend',fontSizeFieldHtml(currentThreadFontSize(thread)));
    }

    const btn=document.getElementById('edit-thread-save');
    if(!btn||btn.dataset.threadFontReady)return;
    btn.dataset.threadFontReady='1';
    btn.onclick=async()=>{
      const thread=state.threads.find(t=>String(t.id)===String(state.threadId));
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
      decorateMainForThread();
    };
  }

  if(typeof renderThreads==='function'){
    const previousRenderThreads=renderThreads;
    renderThreads=function(){
      previousRenderThreads();
      decorateMainForThread();
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

  normalizeLoadedThreads();
  decorateMainForThread();
  watchModals();
})();