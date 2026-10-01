// Voice that works on EVERY device (phone, iPad, desktop, any browser):
// - iPhone/iPad: built-in Japanese voice FIRST (iOS often blocks the Google
//   audio stream, but its built-in voice always works inside a tap).
// - Everywhere else: Google Translate voice stream first, built-in fallback.
// Text sent is kana-correct (see helpers sayText), so readings are right.
(function(){
let audios=[], speaking=false, curBtn=null, seq=0, failedOnce=false;
const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&(navigator.maxTouchPoints||0)>1);

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
    a.onerror=()=>{playLocal(text,mySeq,btn,true);}; // offline/blocked → built-in voice
    const pr=a.play();
    if(pr&&pr.catch)pr.catch(()=>playLocal(text,mySeq,btn,true));
    // Safety: if audio starts but stays silent/stalls, fall back after 6s
    setTimeout(()=>{if(mySeq===seq&&speaking&&audios.indexOf(a)>=0&&a.currentTime===0&&!a.ended){playLocal(text,mySeq,btn,true);}},6000);
  };
  next();
}
function heardNothing(){
  if(failedOnce)return;failedOnce=true;
  alert('🔇 No sound played.\n\nOn iPhone check:\n1. Volume buttons (turn it up)\n2. Silent switch on the side (flip it OFF — orange = silent)\n3. Connected Bluetooth/airpods\n\nThen tap 🔊 again.');
}
function playLocal(text,mySeq,btn,fromRemoteFail){
  if(mySeq!==seq)return;
  audios.forEach(a=>{try{a.pause();}catch(e){}});
  audios=[];
  if(!('speechSynthesis' in window)){speaking=false;resetBtn();if(fromRemoteFail)heardNothing();return;}
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
    let ended=false;
    u.onend=()=>{if(mySeq===seq){ended=true;speaking=false;resetBtn();}};
    u.onerror=()=>{if(mySeq!==seq)return;ended=true;
      if(isIOS){playRemote(text,mySeq,btn);} // built-in failed → try Google stream
      else{speaking=false;resetBtn();heardNothing();}};
    // Safety: speech started but never ends/never audible (iOS quirk) → other engine
    setTimeout(()=>{if(mySeq===seq&&speaking&&!ended){if(isIOS){playRemote(text,mySeq,btn);}else{heardNothing();}}},7000);
    speechSynthesis.speak(u);
  }catch(e){speaking=false;resetBtn();}
}
function play(text,mySeq,btn){ if(isIOS)playLocal(text,mySeq,btn,false); else playRemote(text,mySeq,btn); }
window.stopSpeak=stopAll;
window.speakJP=function(text){
  const btn=document.activeElement&&document.activeElement.classList&&document.activeElement.classList.contains('speak')?document.activeElement:null;
  if(speaking){
    const same=btn&&curBtn&&btn===curBtn;
    stopAll();
    if(same)return; // tapped same button = stop
    const my=++seq;play(text,my,btn);
    return;
  }
  stopAll();
  const my=++seq;play(text,my,btn);
};
// Warm up + preload voices AND unlock audio on first gesture (iOS requirement)
document.addEventListener('pointerdown',function once(){
  try{
    if('speechSynthesis' in window){speechSynthesis.getVoices();const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u);speechSynthesis.cancel();}
    const a=new Audio();a.volume=0;const p=a.play();if(p&&p.catch)p.catch(()=>{});
  }catch(e){}
  document.removeEventListener('pointerdown',once);
});
})();
