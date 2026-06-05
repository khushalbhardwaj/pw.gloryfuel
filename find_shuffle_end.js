const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Find the shuffling IIFE ending pattern
const shuffleCode = bundle.substring(0, 3000);
console.log('First 200 chars:');
console.log(shuffleCode.substring(0, 200));
console.log('\n...');
console.log('\nPosition ~600-1000:');
console.log(shuffleCode.substring(600, 1000));

// Find: }(_0x9183,0x9279c));
const shuffleEnd = bundle.indexOf('}(_0x9183,0x9279c));');
console.log(`\n\nShuffling ends @ ${shuffleEnd}`);
console.log('Context:', bundle.substring(shuffleEnd - 30, shuffleEnd + 80));

// Find all function declarations in the bundle
function findAllFunc(str, name) {
  const results = [];
  let idx = 0;
  while ((idx = str.indexOf(name, idx)) !== -1) {
    results.push(idx);
    idx += name.length;
  }
  return results;
}

// Check: is there re-assignment of _0x9183 in the bundle?
console.log('\n=== _0x9183 reassignments ===');
const reassigns = findAllFunc(bundle, 'function _0x9183(');
reassigns.forEach(r => {
  const ctx = bundle.substring(Math.max(0, r-30), r + 60);
  console.log(`  @${r}: ${ctx}`);
});

// Check what the shuffling IIFE actually does
// by extracting just the IIFE and the function definitions
const shuffleIIFE = bundle.substring(0, shuffleEnd + '}(_0x9183,0x9279c));'.length);
console.log(`\nShuffling IIFE: ${shuffleIIFE.length} chars`);
console.log('Last 100 chars:', shuffleIIFE.substring(shuffleIIFE.length - 100));

// Now, the plan: extract minimal code that can run in Node
// 1. function _0x11fd (hoisted, defined at 189108)
// 2. function _0x9183 (hoisted, the BIG one, defined at 3814683 ... wait no, it's a function declaration)
// 3. The shuffling code + const _0x4d130f

// But _0x9183 is not just a declaration - it's: function _0x9183(){...some code including reassigning itself...}
// After _0x9183's first execution, _0x9183 is reassigned to function(){ return _0xdf1a8e; }

// The function _0x9183 definition is at 3814683... wait no, that's not right.
// Let me check: function _0x9183() is defined where?

console.log('\n=== Search for function _0x9183 ===');
const funcResults = findAllFunc(bundle, 'function _0x9183(');
funcResults.forEach(r => console.log(`  @${r}: ${bundle.substring(r, r+60)}`));

// Also check: var _0x9183, const _0x9183
console.log('\n=== var/const _0x9183 ===');
['var _0x9183', 'const _0x9183', 'let _0x9183'].forEach(pat => {
  const results = findAllFunc(bundle, pat);
  results.forEach(r => console.log(`  ${pat} @${r}: ${bundle.substring(r, r+80)}`));
});

// And check where the string array _0xdf1a8e is defined
console.log('\n=== _0xdf1a8e ===');
const df1a8eRefs = findAllFunc(bundle, '_0xdf1a8e');
df1a8eRefs.forEach(r => {
  const ctx = bundle.substring(Math.max(0, r-20), r+60);
  console.log(`  @${r}: ${ctx}`);
});
