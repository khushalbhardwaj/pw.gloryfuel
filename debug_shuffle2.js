const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

const shuffleCode = bundle.substring(0, 661);
const shuffleWithoutFirst = shuffleCode.substring(29); // Remove "const _0x4d130f=_0x11fd;"

try {
  new Function(shuffleWithoutFirst);
  console.log('Without const assignment: OK');
} catch (e) {
  console.log('Without const: FAIL -', e.message);
  console.log('First 100 chars:', shuffleWithoutFirst.substring(0, 100));
}

// Try with the const but without the IIFE
const justIIFE = shuffleCode.substring(28).replace(/^;/, '');
try {
  new Function(justIIFE);
  console.log('Just IIFE: OK');
} catch (e) {
  console.log('Just IIFE: FAIL -', e.message);
}

// Try to reformat it more carefully
console.log('\n=== Let me try to run it via eval... ===');
try {
  // Just test if eval can parse it
  eval('(function() {\n' + shuffleCode + '\n})');
  console.log('Eval wrapped: OK');
} catch (e) {
  console.log('Eval wrapped: FAIL -', e.message);
  // Let's show more detail
}

// Check for specific patterns that might confuse the parser
const patternsToCheck = [
  /\/\*/g,   // multi-line comments
  /\/\//g,   // single-line comments  
  /`/g,      // template literals
  /\\(?![nrtbfv'"0\\x])/g,  // bad escapes
];

for (const pattern of patternsToCheck) {
  let count = 0;
  let match;
  while ((match = pattern.exec(shuffleCode)) !== null) count++;
  console.log(`Pattern ${pattern}: ${count} occurrences`);
}

// Check for the problematic region
console.log('\n=== Detailed character dump around each } ===');
let depth = 0;
let inStr = false;
let strChar = null;
let esc = false;
let prevDepth = 0;
for (let i = 0; i < shuffleCode.length; i++) {
  const ch = shuffleCode[i];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
  if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
  if (!inStr) {
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth !== prevDepth) {
        const prev5 = shuffleCode.substring(Math.max(0, i - 5), i);
        const next5 = shuffleCode.substring(i + 1, i + 6);
        console.log(`@${i} depth ${depth}: ...${prev5}}${next5}...`);
        prevDepth = depth;
      }
    }
  }
}

// Look at the code around the first unexpected } that might cause issues
// Let me try manually constructing the function body
console.log('\n=== Try to build function manually ===');
// The issue might be that `new Function` creates `function anonymous() { CODE }` 
// and CODE uses `const _0x4d130f = ...` at top level which is fine
// But maybe there's an arrow function body issue or something

// Let me test with a simplified version
const simpleTest = 'const _0x4d130f=_0x11fd;(function(){var x=1;})();';
try {
  new Function(simpleTest);
  console.log('Simple test: OK');
} catch(e) {
  console.log('Simple test: FAIL -', e.message);
}
