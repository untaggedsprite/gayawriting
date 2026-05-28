/*
  GAYA Persona Studio
  Friendlier post-style editing layered over the original persona editor.
  No schema changes: the editor writes the existing persona fields.
*/

const PERSONA_FONT_OPTIONS=[
  ['storybook serif','Sorts Mill Goudy, Georgia, serif'],
  ['old book','IM Fell English, Sorts Mill Goudy, Georgia, serif'],
  ['clean readable','Literata, Georgia, serif'],
  ['archive serif','EB Garamond, Georgia, serif'],
  ['gothic letter','Cormorant Garamond, Georgia, serif'],
  ['classic sans','Atkinson Hyperlegible, Arial, sans-serif'],
  ['typewriter','Special Elite, Courier New, monospace'],
  ['console','Lucida Console, Courier New, monospace'],
  ['classic Georgia','Georgia, serif'],
  ['plain sans','Arial, sans-serif']
];

function personaFontOptions(current){
  current=String(current||'');
  const known=PERSONA_FONT_OPTIONS.some(([,value])=>value===current);
  let html=known||!current?'':'<option value="'+esc(current)+'" selected>current custom font</option>';
  html+=PERSONA_FONT_OPTIONS.map(([label,value])=>'<option value="'+esc(value)+'" '+(value===current?'selected':'')+'>'+esc(label)+'</option>').join('');
  return html;
}

function firstFontName(stack){
  return String(stack||'').split(',')[0].trim().replace(/^[\'"]|[\'"]$/g,'');
}

function applyFontStack(el,stack){
  if(!el)return;
  if(typeof cssFontFamily==='function')el.style.fontFamily=cssFontFamily(stack||'inherit');
  else el.style.fontFamily=stack||'inherit';
}

function setPersonaFontStatus(msg,kind){
  const el=$('persona-font-status');
  if(!el)return;
  el.textContent=msg||'';
  el.className='muted preview-note persona-font-status '+(kind||'');
}

function loadPersonaFont(stack){
  if(!document.fonts||!stack)return Promise.resolve(false);
  const first=firstFontName(stack);
  if(!first||['Georgia','Arial','Courier New','Lucida Console','serif','sans-serif','monospace'].includes(first))return Promise.resolve(true);
  const clean=first.replace(/["\\]/g,'');
  return document.fonts.load('400 18px "'+clean+'"')
    .then(fonts=>document.fonts.ready.then(()=>fonts&&fonts.length>0))
    .catch(e=>{console.warn('font load skipped',clean,e);return false;});
}

function refreshPersonaFontPreview(){
  const select=$('pe-font');
  const stack=select?.value||'';
  const first=firstFontName(stack);
  updatePersonaFontSample();
  updatePersonaPreview();
  setPersonaFontStatus(first?'loading '+first+'…':'','');
  loadPersonaFont(stack).then(ok=>{
    updatePersonaFontSample();
    updatePersonaPreview();
    if(!first)setPersonaFontStatus('', '');
    else if(ok)setPersonaFontStatus('font loaded: '+first,'ok');
    else setPersonaFontStatus('font did not load; using fallback','err');
  });
}

function updatePersonaFontSample(){
  const select=$('pe-font');
  const sample=$('persona-font-sample');
  if(!select||!sample)return;
  applyFontStack(sample,select.value||'inherit');
}

renderPersonaEditor=function(){
  const area=$('persona-editor');
  if(!area)return;

  const isNew=state.editPersonaId==='new'||!state.editPersonaId;
  const p=isNew?defaultPersona():Object.assign(defaultPersona(),personaById(state.editPersonaId)||{});

  area.innerHTML='<div class="editor persona-studio"><h2>'+(isNew?'New persona':'Edit persona')+'</h2>'+ 
    '<div class="editor-grid mt">'+
      '<div class="field full"><label>name</label><input id="pe-name" value="'+esc(p.name||'')+'"></div>'+ 
      '<div class="field"><label>top banner url</label><input id="pe-banner" value="'+esc(p.banner_url||'')+'"></div>'+ 
      '<div class="field"><label>bottom banner url</label><input id="pe-bottom-banner" value="'+esc(p.bottom_banner_url||'')+'"><p class="muted preview-note">Optional. If empty, bottom banner falls back to the top banner.</p></div>'+ 
      '<div class="field"><label>avatar url</label><input id="pe-avatar" value="'+esc(p.avatar_url||'')+'"></div>'+ 
      colorField('bg','background',p.bg_color)+
      colorField('text','text',p.text_color)+
      colorField('accent','accent',p.accent_color)+
      colorField('border','border',p.border_color)+
      '<div class="field full"><label>font style</label><select id="pe-font" class="persona-font-select">'+personaFontOptions(p.font_family||'')+'</select><div id="persona-font-sample" class="persona-font-sample">A little field mouse writes beautifully in the margins.</div><p id="persona-font-status" class="muted preview-note persona-font-status"></p><p class="muted preview-note">Friendly names here. The app still saves the real font stack underneath.</p></div>'+ 
      '<div class="field full"><label>signature markdown</label><textarea id="pe-signature">'+esc(p.signature||'')+'</textarea></div>'+ 
      '<textarea id="pe-css" hidden>'+esc(p.custom_css||'')+'</textarea>'+ 
    '</div>'+ 
    '<div class="spread mt"><div class="row"><button id="save-persona">save persona</button><button class="ghost" id="reset-persona">reset</button></div>'+(isNew?'':'<button class="danger" id="delete-persona">delete persona</button>')+'</div>'+ 
    '<div id="persona-status"></div>'+ 
    '<div class="mt2 persona-preview-wrap"><h3>preview</h3><div id="persona-preview"></div></div>'+ 
  '</div>';

  ['name','avatar','banner','bottom-banner','bg-c','bg-t','text-c','text-t','accent-c','accent-t','border-c','border-t','font','signature','css'].forEach(key=>{
    const el=$('pe-'+key);
    if(el){
      el.oninput=()=>{key==='font'?refreshPersonaFontPreview():updatePersonaPreview();};
      if(el.tagName==='SELECT')el.onchange=refreshPersonaFontPreview;
    }
  });

  [['bg','bg_color'],['text','text_color'],['accent','accent_color'],['border','border_color']].forEach(([k])=>{
    const c=$('pe-'+k+'-c');
    const t=$('pe-'+k+'-t');
    if(c&&t){
      c.oninput=()=>{t.value=c.value;updatePersonaPreview();};
      t.oninput=()=>{if(/^#[0-9a-fA-F]{6}$/.test(t.value)){c.value=t.value;}updatePersonaPreview();};
    }
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
      if(again){again.disabled=false;again.textContent='save persona';}
    }
  };

  $('reset-persona').onclick=()=>renderPersonaEditor();

  if(!isNew)$('delete-persona').onclick=()=>safe(async()=>{
    if(!confirm('Delete '+p.name+'?'))return;
    await deletePersona(p.id);
    state.editPersonaId=state.mine[0]?.id||'new';
    toast('persona deleted');
    renderPersonas();
  },'delete persona');

  refreshPersonaFontPreview();
};