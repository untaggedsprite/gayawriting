/* GAYA Chronicle / shared timeline */
(function(){
  const MARK='__gayaChronicleInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  const STATUSES=['canon','draft','revised','retired','contradiction'];
  state.chronicleEvents=state.chronicleEvents||[];
  state.chronicleFilters=state.chronicleFilters||{q:'',era:'',character:'',status:''};

  function clean(v){return String(v||'').trim();}

  function eventSortValue(ev){
    if(ev.sort_key!==null&&ev.sort_key!==undefined&&ev.sort_key!=='')return Number(ev.sort_key);
    if(ev.event_date){
      const t=new Date(ev.event_date+'T00:00:00').getTime();
      if(!Number.isNaN(t))return t;
    }
    return 9007199254740991;
  }

  function eventDisplayDate(ev){
    if(ev.date_label)return esc(ev.date_label);
    if(ev.event_date)return esc(dateLabel(ev.event_date));
    return 'undated';
  }

  function eventYearGroup(ev){
    if(ev.event_date)return String(ev.event_date).slice(0,4);
    if(ev.era)return ev.era;
    return 'Undated';
  }

  function splitTags(value){
    return clean(value).split(',').map(s=>s.trim()).filter(Boolean);
  }

  function statusOptions(selected){
    return STATUSES.map(s=>'<option value="'+esc(s)+'" '+(s===selected?'selected':'')+'>'+esc(s)+'</option>').join('');
  }

  function threadOptions(selected){
    return '<option value="">none</option>'+state.threads.map(t=>'<option value="'+esc(t.id)+'" '+(String(t.id)===String(selected||'')?'selected':'')+'>'+esc(t.title)+'</option>').join('');
  }

  function getFilterLists(){
    const eras=new Set();
    const chars=new Set();
    state.chronicleEvents.forEach(ev=>{
      if(ev.era)eras.add(ev.era);
      splitTags(ev.characters).forEach(c=>chars.add(c));
    });
    return {
      eras:[...eras].sort((a,b)=>a.localeCompare(b)),
      chars:[...chars].sort((a,b)=>a.localeCompare(b))
    };
  }

  function filteredEvents(){
    const f=state.chronicleFilters||{};
    const q=clean(f.q).toLowerCase();
    return [...(state.chronicleEvents||[])].filter(ev=>{
      if(f.era&&ev.era!==f.era)return false;
      if(f.status&&ev.canon_status!==f.status)return false;
      if(f.character&&!splitTags(ev.characters).some(c=>c.toLowerCase()===f.character.toLowerCase()))return false;
      if(q){
        const hay=[ev.title,ev.date_label,ev.era,ev.arc,ev.location,ev.characters,ev.summary,ev.notes,ev.canon_status].join(' ').toLowerCase();
        if(!hay.includes(q))return false;
      }
      return true;
    }).sort((a,b)=>eventSortValue(a)-eventSortValue(b)||String(a.title||'').localeCompare(String(b.title||'')));
  }

  async function loadChronicleEvents(){
    const {data,error}=await dataWait(
      supa.from('timeline_events').select('*').order('sort_key',{ascending:true,nullsFirst:false}).order('event_date',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true}),
      'chronicle load',
      20000
    );
    if(error)throw error;
    state.chronicleEvents=data||[];
  }

  async function saveChronicleEvent(payload,id){
    const uid=currentUserId();
    if(!uid)throw new Error('You must be signed in to save chronicle events.');

    const cleanPayload={
      title:clean(payload.title),
      event_date:clean(payload.event_date)||null,
      date_label:clean(payload.date_label)||null,
      sort_key:clean(payload.sort_key)===''?null:Number(payload.sort_key),
      era:clean(payload.era)||null,
      arc:clean(payload.arc)||null,
      location:clean(payload.location)||null,
      characters:clean(payload.characters)||null,
      summary:clean(payload.summary)||null,
      notes:clean(payload.notes)||null,
      canon_status:clean(payload.canon_status)||'canon',
      related_thread_id:clean(payload.related_thread_id)||null,
      updated_by:uid,
      updated_at:new Date().toISOString()
    };

    if(!cleanPayload.title)throw new Error('Title required.');
    if(cleanPayload.sort_key!==null&&!Number.isFinite(cleanPayload.sort_key))throw new Error('Sort key must be a number or blank.');
    if(!STATUSES.includes(cleanPayload.canon_status))cleanPayload.canon_status='canon';

    let result;
    if(id){
      result=await dataWait(
        supa.from('timeline_events').update(cleanPayload).eq('id',id).select('*').maybeSingle(),
        'chronicle update',
        20000
      );
    }else{
      cleanPayload.created_by=uid;
      result=await dataWait(
        supa.from('timeline_events').insert(cleanPayload).select('*').single(),
        'chronicle insert',
        20000
      );
    }

    if(result.error)throw result.error;
    await loadChronicleEvents();
    return result.data;
  }

  async function deleteChronicleEvent(id){
    const {error}=await dataWait(
      supa.from('timeline_events').delete().eq('id',id),
      'chronicle delete',
      20000
    );
    if(error)throw error;
    await loadChronicleEvents();
  }

  function renderChronicleError(error){
    $('main').innerHTML='<div class="header chronicle-header"><div><p class="kicker">shared story spine</p><h1>Chronicle</h1></div></div><div class="error chronicle-error"><h2>chronicle table not ready</h2><p class="muted">Run the Supabase SQL from <code>supabase/chronicle_timeline.sql</code>, then refresh this page.</p><pre>'+esc(error?.message||String(error||''))+'</pre></div>';
  }

  function renderChronicle(){
    const main=$('main');
    if(!main)return;
    const lists=getFilterLists();
    const f=state.chronicleFilters||{};
    const events=filteredEvents();

    let body='<div class="header chronicle-header"><div><p class="kicker">shared story spine</p><h1>Chronicle</h1></div><button id="new-chronicle-event">＋ new event</button></div>';
    body+='<div class="chronicle-tools">'+
      '<div><label>search</label><input id="chronicle-q" value="'+esc(f.q||'')+'" placeholder="title, notes, place, rot..."></div>'+
      '<div><label>era</label><select id="chronicle-era"><option value="">all eras</option>'+lists.eras.map(v=>'<option value="'+esc(v)+'" '+(v===f.era?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></div>'+
      '<div><label>character</label><select id="chronicle-character"><option value="">all characters</option>'+lists.chars.map(v=>'<option value="'+esc(v)+'" '+(v===f.character?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></div>'+
      '<div><label>status</label><select id="chronicle-status"><option value="">all statuses</option>'+STATUSES.map(v=>'<option value="'+esc(v)+'" '+(v===f.status?'selected':'')+'>'+esc(v)+'</option>').join('')+'</select></div>'+
    '</div>';

    if(!state.chronicleEvents.length){
      body+='<div class="empty chronicle-empty"><div><h2>nothing logged yet</h2><p class="muted">plant the first event above</p></div></div>';
    }else if(!events.length){
      body+='<div class="empty chronicle-empty"><div><h2>no matching events</h2><p class="muted">the archive coughs up dust, not answers</p></div></div>';
    }else{
      body+='<div class="chronicle-list">';
      let group='';
      events.forEach(ev=>{
        const nextGroup=eventYearGroup(ev);
        if(nextGroup!==group){
          group=nextGroup;
          body+='<div class="chronicle-year">'+esc(group)+'</div>';
        }
        const thread=ev.related_thread_id?state.threads.find(t=>String(t.id)===String(ev.related_thread_id)):null;
        const chips=[];
        if(ev.canon_status)chips.push('<span class="chronicle-chip status">'+esc(ev.canon_status)+'</span>');
        if(ev.era)chips.push('<span class="chronicle-chip">'+esc(ev.era)+'</span>');
        if(ev.arc)chips.push('<span class="chronicle-chip">'+esc(ev.arc)+'</span>');
        if(ev.location)chips.push('<span class="chronicle-chip">'+esc(ev.location)+'</span>');
        splitTags(ev.characters).forEach(c=>chips.push('<span class="chronicle-chip">'+esc(c)+'</span>'));

        body+='<article class="chronicle-event">'+
          '<div class="chronicle-date">'+eventDisplayDate(ev)+'</div>'+
          '<div><h3>'+esc(ev.title)+'</h3>'+
          (chips.length?'<div class="chronicle-meta">'+chips.join('')+'</div>':'')+
          (ev.summary?'<div class="chronicle-summary">'+md(ev.summary)+'</div>':'')+
          (ev.notes?'<div class="chronicle-notes"><details><summary>notes</summary>'+md(ev.notes)+'</details></div>':'')+
          '<div class="chronicle-actions">'+
            (thread?'<a class="thread-tool ghost" href="#thread/'+esc(thread.id)+'">open thread</a>':'')+
            '<button type="button" class="thread-tool edit-chronicle" data-id="'+esc(ev.id)+'">edit event</button>'+
          '</div></div></article>';
      });
      body+='</div>';
    }

    main.innerHTML=body;
    $('new-chronicle-event').onclick=()=>renderChronicleModal();
    $('chronicle-q').oninput=e=>{state.chronicleFilters.q=e.target.value;renderChronicle();};
    $('chronicle-era').onchange=e=>{state.chronicleFilters.era=e.target.value;renderChronicle();};
    $('chronicle-character').onchange=e=>{state.chronicleFilters.character=e.target.value;renderChronicle();};
    $('chronicle-status').onchange=e=>{state.chronicleFilters.status=e.target.value;renderChronicle();};
    document.querySelectorAll('.edit-chronicle').forEach(btn=>{
      btn.onclick=()=>renderChronicleModal(state.chronicleEvents.find(ev=>String(ev.id)===String(btn.dataset.id)));
    });
  }

  function renderChronicleModal(ev){
    const existing=document.getElementById('chronicle-modal');
    if(existing)existing.remove();
    ev=ev||{};
    const wrap=document.createElement('div');
    wrap.className='modal-bg';
    wrap.id='chronicle-modal';
    wrap.innerHTML='<div class="modal"><button class="close" id="chronicle-close">×</button><h2>'+(ev.id?'Edit':'New')+' chronicle event</h2><div class="chronicle-modal-grid mt">'+
      '<div class="full"><label>title</label><input id="chronicle-title" value="'+esc(ev.title||'')+'" placeholder="what happened"></div>'+
      '<div><label>exact date</label><input id="chronicle-event-date" type="date" value="'+esc(ev.event_date||'')+'"></div>'+
      '<div><label>display date</label><input id="chronicle-date-label" value="'+esc(ev.date_label||'')+'" placeholder="optional pretty/fuzzy label"></div>'+
      '<div><label>sort key</label><input id="chronicle-sort-key" type="number" step="1" value="'+esc(ev.sort_key??'')+'" placeholder="optional manual order"></div>'+
      '<div><label>canon status</label><select id="chronicle-canon-status">'+statusOptions(ev.canon_status||'canon')+'</select></div>'+
      '<div><label>era</label><input id="chronicle-era-input" value="'+esc(ev.era||'')+'" placeholder="90s, present day, fae realm..."></div>'+
      '<div><label>arc</label><input id="chronicle-arc" value="'+esc(ev.arc||'')+'" placeholder="story arc"></div>'+
      '<div><label>location</label><input id="chronicle-location" value="'+esc(ev.location||'')+'" placeholder="where"></div>'+
      '<div><label>characters</label><input id="chronicle-characters" value="'+esc(ev.characters||'')+'" placeholder="comma separated"></div>'+
      '<div class="full"><label>related thread</label><select id="chronicle-thread">'+threadOptions(ev.related_thread_id)+'</select></div>'+
      '<div class="full"><label>summary</label><textarea id="chronicle-summary" placeholder="short public-facing event note">'+esc(ev.summary||'')+'</textarea></div>'+
      '<div class="full"><label>notes</label><textarea id="chronicle-notes" placeholder="longer canon notes, contradictions, receipts">'+esc(ev.notes||'')+'</textarea></div>'+
    '</div><div class="spread mt"><button class="ghost" id="chronicle-cancel">cancel</button><div class="row">'+(ev.id?'<button class="danger" id="chronicle-delete">delete</button>':'')+'<button id="chronicle-save">save event</button></div></div></div>';
    document.body.appendChild(wrap);

    const close=()=>wrap.remove();
    $('chronicle-close').onclick=close;
    $('chronicle-cancel').onclick=close;
    wrap.onclick=e=>{if(e.target===wrap)toast('Use cancel or × to close the chronicle editor.','err');};
    setTimeout(()=>$('chronicle-title')?.focus(),0);

    $('chronicle-save').onclick=()=>safe(async()=>{
      const btn=$('chronicle-save');
      btn.disabled=true;
      btn.textContent='saving…';
      await saveChronicleEvent({
        title:$('chronicle-title').value,
        event_date:$('chronicle-event-date').value,
        date_label:$('chronicle-date-label').value,
        sort_key:$('chronicle-sort-key').value,
        canon_status:$('chronicle-canon-status').value,
        era:$('chronicle-era-input').value,
        arc:$('chronicle-arc').value,
        location:$('chronicle-location').value,
        characters:$('chronicle-characters').value,
        related_thread_id:$('chronicle-thread').value,
        summary:$('chronicle-summary').value,
        notes:$('chronicle-notes').value
      },ev.id);
      close();
      renderChronicle();
      toast('chronicle saved');
    },'save chronicle event');

    if(ev.id&&$('chronicle-delete')){
      $('chronicle-delete').onclick=()=>safe(async()=>{
        if(!confirm('Delete this chronicle event?'))return;
        await deleteChronicleEvent(ev.id);
        close();
        renderChronicle();
        toast('chronicle event deleted');
      },'delete chronicle event');
    }
  }

  async function openChronicle(){
    const main=$('main');
    if(main)main.innerHTML='<div class="empty"><div><h2>opening chronicle</h2><p class="muted">consulting the haunted municipal records…</p></div></div>';
    try{
      await loadChronicleEvents();
      renderChronicle();
    }catch(e){
      console.error('chronicle load failed',e);
      renderChronicleError(e);
    }
  }

  const originalReadRoute=readRoute;
  readRoute=function(){
    const h=(location.hash||'#threads').slice(1);
    if(h==='chronicle'){state.view='chronicle';state.threadId=null;return;}
    originalReadRoute();
  };

  const originalRefreshRoute=refreshRoute;
  refreshRoute=async function(){
    readRoute();
    if(state.session&&state.view==='chronicle')return openChronicle();
    return originalRefreshRoute();
  };

  const originalRenderShell=renderShell;
  renderShell=function(){
    const oldView=state.view;
    originalRenderShell();
    const nav=document.querySelector('.tabs');
    if(nav&&!nav.querySelector('a[href="#chronicle"]')){
      const a=document.createElement('a');
      a.href='#chronicle';
      a.textContent='chronicle';
      a.className=oldView==='chronicle'?'active':'';
      nav.appendChild(a);
    }
    if(oldView==='chronicle')openChronicle();
  };

  window.loadChronicleEvents=loadChronicleEvents;
  window.renderChronicle=renderChronicle;
  window.saveChronicleEvent=saveChronicleEvent;
})();
