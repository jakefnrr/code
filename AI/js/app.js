"use strict";
var KEY="aichatbot_builder_v4";
var TS=[
 {id:"start",name:"Start",color:"#00ff88",single:1,desc:"Entry point"},
 {id:"message",name:"Message",color:"#3ddc6f",single:1,desc:"Bot says this"},
 {id:"question",name:"Question",color:"#ffd166",desc:"Choice or free text"},
 {id:"action",name:"Action",color:"#b18cff",single:1,desc:"Automation step"},
 {id:"redirect",name:"Redirect",color:"#ff87ab",single:1,desc:"Jump to a node"},
 {id:"end",name:"End",color:"#ff5f5f",desc:"Stop the flow"}
];

var store={
 name:"Nova Assistant",
 fallback:"Sorry, I didn't quite catch that. Could you rephrase it?",
 speed:600,
 triggers:[],
 ai:{mode:"hybrid",model:"openai",kb:""}
};
var nodes=[];
var view={x:40,y:40,z:1};
var sel=null,esel=null,placeType=null,gesture=null,wrapCache=null;

function $(s){return document.querySelector(s);}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function uid(){return "n"+Math.random().toString(36).slice(2,7);}
function byid(id){for(var i=0;i<nodes.length;i++)if(nodes[i].id===id)return nodes[i];return null;}
function typeOf(t){for(var i=0;i<TS.length;i++)if(TS[i].id===t)return TS[i];return TS[0];}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function debounce(fn,ms){var t;return function(){clearTimeout(t);t=setTimeout(fn,ms);};}
function toast(msg,err){
 var t=$("#toast");
 t.textContent=msg;t.className="toast"+(err?" err":"")+" show";
 clearTimeout(toast._t);
 toast._t=setTimeout(function(){t.classList.remove("show");},1900);
}

function mk(type,x,y){
 return {id:uid(),type:type,label:typeOf(type).name,x:Math.round(x/16)*16,y:Math.round(y/16)*16,
  content:"",hint:"",mode:"options",branches:[],
  action:{type:"webhook",url:"",email:"",subject:"",message:""}};
}
function br(label,target,match){return {label:label||"",match:match||"",target:target||null};}
function singleTarget(n){return n.branches[0]?n.branches[0].target:null;}
function setSingle(n,t){if(!n.branches[0])n.branches.push(br("",t));else n.branches[0].target=t;}
function actName(t){return t==="email"?"email":t==="log"?"log":"webhook";}

function seed(){
 nodes=[
  {id:"s1",type:"start",label:"Start",x:100,y:210,content:"Hi, I'm Nova — your store assistant. I can track orders, share hours and run refunds.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s2")]},
  {id:"s2",type:"message",label:"Intro",x:400,y:210,content:"Ask me about an order, store hours, or returns. Type 'human' anytime to talk to a person.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s3")]},
  {id:"s3",type:"question",label:"Main menu",x:700,y:210,content:"What would you like help with today?",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("Check my order","s4"),br("Store hours","s5"),br("Start a refund","s6"),br("Just browsing","s7")]},
  {id:"s4",type:"question",label:"Order lookup",x:1000,y:120,content:"Please type your order number, e.g. ORD-1024.",hint:"It starts with ORD-",mode:"free",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("found","s8","ord-")]},
  {id:"s5",type:"message",label:"Store hours",x:1000,y:420,content:"We're open Mon–Sat 9am–8pm and Sun 10am–6pm. Closed public holidays.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s10")]},
  {id:"s6",type:"question",label:"Refunds",x:700,y:470,content:"Tell me a bit about the issue. Including your ORD- number speeds things up.",hint:"Include the ORD- number if you have it",mode:"free",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("refund route","s11","ord-")]},
  {id:"s7",type:"message",label:"Browsing",x:700,y:760,content:"Feel free to browse. Ask me for product details or check out this week's deals.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s10")]},
  {id:"s8",type:"action",label:"Fetch order",x:1300,y:100,content:"Fetching your order from the warehouse system…",hint:"",mode:"options",action:{type:"webhook",url:"https://api.example.com/orders",email:"",subject:"",message:"ORDER_LOOKUP"},branches:[br("","s12")]},
  {id:"s9",type:"message",label:"Bad input",x:1300,y:320,content:"That doesn't look like a valid order number — please double-check it.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s4")]},
  {id:"s10",type:"message",label:"Anything else?",x:1000,y:620,content:"Anything else I can help you with?",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s3")]},
  {id:"s11",type:"action",label:"Refund request",x:1000,y:720,content:"Submitting your refund request…",hint:"",mode:"options",action:{type:"webhook",url:"https://api.example.com/refunds",email:"support@example.com",subject:"Refund request",message:"REFUND_REQUEST"},branches:[br("","s13")]},
  {id:"s12",type:"message",label:"Order found",x:1600,y:100,content:"Found it! Your order shipped today and should arrive in 2–3 business days.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s10")]},
  {id:"s13",type:"message",label:"Refund submitted",x:1300,y:800,content:"Your refund request is in. You'll get a confirmation email within the hour.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[br("","s10")]},
  {id:"t1",type:"message",label:"Human handoff",x:1300,y:540,content:"No problem — connecting you with a human agent now. Please hold on the line.",hint:"",mode:"options",action:{type:"webhook",url:"",email:"",subject:"",message:""},branches:[]}
 ];
 store.name="Nova Assistant";
 store.fallback="Sorry, I didn't quite catch that. Could you rephrase it?";
 store.speed=600;
 store.ai={mode:"hybrid",model:"openai",kb:"Nova Store. Hours: Mon–Sat 9am–8pm, Sun 10am–6pm.\nShipping: free over $50, same-day dispatch, 2–3 business days.\nRefunds: accepted within 30 days, no questions asked.\nPlans: Standard $19/mo, Pro $49/mo with priority support.\nOrders: start with ORD-, e.g. ORD-1024."};
 store.triggers=[
  {keywords:"human,agent,representative,person",nodeId:"t1",message:"One moment, I'll get you a real human."},
  {keywords:"hi,hello,hey,yo,sup",nodeId:"s2",message:""}
 ];
}

