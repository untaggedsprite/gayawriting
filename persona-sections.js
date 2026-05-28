/*
  GAYA Persona Section Drawers
  Turns the long persona editor into labeled, collapsible drawers without
  changing any of the underlying form controls.
*/
(function(){
  const MARK='__gayaPersonaSectionsInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  const hiddenSections=new Set(['preset']);

  function sectionTitleText(title){
    const span=title.querySelector('span');
    return (span?.textContent||title.textContent||'section').trim().toLowerCase();
  }

  function sectionNoteText(title){
    const small=title.querySelector('small');
    return (small?.textContent||'').trim();
  }

  function makeSummary(title){
    const name=sectionTitleText(title);
    const note=sectionNoteText(title);
    return '<summary><span>'+esc(name)+'</span>'+(note?'<small>'+esc(note)+'</small>':'')+'</summary>';
  }

  function moveIntoSection(title){
    const name=sectionTitleText(title);
    const slug=name.replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'section';
    const drawer=document.createElement('details');
    drawer.className='field full persona-section-drawer persona-section-'+slug;
    drawer.open=true;
    drawer.innerHTML=makeSummary(title)+'<div class="persona-section-body"></div>';

    const body=drawer.querySelector('.persona-section-body');
    let next=title.nextElementSibling;
    while(next&&!next.classList.contains('persona-section-title')){
      const current=next;
      next=next.nextElementSibling;
      body.appendChild(current);
    }

    title.replaceWith(drawer);
    if(hiddenSections.has(name))drawer.remove();
  }

  function enhancePersonaSections(){
    const grid=document.querySelector('.persona-studio .editor-grid');
    if(!grid||grid.dataset.sectionDrawersReady)return;
    const titles=[...grid.querySelectorAll(':scope > .persona-section-title')];
    if(!titles.length)return;

    titles.forEach(moveIntoSection);
    grid.dataset.sectionDrawersReady='1';
  }

  if(typeof renderPersonaEditor==='function'){
    const previousRenderPersonaEditor=renderPersonaEditor;
    renderPersonaEditor=function(){
      previousRenderPersonaEditor();
      enhancePersonaSections();
    };
  }

  window.enhancePersonaSections=enhancePersonaSections;
  setTimeout(enhancePersonaSections,0);
})();