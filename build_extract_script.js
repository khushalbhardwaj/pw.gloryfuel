const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Extract segments:
// 1. function _0x11fd from 189108 to 189250
// 2. function _0x9183 from 3814683 to 5486198
// 3. Shuffling code: first 661 chars (0 to 660 is }}(_0x9183,0x9279c));
//    The shuffling code starts with: const _0x4d130f=_0x11fd;(function...}(_0x9183,0x9279c));
//    We also need var e;function t(...) because _0x9183's body reference function t?
//    Actually, _0x9183 body has 0 _0x4d130f refs, so it doesn't need t
//    But hT reference _0x4d130f. However hT is not part of _0x9183 body.

// Let's keep it minimal: just the function defs and shuffling code

const func11fd = bundle.substring(189108, 189251); // includes closing }
const func9183 = bundle.substring(3814683, 5486199); // includes closing }
const shuffleCode = bundle.substring(0, 661); // up to and including }}(_0x9183,0x9279c));

// Verify we have correct extraction
console.log('_0x11fd length:', func11fd.length);
console.log('_0x11fd:', func11fd);
console.log('\n_0x9183 length:', func9183.length);
console.log('_0x9183 first 100:', func9183.substring(0, 100));
console.log('_0x9183 last 100:', func9183.substring(func9183.length - 100));
console.log('\nShuffle length:', shuffleCode.length);
console.log('Shuffle:', shuffleCode.substring(0, 100) + '...' + shuffleCode.substring(shuffleCode.length - 50));

// Now create the extraction script
const outputScript = `
// Extracted deobfuscator and string array from lite.pw4free.in bundle
// Run this script to get the deobfuscated key and IV values

${func11fd}

${func9183}

// Now run the shuffling code to rearrange the array
${shuffleCode}

// After shuffling, extract the key and IV
// nf = ef(0x132) - IV (UTF-8)
// uZodO = ef(0x44f4) - Key (base64)
// In the bundle, ef is typically an alias for _0x11fd or _0x4d130f
// Let's try all possible names

const ivHex = _0x4d130f(0x132);
const keyBase64 = _0x4d130f(0x44f4);

console.log('IV (raw):', ivHex);
console.log('Key (raw):', keyBase64);

// Also try with _0x11fd directly
try {
  const iv2 = _0x11fd(0x132);
  const key2 = _0x11fd(0x44f4);
  console.log('\\nVia _0x11fd:');
  console.log('IV:', iv2);
  console.log('Key:', key2);
} catch(e) {
  console.log('_0x11fd error:', e.message);
}

// The deobfuscator returns strings from the shuffled array.
// For AES-CBC: key should be a 32-byte base64, IV should be 16-byte UTF-8
// or Hex
console.log('\\n=== Analysis ===');
if (keyBase64) {
  console.log('Key length:', keyBase64.length);
  console.log('Key chars:', [...keyBase64].map(c => c.charCodeAt(0)));
}
if (ivHex) {
  console.log('IV length:', ivHex.length);
  console.log('IV chars:', [...ivHex].map(c => c.charCodeAt(0)));
}
`;

fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\extract_key.js', outputScript);
console.log('\nWritten extract_key.js (' + (outputScript.length / 1024 / 1024).toFixed(2) + ' MB)');
