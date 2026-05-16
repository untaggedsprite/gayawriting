/*
  GAYA Persona Layouts
  Adds friendly old-forum layout presets by writing a marked block into custom CSS.
  No schema changes: layouts live inside the existing persona custom_css field.
*/

const GAYA_LAYOUT_START='/* GAYA_LAYOUT_START';
const GAYA_LAYOUT_END='GAYA_LAYOUT_END */';

const PERSONA_LAYOUT_PRESETS=[
  {
    id:'classic-card',
    name:'classic card',
    note:'current avatar + post header layout',
    css:''
  },
  {
    id:'gaia-side-portrait',
    name:'Gaia side portrait',
    note:'big left image, text wraps beside it',
    css:`& {
  overflow: visible;
  border-left-width: 1px;
}

.post-head {
  display: block;
  min-height: 0;
  margin: 0;
  padding: 1.25rem 1.45rem .25rem;
  border-bottom: 0;
  background: transparent;
  opacity: 1;
}

.avatar {
  float: left;
  width: min(235px, 38vw);
  height: 360px;
  margin: .25rem 2rem 1.05rem 0;
  border-radius: 12px;
  border: 3px solid currentColor;
  background-size: cover;
  background-position: center top;
  box-shadow: 0 16px 38px rgba(0,0,0,.18);
}

.post-name {
  display: block;
  margin: .6rem 0 1.35rem;
  padding: .22rem .55rem;
  text-align: right;
  font-size: 2.05rem;
  line-height: 1.05;
  background: rgba(255,255,255,.18);
}

.post-meta {
  display: block;
  margin: 0 0 1.5rem;
  text-align: right;
}

.post-body {
  padding: .25rem 1.65rem 1.2rem;
  line-height: 1.55;
}

.signature-block {
  clear: both;
}`
  },
  {
    id:'banner-letter',
    name:'banner letter',
    note:'wide image top, journal below',
    css:`& {
  border-left-width: 1px;
}

.banner {
  height: 210px;
  margin: 0 0 .75rem;
  border-radius: 14px 14px 0 0;
  opacity: 1;
}

.post-head {
  margin: 0;
  padding: .9rem 1.35rem;
  background: rgba(255,255,255,.16);
}

.avatar {
  width: 46px;
  height: 46px;
  border-radius: 999px;
}

.post-body {
  padding: 1.5rem 1.8rem .7rem;
}

.signature-block {
  margin-top: .3rem;
}`
  },
  {
    id:'minimal-forum',
    name:'minimal forum',
    note:'small icon, clean readable post',
    css:`& {
  border-left-width: 3px;
  box-shadow: none;
}

&:before,
&:after {
  display: none;
}

.post-head {
  padding: .85rem 1rem;
  margin-bottom: 0;
  background: transparent;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
}

.post-name {
  font-size: 1.12rem;
}

.post-body {
  padding: 1rem 1.25rem .35rem;
  line-height: 1.7;
}`
  },
  {
    id:'shrine-card',
    name:'shrine card',
    note:'extra ornate, framed and dramatic',
    css:`& {
  border-style: double;
  border-width: 4px;
  box-shadow: 0 24px 70px rgba(0,0,0,.16);
}

&:before {
  border-style: double;
  opacity: .72;
}

.post-head {
  background: linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,.04));
}

.avatar {
  width: 78px;
  height: 78px;
  border-radius: 18px;
  border-width: 2px;
}

.post-name {
  font-size: 1.85rem;
}

.post-body blockquote {
  border-left-style: double;
}`
  }
];

function stripGayaLayoutCss(css){
  return String(css||'')
    .replace(/\/\* GAYA_LAYOUT_START[\s\S]*?GAYA_LAYOUT_END \*\//g,'')
    .trim();
}

function layoutCssBlock(layout){
  if(!layout||!layout.css)return '';
  return GAYA_LAYOUT_START+' id='+layout.id+' */\n'+layout.css.trim()+'\n/* '+GAYA_LAYOUT_END;
}

function getCurrentLayoutId(){
  const css=$('pe-css')?.value||'';
  const match=css.match(/\/\* GAYA_LAYOUT_START id=([a-z0-9_-]+) \*\//i);
  return match?match[1]:'classic-card';
}

function layoutPresetButtons(){
  const active=getCurrentLayoutId();
  return PERSONA_LAYOUT_PRESETS.map(l=>
    '<button type="button" class="persona-layout-preset '+(l.id===active?'active':'')+'" data-layout="'+esc(l.id)+'">'+
      '<strong>'+esc(l.name)+'</strong><small>'+esc(l.note)+'</small>'+
    '</button>'
  ).join('');
}

function applyPersonaLayout(id){
  const layout=PERSONA_LAYOUT_PRESETS.find(l=>l.id===id);
  const cssArea=$('pe-css');
  if(!layout||!cssArea)return;

  const base=stripGayaLayoutCss(cssArea.value);
  const block=layoutCssBlock(layout);
  cssArea.value=[base,block].filter(Boolean).join('\n\n');
  cssArea.dispatchEvent(new Event('input',{bubbles:true}));
  updatePersonaPreview();
  enhancePersonaLayouts();
  setStatus('ok','Layout applied: '+layout.name+'. Save when it looks right.');
}

function enhancePersonaLayouts(){
  const grid=document.querySelector('.persona-studio .editor-grid');
  if(!grid)return;

  let field=document.querySelector('.persona-layout-field');
  if(!field){
    field=document.createElement('div');
    field.className='field full persona-layout-field';
    field.innerHTML='<label>choose a layout</label><p class="muted preview-note">Layouts arrange the same post pieces in different old-forum ways. Gaia side portrait uses your avatar upload as the large left image.</p><div class="persona-layout-grid"></div>';
    const after=document.querySelector('.persona-studio .preset-field');
    if(after&&after.parentNode)after.insertAdjacentElement('afterend',field);
    else grid.insertBefore(field,grid.children[1]||null);
  }

  const buttonGrid=field.querySelector('.persona-layout-grid');
  if(buttonGrid){
    buttonGrid.innerHTML=layoutPresetButtons();
    buttonGrid.querySelectorAll('[data-layout]').forEach(btn=>{
      btn.onclick=()=>applyPersonaLayout(btn.dataset.layout);
    });
  }
}

const gayaRenderPersonaEditorWithLayouts=renderPersonaEditor;
renderPersonaEditor=function(){
  gayaRenderPersonaEditorWithLayouts();
  enhancePersonaLayouts();
};

setTimeout(enhancePersonaLayouts,0);
