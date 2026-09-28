const R={};

R.learn=()=>{
  const p=L();
  return `
  <div class="card" style="margin-top:14px">
    <div class="row">
      <div style="flex:1;min-width:0">
        <div class="qtype">${esc(p.scriptName)}</div>
        <div class="muted tiny">${esc(p.tip)}</div>
      </div>
    </div>
    <div class="bigchar" id="bigC">${p.scripts[0].rows.split(' ')[0].split(':')[0]}</div>
    <div class="row" style="justify-content:center;margin-top:6px">
      <button class="speak" data-act="bigPlay" title="Hear it">🔊</button>
      <button class="btn sm" data-act="bigPrev">‹ Prev</button>
      <button class="btn sm" data-act="bigNext">Next ›</button>
      <button class="btn sm pri" data-act="bigRand">Random</button>
    </div>
    <div class="row" style="justify-content:center;margin-top:12px">
      <button class="btn sm" data-act="bigSlow">🐢 0.6×</button>
      <button class="btn sm" data-act="bigNorm">🐇 0.9×</button>
      <button class="btn sm" data-act="bigFast">⚡ 1.25×</button>
    </div>
  </div>
  ${p.scripts.map((s,si)=>`
  <h2 class="sec">${esc(s.t)}</h2>
  <p class="sub">Tap any character to hear how it sounds.</p>
  <div class="card">
    <div class="kanagrid">
      ${s.rows.split(' ').map(pair=>{
        const [c,r]=pair.split(':');
        return `<button class="kanabtn" data-act="kana" data-c="${esc(c)}" data-r="${esc(r)}">
          <span class="c">${esc(c)}</span><span class="r">${esc(r)}</span></button>`;
      }).join('')}
    </div>
  </div>`).join('')}
  <div class="card" style="margin-top:14px">
    <div class="qtype">Pro tip</div>
    <div class="muted" style="margin-top:6px">${esc(p.tip2)}</div>
  </div>`;
};

R.words=()=>{
  const p=L();
  const pools=[{id:'all',n:'🎲 Any word',c:poolWords().length}]
    .concat(p.units.map(u=>({id:u.id,n:u.e+' '+u.n,c:u.w.length})));
  if(!U.word)U.word=pick(poolWords());
  const w=U.word;
  if(!U.sent)U.sent=pick(allWords());
  const s=U.sent;
  return `
  <h2 class="sec">📖 ${esc(p.name)} Words</h2>
  <p class="sub">Nothing is saved. Every card is random, so you can come back any time and get something fresh.</p>
  <div class="langbar" style="padding:0 0 12px;margin:0 -1px">
    ${pools.map(x=>`<button class="lchip${U.pool===x.id?' on':''}" data-act="pool" data-id="${x.id}">${x.n} <span style="opacity:.55;font-size:11px">${x.c}</span></button>`).join('')}
  </div>
  <div class="fc">
    <div class="row" style="justify-content:center;margin-bottom:6px">
      <span class="chip" style="font-size:11px">${esc(poolName())}</span>
    </div>
    <div class="jp ${U.show?'':'hidev'}" data-act="flip">${esc(w.j)}</div>
    <div class="rd ${U.show?'':'hidev'}" data-act="flip">${esc(w.r)}</div>
    <div class="en ${U.show?'':'hidev'}" data-act="flip">${esc(w.e)}</div>
    <div class="ex ${U.show?'':'hidev'}" data-act="flip">
      <div class="row" style="align-items:flex-start">
        <div class="txt" style="flex:1">
          <div class="jp">${esc(w.ex)}</div>
          <div class="tiny" style="color:var(--acc);letter-spacing:.05em">${esc(w.exR||'')}</div>
          <div class="en">${esc(w.exE||'')}</div>
        </div>
        <button class="speak sm" data-act="say" data-t="${esc(w.ex)}" data-r="${esc(w.exR||w.j)}">🔊</button>
      </div>
    </div>
    ${U.show?'':'<div class="tiny muted" style="text-align:center;margin-top:18px">Tap the card to reveal</div>'}
  </div>
  <div class="row" style="margin-top:12px;justify-content:center">
    <button class="speak" data-act="say" data-t="${esc(w.j)}" data-r="${esc(w.j)}" title="Hear it">🔊</button>
    <button class="btn" data-act="saySlow" data-t="${esc(w.j)}" title="Slow">🐢</button>
    <button class="btn pri" data-act="practice" data-t="${esc(w.j)}" data-r="${esc(w.j)}" data-e="${esc(w.e)}">🎤 Say it</button>
  </div>
  <div class="row" style="margin-top:10px;justify-content:center">
    <button class="btn pri" data-act="nextWord">🎲 Another word</button>
    <button class="btn" data-act="flipBtn">${U.show?'🙈 Hide':'👁 Reveal'}</button>
    <button class="btn" data-act="testPool">🎯 Test these</button>
  </div>

  <h2 class="sec">Random sentence</h2>
  <p class="sub">A real sentence from the language. Listen first, then guess.</p>
  <div class="card">
    <div class="row" style="justify-content:center;margin-bottom:8px">
      <button class="btn pri sm" data-act="sentPlay">🔊 Play it</button>
      <button class="btn sm" data-act="sentPlaySlow">🐢 Slow</button>
      <button class="btn sm" data-act="sentNew">🎲 New sentence</button>
    </div>
    <div class="${U.sentShow?'':'hidev'}">
      <div class="jp" style="font-family:var(--jp);font-size:24px;line-height:1.55;text-align:center;padding:8px 0" data-act="sentFlip">${esc(s.ex)}</div>
      <div class="tiny" style="text-align:center;color:var(--acc);margin-top:4px;letter-spacing:.06em" data-act="sentFlip">${esc(s.exR||s.r)}</div>
      <div class="en" style="text-align:center;font-size:15px;margin-top:10px" data-act="sentFlip">${esc(s.exE||s.e)}</div>
    </div>
    <div class="row" style="justify-content:center">
      <button class="speak sm" data-act="say" data-t="${esc(s.ex)}" data-r="${esc(s.exR||s.j)}">🔊</button>
      <button class="btn sm pri" data-act="practice" data-t="${esc(s.ex)}" data-r="${esc(s.exR||s.j)}" data-e="${esc(s.exE||s.e)}">🎤 Say it</button>
    </div>
    ${U.sentShow?'':'<div class="tiny muted" style="text-align:center;margin-top:10px">Tap the sentence to reveal the meaning</div>'}
  </div>`;
};

