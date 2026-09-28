const LANGS={};

const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY='kotonoha.v1';

const S=Object.assign({
  tab:'learn',rate:.9,voiceURI:'',api:true
},(()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(e){return{}}})());
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({rate:S.rate,voiceURI:S.voiceURI,api:S.api}))}catch(e){}};

const L=()=>LANGS.ja;

function toast(m,g){
  const w=$('#toast'), d=document.createElement('div');
  d.className='toast'+(g?' g':''); d.textContent=m; w.appendChild(d);
  setTimeout(()=>{d.remove();},2300);
}

const PUNCT=/[\s\u3000\.,!\?;:'"“”‘’。、！？「」『』（）()\-\u2013\u2014~〜…・\/]/g;
const toHira=s=>String(s).replace(/[\u30A1-\u30F6]/g,c=>String.fromCharCode(c-0x60)).replace(/[\u30FC\uFF70]/g,c=>c);
const stripA=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const norm=s=>toHira(String(s)).replace(PUNCT,'').toLowerCase();
const normA=s=>toHira(stripA(String(s))).replace(PUNCT,'').toLowerCase();
function lev(a,b){
  const m=a.length,n=b.length; if(!m)return n; if(!n)return m;
  let p=new Array(n+1),c=new Array(n+1);
  for(let j=0;j<=n;j++)p[j]=j;
  for(let i=1;i<=m;i++){c[0]=i;
    for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));
    for(let j=0;j<=n;j++)p[j]=c[j];
  }
  return p[n];
}
function score(said,target){
  const a=norm(said),b=norm(target);
  if(!a||!b)return 0;
  if(a===b)return 1;
  const f=x=>Math.max(0,1-lev(x,y)/Math.max(x.length,y.length));
  const y=b;
  const base=f(a);
  const aa=normA(said),bb=normA(target);
  const alt=aa&&bb?f(aa):0;
  return Math.max(base,alt);
}
const hasCJK=s=>/[\u3000-\u30ff\u4e00-\u9faf\uac00-\ud7af]/.test(s);

