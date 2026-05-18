/*
  GAYA Persona Core UI
  Owns the base persona list, editor, form reading, and preview rendering.
  Enhancement modules patch these functions after this file loads.
*/

function defaultPersona(){
  return {
    id:null,
    name:'New Persona',
    avatar_url:'',
    banner_url:'',
    bottom_banner_url:'',
    signature:'',
    bg_color:'#fff9ed',
    text_color:'#2b241c',
    accent_color:'#a9854d',
    border_color:'#cdbf9f',
    font_family:"Sorts Mill Goudy, Georgia, serif",
    custom_css:''
  };
}

function personaById(id){
  return state.mine.find(p=>String(p.id)===String(id));
}

function renderPersonas(){
  if(!state.editPersonaId&&state.mine[0])state.editPersonaId=state.mine[0].id;

  let body='<div class="header"><div><p class="kicker">costume department</p><h1>Personas</h1></div><button id="new-persona">＋ new persona</button></div><div class="persona-layout"><aside><h3>yours</h3><div class="persona-list">';

  if(!state.mine.length){
    body+='<p class="muted">none yet</p>';
  }else{
    body+=state.mine.map(p=>
      '<div class="persona-card '+(String(p.id)===String(state.editPersonaId)?'active':'')+'" data-id="'+esc(p.id)+'">'+
        '<span class="dot" style="background:'+esc(p.accent_color||'#a9854d')+'"></span>'+esc(p.name)+
      '</div>'
    ).join('');
  }

  body+='</div></aside><section id="persona-editor"></section></div>';
  $('main').innerHTML=body;

  $('new-persona').onclick=()=>{
    state.editPersonaId='new';
    renderPersonas();
  };

  document.querySelectorAll('.persona-card[data-id]').forEach(el=>{
    el.onclick=()=>{
      state.editPersonaId=el.dataset.id;
      renderPersonas();
    };
  });

  renderPersonaEditor();
}

