/*
  GAYA Image Uploads
  Adds easy avatar/banner uploads to the persona editor.
  Files go to the public Supabase Storage bucket: gaya-images.
*/

const GAYA_IMAGE_BUCKET='gaya-images';
const GAYA_MAX_GIF_BYTES=10*1024*1024;
const GAYA_MAX_SOURCE_IMAGE_BYTES=24*1024*1024;
const GAYA_MAX_PREPARED_IMAGE_BYTES=8*1024*1024;

function imageUploadMessage(el,msg,kind=''){
  if(!el)return;
  el.textContent=msg||'';
  el.className='image-upload-status '+(kind||'');
}

function imageUploadLabel(kind){
  if(kind==='bottom-banner')return 'bottom banner';
  return String(kind||'image').replace(/-/g,' ');
}

function imageUploadPrepareKind(kind){
  return kind&&String(kind).includes('banner')?'banner':kind;
}

function fileSizeLabel(bytes){
  const n=Number(bytes)||0;
  if(n<1024)return n+' B';
  if(n<1024*1024)return (n/1024).toFixed(n<10*1024?1:0)+' KB';
  return (n/(1024*1024)).toFixed(n<10*1024*1024?1:0)+' MB';
}

function enforceImageUploadLimits(file){
  if(!file||!file.type||!file.type.startsWith('image/'))throw new Error('Please choose an image file.');

  if(file.type==='image/gif'&&file.size>GAYA_MAX_GIF_BYTES){
    throw new Error('Animated GIFs stay animated, but they need to be under '+fileSizeLabel(GAYA_MAX_GIF_BYTES)+'. This one is '+fileSizeLabel(file.size)+'.');
  }

  if(file.size>GAYA_MAX_SOURCE_IMAGE_BYTES){
    throw new Error('That image is '+fileSizeLabel(file.size)+'. Please keep uploads under '+fileSizeLabel(GAYA_MAX_SOURCE_IMAGE_BYTES)+'.');
  }
}

function safeImageFileName(name){
  const base=String(name||'image')
    .toLowerCase()
    .replace(/\.[^.]+$/,'')
    .replace(/[^a-z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,48)||'image';
  return base;
}

function blobFromCanvas(canvas,type,quality){
  return new Promise(resolve=>{
    canvas.toBlob(blob=>resolve(blob),type,quality);
  });
}

function loadImageFromFile(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror=()=>{
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file.'));
    };
    img.src=url;
  });
}

async function compressCanvas(canvas){
  const webpQualities=[0.86,0.76,0.66,0.56];
  for(const quality of webpQualities){
    const blob=await blobFromCanvas(canvas,'image/webp',quality);
    if(blob&&blob.size<=GAYA_MAX_PREPARED_IMAGE_BYTES)return {blob,ext:'webp',contentType:'image/webp'};
    if(blob&&quality===webpQualities[webpQualities.length-1])return {blob,ext:'webp',contentType:'image/webp'};
  }

  const jpgQualities=[0.88,0.78,0.68];
  for(const quality of jpgQualities){
    const blob=await blobFromCanvas(canvas,'image/jpeg',quality);
    if(blob&&blob.size<=GAYA_MAX_PREPARED_IMAGE_BYTES)return {blob,ext:'jpg',contentType:'image/jpeg'};
    if(blob&&quality===jpgQualities[jpgQualities.length-1])return {blob,ext:'jpg',contentType:'image/jpeg'};
  }

  throw new Error('Could not compress image.');
}

async function preparePersonaImage(file,kind){
  enforceImageUploadLimits(file);

  // Keep animated GIFs intact. Canvas would flatten them into one sad little frame.
  if(file.type==='image/gif'){
    return {blob:file,ext:'gif',contentType:'image/gif'};
  }

  const img=await loadImageFromFile(file);
  const limits=imageUploadPrepareKind(kind)==='banner'?{w:1600,h:620}:{w:512,h:512};
  const scale=Math.min(1,limits.w/img.naturalWidth,limits.h/img.naturalHeight);
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
  if(!prepared.blob)throw new Error('Could not compress image.');

  if(prepared.blob.size>GAYA_MAX_PREPARED_IMAGE_BYTES){
    throw new Error('The resized image is still '+fileSizeLabel(prepared.blob.size)+'. Try a smaller or less detailed image.');
  }

  return prepared;
}

