const fs = require('fs');
const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Find and extract _0x11fd - the base deobfuscator function
// It should be defined shortly after the shuffler

console.log('=== Extracting core deobfuscator code ===\n');

// Find the _0x9183 array definition
const arrayStart = text.indexOf('var _0x9183=');
if (arrayStart === -1) console.log('var _0x9183= not found');
const arrayEnd = text.indexOf(';(', arrayStart);
if (arrayStart !== -1 && arrayEnd !== -1) {
  console.log('_0x9183 array at', arrayStart, '-', arrayEnd);
  const arrDef = text.substring(arrayStart, arrayEnd + 1);
  console.log('Array first 300 chars:', arrDef.substring(0, 300));
  console.log('Array length:', arrDef.length);
  // Count strings
  const stringCount = (arrDef.match(/['"][^'"]*['"]/g) || []).length;
  console.log('String count:', stringCount);
}

// Find the _0x11fd function definition
const fnStart = text.indexOf('function _0x11fd(');
if (fnStart === -1) console.log('function _0x11fd( not found');

// Try to extract the full deobfuscator - find _0x11fd definition
let searchPos = 0;
let found = false;
while (!found && searchPos < text.length) {
  const idx = text.indexOf('_0x11fd=', searchPos);
  if (idx === -1 || idx > 500000) break;
  // Check if this is a function assignment
  const snippet = text.substring(idx, idx + 80);
  if (snippet.includes('function') || snippet.includes('=>')) {
    console.log('\n_0x11fd function def at', idx, ':', snippet);
    found = true;
  }
  searchPos = idx + 1;
}

// Let me try a different approach - search for _0x11fd that looks like a function
// in the first 100k chars
const first100k = text.substring(0, 100000);
const fnMatches = first100k.match(/_0x11fd\s*=\s*(?:function|\().{100,1000}/);
if (fnMatches) {
  console.log('\nFound _0x11fd assignment in first 100k:');
  console.log(fnMatches[0].substring(0, 500));
}

// Also check if it's a simple function pattern
console.log('\n\n=== Looking for simplified _0x11fd pattern ===');
// In some obfuscations, the deobfuscator is redefined after the shuffler
// Search for patterns like "_0x11fd=function(_0x....,_0x....){...}"
const pattern1 = text.match(/_0x11fd\s*=\s*function\s*\([^)]+\)\s*\{[^}]+return[^}]+}/);
if (pattern1) {
  console.log('Found pattern1:', pattern1[0].substring(0, 300));
}

// Search for a pattern where _0x11fd just accesses the array and shifts
const pattern2 = text.match(/,_0x11fd\s*=\s*function\s*\([^)]+\)\s*\{[^}]{10,500}\};/);
if (pattern2) {
  const str = pattern2[0];
  console.log('Found pattern2:', str.substring(0, 300));
}

// Let me search for the IIFE setup more carefully
// Look at what happens right after the shuffler
console.log('\n\n=== Area after shuffler (searching for deobfuscator function) ===');
// The shuffler is: }((...), 0x9279c));
// Let me find the end of the IIFE
const iifeEnd = text.indexOf('0x9279c));');
if (iifeEnd !== -1) {
  console.log('Shuffler IIFE ends at', iifeEnd);
  console.log('After IIFE:', text.substring(iifeEnd, iifeEnd + 500));
}

// Let me also check what the _0x9183 array content looks like more fully
console.log('\n\n=== Full _0x9183 array dump ===');
if (arrayStart !== -1 && arrayEnd !== -1) {
  const arrContent = text.substring(arrayStart, arrayEnd + 1);
  // Extract individual string elements
  const strings = arrContent.match(/['"][^'"]*['"]/g);
  if (strings) {
    // print first 30 and a few at specific indices
    console.log('Total strings:', strings.length);
    for (let i = 0; i < Math.min(30, strings.length); i++) {
      console.log(`  [${i}]: ${strings[i]}`);
    }
    // Print strings at around index 0x44f4 - offset
    // If the offset is ~0x4d2, then 0x44f4 - 0x4d2 = ~0x22 = 34
    for (let i = Math.max(0, 1100); i < Math.min(strings.length, 1200); i++) {
      console.log(`  [${i}]: ${strings[i]}`);
    }
  }
}
