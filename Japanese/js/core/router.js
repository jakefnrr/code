// Router: top nav switches full pages. FIX: buttons use data-v (not data-view).
(function(){
let cur='grammar';
window.render=render;
window.go=v=>{cur=v;
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.v===v));
  render();window.scrollTo({top:0});};
document.addEventListener('click',e=>{
  const sp=e.target.closest&&e.target.closest('.speak');
  if(sp){speakJP(sp.dataset.say,sp);return;}
  const nb=e.target.closest&&e.target.closest('#nav button');
  if(nb){window.go(nb.dataset.v);return;} // <-- was dataset.view (always undefined = stuck page)
});
window.refreshStats=function(){
  const set=(id,txt)=>{const n=document.querySelector(id);if(n)n.textContent=txt;};
  set('#stDone',Progress.doneCount());
  set('#stTotal',GRAMMAR.length);
  set('#stStreak',Progress.streak());
  set('#stBest',Progress.state.quizBest+'/'+QUIZ.length);
  set('#stVoc',Object.keys(Progress.state.known).length+'/'+VOCAB.length);
  set('#stAttempts',Progress.state.quizAttempts.length);
  set('#syncBadge','☁️ '+Progress.syncStatus());
};
function render(){
  window.refreshStats();
  const v=window.pageView();
  if(cur==='grammar')return window.Pages.grammar(v);
  if(cur==='translator')return window.Pages.translator(v);
  if(cur==='vocab')return window.Pages.vocab(v);
  if(cur==='kanji')return window.Pages.kanji(v);
  if(cur==='flash')return window.Pages.flash(v);
  if(cur==='quiz')return window.Pages.quiz(v);
  return window.Pages.grammar(v);
}
window.Pages={};
})();
