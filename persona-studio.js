/*
  GAYA Persona Studio
  Friendlier post-style editing layered over the original persona editor.
  No schema changes: presets fill the existing persona fields.
*/

const PERSONA_STYLE_PRESETS=[
  {
    id:'soft-parchment',
    name:'soft parchment',
    note:'warm, readable, old-page cozy',
    bg_color:'#fff7e8',
    text_color:'#332920',
    accent_color:'#b8905d',
    border_color:'#d7c5a5',
    font_family:'Sorts Mill Goudy, Georgia, serif',
    custom_css:''
  },
  {
    id:'ghosty',
    name:'ghosty',
    note:'pale blue, airy, spectral but sweet',
    bg_color:'#f4fbff',
    text_color:'#34424a',
    accent_color:'#a2e4ff',
    border_color:'#cfe7ee',
    font_family:'IM Fell English, Sorts Mill Goudy, Georgia, serif',
    custom_css:'& {\n  box-shadow: 0 18px 50px rgba(162,228,255,.16);\n}\n\n.post-head {\n  background: linear-gradient(90deg, rgba(162,228,255,.18), transparent);\n}'
  },
  {
    id:'meaty-terminal',
    name:'meaty terminal',
    note:'dark console goblin with lavender teeth',
    bg_color:'#363636',
    text_color:'#a2e4ff',
    accent_color:'#9792bc',
    border_color:'#383838',
    font_family:'Special Elite, Courier New, monospace',
    custom_css:'& {\n  box-shadow: 0 0 0 1px rgba(151,146,188,.30) inset, 0 18px 54px rgba(0,0,0,.18);\n}\n\n.post-body {\n  text-shadow: 0 0 10px rgba(162,228,255,.14);\n}'
  },
  {
    id:'lavender-diary',
    name:'lavender diary',
    note:'soft purple, sentimental, readable',
    bg_color:'#fbf4ff',
    text_color:'#3d3144',
    accent_color:'#b49ad7',
    border_color:'#d8c7e8',
    font_family:'Literata, Georgia, serif',
    custom_css:'blockquote {\n  border-left: 3px double currentColor;\n  background: rgba(180,154,215,.10);\n}\n\n.signature-block {\n  text-align: right;\n  opacity: .74;\n}'
  },
  {
    id:'dark-forest',
    name:'dark forest',
    note:'moss, ink, and candlelight',
    bg_color:'#27332c',
    text_color:'#efe7d5',
    accent_color:'#9fb27b',
    border_color:'#697b5d',
    font_family:'IM Fell English, Sorts Mill Goudy, Georgia, serif',
    custom_css:'& {\n  box-shadow: 0 20px 60px rgba(20,30,24,.24);\n}\n\n.post-head {\n  background: linear-gradient(90deg, rgba(159,178,123,.18), rgba(255,245,220,.05));\n}'
  },
  {
    id:'birthday-sparkle',
    name:'birthday sparkle',
    note:'soft party monarch energy',
    bg_color:'#fff3f8',
    text_color:'#4b3340',
    accent_color:'#f0a5c8',
    border_color:'#f4c7da',
    font_family:'Sorts Mill Goudy, Georgia, serif',
    custom_css:'& {\n  border-style: double;\n}\n\n.post-name:after {\n  content: " ✨";\n}\n\n.signature-block {\n  border-top: 1px dotted currentColor;\n}'
  },
  {
    id:'blood-moon',
    name:'blood moon',
    note:'red velvet villain letter',
    bg_color:'#3a1f25',
    text_color:'#ffe7dd',
    accent_color:'#b36363',
    border_color:'#7f3e46',
    font_family:'IM Fell English, Georgia, serif',
    custom_css:'& {\n  box-shadow: 0 18px 56px rgba(80,20,30,.22);\n}\n\nblockquote {\n  background: rgba(179,99,99,.16);\n}'
  },
  {
    id:'classic-forum',
    name:'classic forum',
    note:'clean old-web post card',
    bg_color:'#f6f0e7',
    text_color:'#26211d',
    accent_color:'#7b8c70',
    border_color:'#b9aa91',
    font_family:'Atkinson Hyperlegible, Arial, sans-serif',
    custom_css:'.post-head {\n  border-bottom-width: 2px;\n}\n\n.post-body {\n  line-height: 1.65;\n}'
  }
];

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

function personaPresetButtons(){
  return PERSONA_STYLE_PRESETS.map(p=>
    '<button type="button" class="persona-preset" data-preset="'+esc(p.id)+'">'+
      '<span class="preset-swatch"><i style="background:'+esc(p.bg_color)+'"></i><i style="background:'+esc(p.text_color)+'"></i><i style="background:'+esc(p.accent_color)+'"></i><i style="background:'+esc(p.border_color)+'"></i></span>'+
      '<strong>'+esc(p.name)+'</strong>'+
      '<small>'+esc(p.note)+'</small>'+
    '</button>'
  ).join('');
}

