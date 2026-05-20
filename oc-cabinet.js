/* GAYA OC Cabinet / prop shelf now, real OC profiles after schema */
(function(){
  const MARK='__gayaOcCabinetInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  state.ocCabinetUploads=state.ocCabinetUploads||[];

  function clean(v){return String(v||'').trim();}
  function uploadKey(){return 'gaya.ocCabinetUploads.'+(state.user?.id||'anon');}
  function bucketName(){return typeof GAYA_IMAGE_BUCKET!=='undefined'?GAYA_IMAGE_BUCKET:'gaya-images';}

  function loadSavedUploads(){
    try{
      const raw=localStorage.getItem(uploadKey());
      state.ocCabinetUploads=raw?JSON.parse(raw).slice(0,36):[];
    }catch(_e){
      state.ocCabinetUploads=[];
    }
  }

  function saveUploads(){
    try{
      localStorage.setItem(uploadKey(),JSON.stringify((state.ocCabinetUploads||[]).slice(0,36)));
    }catch(_e){}
  }

  function imageStyle(url){
    return 'background-image:url('+JSON.stringify(url)+')';
  }

  async function copyText(text,label){
    text=String(text||'');
    if(!text)return;
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(text);
      }else{
        const box=document.createElement('textarea');
        box.value=text;
        box.setAttribute('readonly','');
        box.style.position='fixed';
        box.style.left='-9999px';
        document.body.appendChild(box);
        box.select();
        document.execCommand('copy');
        box.remove();
      }
      toast(label||'copied');
    }catch(e){
      console.warn('copy failed',e);
      toast('copy failed','err');
    }
  }

  function copyButton(text,label,extraClass=''){
    return '<button type="button" class="ghost cabinet-copy '+extraClass+'" data-cabinet-copy="'+esc(text)+'" data-cabinet-label="'+esc(label)+'">'+esc(label)+'</button>';
  }

  function renderProfileBlueprint(){
    return '<section class="cabinet-panel cabinet-blueprint-panel">'+
      '<div class="cabinet-panel-head"><div><p class="kicker">profile drawer</p><h2>Character profiles need their own table</h2></div><span class="cabinet-count">schema later</span></div>'+
      '<p class="muted">This tab should become the real OC archive: character records with canon notes, reference images, props, aliases, timeline links, relationships, locations, and links out to existing post styles. Post styles already have their own tab, so the cabinet should reference them only when a character profile needs one.</p>'+
      '<div class="cabinet-blueprint-grid">'+
        '<div><h3>Profile card</h3><p>Name, aliases, pronouns, role, species/type, status, short blurb, long notes.</p></div>'+
        '<div><h3>Reference shelf</h3><p>OC images, face refs, outfit refs, symbols, props, and bot-ready URLs.</p></div>'+
        '<div><h3>Canon links</h3><p>Related post styles, Chronicle events, threads, arcs, relationships, locations.</p></div>'+
      '</div>'+
      '<p class="muted cabinet-blueprint-note">This is the main cabinet shape. The uploader below is only a little utility drawer until the schema exists.</p>'+
    '</section>';
  }

  function setUploadStatus(msg,kind=''){
    const el=$('cabinet-upload-status');
    if(!el)return;
    el.textContent=msg||'';
    el.className='cabinet-upload-status '+(kind||'');
  }

  async function prepareCabinetProp(file){
    if(typeof enforceImageUploadLimits==='function')enforceImageUploadLimits(file);
    else if(!file||!file.type||!file.type.startsWith('image/'))throw new Error('Please choose an image file.');

    if(file.type==='image/gif'){
      return {blob:file,ext:'gif',contentType:'image/gif'};
    }

    if(typeof loadImageFromFile!=='function'||typeof compressCanvas!=='function'){
      throw new Error('Image preparation is not available yet. Refresh and try again.');
    }

    const img=await loadImageFromFile(file);
    const scale=Math.min(1,1600/img.naturalWidth,1600/img.naturalHeight);
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
    const max=typeof GAYA_MAX_PREPARED_IMAGE_BYTES!=='undefined'?GAYA_MAX_PREPARED_IMAGE_BYTES:8*1024*1024;
    if(!prepared?.blob)throw new Error('Could not compress image.');
    if(prepared.blob.size>max){
      const label=typeof fileSizeLabel==='function'?fileSizeLabel(max):Math.round(max/1024/1024)+' MB';
      throw new Error('The resized image is still too large. Keep prepared uploads under '+label+'.');
    }
    return prepared;
  }

  async function uploadCabinetProp(file){
    if(!state.user?.id)throw new Error('You must be signed in to upload props.');
    if(!supa?.storage)throw new Error('Supabase Storage is not available.');

    setUploadStatus('preparing image…');
    const prepared=await prepareCabinetProp(file);
    const stamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
    const safeName=typeof safeImageFileName==='function'?safeImageFileName(file.name):clean(file.name).replace(/[^a-z0-9_-]+/gi,'-').slice(0,48)||'prop';
    const path=state.user.id+'/oc-props/'+stamp+'-'+safeName+'.'+prepared.ext;
    const size=typeof fileSizeLabel==='function'?fileSizeLabel(prepared.blob.size):prepared.blob.size+' B';

    setUploadStatus('uploading '+size+'…');
    const {error}=await withTimeout(
      supa.storage.from(bucketName()).upload(path,prepared.blob,{
        cacheControl:'31536000',
        contentType:prepared.contentType,
        upsert:false
      }),
      'OC prop upload',
      45000
    );
    if(error)throw error;

    const {data}=supa.storage.from(bucketName()).getPublicUrl(path);
    if(!data?.publicUrl)throw new Error('Upload succeeded, but no public URL came back.');

    const item={
      url:data.publicUrl,
      name:file.name||'prop image',
      size,
      created_at:new Date().toISOString()
    };
    state.ocCabinetUploads=[item,...(state.ocCabinetUploads||[])].slice(0,36);
    saveUploads();
    return item;
  }

  function renderUploadShelf(){
    const uploads=state.ocCabinetUploads||[];
    if(!uploads.length){
      return '<div class="cabinet-empty-shelf"><p class="muted">No recent utility uploads in this browser yet.</p></div>';
    }

    return '<div class="cabinet-prop-grid">'+uploads.map(item=>{
      const when=item.created_at?dateLabel(item.created_at):'recently';
      return '<article class="cabinet-prop">'+
        '<div class="cabinet-prop-img" style="'+esc(imageStyle(item.url))+'"></div>'+
        '<div class="cabinet-prop-body"><h3>'+esc(item.name||'prop image')+'</h3><p class="muted">'+esc(item.size||'uploaded')+' · '+esc(when)+'</p>'+
        '<input readonly value="'+esc(item.url)+'" aria-label="prop URL">'+
        '<div class="row mt">'+copyButton(item.url,'copy URL')+copyButton('[img]'+item.url+'[/img]','copy post tag')+'</div></div></article>';
    }).join('')+'</div>';
  }

  function renderUtilityDrawer(){
    return '<section class="cabinet-panel cabinet-props-panel cabinet-utility-panel">'+
      '<div class="cabinet-panel-head"><div><p class="kicker">utility drawer</p><h2>Quick reusable URL</h2></div><button type="button" id="cabinet-pick-prop">＋ upload prop</button></div>'+
      '<p class="muted">Small helper: upload an image to Supabase Storage, then copy the public URL for posts, future OC profiles, or the Discord bot.</p>'+
      '<input id="cabinet-prop-file" class="cabinet-hidden-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/*">'+
      '<div id="cabinet-upload-status" class="cabinet-upload-status"></div><div id="cabinet-upload-shelf" class="cabinet-upload-shelf">'+renderUploadShelf()+'</div></section>';
  }

  function renderOcCabinet(){
    const main=$('main');
    if(!main)return;
    loadSavedUploads();

    main.innerHTML='<div class="header cabinet-header"><div><p class="kicker">OC archive</p><h1>OC Cabinet</h1></div></div>'+
      renderProfileBlueprint()+renderUtilityDrawer();

    const picker=$('cabinet-pick-prop');
    const input=$('cabinet-prop-file');
    if(picker&&input){
      picker.onclick=()=>input.click();
      input.onchange=async()=>{
        const file=input.files&&input.files[0];
        if(!file)return;
        try{
          picker.disabled=true;
          await uploadCabinetProp(file);
          setUploadStatus('uploaded + shelved ✓','ok');
          const shelf=$('cabinet-upload-shelf');
          if(shelf)shelf.innerHTML=renderUploadShelf();
          bindCabinetActions();
          toast('prop URL ready');
        }catch(e){
          console.error('OC prop upload failed',e);
          setUploadStatus('upload failed: '+(e.message||String(e)),'err');
          toast('prop upload failed','err');
        }finally{
          picker.disabled=false;
          input.value='';
        }
      };
    }

    bindCabinetActions();
  }

  function bindCabinetActions(){
    document.querySelectorAll('[data-cabinet-copy]').forEach(btn=>{
      if(btn.dataset.copyReady==='1')return;
      btn.dataset.copyReady='1';
      btn.onclick=()=>copyText(btn.dataset.cabinetCopy,btn.dataset.cabinetLabel||'copied');
    });
  }

  const originalReadRoute=readRoute;
  readRoute=function(){
    const h=(location.hash||'#threads').slice(1);
    if(h==='cabinet'||h==='oc-cabinet'){
      state.view='ocCabinet';
      state.threadId=null;
      return;
    }
    originalReadRoute();
  };

  const originalRefreshRoute=refreshRoute;
  refreshRoute=async function(){
    readRoute();
    if(state.session&&state.view==='ocCabinet')return render();
    return originalRefreshRoute();
  };

  const originalRenderShell=renderShell;
  renderShell=function(){
    const oldView=state.view;
    originalRenderShell();
    const nav=document.querySelector('.tabs');
    if(nav&&!nav.querySelector('a[href="#cabinet"]')){
      const a=document.createElement('a');
      a.href='#cabinet';
      a.textContent='OC cabinet';
      a.className=oldView==='ocCabinet'?'active':'';
      nav.appendChild(a);
    }
    if(oldView==='ocCabinet')renderOcCabinet();
  };

  window.renderOcCabinet=renderOcCabinet;
})();
