// Test runner: node tests/run.js  (old path tests/smoke.js removed)
const { loadData } = require('./helpers/setup');
loadData();
const results = [];
require('./check-syntax')(results);
require('./check-grammar')(results);
require('./check-words')(results);
require('./check-pages')(results);
let fails = 0;
for (const [name, pass, extra] of results) {
  console.log((pass ? 'PASS' : 'FAIL') + ' ' + name + (extra ? ' — ' + extra : ''));
  if (!pass) fails++;
}
process.exit(fails ? 1 : 0);
