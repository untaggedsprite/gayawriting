/*
  GAYA Persona Layouts
  Friendly controls for old-forum/Gaia-style post layouts.
  Layout state is stored in real persona columns when available:
  gaia_layout_enabled, layout_side, banner_position.
  Legacy comment blocks are still read as a fallback.
*/

const GAYA_LAYOUT_START='/* GAYA_LAYOUT_START';
const GAYA_LAYOUT_END='GAYA_LAYOUT_END */';

function stripGayaLayoutCss(css){
  return String(css||'')
    .replace(/\/\* GAYA_LAYOUT_START[\s\S]*?GAYA_LAYOUT_END \*\//g,'')
    .trim();
}

function legacyGayaLayoutOptions(css){
  const match=String(css||'').match(/\/\* GAYA_LAYOUT_START side=(left|right|none) banner=(top|bottom|both|none) \*\//i);
  return match?{enabled:true,side:match[1],banner:match[2]}:null;
}

function normalizeGayaSide(value){
  return ['left','right','none'].includes(value)?value:'left';
}

function normalizeGayaBanner(value){
  return ['top','bottom','both','none'].includes(value)?value:'top';
}

function currentEditorPersona(){
  if(state.editPersonaId==='new'||!state.editPersonaId)return null;
  return personaById(state.editPersonaId)||null;
}

function readLayoutControls(){
  return {
    enabled:$('pe-gaia-enabled')?.value==='1',
    side:normalizeGayaSide($('pe-layout-side')?.value||'left'),
    banner:normalizeGayaBanner($('pe-banner-position')?.value||'top')
  };
}

function writeLayoutControls(options){
  const enabled=$('pe-gaia-enabled');
  const side=$('pe-layout-side');
  const banner=$('pe-banner-position');
  if(enabled)enabled.value=options.enabled?'1':'0';
  if(side)side.value=normalizeGayaSide(options.side);
  if(banner)banner.value=normalizeGayaBanner(options.banner);
}

function getGayaLayoutOptions(){
  const controls=readLayoutControls();
  if($('pe-gaia-enabled'))return controls;

  const persona=currentEditorPersona();
  if(persona){
    const legacy=legacyGayaLayoutOptions(persona.custom_css);
    return {
      enabled:persona.gaia_layout_enabled??legacy?.enabled??false,
      side:normalizeGayaSide(persona.layout_side||legacy?.side||'left'),
      banner:normalizeGayaBanner(persona.banner_position||legacy?.banner||'top')
    };
  }

  const legacy=legacyGayaLayoutOptions($('pe-css')?.value||'');
  return {enabled:legacy?.enabled??false,side:normalizeGayaSide(legacy?.side||'left'),banner:normalizeGayaBanner(legacy?.banner||'top')};
}

function layoutButtonGroup(kind,options){
  const current=getGayaLayoutOptions();
  const value=kind==='enabled'?(current.enabled?'1':'0'):current[kind];
  return options.map(([optionValue,label,note])=>
    '<button type="button" class="persona-layout-choice '+(String(optionValue)===String(value)?'active':'')+'" data-layout-'+kind+'="'+esc(optionValue)+'">'+
      '<strong>'+esc(label)+'</strong><small>'+esc(note)+'</small>'+
    '</button>'
  ).join('');
}

function applyPersonaLayout(change){
  const cssArea=$('pe-css');
  if(!cssArea)return;

  const current=getGayaLayoutOptions();
  const next={
    enabled:change.enabled!==undefined?!!change.enabled:current.enabled,
    side:normalizeGayaSide(change.side||current.side||'left'),
    banner:normalizeGayaBanner(change.banner||current.banner||'top')
  };

  cssArea.value=stripGayaLayoutCss(cssArea.value);
  writeLayoutControls(next);
  cssArea.dispatchEvent(new Event('input',{bubbles:true}));
  updatePersonaPreview();
  enhancePersonaLayouts();
  setStatus('ok','Layout updated. Save when it looks right.');
}

function enhancePersonaLayouts(){
  const grid=document.querySelector('.persona-studio .editor-grid');
  if(!grid)return;

  if(!$('pe-gaia-enabled')){
    const persona=currentEditorPersona();
    const legacy=legacyGayaLayoutOptions(persona?.custom_css||$('pe-css')?.value||'');
    const enabled=persona?.gaia_layout_enabled??legacy?.enabled??false;
    const side=normalizeGayaSide(persona?.layout_side||legacy?.side||'left');
    const banner=normalizeGayaBanner(persona?.banner_position||legacy?.banner||'top');
    grid.insertAdjacentHTML('beforeend','<input type="hidden" id="pe-gaia-enabled" value="'+(enabled?'1':'0')+'"><input type="hidden" id="pe-layout-side" value="'+esc(side)+'"><input type="hidden" id="pe-banner-position" value="'+esc(banner)+'">');
  }

  const cssArea=$('pe-css');
  if(cssArea&&cssArea.value!==stripGayaLayoutCss(cssArea.value)){
    cssArea.value=stripGayaLayoutCss(cssArea.value);
  }

  let field=document.querySelector('.persona-layout-field');
  if(!field){
    field=document.createElement('div');
    field.className='field full persona-layout-field';
    field.innerHTML='<label>old-forum layout</label><p class="muted preview-note">These controls are saved separately from Advanced CSS, so the CSS drawer can be edited freely.</p><div class="layout-choice-label">layout mode</div><div class="persona-layout-grid mode-grid"></div><div class="layout-choice-label">portrait</div><div class="persona-layout-grid side-grid"></div><div class="layout-choice-label">banner placement</div><div class="persona-layout-grid banner-grid"></div>';
    const after=document.querySelector('.persona-studio .preset-field');
    if(after&&after.parentNode)after.insertAdjacentElement('afterend',field);
    else grid.insertBefore(field,grid.children[1]||null);
  }

  const modeGrid=field.querySelector('.mode-grid');
  const sideGrid=field.querySelector('.side-grid');
  const bannerGrid=field.querySelector('.banner-grid');

  if(modeGrid){
    modeGrid.innerHTML=layoutButtonGroup('enabled',[
      ['0','standard','regular forum post layout'],
      ['1','Gaia style','old-forum portrait/banner layout']
    ]);
    modeGrid.querySelectorAll('[data-layout-enabled]').forEach(btn=>{
      btn.onclick=()=>applyPersonaLayout({enabled:btn.dataset.layoutEnabled==='1'});
    });
  }

  if(sideGrid){
    sideGrid.innerHTML=layoutButtonGroup('side',[
      ['left','left portrait','image on the left, words wrap right'],
      ['right','right portrait','image on the right, words wrap left'],
      ['none','no portrait','no large Gaia avatar panel']
    ]);
    sideGrid.querySelectorAll('[data-layout-side]').forEach(btn=>{
      btn.onclick=()=>applyPersonaLayout({enabled:true,side:btn.dataset.layoutSide});
    });
  }

  if(bannerGrid){
    bannerGrid.innerHTML=layoutButtonGroup('banner',[
      ['top','top banner','banner appears above the post'],
      ['bottom','bottom banner','banner appears below the words'],
      ['both','both banners','top and bottom banner'],
      ['none','no banner','no banner image']
    ]);
    bannerGrid.querySelectorAll('[data-layout-banner]').forEach(btn=>{
      btn.onclick=()=>applyPersonaLayout({enabled:true,banner:btn.dataset.layoutBanner});
    });
  }
}

const gayaReadPersonaFormWithLayout=readPersonaForm;
readPersonaForm=function(){
  const payload=gayaReadPersonaFormWithLayout();
  const layout=getGayaLayoutOptions();
  payload.custom_css=stripGayaLayoutCss(payload.custom_css);
  payload.gaia_layout_enabled=layout.enabled;
  payload.layout_side=layout.side;
  payload.banner_position=layout.banner;
  return payload;
};

const gayaRenderPersonaEditorWithLayouts=renderPersonaEditor;
renderPersonaEditor=function(){
  gayaRenderPersonaEditorWithLayouts();
  enhancePersonaLayouts();
};

setTimeout(enhancePersonaLayouts,0);
