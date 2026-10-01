// Grammar bank checks: 60 lessons, N5-N1, unique ids, examples present.
module.exports = function checkGrammar(results) {
  results.push(['grammar count = 60', GRAMMAR.length === 60, '' + GRAMMAR.length]);
  results.push(['levels N5-N1', ['N5', 'N4', 'N3', 'N2', 'N1'].every(l => GRAMMAR.some(g => g.level === l))]);
  results.push(['grammar ids unique', new Set(GRAMMAR.map(g => g.id)).size === GRAMMAR.length]);
  results.push(['every lesson has examples', GRAMMAR.every(g => g.ex && g.ex.length && g.ex.every(x => x.jp && x.en))]);
};
