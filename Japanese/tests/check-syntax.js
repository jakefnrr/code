// Syntax check for every JS file. Run: node tests/run.js
const { execSync } = require('child_process');
const { allJs, D } = require('./helpers/setup');
const NODE = process.env.SMOKE_NODE || '/Users/jake/.codegpt/bin/node';
module.exports = function checkSyntax(results) {
  const files = allJs(D).filter(f => !f.includes('tests/'));
  let bad = 0;
  for (const f of files) {
    try { execSync(NODE + ' --check ' + JSON.stringify(f), { stdio: 'pipe' }); }
    catch (e) { bad++; results.push(['syntax ' + f.split('Japanese/')[1], false]); }
  }
  results.push(['syntax (' + files.length + ' files)', bad === 0]);
};
