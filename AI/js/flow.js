window.flowRunner=(function(){
"use strict";

var testCtx=null;
var chatEl=null;

function $(s){return document.querySelector(s);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}

function stepIds(){
 for(var i=0;i<nodes.length;i++){ var n=nodes[i]; if(n.type==="start") return n.id; }
 return nodes.length?nodes[0].id:null;
}

function setBadge(mode){
 var b=$("#testBadge");
 var pill=$("#aiPill");
 pill.className="ai-pill";
 $('#aiPillText').textContent=AI.label();
 if(!b)return;
 if(mode==="cloud"){
  b.innerHTML="brain: <b>cloud AI</b>";
  b.className="mini-badge cloud"; if(pill)pill.classList.add("cloud");
 }else if(mode==="rule"){
  b.innerHTML="brain: <b>on-device NLU</b>";
  b.className="mini-badge"; pill.classList.remove("cloud"); pill.classList.remove("off");
 }else if(mode==="static"||!mode){
  b.innerHTML="brain: <b>rules</b>";
  b.className="mini-badge"; pill.classList.remove("cloud");
  if(!AI.cloudAllowed()) pill.classList.add("off");
 }else{
  b.innerHTML="brain: rules";
  b.className="mini-badge";
 }
}

function append(el){
 chatEl.appendChild(el);
 chatEl.scrollTop=chatEl.scrollHeight;
}

function sysRow(txt){
 if(!chatEl) return;
 if(!$("#ovTest").classList.contains("open")) return;
 var d=document.createElement("div");d.className="sys-row";
 d.innerHTML='<span class="sys">'+esc(txt)+'</span>';
 append(d);
}

function userMsg(txt){
 var d=document.createElement("div");d.className="user-row";
 d.innerHTML='<div class="bubble">'+esc(txt)+'</div>';
 append(d);
}

function hintRow(txt){
 if(!txt)return;
 var d=document.createElement("div");d.className="hint-row";
 d.innerHTML='<span class="hint">'+esc(txt)+'</span>';
 append(d);
}

function typingDots(){
 var d=document.createElement("div");d.className="bot-row";
 d.innerHTML='<div class="av"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 0 1 7 7c0 2.1-1 4-2.5 5.2V17a2 2 0 0 1-2 2h-1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2h-1a2 2 0 0 1-2-2v-2.8C6 13 5 11.1 5 9a7 7 0 0 1 7-7z"/></svg></div>'
   +'<div class="typing"><span></span><span></span><span></span></div>';
 append(d);
 return d;
}

function botMsg(txt, done){
 var chars=(txt||"").split("");
 var d=document.createElement("div");d.className="bot-row";
 d.innerHTML='<div class="av"><svg viewBox="0 0 24 24" fill="none"><path d="M12 2a7 7 0 0 1 7 7c0 2.1-1 4-2.5 5.2V17a2 2 0 0 1-2 2h-1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2h-1a2 2 0 0 1-2-2v-2.8C6 13 5 11.1 5 9a7 7 0 0 1 7-7z"/></svg></div>'
   +'<div class="bubble"></div>';
 append(d);
 var bubble=d.querySelector(".bubble");
 var i=0;
 var spd=(store&&store.speed)||600;
 function tick(){
  bubble.textContent=chars.slice(0,i).join("");
  if(chatEl)chatEl.scrollTop=chatEl.scrollHeight;
  if(i>=chars.length){
   if(done)setTimeout(function(){if(testCtx)testCtx.busy=false;done();},240);
   return;
  }
  i++;
  var last=chars[i-1];
  var dly=/[.,!?;:…]/.test(last)?170:(i%5===0?Math.min(spd/3,90):24);
  setTimeout(tick,dly);
 }
 tick();
}

function busy(){
 if(testCtx)testCtx.busy=true;
 typingDots();
}

function nextOf(n){
 if(!n||!n.branches||!n.branches.length)return null;
 return byid(n.branches[0].target);
}

function endChat(){
 var d=document.createElement("div");d.className="done-row";
 d.textContent="--- end of conversation ---";
 append(d);
 var r=document.createElement("div");r.className="opts";
 var b=document.createElement("button");
 b.textContent="Start over";
 b.addEventListener("click",function(){openTest();});
 r.appendChild(b);
 append(r);
 if(testCtx)testCtx.busy=false;
}

function doNode(id){
 if(testCtx&&testCtx.busy)return;
 var n=byid(id);
 if(!n){endChat();return;}
 testCtx.busy=true;
 busy();
 botMsg(n.content,function(){
  hintRow(n.hint);
  stepInto(n);
 });
}

function adv(n){
 if(!n){endChat();return;}
 wait(430).then(function(){doNode(n.id);});
}

function stepInto(n){
 if(!n)return;
 switch(n.type){
  case "start":
  case "message":
  case "redirect":
   setBadge("");
   adv(nextOf(n));
   break;
  case "question":
   if(n.mode==="options") renderOptions(n);
   else renderFree(n);
   break;
  case "action":
   fireAction(n).then(function(){adv(nextOf(n));});
   break;
  case "end":
   setBadge("");
   endChat();
   break;
 }
}

function renderOptions(n){
 var wrap=document.createElement("div");wrap.className="opts";
 for(var i=0;i<n.branches.length;i++){
  (function(br){
   var b=document.createElement("button");
   b.textContent=br.label||"Option "+(i+1);
   b.addEventListener("click",function(){
    if(testCtx&&testCtx.busy)return;
    userMsg(b.textContent);
    if(br.target)wait(250).then(function(){doNode(br.target);});
    else endChat();
   });
   wrap.appendChild(b);
  })(n.branches[i]);
 }
 append(wrap);
}

function freeWidget(n){
 var wrap=document.createElement("div");wrap.className="chat-input";
 wrap.innerHTML='<input placeholder="Type a reply…"><button class="btn primary">Send</button>';
 append(wrap);
 var inp=wrap.querySelector("input"),snd=wrap.querySelector("button");
 function submit(){
  var v=inp.value.trim();
  if(!v||(testCtx&&testCtx.busy))return;
  userMsg(v);
  wrap.remove();
  handleFree(n,v);
 }
 snd.addEventListener("click",submit);
 inp.addEventListener("keydown",function(e){if(e.key==="Enter")submit();});
 inp.focus();
}

function renderFree(n){ freeWidget(n); }

function firstTrigger(text){
 var t=text.toLowerCase();
 var trs=(store&&store.triggers)||[];
 for(var i=0;i<trs.length;i++){
  var keys=String(trs[i].keywords||"").split(",").map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
  for(var k=0;k<keys.length;k++){
   if(t.indexOf(keys[k])>-1)return trs[i];
  }
 }
 return null;
}

function handleFree(n,text){
 var tr=firstTrigger(text);
 if(tr){
  if(tr.message){
   testCtx.busy=true;
   botMsg(tr.message,function(){goT(tr.nodeId);});
   setBadge("");
  }else goT(tr.nodeId);
  return;
 }
 var t=text.toLowerCase();
 var matched=null;
 for(var j=0;j<n.branches.length;j++){
  var m=String(n.branches[j].match||"").toLowerCase();
  if(m&&t.indexOf(m)>-1){matched=n.branches[j];break;}
 }
 if(matched&&matched.target){goT(matched.target);return;}
 if(AI.mode()==="off"){
  fallbackReply(n);
  return;
 }
 testCtx.busy=true;
 busy();
 AI.think(text,n).then(function(res){
  if(!res||!res.text){fallbackReply(n);return;}
  setBadge(res.mode);
  botMsg(res.text,function(){
   hintRow(n.hint);
   renderFree(n);
  });
 }).catch(function(){fallbackReply(n);});
}

function fallbackReply(n){
 testCtx.busy=true;
 botMsg((store&&store.fallback)||"Sorry, I didn't catch that.",function(){
  testCtx.busy=false;
  hintRow(n.hint);
  renderFree(n);
 });
}

function goT(id){
 if(id&&byid(id))doNode(id);
 else endChat();
}

function fireAction(n){
 return new Promise(function(resolve){
  var a=n.action||{};
  if(a.type==="log"){
   sysRow("[log] "+(a.message||"entry logged"));
   wait(450).then(resolve);
   return;
  }
  if(a.type==="email"){
   sysRow("[email] → "+(a.email||"recipient"));
   wait(650).then(resolve);
   return;
  }
  var url=a.url||"";
  sysRow("[webhook] POST "+(url||"no url configured"));
  if(!url){wait(500).then(resolve);return;}
  var body=JSON.stringify({source:"chatbot-builder",payload:a.message||"",bot:store?store.name:""});
  fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:body})
   .then(function(r){sysRow("status "+(r.ok?r.status+" OK":r.status+" failed"));resolve();})
   .catch(function(){sysRow("network unreachable — logged anyway (offline)");wait(600).then(resolve);});
 });
}

function openTest(){
 var id=stepIds();
 if(!id){toast("Drop a Start node first (use Load sample for a full flow).",true);return;}
 closePick();
 $("#testTitle").textContent=(store&&store.name)||"Untitled bot";
 $("#ovTest").classList.add("open");
 chatEl=$("#chat");
 chatEl.innerHTML="";
 testCtx={busy:false};
 setBadge("");
 AI.ping().then(function(ok){
  if($("#aiPill")){$('#aiPillText').textContent=AI.label()+(ok?" · online":" · offline");}
 });
 var n=byid(id);
 testCtx.busy=true;
 typingDots();
 botMsg(n.content,function(){
  hintRow(n.hint);
  stepInto(n);
 });
}

function closePick(){ if(typeof closeLeft==="function")closeLeft(); }

window.openTest=openTest;
window.fireAction=fireAction;
window.setAIBadge=setBadge;

return {openTest:openTest};
})();