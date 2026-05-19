/*
  GAYA Post Images
  Lets thread replies and edited replies upload images into the existing post body.
  Storage stays simple: posts still store plain text with [img]...[/img] tags.
*/
(function(){
  const MARK='__gayaPostImagesInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  const MAX_W=1400;
  const MAX_H=1400;

  function imageBucket(){
    return typeof GAYA_IMAGE_BUCKET!=='undefined'?GAYA_IMAGE_BUCKET:'gaya-images';
  }

  function decodeHtml(value){
    const box=document.createElement('textarea');
    box.innerHTML=String(value||'');
    return box.value;
  }

  function cleanImageUrl(value){
    const raw=decodeHtml(value)
      .trim()
      .replace(/[\u0000-\u001f<>"']/g,'')
      .slice(0,2048);

    if(!raw)return '';

    try{
      const url=new URL(raw,window.location.origin);
      if(url.protocol!=='https:'&&url.protocol!=='http:')return '';
      return url.href;
    }catch(_e){
      return '';
    }
  }

  function postImageFigure(src){
    const url=cleanImageUrl(src);
    if(!url)return '';
    return '<figure class="post-image-figure"><img class="post-image" src="'+esc(url)+'" alt="" loading="lazy" decoding="async"></figure>';
  }

  function postImageInline(src){
    const url=cleanImageUrl(src);
    if(!url)return '';
    return '<span class="post-image-inline-wrap"><img class="post-image-inline" src="'+esc(url)+'" alt="" loading="lazy" decoding="async"></span>';
  }

  function enhancePostImages(html){
    const tag='\\[img\\]([^\\[\\]<]+?)\\[/img\\]';
    const blockRe=new RegExp('<p>\\s*'+tag+'\\s*</p>','gi');
    const inlineRe=new RegExp(tag,'gi');

    return String(html||'')
      .replace(blockRe,(match,src)=>postImageFigure(src)||match)
      .replace(inlineRe,(match,src)=>postImageInline(src)||match);
  }

  if(typeof md==='function'){
    const originalMd=md;
    md=function(value){
      return enhancePostImages(originalMd(value));
    };
  }

  function setPostImageStatus(el,msg,kind=''){
    if(!el)return;
    el.textContent=msg||'';
    el.className='post-image-status '+(kind||'');
  }

  function fallbackFileLabel(bytes){
    const n=Number(bytes)||0;
    if(n<1024)return n+' B';
    if(n<1024*1024)return (n/1024).toFixed(n<10*1024?1:0)+' KB';
    return (n/(1024*1024)).toFixed(n<10*1024*1024?1:0)+' MB';
  }

  function sizeLabel(bytes){
    return typeof fileSizeLabel==='function'?fileSizeLabel(bytes):fallbackFileLabel(bytes);
  }

  function safeName(name){
    if(typeof safeImageFileName==='function')return safeImageFileName(name);
    return String(name||'image')
      .toLowerCase()
      .replace(/\.[^.]+$/,'')
      .replace(/[^a-z0-9_-]+/g,'-')
      .replace(/^-+|-+$/g,'')
      .slice(0,48)||'image';
  }

  async function preparePostImage(file){
    if(typeof enforceImageUploadLimits==='function')enforceImageUploadLimits(file);
    else if(!file||!file.type||!file.type.startsWith('image/'))throw new Error('Please choose an image file.');

    if(file.type==='image/gif'){
      return {blob:file,ext:'gif',contentType:'image/gif'};
    }

    if(typeof loadImageFromFile!=='function'||typeof compressCanvas!=='function'){
      throw new Error('Image preparation is not available yet. Refresh and try again.');
    }

    const img=await loadImageFromFile(file);
    const scale=Math.min(1,MAX_W/img.naturalWidth,MAX_H/img.naturalHeight);
    const w=Math.max(1,Math.round(img.naturalWidth*scale));
    const h=Math.max(1,Math.round(img.naturalHeight*scale));
    const canvas=document.createElement('canvas');
    canvas.width=w;
    canvas.height=h;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    ctx.drawImage(img,0,0,w,h);

    const prepared=await compressCanvas(canvas);
    if(!prepared?.blob)throw new Error('Could not compress image.');
    return prepared;
  }

  async function uploadPostImage(file,status,button){
    if(!state.user?.id)throw new Error('You must be signed in to upload images.');
    if(!state.threadId)throw new Error('Open a thread before uploading an image.');
    if(!supa?.storage)throw new Error('Supabase Storage is not available.');

    button.disabled=true;
    setPostImageStatus(status,'preparing image…');

    const prepared=await preparePostImage(file);
    const stamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
    const thread=String(state.threadId||'thread').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,72)||'thread';
    const path=state.user.id+'/post-images/'+thread+'/'+stamp+'-'+safeName(file.name)+'.'+prepared.ext;

    setPostImageStatus(status,'uploading '+sizeLabel(prepared.blob.size)+'…');

    const {error}=await withTimeout(
      supa.storage.from(imageBucket()).upload(path,prepared.blob,{
        cacheControl:'31536000',
        contentType:prepared.contentType,
        upsert:false
      }),
      'post image upload',
      45000
    );

    if(error)throw error;

    const {data}=supa.storage.from(imageBucket()).getPublicUrl(path);
    if(!data?.publicUrl)throw new Error('Upload succeeded, but no public URL came back.');
    return data.publicUrl;
  }

  function fireInput(textarea){
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function insertImageTag(textarea,url){
    const clean=cleanImageUrl(url);
    if(!clean)throw new Error('That image URL does not look usable.');

    const start=textarea.selectionStart||0;
    const end=textarea.selectionEnd||0;
    const value=textarea.value||'';
    const before=value.slice(0,start);
    const after=value.slice(end);
    const tag='[img]'+clean+'[/img]';
    const prefix=before&& !before.endsWith('\n')?'\n\n':'';
    const suffix=after&& !after.startsWith('\n')?'\n\n':'\n';
    const inserted=prefix+tag+suffix;

    textarea.value=before+inserted+after;
    textarea.focus();
    const cursor=before.length+inserted.length;
    textarea.setSelectionRange(cursor,cursor);
    fireInput(textarea);
  }

  function makePostImageControls(textarea){
    if(!textarea||textarea.dataset.gayaPostImages==='1')return;
    textarea.dataset.gayaPostImages='1';

    const controls=document.createElement('div');
    controls.className='post-image-upload';
    controls.innerHTML='<input class="post-image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/*"><button type="button" class="ghost post-image-pick">upload image</button><button type="button" class="ghost post-image-url">image URL</button><span class="post-image-status"></span>';

    textarea.parentNode.insertBefore(controls,textarea);

    const fileInput=controls.querySelector('.post-image-file');
    const pick=controls.querySelector('.post-image-pick');
    const urlBtn=controls.querySelector('.post-image-url');
    const status=controls.querySelector('.post-image-status');

    pick.title='Uploads into the reply as [img]...[/img]. GIFs stay animated under '+sizeLabel(typeof GAYA_MAX_GIF_BYTES!=='undefined'?GAYA_MAX_GIF_BYTES:10*1024*1024)+'.';
    pick.onclick=()=>fileInput.click();

    urlBtn.onclick=()=>{
      const url=window.prompt('Image URL');
      if(!url)return;
      try{
        insertImageTag(textarea,url);
        setPostImageStatus(status,'image tag inserted','ok');
      }catch(e){
        setPostImageStatus(status,e.message||String(e),'err');
        toast('image URL failed','err');
      }
    };

    fileInput.onchange=()=>safe(async()=>{
      const file=fileInput.files&&fileInput.files[0];
      if(!file)return;

      try{
        const publicUrl=await uploadPostImage(file,status,pick);
        insertImageTag(textarea,publicUrl);
        setPostImageStatus(status,'uploaded + inserted ✓','ok');
        toast('image inserted');
      }catch(e){
        console.error('post image upload failed',e);
        setPostImageStatus(status,'upload failed: '+(e.message||String(e)),'err');
        toast('image upload failed','err');
      }finally{
        pick.disabled=false;
        fileInput.value='';
      }
    },'post image upload');
  }

  function enhancePostImageTargets(){
    makePostImageControls(document.getElementById('body'));
    makePostImageControls(document.getElementById('edit-post-body'));
  }

  if(typeof renderComposer==='function'){
    const originalRenderComposer=renderComposer;
    renderComposer=function(){
      originalRenderComposer();
      enhancePostImageTargets();
    };
  }

  const observer=new MutationObserver(()=>enhancePostImageTargets());
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',enhancePostImageTargets);
  }else{
    enhancePostImageTargets();
  }
})();
