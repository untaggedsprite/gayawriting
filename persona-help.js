/* Small field guide for the persona editor. */
(function(){
  function addPersonaHelp(){
    const studio=document.querySelector('.persona-studio .editor-grid');
    if(!studio||document.querySelector('.persona-help'))return;

    const nameField=studio.querySelector('.field.full');
    const help=document.createElement('div');
    help.className='field full persona-help';
    help.innerHTML='<details open><summary>quick post-style guide</summary><div class="persona-help-grid"><p><strong>Start simple.</strong> Pick a vibe, then adjust colors, font, pictures, and signature. Presets do not erase the name, avatar, banner, or signature.</p><p><strong>Images.</strong> Upload or paste a URL. PNG, JPG, and WebP resize automatically. GIFs stay animated if they are under 10MB.</p><p><strong>Old-forum layout.</strong> Standard is the plain post card. Gaia style turns on portrait and banner choices. No portrait and no banner are safe buttons.</p><p><strong>Advanced CSS.</strong> Optional goblin drawer. CSS only affects this persona’s posts. Use <code>&amp;</code> for the whole post card. Layout controls are saved separately, so you will not delete them by editing CSS.</p><p><strong>Important.</strong> Save persona when the preview looks right. This site is made for desktop/laptop writing; phone viewing is a legally dubious activity.</p></div></details>';

    if(nameField&&nameField.parentNode)nameField.insertAdjacentElement('afterend',help);
    else studio.insertAdjacentElement('afterbegin',help);
  }

  const previousRenderPersonaEditor=renderPersonaEditor;
  renderPersonaEditor=function(){
    previousRenderPersonaEditor();
    addPersonaHelp();
  };

  setTimeout(addPersonaHelp,0);
})();
