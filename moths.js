// Decorative moth placement for the GAYA side shelves.
// Runs after the app shell renders and reinstalls itself if the shell is redrawn.
(function(){
  const MARK='__gayaShelfMothsInstalled';
  const MOTHS=[
    // Left shelf art is right-weighted in its fixed layer, so these lean toward the layer's right side.
    {side:'left', species:'luna',  behavior:'tremor',   strip:true,  top:'12%', left:'58%', size:40, rotate:'-12deg', scale:1, delay:'-11s'},
    {side:'left', species:'ghost', behavior:'crawler',  strip:false, top:'31%', left:'69%', size:31, rotate:'18deg',  scale:.96, delay:'-28s'},
    {side:'left', species:'tiger', behavior:'consider', strip:false, top:'54%', left:'53%', size:37, rotate:'-8deg',  scale:1, delay:'-19s'},
    {side:'left', species:'ghost', behavior:'tremor',   strip:true,  top:'75%', left:'72%', size:28, rotate:'10deg',  scale:.94, delay:'-7s'},

    // Right shelf art is left-weighted in its fixed layer; keep them out of the drywall.
    {side:'right',species:'ghost', behavior:'consider', strip:false, top:'15%', left:'24%', size:34, rotate:'11deg',  scale:.98, delay:'-17s'},
    {side:'right',species:'tiger', behavior:'tremor',   strip:true,  top:'39%', left:'28%', size:42, rotate:'-14deg', scale:1, delay:'-4s'},
    {side:'right',species:'luna',  behavior:'crawler',  strip:false, top:'62%', left:'14%', size:32, rotate:'21deg',  scale:.96, delay:'-34s'},
    {side:'right',species:'luna',  behavior:'tremor',   strip:true,  top:'81%', left:'31%', size:30, rotate:'-6deg',  scale:.94, delay:'-21s'}
  ];

  function mothNode(moth,index){
    const el=document.createElement('div');
    el.className=[
      'shelf-moth',
      'moth-'+moth.species,
      'moth-'+moth.behavior,
      moth.strip?'moth-strip moth-wingbeat':'',
      'moth-'+moth.side+'-'+index
    ].filter(Boolean).join(' ');
    el.style.top=moth.top;
    el.style.left=moth.left;
    el.style.width=moth.size+'px';
    el.style.height=moth.size+'px';
    el.style.setProperty('--moth-r',moth.rotate||'0deg');
    el.style.setProperty('--moth-scale',String(moth.scale||1));
    el.style.setProperty('--moth-delay',moth.delay||'0s');
    el.style.setProperty('--moth-wing-delay',moth.delay||'0s');
    return el;
  }

  function makeLayer(side){
    const layer=document.createElement('aside');
    layer.className='shelf-moth-layer shelf-'+side;
    layer.setAttribute('aria-hidden','true');
    MOTHS.filter(m=>m.side===side).forEach((m,i)=>layer.appendChild(mothNode(m,i)));
    return layer;
  }

  function installMoths(){
    const shell=document.querySelector('#app > .app');
    if(!shell)return false;
    if(shell.querySelector('.shelf-moth-layer'))return true;
    shell.insertBefore(makeLayer('left'),shell.firstChild);
    shell.insertBefore(makeLayer('right'),shell.firstChild);
    return true;
  }

  function watch(){
    if(window[MARK])return;
    window[MARK]=true;
    installMoths();
    const target=document.getElementById('app');
    if(!target)return;
    const observer=new MutationObserver(()=>installMoths());
    observer.observe(target,{childList:true,subtree:false});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);
  else watch();
})();
