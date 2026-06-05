const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Find the deobfuscator function
const deobfuscatorMatch = bundle.match(/function\s+_0x11fd\s*\([^)]+\)\s*\{[^}]+\}/);
if (deobfuscatorMatch) {
  console.log('Deobfuscator found at', deobfuscatorMatch.index);
  console.log(deobfuscatorMatch[0].substring(0, 300));
  console.log('---');
}

// Find all function declarations
const funcDecls = bundle.match(/function\s+_0x[0-9a-f]+\s*\([^)]*\)\s*\{/g);
if (funcDecls) {
  console.log('\nFunction declarations found:', funcDecls.length);
  const interesting = funcDecls.filter(f => f.includes('_0x9183') || f.includes('_0x11fd'));
  console.log('Matches with 9183/11fd:', interesting);
  funcDecls.slice(0, 5).forEach(f => console.log('  ', f.substring(0, 80)));
}

// Find _0x9183 definition - it might be a var, function, or assignment
const pattern1 = bundle.match(/(?:var|const|let)\s+_0x9183\s*=\s*function/);
if (pattern1) console.log('\nPattern1 (var _0x9183 = function):', pattern1[0].substring(0, 100));

// Search for function _0x9183
const pattern2 = bundle.match(/function\s+_0x9183\s*\(/);
if (pattern2) console.log('\nPattern2 (function _0x9183):', bundle.substring(pattern2.index, pattern2.index + 200));

// Search for _0x9183 = function
const pattern3 = bundle.match(/_0x9183\s*=\s*function/);
if (pattern3) console.log('\nPattern3 (_0x9183 = function):', bundle.substring(pattern3.index, pattern3.index + 200));

// Search for the string array literal - look for large array definitions
const arrMatch = bundle.match(/=\s*\["[\s\S]{10000,}?"\]/);
if (arrMatch) {
  console.log('\nLarge array found at', arrMatch.index, 'length:', arrMatch[0].length);
  // Count elements
  const elements = arrMatch[0].match(/"([^"]*)"/g);
  if (elements) console.log('Elements:', elements.length);
}

// Find _0x9183 function by looking for the return statement pattern
// The function likely returns the string array
const returnArr = bundle.match(/return\s*\[[\s\S]{1000,100000}?\];/);
if (returnArr) {
  console.log('\nReturn array at', returnArr.index, 'length:', returnArr[0].length);
  const elements = returnArr[0].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
  console.log('Elements found in return:', elements ? elements.length : 0);
  if (elements) {
    console.log('First 5:', elements.slice(0, 5));
  }
}

// Search specifically for patterns near the position where _0x9183 is defined
console.log('\n=== Checking first 1000 chars for _0x9183 ===');
const first1k = bundle.substring(0, 1000);
const firstRef = first1k.indexOf('_0x9183');
console.log('First ref @', firstRef, ':', first1k.substring(Math.max(0, firstRef-50), firstRef+80));

// Search for the _0x9183 definition more broadly - it defines the string array
// Pattern: function _0x9183() { ... var/const _0xXXXX = [...]; return _0xXXXX; }
console.log('\n=== Searching for _0x9183 = function() ===');
const searchStart = 0;
const idx = bundle.indexOf('_0x9183=', searchStart);
if (idx > 0) {
  console.log('Found @', idx, ':', bundle.substring(Math.max(0, idx-20), idx + 120));
}

// More importantly, the shuffler calls _0x9183() to get the array
// The function _0x11fd also calls _0x9183() to get the array
// We need to find where the string array itself is defined
// It's likely in a pattern like: function _0x9183() { return _0xXXXX; } where _0xXXXX = [...]
console.log('\n=== Searching for string array definition ===');
const arrayStart = bundle.indexOf('=["');
if (arrayStart > 0 && arrayStart < 200000) {
  console.log('String array @', arrayStart, ': start of array content');
  // Count elements
  let count = 0;
  let pos = arrayStart;
  while ((pos = bundle.indexOf('","', pos)) !== -1 && pos < arrayStart + 1000000) {
    count++;
    pos += 2;
  }
  console.log('Approx elements:', count);
}