async function uploadPersonaImage(kind,file,input,status,button){
  if(!state.user?.id)throw new Error('You must be signed in to upload images.');
  if(!supa?.storage)throw new Error('Supabase Storage is not available.');

  const label=imageUploadLabel(kind);
  button.disabled=true;
  imageUploadMessage(status,'preparing image…');

  const prepared=await preparePersonaImage(file,kind);
  const stamp=new Date().toISOString().replace(/[^0-9]/g,'').slice(0,14);
  const path=state.user.id+'/'+kind+'-'+stamp+'-'+safeImageFileName(file.name)+'.'+prepared.ext;

  imageUploadMessage(status,'uploading '+fileSizeLabel(prepared.blob.size)+'…');

  const {error}=await withTimeout(
    supa.storage.from(GAYA_IMAGE_BUCKET).upload(path,prepared.blob,{
      cacheControl:'31536000',
      contentType:prepared.contentType,
      upsert:false
    }),
    label+' image upload',
    45000
  );

  if(error)throw error;

  const {data}=supa.storage.from(GAYA_IMAGE_BUCKET).getPublicUrl(path);
  if(!data?.publicUrl)throw new Error('Upload succeeded, but no public URL came back.');

  input.value=data.publicUrl;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  updatePersonaPreview();
  imageUploadMessage(status,'uploaded ✓','ok');
  toast(label+' uploaded');
}

function installPersonaImageUploader(kind,inputId){
  const input=$(inputId);
  if(!input||input.dataset.uploadReady)return;
  input.dataset.uploadReady='1';
  const label=imageUploadLabel(kind);

  const controls=document.createElement('div');
  controls.className='image-upload-controls';
  controls.innerHTML='<input class="image-upload-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/*"><button type="button" class="ghost image-upload-pick">upload '+label+'</button><button type="button" class="ghost image-upload-clear">clear</button><span class="image-upload-status"></span>';

  input.insertAdjacentElement('afterend',controls);

  const fileInput=controls.querySelector('.image-upload-file');
  const pick=controls.querySelector('.image-upload-pick');
  const clear=controls.querySelector('.image-upload-clear');
  const status=controls.querySelector('.image-upload-status');

  pick.title='PNG/JPG/WebP are resized automatically. GIFs stay animated under '+fileSizeLabel(GAYA_MAX_GIF_BYTES)+'.';
  pick.onclick=()=>fileInput.click();
  clear.onclick=()=>{
    input.value='';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    imageUploadMessage(status,'cleared');
    updatePersonaPreview();
  };

  fileInput.onchange=()=>safe(async()=>{
    const file=fileInput.files&&fileInput.files[0];
    if(!file)return;
    try{
      await uploadPersonaImage(kind,file,input,status,pick);
    }catch(e){
      console.error(label+' upload failed',e);
      imageUploadMessage(status,'upload failed: '+(e.message||String(e)),'err');
      toast(label+' upload failed','err');
    }finally{
      pick.disabled=false;
      fileInput.value='';
    }
  },label+' image upload');
}

function enhancePersonaImageUploads(){
  installPersonaImageUploader('avatar','pe-avatar');
  installPersonaImageUploader('banner','pe-banner');
  installPersonaImageUploader('bottom-banner','pe-bottom-banner');
}

const gayaRenderPersonaEditorWithUploads=renderPersonaEditor;
renderPersonaEditor=function(){
  gayaRenderPersonaEditorWithUploads();
  enhancePersonaImageUploads();
};

setTimeout(enhancePersonaImageUploads,0);