const R2K={'a':'あ','i':'い','u':'う','e':'え','o':'お','ka':'か','ki':'き','ku':'く','ke':'け','ko':'こ','sa':'さ','sh':'し','si':'し','su':'す','se':'せ','so':'そ','ta':'た','chi':'ち','ti':'ち','ts':'つ','tu':'つ','te':'て','to':'と','na':'な','ni':'に','nu':'ぬ','ne':'ね','no':'の','ha':'は','hi':'ひ','hu':'ふ','fu':'ふ','he':'へ','ho':'ほ','ma':'ま','mi':'み','mu':'む','me':'め','mo':'も','ya':'や','yu':'ゆ','yo':'よ','ra':'ら','ri':'り','ru':'る','re':'れ','ro':'ろ','wa':'わ','wi':'ゐ','we':'ゑ','wo':'を','ji':'じ','zu':'ず','de':'で','di':'ぢ','du':'づ','ga':'が','gi':'ぎ','gu':'ぐ','ge':'げ','go':'ご','za':'ざ','ji2':'じ','ze':'ぜ','zo':'ぞ','da':'だ','ba':'ば','bi':'び','bu':'ぶ','be':'べ','bo':'ぼ','pa':'ぱ','pi':'ぴ','pu':'ぷ','pe':'ぺ','po':'ぽ','kya':'きゃ','kyu':'きゅ','kyo':'きょ','sya':'しゃ','syu':'しゅ','syo':'しょ','sha':'しゃ','shu':'しゅ','sho':'しょ','cha':'ちゃ','chu':'ちゅ','cho':'ちょ','nya':'にゃ','nyu':'にゅ','nyo':'にょ','mya':'みゃ','myu':'みゅ','myo':'みょ','rya':'りゃ','ryu':'りゅ','ryo':'りょ','gya':'ぎゃ','gyu':'ぎゅ','gyo':'ぎょ','ja':'じゃ','ju':'じゅ','jo':'じょ','bya':'びゃ','byu':'びゅ','byo':'びょ','pya':'ぴゃ','pyu':'ぴゅ','pyo':'ぴょ','dya':'ぢゃ','dyu':'ぢゅ','dyo':'ぢょ','fu2':'ふ','tsu':'つ','xtu':'っ','x':'っ','l':'ー','-':'ー','nn':'ん'};
function romaji(s){
  s=String(s).toLowerCase().replace(/[^a-z'’\- ]/g,'');
  let out='',i=0;
  while(i<s.length){
    const c=s[i];
    if(c==='n'){
      const n1=s[i+1],n2=s[i+2];
      if(n1==="'"||n1==='’'){out+='ん';i+=2;continue;}
      if(n1==='n'){out+='ん';i+=(n2&&/[aeiou]/.test(n2))?1:2;continue;}
      if(!n1||!/[aeiouoy]/.test(n1)){out+='ん';i++;continue;}
    }
    if(c==='x'){out+='っ';i++;continue;}
    if(c==='l'||c==='-'){out+='ー';i++;continue;}
    if(s.substr(i,3)==='tsu'){out+='っ';i+=3;continue;}
    const t3=s.substr(i,3),t2=s.substr(i,2);
    if(R2K[t3]){out+=R2K[t3];i+=3;continue;}
    if(t2==='ts'){out+='っ';i+=2;continue;}
    if(R2K[t2]){out+=R2K[t2];i+=2;continue;}
    if(c==='\''||c==='’'){i++;continue;}
    if(R2K[c]){out+=R2K[c];i++;continue;}
    i++;
  }
  return out;
}
function readInput(v,target){
  let s=v.trim();
  if(/^[a-zA-Z'\-\s]+$/.test(s)&&hasCJK(target))s=romaji(s);
  return s;
}

const KANA={'あ':'a','い':'i','う':'u','え':'e','お':'o','か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
'や':'ya','ゆ':'yu','よ':'yo',
'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
'わ':'wa','ゐ':'wi','ゑ':'we','を':'wo','ん':'n',
'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
'ゃ':'ya','ゅ':'yu','ょ':'yo','ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ゎ':'wa'};
function kanaRomaji(s){
  s=String(s).replace(/[\u30A1-\u30F6]/g,c=>String.fromCharCode(c-0x60));
  let out='',i=0;
  while(i<s.length){
    const c=s[i];
    if(c==='ー'||c==='\uFF70'){out+='-';i++;continue}
    if(c==='っ'){
      const n=KANA[s[i+1]]||'';
      out+=n&&n[0]===n[1]?n[0]:n?n[0]:'tsu';
      i++;continue;
    }
    const r=KANA[c];
    if(r){
      let a=r;
      const n2=s[i+1];
      if(n2==='ゃ'||n2==='ゅ'||n2==='ょ'){a+=KANA[n2];i+=2}
      else{i++}
      if(i<s.length&&s[i]==='ー'){a+='-';i++}
      out+=a;
      continue;
    }
    out+=c;i++;
  }
  return out.replace(/[ \t]+/g,' ').trim();
}

let VOICES=[];
function loadVoices(){ try{VOICES=window.speechSynthesis?speechSynthesis.getVoices():[]}catch(e){VOICES=[]} }
if(window.speechSynthesis){ loadVoices(); speechSynthesis.onvoiceschanged=loadVoices; }
function voicesFor(){
  const pre=L().tts.slice(0,2).toLowerCase();
  return VOICES.filter(v=>String(v.lang).toLowerCase().replace('_','-').startsWith(pre));
}
function pickVoice(){
  if(S.voiceURI){const v=VOICES.find(x=>x.voiceURI===S.voiceURI);if(v)return v;}
  const pool=voicesFor();
  const pref=['Google','Kyoko','Nanami','O-Ren','Microsoft','Natural','Enhanced','Premium','Siri'];
  for(const p of pref){const f=pool.find(v=>String(v.name).includes(p));if(f)return f;}
  return pool[0]||null;
}
let speaking=false;
function speak(text,o){
  o=o||{};
  if(!window.speechSynthesis||!text){ toast('Speech output is not available here'); return null; }
  try{speechSynthesis.cancel()}catch(e){}
  const u=new SpeechSynthesisUtterance(String(text));
  const v=pickVoice(); if(v)u.voice=v;
  u.lang=L().tts; u.rate=o.rate!=null?o.rate:S.rate; u.pitch=o.pitch!=null?o.pitch:1;
  u.onstart=()=>{speaking=true;document.body.classList.add('speaking')};
  const end=()=>{speaking=false;document.body.classList.remove('speaking');if(o.done)o.done()};
  u.onend=end; u.onerror=end;
  setTimeout(()=>{try{speechSynthesis.speak(u)}catch(e){end()}},40);
  return u;
}
function stopSpeak(){try{speechSynthesis.cancel()}catch(e){}document.body.classList.remove('speaking')}
function playSeq(items){
  let k=0;
  const next=()=>{ if(k>=items.length)return; const it=items[k++]; speak(it.j,{pitch:it.pitch,done:next}); };
  next();
}

const SRCls=window.SpeechRecognition||window.webkitSpeechRecognition;
const micOK=!!SRCls;
let rec=null,recLive=false;
function listen(cb,err){
  if(!micOK){ if(err)err('no'); return; }
  if(recLive&&rec){try{rec.stop()}catch(e){}}
  rec=new SRCls();
  rec.lang=L().tts; rec.interimResults=true; rec.maxAlternatives=5; rec.continuous=false;
  let final='',alt=[];
  rec.onresult=e=>{
    let inter='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r=e.results[i];
      for(let k=0;k<r.length;k++) if(k<5) alt.push(r[k].transcript);
      if(r.isFinal) final+=r[0].transcript; else inter+=r[0].transcript;
    }
    if(cb.onpartial)cb.onpartial((inter||final).trim());
    if(final&&cb.onfinal)cb.onfinal(final.trim(),[...new Set(alt)]);
  };
  rec.onerror=e=>{recLive=false;if(err)err(e.error||'error')};
  rec.onend=()=>{recLive=false;if(cb.onend)cb.onend()};
  try{rec.start();recLive=true}catch(e){recLive=false;if(err)err('start')}
}
function stopListen(){ if(rec){try{rec.abort()}catch(e){}} recLive=false; }

const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const allWords=()=>{const p=L(),o=[];p.units.forEach(u=>u.w.forEach(w=>o.push(w)));return o};
const poolWords=()=>{
  const p=L();
  if(!U.pool||U.pool==='all')return allWords();
  const u=p.units.find(x=>x.id===U.pool);
  return u?u.w:allWords();
};
const poolName=()=>{
  const p=L();
  if(!U.pool||U.pool==='all')return 'Any word';
  const u=p.units.find(x=>x.id===U.pool);
  return u?u.n:'Any word';
};
const U={pool:'all',word:null,show:false,sent:null,sentShow:false,dia:null,rp:null,q:null,qn:10,mode:'mix',res:null,gramQ:{}};
