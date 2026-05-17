/*
  GAYA Post Formatting
  Adds small forum-style formatting controls to reply/edit textareas.
  Keeps storage as plain text and teaches the renderer a tiny safe BBCode subset.
*/
(function(){
  const MARK='__gayaPostFormattingInstalled';
  if(window[MARK])return;
  window[MARK]=true;

  const COLOR_SWATCHES=[
    '#7f5f3f',
    '#9b6f93',
    '#b36363',
    '#6f854d',
    '#4f7f89',
    '#665a8f',
    '#8a6a3e',
    '#2f2a24'
  ];

  function safeColor(value){
    const v=String(value||'').trim();
    if(/^#[0-9a-f]{3}$/i.test(v))return v;
    if(/^#[0-9a-f]{6}$/i.test(v))return v;
    return '';
  }

  function enhanceRenderedHtml(html){
    return String(html||'')
      .replace(/\[b\]([\s\S]*?)\[\/b\]/gi,'<strong>$1</strong>')
      .replace(/\[i\]([\s\S]*?)\[\/i\]/gi,'<em>$1</em>')
      .replace(/\[u\]([\s\S]*?)\[\/u\]/gi,'<span class="fmt-underline">$1</span>')
      .replace(/\[s\]([\s\S]*?)\[\/s\]/gi,'<span class="fmt-strike">$1</span>')
      .replace(/\[color=(#[0-9a-f]{3}|#[0-9a-f]{6})\]([\s\S]*?)\[\/color\]/gi,(match,color,body)=>{
        const c=safeColor(color);
        return c?'<span class="fmt-color" style="color:'+c+'">'+body+'</span>':body;
      });
  }

  if(typeof md==='function'){
    const originalMd=md;
    md=function(value){
      return enhanceRenderedHtml(originalMd(value));
    };
  }

  function fireInput(textarea){
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
  }

  function insertAround(textarea,before,after,placeholder){
    const start=textarea.selectionStart||0;
    const end=textarea.selectionEnd||0;
    const value=textarea.value||'';
    const selected=value.slice(start,end)||placeholder;
    const inserted=before+selected+after;
    textarea.value=value.slice(0,start)+inserted+value.slice(end);
    textarea.focus();
    const innerStart=start+before.length;
    const innerEnd=innerStart+selected.length;
    textarea.setSelectionRange(innerStart,innerEnd);
    fireInput(textarea);
  }

  function quoteSelection(textarea){
    const start=textarea.selectionStart||0;
    const end=textarea.selectionEnd||0;
    const value=textarea.value||'';
    const selected=value.slice(start,end)||'quoted text';
    const quoted=selected.split('\n').map(line=>line.trim()?'> '+line:'>').join('\n');
    textarea.value=value.slice(0,start)+quoted+value.slice(end);
    textarea.focus();
    textarea.setSelectionRange(start,start+quoted.length);
    fireInput(textarea);
  }

  function makeButton(label,title,onClick){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='fmt-btn';
    btn.textContent=label;
    btn.title=title||label;
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      onClick();
    };
    return btn;
  }

  function makeSwatch(color,textarea,colorInput){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='fmt-swatch';
    btn.title='color '+color;
    btn.style.setProperty('--swatch',color);
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      colorInput.value=color;
      insertAround(textarea,'[color='+color+']','[/color]','colored text');
    };
    return btn;
  }

  function installToolbar(textarea){
    if(!textarea||textarea.dataset.gayaFormatting==='1')return;
    textarea.dataset.gayaFormatting='1';

    const bar=document.createElement('div');
    bar.className='post-format-toolbar';
    bar.setAttribute('aria-label','Post formatting tools');

    const colorInput=document.createElement('input');
    colorInput.type='color';
    colorInput.className='fmt-color-picker';
    colorInput.value='#b36363';
    colorInput.title='Choose text color';

    bar.appendChild(makeButton('B','bold',()=>insertAround(textarea,'**','**','bold text')));
    bar.appendChild(makeButton('I','italic',()=>insertAround(textarea,'*','*','italic text')));
    bar.appendChild(makeButton('U','underline',()=>insertAround(textarea,'[u]','[/u]','underlined text')));
    bar.appendChild(makeButton('quote','quote selected lines',()=>quoteSelection(textarea)));

    const colorWrap=document.createElement('span');
    colorWrap.className='fmt-color-group';
    colorWrap.appendChild(colorInput);
    colorWrap.appendChild(makeButton('color','apply selected color',()=>{
      const color=safeColor(colorInput.value)||'#b36363';
      insertAround(textarea,'[color='+color+']','[/color]','colored text');
    }));
    COLOR_SWATCHES.forEach(color=>colorWrap.appendChild(makeSwatch(color,textarea,colorInput)));
    bar.appendChild(colorWrap);

    const hint=document.createElement('span');
    hint.className='fmt-hint';
    hint.textContent='select text, then click';
    bar.appendChild(hint);

    textarea.parentNode.insertBefore(bar,textarea);
  }

  function enhanceAllFormattingTargets(){
  installToolbar(document.getElementById('body'));
  installToolbar(document.getElementById('edit-post-body'));
  installToolbar(document.getElementById('pe-signature'));
}
  }

  if(typeof renderComposer==='function'){
    const originalRenderComposer=renderComposer;
    renderComposer=function(){
      originalRenderComposer();
      enhanceAllFormattingTargets();
    };
  }

  const observer=new MutationObserver(()=>enhanceAllFormattingTargets());
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',enhanceAllFormattingTargets);
  }else{
    enhanceAllFormattingTargets();
  }
})();
