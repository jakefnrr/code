// KANJI page: search + ✓ studied tracking.
(function(){
let kanjiQ='';
window.Pages.kanji=function(view){
  const stN=Object.keys(Progress.state.kanji||{}).length;
  view.innerHTML=`<div class="card page"><h2>🈳 Kanji — all ${KANJI.length}</h2>
  <p class="mut">${stN} studied. Tap ✓ under a kanji to track it.</p>
  <div class="row"><input id="kq" placeholder="Search kanji, reading, meaning…" value="${kanjiQ.replace(/"/g,'&quot;')}"></div>
  <div id="kg" class="grid" style="margin-top:12px"></div></div>`;
  const draw=()=>{
    const q=(view.querySelector('#kq').value||'').toLowerCase();
    view.querySelector('#kg').innerHTML=KANJI.filter(k=>(k.kanji+k.reading+k.meaning+k.example).toLowerCase().includes(q)).map(k=>{const s=Progress.state.kanji&&Progress.state.kanji[k.kanji];
      return `<div class="kcard"><div class="big">${k.kanji}</div><div>${k.reading}</div><div class="en">${k.meaning}</div><div class="mut">${k.example} ${window.speakBtnFor(k)}</div><button type="button" class="donebtn ${s?'done':''}" data-kk="${k.kanji}">${s?'★ Studied':'✓ Studied'}</button></div>`;}).join('');
    view.querySelectorAll('[data-kk]').forEach(b=>b.onclick=()=>{Progress.toggleKanji(b.dataset.kk);window.refreshStats();window.Pages.kanji(view);});
  };
  view.querySelector('#kq').oninput=e=>{kanjiQ=e.target.value;draw();};
  draw();
};
})();
