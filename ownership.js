(function(){
  function currentUserId(){
    return state&&state.user&&state.user.id?state.user.id:null;
  }

  if(typeof deletePersona==='function'){
    deletePersona=async function(id){
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
    };
  }
})();
