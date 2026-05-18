/*
  Legacy persona font-size controls retired.
  Kept as a cleanup shim so old saved persona markers do not keep affecting posts.
  Thread-level font sizing now lives in thread-font-size.js.
*/

(function(){
  function normalizeFontSize(value){
    value=String(value||'').toLowerCase();
    return ['tiny','small','standard','large','huge'].includes(value)?value:'standard';
  }

  function stripFontSizeCss(css){
    return String(css||'')
      .replace(/\/\* GAYA_FONT_SIZE_START[\s\S]*?GAYA_FONT_SIZE_END \*\//g,'')
      .trim();
  }

  function getFontSizeFromPersona(){
    return 'standard';
  }

  if(typeof readPersonaForm==='function'){
    const previousReadPersonaForm=readPersonaForm;
    readPersonaForm=function(){
      const payload=previousReadPersonaForm();
      payload.custom_css=stripFontSizeCss(payload.custom_css);
      return payload;
    };
  }

  if(typeof updatePersonaPreview==='function'){
    const previousUpdatePersonaPreview=updatePersonaPreview;
    updatePersonaPreview=function(){
      previousUpdatePersonaPreview();
      const article=document.querySelector('#persona-preview .post');
      if(article)article.removeAttribute('data-font-size');
    };
  }

  window.normalizeFontSize=normalizeFontSize;
  window.getFontSizeFromPersona=getFontSizeFromPersona;
  window.stripFontSizeCss=stripFontSizeCss;
})();