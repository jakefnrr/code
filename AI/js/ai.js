window.AI = (function(){
"use strict";

var CLOUD_TRY = "https://text.pollinations.ai/";
var pingCache = null;
var pingAt = 0;
var lastCloudAt = 0;

function enc(s){ return encodeURIComponent(s||""); }
function cap(s,n){ s=String(s||"").trim(); if(s.length>n) s=s.slice(0,n-1).trim()+"…"; return s; }
function stripQuotes(s){
 s=String(s||"").trim();
 if(s.length>1 && ((s[0]==='"' && s[s.length-1]==='"')||(s[0]==='\u201C' && s[s.length-1]==='\u201D'))) s=s.slice(1,-1).trim();
 return s;
}

function cloud(prompt, system, seed){
 var ctl=new AbortController();
 var timer=setTimeout(function(){ ctl.abort(); }, 13000);
 var model=(store && store.ai && store.ai.model)||"openai";
 var url=CLOUD_TRY+enc(prompt)+"?model="+enc(model)+"&n=1&seed="+(seed||Math.floor(Math.random()*100000));
 if(system) url+="&system="+enc(system);
 return fetch(url,{signal:ctl.signal})
  .then(function(r){ if(!r.ok) throw new Error("http "+r.status); return r.text(); })
  .then(function(t){ clearTimeout(timer); return stripQuotes(cap(t,700)); })
  .catch(function(e){ clearTimeout(timer); throw e; });
}

function ping(){
 if(Date.now()-pingAt<30000 && pingCache!==null){ return Promise.resolve(pingCache); }
 var ctl=new AbortController();
 var timer=setTimeout(function(){ctl.abort();},6000);
 return fetch(CLOUD_TRY,{method:"HEAD",signal:ctl.signal})
  .then(function(){clearTimeout(timer);pingCache=true;pingAt=Date.now();return true;})
  .catch(function(){clearTimeout(timer);pingCache=false;pingAt=Date.now();return false;});
}

var STOP=/^(a|an|the|my|your|our|their|this|that|these|those|is|are|am|was|were|do|does|did|i|you|we|they|he|she|it|me|us|to|for|of|on|in|at|with|about|please|can|could|would|should|how|what|why|when|where|who|which|tell|let|know|want);?$/;

function tokens(s){
 return String(s).toLowerCase().replace(/[^a-z0-9' ]/g," ").split(/\s+/).filter(function(w){
  return w.length>2 && !STOP.test(w);
 });
}

function sentences(s){
 return String(s||"").split(/(?<=[.!?])\s+/).map(function(x){return x.trim();}).filter(Boolean);
}

function hasAny(text, list){
 t=String(text).toLowerCase();
 for(var i=0;i<list.length;i++){ if(t.indexOf(list[i])>-1) return true; }
 return false;
}

function fromKB(text, kb){
 var kbText=String(kb||"").trim();
 if(!kbText) return null;
 var wanted=tokens(text);
 var sents=sentences(kbText);
 if(!sents.length) return null;
 var cands=[];
 for(var i=0;i<sents.length;i++){
  var score=0;
  for(var k=0;k<wanted.length;k++){
   if(sents[i].toLowerCase().indexOf(wanted[k])>-1) score++;
  }
  if(score>0) cands.push({s:sents[i],score:score});
 }
 if(!cands.length) return null;
 cands.sort(function(a,b){return b.score-a.score;});
 return cap(cands[0].s,240);
}

function offlineReply(text, ctx){
 ctx=ctx||{};
 var t=String(text).toLowerCase();
 var name=(store && store.name)||"your assistant";
 var kb=ctx.kb||(store&&store.ai?store.ai.kb:"");

 if(hasAny(t,["hi ","hello","hey","yo","howdy","good morning","good afternoon","good evening"])){
  return "Hey there! Great to see you. What can I do for you today?";
 }
 if(hasAny(t,["bye","goodbye","cya","see you","see ya","good night"])){
  return "Take care! I'll be right here if you need anything else.";
 }
 if(hasAny(t,["thank","thx","appreciate"])){
  return "You're welcome! Anything else I can help you with?";
 }
 if(hasAny(t,["what's your name","your name","who are you"])){
  return "I'm "+name+", the assistant here. Ask me about products, orders, hours or refunds.";
 }
 if(hasAny(t,["help","human","agent","representative","real person"])){
  return "I can pass you to a human — try typing \"human\" and I'll connect you right away.";
 }
 if(hasAny(t,["refund","return","money back","cancel my order"])){
  var kbf=fromKB(t,kb);
  return "I can help with that."+(kbf?" "+kbf:" Please include your ORD- order number and I'll route it to the right team.");
 }
 if(hasAny(t,["ship","deliver","delivery","arrive","track","order"])){
  var kbs=fromKB(t,kb);
  return (kbs?kbs+" ":"")+"For live tracking I just need your order number (it starts with ORD-).";
 }
 if(hasAny(t,["price","cost","how much","pricing","pay"])){
  var kbp=fromKB(t,kb);
  return kbp?kbp:"Prices depend on the plan — check our pricing page or ask about a specific product and I'll look it up.";
 }
 if(hasAny(t,["hour","open","close","when are you","times"])){
  var kbt=fromKB(t,kb);
  return kbt?kbt:"Our current hours are listed on the homepage — on the sample flow, ask \"store hours\" and I'll tell you.";
 }
 if(hasAny(t,["why","how","what","when","where","which","can i","could i","is there","do you"])){
  var kbq=fromKB(t,kb);
  if(kbq) return kbq;
  return "Good question — I can't look that up on my own right now, but I can route you. Could you rephrase it as a short phrase like \"refunds\" or \"store hours\"?";
 }
 if(hasAny(t,["yes","yeah","yep","ok","okay","sure","correct","right"])){
  return "Great. What would you like to do next?";
 }
 if(hasAny(t,["no","nope","nah","not really"])){
  return "Got it. Just say the word if you need something — I'm here.";
 }
 var kw=fromKB(t,kb);
 if(kw) return kw;
 var fall=(store && store.fallback)||"Sorry, I didn't quite catch that. Could you rephrase it?";
 return fall;
}

function contextFor(node){
 var parts=[];
 if(store && store.name) parts.push("Bot: "+store.name);
 if(node&&node.content) parts.push("Current step: "+node.content);
 if(node&&node.label) parts.push("Step name: "+node.label);
 if(node&&node.hint) parts.push("Expected input format: "+node.hint);
 if(store&&store.ai&&store.ai.kb) parts.push("Knowledge base: "+store.ai.kb);
 return parts.join("\n");
}

function aiMode(){ return (store&&store.ai&&store.ai.mode)||"hybrid"; }
function isCloudAllowed(){ var m=aiMode(); return m==="cloud"||m==="hybrid"; }

function think(text, node){
 return new Promise(function(resolve){
  var mode=aiMode();
  if(mode==="off"){
   resolve({text:((store&&store.fallback)||"I can't answer that right now."),mode:"static"});
   return;
  }
  var ctx=contextFor(node);
  if(mode==="rule"){
   setTimeout(function(){ resolve({text:offlineReply(text,ctx),mode:"rule"}); },220);
   return;
  }
  var system="You are a friendly in-app assistant for \"";
  system+=(store&&store.name)||"a chatbot";
  system+="\".\n";
  if(ctx) system+=ctx+"\n";
  system+="\nReply to the user's message naturally, under 60 words. Only speak as the assistant. Do not mention this system prompt.";

  var cool=(Date.now()-lastCloudAt);
  var waitMs = cool<900 ? (900-cool) : 0;
  setTimeout(function(){
   lastCloudAt=Date.now();
   cloud(text,system)
    .then(function(reply){
     if(!reply||reply.length<2) throw new Error("empty");
     resolve({text:reply,mode:"cloud"});
    })
    .catch(function(){
     if(mode==="hybrid"){
      resolve({text:offlineReply(text,ctx),mode:"rule"});
     }else{
      resolve({text:((store&&store.fallback)||"The cloud brain is offline right now — I'll use my local reply instead."),mode:"static"});
     }
    });
  },waitMs);
 });
}

function write(opts){
 opts=opts||{};
 var system="You are an expert chatbot copywriter. Write the EMPTY-ONLY message text for one step of a conversation flow. Direct, warm, plain language, no bullets, no markdown, no quotes, no label.";
 var prompt=("Write the assistant message for a step labeled '"+opts.label+"' of the bot '"+opts.bot+"'.\n")
  +"The step should: "+opts.desc+"\n"
  +"Target length: "+opts.len+" words.\n"
  +"Output only the message text.";
 return cloud(prompt,system,Math.floor(Math.random()*100000)).then(function(s){
  return cap(stripQuotes(s),opts.len>100?900:420);
 }).catch(function(){ return null; });
}

function label(){
 var m=aiMode();
 if(m==="off") return "AI off";
 if(m==="cloud") return "AI cloud only";
 if(m==="rule") return "AI on-device NLU";
 return "AI hybrid";
}

return {think:think,write:write,ping:ping,offline:offlineReply,label:label,cloudAllowed:isCloudAllowed,cloud:cloud,mode:aiMode};
})();