function save(){
 try{localStorage.setItem(KEY,JSON.stringify({store:store,nodes:nodes,view:view}));}catch(e){}
 var d=new Date(),p=function(x){return(x<10?"0":"")+x;};
 $("#saveText").textContent="Autosaved "+p(d.getHours())+":"+p(d.getMinutes())+":"+p(d.getSeconds());
}
var saveSoon=debounce(save,350);

function loadStore(){
 try{
  var raw=localStorage.getItem(KEY);
  if(!raw){seed();return;}
  var data=JSON.parse(raw);
  if(!Array.isArray(data.nodes)||!data.nodes.length){seed();return;}
  store=Object.assign(store,data.store||{});
  store.ai=Object.assign({mode:"hybrid",model:"openai",kb:""},store.ai||{});
  nodes=data.nodes.map(function(n){
   var nn=mk(n.type||"message",n.x||100,n.y||100);
   nn.id=n.id;nn.label=n.label||"";nn.content=n.content||"";nn.hint=n.hint||"";nn.mode=n.mode||"options";
   nn.branches=(n.branches||[]).map(function(b){return br(b.label,b.target,b.match);});
   nn.action=Object.assign({type:"webhook",url:"",email:"",subject:"",message:""},n.action||{});
   return nn;
  });
  if(data.view)view=data.view;
 }catch(e){seed();}
}

function updateAIPill(){
 var pill=$("#aiPill");
 pill.className="ai-pill";
 var off=store.ai.mode==="off";
 $('#aiPillText').textContent=AI.label()+(off?"":"");
 if(store.ai.mode==="cloud"||store.ai.mode==="hybrid")pill.classList.add("cloud");
 if(off)pill.classList.add("off");
}

function stats(){
 var edges=0;
 for(var i=0;i<nodes.length;i++){var n=nodes[i];for(var k=0;k<n.branches.length;k++)if(n.branches[k].target)edges++;}
 $("#statsBox").innerHTML="<b>"+nodes.length+"</b> nodes<br><b>"+edges+"</b> connections<br><b>"+store.triggers.length+"</b> triggers";
 $("#footFlow").textContent=nodes.length+" nodes · "+edges+" connections";
}

function getWrap(){if(!wrapCache)wrapCache=$("#cwrap").getBoundingClientRect();return wrapCache;}
function refreshWrap(){wrapCache=$("#cwrap").getBoundingClientRect();}
function toWorld(cx,cy){
 var r=getWrap();
 return {x:(cx-r.left-view.x)/view.z,y:(cy-r.top-view.y)/view.z};
}
function applyTransform(){
 $("#world").style.transform="translate("+view.x+"px,"+view.y+"px) scale("+view.z+")";
}

function zoomAt(px,py,f){
	var r=$("#cwrap").getBoundingClientRect();
	var sx=px-r.left,sy=py-r.top;
	var wx=(sx-view.x)/view.z,wy=(sy-view.y)/view.z;
	var nz=clamp(view.z*f,0.25,1.8);
	view.z=nz;view.x=sx-wx*nz;view.y=sy-wy*nz;
	applyTransform();
}

function fitView(){
 if(!nodes.length){view.x=40;view.y=40;view.z=1;applyTransform();return;}
 var minx=1e9,miny=1e9,maxx=-1e9,maxy=-1e9;
 for(var i=0;i<nodes.length;i++){var n=nodes[i];minx=Math.min(minx,n.x-60);miny=Math.min(miny,n.y-60);maxx=Math.max(maxx,n.x+260);maxy=Math.max(maxy,n.y+120);}
 var w=$("#cwrap").clientWidth,h=$("#cwrap").clientHeight;
 var zw=clamp((w-80)/(maxx-minx),0.22,1.5),zh=clamp((h-80)/(maxy-miny),0.22,1.5);
 view.z=Math.min(zw,zh,1.5);
 view.x=40-(minx*view.z);view.y=26-(miny*view.z);
 render();
}

