// Final GAYA boot hook.
// Loaded after app.js and all enhancement modules so monkeypatches are installed before the app renders.
(function(){
  const MARK='__gayaBootStarted';
  if(window[MARK])return;
  window[MARK]=true;

  try{
    if(typeof initPageBlooms==='function')initPageBlooms();
    if(typeof boot==='function'){
      boot();
    }else{
      throw new Error('GAYA boot() is not available. Check script load order.');
    }
  }catch(error){
    if(typeof fail==='function')fail(error,'final boot');
    else console.error('GAYA final boot failed',error);
  }
})();