R.gram=()=>{
  const p=L();
  return `
  <h2 class="sec">🧩 ${esc(p.name)} Grammar</h2>
  <p class="sub">${p.gram.length} points. Open one, listen, then check yourself. Nothing is recorded.</p>
  ${p.gram.map((g,i)=>{
    const q=U.gramQ[g.t];
    return `<div class="gitem" data-g="${esc(g.t)}">
      <button class="ghead" data-act="gram" data-i="${i}">
        <div style="flex:1;min-width:0">
          <div class="t">${esc(g.t)}</div>
          <div class="s">${esc(g.m).slice(0,64)}…</div>
        </div>
        <span class="chip" style="font-size:10.5px">L${g.lv}</span>
      </button>
      <div class="gbody" id="gb${i}" style="display:none">
        <div class="struct">${esc(g.s)}</div>
        <div>${esc(g.m)}</div>
        <ul class="notes">${g.n.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>
        ${g.ex.map(x=>`
        <div class="exrow">
          <div class="txt">
            <div class="jp">${esc(x.j)}</div>
            <div class="rd">${esc(x.r)}</div>
            <div class="en">${esc(x.e)}</div>
          </div>
          <button class="speak sm" data-act="say" data-t="${esc(x.j)}" data-r="${esc(x.j)}">🔊</button>
        </div>`).join('')}
        <div class="row" style="margin-top:14px">
          <button class="btn pri sm" data-act="gramQ" data-i="${i}">${q?'↻ Try again':'✓ Check myself'}</button>
          <button class="btn sm" data-act="gramSpeak" data-i="${i}">🎤 Say an example</button>
        </div>
        <div id="gq${i}">${q?gramQHtml(g,i,q):''}</div>
      </div>
    </div>`;
  }).join('')}`;
};

function gramQHtml(g,i,q){
  if(q.shown){
    const ok=q.pick===q.a;
    return `<div class="fb on ${ok?'good':'bad'}">${ok?'✓ Correct! ':'✗ Not quite. The answer is '}<b>${esc(g.q.o[q.a])}</b><br><span class="tiny">${esc(g.q.w)}</span></div>
      <div class="row" style="margin-top:12px"><button class="btn sm pri" data-act="gramQ" data-i="${i}">↻ Try again</button></div>`;
  }
  return `<div class="hintbox" style="margin-top:14px">${esc(g.q.p)}</div>
  <div class="opts" style="margin-top:10px">
    ${g.q.o.map((o,k)=>`<button class="opt" data-act="gramA" data-i="${i}" data-k="${k}">
      <span class="k">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
  </div>`;
}

R.talk=()=>{
  const p=L();
  if(!U.dia){
    return `
    <h2 class="sec">🎙 Conversations</h2>
    <p class="sub">Listen to a dialogue, then roleplay it. The app speaks each line — you answer out loud.</p>
    <div class="card">
      <div class="qtype">${micOK?'🎤 Microphone ready':'⚠️ Voice input unavailable'}</div>
      <div class="muted tiny" style="margin-top:6px">${micOK
        ?'This browser can hear you. Use Chrome or Edge for the best Japanese recognition, and allow the microphone when asked.'
        :'This browser has no speech recognition. You can still type your answers in Roleplay mode, and you can always tap 🔊 to hear the audio.'}</div>
    </div>
    <div class="grid" style="margin-top:12px">
      ${p.dia.map(d=>`
        <button class="unit" data-act="openDia" data-t="${esc(d.t)}">
          <div class="em">💬</div>
          <div style="min-width:0;flex:1">
            <b>${esc(d.t)}</b>
            <span>${esc(d.scene)} · L${d.lv}</span>
          </div>
          <div class="pct">${d.l.length} lines</div>
        </button>`).join('')}
      <button class="unit" data-act="randomDia">
        <div class="em">🎲</div>
        <div style="min-width:0;flex:1">
          <b>Surprise me</b>
          <span>Jump into a random conversation</span>
        </div>
      </button>
    </div>`;
  }
  const d=p.dia.find(x=>x.t===U.dia);
  if(U.rp)return roleplayHtml(d);
  return `
  <div class="row" style="margin-top:14px;margin-bottom:12px">
    <button class="btn sm gho" data-act="backDia">‹ Dialogues</button>
    <b style="font-size:14px">${esc(d.t)}</b>
    <span class="sp"></span>
    <span class="chip">L${d.lv}</span>
  </div>
  <div class="card"><div class="qtype">${esc(d.a)} & ${esc(d.b)}</div><div class="muted tiny" style="margin-top:6px">${esc(d.scene)}</div></div>
  <h2 class="sec">Transcript</h2>
  <div class="row" style="margin-bottom:10px">
    <button class="btn sm pri" data-act="playDia">▶ Play all</button>
    <button class="btn sm" data-act="stopPlay">■ Stop</button>
    <button class="btn sm" data-act="toggleTrans">👁 Toggle English</button>
  </div>
  <div id="dlg">${d.l.map(x=>`
    <div class="dline ${x.s==='b'?'me':''}">
      <div class="bub">
        <div class="who">${x.s==='b'?'▼ ':''}${x.s==='a'?esc(d.a):esc(d.b)}</div>
        <div class="jp">${esc(x.j)}</div>
        <div class="rd">${esc(x.r)}</div>
        <div class="en" data-tr>${esc(x.e)}</div>
      </div>
      <button class="speak sm" data-act="say" data-t="${esc(x.j)}" data-p="${x.s==='a'?1.05:.9}">🔊</button>
    </div>`).join('')}</div>
  <div class="card" style="margin-top:14px">
    <div class="qtype">Your turn</div>
    <div class="muted tiny" style="margin-top:6px">Hide the English, then say each of your lines out loud.</div>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" data-act="startRP">🎤 Roleplay this</button>
      <button class="btn" data-act="typeRP">⌨️ Type instead</button>
    </div>
  </div>`;
};

function roleplayHtml(d){
  const r=U.rp, i=r.i, line=d.l[i];
  const done=line.x?r.score:0;
  return `
  <div class="row" style="margin-top:14px;margin-bottom:12px">
    <button class="btn sm gho" data-act="quitRP">‹ Quit</button>
    <b style="font-size:14px">${esc(d.t)}</b>
    <span class="sp"></span>
    <span class="chip g">${i+1} / ${d.l.length}</span>
  </div>
  <div class="card" style="padding:14px">
    <div class="row">
      <div class="bar" style="flex:1"><i style="width:${i/d.l.length*100}%"></i></div>
    </div>
  </div>
  ${d.l.slice(0,i).filter(x=>x.s==='a').map(x=>`
    <div class="dline" style="margin-top:12px">
      <div class="bub"><div class="who">${esc(d.a)}</div><div class="jp">${esc(x.j)}</div><div class="rd">${esc(x.r)}</div></div>
      <button class="speak sm" data-act="say" data-t="${esc(x.j)}" data-p="1.05">🔊</button>
    </div>`).join('')}
  ${line&&line.s==='a'&&!line.x?`
    <div class="card" style="margin-top:12px">
      <div class="qtype">${esc(d.a)} says</div>
      <div class="target" style="font-size:26px">${esc(line.j)}</div>
      <div class="tiny" style="text-align:center;color:var(--mut)">${esc(line.r)}</div>
      <div class="row" style="justify-content:center;margin-top:12px">
        <button class="speak" data-act="say" data-t="${esc(line.j)}" data-p="1.05">🔊</button>
        <button class="btn pri" data-act="rpNext">I understand ›</button>
      </div>
    </div>`:`
    <div class="card" style="margin-top:12px">
      <div class="qtype">${esc(d.b)} — you say</div>
      <div class="target">${r.hide?'<span style="opacity:.25">?????????</span>':esc(line.j)}</div>
      <div class="tiny" style="text-align:center;color:var(--mut)">${r.hide?'hint below':esc(line.r)}</div>
      <div class="micwrap">
        <button class="mic ${r.live?'live':''} ${micOK?'':'off'}" data-act="rpMic">🎤<span class="ring"></span></button>
        <div class="wave">${'<i></i>'.repeat(9)}</div>
        <div class="transcript ${r.cls||''}">${esc(r.heard||(r.live?'Listening…':'Tap the mic and say it in '+L().native))}</div>
        ${r.res!==null?`<div class="score-pill" style="color:${r.res>=.8?'var(--ok)':r.res>=.5?'var(--warn)':'var(--err)'}">${Math.round(r.res*100)}% match</div>`:''}
      </div>
      <div class="row" style="justify-content:center;margin-top:6px">
        <button class="btn sm" data-act="say" data-t="${esc(line.j)}">🔊 Hear answer</button>
        <button class="btn sm" data-act="rpType">⌨️ Type it</button>
        <button class="btn sm" data-act="rpHint">💡 Hint</button>
      </div>
      ${r.msg?`<div class="fb on ${r.ok?'good':'bad'}">${r.msg}</div>`:''}
      <div class="row" style="margin-top:12px">
        <button class="btn wide pri" data-act="rpNext" ${r.ok?'':'disabled'}>Continue ›</button>
      </div>
    </div>`}
  ${r.msg&&r.ok?`<div class="card" style="margin-top:12px"><div class="qtype">Correct answer</div>
    <div class="target" style="font-size:22px">${esc(line.j)}</div>
    <div class="tiny" style="text-align:center;color:var(--mut)">${esc(line.r)} — ${esc(line.e)}</div></div>`:''}`;
}

R.quiz=()=>{
  const p=L();
  if(U.res)return resHtml();
  if(!U.q){
    const modes=[
      ['mix','🎲 Mixed drill','See, hear, type and speak'],
      ['j2e','🇯🇵 → English','See the target, pick the meaning'],
      ['e2j','English → '+p.native,'See the meaning, pick the target'],
      ['listen','👂 Listening','Hear it, then pick the meaning'],
      ['type','⌨️ Typing','Type the target from the meaning'],
      ['speak','🎤 Speaking','Say the target out loud']
    ];
    return `
    <h2 class="sec">🎯 Practice</h2>
    <p class="sub">${p.units.reduce((a,u)=>a+u.w.length,0)} words, ${p.gram.length} grammar points. Every run is a fresh random set.</p>
    <div class="grid g2">
      ${modes.map(m=>`<button class="unit" data-act="qmode" data-m="${m[0]}">
        <div class="em" style="font-size:19px">${m[0]==='mix'?'🎲':m[0]==='j2e'?'🈁':m[0]==='e2j'?'🔤':m[0]==='listen'?'👂':'⌨️'}</div>
        <div style="min-width:0;flex:1"><b>${m[1]}</b><span>${m[2]}</span></div>
      </button>`).join('')}
    </div>
    <h2 class="sec">Questions</h2>
    <div class="row">
      ${[10,20,30].map(n=>`<button class="btn ${U.qn===n?'pri':''}" data-act="qn" data-n="${n}">${n}</button>`).join('')}
    </div>
    <div class="row" style="margin-top:14px">
      <button class="btn pri wide lg" data-act="qStart">▶ Start practice</button>
    </div>`;
  }
  const q=U.q;
  if(q.i>=q.list.length){ U.res=q; U.q=null; return resHtml(); }
  const item=q.list[q.i];
  return `
  <div class="row" style="margin-top:14px;margin-bottom:12px">
    <button class="btn sm gho" data-act="qQuit">‹ Quit</button>
    <b style="font-size:14px">${esc(q.name)}</b>
    <span class="sp"></span>
    <span class="chip g">${q.i+1} / ${q.list.length} · ${q.right} ✓</span>
  </div>
  <div class="bar" style="margin-bottom:16px"><i style="width:${q.i/q.list.length*100}%"></i></div>
  <div class="qbox">${qHtml(q,item)}</div>`;
};

function qHtml(q,item){
  const w=item.w;
  const kind=q.kind==='mix'?(item.qk||'j2e'):q.kind;
  if(kind==='listen'||kind==='speak'){
    return `<div class="qtype">${kind==='listen'?'👂 Listening':'🎤 Speaking'}</div>
      <div class="qtext" style="font-size:24px">${esc(w.e)}</div>
      <div class="qhint">Say or pick the ${L().native} for: <b>${esc(w.e)}</b></div>
      <div class="row" style="margin-bottom:18px">
        <button class="btn pri" data-act="qPlay" data-t="${esc(w.j)}" data-rate=".85">🔊 Play</button>
        <button class="btn" data-act="qPlay" data-t="${esc(w.j)}" data-rate=".6">🐢 Slow</button>
      </div>
      <div class="opts">
        ${item.opts.map((o,k)=>`<button class="opt" data-act="qAns" data-k="${k}">
          <span class="k">${'ABCD'[k]}</span><span>${esc(o)}</span></button>`).join('')}
      </div>
      <div class="fb" id="qfb"></div>`;
  }
  if(kind==='type'){
    return `<div class="qtype">⌨️ Typing</div>
      <div class="qtext" style="font-size:28px">${esc(w.e)}</div>
      <div class="qhint">Type it in ${L().native} — or in romaji letters and we will convert it.</div>
      <input class="big" id="qIn" placeholder="tabetai…" autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="row" style="margin-top:12px">
        <button class="btn pri" data-act="qSubmit">Check</button>
        <button class="btn" data-act="qPlay" data-t="${esc(w.j)}" data-rate=".85">🔊 Hear it</button>
        <button class="btn" data-act="qReveal">Show answer</button>
      </div>
      <div class="fb" id="qfb"></div>`;
  }
  const toEn=kind==='j2e';
  const shown=toEn?w.j:w.e;
  return `<div class="qtype">${toEn?L().native+' → English':'English → '+L().native}</div>
    <div class="qtext ${toEn?'jp':''}">${esc(shown)}</div>
    <div class="qhint">${toEn?'Reading: '+esc(w.r):'Pick the correct '+L().native}</div>
    <div class="row" style="margin-bottom:18px">
      ${toEn?`<button class="speak" data-act="qPlay" data-t="${esc(w.j)}" data-rate=".85">🔊</button>`:''}
    </div>
    <div class="opts">
      ${item.opts.map((o,k)=>`<button class="opt" data-act="qAns" data-k="${k}">
        <span class="k">${'ABCD'[k]}</span><span>${!toEn?'jp':''}">${esc(o)}</span></button>`).join('')}
    </div>
    <div class="fb" id="qfb"></div>`;
}

function resHtml(){
  const r=U.res, pc=Math.round(r.right/r.list.length*100);
  return `
  <h2 class="sec">${pc>=80?'🔥 Excellent!':pc>=50?'👍 Good work':'💪 Keep going'}</h2>
  <p class="sub">${esc(r.name)} · ${r.right} of ${r.list.length} correct</p>
  <div class="grid g3">
    <div class="stat"><b>${pc}%</b><span>Accuracy</span></div>
    <div class="stat"><b>${r.right}</b><span>Correct</span></div>
    <div class="stat"><b>${r.miss.length}</b><span>To review</span></div>
  </div>
  ${r.miss.length?`
  <h2 class="sec">Review these</h2>
  <p class="sub">Tap 🔊 to hear it, then 🎤 to say it back.</p>
  <div class="card">
    ${r.miss.map(m=>`
    <div class="exrow">
      <div class="txt">
        <div class="jp">${esc(m.w.j)}</div>
        <div class="rd">${esc(m.w.r)}</div>
        <div class="en">${esc(m.w.e)}</div>
      </div>
      <button class="speak sm" data-act="say" data-t="${esc(m.w.j)}" data-r="${esc(m.w.j)}">🔊</button>
      <button class="speak sm" data-act="practice" data-t="${esc(m.w.j)}" data-r="${esc(m.w.j)}" data-e="${esc(m.w.e)}">🎤</button>
    </div>`).join('')}
  </div>`:''}
  <div class="row" style="margin-top:14px;gap:9px">
    <button class="btn pri" data-act="qQuit" style="flex:1">↻ New practice</button>
    <button class="btn" data-act="goWords" style="flex:1">📖 Learn more</button>
  </div>`;
}

R.set=()=>{
  const p=L();
  const vs=voicesFor();
  return `
  <h2 class="sec">⚙ Settings</h2>
  <p class="sub">${p.flag} ${esc(p.name)} · ${esc(p.native)} — nothing you study here is saved, so every visit starts fresh.</p>
  <div class="card">
    <div class="setrow" style="margin-top:0">
      <label>Speaking speed · ${S.rate.toFixed(2)}×</label>
      <input type="range" min="0.5" max="1.4" step="0.05" value="${S.rate}" oninput="setRate(this.value)">
    </div>
    <div class="setrow">
      <label>Voice for ${esc(p.name)} (${vs.length} available)</label>
      <select class="big" onchange="setVoice(this.value)">
        <option value="">Automatic — best available</option>
        ${vs.map(v=>`<option value="${esc(v.voiceURI)}" ${S.voiceURI===v.voiceURI?'selected':''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
      </select>
    </div>
    <div class="setrow">
      <label>Live translation · ${S.api?'on':'off'}</label>
      <div class="row">
        <button class="btn ${S.api?'pri':''}" data-act="toggleApi">${S.api?'✅ Sending unknown queries to Google Translate':'🌐 Turn on live translation'}</button>
      </div>
    </div>
    <div class="hintbox">${S.api
      ?'Type anything. If it is not in the built-in dictionary, it gets sent to the Google Translate public endpoint and the answer appears with a reading, audio and a translate-back button. Nothing is stored on a server.'
      :'Only the built-in dictionary is searched. Turn live translation on to send anything else to Google Translate.'}</div>
    <div class="hintbox" style="margin-top:10px">${micOK
      ?'Microphone is supported here. Click any 🎤 button to speak the language out loud and get scored against the target.'
      :'No speech recognition in this browser — Chrome, Edge and Safari support it. Audio, quizzes and typing all still work.'}</div>
    <div class="row" style="margin-top:14px">
      <button class="btn sm" data-act="testVoice">🔊 Test voice</button>
      <button class="btn sm" data-act="testMic">🎤 Test microphone</button>
      <button class="btn sm" data-act="wipe">Forget settings</button>
    </div>
  </div>
  <h2 class="sec">Shortcuts</h2>
  <div class="card">
    <div class="tiny muted">Space — play the audio · Enter — reveal or hide a card · ← → — move between cards</div>
  </div>
  <h2 class="sec">What is inside</h2>
  <div class="card">
    <div class="row"><b>🇯🇵 Japanese · 日本語</b></div>
    <div class="tiny muted" style="margin-top:8px">${p.units.reduce((a,u)=>a+u.w.length,0)} words · ${p.gram.length} grammar points · ${p.dia.length} conversations · ${Object.keys(L().search||{}).length}+ searchable phrases</div>
  </div>`;
};

window.setRate=v=>{S.rate=parseFloat(v);save();document.querySelector('[data-act=rate]').previousElementSibling.textContent='Speaking speed · '+S.rate.toFixed(2)+'×'};
window.setVoice=v=>{S.voiceURI=v;save();toast('Voice updated')};

function practiceModal(target,reading,meaning){
  openModal(`
    <div class="qtype">🎤 Say it out loud</div>
    <div class="target">${esc(target)}</div>
    ${reading&&reading!==target?`<div class="tiny" style="text-align:center;color:var(--mut);margin-top:-6px">${esc(reading)}</div>`:''}
    ${meaning?`<div class="tiny" style="text-align:center;color:var(--mut);margin-top:6px">${esc(meaning)}</div>`:''}
    <div class="micwrap">
      <button class="mic ${micOK?'':'off'}" id="pmic">🎤<span class="ring"></span></button>
      <div class="wave">${'<i></i>'.repeat(9)}</div>
      <div class="transcript" id="ptr">${micOK?'Tap the mic, then say it in '+L().native:'Voice input not supported here'}</div>
      <div id="pscore"></div>
    </div>
    <div class="row" style="justify-content:center">
      <button class="speak" id="playBtn" title="Hear it">🔊</button>
      <button class="btn sm" id="slowBtn">🐢 Slow</button>
    </div>
    <div class="row" style="margin-top:14px;gap:9px">
      <button class="btn wide pri" id="pClose" disabled>Continue ›</button>
      <button class="btn" id="pSkip" title="Skip">✕</button>
    </div>`);
  $('#pSkip').onclick=closeModal;
  const mic=$('#pmic'),tr=$('#ptr'),sc=$('#pscore'),ok=$('#pClose');
  $('#playBtn').onclick=()=>speak(target);
  $('#slowBtn').onclick=()=>speak(target,{rate:.55});
  if(!micOK){ ok.disabled=false; ok.onclick=closeModal; return; }
  mic.onclick=()=>{
    if(mic.classList.contains('live')){stopListen();return}
    mic.classList.add('live');tr.textContent='Listening…';tr.className='transcript';sc.innerHTML='';ok.disabled=true;
    speak(target,{rate:.7});
    listen({
      onpartial:t=>{tr.textContent=t},
      onfinal:(t,alts)=>{
        const best=[t,...alts].map(x=>readInput(x,target)).sort((a,b)=>score(b,target)-score(a,target))[0];
        const scv=score(best,target);
        tr.textContent=best||'—'; mic.classList.remove('live');
        tr.className='transcript '+(scv>=.8?'said-good':scv>=.5?'said-part':'said-bad');
        const good=scv>=.6;
        sc.innerHTML=`<span class="score-pill" style="color:${scv>=.8?'var(--ok)':scv>=.5?'var(--warn)':'var(--err)'}">${Math.round(scv*100)}%</span>`;
        ok.disabled=false; ok.textContent=good?'Great — continue ›':'Continue ›';
      },
      onend:()=>{mic.classList.remove('live')}
    },err=>{
      mic.classList.remove('live');
      tr.textContent=err==='no-speech'?'I did not hear anything — try again':err==='not-allowed'||err==='service-not-allowed'?'Microphone permission denied':err==='audio-capture'?'No microphone found':'Mic error: '+err;
      tr.className='transcript said-bad'; ok.disabled=false; ok.textContent='Continue ›';
    });
  };
  ok.onclick=()=>closeModal();
}

function render(){
  $$('.view').forEach(v=>v.classList.remove('on'));
  const v=$('#v-'+S.tab); if(v){v.classList.add('on');v.innerHTML=(R[S.tab]||R.learn)();}
  $$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===S.tab));
  if(S.tab==='quiz'&&U.q){const i=document.querySelector('#qIn');if(i)i.focus()}
}
function openModal(html){$('#modal').innerHTML=html;$('#mask').classList.add('on')}
function closeModal(){$('#mask').classList.remove('on');stopListen();stopSpeak()}

const ACT={
  tab:d=>{S.tab=d.v;U.q=null;U.res=null;stopSpeak();stopListen();render()},
  kana:d=>speak(d.c,{rate:.8}),
  bigPlay:()=>{const el=$('#bigC');if(el)speak(el.textContent,{rate:.8})},
  bigPrev:()=>bigStep(-1),
  bigNext:()=>bigStep(1),
  bigRand:()=>bigStep(99),
  bigSlow:()=>{const el=$('#bigC');if(el)speak(el.textContent,{rate:.55})},
  bigNorm:()=>{const el=$('#bigC');if(el)speak(el.textContent,{rate:.85})},
  bigFast:()=>{const el=$('#bigC');if(el)speak(el.textContent,{rate:1.3})},
  say:d=>speak(d.t,{rate:S.rate,pitch:d.p?parseFloat(d.p):1}),
  saySlow:d=>speak(d.t,{rate:.55}),
  pool:d=>{U.pool=d.id;U.word=null;render()},
  nextWord:()=>{const p=poolWords();let w;let n=0;do{w=pick(p);n++}while(p.length>1&&w===U.word&&n<6);U.word=w;U.show=false;render();speak(w.j,{rate:.82})},
  flip:()=>{U.show=!U.show;render()},
  flipBtn:()=>{U.show=!U.show;render()},
  sentFlip:()=>{U.sentShow=!U.sentShow;render()},
  sentNew:()=>{U.sent=pick(allWords());U.sentShow=false;render()},
  sentPlay:()=>{const s=U.sent;if(s)speak(s.ex,{rate:.8})},
  sentPlaySlow:()=>{const s=U.sent;if(s)speak(s.ex,{rate:.55})},
  practice:d=>practiceModal(d.t,d.r,d.e),
  remoteRev:d=>{
    const card=d.t.closest('.scard');if(!card)return;
    const el=card.querySelector('[data-rev]');if(!el)return;
    const tl=d.tl==='en'?'ja':'en';
    el.textContent='🔄 …';
    remoteLookup(d.q,tl).then(r=>{el.textContent=r.j})
      .catch(()=>{el.textContent='⚠️ Could not reach Google Translate'});
    d.t.dataset.tl=tl;
  },
  gram:d=>{
    const g=L().gram[d.i],b=$('#gb'+d.i);
    b.style.display=b.style.display==='none'?'block':'none';
    if(b.style.display==='block')speak(g.ex[0].j,{rate:.8});
  },
  gramSpeak:d=>{const g=L().gram[d.i];practiceModal(g.ex[0].j,g.ex[0].r,g.ex[0].e)},
  gramQ:d=>{const g=L().gram[d.i];U.gramQ[g.t]={a:g.q.a,pick:-1,shown:false};$('#gq'+d.i).innerHTML=gramQHtml(g,d.i,U.gramQ[g.t])},
  gramA:d=>{
    const g=L().gram[d.i],q=U.gramQ[g.t];q.pick=+d.k;q.shown=true;
    if(q.pick===q.a)toast('✓ Correct',true);
    $('#gq'+d.i).innerHTML=gramQHtml(g,d.i,q);
  },
  openDia:d=>{U.dia=d.t;U.rp=null;render()},
  randomDia:()=>{const p=L();U.dia=pick(p.dia).t;U.rp=null;render()},
  backDia:()=>{U.dia=null;U.rp=null;render()},
  playDia:()=>{const d=curDia();playSeq(d.l.map(x=>({j:x.j,pitch:x.s==='a'?1.05:.9})))},
  stopPlay:()=>stopSpeak(),
  toggleTrans:()=>{$$('#dlg [data-tr]').forEach(e=>e.classList.toggle('blur'))},
  startRP:()=>{U.rp={i:0,score:0,live:false,heard:'',res:null,msg:'',ok:false,cls:'',hide:false};render();autoRP()},
  typeRP:()=>{U.rp={i:0,score:0,live:false,heard:'',res:null,msg:'',ok:false,cls:'',hide:false,typing:true};render();autoRP()},
  quitRP:()=>{stopListen();stopSpeak();U.rp=null;render()},
  rpMic:()=>{
    const d=curDia(),line=d.l[U.rp.i],r=U.rp;
    if(!line||!line.x)return;
    if(r.live){stopListen();return}
    r.live=true;r.heard='';r.res=null;r.msg='';r.ok=false;render();
    speak(line.j,{rate:.72});
    listen({
      onpartial:t=>{const r2=U.rp;if(!r2)return;r2.heard=t;const el=$('.transcript');if(el)el.textContent=t},
      onfinal:(t,alts)=>{
        const r2=U.rp;if(!r2)return;
        const cands=[t,...alts].map(x=>readInput(x,line.j));
        const best=cands.sort((a,b)=>score(b,line.j)-score(a,line.j))[0];
        const scv=score(best,line.j);
        r2.heard=best||'—';r2.res=scv;r2.live=false;
        r2.ok=scv>=.6;
        r2.cls=scv>=.8?'said-good':scv>=.5?'said-part':'said-bad';
        r2.msg=r2.ok?'Nice! That is close enough to move on.':'Not quite — that one is hard. Listen and try again.';
        if(r2.ok)r2.score++;
        render();
      },
      onend:()=>{const r2=U.rp;if(r2){r2.live=false;render()}}
    },err=>{
      const r2=U.rp;if(!r2)return;
      r2.live=false;r2.msg=err==='not-allowed'||err==='service-not-allowed'
        ?'Microphone blocked. Use ⌨️ Type it instead, or allow mic access in your browser settings.'
        :err==='no-speech'?'I did not hear anything. Tap the mic and try again.':'Mic problem: '+err;
      render();
    });
  },
  rpType:()=>{const d=curDia(),line=d.l[U.rp.i];if(!line)return;openModal(`
    <div class="qtype">⌨️ Type your line</div>
    <div class="target">${esc(line.j)}</div>
    <div class="tiny" style="text-align:center;color:var(--mut)">${esc(line.r)} — ${esc(line.e)}</div>
    <input class="big" id="rpIn" style="margin-top:16px" placeholder=you can type romaji… autocomplete="off" autocapitalize="off" spellcheck="false">
    <div class="fb" id="rpFb"></div>
    <div class="row" style="margin-top:14px"><button class="btn pri wide" id="rpGo">Check</button></div>`);
    let checked=false;
    const go=()=>{
      if(checked){closeModal();return}
      const v=$('#rpIn').value,got=readInput(v,line.j),scv=score(got,line.j);
      const ok=scv>=.6,r=U.rp;
      const fb=$('#rpFb');fb.className='fb on '+(ok?'good':'bad');
      fb.innerHTML=(ok?'✓ '+(Math.round(scv*100))+'% — '+esc(got):'✗ '+Math.round(scv*100)+'% — you wrote: '+esc(got||'—'))+'<br><span class="tiny">Answer: '+esc(line.j)+'</span>';
      if(ok&&!r.ok)r.score++;
      r.ok=r.ok||ok;r.heard=got;r.res=scv;r.cls=ok?'said-good':'said-bad';
      r.msg=ok?'Good — that counts.':'Not the one. Use the hint and try the mic.';render();
      const b=$('#rpGo');if(b){b.textContent='Close';b.classList.add('pri')}
      checked=true;
    };
    $('#rpGo').onclick=go;
    $('#rpIn').addEventListener('keydown',e=>{if(e.key==='Enter')go()});
    setTimeout(()=>$('#rpIn').focus(),120);
  },
  rpHint:()=>{const d=curDia(),line=d.l[U.rp.i];if(!line)return;U.rp.msg='Hint: '+line.h;U.rp.hide=false;render()},
  rpNext:()=>{
    const d=curDia(),r=U.rp;
    if(r.i>=d.l.length-1){
      const pc=Math.round(r.score/Math.max(1,d.l.filter(x=>x.x).length)*100);
      openModal(`<h3>${pc>=70?'🎉 Nice conversation!':'💪 Good try'}</h3>
        <div class="muted tiny">You got ${r.score} of ${d.l.filter(x=>x.x).length} lines well.</div>
        <div class="stat" style="margin:16px 0"><b>${pc}%</b><span>Your accuracy</span></div>
        <div class="row"><button class="btn" id="rpAgain">↻ Again</button><button class="btn pri" id="rpDone">Done</button></div>`);
      $('#rpDone').onclick=()=>{closeModal();U.rp=null;U.dia=null;render()};
      $('#rpAgain').onclick=()=>{closeModal();ACT.startRP()};
      return;
    }
    r.i++;r.live=false;r.heard='';r.res=null;r.msg='';r.ok=false;r.cls='';r.hide=false;
    render();autoRP();
  },
  qn:d=>{U.qn=+d.n;render()},
  qmode:d=>{U.mode=d.m;render()},
  qset:d=>{const i=$('#q');i.value=d.q;i.focus();renderSearch()},
  qStart:()=>{
    stopSpeak();stopListen();U.res=null;
    const all=allWords().slice();
    const list=shuffle(all.slice()).slice(0,U.qn);
    U.q={i:0,right:0,miss:[],list:[],kind:U.mode,mode:U.mode,locked:false,
      name:{mix:'Mixed drill',j2e:L().native+' → English',e2j:'English → '+L().native,listen:'Listening',type:'Typing',speak:'Speaking'}[U.mode]};
    U.q.list=list.map(w=>{
      const others=shuffle(all.filter(x=>x!==w)).slice(0,3).map(x=>x.e);
      const opts=shuffle([w.e,...others]);
      const qk=U.mode==='mix'?pick(['j2e','j2e','e2j','e2j','listen','listen','type','speak']):U.mode;
      return {w,opts,qk,ans:opts.findIndex(o=>o===w.e)};
    });
    render();
    autoPlay();
  },
  qPlay:d=>speak(d.t,{rate:d.rate?parseFloat(d.rate):.85}),
  qAns:d=>{
    const q=U.q;if(!q||q.locked)return;q.locked=true;
    const it=q.list[q.i],k=+d.k,right=k===it.ans;
    $$('#v-quiz .opt').forEach((el,i)=>{el.classList.add('lock');if(i===it.ans)el.classList.add('right');else if(i===k)el.classList.add('wrong')});
    const fb=$('#qfb');
    if(fb){
      const next='<div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="qNext">Next ›</button><button class="speak sm" data-act="qPlay" data-t="'+esc(it.w.j)+'" data-rate=".85">🔊</button></div>';
      fb.className='fb on '+(right?'good':'bad');
      fb.innerHTML=(right?'✓ Correct! ':'✗ '+esc(it.opts[it.ans])+' — '+esc(it.w.j)+' ('+esc(it.w.r)+')')
        +'<br><span class="tiny">'+esc(it.w.e)+'</span>'+next;
    }
    if(right)q.right++;else q.miss.push(it);
  },
  qSubmit:()=>{
    const q=U.q;if(!q||q.locked)return;
    const it=q.list[q.i],inp=$('#qIn');if(!inp)return;
    const v=inp.value,got=readInput(v,it.w.j),scv=score(got,it.w.j),right=scv>=.7;
    q.locked=true;
    const fb=$('#qfb');
    if(fb){fb.className='fb on '+(right?'good':'bad');
      fb.innerHTML=(right?'✓ Correct! ':'✗ Not quite — the answer is '+esc(it.w.j)+' ('+esc(it.w.r)+')')+'<br><span class="tiny">'+esc(it.w.e)+'</span>'
        +'<div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="qNext">Next ›</button><button class="speak sm" data-act="qPlay" data-t="'+esc(it.w.j)+'" data-rate=".85">🔊</button></div>';}
    if(right)q.right++;else q.miss.push(it);
  },
  qReveal:()=>{
    const q=U.q;if(!q||q.locked)return;
    const it=q.list[q.i];q.locked=true;q.miss.push(it);
    const fb=$('#qfb');
    if(fb){fb.className='fb on bad';fb.innerHTML='The answer is <b>'+esc(it.w.j)+'</b> ('+esc(it.w.r)+')<br><span class="tiny">'+esc(it.w.e)+'</span>'
      +'<div class="row" style="margin-top:10px"><button class="btn sm pri" data-act="qNext">Next ›</button><button class="speak sm" data-act="qPlay" data-t="'+esc(it.w.j)+'" data-rate=".85">🔊</button></div>';}
  },
  qNext:()=>{const q=U.q;if(!q)return;q.locked=false;q.i++;render();autoPlay()},
  qQuit:()=>{stopSpeak();U.q=null;U.res=null;render()},
  testPool:()=>{U.mode='mix';U.qn=10;S.tab='quiz';U.q=null;U.res=null;render()},
  goWords:()=>{S.tab='words';U.q=null;U.res=null;U.word=null;render()},
  testVoice:()=>speak(L().name+' — '+L().native,{}),
  toggleApi:()=>{S.api=!S.api;save();render();toast(S.api?'Live translation on':'Live translation off',true)},
  testMic:()=>{
    if(!micOK){toast('Speech recognition is not supported in this browser');return}
    openModal(`<div class="qtype">🎤 Microphone test</div>
      <div class="micwrap"><button class="mic" id="tm">🎤<span class="ring"></span></button>
      <div class="transcript" id="tt">Tap to speak anything</div></div>
      <div class="row"><button class="btn wide" id="tc">Close</button></div>`);
    $('#tc').onclick=closeModal;
    $('#tm').onclick=()=>{
      const t=$('#tm');if(t.classList.contains('live')){stopListen();return}
      t.classList.add('live');$('#tt').textContent='Listening…';
      listen({onpartial:x=>$('#tt').textContent=x,onfinal:(x,a)=>{t.classList.remove('live');$('#tt').textContent='Heard: '+x+'\n'+a.length+' alternatives captured';},onend:()=>t.classList.remove('live')},e=>{t.classList.remove('live');$('#tt').textContent='Mic error: '+e});
    };
  },
  wipe:()=>{if(!confirm('Clear the saved voice settings?'))return;try{localStorage.removeItem(KEY)}catch(e){}location.reload()}
};
function curDia(){const p=L();return p.dia.find(x=>x.t===U.dia)||p.dia[0]}
let bigIdx=0;
function bigStep(dir){
  const p=L(),rows=[];
  p.scripts.forEach(s=>s.rows.split(' ').forEach(pair=>rows.push(pair.split(':')[0])));
  bigIdx=dir===99?Math.floor(Math.random()*rows.length):(bigIdx+dir+rows.length)%rows.length;
  const el=$('#bigC');if(el){el.textContent=rows[bigIdx];speak(rows[bigIdx],{rate:.8})}
}
function autoRP(){
  const d=curDia(),r=U.rp;if(!r||!d)return;
  const line=d.l[r.i];
  if(line&&line.s==='a'&&!line.x)setTimeout(()=>speak(line.j,{pitch:1.05}),250);
}

document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');
  if(t){
    const a=ACT[t.dataset.act];
    if(a){e.preventDefault();a(t.dataset,t);}
    return;
  }
  if(e.target.id==='mask')closeModal();
});
$('#tabs').addEventListener('click',e=>{
  const t=e.target.closest('.tab');if(!t)return;
  S.tab=t.dataset.v;U.q=null;U.res=null;stopSpeak();stopListen();render();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();return}
  if(e.target.matches('input,textarea,select')){
    if(e.key==='Enter'&&S.tab==='quiz'&&U.q&&U.q.kind==='type')ACT.qSubmit();
    return;
  }
  if(e.key===' '){
    const el=document.querySelector('#v-words .speak[title="Hear it"]')||document.querySelector('#v-gram .speak');
    if(el){e.preventDefault();el.click()}
  }
  if(S.tab==='words'){
    if(e.key==='ArrowRight')ACT.nextWord();
    if(e.key==='ArrowLeft'){U.show=!U.show;render()}
    if(e.key==='Enter'){U.show=!U.show;render()}
  }
});
window.addEventListener('beforeunload',()=>{stopSpeak();stopListen()});

function autoPlay(){
  const q=U.q;if(!q)return;
  const it=q.list[q.i];if(!it)return;
  const k=q.kind==='mix'?it.qk:q.kind;
  if(k==='listen'||k==='speak')setTimeout(()=>speak(it.w.j,{rate:.85}),340);
}

render();
