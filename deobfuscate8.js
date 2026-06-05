const fs = require('fs');
const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Find _0x4d130f definition - main deobfuscator
const idx4d130f = text.indexOf('_0x4d130f=');
if (idx4d130f === -1) console.log('_0x4d130f= not found');

// Find the deobfuscator function and string array setup
// In this obfuscation, _0x4d130f is the function, and it uses an array "fk" or similar
// Let me find where the string array is defined

// Search for "fk" variable near the start of the file
const startSection = text.substring(0, 100000);
const arrayDefs = startSection.match(/(?:var|const|let)\s+\w+\s*=\s*\[[^\]]{100,5000}\]/g);
if (arrayDefs) {
  console.log('Found', arrayDefs.length, 'array definitions in first 100k chars');
  arrayDefs.forEach((def, i) => {
    const varName = def.match(/var\s+(\w+)/);
    if (varName) {
      const name = varName[1];
      const count = (def.match(/['"][^'"]*['"]/g) || []).length;
      console.log(`  Array ${i}: ${name} (${count} strings)`);
    }
  });
}

// Search for _0x4d130f definition more broadly
console.log('\n\n=== Searching for _0x4d130f ===');
let idx = 0;
let found = 0;
while ((idx = text.indexOf('_0x4d130f', idx)) !== -1 && found < 5) {
  if (text[idx + 9] === '=' || text[idx + 9] === ',') {
    console.log('At', idx, ':', text.substring(Math.max(0, idx-20), idx+20));
    found++;
  }
  idx++;
}

// The key insight: _0x4d130f is a function like tf but for a different string array.
// The string arrays are pre-shifted (index - offset).
// Let me find the string array for the main deobfuscator

// Search for where the string array is declared and shifted
// Common pattern: "var fk; ... function fk(){return [...]}"
// or "(function(_0x....){...}([...]))"

// Let me extract the deobfuscator initialization code
console.log('\n\n=== Searching for the string array used by _0x4d130f ===');

// Look for the pattern where a function returns a string array
const afMatches = text.match(/function \w+\(\)\{[^}]{500,20000}?return\s*\[/g);
if (afMatches) {
  afMatches.forEach((m, i) => {
    console.log(`\naf-like function ${i}: length ${m.length}, first 100: ${m.substring(0, 100)}`);
  });
}

// Let me try the simpler approach: extract the full bundle, isolate the crypto parts,
// and test end-to-end. But first, let me check if there's a simpler way - 
// maybe the key can be found by looking at the API response and testing
// common passwords

// Actually, let me try to run the bundle in a mock browser environment
// to extract the actual key. But that's complex.

// For now, let me just try to figure out what nf resolves to by understanding the string array
// The string array is the return value of the `af()` function (the one I saw earlier)
// In the af() I saw: return [references to _0x226638 keys]

// So each element of the main array is derived from _0x226638 object.
// _0x226638 is itself built from string properties resolved through _0x2bcfcf

// This is deeply nested. Let me just extract the relevant parts and try running them.

// Extract the core deobfuscator sections
console.log('\n\n=== Dumping region with _0x4d130f definition ===');
const region = text.substring(0, 50000);
// Save this region for analysis
fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\region_0_50k.txt', region);
console.log('Saved region 0-50k');

// Also dump the region around nf definition (945000-947000)
console.log('\n\n=== Region around nf (945000-947000) ===');
const nfRegion = text.substring(945000, 947000);
console.log(nfRegion);
fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\region_nf.txt', nfRegion);

// Now try something practical - find if the key is in the string array by 
// looking for common key strings in the bundle
console.log('\n\n=== Searching for common key strings ===');
const keyCandidates = [
  'pw4free', 'pw4freelite', 'maggikhalo', 'gloryfuel',
  'pW4fRee!@#', 'pw@2024', 'PhysicsWallah', 'pwallah',
  'delta', 'deltastudy', 'rarestudy', 'study',
];
for (const k of keyCandidates) {
  if (text.includes(k)) {
    console.log(`Found key candidate: "${k}"`);
  }
}
