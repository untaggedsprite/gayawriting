/*
  GAYA Font Size Controls
  Stores font size in custom_css as a hidden marker so no Supabase migration is needed.
*/

(function(){
  const FONT_SIZE_START='/* GAYA_FONT_SIZE_START';
  const FONT_SIZE_END='GAYA_FONT_SIZE_END */';

  const fontSizeOptions=[
    ['tiny','tiny','smallest readable text'],
    ['small','small','slightly smaller text'],
    ['standard','standard','current default text'],
    ['large','large','easier reading size'],
    ['huge','huge','big dramatic text']
  ];

  function normalizeFontSize(value){
    value=String(value||'').toLowerCase();
    return ['tiny','small','standard','large','huge'].includes(value)?value:'standard';
  }

  function fontSizeFromCss(css){
    const match=String(css||'').match(/\/\* GAYA_FONT_SIZE_START size=(tiny|small|standard|large|huge) \*\//i);
    return normalizeFontSize(match?.[1]||'standard');
  }

  function stripFontSizeCss(css){
    return String(css||'')
      .replace(/\/\* GAYA_FONT_SIZE_START[\s\S]*?GAYA_FONT_SIZE_END \*\//g,'')
      .trim();
  }

  function fontSizeMarker(size){
    size=normalizeFontSize(size);
    if(size==='standard')return '';
    return FONT_SIZE_START+' size='+size+' */\n'+FONT_SIZE_END;
  }

  function currentEditorFontSize(){
    const hidden=$('pe-font-size');
    if(hidden)return normalizeFontSize(hidden.value);
    const persona=(state.editPersonaId&&state.editPersonaId!=='new')?personaById(state.editPersonaId):null;
    return fontSizeFromCss(persona?.custom_css||$('pe-css')?.value||'');
  }

  function getFontSizeFromPersona(persona){
    return fontSizeFromCss(persona?.custom_css||'');
  }

  function fontSizeButtonGroup(){
    const current=currentEditorFontSize();
    return fontSizeOptions.map(([value,label,note])=>
      '<button type="button" class="persona-layout-choice '+(value===current?'active':'')+'" data-font-size-choice="'+esc(value)+'">'+
        '<strong>'+esc(label)+'</strong><small>'+esc(note)+'</small>'+
      '</button>'
    ).join('');
  }

  function applyFontSize(size){
    size=normalizeFontSize(size);
    const cssArea=$('pe-css');
    if(!cssArea)return;
    const hidden=$('pe-font-size');
    if(hidden)hidden.value=size;
    cssArea.value=stripFontSizeCss(cssArea.value);
    const marker=fontSizeMarker(size);
    if(marker)cssArea.value=(cssArea.value?cssArea.value+'\n\n':'')+marker;
    cssArea.dispatchEvent(new Event('input',{bubbles:true}));
    updatePersonaPreview();
    enhanceFontSizeControls();
    setStatus('ok','Font size updated. Save when it looks right.');
  }

  function enhanceFontSizeControls(){
    const grid=document.querySelector('.persona-studio .editor-grid');
    if(!grid)return;

    if(!$('pe-font-size')){
      grid.insertAdjacentHTML('beforeend','<input type="hidden" id="pe-font-size" value="'+esc(currentEditorFontSize())+'">');
    }

    const cssArea=$('pe-css');
    if(cssArea){
      const cleaned=stripFontSizeCss(cssArea.value);
      if(cleaned!==cssArea.value)cssArea.value=cleaned;
    }

    let field=document.querySelector('.persona-font-size-field');
    if(!field){
      field=document.createElement('div');
      field.className='field full persona-font-size-field';
      field.innerHTML='<label>font size</label><p class="muted preview-note">Changes post text size without changing banner, portrait, or card density.</p><div class="persona-layout-grid font-size-grid"></div>';
      const postSizeField=document.querySelector('.persona-post-size-field');
      if(postSizeField)postSizeField.insertAdjacentElement('afterend',field);
      else {
        const fontField=$('pe-font')?.closest('.field');
        if(fontField)fontField.insertAdjacentElement('afterend',field);
        else grid.appendChild(field);
      }
    }

    const sizeGrid=field.querySelector('.font-size-grid');
    if(sizeGrid){
      sizeGrid.innerHTML=fontSizeButtonGroup();
      sizeGrid.querySelectorAll('[data-font-size-choice]').forEach(btn=>{
        btn.onclick=()=>applyFontSize(btn.dataset.fontSizeChoice);
      });
    }
  }

  if(typeof readPersonaForm==='function'){
    const previousReadPersonaForm=readPersonaForm;
    readPersonaForm=function(){
      const payload=previousReadPersonaForm();
      const size=normalizeFontSize($('pe-font-size')?.value||fontSizeFromCss(payload.custom_css));
      payload.custom_css=stripFontSizeCss(payload.custom_css);
      const marker=fontSizeMarker(size);
      if(marker)payload.custom_css=(payload.custom_css?payload.custom_css+'\n\n':'')+marker;
      return payload;
    };
  }

  if(typeof renderPersonaEditor==='function'){
    const previousRenderPersonaEditor=renderPersonaEditor;
    renderPersonaEditor=function(){
      previousRenderPersonaEditor();
      enhanceFontSizeControls();
    };
  }

  if(typeof updatePersonaPreview==='function'){
    const previousUpdatePersonaPreview=updatePersonaPreview;
    updatePersonaPreview=function(){
      previousUpdatePersonaPreview();
      const article=document.querySelector('#persona-preview .post');
      if(article)article.dataset.fontSize=currentEditorFontSize();
    };
  }

  window.normalizeFontSize=normalizeFontSize;
  window.getFontSizeFromPersona=getFontSizeFromPersona;
  window.stripFontSizeCss=stripFontSizeCss;
  window.enhanceFontSizeControls=enhanceFontSizeControls;

  setTimeout(enhanceFontSizeControls,0);
})();