function renderPersonaEditor(){
  const area=$('persona-editor');
  if(!area)return;

  const isNew=state.editPersonaId==='new'||!state.editPersonaId;
  const p=isNew?defaultPersona():Object.assign(defaultPersona(),personaById(state.editPersonaId)||{});

  area.innerHTML=
    '<div class="editor"><h2>'+(isNew?'New persona':'Edit persona')+'</h2><div class="editor-grid mt">'+
      '<div class="field full"><label>name</label><input id="pe-name" value="'+esc(p.name||'')+'"></div>'+
      '<div class="field"><label>avatar url</label><input id="pe-avatar" value="'+esc(p.avatar_url||'')+'"></div>'+
      '<div class="field"><label>top banner url</label><input id="pe-banner" value="'+esc(p.banner_url||'')+'"></div>'+
      '<div class="field"><label>bottom banner url</label><input id="pe-bottom-banner" value="'+esc(p.bottom_banner_url||'')+'"><p class="muted preview-note">Optional. If empty, bottom banner can fall back to the top banner in banner layouts.</p></div>'+
      colorField('bg','background',p.bg_color)+
      colorField('text','text',p.text_color)+
      colorField('accent','accent',p.accent_color)+
      colorField('border','border',p.border_color)+
      '<div class="field full"><label>font family</label><input id="pe-font" list="font-options" value="'+esc(p.font_family||'')+'"><datalist id="font-options"><option value="Sorts Mill Goudy, Georgia, serif"><option value="IM Fell English, Sorts Mill Goudy, Georgia, serif"><option value="Literata, Georgia, serif"><option value="Fixedsys, Fixedsys Excelsior, Lucida Console, Courier New, monospace"><option value="Georgia, serif"><option value="Times New Roman, serif"><option value="Arial, sans-serif"><option value="Courier New, monospace"></datalist><p class="muted preview-note">Multi-word fonts are auto-quoted when rendered.</p></div>'+
      '<div class="field full"><label>signature markdown</label><textarea id="pe-signature">'+esc(p.signature||'')+'</textarea></div>'+
      '<div class="field full"><label>custom css notes</label><textarea id="pe-css" placeholder="saved, but not executed yet while we keep the app stable">'+esc(p.custom_css||'')+'</textarea><p class="muted preview-note">Custom CSS is scoped to this persona’s posts. Use & for the post card itself.</p></div>'+
    '</div><div class="spread mt"><div class="row"><button id="save-persona">save persona</button><button class="ghost" id="reset-persona">reset</button></div>'+
      (isNew?'':'<button class="danger" id="delete-persona">delete persona</button>')+
    '</div><div id="persona-status"></div><div class="mt2"><h3>preview</h3><div id="persona-preview"></div></div></div>';

  ['name','avatar','banner','bottom-banner','bg-c','bg-t','text-c','text-t','accent-c','accent-t','border-c','border-t','font','signature','css'].forEach(key=>{
    const el=$('pe-'+key);
    if(el)el.oninput=updatePersonaPreview;
  });

  [['bg','bg_color'],['text','text_color'],['accent','accent_color'],['border','border_color']].forEach(([k])=>{
    const c=$('pe-'+k+'-c');
    const t=$('pe-'+k+'-t');

    c.oninput=()=>{
      t.value=c.value;
      updatePersonaPreview();
    };

    t.oninput=()=>{
      if(/^#[0-9a-fA-F]{6}$/.test(t.value))c.value=t.value;
      updatePersonaPreview();
    };
  });

  $('save-persona').onclick=async()=>{
    const payload=readPersonaForm();
    if(!payload.name.trim())return toast('name required','err');

    const btn=$('save-persona');

    try{
      btn.disabled=true;
      btn.textContent='saving…';
      setStatus('ok','saving…');
      const saved=await savePersona(payload,isNew?null:p.id);
      state.editPersonaId=saved.id;
      toast('persona saved');
      renderPersonas();
    }catch(e){
      console.error('persona save failed',e);
      setStatus('err','Save failed: '+(e.message||String(e))+(e.details?'\n'+e.details:'')+(e.hint?'\nHint: '+e.hint:''));
      toast('persona save failed','err');
    }finally{
      const again=$('save-persona');
      if(again){
        again.disabled=false;
        again.textContent='save persona';
      }
    }
  };

  $('reset-persona').onclick=()=>renderPersonaEditor();

  if(!isNew){
    $('delete-persona').onclick=()=>safe(async()=>{
      if(!confirm('Delete '+p.name+'?'))return;
      await deletePersona(p.id);
      state.editPersonaId=state.mine[0]?.id||'new';
      toast('persona deleted');
      renderPersonas();
    },'delete persona');
  }

  updatePersonaPreview();
}

function colorField(k,label,value){
  return '<div class="field"><label>'+label+'</label><div class="color-pair"><input id="pe-'+k+'-c" type="color" value="'+esc(value||'#000000')+'"><input id="pe-'+k+'-t" value="'+esc(value||'')+'"></div></div>';
}

function readPersonaForm(){
  const bottomInput=$('pe-bottom-banner');
  return {
    name:$('pe-name').value.trim(),
    avatar_url:$('pe-avatar').value.trim()||null,
    banner_url:$('pe-banner').value.trim()||null,
    bottom_banner_url:bottomInput&&bottomInput.value.trim()?bottomInput.value.trim():null,
    signature:$('pe-signature').value.trim()||null,
    bg_color:$('pe-bg-t').value.trim()||'#fff9ed',
    text_color:$('pe-text-t').value.trim()||'#2b241c',
    accent_color:$('pe-accent-t').value.trim()||'#a9854d',
    border_color:$('pe-border-t').value.trim()||'#cdbf9f',
    font_family:$('pe-font').value.trim()||null,
    custom_css:$('pe-css').value.trim()||null,
    updated_at:new Date().toISOString()
  };
}

function updatePersonaPreview(){
  const box=$('persona-preview');
  if(!box)return;

  const p=readPersonaForm();
  const f=fontStyle(p.font_family);
  const banner=p.banner_url?'<div class="banner" style="background-image:url('+JSON.stringify(p.banner_url)+')"></div>':'';
  const bottomBanner=p.bottom_banner_url?'<div class="banner bottom-banner" style="background-image:url('+JSON.stringify(p.bottom_banner_url)+')"></div>':'';
  const avatar=p.avatar_url?'background-image:url('+JSON.stringify(p.avatar_url)+')':'';
  const scopeId='persona-preview';
  const scope='[data-persona-style="'+scopeId+'"]';
  const custom=customCssTag(p.custom_css,scope);

  box.innerHTML=custom+'<article class="post" data-persona-style="'+scopeId+'" style="background:'+esc(p.bg_color)+';color:'+esc(p.text_color)+';border-color:'+esc(p.border_color)+';'+f+'">'+
    banner+
    '<div class="post-head"><div class="avatar" style="background-color:'+esc(p.accent_color)+';'+avatar+'"></div><div class="post-name" style="'+f+'">'+esc(p.name||'unnamed')+'</div><div class="post-meta">preview</div></div>'+
    '<div class="post-body" style="'+f+'"><p>This is how the persona speaks on the page.</p><blockquote>A line worth setting apart.</blockquote></div>'+
    (p.signature?'<div class="signature-block" style="'+f+'">'+md(p.signature)+'</div>':'')+
    bottomBanner+
    '</article>';
}