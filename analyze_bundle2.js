const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Find all definitions of _0x11fd
function findAll(regex, limit = 5) {
  const results = [];
  let match;
  while ((match = regex.exec(bundle)) !== null && results.length < limit) {
    const start = Math.max(0, match.index - 30);
    const end = Math.min(bundle.length, match.index + match[0].length + 200);
    results.push({
      index: match.index,
      context: bundle.substring(start, end).substring(0, 300)
    });
  }
  return results;
}

console.log('=== var _0x11fd ===');
findAll(/var\s+_0x11fd/g).forEach(r => console.log('  @' + r.index + ': ' + r.context + '\n'));

console.log('\n=== const _0x11fd ===');
findAll(/const\s+_0x11fd/g).forEach(r => console.log('  @' + r.index + ': ' + r.context + '\n'));

console.log('\n=== let _0x11fd ===');
findAll(/let\s+_0x11fd/g).forEach(r => console.log('  @' + r.index + ': ' + r.context + '\n'));

// Look for _0x9183 definition  
console.log('\n=== _0x9183 definitions ===');
findAll(/_0x9183\s*=/g).forEach(r => console.log('  @' + r.index + ': ' + r.context + '\n'));

console.log('\n=== var _0x9183 ===');
findAll(/var\s+_0x9183/g).forEach(r => console.log('  @' + r.index + ': ' + r.context + '\n'));

console.log('\n=== _0x46b269 definition (was found as array) ===');
findAll(/_0x46b269/g, 10).forEach(r => console.log('  @' + r.index + ': ' + r.context.substring(0, 200) + '\n'));

// The shuffling loop references _0x9183 - where is it defined?
console.log('\n=== First mention of _0x9183 ===');
const first9183 = bundle.indexOf('_0x9183');
console.log('@' + first9183 + ': ' + bundle.substring(Math.max(0, first9183-50), first9183+100));

// Look for the _0x11fd function definition more broadly
console.log('\n=== _0x11fd= (assignment) ===');
findAll(/_0x11fd\s*=\s*(function|\(|_0x)/g).forEach(r => console.log('  @' + r.index + ': ' + r.context + '\n'));

// Only search first 20000 chars for _0x9183 definition
console.log('\n=== Search for _0x9183 in first 20000 chars ===');
const first20k = bundle.substring(0, 20000);
const matches = first20k.match(/_0x9183/g);
if (matches) {
  console.log('Found ' + matches.length + ' occurrences');
  let idx = 0;
  let count = 0;
  while ((idx = first20k.indexOf('_0x9183', idx)) !== -1 && count < 5) {
    console.log('  @' + idx + ': ' + first20k.substring(Math.max(0, idx-30), idx+60));
    idx++;
    count++;
  }
}
