/*
  GAYA image render fix.
  Keeps avatar/banner URLs from breaking inline style attributes.
*/

function gayaCssUrl(value){
  const safe=String(value||'')
    .trim()
    .replace(/[<>"\\\n\r]/g,'')
    .replace(/'/g,'%27')
    .replace(/\(/g,'%28')
    .replace(/\)/g,'%29');
  return safe?"url('"+safe+"')":'';
}

function gayaBgStyle(value){
  const url=gayaCssUrl(value);
  return url?'background-image:'+url+';':'';
}

renderPosts=function(){
  const list=$('posts');

  if(!state.posts.length){
    list.innerHTML='<div class="empty"><div><h2>no posts yet</h2><p class="muted">be the first little goblin to write</p></div></div>';
    return;
  }

  list.innerHTML=state.posts.map((p,i)=>{
    const per=p.persona||{};
    const f=fontStyle(per.font_family);
    const av=gayaBgStyle(per.avatar_url);
    const banner=per.banner_url?'<div class="banner" style="'+esc(gayaBgStyle(per.banner_url))+'"></div>':'';
    const scopeId=cssScopeId(per.id||p.persona_id||('post-'+i));
    const scope='[data-persona-style="'+scopeId+'"]';
    const custom=customCssTag(per.custom_css,scope);

    return custom+'<article class="post" data-persona-style="'+esc(scopeId)+'" style="'+
      (per.bg_color?'background:'+esc(per.bg_color)+';':'')+
      (per.text_color?'color:'+esc(per.text_color)+';':'')+
      (per.border_color?'border-color:'+esc(per.border_color)+';':'')+
      f+
      '">'+
      banner+
      '<div class="post-head"><div class="avatar" style="background-color:'+esc(per.accent_color||'#a8854f')+';'+esc(av)+'"></div><div class="post-name" style="'+f+'">'+esc(per.name||'unknown persona')+'</div><div class="post-meta">'+dateLabel(p.created_at)+'</div></div>'+
      '<div class="post-body" style="'+f+'">'+md(p.body)+'</div>'+
      (per.signature?'<div class="signature-block" style="'+f+'">'+md(per.signature)+'</div>':'')+
      '</article>';
  }).join('');
};

updatePersonaPreview=function(){
  const box=$('persona-preview');
  if(!box)return;

  const p=readPersonaForm();
  const f=fontStyle(p.font_family);
  const banner=p.banner_url?'<div class="banner" style="'+esc(gayaBgStyle(p.banner_url))+'"></div>':'';
  const avatar=gayaBgStyle(p.avatar_url);
  const scopeId='persona-preview';
  const scope='[data-persona-style="'+scopeId+'"]';
  const custom=customCssTag(p.custom_css,scope);

  box.innerHTML=custom+'<article class="post" data-persona-style="'+scopeId+'" style="background:'+esc(p.bg_color)+';color:'+esc(p.text_color)+';border-color:'+esc(p.border_color)+';'+f+'">'+
    banner+
    '<div class="post-head"><div class="avatar" style="background-color:'+esc(p.accent_color)+';'+esc(avatar)+'"></div><div class="post-name" style="'+f+'">'+esc(p.name||'unnamed')+'</div><div class="post-meta">preview</div></div>'+
    '<div class="post-body" style="'+f+'"><p>This is how the persona speaks on the page.</p><blockquote>A line worth setting apart.</blockquote></div>'+
    (p.signature?'<div class="signature-block" style="'+f+'">'+md(p.signature)+'</div>':'')+
    '</article>';
};
