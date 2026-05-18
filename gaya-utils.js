/*
  GAYA Utilities
  Shared DOM, formatting, sanitizing, error, timeout, and status helpers.
  Defined on window so app.js can temporarily keep its old helpers during the
  shim phase without redeclaration conflicts.
*/

window.esc=function(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
};

window.$=function(id){
  return document.getElementById(id);
};

window.md=function(v){
  let s=window.esc(v||'');
  s=s
    .replace(/^### (.*)$/gm,'<h3>$1</h3>')
    .replace(/^## (.*)$/gm,'<h2>$1</h2>')
    .replace(/^# (.*)$/gm,'<h1>$1</h1>')
    .replace(/^&gt; (.*)$/gm,'<blockquote>$1</blockquote>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>')
    .replace(/\n{2,}/g,'</p><p>')
    .replace(/\n/g,'<br>');
  return '<p>'+s+'</p>';
};

window.styleSafe=function(v){
  return String(v||'').replace(/[;{}<>]/g,'').trim();
};

window.cssFontFamily=function(v){
  const raw=window.styleSafe(v||'');
  if(!raw)return 'inherit';

  const genericFamilies=new Set([
    'serif','sans-serif','monospace','cursive','fantasy','system-ui',
    'ui-serif','ui-sans-serif','ui-monospace','emoji','math','fangsong'
  ]);

  return raw.split(',').map(part=>{
    let p=part.trim();
    if(!p)return '';
    if(/^var\(/i.test(p))return p;

    p=p.replace(/^['"]|['"]$/g,'').replace(/['"\\]/g,'').trim();
    if(!p)return '';

    if(genericFamilies.has(p.toLowerCase()))return p;
    return /\s/.test(p)?"'"+p+"'":p;
  }).filter(Boolean).join(', ');
};

window.fontStyle=function(v){
  return 'font-family:'+window.cssFontFamily(v)+';';
};

window.cleanCustomCss=function(v){
  return String(v||'')
    .replace(/<\/?style[^>]*>/gi,'')
    .replace(/@import[^;]+;/gi,'')
    .replace(/@font-face\s*{[^}]*}/gi,'')
    .replace(/[<>]/g,'')
    .trim()
    .slice(0,6000);
};

window.cssScopeId=function(v){
  return 'persona-'+String(v||'preview').replace(/[^a-zA-Z0-9_-]/g,'-');
};

window.scopedCustomCss=function(css,scope){
  css=window.cleanCustomCss(css);
  if(!css)return '';

  return css.replace(/(^|[{};])\s*([^{}@][^{]*?)\s*\{/g,(match,prefix,selector)=>{
    const scoped=selector.split(',').map(sel=>{
      sel=sel.trim();
      if(!sel)return '';
      if(sel.includes('&'))return sel.replace(/&/g,scope);
      if(sel.startsWith(scope))return sel;
      return scope+' '+sel;
    }).filter(Boolean).join(', ');

    return prefix+' '+scoped+'{';
  });
};

window.customCssTag=function(css,scope){
  const scoped=window.scopedCustomCss(css,scope);
  return scoped?'<style>'+scoped.replace(/<\/style/gi,'')+'</style>':'';
};

window.dateLabel=function(iso){
  const d=new Date(iso||'');
  return Number.isNaN(d.getTime())?'undated':d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
};

window.toast=function(m,k='ok'){
  const el=document.createElement('div');
  el.className='toast'+(k==='err'?' err':'');
  el.textContent=m;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),3200);
};

window.fail=function(e,w='runtime'){
  console.error(w,e);
  state.fatal={
    where:w,
    message:e&&e.message?e.message:String(e),
    stack:e&&e.stack?e.stack:''
  };
  renderFatal();
};

window.safe=async function(fn,w){
  try{return await fn();}
  catch(e){window.fail(e,w);return null;}
};

window.withTimeout=function(promise,label,ms=12000){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timed out after '+Math.round(ms/1000)+'s')),ms))
  ]);
};

window.setStatus=function(kind,msg){
  const el=window.$('persona-status');
  if(!el)return;
  el.className=kind==='err'?'inline-error':'inline-ok';
  el.textContent=msg||'';
};

if(!window.__gayaUtilsErrorHandlers){
  window.__gayaUtilsErrorHandlers=true;
  window.addEventListener('error',e=>window.fail(e.error||e.message,'runtime error'));
  window.addEventListener('unhandledrejection',e=>window.fail(e.reason,'unhandled promise'));
}