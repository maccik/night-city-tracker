'use strict';
const $=id=>document.getElementById(id);
const tracks={ot:{labels:['NORMAL','NO GIGS 1','NO GIGS 2','OVERTIME'],colors:['#22d3be','#f6ef42','#f6ef42','#fa465c'],desc:['STANDARD PLAY','EMPTY FIXERS · TURN 1/2','EMPTY FIXERS · TURN 2/2','7+ GIGS = INSTANT WIN']},re:{labels:['OFF','TURN 0','TURN 1','TURN 2','TURN 3'],colors:['#45c9ef','#45c9ef','#45c9ef','#45c9ef','#fa465c'],desc:['ROUND IN PROGRESS','FINISH CURRENT TURN','3 TURNS REMAINING','2 TURNS REMAINING','FINAL TURN']}};
const initial=()=>({ot:0,re:0,p1:0,p2:0});
const valid=s=>s&&Object.keys(initial()).every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<=(k==='ot'?3:k==='re'?4:2))&&!(s.p1===2&&s.p2===2);
let state=initial(),history=[],prefs={theme:'night',tabletop:false};
try{const old=JSON.parse(localStorage.getItem('nc-tracker-v1'));const data=JSON.parse(localStorage.getItem('nc-tracker-v2'));if(data?.state&&valid({...initial(),...data.state})){state={...initial(),...data.state};history=Array.isArray(data.history)?data.history.map(s=>({...initial(),...s})).filter(valid).slice(-50):[]}else if(old&&valid({...initial(),ot:old.ot,re:old.re}))state={...initial(),ot:old.ot,re:old.re};if(data?.prefs){for(const k of ['tabletop'])if(typeof data.prefs[k]==='boolean')prefs[k]=data.prefs[k];if(['night','arasaka','militech','samurai'].includes(data.prefs.theme))prefs.theme=data.prefs.theme}}catch{}
function save(){try{localStorage.setItem('nc-tracker-v2',JSON.stringify({state,history,prefs}))}catch{}}
function buzz(){if(typeof navigator.vibrate==='function'){try{navigator.vibrate(35)}catch{}}}
function change(next){if(!valid(next)||JSON.stringify(next)===JSON.stringify(state))return;history.push({...state});history=history.slice(-50);state=next;save();render();buzz()}
function render(){for(const [k,t] of Object.entries(tracks)){Array.from($(k).children).forEach((b,i)=>{b.setAttribute('aria-pressed',String(state[k]===i));b.querySelector('.dot').textContent=state[k]===i?'◉':'○'});$(k+'-desc').textContent=t.desc[state[k]];$(k+'-desc').style.color=k==='re'||state[k]===3?t.colors[state[k]]:''}for(const k of ['p1','p2'])$(k).textContent=state[k];const winner=state.p1===2?'PLAYER 1':state.p2===2?'PLAYER 2':'';$('winner').textContent=winner?winner+' WINS THE MATCH':'';$('win1').disabled=$('win2').disabled=!!winner;$('undo').disabled=!history.length}
for(const [k,t] of Object.entries(tracks))t.labels.forEach((label,i)=>{const b=document.createElement('button');b.className='state';b.style.setProperty('--active',t.colors[i]);b.innerHTML='<span>'+label+'</span><span class="dot" aria-hidden="true"></span>';b.onclick=()=>change({...state,[k]:i});$(k).append(b)});
$('undo').onclick=()=>{if(history.length){state=history.pop();save();render();buzz()}};
$('game').onclick=()=>{if(confirm('Reset game trackers and keep match score?'))change({...state,ot:0,re:0})};
$('reset').onclick=()=>{if(confirm('Reset trackers and match score?'))change(initial())};
for(const n of [1,2])$('win'+n).onclick=()=>{if(state.p1<2&&state.p2<2)change({...state,['p'+n]:state['p'+n]+1})};
let lock=null,pending=false;
async function wake(){
  if(document.visibilityState!=='visible'){
    if(lock){const l=lock;lock=null;try{await l.release()}catch{}}
    return;
  }
  if(!('wakeLock' in navigator)||lock||pending)return;
  pending=true;
  try{
    const l=await navigator.wakeLock.request('screen');
    if(document.visibilityState!=='visible'){await l.release();return}
    lock=l;
    l.addEventListener('release',()=>{if(lock===l)lock=null});
  }catch{}finally{pending=false}
}
document.addEventListener('visibilitychange',wake);
window.addEventListener('focus',wake);
document.addEventListener('pointerup',wake);
function settings(){document.body.dataset.theme=prefs.theme;$('theme').value=prefs.theme;document.body.classList.toggle('tabletop',prefs.tabletop);$('tabletop').checked=prefs.tabletop;save()}
$('tabletop').onchange=()=>{prefs.tabletop=$('tabletop').checked;settings()};
$('theme').onchange=()=>{prefs.theme=$('theme').value;settings()};
let install;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();install=e;$('install').style.display='block'});$('install').onclick=async()=>{if(install){await install.prompt();install=null;$('install').style.display='none'}};window.addEventListener('appinstalled',()=>{$('install').style.display='none'});
if('serviceWorker'in navigator&&location.protocol!=='file:'){let controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled){$('update').hidden=false}else controlled=true});$('update').onclick=()=>{save();location.reload()};navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{const check=()=>reg.update().catch(()=>{});check();window.addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});setInterval(check,300000)}).catch(console.warn)}
render();settings();wake();
