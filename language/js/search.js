const rKey=s=>{
  let t=String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[\s'\u2019.\-~]/g,'');
  t=t.replace(/sh/g,'sy').replace(/ch/g,'ty').replace(/tsu/g,'tu').replace(/fu/g,'hu')
    .replace(/jyu/g,'zyu').replace(/jy/g,'zy').replace(/j/g,'zy')
    .replace(/ou/g,'o').replace(/uu/g,'u').replace(/ee/g,'e').replace(/ii/g,'i').replace(/oo/g,'o');
  return t;
};
const enKey=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/['']/g,'').replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
const DIG=[['0','零','rei'],['1','一','ichi'],['2','二','ni'],['3','三','san'],['4','四','shi'],
['5','五','go'],['6','六','roku'],['7','七','shichi'],['8','八','hachi'],['9','九','kyuu']];
const TENS={twenty:2,thirty:3,forty:4,fifty:5,sixty:6,seventy:7,eighty:8,ninety:9};
const TJP=['零','十','二十','三十','四十','五十','六十','七十','八十','九十'];
const TJ=['rei','juu','niju','sanjuu','yonjuu','gojuu','rokujuu','nanajuu','hachijuu','kyuujuu'];
const UNITS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9};
const UJP=['一','二','三','四','五','六','七','八','九'];
const UR=['ichi','ni','san','shi','go','roku','shichi','hachi','kyuu'];

let _ix=null;
function searchIndex(){
  if(_ix)return _ix;
  const p=L(),S=p.search||{phrases:[],words:{},numbers:[],stop:[]};
  const byEn=new Map(),byJp=new Map(),byRo=new Map();
  const add=(en,j,r,extra)=>{
    if(!en||!j)return;
    const e=Object.assign({en,j,r:r||''},extra||{});
    const k=enKey(en);
    if(k){ if(!byEn.has(k))byEn.set(k,[]); if(byEn.get(k).length<3)byEn.get(k).push(e); }
    const kj=norm(j);
    if(kj){ if(!byJp.has(kj))byJp.set(kj,[]); if(byJp.get(kj).length<3)byJp.get(kj).push(e); }
    const kr=rKey(r);
    if(kr){ if(!byRo.has(kr))byRo.set(kr,[]); if(byRo.get(kr).length<3)byRo.get(kr).push(e); }
  };
  S.phrases.forEach(([en,j,r])=>add(en,j,r,{ph:1}));
  Object.entries(S.words).forEach(([en,v])=>add(en,v[0],v[1],{word:1}));
  S.numbers.forEach(([en,j,r])=>add(en,j,r,{num:1}));
  p.units.forEach(u=>u.w.forEach(w=>add(w.e,w.j,w.r,{unit:u.n,ex:w.ex,exR:w.exR,exE:w.exE})));
  p.dia.forEach(d=>d.l.forEach(l=>add(l.e,l.j,l.r,{dia:d.t})));
  let maxg=1; byEn.forEach((v,k)=>{const n=k.split(' ').length;if(n>maxg)maxg=n});
  _ix={byEn,byJp,byRo,maxg,S};
  return _ix;
}

function segResult(segs,q){
  const got=segs.filter(s=>!s.miss);
  const miss=segs.filter(s=>s.miss).map(s=>s.miss);
  const cov=got.length?got.reduce((a,s)=>a+(s.src||'').split(' ').length,0)/(segs.length):0;
  return {j:got.map(s=>s.j).join('、'),r:got.map(s=>s.r).filter(Boolean).join('、'),
    en:q,kind:miss.length?'partial':'segmented',segs,miss,cov};
}

function fillSlots(segs){
  const out=[];
  for(let i=0;i<segs.length;i++){
    const s=segs[i];
    if(s.skip)continue;
    if(s.miss){out.push(s);continue}
    if(s.j.indexOf('{0}')<0){out.push(s);continue}
    let nx=null,nxI=-1;
    for(let k=i+1;k<segs.length;k++){
      const t=segs[k];
      if(t.skip)continue;
      if(t.miss||t.j.indexOf('{0}')>=0)break;
      nx=t;nxI=k;break;
    }
    if(!nx)continue;
    out.push({en:s.en,j:s.j.replace('{0}',nx.j),r:(s.r||'').replace('{0}',nx.r||nx.j),src:s.src,slot:1});
    if(nxI>i)segs.splice(nxI,1);
  }
  return out;
}

