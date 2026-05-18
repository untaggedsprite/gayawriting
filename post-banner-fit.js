/*
  GAYA Banner Fit Controls
  Stores banner fit in custom_css as a hidden marker so no Supabase migration is needed.
*/

(function(){
  const BANNER_FIT_START='/* GAYA_BANNER_FIT_START';
  const BANNER_FIT_END='GAYA_BANNER_FIT_END */';

  const bannerFitOptions=[
    ['cover','cover','fills banner, may crop edges'],
    ['contain','contain','shows whole image'],
    ['stretch','stretch','fits exactly, may distort'],
    ['tile','tile','repeats horizontally']
  ];

  function normalizeBannerFit(value){
    value=String(value||'').toLowerCase();
    return ['cover','contain','stretch','tile'].includes(value)?value:'cover';
  }

  function bannerFitFromCss(css){
    const match=String(css||'').match(/\/\* GAYA_BANNER_FIT_START fit=(cover|contain|stretch|tile) \*\//i);
    return normalizeBannerFit(match?.[1]||'cover');
  }

  function stripBannerFitCss(css){
    return String(css||'')
      .replace(/\/\* GAYA_BANNER_FIT_START[\s\S]*?GAYA_BANNER_FIT_END \*\//g,'')
      .trim();
  }

  function bannerFitMarker(fit){
    fit=normalizeBannerFit(fit);
    if(fit==='cover')return '';
    return BANNER_FIT_START+' fit='+fit+' */\n'+BANNER_FIT_END;
  }

  function currentEditorBannerFit(){
    const hidden=$('pe-banner-fit');
    if(hidden)return normalizeBannerFit(hidden.value);
    const persona=(state.editPersonaId&&state.editPersonaId!=='new')?personaById(state.editPersonaId):null;
    return bannerFitFromCss(persona?.custom_css||$('pe-css')?.value||'');
  }

  function getBannerFitFromPersona(persona){
    return bannerFitFromCss(persona?.custom_css||'');
  }

  function bannerFitButtonGroup(){
    const current=currentEditorBannerFit();
    return bannerFitOptions.map(([value,label,note])=>
      '<button type="button" class="persona-layout-choice '+(value===current?'active':'')+'" data-banner-fit-choice="'+esc(value)+'">'+
        '<strong>'+esc(label)+'</strong><small>'+esc(note)+'</small>'+
      '</button>'
    ).join('');
  }

  function applyBannerFit(fit){
    fit=normalizeBannerFit(fit);
    const cssArea=$('pe-css');
    if(!cssArea)return;
    const hidden=$('pe-banner-fit');
    if(hidden)hidden.value=fit;
    cssArea.value=stripBannerFitCss(cssArea.value);
    const marker=bannerFitMarker(fit);
    if(marker)cssArea.value=(cssArea.value?cssArea.value+'\n\n':'')+marker;
    cssArea.dispatchEvent(new Event('input',{bubbles:true}));
    updatePersonaPreview();
    enhanceBannerFitControls();
    setStatus('ok','Banner fit updated. Save when it looks right.');
  }

  function enhanceBannerFitControls(){
    const grid=document.querySelector('.persona-studio .editor-grid');
    if(!grid)return;

    if(!$('pe-banner-fit')){
      grid.insertAdjacentHTML('beforeend','<input type="hidden" id="pe-banner-fit" value="'+esc(currentEditorBannerFit())+'">');
    }

    const cssArea=$('pe-css');
    if(cssArea){
      const cleaned=stripBannerFitCss(cssArea.value);
      if(cleaned!==cssArea.value)cssArea.value=cleaned;
    }

    let field=document.querySelector('.persona-banner-fit-field');
    if(!field){
      field=document.createElement('div');
      field.className='field full persona-banner-fit-field';
      field.innerHTML='<label>banner fit</label><p class="muted preview-note">Controls whether top/bottom banners crop, show fully, stretch, or repeat.</p><div class="persona-layout-grid banner-fit-grid"></div>';
      const postSizeField=document.querySelector('.persona-post-size-field');
      if(postSizeField)postSizeField.insertAdjacentElement('beforebegin',field);
      else {
        const bannerField=$('pe-banner')?.closest('.field');
        if(bannerField)bannerField.insertAdjacentElement('afterend',field);
        else grid.appendChild(field);
      }
    }

    const fitGrid=field.querySelector('.banner-fit-grid');
    if(fitGrid){
      fitGrid.innerHTML=bannerFitButtonGroup();
      fitGrid.querySelectorAll('[data-banner-fit-choice]').forEach(btn=>{
        btn.onclick=()=>applyBannerFit(btn.dataset.bannerFitChoice);
      });
    }
  }

  if(typeof readPersonaForm==='function'){
    const previousReadPersonaForm=readPersonaForm;
    readPersonaForm=function(){
      const payload=previousReadPersonaForm();
      const fit=normalizeBannerFit($('pe-banner-fit')?.value||bannerFitFromCss(payload.custom_css));
      payload.custom_css=stripBannerFitCss(payload.custom_css);
      const marker=bannerFitMarker(fit);
      if(marker)payload.custom_css=(payload.custom_css?payload.custom_css+'\n\n':'')+marker;
      return payload;
    };
  }

  if(typeof renderPersonaEditor==='function'){
    const previousRenderPersonaEditor=renderPersonaEditor;
    renderPersonaEditor=function(){
      previousRenderPersonaEditor();
      enhanceBannerFitControls();
    };
  }

  if(typeof updatePersonaPreview==='function'){
    const previousUpdatePersonaPreview=updatePersonaPreview;
    updatePersonaPreview=function(){
      previousUpdatePersonaPreview();
      const article=document.querySelector('#persona-preview .post');
      if(article)article.dataset.bannerFit=currentEditorBannerFit();
    };
  }

  window.normalizeBannerFit=normalizeBannerFit;
  window.getBannerFitFromPersona=getBannerFitFromPersona;
  window.stripBannerFitCss=stripBannerFitCss;
  window.enhanceBannerFitControls=enhanceBannerFitControls;

  setTimeout(enhanceBannerFitControls,0);
})();