function renderEdges(){
 var svg=$("#edgeSvg");
 var html="";
 var edgeList=[];
 for(var i=0;i<nodes.length;i++){
  var n=nodes[i];
  for(var k=0;k<n.branches.length;k++){
   if(n.branches[k].target)edgeList.push({from:n.id,bi:k,to:n.branches[k].target,label:n.branches[k].label||n.branches[k].match||""});
  }
 }
 for(var i=0;i<edgeList.length;i++){
  var e=edgeList[i];
  var sN=byid(e.from),tN=byid(e.to);
  if(!sN||!tN)continue;
  var sEl=document.getElementById("node-"+e.from),tEl=document.getElementById("node-"+e.to);
  var sx,sy,tx,ty;
  if(sEl){sx=sEl.offsetLeft+sEl.offsetWidth;sy=sEl.offsetTop+sEl.offsetHeight/2;}else{sx=sN.x+200;sy=sN.y+45;}
  if(tEl){tx=tEl.offsetLeft;ty=tEl.offsetTop+tEl.offsetHeight/2;}else{tx=tN.x;ty=tN.y+45;}
  var dx=Math.max(50,Math.abs(tx-sx)*0.45);
  var d="M "+sx+" "+sy+" C "+(sx+dx)+" "+sy+", "+(tx-dx)+" "+ty+", "+tx+" "+ty;
  var mx=(sx+3*(sx+dx)+3*(tx-dx)+tx)/8,my=(sy+3*sy+3*ty+ty)/8;
  var lbl=e.label.length*6.6+12;
  var on=(esel&&esel.from===e.from&&esel.bi===e.bi)?" on":"";
  html+='<g class="edge'+on+'" data-from="'+e.from+'" data-bi="'+e.bi+'">'
   +'<path class="hit" d="'+d+'"/>'
   +'<path class="line" d="'+d+'"/>'
   +'<g class="edge-label" transform="translate('+mx+','+my+')">'
   +'<rect x="'+(-lbl/2)+'" y="-9" width="'+lbl+'" height="18"/>'
   +'<text>'+esc(e.label)+'</text></g></g>';
 }
 svg.innerHTML=html;
 svg.querySelectorAll(".hit").forEach(function(p){
  p.addEventListener("click",function(ev){
   ev.stopPropagation();
   var g=p.closest(".edge");
   sel=null;esel={from:g.dataset.from,bi:parseInt(g.dataset.bi,10),to:byid(g.dataset.from)?byid(g.dataset.from).branches[parseInt(g.dataset.bi,10)].target:null};
   renderCanvas();renderInspector();
  });
 });
}

function nodePreview(n){
 if(n.type==="end")return '<span style="color:var(--muted)">Terminal step</span>';
 if(n.type==="action")return '<span style="color:var(--violet)">'+esc(actName(n.action.type)+(n.action.url||n.action.email?" · "+esc(n.action.url||n.action.email):""))+'</span>';
 if(n.type==="question"){
  if(n.mode==="options"){
   var o=0;for(var i=0;i<n.branches.length;i++)if(n.branches[i].label||n.branches[i].target)o++;
   return esc((n.content||"Ask a question…").slice(0,60))+'<br><span class="opt">'+o+' options</span>';
  }
  return esc((n.content||"Ask a question…").slice(0,60))+'<br><span class="opt">free text</span> <span class="opt">AI brain</span>';
 }
 if(n.type==="redirect"){
  var tg=n.branches[0]?n.branches[0].target:null;
  var tn=tg?byid(tg):null;
  return '<span style="color:var(--pink)">→ '+esc(tn?tn.label:"(end)")+'</span>';
 }
 return n.content?esc(n.content.slice(0,70)):'<span style="color:var(--muted)">No message yet</span>';
}

function nodeBox(n){
 return '<div class="node t-'+n.type+(sel===n.id?" sel":"")+'" id="node-'+n.id+'" data-id="'+n.id+'" style="left:'+n.x+'px;top:'+n.y+'px">'
  +'<div class="nbar" style="background:'+typeOf(n.type).color+'"></div>'
  +'<div class="node-head"><span class="ndot" style="background:'+typeOf(n.type).color+'"></span>'
  +'<span class="nl">'+esc(n.label||typeOf(n.type).name)+'</span><span class="nt">'+n.type+'</span></div>'
  +'<div class="node-body">'+nodePreview(n)+'</div>'
  +'<div class="ports">'
  +(n.type!=="start"?'<span class="pin"></span>':'')
  +(n.type==="end"?'':'<span class="pout" title="Drag to connect"></span>')
  +'</div></div>';
}

function renderCanvas(){
 var w=$("#world");
 var nhtml="";
 for(var i=0;i<nodes.length;i++)nhtml+=nodeBox(nodes[i]);
 w.innerHTML='<svg id="edgeSvg" width="4000" height="3200"></svg>'+nhtml;
 renderEdges();
 attachNodes();
 $("#emptyHint").classList.toggle("hidden",nodes.length>0);
 applyTransform();
}
function render(){renderCanvas();stats();}

function updatePal(){
 $("#palList").innerHTML=TS.map(function(t){
  return '<div class="pal-item'+(placeType===t.id?" active":"")+'" data-t="'+t.id+'">'
   +'<span class="sw" style="background:'+t.color+';box-shadow:0 0 8px '+t.color+'55"></span>'
   +'<span><span class="nm">'+t.name+'</span><span class="tx">'+t.desc+'</span></span></div>';
 }).join("");
 $("#palList").querySelectorAll(".pal-item").forEach(function(el){
  el.addEventListener("click",function(){
   placeType=(placeType===el.dataset.t?null:el.dataset.t);
   updatePal();
   $("#palette").classList.add("open");
   syncBackdrop();
   if(placeType)toast("Place mode: click the canvas to drop this node.");
   else toast("Place mode off.");
  });
 });
}

