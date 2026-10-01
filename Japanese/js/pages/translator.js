// TRANSLATOR page — works like the language/ search bar:
// 1) local phrase bank first (instant), 2) live Google Translate for ANYTHING
// (type "eat" -> 食べる). No preset chips. History kept below.
(function(){
const hasCJK=s=>/[\u3000-\u30ff\u4e00-\u9faf]/.test(s||'');
const GTX='https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dj=1&sl=auto&tl=';
async function gtx(q,tl,sig){
  const r=await fetch(GTX+tl+'&q='+encodeURIComponent(q),{signal:sig});
  if(!r.ok)throw new Error('http '+r.status);
  const j=JSON.parse(await r.text());
  const txt=(j.sentences||[]).map(s=>s.trans).join('').trim();
  if(!txt)throw new Error('empty');
  return txt;
}
async function mem(q,tl,sig){
  const from=tl==='ja'?'ja':'en';
  const r=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(q)+'&langpair='+encodeURIComponent(from+'|'+tl),{signal:sig});
  if(!r.ok)throw new Error('http '+r.status);
  const j=await r.json();
  const txt=j&&j.responseData&&String(j.responseData.translatedText||'').trim();
  if(!txt)throw new Error('empty');
  return txt;
}
// romaji reading for live results (Google transliteration, kana fallback skipped)
async function reading(jp,sig){
  try{
    const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&dt=rm&dt=t&sl=ja&tl=en&q='+encodeURIComponent(jp),{signal:sig});
    const j=JSON.parse(await r.text());
    const rm=(Array.isArray(j[6])?j[6]:[]).map(x=>x&&x[3]).filter(Boolean).join(' ').trim();
    if(rm)return rm;
  }catch(e){}
  return '';
}
let seq=0, ac=null;
window.Pages.translator=function(view){
  const hist=(Progress.state.history||[]).slice(0,20);
  view.innerHTML=`<div class="card page">
   <h2>🌸 Translator</h2>
   <p class="mut">Type anything in English or Japanese — live translation, just like Google Translate.</p>
   <div class="row"><input id="tq" placeholder="Type anything… e.g. eat" style="font-size:1.15rem" autocomplete="off"><button type="button" class="primary" id="tgo">🌸</button></div>
   <div id="tres" style="margin-top:14px;display:grid;gap:10px"></div></div>
   <div class="card"><h3>🕘 History (${(Progress.state.history||[]).length})</h3>
   <div style="margin-bottom:10px"><button type="button" class="donebtn" id="hclear">Clear history</button></div>
   <div id="hall">${hist.length?hist.map(h=>`<div class="lesson"><div class="en">“${h.q}”</div><div class="jp" style="font-weight:800">${h.top||''}</div><div class="mut">${new Date(h.at).toLocaleString()}</div></div>`).join(''):'<p class="mut">Nothing yet.</p>'}</div></div>`;
  const box=view.querySelector('#tres'), inp=view.querySelector('#tq');
  const card=(jp,rom,en,src)=>`<div class="lesson">${window.jpLine(jp,'jp big-jp')}${rom?`<div class="roma">${rom}</div>`:''}<div class="en">${en}</div><div class="mut">${src}</div></div>`;
  const local=q=>{
    const ql=q.toLowerCase();
    return PHRASES.filter(p=>p.en.toLowerCase().includes(ql)||p.keywords.some(k=>ql.includes(k)||k.includes(ql))).slice(0,3);
  };
  let t=null;
  const go=()=>{
    const q=inp.value.trim();
    if(!q||q.length<1){box.innerHTML='';return;}
    const my=++seq;
    if(ac)try{ac.abort()}catch(e){}
    ac=new AbortController();const sig=ac.signal;
    const toJA=!hasCJK(q), tl=toJA?'ja':'en';
    const hits=local(q);
    box.innerHTML=hits.map(h=>card(h.jp,h.romaji,h.en,'📖 Phrase bank')).join('')+`<div class="mut" data-live>🌐 Translating…</div>`;
    (async()=>{
      try{
        let txt;try{txt=await gtx(q,tl,sig);}catch(e){txt=await mem(q,tl,sig);}
        if(my!==seq)return;
        let rom='';
        if(toJA&&/[\u4e00-\u9faf\u3040-\u30ff]/.test(txt))rom=await reading(txt,sig);
        if(my!==seq)return;
        const live=box.querySelector('[data-live]');
        if(live)live.outerHTML=card(txt,rom,q,toJA?'🌐 Live — English → Japanese':'🌐 Live — Japanese → English');
        Progress.logTranslation(q,[{jp:txt}]);
        window.refreshStats();
      }catch(e){
        if(my!==seq||(e&&e.name==='AbortError'))return;
        const live=box.querySelector('[data-live]');
        if(live)live.outerHTML=hits.length?'':`<div class="lesson">⚠️ <b>Offline.</b><div class="mut">No connection to the live translator. ${hits.length?'Showing phrase-bank matches above.':'Check your internet and try again.'}</div></div>`;
      }
    })();
  };
  view.querySelector('#tgo').onclick=go;
  inp.oninput=()=>{clearTimeout(t);t=setTimeout(go,500);};
  inp.onkeydown=e=>{if(e.key==='Enter')go();};
  const hc=view.querySelector('#hclear');if(hc)hc.onclick=()=>{Progress.clearHistory();window.Pages.translator(view);};
  inp.focus();
};
})();
