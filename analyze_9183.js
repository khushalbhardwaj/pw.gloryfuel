const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// The _0x9183 function is from 3814683 to 5486198
const func9183Body = bundle.substring(3814683, 5486198);

// Search for _0x4d130f references in the _0x9183 body
let idx = 0;
let count = 0;
while ((idx = func9183Body.indexOf('_0x4d130f', idx)) !== -1 && count < 5) {
  const ctx = func9183Body.substring(Math.max(0, idx - 40), idx + 60);
  console.log(`_0x4d130f ref @ ${idx}: ...${ctx}...`);
  idx += '_0x4d130f'.length;
  count++;
}
console.log(`Total _0x4d130f refs in _0x9183 body: ${count}`);

// Search for document/window references in the _0x9183 body
const docRefs = (func9183Body.match(/\bdocument\b/g) || []).length;
const winRefs = (func9183Body.match(/\bwindow\b/g) || []).length;
console.log(`\ndocument refs: ${docRefs}, window refs: ${winRefs}`);

// Search for 'addEventListener' references
const addEventRefs = (func9183Body.match(/addEventListener/g) || []).length;
console.log(`addEventListener refs: ${addEventRefs}`);

// Find the end of the _0x9183 function and what comes after
const after9183 = bundle.substring(5486198, 5486500);
console.log('\nAfter _0x9183 (first 300 chars):');
console.log(after9183);

// Look for more function declarations after _0x9183
const moreFuncs = after9183.match(/function\s+\w+\s*\(/g);
if (moreFuncs) console.log('Functions found:', moreFuncs);

// Find the end of _0x9183 function and any subsequent function declarations
// that might be referenced by _0x9183 during first execution
let braceDepth = 0;
let inStr = false;
let strChar = null;
let esc = false;
let funcEnd = -1;

// Find the opening brace of _0x9183
const openIdx = bundle.indexOf('{', 3814683);
if (openIdx > 0) {
  for (let i = openIdx; i < bundle.length; i++) {
    const ch = bundle[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
    if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
    if (!inStr) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0) { funcEnd = i; break; }
      }
    }
  }
  console.log(`\n_0x9183 function: ${openIdx} to ${funcEnd} (${funcEnd - openIdx + 1} chars)`);
  
  // What's after the function?
  const after = bundle.substring(funcEnd + 1, funcEnd + 300);
  console.log('After _0x9183():', after.substring(0, 200));
}
