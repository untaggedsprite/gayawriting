/*
  GAYA Persona Layouts
  One old-forum/Gaia-style layout engine with friendly toggles.
  No schema changes: layout choices live inside a marked custom_css block.
*/

const GAYA_LAYOUT_START='/* GAYA_LAYOUT_START';
const GAYA_LAYOUT_END='GAYA_LAYOUT_END */';

function stripGayaLayoutCss(css){
  return String(css||'')
    .replace(/\/\* GAYA_LAYOUT_START[\s\S]*?GAYA_LAYOUT_END \*\//g,'')
    .trim();
}

function getGayaLayoutOptions(){
  const css=$('pe-css')?.value||'';
  const match=css.match(/\/\* GAYA_LAYOUT_START side=(left|right) banner=(top|bottom|both|none) \*\//i);
  return {
    side:match?.[1]||'left',
    banner:match?.[2]||'top'
  };
}

function gaiaLayoutCss(side,banner){
  const floatSide=side==='right'?'right':'left';
  const nameAlign=side==='right'?'left':'right';
  const bannerDisplay=banner==='none'||banner==='bottom'?'none':'block';

  return `& {
  overflow: auto;
  border-left-width: 1px;
}

.banner {
  display: ${bannerDisplay};
  height: 185px;
  margin: 0 0 1rem;
  border-radius: 14px 14px 0 0;
  opacity: 1;
  background-size: cover;
  background-position: center;
}

.banner.bottom-banner {
  display: ${banner==='bottom'||banner==='both'?'block':'none'};
  clear: both;
  height: 150px;
  margin: 1.15rem 0 0;
  border-radius: 0 0 14px 14px;
  background-size: cover;
  background-position: center;
}

.post-head {
  display: block;
  min-height: 0;
  margin: 0;
  padding: 1.15rem 1.45rem .15rem;
  border-bottom: 0;
  background: transparent;
  opacity: 1;
}

.avatar {
  float: ${floatSide};
  width: min(345px, 48vw);
  height: 355px;
  margin: .25rem ${side==='right'?'0':'2rem'} 1.05rem ${side==='right'?'2rem':'0'};
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
  text-align: ${nameAlign};
  font-size: 2rem;
  line-height: 1.05;
  background: rgba(255,255,255,.16);
}

.post-meta {
  display: block;
  margin: 0 0 1.4rem;
  text-align: ${nameAlign};
}

.post-body {
  padding: .25rem 1.65rem 1.05rem;
  line-height: 1.58;
}

.post-body:after {
  content: "";
  display: block;
  clear: both;
}

.signature-block {
  clear: both;
}`;
}

function layoutCssBlock(side,banner){
  return GAYA_LAYOUT_START+' side='+side+' banner='+banner+' */\n'+gaiaLayoutCss(side,banner).trim()+'\n/* '+GAYA_LAYOUT_END;
}

function layoutButtonGroup(kind,options){
  const current=getGayaLayoutOptions()[kind];
  return options.map(([value,label,note])=>
    '<button type="button" class="persona-layout-choice '+(value===current?'active':'')+'" data-layout-'+kind+'="'+esc(value)+'">'+
      '<strong>'+esc(label)+'</strong><small>'+esc(note)+'</small>'+
    '</button>'
  ).join('');
}

function applyPersonaLayout(change){
  const cssArea=$('pe-css');
  if(!cssArea)return;

  const current=getGayaLayoutOptions();
  const side=change.side||current.side||'left';
  const banner=change.banner||current.banner||'top';
  const base=stripGayaLayoutCss(cssArea.value);

  cssArea.value=[base,layoutCssBlock(side,banner)].filter(Boolean).join('\n\n');
  cssArea.dispatchEvent(new Event('input',{bubbles:true}));
  updatePersonaPreview();
  enhancePersonaLayouts();
  setStatus('ok','Gaia layout updated. Save when it looks right.');
}

function enhancePersonaLayouts(){
  const grid=document.querySelector('.persona-studio .editor-grid');
  if(!grid)return;

  let field=document.querySelector('.persona-layout-field');
  if(!field){
    field=document.createElement('div');
    field.className='field full persona-layout-field';
    field.innerHTML='<label>old-forum layout</label><p class="muted preview-note">Use your avatar upload as the large portrait image. Choose which side it lives on, then choose where the banner appears.</p><div class="layout-choice-label">portrait side</div><div class="persona-layout-grid side-grid"></div><div class="layout-choice-label">banner placement</div><div class="persona-layout-grid banner-grid"></div>';
    const after=document.querySelector('.persona-studio .preset-field');
    if(after&&after.parentNode)after.insertAdjacentElement('afterend',field);
    else grid.insertBefore(field,grid.children[1]||null);
  }

  const sideGrid=field.querySelector('.side-grid');
  const bannerGrid=field.querySelector('.banner-grid');
  if(sideGrid){
    sideGrid.innerHTML=layoutButtonGroup('side',[
      ['left','left portrait','image on the left, words wrap right'],
      ['right','right portrait','image on the right, words wrap left']
    ]);
    sideGrid.querySelectorAll('[data-layout-side]').forEach(btn=>{
      btn.onclick=()=>applyPersonaLayout({side:btn.dataset.layoutSide});
    });
  }

  if(bannerGrid){
    bannerGrid.innerHTML=layoutButtonGroup('banner',[
      ['top','top banner','banner appears above the post'],
      ['bottom','bottom banner','banner appears below the words'],
      ['both','both banners','top and bottom banner'],
      ['none','no banner','portrait layout only']
    ]);
    bannerGrid.querySelectorAll('[data-layout-banner]').forEach(btn=>{
      btn.onclick=()=>applyPersonaLayout({banner:btn.dataset.layoutBanner});
    });
  }
}

const gayaRenderPersonaEditorWithLayouts=renderPersonaEditor;
renderPersonaEditor=function(){
  gayaRenderPersonaEditorWithLayouts();
  enhancePersonaLayouts();
};

setTimeout(enhancePersonaLayouts,0);
