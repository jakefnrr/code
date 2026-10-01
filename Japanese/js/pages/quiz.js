// QUIZ page: instant feedback + score + attempt history.
(function(){
let qi=0,qs=0;
window.Pages.quiz=function(view,cont){
  if(!cont){qi=0;qs=0;}
  if(qi>=QUIZ.length){
    Progress.logQuiz(qs,QUIZ.length);
    const att=Progress.state.quizAttempts.slice(0,5);
    view.innerHTML=`<div class="card page" style="text-align:center"><h2>🏆 Score: ${qs}/${QUIZ.length}</h2>
    <p>${qs>=20?'N1 beast! 👑':qs>=15?'N3–N2 solid 🌸':qs>=8?'Keep going — review Grammar.':'Start with N5 lessons in Grammar.'}</p>
    <button type="button" class="primary" id="re">Try again</button>
    <h3>📜 Attempt history (${Progress.state.quizAttempts.length})</h3>${att.map(a=>`<div class="mut">${a.score}/${a.total} — ${new Date(a.at).toLocaleString()}</div>`).join('')||'<p class="mut">No attempts yet.</p>'}</div>`;
    view.querySelector('#re').onclick=()=>window.Pages.quiz(view);
    window.refreshStats();return;}
  const c=QUIZ[qi];
  view.innerHTML=`<div class="card page"><h2>✏️ Quiz — Q${qi+1}/${QUIZ.length} · score ${qs}</h2>
  <p style="font-size:1.2rem;font-weight:700">${c.q}</p><div>${c.opts.map((o,i)=>`<button type="button" class="qopt" data-i="${i}">${o}</button>`).join('')}</div>
  <p class="mut">Best: ${Progress.state.quizBest} · Attempts: ${Progress.state.quizAttempts.length}</p></div>`;
  view.querySelectorAll('.qopt').forEach(b=>b.onclick=()=>{
    const ok=+b.dataset.i===c.a; if(ok)qs++;
    view.querySelectorAll('.qopt').forEach(x=>{if(+x.dataset.i===c.a)x.classList.add('correct');});
    if(!ok)b.classList.add('wrong');
    setTimeout(()=>{qi++;window.Pages.quiz(view,true);},800);
  });
};
})();
