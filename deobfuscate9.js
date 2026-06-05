const fs = require('fs');
const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Find _0x11fd definition - the base deobfuscator
// From position 6: const _0x4d130f=_0x11fd;
// So _0x11fd is the function, _0x4d130f is just a reference to it

console.log('=== _0x11fd definition ===');
// Find where _0x11fd is defined (as a function or variable)
const idx11fd = text.indexOf('_0x11fd=');
if (idx11fd !== -1) {
  console.log('At', idx11fd, ':', text.substring(idx11fd, idx11fd + 100));
} else {
  // Try where it's used as function
  const patterns = [
    '_0x11fd=function',
    'var _0x11fd=',
    'const _0x11fd=',
    'let _0x11fd=',
    '),_0x11fd=function',
  ];
  for (const p of patterns) {
    let i = text.indexOf(p);
    if (i !== -1) {
      console.log('Found with pattern "' + p + '" at', i, ':', text.substring(i, i + 100));
    }
  }
}

// Let me look at the beginning of the bundle more carefully
console.log('\n\n=== Start of bundle (first 2000 chars) ===');
console.log(text.substring(0, 2000));

// Find the IIFE that wraps the bundle and defines the deobfuscator
// Typically: (function(_0x...., _0x....){...}(array, number))

// Let me search for the string array referenced by "af"
// af() returns [elements from _0x226638]
// _0x226638 is an object defined within af()
// Let me find the actual section that defines _0x226638

console.log('\n\n=== Looking for _0x226638 definition inside af() ===');
const afStart = text.indexOf('function af(){');
if (afStart !== -1) {
  // Find the first object definition inside af()
  const obInAf = text.indexOf('={', afStart);
  if (obInAf !== -1 && obInAf < afStart + 2000) {
    console.log('First object in af() at', obInAf);
    console.log(text.substring(obInAf - 50, obInAf + 500));
  }
}

// Let me try another approach - look for the _0x226638 variable definition
console.log('\n\n=== Searching for _0x226638 ===');
idx = text.indexOf('_0x226638=');
if (idx !== -1) {
  console.log('_0x226638 defined at', idx, ':', text.substring(idx, idx + 200));
}

// Let me also search for the _0x2bcfcf function  
console.log('\n\n=== Searching for _0x2bcfcf ===');
idx = text.indexOf('_0x2bcfcf=');
if (idx !== -1) {
  console.log('_0x2bcfcf defined at', idx, ':', text.substring(idx, idx + 100));
}
if (idx === -1) {
  idx = text.indexOf('_0x2bcfcf');
  if (idx !== -1) {
    console.log('_0x2bcfcf found at', idx, ':', text.substring(Math.max(0, idx-20), idx+60));
  }
}

// Let me find the qa function definition - it seems to create a Vue component
console.log('\n\n=== Searching for qa function ===');
idx = text.indexOf('function qa(');
if (idx !== -1) {
  console.log('At', idx, ':', text.substring(idx, idx + 100));
}
idx = text.indexOf(',qa=');
if (idx !== -1) {
  console.log('Also at', idx, ':', text.substring(idx, idx + 60));
}

// Let me search for the string array differently - by looking at the very start of the file
// The first few lines contain the array definition
console.log('\n\n=== First 10000 chars (saving to file) ===');
fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\region_start.txt', text.substring(0, 10000));

// Find the string array near top by searching for a pattern like >100 strings in an array
console.log('\n\n=== Search for large arrays with string elements ===');
const hugeArrays = text.match(/\[['"][^'"]{1,50}['"](?:\s*,\s*['"][^'"]{1,50}['"]){100,}\]/);
if (hugeArrays) {
  console.log('Found huge array:', hugeArrays[0].substring(0, 500));
}

// Try to find the array with string elements by finding contiguous string patterns
const stringArrays = [];
let searchIdx = 0;
let maxSearchLoop = 200;
while (searchIdx < text.length && stringArrays.length < 10 && maxSearchLoop-- > 0) {
  // Look for pattern ['str1','str2', ...
  const match = text.substring(searchIdx).match(/^\[(['"][a-zA-Z0-9_\-+\/\\=\s]{1,40}['"]\s*,\s*){3,}\]/);
  if (match) {
    stringArrays.push({ pos: searchIdx, text: match[0].substring(0, 300) });
    searchIdx += match[0].length;
  } else {
    searchIdx += 1000; // skip ahead
  }
}
stringArrays.forEach((a, i) => {
  console.log(`Array ${i} at ${a.pos}: ${a.text.substring(0, 150)}`);
});
