/*
  GAYA secondary banner support.
  Adds bottom_banner_url to the base persona defaults and save payload before
  layout/upload/render enhancement files wrap the persona editor functions.
*/

(function(){
  if(typeof defaultPersona==='function'){
    const originalDefaultPersona=defaultPersona;
    defaultPersona=function(){
      return Object.assign({bottom_banner_url:''},originalDefaultPersona(),{bottom_banner_url:''});
    };
  }

  if(typeof readPersonaForm==='function'){
    const originalReadPersonaForm=readPersonaForm;
    readPersonaForm=function(){
      const payload=originalReadPersonaForm();
      const bottomInput=$('pe-bottom-banner');
      payload.bottom_banner_url=bottomInput&&bottomInput.value.trim()?bottomInput.value.trim():null;
      return payload;
    };
  }
})();
