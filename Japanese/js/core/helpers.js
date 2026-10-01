// Shared helpers: element lookup, page shell, sub-tab buttons, speak buttons.
window.$=s=>document.querySelector(s);
window.pageView=()=>document.querySelector('#view');
window.speakBtn=jp=>`<button type="button" class="speak" data-say="${jp}" title="Listen">🔊</button>`;
window.jpLine=(jp,cls)=>`<div class="${cls||'jp'}">${jp}${window.speakBtn(jp)}</div>`;
// Speak KANA, not kanji: single kanji (火・道…) have many readings and the
// voice guesses wrong. Kana (ひ・みち) has exactly one sound, always right.
// Also strips romaji/English Parens ("日本 (にほん) Japan" -> "日本、にほん").
window.sayText=v=>v.kana||window.jpOnly(v.example||v.kanji||'');
window.jpOnly=s=>{const m=String(s).match(/[\u3040-\u30ff\u4e00-\u9faf]+/g);return m?m.join('、'):String(s);};
window.speakBtnFor=v=>window.speakBtn(window.sayText(v));
// Real <button> sub-tabs (All / Done, All / Known, ...)
window.subTabs=(tabs,active)=>`<div class="chips" style="margin:12px 0" role="tablist">${tabs.map(t=>`<button type="button" class="chip ${t.id===active?'on':''}" data-sub="${t.id}" role="tab">${t.label}</button>`).join('')}</div>`;
window.levelOptions=sel=>['N5','N4','N3','N2','N1'].map(l=>`<option ${sel===l?'selected':''}>${l}</option>`).join('');
