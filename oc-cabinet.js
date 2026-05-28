/* GAYA OC Cabinet / profile foundation + prop shelf */
(function(){
  const MARK='__gayaOcCabinetInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  state.ocCabinetUploads=state.ocCabinetUploads||[];
  state.ocProfiles=state.ocProfiles||[];
  state.ocProfilesLoaded=state.ocProfilesLoaded||false;
  state.ocProfilesLoading=state.ocProfilesLoading||false;
  state.ocProfileLoadError=state.ocProfileLoadError||null;
  state.editOcProfileId=state.editOcProfileId||null;

  function clean(v){return String(v||'').trim();}
  function uploadKey(){return 'gaya.ocCabinetUploads.'+(state.user?.id||'anon');}
  function bucketName(){return typeof GAYA_IMAGE_BUCKET!=='undefined'?GAYA_IMAGE_BUCKET:'gaya-images';}
  function isMine(row){return row&&state.user?.id&&row.user_id===state.user.id;}
  function profiles(){return Array.isArray(state.ocProfiles)?state.ocProfiles:[];}
  function personaName(id){return (state.personas||[]).find(p=>String(p.id)===String(id))?.name||'linked post style';}
  function missingSchema(e){const m=String(e?.message||e||'');return e?.code==='42P01'||e?.code==='PGRST205'||/oc_profiles|relation .* does not exist|could not find the table/i.test(m);}

  function loadSavedUploads(){try{const raw=localStorage.getItem(uploadKey());state.ocCabinetUploads=raw?JSON.parse(raw).slice(0,36):[];}catch(_e){state.ocCabinetUploads=[];}}
  function saveUploads(){try{localStorage.setItem(uploadKey(),JSON.stringify((state.ocCabinetUploads||[]).slice(0,36)));}catch(_e){}}
  function imageStyle(url){return 'background-image:url('+JSON.stringify(url)+')';}
  function copyButton(text,label,extraClass=''){return '<button type="button" class="ghost cabinet-copy '+extraClass+'" data-cabinet-copy="'+esc(text)+'" data-cabinet-label="'+esc(label)+'">'+esc(label)+'</button>';}

  async function copyText(text,label){
    text=String(text||'');
    if(!text)return;
    try{
      if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);
      else{const box=document.createElement('textarea');box.value=text;box.setAttribute('readonly','');box.style.position='fixed';box.style.left='-9999px';document.body.appendChild(box);box.select();document.execCommand('copy');box.remove();}
      toast(label||'copied');
    }catch(e){console.warn('copy failed',e);toast('copy failed','err');}
  }

  async function loadProfilesForCabinet(){
    if(state.ocProfilesLoading||state.ocProfilesLoaded)return;
    if(typeof loadOcProfiles!=='function'){state.ocProfileLoadError=new Error('OC profile data functions are not loaded.');state.ocProfilesLoaded=true;return;}
    state.ocProfilesLoading=true;
    state.ocProfileLoadError=null;
    try{await loadOcProfiles();state.ocProfilesLoaded=true;}
    catch(e){console.warn('OC profile load failed',e);state.ocProfiles=[];state.ocProfileLoadError=e;state.ocProfilesLoaded=true;}
    finally{
      state.ocProfilesLoading=false;
      if(state.view==='ocCabinet'&&!state.editOcProfileId&&!$('cabinet-profile-form'))renderOcCabinet();
    }
  }

  function profileInitial(name){return clean(name).charAt(0).toUpperCase()||'✦';}
  function profileSummary(row){const bits=[row.role,row.species,row.status].map(clean).filter(Boolean);return bits.length?bits.join(' · '):'unsorted creature';}
  function linkedPersona(row){return row.post_style_id?'<span class="cabinet-style-link">post style: '+esc(personaName(row.post_style_id))+'</span>':'';}

  function renderProfileCard(row){
    const img=clean(row.image_url);
    const edit=isMine(row)?'<button type="button" class="ghost cabinet-profile-edit" data-cabinet-edit="'+esc(row.id)+'">edit</button>':'';
    const del=isMine(row)?'<button type="button" class="ghost danger cabinet-profile-delete" data-cabinet-delete="'+esc(row.id)+'">delete</button>':'';
    const tags=clean(row.tags);
    return '<article class="cabinet-profile-card">'+
      '<div class="cabinet-profile-art '+(img?'':'empty')+'" '+(img?'style="'+esc(imageStyle(img))+'"':'')+'>'+(img?'':'<span>'+esc(profileInitial(row.name))+'</span>')+'</div>'+
      '<div class="cabinet-profile-body"><div class="cabinet-profile-title"><div><h3>'+esc(row.name||'Unnamed OC')+'</h3><p class="muted">'+esc(profileSummary(row))+'</p></div></div>'+
      (row.blurb?'<p class="cabinet-profile-blurb">'+esc(row.blurb)+'</p>':'')+
      (tags?'<p class="cabinet-profile-tags">'+esc(tags)+'</p>':'')+linkedPersona(row)+
      '<div class="row mt">'+edit+copyButton('OC: '+clean(row.name)+'\n'+clean(row.blurb||row.notes),'copy note','cabinet-profile-copy')+del+'</div></div></article>';
  }

  function blankProfile(){return {name:'',aliases:'',pronouns:'',role:'',species:'',status:'',blurb:'',notes:'',image_url:'',post_style_id:'',tags:'',color_note:''};}
  function profileBeingEdited(){return state.editOcProfileId==='new'?blankProfile():profiles().find(p=>String(p.id)===String(state.editOcProfileId))||null;}
  function field(label,name,value,placeholder=''){return '<label>'+esc(label)+'<input name="'+esc(name)+'" value="'+esc(value||'')+'" placeholder="'+esc(placeholder)+'"></label>';}
  function area(label,name,value,placeholder=''){return '<label>'+esc(label)+'<textarea name="'+esc(name)+'" rows="4" placeholder="'+esc(placeholder)+'">'+esc(value||'')+'</textarea></label>';}
  function renderPostStyleSelect(value){return '<label>linked post style<select name="post_style_id"><option value="">none / not linked yet</option>'+((state.personas||[]).map(p=>'<option value="'+esc(p.id)+'" '+(String(value||'')===String(p.id)?'selected':'')+'>'+esc(p.name||'unnamed style')+'</option>').join(''))+'</select></label>';}

  function renderProfileForm(){
    const row=profileBeingEdited();
    if(!row)return '';
    return '<section class="cabinet-panel cabinet-profile-form-panel"><div class="cabinet-panel-head"><div><p class="kicker">'+(state.editOcProfileId==='new'?'new profile':'editing')+'</p><h2>'+esc(state.editOcProfileId==='new'?'Create an OC profile':row.name||'Edit OC profile')+'</h2></div><button type="button" class="ghost" id="cabinet-cancel-profile">close drawer</button></div><form id="cabinet-profile-form" class="cabinet-profile-form"><div class="cabinet-form-grid">'+
      field('name','name',row.name,'Lucian, Nemo, Sheba...')+field('aliases','aliases',row.aliases,'nicknames, titles, suspicious lies')+field('pronouns','pronouns',row.pronouns,'she/her, he/him, they/them...')+field('role','role',row.role,'protagonist, menace, corpse, etc.')+field('species / type','species',row.species,'human, fae, vampire, ???')+field('status','status',row.status,'alive, dead, complicated')+field('tags','tags',row.tags,'comma notes for filtering later')+field('color note','color_note',row.color_note,'bruise palette, gold rot, etc.')+field('reference image URL','image_url',row.image_url,'paste public URL or use utility drawer')+renderPostStyleSelect(row.post_style_id)+
      '</div>'+area('short blurb','blurb',row.blurb,'one or two lines for the cabinet card')+area('notes','notes',row.notes,'canon notes, outfit refs, bot hints, relationship breadcrumbs')+'<div class="row mt"><button type="submit">save profile</button><span id="cabinet-profile-status" class="cabinet-profile-status"></span></div></form></section>';
  }

  function renderSchemaHelp(){return '<div class="cabinet-schema-note"><h3>Profile table not installed yet</h3><p class="muted">The cabinet can render the drawer, but real OC profiles need the Supabase <code>oc_profiles</code> table first. I added the SQL notes in <code>docs/OC_CABINET_SCHEMA.md</code> so this can be installed cleanly instead of guessed later.</p></div>';}

  function renderProfileLibrary(){
    const count=profiles().length;
    const owned=profiles().filter(isMine).length;
    const error=state.ocProfileLoadError;
    let body='';
    if(state.ocProfilesLoading)body='<div class="cabinet-empty-shelf"><p class="muted">opening the drawers…</p></div>';
    else if(error)body=missingSchema(error)?renderSchemaHelp():'<div class="inline-error">Could not load OC profiles: '+esc(error.message||String(error))+'</div>';
    else if(!count)body='<div class="cabinet-empty-shelf"><p class="muted">No OC profiles yet. The cabinet is hungry. Feed it a creature.</p></div>';
    else body='<div class="cabinet-profile-grid">'+profiles().map(renderProfileCard).join('')+'</div>';
    return '<section class="cabinet-panel cabinet-profile-panel"><div class="cabinet-panel-head"><div><p class="kicker">profile drawer</p><h2>Character profiles</h2></div><div class="row"><span class="cabinet-count">'+count+' total · '+owned+' yours</span><button type="button" id="cabinet-new-profile">＋ new OC</button></div></div><p class="muted">The cabinet is for actual character records: canon notes, reference art, aliases, relationship crumbs, bot-ready refs, and optional links to existing post styles. Post styles stay in the Personas tab; profiles only point at them when useful.</p>'+body+'</section>'+renderProfileForm();
  }

  function renderCabinetMap(){return '<section class="cabinet-panel cabinet-blueprint-panel"><div class="cabinet-panel-head"><div><p class="kicker">cabinet map</p><h2>What belongs here</h2></div><span class="cabinet-count">foundation</span></div><div class="cabinet-blueprint-grid"><div><h3>Profile card</h3><p>Name, aliases, pronouns, role, species/type, status, short blurb, long notes.</p></div><div><h3>Reference shelf</h3><p>OC images, face refs, outfit refs, symbols, props, and bot-ready URLs.</p></div><div><h3>Canon links</h3><p>Related post styles, Chronicle events, threads, arcs, relationships, locations.</p></div></div></section>';}

  function setUploadStatus(msg,kind=''){const el=$('cabinet-upload-status');if(!el)return;el.textContent=msg||'';el.className='cabinet-upload-status '+(kind||'');}
  function setProfileStatus(msg,kind=''){const el=$('cabinet-profile-status');if(!el)return;el.textContent=msg||'';el.className='cabinet-profile-status '+(kind||'');}

  async function prepareCabinetProp(file){
    if(typeof enforceImageUploadLimits==='function')enforceImageUploadLimits(file);
    else if(!file||!file.type||!file.type.startsWith('image/'))throw new Error('Please choose an image file.');
    if(file.type==='image/gif')return {blob:file,ext:'gif',contentType:'image/gif'};
    if(typeof loadImageFromFile!=='function'||typeof compressCanvas!=='function')throw new Error('Image preparation is not available yet. Refresh and try again.');
    const img=await loadImageFromFile(file);
    const scale=Math.min(1,1600/img.naturalWidth,1600/img.naturalHeight);
    const w=Math.max(1,Math.round(img.naturalWidth*scale));
    const h=Math.max(1,Math.round(img.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,w,h);
    const prepared=await compressCanvas(canvas);
    const max=typeof GAYA_MAX_PREPARED_IMAGE_BYTES!=='undefined'?GAYA_MAX_PREPARED_IMAGE_BYTES:8*1024*1024;
    if(!prepared?.blob)throw new Error('Could not compress image.');
    if(prepared.blob.size>max){const label=typeof fileSizeLabel==='function'?fileSizeLabel(max):Math.round(max/1024/1024)+' MB';throw new Error('The resized image is still too large. Keep prepared uploads under '+label+'.');}
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
    const {error}=await withTimeout(supa.storage.from(bucketName()).upload(path,prepared.blob,{cacheControl:'31536000',contentType:prepared.contentType,upsert:false}),'OC prop upload',45000);
    if(error)throw error;
    const {data}=supa.storage.from(bucketName()).getPublicUrl(path);
    if(!data?.publicUrl)throw new Error('Upload succeeded, but no public URL came back.');
    const item={url:data.publicUrl,name:file.name||'prop image',size,created_at:new Date().toISOString()};
    state.ocCabinetUploads=[item,...(state.ocCabinetUploads||[])].slice(0,36);
    saveUploads();
    return item;
  }

  function renderUploadShelf(){
    const uploads=state.ocCabinetUploads||[];
    if(!uploads.length)return '<div class="cabinet-empty-shelf"><p class="muted">No recent utility uploads in this browser yet.</p></div>';
    return '<div class="cabinet-prop-grid">'+uploads.map(item=>{const when=item.created_at?dateLabel(item.created_at):'recently';return '<article class="cabinet-prop"><div class="cabinet-prop-img" style="'+esc(imageStyle(item.url))+'"></div><div class="cabinet-prop-body"><h3>'+esc(item.name||'prop image')+'</h3><p class="muted">'+esc(item.size||'uploaded')+' · '+esc(when)+'</p><input readonly value="'+esc(item.url)+'" aria-label="prop URL"><div class="row mt">'+copyButton(item.url,'copy URL')+copyButton('[img]'+item.url+'[/img]','copy post tag')+'</div></div></article>';}).join('')+'</div>';
  }

  function renderUtilityDrawer(){return '<section class="cabinet-panel cabinet-props-panel cabinet-utility-panel"><div class="cabinet-panel-head"><div><p class="kicker">utility drawer</p><h2>Quick reusable URL</h2></div><button type="button" id="cabinet-pick-prop">＋ upload prop</button></div><p class="muted">Small helper: upload an image to Supabase Storage, then copy the public URL for posts, future OC profiles, or the Discord bot.</p><input id="cabinet-prop-file" class="cabinet-hidden-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/*"><div id="cabinet-upload-status" class="cabinet-upload-status"></div><div id="cabinet-upload-shelf" class="cabinet-upload-shelf">'+renderUploadShelf()+'</div></section>';}

  function readProfileForm(form){const fd=new FormData(form);return {name:clean(fd.get('name')),aliases:clean(fd.get('aliases'))||null,pronouns:clean(fd.get('pronouns'))||null,role:clean(fd.get('role'))||null,species:clean(fd.get('species'))||null,status:clean(fd.get('status'))||null,blurb:clean(fd.get('blurb'))||null,notes:clean(fd.get('notes'))||null,image_url:clean(fd.get('image_url'))||null,post_style_id:clean(fd.get('post_style_id'))||null,tags:clean(fd.get('tags'))||null,color_note:clean(fd.get('color_note'))||null};}

  function renderOcCabinet(){
    const main=$('main');
    if(!main)return;
    loadSavedUploads();
    main.innerHTML='<div class="header cabinet-header"><div><p class="kicker">OC archive</p><h1>OC Cabinet</h1></div></div>'+renderProfileLibrary()+renderCabinetMap()+renderUtilityDrawer();
    bindCabinetActions();
    loadProfilesForCabinet();
  }

  function bindProfileActions(){
    const newBtn=$('cabinet-new-profile');
    if(newBtn)newBtn.onclick=()=>{state.editOcProfileId='new';renderOcCabinet();$('cabinet-profile-form')?.scrollIntoView({behavior:'smooth',block:'start'});};
    const cancel=$('cabinet-cancel-profile');
    if(cancel)cancel.onclick=()=>{state.editOcProfileId=null;renderOcCabinet();};
    document.querySelectorAll('[data-cabinet-edit]').forEach(btn=>{btn.onclick=()=>{state.editOcProfileId=btn.dataset.cabinetEdit;renderOcCabinet();$('cabinet-profile-form')?.scrollIntoView({behavior:'smooth',block:'start'});};});
    document.querySelectorAll('[data-cabinet-delete]').forEach(btn=>{btn.onclick=()=>safe(async()=>{const row=profiles().find(p=>String(p.id)===String(btn.dataset.cabinetDelete));if(!row||!confirm('Delete '+(row.name||'this OC')+' from the cabinet?'))return;await deleteOcProfile(row.id);state.editOcProfileId=null;state.ocProfilesLoaded=false;await loadOcProfiles();state.ocProfilesLoaded=true;toast('profile deleted');renderOcCabinet();},'delete OC profile');});
    const form=$('cabinet-profile-form');
    if(form)form.onsubmit=e=>safe(async()=>{e.preventDefault();const payload=readProfileForm(form);if(!payload.name){setProfileStatus('name is required','err');return;}try{setProfileStatus('saving…');const id=state.editOcProfileId&&state.editOcProfileId!=='new'?state.editOcProfileId:null;await saveOcProfile(payload,id);state.editOcProfileId=null;state.ocProfilesLoaded=false;await loadOcProfiles();state.ocProfilesLoaded=true;state.ocProfileLoadError=null;toast('OC profile saved');renderOcCabinet();}catch(e2){console.warn('OC profile save failed',e2);state.ocProfileLoadError=e2;setProfileStatus('save failed: '+(e2.message||String(e2)),'err');toast('OC profile save failed','err');}},'save OC profile');
  }

  function bindCabinetActions(){
    bindProfileActions();
    const picker=$('cabinet-pick-prop');
    const input=$('cabinet-prop-file');
    if(picker&&input){picker.onclick=()=>input.click();input.onchange=async()=>{const file=input.files&&input.files[0];if(!file)return;try{picker.disabled=true;await uploadCabinetProp(file);setUploadStatus('uploaded + shelved ✓','ok');const shelf=$('cabinet-upload-shelf');if(shelf)shelf.innerHTML=renderUploadShelf();bindCabinetActions();toast('prop URL ready');}catch(e){console.error('OC prop upload failed',e);setUploadStatus('upload failed: '+(e.message||String(e)),'err');toast('prop upload failed','err');}finally{picker.disabled=false;input.value='';}};}
    document.querySelectorAll('[data-cabinet-copy]').forEach(btn=>{if(btn.dataset.copyReady==='1')return;btn.dataset.copyReady='1';btn.onclick=()=>copyText(btn.dataset.cabinetCopy,btn.dataset.cabinetLabel||'copied');});
  }

  window.renderOcCabinet=renderOcCabinet;
})();