function attachNodes(){
 document.querySelectorAll(".node").forEach(function(el){
  el.addEventListener("pointerdown",function(ev){
   ev.stopPropagation();
   var id=el.dataset.id;
   if(ev.target.closest(".pout")){startConnect(ev,id);return;}
   refreshWrap();
   sel=id;esel=null;placeType=null;
   updatePal();
   renderCanvas();renderInspector();
   openInspector();
   var n=byid(id);
   gesture={mode:"drag",id:id,start:{x:n.x,y:n.y},wstart:toWorld(ev.clientX,ev.clientY)};
   capture(ev);
  });
 });
}

function capture(ev){try{$("#world").setPointerCapture(ev.pointerId);}catch(e){}}

function startConnect(ev,id){
 ev.preventDefault();
 refreshWrap();
 sel=id;esel=null;placeType=null;
 updatePal();
 renderCanvas();renderInspector();
 openInspector();
 gesture={mode:"connect",src:id};
 var svg=$("#edgeSvg");
 var startEl=document.getElementById("node-"+id);
 var pr=document.createElementNS("http://www.w3.org/2000/svg","path");
 pr.id="preview";
 svg.appendChild(pr);
 drawPreview(startEl.offsetLeft+startEl.offsetWidth,startEl.offsetTop+startEl.offsetHeight/2,(startEl.offsetLeft+200),(startEl.offsetTop+startEl.offsetHeight/2));
 capture(ev);
}

function drawPreview(x1,y1,x2,y2){
 var pr=document.getElementById("preview");
 if(!pr)return;
 var dx=Math.max(50,Math.abs(x2-x1)*0.45);
 pr.setAttribute("d","M "+x1+" "+y1+" C "+(x1+dx)+" "+y1+", "+(x2-dx)+" "+y2+", "+x2+" "+y2);
}

$("#world").addEventListener("pointerdown",function(ev){
 if(ev.target.closest(".node"))return;
 refreshWrap();
 if(placeType){
  var pt=toWorld(ev.clientX,ev.clientY);
  var n=mk(placeType,clamp(pt.x-100,-400,3800),clamp(pt.y-24,-400,3000));
  if(n.type==="start")n.content="Hi! This is your new bot speaking.";
  if(n.type==="question")n.content="Ask a question…";
  if(n.type==="message")n.content="Type a bot message here.";
  nodes.push(n);
  placeType=null;updatePal();
  sel=n.id;esel=null;
  renderCanvas();renderInspector();openInspector();
  saveSoon();
  return;
 }
 var pt=toWorld(ev.clientX,ev.clientY);
 gesture={mode:"pan",ppx:pt.x,ppy:pt.y};
 capture(ev);
});

window.addEventListener("pointermove",function(ev){
 if(!gesture)return;
 refreshWrap();
 if(gesture.mode==="pan"){
  var pt=toWorld(ev.clientX,ev.clientY);
  view.x+=pt.x-gesture.ppx;view.y+=pt.y-gesture.ppy;
  gesture.ppx=pt.x;gesture.ppy=pt.y;
  applyTransform();
 }else if(gesture.mode==="drag"){
  var pt=toWorld(ev.clientX,ev.clientY);
  var n=byid(gesture.id);
  if(!n)return;
  n.x=Math.round(gesture.start.x+(pt.x-gesture.wstart.x));
  n.y=Math.round(gesture.start.y+(pt.y-gesture.wstart.y));
  var el=document.getElementById("node-"+gesture.id);
  if(el){el.style.left=n.x+"px";el.style.top=n.y+"px";}
  renderEdges();
 }else if(gesture.mode==="connect"){
  var pt=toWorld(ev.clientX,ev.clientY);
  var startEl=document.getElementById("node-"+gesture.src);
  if(startEl)drawPreview(startEl.offsetLeft+startEl.offsetWidth,startEl.offsetTop+startEl.offsetHeight/2,pt.x,pt.y);
 }
});

window.addEventListener("pointerup",function(ev){
 if(!gesture)return;
 if(gesture.mode==="connect"){
  var pr=document.getElementById("preview");if(pr)pr.remove();
  var el0=document.elementFromPoint(ev.clientX,ev.clientY);
  var nd=el0&&el0.closest?el0.closest(".node"):null;
  if(nd&&nd.dataset.id!==gesture.src){
   addConn(gesture.src,nd.dataset.id);
   sel=nd.dataset.id;esel=null;
   renderCanvas();renderInspector();openInspector();
  }
 }
 gesture=null;
 saveSoon();
});
window.addEventListener("pointercancel",function(ev){
 var pr=document.getElementById("preview");if(pr)pr.remove();
 gesture=null;
});

function addConn(src,tgt){
 var s=byid(src);
 if(!s)return;
 if(s.type==="question"){
  s.branches.push(br(s.mode==="options"?"Option "+(s.branches.length+1):"new route",tgt));
  toast("Connected. Rename this route in the inspector.");
 }else if(s.type==="end"){
  toast("End nodes can't send messages.",true);
 }else{
  setSingle(s,tgt);
  toast("Connected.");
 }
 saveSoon();
}

