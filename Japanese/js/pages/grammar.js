// GRAMMAR page: All lessons + Done tab (real buttons). Done toggle always works.
(function(){
let gramFilter='', gramLevel='', gramTab='all';
window.Pages.grammar=function(view){
  const doneN=Progress.doneCount();
  view.innerHTML=`<div class="card page">
   <h2>📚 Grammar — all ${GRAMMAR.length} lessons, N5 → N1</h2>
   <p class="mut">Pick any lesson, any day. Press <b>☆ Mark done</b> and it moves to your <b>✅ Done</b> tab. Progress saves automatically${window.KV_CONFIG&&KV_CONFIG.WORKER_URL?' and syncs to Cloudflare KV':''}.</p>
   ${window.subTabs([{id:'all',label:`📖 All (${GRAMMAR.length})`},{id:'done',label:`✅ Done (${doneN})`}],gramTab)}
   <div class="row"><input id="gf" placeholder="Search grammar: e.g. たい, passive, conditional…" value="${gramFilter.replace(/"/g,'&quot;')}"><select id="lv"><option value="">All levels</option>${window.levelOptions(gramLevel)}</select></div>
  </div><div id="gl"></div>`;
  view.querySelectorAll('[data-sub]').forEach(c=>c.onclick=()=>{gramTab=c.dataset.sub;window.Pages.grammar(view);});
  const draw=()=>{
    let L=GRAMMAR.filter(g=>(!gramLevel||g.level===gramLevel)&&(g.title+g.pattern+g.explain+g.unit).toLowerCase().includes(gramFilter.toLowerCase()));
    if(gramTab==='done')L=L.filter(g=>Progress.isDone(g.id));
    let h='',lastU='';
    L.forEach(g=>{
      if(g.unit!==lastU){h+=`<div class="unit">${g.unit}</div>`;lastU=g.unit;}
      const d=Progress.isDone(g.id);
      h+=`<div class="lesson"><div class="t">${g.title}<span class="badge">${g.level}</span></div>
      <div class="pattern">${g.pattern}</div><div>${g.explain}</div><div class="mut">💡 ${g.tip}</div>`+
      g.ex.map(x=>`<div class="ex">${window.jpLine(x.jp)}<div class="furi">${x.f}</div><div class="roma">${x.r}</div><div class="en">${x.en}</div></div>`).join('')+
      `<button type="button" class="donebtn ${d?'done':''}" data-done="${g.id}">${d?'★ Done — tap to undo':'☆ Mark done'}</button></div>`;
    });
    view.querySelector('#gl').innerHTML=h||`<div class="card">${gramTab==='done'?'Nothing marked done yet — open 📖 All and tap ☆ Mark done.':'No lessons match.'}</div>`;
    view.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{Progress.toggleDone(b.dataset.done);window.refreshStats();window.Pages.grammar(view);});
  };
  view.querySelector('#gf').oninput=e=>{gramFilter=e.target.value;draw();};
  view.querySelector('#lv').onchange=e=>{gramLevel=e.target.value;draw();};
  draw();
};
})();
