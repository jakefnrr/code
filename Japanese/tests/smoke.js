// Smoke test: node tests/smoke.js  — validates every data bank + page render.
const fs = require('fs'), path = require('path'), cp = require('child_process');
const D = path.join(__dirname, '..');
const NODE = process.env.SMOKE_NODE || '/Users/jake/.codegpt/bin/node';
let fails = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' — ' + extra : '')); if (!cond) fails++; };

// 1. syntax-check every JS file
const jsFiles = [];
(function walk(p) { for (const f of fs.readdirSync(p)) { const fp = path.join(p, f); const st = fs.statSync(fp); if (st.isDirectory()) walk(fp); else if (f.endsWith('.js')) jsFiles.push(fp); } })(D);
for (const f of jsFiles) {
  try { cp.execSync(NODE + ' --check ' + JSON.stringify(f), { stdio: 'pipe' }); }
  catch (e) { ok('syntax ' + path.relative(D, f), false); }
}
ok('syntax (' + jsFiles.length + ' files)', fails === 0);

// 2. load data banks
global.window = global;
const load = f => eval(fs.readFileSync(path.join(D, f), 'utf8'));
['data/grammar/n5.js','data/grammar/n4.js','data/grammar/n3.js','data/grammar/n2.js','data/grammar/n1.js','data/words/phrases.js','data/words/vocab.js','data/words/vocab_upper.js','data/words/kanji.js','data/words/kanji_upper.js','data/quiz/bank.js','data/quiz/advanced.js'].forEach(load);
ok('grammar count = 60', GRAMMAR.length === 60, '' + GRAMMAR.length);
ok('levels N5-N1', ['N5','N4','N3','N2','N1'].every(l => GRAMMAR.some(g => g.level === l)));
ok('grammar ids unique', new Set(GRAMMAR.map(g => g.id)).size === GRAMMAR.length);
ok('every lesson has examples', GRAMMAR.every(g => g.ex && g.ex.length && g.ex.every(x => x.jp && x.en)));
ok('vocab > 100', VOCAB.length > 100, '' + VOCAB.length);
ok('kanji > 60', KANJI.length > 60, '' + KANJI.length);
ok('phrases >= 25', PHRASES.length >= 25, '' + PHRASES.length);
ok('quiz answers valid', QUIZ.every(q => q.opts && q.a >= 0 && q.a < q.opts.length), '' + QUIZ.length + ' questions');

// 3. runtime: render every page with a DOM shim, simulate nav clicks
function mkEl(tag) {
  const e = { tag, children: [], dataset: {}, style: {}, value: '', _html: '', textContent: '',
    classList: { _s: new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, toggle(c,f){f?this._s.add(c):this._s.delete(c)}, contains(c){return this._s.has(c)} },
    addEventListener(){}, appendChild(c){this.children.push(c)}, focus(){},
    querySelector(){return mkEl('div')}, querySelectorAll(){return []}, closest(){return null} };
  Object.defineProperty(e, 'innerHTML', { get(){return this._html}, set(v){this._html=v} });
  return e;
}
const viewEl = mkEl('div');
const named = {};
global.document = { getElementById(id){ return named['#'+id] || null; },
  querySelector(s){ if (s === '#view') return viewEl; return named[s] || (named[s] = mkEl('div')); },
  querySelectorAll(){ return []; }, createElement(t){ return mkEl(t); }, addEventListener(){}, activeElement: null };
global.localStorage = { m:{}, getItem(k){return this.m[k]||null}, setItem(k,v){this.m[k]=String(v)} };
global.speechSynthesis = { getVoices:()=>[], speak(){}, cancel(){}, speaking:false, pending:false };
global.SpeechSynthesisUtterance = function(t){ this.text=t; };
global.Audio = function(){ this.play=()=>Promise.resolve(); this.pause=()=>{}; };
global.fetch = () => Promise.reject(new Error('offline'));
global.window = global;
['js/core/kv-config.js','js/core/speech.js','js/core/store.js','js/core/helpers.js','js/core/router.js','js/pages/grammar.js','js/pages/translator.js','js/pages/vocab.js','js/pages/kanji.js','js/pages/flashcards.js','js/pages/quiz.js'].forEach(load);
for (const p of ['grammar','translator','vocab','kanji','flash','quiz']) {
  try { Pages[p](viewEl, true); ok('render ' + p + ' (html ' + viewEl.innerHTML.length + ' chars)', viewEl.innerHTML.length > 100); }
  catch (e) { ok('render ' + p, false, e.message); }
}
// nav uses dataset.v
ok('router reads dataset.v', fs.readFileSync(path.join(D,'js/core/router.js'),'utf8').includes('dataset.v'));
process.exit(fails ? 1 : 0);
