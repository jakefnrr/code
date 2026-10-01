// Same voice engine as language/ — pure built-in speechSynthesis.
// iPhone was silent because Google translate_tts Audio is blocked / muted
// by the silent switch on iOS. Built-in JA voice always works inside a tap.
(function(){
let VOICES=[];
function loadVoices(){ try{VOICES=window.speechSynthesis?speechSynthesis.getVoices():[]}catch(e){VOICES=[];} }
if(window.speechSynthesis){ loadVoices(); try{speechSynthesis.onvoiceschanged=loadVoices;}catch(e){} }
function pickVoice(){
  const pool=VOICES.filter(v=>String(v.lang||'').toLowerCase().replace('_','-').startsWith('ja'));
  const pref=['Kyoko','Nanami','O-Ren','Google','Microsoft','Natural','Enhanced','Premium','Siri'];
  for(const p of pref){const f=pool.find(v=>String(v.name||'').includes(p));if(f)return f;}
  return pool.find(v=>v.lang==='ja-JP')||pool[0]||null;
}
function resetBtn(){document.querySelectorAll('.speak.playing').forEach(b=>b.classList.remove('playing'));}
window.stopSpeak=function(){ try{if('speechSynthesis' in window)speechSynthesis.cancel();}catch(e){} resetBtn(); document.body.classList.remove('speaking'); };
window.speakJP=function(text,btnEl){
  if(!text)return;
  if(!('speechSynthesis' in window))return;
  const btn=btnEl||null;
  // tap same button while speaking = stop (matches old behavior)
  if(window._speaking && btn && btn.classList.contains('playing')){ window.stopSpeak(); window._speaking=false; return; }
  try{speechSynthesis.cancel();}catch(e){}
  if(btn){resetBtn();btn.classList.add('playing');}
  const u=new SpeechSynthesisUtterance(String(text).slice(0,2000));
  const v=pickVoice(); if(v){u.voice=v;u.lang=v.lang;}
  else u.lang='ja-JP';
  u.rate=0.9; u.pitch=1;
  const done=()=>{ window._speaking=false; resetBtn(); document.body.classList.remove('speaking'); };
  u.onend=done; u.onerror=done;
  document.body.classList.add('speaking');
  window._speaking=true;
  // iOS needs speak() queued just after cancel(), inside the tap handler
  setTimeout(()=>{ try{speechSynthesis.speak(u);}catch(e){done();} },40);
};
})();
