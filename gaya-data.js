/* 
  GAYA Data Layer
  Owns Supabase table/auth operations. UI modules call these functions but should
  not know table details.
*/

function currentUserId(){
  return state && state.user && state.user.id ? state.user.id : null;
}

function dataWait(promise,label,ms=15000){
  return withTimeout(promise,label,ms);
}

async function checkSession(){
  const {data,error}=await dataWait(supa.auth.getSession(),'session check',12000);
  if(error)throw error;
  state.session=data.session;
  state.user=data.session&&data.session.user?data.session.user:null;
}

async function loadThreads(){
  const {data,error}=await dataWait(
    supa.from('threads').select('*').order('updated_at',{ascending:false}),
    'thread list load',
    15000
  );
  if(error)throw error;
  state.threads=data||[];
}

async function loadPersonas(){
  const {data,error}=await dataWait(
    supa.from('personas').select('*').order('created_at',{ascending:true}),
    'persona list load',
    15000
  );
  if(error)throw error;
  state.personas=data||[];
  state.mine=state.personas.filter(p=>p.user_id===state.user?.id);
}

async function loadPosts(id){
  const {data,error}=await dataWait(
    supa.from('posts')
      .select('*, persona:personas(*)')
      .eq('thread_id',id)
      .order('created_at',{ascending:true}),
    'post list load',
    20000
  );

  if(error)throw error;
  state.posts=data||[];
}

async function loadAll(){
  await dataWait(Promise.all([loadThreads(),loadPersonas()]),'site data load',22000);
}

async function magicLink(email){
  const redirectTo=window.location.origin+window.location.pathname;
  return await dataWait(
    supa.auth.signInWithOtp({
      email,
      options:{emailRedirectTo:redirectTo,shouldCreateUser:false}
    }),
    'magic link send',
    15000
  );
}

async function signOut(){
  await dataWait(supa.auth.signOut(),'sign out',12000);
  Object.assign(state,{session:null,user:null,threads:[],posts:[],personas:[],mine:[],view:'threads',threadId:null});
  render();
}

async function createThread(title,summary){
  const uid=currentUserId();
  if(!uid)throw new Error('No signed-in user for thread creation.');

  const {data,error}=await dataWait(
    supa.from('threads')
      .insert({title,summary:summary||null,created_by:uid})
      .select('*')
      .single(),
    'thread create',
    20000
  );

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

  const insert=await dataWait(
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

  const bump=await dataWait(
    supa.from('threads').update({updated_at:new Date().toISOString()}).eq('id',state.threadId),
    'thread activity update',
    12000
  ).catch(e=>({error:e}));

  if(bump.error)console.warn('thread activity update failed',bump.error);

  await dataWait(loadPosts(state.threadId),'reload posts',30000);
  await dataWait(loadThreads(),'reload threads',30000).catch(e=>console.warn('thread reload failed',e));

  return true;
}

async function savePersona(payload,id){
  const uid=currentUserId();
  if(!uid)throw new Error('No signed-in user for persona save.');

  const saveWait=(promise,label)=>dataWait(promise,label,30000);
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

  const {data,error}=await dataWait(
    supa.from('personas')
      .delete()
      .eq('id',id)
      .eq('user_id',uid)
      .select('id')
      .maybeSingle(),
    'persona delete',
    20000
  );

  if(error)throw error;
  if(!data)throw new Error('Persona not found, or this account does not own it.');

  await loadPersonas();
}
