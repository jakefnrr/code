// Progress store: localStorage cache + Cloudflare KV sync (via Worker).
// Tracks EVERYTHING: grammar done, vocab known, kanji studied, quiz attempts/best,
// flashcard seen counts, phrase searches, per-day activity.
// Same window.Progress API as before, plus extras. Works offline if WORKER_URL = "".
(function(){
const K='sakura-progress-v2';
let s={done:{},known:{},kanji:{},quizBest:0,quizAttempts:[],flashSeen:{},searches:{},history:[],days:{}};
try{const raw=localStorage.getItem(K);if(raw)s=Object.assign(s,JSON.parse(raw));}catch(e){}
const today=()=>new Date().toISOString().slice(0,10);
s.days[today()]= (s.days[today()]||0)+1;
let timer=null, status='local';
function saveLocal(){try{localStorage.setItem(K,JSON.stringify(s));}catch(e){}}
function schedulePush(){
  saveLocal(); updateBadge();
  const cfg=(window.KV_CONFIG||{});
  if(!cfg.WORKER_URL){status='local';updateBadge();return;}
  status='pending';updateBadge();
  clearTimeout(timer);
  timer=setTimeout(push, cfg.SYNC_MS||4000);
}
async function push(){
  const cfg=window.KV_CONFIG;
  try{
    status='syncing';updateBadge();
    await fetch(cfg.WORKER_URL+'/progress/'+encodeURIComponent(cfg.USER_ID||'default'),{
      method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(s)});
    status='synced';updateBadge();
  }catch(e){status='offline';updateBadge();}
}
async function pull(){
  const cfg=(window.KV_CONFIG||{});
  if(!cfg.WORKER_URL)return false;
  try{
    const r=await fetch(cfg.WORKER_URL+'/progress/'+encodeURIComponent(cfg.USER_ID||'default'));
    if(!r.ok)return false;
    const remote=await r.json();
    if(remote && typeof remote==='object'){s=Object.assign(s,remote);saveLocal();updateBadge();return true;}
  }catch(e){}
  return false;
}
function updateBadge(){const el=document.getElementById('syncBadge');if(el)el.textContent='☁️ '+status;}
window.Progress={
  state:s, syncStatus:()=>status, pull,
  toggleDone(id){if(s.done[id])delete s.done[id];else s.done[id]={at:Date.now()};s.days[today()]=(s.days[today()]||0)+1;schedulePush();},
  isDone(id){return !!s.done[id];},
  doneCount(){return Object.keys(s.done).length;},
  toggleKnown(id){if(s.known[id])delete s.known[id];else s.known[id]={at:Date.now()};schedulePush();},
  toggleKanji(id){if(s.kanji[id])delete s.kanji[id];else s.kanji[id]={at:Date.now()};schedulePush();},
  setBest(n){if(n>s.quizBest)s.quizBest=n;schedulePush();},
  logQuiz(score,total){s.quizAttempts.unshift({score,total,at:Date.now()});s.quizAttempts=s.quizAttempts.slice(0,50);if(score>s.quizBest)s.quizBest=score;schedulePush();},
  seeFlash(id){s.flashSeen[id]=(s.flashSeen[id]||0)+1;schedulePush();},
  logSearch(q){q=q.toLowerCase().slice(0,40);s.searches[q]=(s.searches[q]||0)+1;schedulePush();},
  logTranslation(q,hits){s.history.unshift({q,top:hits.length?hits[0].jp:'',n:hits.length,at:Date.now()});s.history=s.history.slice(0,30);s.searches[q]=(s.searches[q]||0)+1;schedulePush();},
  clearHistory(){s.history=[];schedulePush();},
  streak(){return Object.keys(s.days).length;}
};
saveLocal();
document.addEventListener('DOMContentLoaded',async()=>{updateBadge();await pull();updateBadge();if(window.render)window.render();});
})();
