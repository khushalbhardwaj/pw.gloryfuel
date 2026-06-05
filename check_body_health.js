const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Find the function _0x9183 body
const funcStart = bundle.indexOf('function _0x9183(');
const bodyStart = bundle.indexOf('{', funcStart);
const bodyEndPos = (() => {
  let depth = 0;
  let inStr = false;
  let strChar = null;
  let esc = false;
  for (let i = bodyStart; i < bundle.length; i++) {
    const ch = bundle[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
    if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
    if (!inStr) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  return -1;
})();

const body = bundle.substring(bodyStart, bodyEndPos + 1);
console.log('Function body from', bodyStart, 'to', bodyEndPos, `(${body.length} chars)`);

// Check the closing part
console.log('\nLast 200 chars of body:');
console.log(JSON.stringify(body.substring(body.length - 200)));

// Check for unbalanced braces
let braces = 0;
let inStr2 = false;
let strChar2 = null;
let esc2 = false;
let strangeChars = [];

for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  if (esc2) { esc2 = false; continue; }
  if (ch === '\\' && inStr2) { esc2 = true; continue; }
  if ((ch === '"' || ch === "'" || ch === '`') && !inStr2) { inStr2 = true; strChar2 = ch; continue; }
  if (ch === strChar2 && inStr2) { inStr2 = false; strChar2 = null; continue; }
  if (!inStr2) {
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') braces++;
    if (ch === ')') braces--;
    if (ch === '[') braces++;
    if (ch === ']') braces--;
  }
  
  // Check for control characters outside strings
  if (!inStr2 && ch.charCodeAt(0) < 32 && ch !== '\n' && ch !== '\r' && ch !== '\t') {
    strangeChars.push({ pos: i, char: ch.charCodeAt(0), ctx: body.substring(Math.max(0,i-10), i+10) });
  }
}

console.log('\nNet brace balance:', braces);
console.log('Strange chars found:', strangeChars.length);
if (strangeChars.length > 0) {
  strangeChars.slice(0, 5).forEach(s => console.log('  @' + s.pos + ': \\x' + s.char.toString(16) + ' - ' + JSON.stringify(s.ctx)));
}

// Count quotes
let quoteCount = 0;
let esc3 = false;
let inStr3 = false;
for (let i = 0; i < body.length; i++) {
  const ch = body[i];
  if (esc3) { esc3 = false; continue; }
  if (ch === '\\' && inStr3) { esc3 = true; continue; }
  if (ch === "'" && !inStr3) { inStr3 = true; quoteCount++; }
  else if (ch === "'" && inStr3) { inStr3 = false; quoteCount++; }
}
console.log('\nTotal single quotes:', quoteCount, '(should be even)');
console.log('Quote balance:', quoteCount % 2 === 0 ? 'EVEN' : 'ODD!');