function targetOptions(except,empty){
 var h=empty?'<option value="">— end —</option>':"";
 for(var i=0;i<nodes.length;i++){var n=nodes[i];if(n.id===except)continue;
  h+='<option value="'+n.id+'">'+esc(n.label)+' ('+n.id.toLowerCase()+')</option>';}
 return h;
}

var aiNodeId=null;
function openAIWriter(id){
 aiNodeId=id;
 $("#aiDesc").value="";
 $("#aiLen").value="70";
 $("#aiBusy").style.display="none";
 $("#ovAI").classList.add("open");
 setTimeout(function(){$("#aiDesc").focus();},50);
}
$("#aiGo").addEventListener("click",function(){
 var n=byid(aiNodeId);
 var desc=$("#aiDesc").value.trim();
 if(!desc){toast("Describe the step first.",true);return;}
 $("#aiBusy").style.display="block";
 $("#aiGo").disabled=true;
 AI.write({bot:store.name,label:n?n.label:"",desc:desc,len:parseInt($("#aiLen").value,10)}).then(function(txt){
  $("#aiBusy").style.display="none";
  $("#aiGo").disabled=false;
  if(txt===null||txt===undefined){toast("Cloud AI unreachable — check your connection.",true);return;}
  if(n){n.content=txt;renderCanvas();renderInspector();saveSoon();}
  $("#ovAI").classList.remove("open");
  toast("AI copy inserted.");
 }).catch(function(){ $("#aiBusy").style.display="none"; $("#aiGo").disabled=false; toast("Generation failed.",true); });
});

