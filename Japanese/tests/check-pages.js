// Page render checks: every tab renders content; router uses dataset.v.
const { fs, path, D } = require('./helpers/setup');
function mkEl() {
  const e = { children: [], dataset: {}, style: {}, value: '', _html: '', textContent: '',
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, f) { f ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener() {}, appendChild(c) { this.children.push(c); }, focus() {},
    querySelector() { return mkEl(); }, querySelectorAll() { return []; }, closest() { return null; } };
  Object.defineProperty(e, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; } });
  return e;
}
module.exports = function checkPages(results) {
  const viewEl = mkEl(), named = {};
  global.document = {
    getElementById(id) { return named['#' + id] || null; },
    querySelector(s) { if (s === '#view') return viewEl; return named[s] || (named[s] = mkEl()); },
    querySelectorAll() { return []; }, createElement() { return mkEl(); },
    addEventListener() {}, activeElement: null };
  global.localStorage = { m: {}, getItem(k) { return this.m[k] || null; }, setItem(k, v) { this.m[k] = String(v); } };
  global.speechSynthesis = { getVoices: () => [], speak() {}, cancel() {}, speaking: false, pending: false };
  global.SpeechSynthesisUtterance = function (t) { this.text = t; };
  global.Audio = function () { this.play = () => Promise.resolve(); this.pause = () => {}; };
  global.fetch = () => Promise.reject(new Error('offline'));
  global.window = global;
  ['js/core/kv-config.js', 'js/core/speech.js', 'js/core/store.js', 'js/core/helpers.js', 'js/core/router.js',
   'js/components/speak.js', 'js/components/tabs.js', 'js/components/cards.js',
   'js/pages/grammar.js', 'js/pages/translator.js', 'js/pages/vocab.js', 'js/pages/kanji.js',
   'js/pages/flashcards.js', 'js/pages/quiz.js'].forEach(f => eval(fs.readFileSync(path.join(D, f), 'utf8')));
  for (const p of ['grammar', 'translator', 'vocab', 'kanji', 'flash', 'quiz']) {
    try { Pages[p](viewEl, true); results.push(['render ' + p, viewEl.innerHTML.length > 100, viewEl.innerHTML.length + ' chars']); }
    catch (e) { results.push(['render ' + p, false, e.message]); }
  }
  results.push(['router reads dataset.v', fs.readFileSync(path.join(D, 'js/core/router.js'), 'utf8').includes('dataset.v')]);
};
