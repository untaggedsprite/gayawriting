/*
  GAYA font render fix.
  Shared font helpers for inline style attributes.

  CSS allows double-quoted font family names, but our rendered posts place
  font-family declarations inside double-quoted HTML style attributes. Using
  single quotes for multi-word font names keeps both the CSS and the HTML valid.
*/

(function(){
  const genericFamilies=new Set([
    'serif','sans-serif','monospace','cursive','fantasy','system-ui',
    'ui-serif','ui-sans-serif','ui-monospace','emoji','math','fangsong'
  ]);

  function safeStyleValue(value){
    return String(value||'').replace(/[;{}<>]/g,'').trim();
  }

  function quoteFontName(part){
    let p=String(part||'').trim();
    if(!p)return '';
    if(/^var\(/i.test(p))return p;

    p=p.replace(/^['"]|['"]$/g,'').replace(/['"\\]/g,'').trim();
    if(!p)return '';

    if(genericFamilies.has(p.toLowerCase()))return p;
    return /\s/.test(p)?"'"+p+"'":p;
  }

  window.cssFontFamily=function(value){
    const raw=safeStyleValue(value);
    if(!raw)return 'inherit';

    const stack=raw.split(',').map(quoteFontName).filter(Boolean).join(', ');
    return stack||'inherit';
  };

  window.fontStyle=function(value){
    return 'font-family:'+window.cssFontFamily(value)+';';
  };
})();
