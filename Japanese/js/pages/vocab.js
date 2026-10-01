// VOCAB page: All / Known button-tabs + search + ✓ tracking.
(function(){
let vocabTab='all', vocabQ='';
window.Pages.vocab=function(view){
  const knownN=Object.keys(Progress.state.known).length;
  view.innerHTML=`<div class="card page"><h2>📝 Vocabulary — all ${VOCAB.length} words</h2>
  <p class="mut">Tap ✓ when Mom knows a word — it moves to ✅ Known.</p>
  ${window.subTabs([{id:'all',label:`📖 All (${VOCAB.length})`},{id:'known',label:`✅ Known (${knownN})`}],vocabTab)}
  <div class="row"><input id="vq" placeholder="Search: water, ねこ, sushi…" value="${vocabQ.replace(/"/g,'&quot;')}"></div><div id="vg" class="grid" style="margin-top:12px"></div></div>`;
  view.querySelectorAll('[data-sub]').forEach(c=>c.onclick=()=>{vocabTab=c.dataset.sub;window.Pages.vocab(view);});
  const draw=()=>{
    let L=VOCAB.filter(v=>(v.kanji+v.kana+v.romaji+v.en).toLowerCase().includes(vocabQ.toLowerCase()));
    if(vocabTab==='known')L=L.filter(v=>Progress.state.known[v.kanji+'|'+v.en]);
    view.querySelector('#vg').innerHTML=L.map(v=>{const k=Progress.state.known[v.kanji+'|'+v.en];
      return `<div class="vcard ${k?'known':''}"><div class="big">${v.kanji}</div><div>${v.kana} · ${v.romaji}</div><div class="en">${v.en}</div><div>${window.speakBtnFor(v)} <button type="button" class="donebtn ${k?'done':''}" data-k="${v.kanji}|${v.en}">${k?'★ Known':'✓ I know this'}</button></div></div>`;}).join('')||'<p class="mut">Nothing here yet.</p>';
    view.querySelectorAll('[data-k]').forEach(b=>b.onclick=e=>{e.stopPropagation();Progress.toggleKnown(b.dataset.k);window.refreshStats();window.Pages.vocab(view);});
  };
  view.querySelector('#vq').oninput=e=>{vocabQ=e.target.value;draw();};
  draw();
};
})();
