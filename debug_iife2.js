const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');
const shuffleCode = bundle.substring(0, 661);

const iife = shuffleCode.substring(28);

// Test with actual arguments
try {
  new Function(iife);
  console.log('Actual IIFE with real args: OK');
} catch(e) {
  console.log('Actual IIFE with real args: FAIL -', e.message);
  console.log('Last 50 chars:', JSON.stringify(iife.substring(iife.length - 50)));
}

// The exact issue might be with the parentheses/bracket matching
// Let me count every character in the IIFE
let braces = 0;
let parens = 0;
let brackets = 0;
let inStr = false;
let strChar = null;
let esc = false;

for (let i = 0; i < iife.length; i++) {
  const ch = iife[i];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
  if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
  if (!inStr) {
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
}

console.log(`\nIIFE brace balance: ${braces}, paren balance: ${parens}, bracket balance: ${brackets}`);

// Now do the SAME for the full shuffle code (with const)
const fullIIFE = shuffleCode;
braces = parens = brackets = 0;
for (let i = 0; i < fullIIFE.length; i++) {
  const ch = fullIIFE[i];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
  if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
  if (!inStr) {
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
}
console.log(`Full shuffle brace balance: ${braces}, paren balance: ${parens}, bracket balance: ${brackets}`);

// Hmm, the "IIFE with while+try" test failed but the "Actual IIFE body" passed.
// Those had different code. Let me check if the difference is the arguments.
const withConst9183 = iife.replace('}(a,b))', '}(_0x9183,0x9279c))');
try {
  new Function(withConst9183);
  console.log('\nWith _0x9183 as arg: OK');
} catch(e) {
  console.log('\nWith _0x9183 as arg: FAIL -', e.message);
}

// What about 0x9279c?
const withHexArg = iife.replace('}(a,b))', '}(x,0x9279c))');
try {
  new Function(withHexArg);
  console.log('With 0x9279c arg: OK');
} catch(e) {
  console.log('With 0x9279c arg: FAIL -', e.message);
}