function enSearch(q){
  const ix=searchIndex(),K=enKey(q);
  if(!K)return null;
  const ex=ix.byEn.get(K);
  if(ex&&ex[0].j.indexOf('{0}')<0)return Object.assign({},ex[0],{kind:'exact'});
  if(/^\d+$/.test(K)){
    const d=DIG[K[K.length-1]];
    if(d)return {j:d[1],r:d[2],en:q,kind:'number'};
  }
  let toks=K.split(' ');
  if(toks.length===2&&TENS[toks[0]]&&UNITS[toks[1]]){
    const u=UNITS[toks[1]];
    return {j:TJP[TENS[toks[0]]]+UJP[u-1],r:TJ[TENS[toks[0]]]+' '+UR[u-1],en:q,kind:'number'};
  }
  if(toks.length===1&&TENS[toks[0]]){
    return {j:TJP[TENS[toks[0]]],r:TJ[TENS[toks[0]]],en:q,kind:'number'};
  }
  const stop=new Set(ix.S.stop||[]);
  const segs=[];let i=0,hits=0;
  while(i<toks.length){
    let m=null,n=0;
    for(let w=Math.min(ix.maxg,toks.length-i);w>=1;w--){
      const cand=toks.slice(i,i+w).join(' ').trim();
      if(w===1&&cand.length<2&&!/^\d$/.test(cand))continue;
      const f=ix.byEn.get(cand);
      if(f){m=f[0];n=w;break}
    }
    if(!m){
      for(let w=1;w<=Math.min(ix.maxg,toks.length-i);w++){
        const f=ix.byEn.get(toks.slice(i,i+w).join(' ').trim());
        if(f&&f[0].j.indexOf('{0}')>=0){m=f[0];n=w;break}
      }
    }
    if(m){segs.push(Object.assign({},m,{src:toks.slice(i,i+n).join(' ')}));hits+=n;i+=n;continue}
    if(stop.has(toks[i])){segs.push({skip:toks[i]});i++;continue}
    segs.push({miss:toks[i]});i++;
  }
  if(hits){
    const f=fillSlots(segs);
    const got=f.filter(x=>!x.miss);
    if(got.length)return segResult(f,q);
  }
  const c=[];
  ix.byEn.forEach((v,k)=>{const sc=score(K,k);if(sc>.66)c.push([sc,v[0],k])});
  if(c.length){
    c.sort((a,b)=>b[0]-a[0]);
    return Object.assign({},c[0][1],{kind:'close',sc:c[0][0],src:c[0][2]});
  }
  return null;
}

function roSearch(q){
  const ix=searchIndex(),k=rKey(q);
  if(!k)return null;
  const ex=ix.byRo.get(k);
  if(ex)return Object.assign({},ex[0],{kind:'romaji'});
  let best=null;
  ix.byRo.forEach((v,r)=>{if(r.length>k.length&&r.indexOf(k)===0&&(!best||r.length<best[0].length))best=[r,v[0]]});
  return best?Object.assign({},best[1],{kind:'romaji'}):null;
}

function jpSearch(q){
  const ix=searchIndex(),k=norm(q);
  if(!k)return null;
  const ex=ix.byJp.get(k);
  if(ex)return Object.assign({},ex[0],{kind:'japanese'});
  let best=null;
  ix.byJp.forEach((v,j)=>{if(j.indexOf(k)===0&&(!best||j.length<best[0].length))best=[j,v[0]]});
  if(best)return Object.assign({},best[1],{kind:'japanese'});
  return null;
}

