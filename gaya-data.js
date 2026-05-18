/* 
  GAYA Data Layer
  Owns Supabase table/auth operations. UI modules call these functions but should
  not know table details.
*/

function currentUserId(){
  return state && state.user && state.user.id ? state.user.id : null;
}

async function checkSession(){
  const {data,error}=await supa.auth.getSession();
  if(error)throw error;
  state.session=data.session;
  state.user=data.session&&data.session.user?data.session.user:null;
}

async function loadThreads(){
  const {data,error}=await supa.from('threads').select('*').order('updated_at',{ascending:false});
  if(error)throw error;
  state.threads=data||[];
}

async function loadPersonas(){
  const {data,error}=await supa.from('personas').select('*').order('created_at',{ascending:true});
  if(error)throw error;
  state.personas=data||[];
  state.mine=state.personas.filter(p=>p.user_id===state.user?.id);
}

async function loadPosts(id){
  const {data,error}=await supa.from('posts')
    .select('*, persona:personas(*)')
    .eq('thread_id',id)
    .order('created_at',{ascending:true});

  if(error)throw error;
  state.posts=data||[];
}

async function loadAll(){
  await Promise.all([loadThreads(),loadPersonas()]);
}

async function magicLink(email){
  const redirectTo=window.location.origin+window.location.pathname;
  return await supa.auth.signInWithOtp({
    email,
    options:{emailRedirectTo:redirectTo,shouldCreateUser:false}
  });
}

async function signOut(){
  await supa.auth.signOut();
  Object.assign(state,{session:null,user:null,threads:[],posts:[],personas:[],mine:[],view:'threads',threadId:null});
  render();
}

async function createThread(title,summary){
  const uid=currentUserId();
  if(!uid)throw new Error('No signed-in user for thread creation.');

  const {data,error}=await supa.from('threads')
    .insert({title,summary:summary||null,created_by:uid})
    .select('*')
    .single();

  if(error)throw error;
  await loadThreads();
  return data;
}

async function createPost(body){
  const personaId=state.selectedPersonaId||state.mine[0]?.id;
  const uid=currentUserId();

  if(!personaId)throw new Error('No persona is visible for this account yet. Create one on the personas page first.');
  if(!state.threadId)throw new Error('No active thread selected.');
  if(!uid)throw new Error('No signed-in user for post.');

  const insert=await withTimeout(
    supa.from('posts').insert({
      thread_id:state.threadId,
      persona_id:personaId,
      author_id:uid,
      body
    }),
    'post insert',
    30000
  );

  if(insert.error)throw insert.error;

  const bump=await withTimeout(
    supa.from('threads').update({updated_at:new Date().toISOString()}).eq('id',state.threadId),
    'thread activity update',
    12000
  ).catch(e=>({error:e}));

  if(bump.error)console.warn('thread activity update failed',bump.error);

  await withTimeout(loadPosts(state.threadId),'reload posts',30000);
  await withTimeout(loadThreads(),'reload threads',30000).catch(e=>console.warn('thread reload failed',e));

  return true;
}

async function savePersona(payload,id){
  const uid=currentUserId();
  if(!uid)throw new Error('No signed-in user for persona save.');

  const saveWait=(promise,label)=>withTimeout(promise,label,30000);
  const clean={...payload,updated_at:new Date().toISOString()};

  if(id){
    const {data,error}=await saveWait(
      supa.from('personas')
        .update(clean)
        .eq('id',id)
        .eq('user_id',uid)
        .select('id')
        .maybeSingle(),
      'persona update'
    );

    if(error)throw error;
    if(!data)throw new Error('Persona not found, or this account does not own it.');

    await saveWait(loadPersonas(),'reload personas');
    return personaById(id)||{id:data?.id||id,...clean,user_id:uid};
  }

  clean.user_id=uid;

  const {data,error}=await saveWait(
    supa.from('personas')
      .insert(clean)
      .select('id')
      .single(),
    'persona insert'
  );

  if(error)throw error;

  await saveWait(loadPersonas(),'reload personas');
  return personaById(data?.id)||{id:data?.id,...clean,user_id:uid};
}

async function deletePersona(id){
  const uid=currentUserId();
  if(!uid)throw new Error('No signed-in user for persona delete.');

  const {data,error}=await supa.from('personas')
    .delete()
    .eq('id',id)
    .eq('user_id',uid)
    .select('id')
    .maybeSingle();

  if(error)throw error;
  if(!data)throw new Error('Persona not found, or this account does not own it.');

  await loadPersonas();
}
