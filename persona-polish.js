/*
  GAYA Persona Studio Polish
  Adds safer finish controls without reopening the Advanced CSS drawer:
  - avatar/portrait focus
  - top and bottom banner focus
  - signature alignment/divider/size
  - duplicate persona
  - light section labels for easier scanning
*/

(function(){
  const avatarFocusOptions=[
    ['top','top','best for faces near the top'],
    ['center','center','balanced crop'],
    ['bottom','bottom','best for lower-body details']
  ];

  const bannerFocusOptions=[
    ['left','left','show left side'],
    ['center','center','balanced crop'],
    ['right','right','show right side']
  ];

  const signatureAlignOptions=[
    ['left','left','plain forum style'],
    ['center','center','ornamental'],
    ['right','right','letter-signoff style']
  ];

  const signatureDividerOptions=[
    ['none','none','no divider'],
    ['line','line','thin divider'],
    ['dotted','dotted','soft dotted divider']
  ];

  const signatureSizeOptions=[
    ['small','small','quiet signoff'],
    ['normal','normal','standard'],
    ['large','large','more dramatic']
  ];

  function valid(value,allowed,fallback){
    value=String(value||'').toLowerCase();
    return allowed.includes(value)?value:fallback;
  }

  window.normalizeAvatarFocus=function(value){return valid(value,['top','center','bottom'],'top');};
  window.normalizeBannerFocus=function(value){return valid(value,['left','center','right'],'center');};
  window.normalizeSignatureAlign=function(value){return valid(value,['left','center','right'],'left');};
  window.normalizeSignatureDivider=function(value){return valid(value,['none','line','dotted'],'none');};
  window.normalizeSignatureSize=function(value){return valid(value,['small','normal','large'],'normal');};

  function optionHtml(options,current){
    return options.map(([value,label,note])=>'<option value="'+esc(value)+'" '+(value===current?'selected':'')+'>'+esc(label)+' — '+esc(note)+'</option>').join('');
  }

  function fieldHtml(id,label,options,current,help){
    return '<div class="field persona-polish-field"><label>'+esc(label)+'</label><select id="'+esc(id)+'" class="persona-font-select">'+optionHtml(options,current)+'</select>'+(help?'<p class="muted preview-note">'+esc(help)+'</p>':'')+'</div>';
  }

  function sectionHtml(title,note){
    return '<div class="field full persona-section-title"><span>'+esc(title)+'</span>'+(note?'<small>'+esc(note)+'</small>':'')+'</div>';
  }

  function insertBeforeField(inputId,title,note){
    const input=$(inputId);
    const field=input?.closest('.field');
    if(field&&!field.previousElementSibling?.classList?.contains('persona-section-title')){
      field.insertAdjacentHTML('beforebegin',sectionHtml(title,note));
    }
  }

  function addImageFocusControls(){
    const p=currentEditorPersonaForPolish();
    const avatar=normalizeAvatarFocus($('pe-avatar-focus')?.value||p?.avatar_position||'top');
    const top=normalizeBannerFocus($('pe-top-banner-focus')?.value||p?.top_banner_position||'center');
    const bottom=normalizeBannerFocus($('pe-bottom-banner-focus')?.value||p?.bottom_banner_position||'center');

    const avatarField=$('pe-avatar')?.closest('.field');
    if(avatarField&&!$('pe-avatar-focus')){
      avatarField.insertAdjacentHTML('afterend',fieldHtml('pe-avatar-focus','avatar/portrait focus',avatarFocusOptions,avatar,'Controls how cropped portrait art is positioned.'));
    }

    const topField=$('pe-banner')?.closest('.field');
    if(topField&&!$('pe-top-banner-focus')){
      topField.insertAdjacentHTML('afterend',fieldHtml('pe-top-banner-focus','top banner focus',bannerFocusOptions,top,'Controls which part of the top banner stays visible.'));
    }

    const bottomField=$('pe-bottom-banner')?.closest('.field');
    if(bottomField&&!$('pe-bottom-banner-focus')){
      bottomField.insertAdjacentHTML('afterend',fieldHtml('pe-bottom-banner-focus','bottom banner focus',bannerFocusOptions,bottom,'Controls which part of the bottom banner stays visible.'));
    }
  }

  function addSignatureControls(){
    const sig=$('pe-signature')?.closest('.field');
    const p=currentEditorPersonaForPolish();
    const align=normalizeSignatureAlign($('pe-signature-align')?.value||p?.signature_align||'left');
    const divider=normalizeSignatureDivider($('pe-signature-divider')?.value||p?.signature_divider||'none');
    const size=normalizeSignatureSize($('pe-signature-size')?.value||p?.signature_size||'normal');

    if(sig&&!$('pe-signature-align')){
      sig.insertAdjacentHTML('afterend',
        fieldHtml('pe-signature-align','signature alignment',signatureAlignOptions,align,'Moves the signature text without touching the post body.')+
        fieldHtml('pe-signature-divider','signature divider',signatureDividerOptions,divider,'Adds an optional line above the signature.')+
        fieldHtml('pe-signature-size','signature size',signatureSizeOptions,size,'Controls how loudly the signature speaks.')
      );
    }
  }

  function addSectionLabels(){
    insertBeforeField('pe-name','identity','who is speaking');
    const preset=document.querySelector('.persona-studio .preset-field');
    if(preset&&!preset.previousElementSibling?.classList?.contains('persona-section-title')){
      preset.insertAdjacentHTML('beforebegin',sectionHtml('preset','optional starting point'));
    }
    const layout=document.querySelector('.persona-layout-field');
    if(layout&&!layout.previousElementSibling?.classList?.contains('persona-section-title')){
      layout.insertAdjacentHTML('beforebegin',sectionHtml('layout','standard or Gaia-style post framing'));
    }
    insertBeforeField('pe-banner','images','portraits and banners');
    insertBeforeField('pe-bg-c','colors','page-card palette');
    insertBeforeField('pe-font','text','font rendering');
    insertBeforeField('pe-signature','signature','signoff styling');
  }

  function currentEditorPersonaForPolish(){
    if(state.editPersonaId==='new'||!state.editPersonaId)return null;
    return personaById(state.editPersonaId)||null;
  }

  function duplicatePayloadFromPersona(persona){
    const copy={...persona};
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    delete copy.user_id;
    copy.name=(persona.name||'Persona')+' copy';
    return copy;
  }

  function addDuplicateButton(){
    if(state.editPersonaId==='new'||!state.editPersonaId||$('duplicate-persona'))return;
    const row=document.querySelector('.persona-studio .spread .row');
    const persona=currentEditorPersonaForPolish();
    if(!row||!persona)return;

    const btn=document.createElement('button');
    btn.type='button';
    btn.id='duplicate-persona';
    btn.className='ghost';
    btn.textContent='duplicate';
    btn.onclick=()=>safe(async()=>{
      btn.disabled=true;
      btn.textContent='duplicating…';
      const saved=await savePersona(duplicatePayloadFromPersona(persona),null);
      state.editPersonaId=saved.id;
      toast('persona duplicated');
      renderPersonas();
    },'duplicate persona');
    row.appendChild(btn);
  }

  function attachPolishListeners(){
    ['pe-avatar-focus','pe-top-banner-focus','pe-bottom-banner-focus','pe-signature-align','pe-signature-divider','pe-signature-size'].forEach(id=>{
      const el=$(id);
      if(el&&!el.dataset.polishReady){
        el.dataset.polishReady='1';
        el.oninput=updatePersonaPreview;
        el.onchange=updatePersonaPreview;
      }
    });
  }

  function enhancePersonaPolish(){
    const grid=document.querySelector('.persona-studio .editor-grid');
    if(!grid)return;
    addImageFocusControls();
    addSignatureControls();
    addSectionLabels();
    addDuplicateButton();
    attachPolishListeners();
    updatePersonaPreview();
  }

  if(typeof defaultPersona==='function'){
    const originalDefaultPersona=defaultPersona;
    defaultPersona=function(){
      return Object.assign(originalDefaultPersona(),{
        avatar_position:'top',
        top_banner_position:'center',
        bottom_banner_position:'center',
        signature_align:'left',
        signature_divider:'none',
        signature_size:'normal'
      });
    };
  }

  if(typeof readPersonaForm==='function'){
    const originalReadPersonaForm=readPersonaForm;
    readPersonaForm=function(){
      const payload=originalReadPersonaForm();
      payload.avatar_position=normalizeAvatarFocus($('pe-avatar-focus')?.value||payload.avatar_position||'top');
      payload.top_banner_position=normalizeBannerFocus($('pe-top-banner-focus')?.value||payload.top_banner_position||'center');
      payload.bottom_banner_position=normalizeBannerFocus($('pe-bottom-banner-focus')?.value||payload.bottom_banner_position||'center');
      payload.signature_align=normalizeSignatureAlign($('pe-signature-align')?.value||payload.signature_align||'left');
      payload.signature_divider=normalizeSignatureDivider($('pe-signature-divider')?.value||payload.signature_divider||'none');
      payload.signature_size=normalizeSignatureSize($('pe-signature-size')?.value||payload.signature_size||'normal');
      return payload;
    };
  }

  if(typeof renderPersonaEditor==='function'){
    const previousRenderPersonaEditor=renderPersonaEditor;
    renderPersonaEditor=function(){
      previousRenderPersonaEditor();
      enhancePersonaPolish();
    };
  }

  window.enhancePersonaPolish=enhancePersonaPolish;
  setTimeout(enhancePersonaPolish,0);
})();