function personaFontOptions(current){
  current=String(current||'');
  const known=PERSONA_FONT_OPTIONS.some(([,value])=>value===current);
  let html=known||!current?'':'<option value="'+esc(current)+'" selected>current custom font</option>';
  html+=PERSONA_FONT_OPTIONS.map(([label,value])=>'<option value="'+esc(value)+'" '+(value===current?'selected':'')+'>'+esc(label)+'</option>').join('');
  return html;
}

function firstFontName(stack){
  return String(stack||'').split(',')[0].trim().replace(/^['"]|['"]$/g,'');
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

function setPersonaField(id,value){
  const el=$(id);
  if(el)el.value=value??'';
}

function setPersonaColor(key,value){
  const c=$('pe-'+key+'-c');
  const t=$('pe-'+key+'-t');
  if(t)t.value=value||'';
  if(c&&/^#[0-9a-fA-F]{6}$/.test(value||''))c.value=value;
}

function applyPersonaPreset(id){
  const preset=PERSONA_STYLE_PRESETS.find(p=>p.id===id);
  if(!preset)return;

  setPersonaColor('bg',preset.bg_color);
  setPersonaColor('text',preset.text_color);
  setPersonaColor('accent',preset.accent_color);
  setPersonaColor('border',preset.border_color);
  setPersonaField('pe-font',preset.font_family);
  setPersonaField('pe-css',preset.custom_css||'');
  refreshPersonaFontPreview();
  setStatus('ok','Preset applied: '+preset.name+'. Save when it looks right.');
}

renderPersonaEditor=function(){
  const area=$('persona-editor');
  if(!area)return;

  const isNew=state.editPersonaId==='new'||!state.editPersonaId;
  const p=isNew?defaultPersona():Object.assign(defaultPersona(),personaById(state.editPersonaId)||{});

  area.innerHTML='<div class="editor persona-studio"><h2>'+(isNew?'New persona':'Edit persona')+'</h2>'+ 
    '<div class="editor-grid mt">'+
      '<div class="field full"><label>name</label><input id="pe-name" value="'+esc(p.name||'')+'"></div>'+ 
      '<div class="field full preset-field"><label>pick a vibe</label><p class="muted preview-note">Presets change colors, font, and advanced CSS only. Your name, pictures, and signature stay put.</p><div class="persona-preset-grid">'+personaPresetButtons()+'</div></div>'+ 
      '<div class="field"><label>avatar url</label><input id="pe-avatar" value="'+esc(p.avatar_url||'')+'"></div>'+ 
      '<div class="field"><label>banner url</label><input id="pe-banner" value="'+esc(p.banner_url||'')+'"></div>'+ 
      colorField('bg','background',p.bg_color)+
      colorField('text','text',p.text_color)+
      colorField('accent','accent',p.accent_color)+
      colorField('border','border',p.border_color)+
      '<div class="field full"><label>font style</label><select id="pe-font" class="persona-font-select">'+personaFontOptions(p.font_family||'')+'</select><div id="persona-font-sample" class="persona-font-sample">A little field mouse writes beautifully in the margins.</div><p id="persona-font-status" class="muted preview-note persona-font-status"></p><p class="muted preview-note">Friendly names here. The app still saves the real font stack underneath.</p></div>'+ 
      '<div class="field full"><label>signature markdown</label><textarea id="pe-signature">'+esc(p.signature||'')+'</textarea></div>'+ 
      '<div class="field full"><details class="advanced-css"><summary>Advanced custom CSS</summary><label for="pe-css">Custom CSS notes</label><textarea id="pe-css" placeholder="& { border-radius: 28px; }">'+esc(p.custom_css||'')+'</textarea><p class="muted preview-note">Custom CSS is scoped to this persona’s posts. Use & for the post card itself.</p></details></div>'+ 
    '</div>'+ 
    '<div class="spread mt"><div class="row"><button id="save-persona">save persona</button><button class="ghost" id="reset-persona">reset</button></div>'+(isNew?'':'<button class="danger" id="delete-persona">delete persona</button>')+'</div>'+ 
    '<div id="persona-status"></div>'+ 
    '<div class="mt2 persona-preview-wrap"><h3>preview</h3><div id="persona-preview"></div></div>'+ 
  '</div>';

  ['name','avatar','banner','bg-c','bg-t','text-c','text-t','accent-c','accent-t','border-c','border-t','font','signature','css'].forEach(key=>{
    const el=$('pe-'+key);
    if(el){
      el.oninput=()=>{key==='font'?refreshPersonaFontPreview():updatePersonaPreview();};
      if(el.tagName==='SELECT')el.onchange=refreshPersonaFontPreview;
    }
  });

  document.querySelectorAll('.persona-preset[data-preset]').forEach(btn=>{
    btn.onclick=()=>applyPersonaPreset(btn.dataset.preset);
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
