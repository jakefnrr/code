// Voice that works on EVERY device (phone, iPad, desktop, any browser):
// Primary = Google Translate Japanese voice streamed as audio (same voice as
// translate.google.com, needs internet). Fallback = built-in speechSynthesis
// (works offline) preferring the Google Japanese voice. Tap again to stop.
(function(){
let audios=[], speaking=false, curBtn=null, seq=0;

function resetBtn(){document.querySelectorAll('.speak.playing').forEach(b=>b.classList.remove('playing'));curBtn=null;}
function stopAll(){
  seq++;
  speaking=false;
  audios.forEach(a=>{try{a.pause();a.src='';}catch(e){}});
  audios=[];
  try{if('speechSynthesis' in window)speechSynthesis.cancel();}catch(e){}
  resetBtn();
}
function chunk(text){
  // Google TTS caps ~200 chars per request — split on Japanese punctuation
  const parts=text.match(/[^。！？]+[。！？]?|[\s\S]{1,180}/g)||[text];
  return parts.map(s=>s.trim()).filter(Boolean).slice(0,10);
}
function playRemote(text,mySeq,btn){
  const parts=chunk(text);
  let i=0;
  speaking=true;
  if(btn){btn.classList.add('playing');curBtn=btn;}
  const next=()=>{
    if(mySeq!==seq)return;
    if(i>=parts.length){speaking=false;resetBtn();return;}
    const url='https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ja&q='+encodeURIComponent(parts[i]);
    const a=new Audio(url);
    audios.push(a);
    a.onended=()=>{i++;next();};
    a.onerror=()=>{playLocal(text,mySeq,btn);}; // offline/blocked → built-in voice
    a.play().catch(()=>playLocal(text,mySeq,btn));
  };
  next();
}
function playLocal(text,mySeq,btn){
  if(mySeq!==seq)return;
  audios.forEach(a=>{try{a.pause();}catch(e){}});
  audios=[];
  if(!('speechSynthesis' in window)){speaking=false;resetBtn();return;}
  try{
    let vs=[];try{vs=speechSynthesis.getVoices()||[];}catch(e){}
    const v=vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith('ja')&&/google/i.test(v.name))
      ||vs.find(v=>v.lang==='ja-JP')||vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith('ja'))||null;
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text.slice(0,2000));
    u.lang='ja-JP';u.rate=0.9;u.pitch=1;
    if(v){u.voice=v;u.lang=v.lang;}
    speaking=true;
    if(btn){btn.classList.add('playing');curBtn=btn;}
    u.onend=()=>{if(mySeq===seq){speaking=false;resetBtn();}};
    u.onerror=()=>{if(mySeq===seq){speaking=false;resetBtn();}};
    speechSynthesis.speak(u);
  }catch(e){speaking=false;resetBtn();}
}
window.stopSpeak=stopAll;
window.speakJP=function(text){
  const btn=document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('speak')?document.activeElement:null;
  if(speaking){
    const same=btn&&curBtn&&btn===curBtn;
    stopAll();
    if(same)return; // tapped same button = stop
    const my=++seq;playRemote(text,my,btn);
    return;
  }
  stopAll();
  const my=++seq;playRemote(text,my,btn);
};
// Warm up + preload voices on first gesture (iOS/Safari requirement)
document.addEventListener('pointerdown',function once(){
  try{if('speechSynthesis' in window){speechSynthesis.getVoices();const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u);speechSynthesis.cancel();}}catch(e){}
  document.removeEventListener('pointerdown',once);
});
})();
