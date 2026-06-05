const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Verify extraction boundaries by locating exact positions
// function _0x9183 starts at 3814683
const func9183Start = bundle.indexOf('function _0x9183(');
console.log('function _0x9183() position:', func9183Start);

// Find the matching closing brace
let depth = 0;
let inStr = false;
let strChar = null;
let esc = false;
let braceStart = -1;
let funcEnd = -1;

for (let i = func9183Start; i < bundle.length; i++) {
  const ch = bundle[i];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
  if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
  if (!inStr) {
    if (ch === '{') {
      if (depth === 0) braceStart = i;
      depth++;
    }
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        funcEnd = i;
        console.log('Function body from', braceStart, 'to', i, `(${i - braceStart + 1} chars)`);
        const after = bundle.substring(i + 1, i + 50);
        console.log('After function:', JSON.stringify(after));
        break;
      }
    }
  }
}

const extractedFunc = bundle.substring(func9183Start, funcEnd + 1);
fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\verify_9183.js', '// Verification\n' + extractedFunc + '\nconsole.log("Function parses OK");');
console.log('\nWritten verify_9183.js (' + (extractedFunc.length / 1024 / 1024).toFixed(2) + ' MB)');
