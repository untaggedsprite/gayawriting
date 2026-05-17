/*
  GAYA custom CSS scoper.
  Replaces the original regex scoper with a brace-aware version so persona
  CSS cannot leak into every post in thread view.
*/

(function(){
  function cleanScopedCss(css){
    if(typeof cleanCustomCss==='function')return cleanCustomCss(css);
    return String(css||'')
      .replace(/<\/?style[^>]*>/gi,'')
      .replace(/@import[^;]+;/gi,'')
      .replace(/@font-face\s*{[^}]*}/gi,'')
      .replace(/[<>]/g,'')
      .trim()
      .slice(0,6000);
  }

  function splitSelectorList(selector){
    const out=[];
    let current='';
    let depth=0;
    let quote='';

    for(const ch of String(selector||'')){
      if(quote){
        current+=ch;
        if(ch===quote)quote='';
        continue;
      }
      if(ch==='"'||ch==="'"){
        quote=ch;
        current+=ch;
        continue;
      }
      if(ch==='('||ch==='[')depth++;
      if((ch===')'||ch===']')&&depth>0)depth--;
      if(ch===','&&depth===0){
        out.push(current.trim());
        current='';
      }else current+=ch;
    }

    if(current.trim())out.push(current.trim());
    return out;
  }

  function scopeSelector(selector,scope){
    return splitSelectorList(selector).map(sel=>{
      if(!sel)return '';
      if(sel.includes('&'))return sel.replace(/&/g,scope);
      if(sel.startsWith(scope))return sel;
      return scope+' '+sel;
    }).filter(Boolean).join(', ');
  }

  function findRuleClose(css,openIndex){
    let depth=1;
    let quote='';
    let comment=false;

    for(let i=openIndex+1;i<css.length;i++){
      const ch=css[i];
      const next=css[i+1];

      if(comment){
        if(ch==='*'&&next==='/'){
          comment=false;
          i++;
        }
        continue;
      }

      if(quote){
        if(ch==='\\'){
          i++;
          continue;
        }
        if(ch===quote)quote='';
        continue;
      }

      if(ch==='/'&&next==='*'){
        comment=true;
        i++;
        continue;
      }
      if(ch==='"'||ch==="'"){
        quote=ch;
        continue;
      }
      if(ch==='{')depth++;
      if(ch==='}'){
        depth--;
        if(depth===0)return i;
      }
    }

    return -1;
  }

  function scopeCssRules(css,scope){
    let out='';
    let pos=0;

    while(pos<css.length){
      const open=css.indexOf('{',pos);
      if(open===-1)break;

      const selector=css.slice(pos,open).trim();
      const close=findRuleClose(css,open);
      if(close===-1)break;

      const body=css.slice(open+1,close).trim();
      const lower=selector.toLowerCase();

      if(!selector){
        pos=close+1;
        continue;
      }

      if(lower.startsWith('@media')||lower.startsWith('@supports')||lower.startsWith('@container')){
        const nested=scopeCssRules(body,scope);
        if(nested)out+=selector+'{'+nested+'}\n';
      }else if(lower.startsWith('@keyframes')||lower.startsWith('@-webkit-keyframes')){
        // Animation names are allowed, but selector scoping does not apply inside keyframes.
        out+=selector+'{'+body+'}\n';
      }else if(lower.startsWith('@')){
        // Unknown at-rules are ignored rather than allowed to leak globally.
      }else{
        const scoped=scopeSelector(selector,scope);
        if(scoped&&body)out+=scoped+'{'+body+'}\n';
      }

      pos=close+1;
    }

    return out.trim();
  }

  window.scopedCustomCss=function(css,scope){
    css=cleanScopedCss(css);
    if(!css||!scope)return '';
    return scopeCssRules(css,scope);
  };

  window.customCssTag=function(css,scope){
    const scoped=window.scopedCustomCss(css,scope);
    return scoped?'<style>'+scoped.replace(/<\/style/gi,'')+'</style>':'';
  };
})();