function doSearch(raw){
  const q=String(raw||'').trim();
  if(!q)return null;
  if(hasCJK(q)){
    const r=jpSearch(q);
    return r?Object.assign(r,{q}):{miss:q};
  }
  let r=enSearch(q);
  if(r)return Object.assign(r,{q});
  r=roSearch(q);
  if(r)return Object.assign(r,{q});
  r=jpSearch(romaji(q.toLowerCase().replace(/[^a-z'\s]/g,'')));
  if(r)return Object.assign(r,{q,viaRomaji:1});
  return {miss:q};
}

const STARTERS=['hi, how are you?','thank you','i am hungry','where is the toilet','how much is this','see you tomorrow','good night','nice to meet you','i do not understand','can I have the bill','what time is it','i love japanese'];

function searchHtml(res){
  if(!res)return '';
  if(res.miss){
    return `<div class="snone">
      <div class="sn-t">No match for “${esc(res.miss)}”</div>
      <div class="sn-s">Try fewer words — “how are you” works better than a whole paragraph. Or type Japanese or romaji.</div>
      ${starterHtml()}</div>`;
  }
  const bits=[];
  if(res.kind==='partial'&&res.segs){
    bits.push(res.segs.filter(s=>!s.miss).map(s=>
      `<div class="seg"><span class="se">${esc(s.src||s.en)}</span><span class="sj">${esc(s.j)}</span><span class="sr">${esc(s.r||'')}</span></div>`).join(''));
    if(res.miss.length)bits.push(`<div class="sn-s">Not translated: ${esc(res.miss.join(', '))}</div>`);
  }
  if(res.ex)bits.push(`<div class="sex"><div class="jp">${esc(res.ex)}</div><div class="tiny" style="color:var(--acc)">${esc(res.exR||'')}</div><div class="tiny muted">${esc(res.exE||'')}</div></div>`);
  const tag={exact:'phrase',segmented:'word by word',partial:'word by word',close:'closest match',romaji:'romaji',japanese:'found',number:'number'}[res.kind]||'';
  return `<div class="scard">
    <div class="row" style="align-items:flex-start;gap:10px">
      <div style="min-width:0;flex:1">
        <div class="s-j">${esc(res.j)}</div>
        ${res.r?`<div class="s-r">${esc(res.r)}</div>`:''}
        <div class="s-e">${esc(res.q||res.en)}</div>
      </div>
      <button class="speak" data-act="say" data-t="${esc(res.j)}" data-r="${esc(res.j)}">🔊</button>
    </div>
    <div class="row" style="margin-top:12px">
      <button class="btn sm" data-act="saySlow" data-t="${esc(res.j)}">🐢 Slow</button>
      ${res.unit?`<span class="chip g">${esc(res.unit)}</span>`:''}
      <span class="chip">${tag}</span>
    </div>
    ${bits.length?'<div class="segs">'+bits.join('')+'</div>':''}
  </div>`;
}
function starterHtml(){
  return `<div class="starters">${STARTERS.map(s=>`<button class="lchip" data-act="qset" data-q="${esc(s)}">${esc(s)}</button>`).join('')}</div>`;
}

let _lastQ='';
function renderSearch(){
  const out=$('#qOut'),inp=$('#q'),v=inp.value;
  $('#qClr').hidden=!v;
  if(!v.trim()){out.innerHTML=starterHtml();out.classList.add('on');return}
  const res=doSearch(v);
  out.innerHTML=searchHtml(res);
  out.classList.add('on');
}
function clearSearch(){
  const out=$('#qOut'),inp=$('#q');
  inp.value='';_lastQ='';out.classList.remove('on');out.innerHTML='';$('#qClr').hidden=true;
}
function initSearch(){
  const inp=$('#q'),out=$('#qOut');
  let t=null;
  inp.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(renderSearch,140)});
  inp.addEventListener('focus',renderSearch);
  inp.addEventListener('keydown',e=>{
    if(e.key==='Escape'){clearSearch();inp.blur()}
    if(e.key==='Enter'){
      e.preventDefault();e.stopPropagation();
      const r=doSearch(inp.value);
      if(r&&r.j)speak(r.j);
    }
  });
  $('#qClr').addEventListener('click',e=>{e.stopPropagation();clearSearch();inp.focus()});
  document.addEventListener('click',e=>{
    if(e.target.closest('.searchrow'))return;
    out.classList.remove('on');
  });
}