function renderInspector(){
 var c=$("#inspContent");
 if(esel){
  var sN=byid(esel.from),tN=byid(esel.to);
  if(!sN||!tN){c.innerHTML='<div class="insp-empty">Nothing selected.</div>';return;}
  var bi=esel.bi;
  var t=typeOf(sN.type).color;
  var isQ=sN.type==="question";
  c.innerHTML='<div class="insp-head"><span class="ndot" style="background:'+t+'"></span><h3>Connection</h3></div>'
   +'<div class="kv">'+esc(sN.label)+' <b style="color:var(--acc)">→</b> '+esc(tN.label)+'</div>'
   +(isQ?'<label>Route label</label><input id="eLabel" value="'+esc(sN.branches[bi].label)+'" placeholder="Option label / keyword">':'')
   +'<div class="hintline">This arrow is a route between two steps. For question nodes the label becomes a choice button or keyword rule.</div>'
   +'<button class="btn danger" id="eRemove" style="margin-top:14px">Remove connection</button>';
  var el=$("#eLabel");
  if(el)el.addEventListener("input",debounce(function(){sN.branches[bi].label=el.value;renderEdges();saveSoon();},180));
  $("#eRemove").addEventListener("click",function(){sN.branches[bi].target=null;esel=null;renderCanvas();renderInspector();saveSoon();toast("Connection removed.");});
  return;
 }
 if(!sel||!byid(sel)){
  c.innerHTML='<div class="insp-head"><span class="ndot" style="background:var(--muted2)"></span><h3>Inspector</h3></div>'
   +'<div class="insp-empty">Select a node to configure it, or tap a connection line to rename routes.</div>'
   +'<div class="hintline">Question nodes accept multiple outgoing lines — each becomes a choice or keyword route. Anything the rules miss goes to the AI brain.</div>';
  return;
 }
 var n=byid(sel),t=typeOf(n.type);
 var html='<div class="insp-head"><span class="ndot" style="background:'+t.color+'"></span><h3>'+t.name+'</h3></div>';
 html+='<label>Label</label><input id="iLabel" value="'+esc(n.label)+'" placeholder="Short step name">';
 if(n.type==="message"||n.type==="start"||n.type==="action"||(n.type==="question")){
  html+='<div style="display:flex;gap:6px;align-items:flex-end;margin-top:10px">'
   +'<label style="flex:1;margin:0">Message text</label>'
   +(store.ai.mode!=="off"?'<button class="btn sm" id="iAI" title="Let the free AI write this">AI <span style="color:var(--acc)">write</span></button>':'')
   +'</div><textarea id="iContent" rows="3">'+esc(n.content)+'</textarea>';
 }
 if(n.type==="question"){
  html+='<label>Mode</label><div class="seg" id="iMode">'
   +'<button data-m="options" class="'+(n.mode==="options"?"on":"")+'">Options</button>'
   +'<button data-m="free" class="'+(n.mode==="free"?"on":"")+'">Free text</button></div>';
  if(n.mode==="free"){
   html+='<label>Input hint (optional)</label><input id="iHint" value="'+esc(n.hint)+'" placeholder="e.g. starts with ORD-">';
  }
  html+='<label>'+(n.mode==="options"?"Options":"Keyword routes")+'</label><div class="rows">';
  for(var i=0;i<n.branches.length;i++){
   html+='<div class="row-item"><div class="r-top">'
    +'<input style="flex:1" data-f="label" data-b="'+i+'" value="'+esc(n.branches[i].label)+'" placeholder="'+(n.mode==="options"?"Option label":"keyword")+'">'
    +'<button class="row-remove" data-bx="'+i+'">✕</button></div>'
    +'<select data-btn="'+i+'">'+targetOptions(n.id,true)+'</select></div>';
  }
  html+='</div><button class="btn sm primary" id="iAdd">+ Add '+(n.mode==="options"?"option":"route")+'</button>';
 }
 if(n.type==="action"){
  html+='<label>Automation type</label><select id="iAtype">'
   +'<option value="webhook"'+(n.action.type==="webhook"?" selected":"")+'>Webhook POST</option>'
   +'<option value="email"'+(n.action.type==="email"?" selected":"")+'>Send email</option>'
   +'<option value="log"'+(n.action.type==="log"?" selected":"")+'>Log entry</option></select>';
  if(n.action.type==="webhook")html+='<label>Webhook URL</label><input id="iAurl" value="'+esc(n.action.url)+'" placeholder="https://api.example.com/hook">';
  if(n.action.type==="email")html+='<label>Recipient</label><input id="iAemail" value="'+esc(n.action.email)+'" placeholder="ops@company.com">';
  html+='<label>Payload / note</label><textarea id="iAmsg" rows="2">'+esc(n.action.message)+'</textarea>'
   +'<button class="btn sm" id="iAsend">Fire now (simulate)</button>';
 }
 if(n.type==="redirect"){
  html+='<label>Go to node</label><select id="iRedir">'+targetOptions(n.id,true)+'</select>';
 }
 if(n.type!=="end"&&n.type!=="question"&&n.type!=="redirect"){
  html+='<label>Next step</label><select id="iNext">'+targetOptions(n.id,true)+'</select>';
 }
 html+='<div style="display:flex;gap:8px;margin-top:18px">'
  +'<button class="btn sm" id="iDup">Duplicate</button>'
  +'<button class="btn sm danger" id="iDel">Delete node</button></div>';
 c.innerHTML=html;

 $("#iLabel").addEventListener("input",debounce(function(){n.label=$("#iLabel").value;renderCanvas();saveSoon();},180));
 var ic=$("#iContent");
 if(ic)ic.addEventListener("input",debounce(function(){n.content=ic.value;renderCanvas();saveSoon();},180));
 var iai=$("#iAI");
 if(iai)iai.addEventListener("click",function(){openAIWriter(n.id);});
 var seg=$("#iMode");
 if(seg)seg.querySelectorAll("button").forEach(function(b){
  b.addEventListener("click",function(){n.mode=b.dataset.m;renderCanvas();renderInspector();saveSoon();});
 });
 var ih=$("#iHint");
 if(ih)ih.addEventListener("input",debounce(function(){n.hint=ih.value;saveSoon();},180));
 c.querySelectorAll("[data-f]").forEach(function(inp){
  inp.addEventListener("input",debounce(function(){n.branches[+inp.dataset.b][inp.dataset.f]=inp.value;renderEdges();saveSoon();},180));
 });
 c.querySelectorAll("[data-btn]").forEach(function(sl){
  sl.value=n.branches[+sl.dataset.btn].target||"";
  sl.addEventListener("change",function(){n.branches[+sl.dataset.btn].target=sl.value||null;renderCanvas();renderInspector();saveSoon();});
 });
 c.querySelectorAll("[data-bx]").forEach(function(bn){
  bn.addEventListener("click",function(){n.branches.splice(+bn.dataset.bx,1);renderCanvas();renderInspector();saveSoon();});
 });
 var add=$("#iAdd");
 if(add)add.addEventListener("click",function(){n.branches.push(br("",""));renderCanvas();renderInspector();saveSoon();});
 if(n.type==="action"){
  var at=$("#iAtype");
  at.addEventListener("change",function(){n.action.type=at.value;renderCanvas();renderInspector();saveSoon();});
  var au=$("#iAurl");
  if(au)au.addEventListener("input",debounce(function(){n.action.url=au.value;saveSoon();},250));
  var ae=$("#iAemail");
  if(ae)ae.addEventListener("input",debounce(function(){n.action.email=ae.value;saveSoon();},250));
  var am=$("#iAmsg");
  if(am)am.addEventListener("input",debounce(function(){n.action.message=am.value;saveSoon();},250));
  $("#iAsend").addEventListener("click",function(){simulateAction(n);});
 }
 if(n.type==="redirect"){
  var r=$("#iRedir");
  r.value=n.branches[0]?n.branches[0].target||"":"";
  r.addEventListener("change",function(){setSingle(n,r.value||null);renderCanvas();renderInspector();saveSoon();});
 }
 var inxt=$("#iNext");
 if(inxt){
  inxt.value=singleTarget(n)||"";
  inxt.addEventListener("change",function(){setSingle(n,inxt.value||null);renderCanvas();renderInspector();saveSoon();});
 }
 $("#iDup").addEventListener("click",function(){
  var copy=JSON.parse(JSON.stringify(n));
  copy.id=uid();copy.label=(n.label||"node")+" copy";copy.x+=240;copy.y+=80;
  nodes.push(copy);sel=copy.id;esel=null;
  renderCanvas();renderInspector();saveSoon();toast("Node duplicated.");
 });
 $("#iDel").addEventListener("click",delNode);
}

