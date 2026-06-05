const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

const shuffleCode = bundle.substring(0, 661);
console.log('Shuffle code length:', shuffleCode.length);
console.log('\nFull shuffle code:');
console.log(shuffleCode);

console.log('\n\n=== Brace matching ===');
let depth = 0;
let inStr = false;
let strChar = null;
let esc = false;
for (let i = 0; i < shuffleCode.length; i++) {
  const ch = shuffleCode[i];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
  if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
  if (!inStr) {
    if (ch === '{') { depth++; console.log(`  @${i}: { depth=${depth}`); }
    if (ch === '}') { depth--; console.log(`  @${i}: } depth=${depth}`); }
    if (ch === '(') console.log(`  @${i}: (`);
    if (ch === ')') console.log(`  @${i}: )`);
  }
}
console.log('Final depth:', depth);

// Also try to compile the shuffle code alone
try {
  new Function(shuffleCode);
  console.log('\nShuffle alone: OK');
} catch (e) {
  console.log('\nShuffle alone: FAIL -', e.message);
}

// Try to compile just the function body part
const funcStart = shuffleCode.indexOf('(function(');
if (funcStart > 0) {
  const alone = shuffleCode.substring(funcStart);
  try {
    new Function(alone);
    console.log('IIFE alone: OK');
  } catch (e) {
    console.log('IIFE alone: FAIL -', e.message);
  }
}
