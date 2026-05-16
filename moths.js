// Decorative moth placement for the GAYA side shelves.
// Runs after the app shell renders and reinstalls itself if the shell is redrawn.
(function(){
  const MARK='__gayaShelfMothsInstalled';
  const MOTHS=[
    {side:'left', species:'luna',  behavior:'tremor',   strip:true,  top:'12%', left:'48%', size:26, rotate:'-12deg', scale:.95, delay:'-11s'},
    {side:'left', species:'ghost', behavior:'crawler',  strip:false, top:'31%', left:'22%', size:20, rotate:'18deg',  scale:.86, delay:'-64s'},
    {side:'left', species:'tiger', behavior:'consider', strip:false, top:'55%', left:'60%', size:24, rotate:'-8deg',  scale:.90, delay:'-38s'},
    {side:'left', species:'ghost', behavior:'tremor',   strip:true,  top:'76%', left:'36%', size:18, rotate:'10deg',  scale:.78, delay:'-29s'},

    {side:'right',species:'ghost', behavior:'consider', strip:false, top:'15%', left:'34%', size:23, rotate:'11deg',  scale:.88, delay:'-47s'},
    {side:'right',species:'tiger', behavior:'tremor',   strip:true,  top:'39%', left:'54%', size:27, rotate:'-14deg', scale:.96, delay:'-23s'},
    {side:'right',species:'luna',  behavior:'crawler',  strip:false, top:'62%', left:'26%', size:21, rotate:'21deg',  scale:.84, delay:'-72s'},
    {side:'right',species:'luna',  behavior:'tremor',   strip:true,  top:'81%', left:'52%', size:19, rotate:'-6deg',  scale:.78, delay:'-53s'}
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