function simulateAction(n){
 var a=n.action||{};
 if(a.type==="log"){toast("Log action simulated: "+(a.message||"entry logged"));return;}
 if(a.type==="email"){toast("Email would go to "+(a.email||"?")+" (scripted on trigger).");return;}
 var url=a.url||"";
 if(!url){toast("Set a webhook URL first.",true);return;}
 toast("POST "+(url||"…"));
 fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source:"chatbot-builder",payload:a.message||""})})
  .then(function(r){toast(r.ok?"Webhook responded "+r.status:"Webhook failed "+r.status,r.ok?false:true);})
  .catch(function(){toast("Webhook unreachable (offline). Leave a URL for automation.",true);});
}

function delNode(){
 var id=sel;if(!id)return;
 for(var i=0;i<nodes.length;i++){
  for(var k=0;k<nodes[i].branches.length;k++)if(nodes[i].branches[k].target===id)nodes[i].branches[k].target=null;
 }
 for(var j=0;j<store.triggers.length;j++)if(store.triggers[j].nodeId===id)store.triggers[j].nodeId="";
 nodes=nodes.filter(function(n){return n.id!==id;});
 sel=null;esel=null;
 renderCanvas();renderInspector();saveSoon();toast("Node deleted.");
}

function openInspector(){$("#inspector").classList.remove("closed");syncBackdrop();closeLeft();}
function closeInspector(){$("#inspector").classList.add("closed");syncBackdrop();}
function closeLeft(){$("#palette").classList.remove("open");syncBackdrop();}
function syncBackdrop(){
 var any=(!$("#inspector").classList.contains("closed"))||$("#palette").classList.contains("open");
 $("#backdrop").classList.toggle("show",any);
}

function exportJson(){
 return JSON.stringify({app:"aichatbot-builder",version:1,store:store,nodes:nodes},null,2);
}

function doImport(str){
 var data;
 try{data=JSON.parse(str);}catch(e){toast("Invalid JSON.",true);return;}
 if(!data||!Array.isArray(data.nodes)){toast("That file doesn't contain a valid flow.",true);return;}
 var cleaned=[];
 for(var i=0;i<data.nodes.length;i++){
  var n=data.nodes[i];
  if(!n||!n.id)continue;
  var nn=mk(n.type||"message",n.x||100,n.y||100);
  nn.id=n.id;nn.label=n.label||typeOf(nn.type).name;nn.content=n.content||"";nn.hint=n.hint||"";nn.mode=n.mode||"options";
  nn.branches=(n.branches||[]).map(function(b){return br(b.label,b.target,b.match);});
  nn.action=Object.assign({type:"webhook",url:"",email:"",subject:"",message:""},n.action||{});
  cleaned.push(nn);
 }
 if(!cleaned.length){toast("No nodes found.",true);return;}
 if(data.store)store=Object.assign(store,data.store);
 store.ai=Object.assign({mode:"hybrid",model:"openai",kb:""},store.ai||{});
 nodes=cleaned;sel=null;esel=null;
 closeOverlays();fitView();renderCanvas();renderInspector();updateAIPill();
 toast("Imported "+cleaned.length+" nodes.");
}

function openSettings(){
 $("#sName").value=store.name;
 $("#sSpeed").value=String(store.speed);
 $("#sFallback").value=store.fallback;
 $("#sAIMode").value=store.ai.mode;
 $("#sAIModel").value=store.ai.model;
 $("#sKB").value=store.ai.kb;
 renderTrig();
 $("#ovSettings").classList.add("open");
 closeLeft();
}
function renderTrig(){
 var box=$("#trigRows");
 box.innerHTML="";
 if(!store.triggers.length)box.innerHTML='<div class="hintline">No triggers yet. Add one so the bot matches words like "human" anywhere in a reply.</div>';
 store.triggers.forEach(function(tr,i){
  var d=document.createElement("div");d.className="trig-row";
  d.innerHTML='<div style="display:flex;align-items:center;gap:8px"><input class="tk" placeholder="keywords, comma, separated" value="'+esc(tr.keywords)+'">'
   +'<button class="row-remove" title="Remove">✕</button></div>'
   +'<select class="tn">'+targetOptions("",true)+'</select>'
   +'<input class="tm" placeholder="optional automatic reply before routing" value="'+esc(tr.message||"")+'">';
  var tks=d.querySelector(".tk"),tns=d.querySelector(".tn"),tms=d.querySelector(".tm");
  tns.value=tr.nodeId||"";
  tks.addEventListener("input",debounce(function(){tr.keywords=tks.value;saveSoon();},250));
  tns.addEventListener("change",function(){tr.nodeId=tns.value||"";saveSoon();});
  tms.addEventListener("input",debounce(function(){tr.message=tms.value;saveSoon();},250));
  d.querySelector(".row-remove").addEventListener("click",function(){store.triggers.splice(i,1);renderTrig();saveSoon();});
  box.appendChild(d);
 });
}
$("#trigAdd").addEventListener("click",function(){store.triggers.push({keywords:"",nodeId:"",message:""});renderTrig();saveSoon();});

