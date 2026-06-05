const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Strategy: Extract the beginning of the bundle which contains the shuffling code,
// plus the function definitions for _0x9183 and _0x11fd.
// Then run it in Node.js to get the key values.

// 1. The shuffling code starts at position 0
// It passes _0x9183 (a function) to an IIFE that shuffles the array
// The shuffling code also calls _0x11fd to resolve strings

// 2. Find the end of the shuffling IIFE and first few statements
// Pattern: the shuffling IIFE ends with }}(_0x9183,0x9279c));
// Then there's code like: var e;function t(...){...}!(function(){...})();

// Let's find the range from start to where the actual React app code begins
// We can detect this by finding the first IIFE that references document

// The key challenge: the shuffling code calls _0x11fd which calls _0x9183()
// At this point, _0x9183 is the function (hoisted), and _0x9183() returns the string array
// So we need:
//   a) function _0x9183() { ... }  (defines and returns the string array)
//   b) function _0x11fd(...) { ... } (deobfuscator)
//   c) The shuffling IIFE

// Let's extract these by finding the exact function bodies using brace matching

function findMatchingBrace(str, startPos) {
  let depth = 0;
  let inString = false;
  let stringChar = null;
  let escape = false;
  // Skip to the opening brace
  const openPos = str.indexOf('{', startPos);
  if (openPos === -1) return -1;
  
  for (let i = openPos; i < str.length; i++) {
    const ch = str[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      if (!inString) { inString = true; stringChar = ch; }
      else if (stringChar === ch) { inString = false; stringChar = null; }
      continue;
    }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  return -1;
}

// Find function _0x9183()
const func9183Start = bundle.indexOf('function _0x9183(');
if (func9183Start === -1) { console.log('_0x9183 function not found'); process.exit(1); }
const func9183End = findMatchingBrace(bundle, func9183Start);
if (func9183End === -1) { console.log('_0x9183 end not found'); process.exit(1); }
const func9183 = bundle.substring(func9183Start, func9183End + 1);
console.log('_0x9183 function: from', func9183Start, 'to', func9183End, `(${func9183.length} chars)`);

// Find function _0x11fd()
const func11fdStart = bundle.indexOf('function _0x11fd(');
if (func11fdStart === -1) { console.log('_0x11fd function not found'); process.exit(1); }
const func11fdEnd = findMatchingBrace(bundle, func11fdStart);
const func11fd = bundle.substring(func11fdStart, func11fdEnd + 1);
console.log('_0x11fd function: from', func11fdStart, 'to', func11fdEnd, `(${func11fd.length} chars)`);

// The shuffling code is at the beginning, before _0x9183 is defined
// It uses hoisted _0x9183 and _0x11fd
// Let's extract from position 0 up to before the first non-hoisted code
// Actually, the shuffling IIFE is:
// const _0x4d130f=_0x11fd;(function(...){...}(_0x9183,0x9279c));var e;function t(...){...}!(function(){...})();

// Let's find the end of the shuffling code
// The pattern is: the shuffling IIFE is called with (_0x9183, 0x9279c)
// After it ends, there's usually `var e;function t(...)` 
// Let me extract from start until we find the first obvious app code

// Actually, let's try a different approach: extract everything from the beginning
// until before the React/Vue app initialization code
// The app init code typically references React.createElement or __vite__mapDeps

// Let's find how far we need to go

// First, let me look at the structure: the _0x9183 function starts at func9183Start
// The bundle starts at 0 with the shuffling code
// After the shuffling code, there's more initialization then app code

// Let's find where the app code begins by looking for Vite-specific patterns
const vitePatterns = ['__vite__mapDeps', '__vite__injectQuery', 'import.meta', 'React'];
for (const pat of vitePatterns) {
  const idx = bundle.indexOf(pat);
  if (idx > 0) {
    console.log(`${pat} found at ${idx}`);
  }
}

// Let's try to extract a limited portion that includes:
// 1. The deobfuscator function _0x11fd
// 2. The string array function _0x9183
// 3. The shuffling code and any necessary follow-up code
// Then run it

// Approach: extract the first N chars that contain all necessary definitions
// plus the shuffling code

// The _0x9183 function is defined at func9183Start (~5486143)
// The shuffling code is at position 0
// They're far apart, so we need to extract two chunks

// Let me try a different approach entirely:
// Extract JUST the _0x9183 function body (the string array definition)
// Then let me try to extract the array directly

// Look at the _0x9183 function body
const openBrace = bundle.indexOf('{', func9183Start);
const body = bundle.substring(openBrace + 1, func9183End);
console.log('\n_0x9183 body preview (first 200 chars):');
console.log(body.substring(0, 200));
console.log('\n_0x9183 body preview (last 200 chars):');
console.log(body.substring(body.length - 200));

// The function likely has the pattern:
// function _0x9183() {
//   const _0xXXXX = [...];  // the string array
//   // possibly some other code
//   return _0xXXXX;
// }

// Let's find the array in the body
const arrStart = body.indexOf('=[');
if (arrStart > 0) {
  // Find the matching closing bracket
  let depth = 0;
  let inStr = false;
  let strChar = null;
  let esc = false;
  let arrEnd = -1;
  for (let i = body.indexOf('[', arrStart); i < body.length; i++) {
    const ch = body[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if ((ch === '"' || ch === "'" || ch === '`') && !inStr) { inStr = true; strChar = ch; continue; }
    if (ch === strChar && inStr) { inStr = false; strChar = null; continue; }
    if (!inStr) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) { arrEnd = i; break; }
      }
    }
  }
  if (arrEnd > 0) {
    const arrayContent = body.substring(arrStart + 1, arrEnd + 1); // =[...]
    console.log(`\nArray in _0x9183 body: ${arrStart+1} to ${arrEnd+1} (${arrayContent.length} chars)`);
    // Count strings
    const strings = arrayContent.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
    console.log(`Number of strings: ${strings ? strings.length : 0}`);
    if (strings) {
      console.log('First 5 strings:', strings.slice(0, 5));
      console.log('Last 5 strings:', strings.slice(-5));
    }
    
    // Now let me see: is this array complete or does it reference other variables?
    console.log('\nFirst 500 chars of array:');
    console.log(arrayContent.substring(0, 500));
    console.log('\nLast 500 chars of array:');
    console.log(arrayContent.substring(arrayContent.length - 500));
  }
}
