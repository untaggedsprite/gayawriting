/*
  GAYA image render fix.
  Keeps avatar/banner URLs from breaking inline style attributes and supports
  Gaia-style portrait layouts with optional bottom banners.
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

function gayaLayoutMatch(css){
  return String(css||'').match(/\/\* GAYA_LAYOUT_START side=(left|right|none) banner=(top|bottom|both|none) \*\//i);
}

function normalizeGayaSide(value){
  return ['left','right','none'].includes(value)?value:'left';
}

function normalizeGayaBanner(value){
  return ['top','bottom','both','none'].includes(value)?value:'top';
}

function stripGayaLayoutCss(css){
  return String(css||'').replace(/\/\* GAYA_LAYOUT_START[\s\S]*?GAYA_LAYOUT_END \*\//g,'').trim();
}

function gayaLayoutSide(perOrCss){
  if(perOrCss&&typeof perOrCss==='object'){
    const match=gayaLayoutMatch(perOrCss.custom_css);
    return normalizeGayaSide(perOrCss.layout_side||match?.[1]||'left');
  }
  const match=gayaLayoutMatch(perOrCss);
  return normalizeGayaSide(match?.[1]||'left');
}

function gayaBannerMode(perOrCss){
  if(perOrCss&&typeof perOrCss==='object'){
    const match=gayaLayoutMatch(perOrCss.custom_css);
    return normalizeGayaBanner(perOrCss.banner_position||match?.[2]||'top');
  }
  const match=gayaLayoutMatch(perOrCss);
  return normalizeGayaBanner(match?.[2]||'top');
}

function isGaiaPortraitLayout(perOrCss){
  if(perOrCss&&typeof perOrCss==='object'){
    if(perOrCss.gaia_layout_enabled===true)return true;
    if(perOrCss.gaia_layout_enabled===false)return false;
    return !!gayaLayoutMatch(perOrCss.custom_css);
  }
  return !!gayaLayoutMatch(perOrCss);
}

function gayaBanners(topUrl,mode,bottomUrl){
  if(mode==='none')return {top:'',bottom:''};
  const topStyle=topUrl?esc(gayaBgStyle(topUrl)):'';
  const bottomStyle=(bottomUrl||topUrl)?esc(gayaBgStyle(bottomUrl||topUrl)):'';
  return {
    top:(topStyle&&(mode==='top'||mode==='both'))?'<div class="banner top-banner" style="'+topStyle+'"></div>':'',
    bottom:(bottomStyle&&(mode==='bottom'||mode==='both'))?'<div class="banner bottom-banner" style="'+bottomStyle+'"></div>':''
  };
}

function gayaPortraitStyle(per,side){
  const floatSide=side==='right'?'right':'left';
  const margin=side==='right'?'.25rem 1.65rem 1.05rem 2rem':'.25rem 2rem 1.05rem 1.65rem';
  return 'display:block !important;float:'+floatSide+';width:345px !important;min-width:345px !important;max-width:48vw !important;height:440px !important;min-height:440px !important;margin:'+margin+';border-radius:12px;border:3px solid currentColor;background-color:'+esc(per.accent_color||'#a8854f')+';'+esc(gayaBgStyle(per.avatar_url))+'background-size:cover;background-position:center top;box-shadow:0 16px 38px rgba(0,0,0,.18);';
}

function gayaImageHtml(per,className,extraAttrs=''){
  const av=esc(gayaBgStyle(per.avatar_url));
  return '<div class="'+esc(className)+'" '+extraAttrs+' style="background-color:'+esc(per.accent_color||'#a8854f')+';'+av+'"></div>';
}

function gayaPortraitHtml(per,side){
  if(side==='none')return '';
  return '<div class="gaya-portrait" data-side="'+esc(side)+'" style="'+gayaPortraitStyle(per,side)+'"></div>';
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
    const gaia=isGaiaPortraitLayout(per);
    const side=gayaLayoutSide(per);
    const bannerMode=gayaBannerMode(per);
    const banners=gayaBanners(per.banner_url,bannerMode,per.bottom_banner_url);
    const scopeId=cssScopeId(per.id||p.persona_id||('post-'+i));
    const scope='[data-persona-style="'+scopeId+'"]';
    const custom=customCssTag(stripGayaLayoutCss(per.custom_css),scope);
    const headAvatar=gaia?'':gayaImageHtml(per,'avatar small-avatar');
    const portrait=gaia?gayaPortraitHtml(per,side):'';

    return custom+'<article class="post" data-persona-style="'+esc(scopeId)+'" data-gaya-layout="'+(gaia?'1':'0')+'" data-gaya-side="'+esc(side)+'" style="'+
      (per.bg_color?'background:'+esc(per.bg_color)+';':'')+
      (per.text_color?'color:'+esc(per.text_color)+';':'')+
      (per.border_color?'border-color:'+esc(per.border_color)+';':'')+
      f+
      '">'+
      banners.top+
      '<div class="post-head">'+headAvatar+'<div class="post-name" style="'+f+'">'+esc(per.name||'unknown persona')+'</div><div class="post-meta">'+dateLabel(p.created_at)+'</div></div>'+
      portrait+
      '<div class="post-body" style="'+f+'">'+md(p.body)+'</div>'+
      (per.signature?'<div class="signature-block" style="'+f+'">'+md(per.signature)+'</div>':'')+
      banners.bottom+
      '</article>';
  }).join('');
};

updatePersonaPreview=function(){
  const box=$('persona-preview');
  if(!box)return;

  const p=readPersonaForm();
  const f=fontStyle(p.font_family);
  const gaia=isGaiaPortraitLayout(p);
  const side=gayaLayoutSide(p);
  const bannerMode=gayaBannerMode(p);
  const banners=gayaBanners(p.banner_url,bannerMode,p.bottom_banner_url);
  const scopeId='persona-preview';
  const scope='[data-persona-style="'+scopeId+'"]';
  const custom=customCssTag(stripGayaLayoutCss(p.custom_css),scope);
  const headAvatar=gaia?'':gayaImageHtml(p,'avatar small-avatar');
  const portrait=gaia?gayaPortraitHtml(p,side):'';

  box.innerHTML=custom+'<article class="post" data-persona-style="'+scopeId+'" data-gaya-layout="'+(gaia?'1':'0')+'" data-gaya-side="'+esc(side)+'" style="background:'+esc(p.bg_color)+';color:'+esc(p.text_color)+';border-color:'+esc(p.border_color)+';'+f+'">'+
    banners.top+
    '<div class="post-head">'+headAvatar+'<div class="post-name" style="'+f+'">'+esc(p.name||'unnamed')+'</div><div class="post-meta">preview</div></div>'+
    portrait+
    '<div class="post-body" style="'+f+'"><p>This is how the persona speaks on the page. Longer posts will wrap around the portrait before continuing underneath it.</p><blockquote>A line worth setting apart.</blockquote></div>'+
    (p.signature?'<div class="signature-block" style="'+f+'">'+md(p.signature)+'</div>':'')+
    banners.bottom+
    '</article>';
};
