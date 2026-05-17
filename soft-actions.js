/* Keep ordinary button failures from replacing the whole app with the fatal screen. */
(function(){
  const hardLabels=new Set(['boot','auth change','hash navigation','runtime','runtime error','unhandled promise']);
  const originalSafe=typeof safe==='function'?safe:null;

  safe=async function(fn,label){
    try{
      return await fn();
    }catch(e){
      const message=e&&e.message?e.message:String(e);
      console.error(label||'action failed',e);

      if(hardLabels.has(label)){
        if(typeof fail==='function')fail(e,label);
        else if(originalSafe)return originalSafe(async()=>{throw e;},label);
        return null;
      }

      if(typeof toast==='function')toast(message||'something went wrong','err');
      return null;
    }
  };
})();
