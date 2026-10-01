// Voice buttons. Rule: speak KANA, never lone kanji (see sayText).
window.speakBtn=jp=>`<button type="button" class="speak" data-say="${jp}" title="Listen">🔊</button>`;
window.jpLine=(jp,cls)=>`<div class="${cls||'jp'}">${jp}${window.speakBtn(jp)}</div>`;
// Kana has exactly one sound; kanji like 火/道 have many and the voice guesses.
window.sayText=v=>v.kana||window.jpOnly(v.example||v.kanji||'');
window.jpOnly=s=>{const m=String(s).match(/[\u3040-\u30ff\u4e00-\u9faf]+/g);return m?m.join('、'):String(s);};
window.speakBtnFor=v=>window.speakBtn(window.sayText(v));
