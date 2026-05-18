/*
  GAYA Post Density Controls
  Stores density in a harmless custom_css marker so no Supabase migration is needed.
  This controls card breathing room, portrait scale, and banner strip height.
  Inline story text size belongs to post formatting: [size=small]...[/size].
*/

(function(){
  const POST_SIZE_START='/* GAYA_POST_SIZE_START';
  const POST_SIZE_END='GAYA_POST_SIZE_END */';

  const postSizeOptions=[
    ['compact','compact','tighter cards, smaller portrait'],
    ['standard','standard','balanced default spacing'],
    ['roomy','roomy','airier story-card framing']
  ];

  function normalizePostSize(value){
    value=String(value||'').toLowerCase();
    if(value==='novella')return 'roomy';
    return ['compact','standard','roomy'].includes(value)?value:'standard';
  }

  function postSizeFromCss(css){
    const match=String(css||'').match(/\/\* GAYA_POST_SIZE_START size=(compact|standard|roomy|novella) \*\//i);
    return normalizePostSize(match?.[1]||'standard');
  }

  function stripPostSizeCss(css){
    return String(css||'')
      .replace(/\/\* GAYA_POST_SIZE_START[\s\S]*?GAYA_POST_SIZE_END \*\//g,'')
      .trim();
  }

  function postSizeMarker(size){
    size=normalizePostSize(size);
    if(size==='standard')return '';
    return POST_SIZE_START+' size='+size+' */\n'+POST_SIZE_END;
  }

  function currentEditorPostSize(){
    const hidden=$('pe-post-size');
    if(hidden)return normalizePostSize(hidden.value);
    const persona=(state.editPersonaId&&state.editPersonaId!=='new')?personaById(state.editPersonaId):null;
    return postSizeFromCss(persona?.custom_css||$('pe-css')?.value||'');
  }

  function getPostSizeFromPersona(persona){
    return postSizeFromCss(persona?.custom_css||'');
  }

  function sizeButtonGroup(){
    const current=currentEditorPostSize();
    return postSizeOptions.map(([value,label,note])=>
      '<button type="button" class="persona-layout-choice '+(value===current?'active':'')+'" data-post-size-choice="'+esc(value)+'">'+
        '<strong>'+esc(label)+'</strong><small>'+esc(note)+'</small>'+
      '</button>'
    ).join('');
  }

  function applyPostSize(size){
    size=normalizePostSize(size);
    const cssArea=$('pe-css');
    if(!cssArea)return;
    const hidden=$('pe-post-size');
    if(hidden)hidden.value=size;
    cssArea.value=stripPostSizeCss(cssArea.value);
    const marker=postSizeMarker(size);
    if(marker)cssArea.value=(cssArea.value?cssArea.value+'\n\n':'')+marker;
    cssArea.dispatchEvent(new Event('input',{bubbles:true}));
    updatePersonaPreview();
    enhancePostSizeControls();
    setStatus('ok','Post density updated. Save when it looks right.');
  }

  function enhancePostSizeControls(){
    const grid=document.querySelector('.persona-studio .editor-grid');
    if(!grid)return;

    if(!$('pe-post-size')){
      grid.insertAdjacentHTML('beforeend','<input type="hidden" id="pe-post-size" value="'+esc(currentEditorPostSize())+'">');
    }

    const cssArea=$('pe-css');
    if(cssArea){
      const cleaned=stripPostSizeCss(cssArea.value);
      if(cleaned!==cssArea.value)cssArea.value=cleaned;
    }

    let field=document.querySelector('.persona-post-size-field');
    if(!field){
      field=document.createElement('div');
      field.className='field full persona-post-size-field';
      field.innerHTML='<label>post density</label><p class="muted preview-note">Changes card spacing, portrait scale, and banner strip height. Inline text size uses the post formatter size menu.</p><div class="persona-layout-grid post-size-grid"></div>';
      const fontField=$('pe-font')?.closest('.field');
      if(fontField)fontField.insertAdjacentElement('afterend',field);
      else grid.appendChild(field);
    }

    const sizeGrid=field.querySelector('.post-size-grid');
    if(sizeGrid){
      sizeGrid.innerHTML=sizeButtonGroup();
      sizeGrid.querySelectorAll('[data-post-size-choice]').forEach(btn=>{
        btn.onclick=()=>applyPostSize(btn.dataset.postSizeChoice);
      });
    }
  }

  if(typeof readPersonaForm==='function'){
    const previousReadPersonaForm=readPersonaForm;
    readPersonaForm=function(){
      const payload=previousReadPersonaForm();
      const size=normalizePostSize($('pe-post-size')?.value||postSizeFromCss(payload.custom_css));
      payload.custom_css=stripPostSizeCss(payload.custom_css);
      const marker=postSizeMarker(size);
      if(marker)payload.custom_css=(payload.custom_css?payload.custom_css+'\n\n':'')+marker;
      return payload;
    };
  }

  if(typeof renderPersonaEditor==='function'){
    const previousRenderPersonaEditor=renderPersonaEditor;
    renderPersonaEditor=function(){
      previousRenderPersonaEditor();
      enhancePostSizeControls();
    };
  }

  if(typeof updatePersonaPreview==='function'){
    const previousUpdatePersonaPreview=updatePersonaPreview;
    updatePersonaPreview=function(){
      previousUpdatePersonaPreview();
      const article=document.querySelector('#persona-preview .post');
      if(article)article.dataset.postSize=currentEditorPostSize();
    };
  }

  window.normalizePostSize=normalizePostSize;
  window.getPostSizeFromPersona=getPostSizeFromPersona;
  window.stripPostSizeCss=stripPostSizeCss;
  window.enhancePostSizeControls=enhancePostSizeControls;

  setTimeout(enhancePostSizeControls,0);
})();