function bindSettings(){
 $("#sName").addEventListener("input",debounce(function(){store.name=$("#sName").value;saveSoon();},250));
 $("#sSpeed").addEventListener("change",function(){store.speed=parseInt($("#sSpeed").value,10);saveSoon();});
 $("#sFallback").addEventListener("input",debounce(function(){store.fallback=$("#sFallback").value;saveSoon();},250));
 $("#sAIMode").addEventListener("change",function(){store.ai.mode=$("#sAIMode").value;updateAIPill();renderInspector();saveSoon();toast("AI mode: "+AI.label());});
 $("#sAIModel").addEventListener("change",function(){store.ai.model=$("#sAIModel").value;saveSoon();});
 $("#sKB").addEventListener("input",debounce(function(){store.ai.kb=$("#sKB").value;saveSoon();},400));
}

function closeOverlays(){
 document.querySelectorAll(".overlay").forEach(function(o){o.classList.remove("open");});
 closeLeft();
}

function openTest(){ window.openTest(); }

function boot(){
 loadStore();
 bindSettings();
 updatePal();
 updateAIPill();
 renderCanvas();
 renderInspector();
 fitView();
}
boot();

$("#btnTest").addEventListener("click",openTest);
$("#chatRestart").addEventListener("click",function(){$("#chat").innerHTML="";openTest();});
$("#btnSettings").addEventListener("click",openSettings);
$("#btnCenter").addEventListener("click",fitView);
$("#zin").addEventListener("click",function(){zoomAt($("#cwrap").clientWidth/2,$("#cwrap").clientHeight/2,1.18);});
$("#zout").addEventListener("click",function(){zoomAt($("#cwrap").clientWidth/2,$("#cwrap").clientHeight/2,0.85);});
$("#zreset").addEventListener("click",function(){view.z=1;applyTransform();});
$("#cwrap").addEventListener("wheel",function(e){
 e.preventDefault();
 var r=$("#cwrap").getBoundingClientRect();
 zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.12:0.89);
},{passive:false});
window.addEventListener("resize",function(){refreshWrap();});
$("#btnMenu").addEventListener("click",function(e){e.stopPropagation();$("#dropdown").classList.toggle("open");});
document.addEventListener("click",function(e){if(!e.target.closest(".menumore"))$("#dropdown").classList.remove("open");});
$("#fab").addEventListener("click",function(){$("#palette").classList.toggle("open");syncBackdrop();});
$("#backdrop").addEventListener("click",function(){closeInspector();closeLeft();});

document.querySelectorAll("#dropdown [data-a]").forEach(function(b){
 b.addEventListener("click",function(){
  $("#dropdown").classList.remove("open");
  var a=b.dataset.a;
  if(a==="sample"){
   if(confirm("Replace the current flow with the sample template?")){seed();sel=null;esel=null;fitView();renderCanvas();renderInspector();updateAIPill();save();toast("Sample loaded.");}
  }else if(a==="new"){
   if(confirm("Start a fresh blank flow? This replaces what's on the canvas.")){
    nodes=[];store.triggers=[];var st=mk("start",300,220);st.content="Hi! This is your new bot.";nodes.push(st);
    sel=st.id;esel=null;fitView();renderCanvas();renderInspector();save();toast("Blank flow created.");
   }
  }else if(a==="import"){$("#importText").value="";$("#ovImport").classList.add("open");closeLeft();}
  else if(a==="export"){$("#exportText").value=exportJson();$("#ovExport").classList.add("open");closeLeft();}
  else if(a==="help"){$("#ovHelp").classList.add("open");closeLeft();}
 });
});

document.querySelectorAll(".overlay").forEach(function(o){
 var close=o.querySelector("[data-close]");
 if(close)close.addEventListener("click",function(){o.classList.remove("open");});
 var m=o.querySelector(".modal");
 if(m)m.addEventListener("click",function(e){e.stopPropagation();});
 o.addEventListener("click",function(){o.classList.remove("open");});
});

$("#expCopy").addEventListener("click",function(){
 var t=$("#exportText");t.select();t.setSelectionRange(0,99999);
 try{document.execCommand("copy");toast("Copied to clipboard.");}catch(e){toast("Copy failed — use your browser shortcut.",true);}
});
$("#expDl").addEventListener("click",function(){
 var blob=new Blob([$("#exportText").value],{type:"application/json"});
 var a=document.createElement("a");
 a.href=URL.createObjectURL(blob);
 a.download=(store.name||"bot").toLowerCase().replace(/[^a-z0-9]+/g,"-")+".flow.json";
 a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},400);
});
$("#pickFile").addEventListener("click",function(){$("#fileInput").click();});
$("#fileInput").addEventListener("change",function(){
 var f=this.files[0];if(!f)return;
 var r=new FileReader();
 r.onload=function(){$("#importText").value=r.result;};
 r.readAsText(f);
});
$("#doImport").addEventListener("click",function(){doImport($("#importText").value);});

document.addEventListener("keydown",function(e){
 if(e.target.matches("input,textarea,select"))return;
 if(e.key==="Escape"){
  closeOverlays();placeType=null;updatePal();
  var p=document.getElementById("preview");if(p)p.remove();
  gesture=null;
  return;
 }
 if((e.key==="Delete"||e.key==="Backspace")){
  if(esel){
   var sN=byid(esel.from);
   if(sN)sN.branches[esel.bi].target=null;
   esel=null;sel=null;renderCanvas();renderInspector();saveSoon();
  }else if(sel)delNode();
  e.preventDefault();
 }
});
document.addEventListener("keydown",function(e){
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();save();toast("Flow saved.");}
});

window.addEventListener("beforeunload",save);