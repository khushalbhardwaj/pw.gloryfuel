const fs = require('fs');

const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// nf = ef(0x132), let me find what the string array looks like
// The ef function was assigned from tf, so I need to find the string array

// Find the area around ef definition and string array
// Position 931187: ef = tf;
// But before that there's the string array definition

console.log('=== Area around ef=tf (930500-932500) ===');
console.log(text.substring(930500, 932500));

// Find the actual string array - search for large array of strings
console.log('\n\n=== Looking for the big string array ===');
// Find Nf or similar large function with array
const area1 = text.substring(928000, 935000);

// Find the function that initializes the string array
const efDefMatch = text.match(/\w+\s*=\s*tf;\s*function\s*tf[^}]+}/);
if (efDefMatch) {
  console.log('tf function definition:');
  console.log(efDefMatch[0].substring(0, 300));
}

// Let's look for the string array that tf uses
// tf(0x132) means tf(306), so the string at index 306
// The string array is likely defined near the top of the file

// Let me check what's around the actual tf function
console.log('\n\n=== tf function body ===');
idx = text.indexOf('function tf(', 931000);
if (idx !== -1) {
  console.log(text.substring(idx, idx + 500));
}

// find what _0x5b8efc is (the main deobfuscator)
idx = text.indexOf('_0x5b8efc=');
if (idx === -1) idx = text.indexOf('_0x5b8efc =');
if (idx === -1) idx = text.indexOf(',_0x5b8efc=');
console.log('\n\n=== _0x5b8efc definition ===');
if (idx !== -1) {
  console.log('At', idx, ':', text.substring(idx, idx + 200));
}

// Let me search for the string array differently
// The tf function likely uses a string array variable
console.log('\n\n=== Search for the main deobfuscator string array ===');
// Search for patterns like [a-z]+=[a-z]+\(0x[0-9a-f]+\) near the start
const startArea = text.substring(0, 50000);
// Look for the string array used by the main deobfuscator
const arrPatterns = [
  /\w+\s*=\s*\[['"][^'"]+['"]/g,
  /var\s+\w+\s*=\s*\[['"][^'"]+['"]/g,
];
for (const pat of arrPatterns) {
  let m;
  while ((m = pat.exec(startArea)) !== null) {
    console.log('Found array:', m[0].substring(0, 60));
  }
}

// Find the string assignment that happens for index 0x132
// Maybe search for the actual string at 306
// Let me read the string array from tf
// In javascript-obfuscator style, strings are stored as ['str0','str1',...] and accessed by index
// Look for a very large array initialization

// Search for the string "vf" or similar that resolves strings
console.log('\n\n=== Large string array search ===');
// Common pattern: var _0x1234 = ['str1','str2',...]; with many strings
// Find such arrays with >100 elements
const potentialArrays = text.match(/(?:var|const|let)\s+\w+\s*=\s*\[(?:['"][^'"]*['"],\s*){100,}['"][^'"]*['"]\]/);
if (potentialArrays) {
  console.log('Found large array:', potentialArrays[0].substring(0, 200));
}
