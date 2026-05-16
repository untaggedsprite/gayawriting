// Decorative moth placement for the GAYA side shelves.
// Runs after the app shell renders and reinstalls itself if the shell is redrawn.
(function(){
  const MARK='__gayaShelfMothsInstalled';
  const MOTHS=[
    {side:'left', species:'luna',  behavior:'tremor',   strip:true,  top:'13%', left:'54%', size:28},
    {side:'left', species:'ghost', behavior:'crawler',  strip:false, top:'36%', left:'30%', size:21},
    {side:'left', species:'tiger', behavior:'consider', strip:false, top:'58%', left:'64%', size:24},
    {side:'left', species:'ghost', behavior:'tremor',   strip:true,  top:'77%', left:'42%', size:18},
    {side:'right',species:'ghost', behavior:'consider', strip:false, top:'18%', left:'33%', size:24},
    {side:'right',species:'tiger', behavior:'tremor',   strip:true,  top:'43%', left:'58%', size:27},
    {side:'right',species:'luna',  behavior:'crawler',  strip:false, top:'64%', left:'28%', size:21},
    {side:'right',species:'luna',  behavior:'tremor',   strip:true,  top:'82%', left:'55%', size:19}
  ];

  function mothNode(moth,index){
    const el=document.createElement('div');
    el.className=[
      'shelf-moth',
      'moth-'+moth.species,
      'moth-'+moth.behavior,
      moth.strip?'moth-strip moth-wingbeat':'',
      'moth-'+index
    ].filter(Boolean).join(' ');
    el.style.top=moth.top;
    el.style.left=moth.left;
    el.style.width=moth.size+'px';
    el.style.height=moth.size+'px';
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
