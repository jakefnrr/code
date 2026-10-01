// Words + quiz bank checks.
module.exports = function checkWords(results) {
  results.push(['vocab > 100', VOCAB.length > 100, '' + VOCAB.length]);
  results.push(['vocab entries shaped', VOCAB.every(v => v.kanji && v.kana && v.en)]);
  results.push(['kanji > 60', KANJI.length > 60, '' + KANJI.length]);
  results.push(['phrases >= 25', PHRASES.length >= 25, '' + PHRASES.length]);
  results.push(['quiz answers valid', QUIZ.every(q => q.opts && q.a >= 0 && q.a < q.opts.length), '' + QUIZ.length + ' questions']);
};
