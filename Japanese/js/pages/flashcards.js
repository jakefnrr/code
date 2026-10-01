// FLASHCARDS page: vocab/kanji decks, flip, shuffle, prev/next. Views tracked.
(function(){
let flashIdx=0, flashSide=false, flashDeck='vocab';
window.Pages.flash=function(view){
  const deck=flashDeck==='vocab'?VOCAB.map(v=>({id:'v:'+v.kanji,f:v.kanji+' ('+v.kana+')',b:v.en+' · '+v.romaji,say:window.sayText(v)})):KANJI.map(k=>({id:'k:'+k.kanji,f:k.kanji,b:k.meaning+' · '+k.reading+' — '+k.example,say:window.jpOnly(k.example)}));
  const c=deck[flashIdx%deck.length];
  Progress.seeFlash(c.id);
  view.innerHTML=`<div class="card page" style="text-align:center"><h2>🎴 Flashcards — ${flashDeck} (${deck.length})</h2>
  <p class="mut">Tap the card to flip. Views are counted.</p>
  <div class="row" style="justify-content:center"><button type="button" class="primary" id="sw">${flashDeck==='vocab'?'Kanji deck':'Vocab deck'}</button><button type="button" class="primary" id="sh">🔀 Shuffle</button></div>
  <div class="flash" id="fc" role="button" tabindex="0">${flashSide?c.b:c.f}<small>${flashSide?'meaning — tap to flip':'tap to flip'}</small><br>${flashSide?'':window.speakBtn(c.say)}</div>
  <div class="row" style="justify-content:center"><button type="button" class="primary" id="pv">← Prev</button><button type="button" class="primary" id="nx">Next →</button></div>
  <p class="mut">${(flashIdx%deck.length)+1} / ${deck.length} · seen ${Progress.state.flashSeen[c.id]||1}x</p></div>`;
  const flip=()=>{flashSide=!flashSide;window.Pages.flash(view);};
  view.querySelector('#fc').onclick=e=>{if(e.target.closest&&e.target.closest('.speak'))return;flip();};
  view.querySelector('#nx').onclick=()=>{flashIdx++;flashSide=false;window.Pages.flash(view);};
  view.querySelector('#pv').onclick=()=>{flashIdx=Math.max(0,flashIdx-1);flashSide=false;window.Pages.flash(view);};
  view.querySelector('#sw').onclick=()=>{flashDeck=flashDeck==='vocab'?'kanji':'vocab';flashIdx=0;flashSide=false;window.Pages.flash(view);};
  view.querySelector('#sh').onclick=()=>{flashIdx=Math.floor(Math.random()*deck.length);flashSide=false;window.Pages.flash(view);};
  window.refreshStats();
};
})();
