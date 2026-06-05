const fs = require('fs');

const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Find nf - search for where nf is assigned/declared
console.log('=== Finding nf variable definition ===');
let idx = 0;
let nfCount = 0;
while ((idx = text.indexOf('nf', idx)) !== -1 && nfCount < 30) {
  // Check if nf is being assigned or used as a variable reference (not part of another word)
  const before = text.substring(Math.max(0, idx - 30), idx);
  const after = text.substring(idx, Math.min(text.length, idx + 60));
  // nf is likely a variable if preceded by non-alphanumeric chars
  if (idx === 0 || /[^a-zA-Z0-9_]/.test(text[idx-1])) {
    console.log('At', idx, ':', before, '>>>', after.substring(0, 40), '<<<', after.substring(40));
    nfCount++;
  }
  idx++;
}

// Now search for where encryption-related variables are defined around position 745000-760000 (CryptoJS code)
console.log('\n\n=== CryptoJS variables area (745k-760k) ===');
// Find Jd definition
idx = text.indexOf('Jd=');
if (idx === -1) idx = text.indexOf('Jd=');
if (idx === -1) idx = text.indexOf('Jd =');
if (idx === -1) idx = text.indexOf(',Jd=');
console.log('Jd at', idx > 0 ? idx : 'not found');

// Search for _0x3a7055 which is the main helper object - find where it's defined
idx = text.indexOf('_0x3a7055={');
if (idx === -1) {
  // Try different patterns
  const patterns = ['_0x3a7055={', '_0x3a7055={', '= _0x3a7055'];
  for (const p of patterns) {
    idx = text.indexOf(p);
    if (idx !== -1) {
      console.log('_0x3a7055 found at', idx, ':', text.substring(idx, idx + 80));
      break;
    }
  }
}

// Find where uZodO is defined (the base64 parse reference)
console.log('\n\n=== Search for uZodO ===');
idx = text.indexOf('uZodO');
if (idx !== -1) {
  console.log('uZodO at', idx, ':', text.substring(Math.max(0, idx - 100), idx + 100));
}

// Search for where the mode and padding are derived
console.log('\n\n=== Search for "mode" configuration ===');
idx = text.indexOf("'mode':");
if (idx !== -1) {
  console.log('mode at', idx, ':', text.substring(Math.max(0, idx - 50), idx + 100));
}

// Look for the string "parse" near encryption contexts
console.log('\n\n=== Search for "parse" calls in encryption area ===');
const encArea = text.substring(745000, 760000);
let pidx = 0;
let pc = 0;
while ((pidx = encArea.indexOf('.parse(', pidx)) !== -1 && pc < 10) {
  const realPos = 745000 + pidx;
  console.log('.parse() at', realPos, ':', text.substring(Math.max(0, realPos - 50), realPos + 60));
  pidx++;
  pc++;
}

// Find the "nf" variable definition more precisely
console.log('\n\n=== Searching for nf= or nf, or nf; ===');
const nfPattern = /[=,;]\s*nf\s*[=,;]/g;
let match;
while ((match = nfPattern.exec(text)) !== null) {
  const pos = match.index;
  console.log('At', pos, ':', text.substring(Math.max(0, pos - 60), pos + 60));
}

// Look for the function tf
console.log('\n\n=== Search for tf= or =tf ===');
const tfPattern = /[=,;]\s*tf\s*[=,;]/g;
while ((match = tfPattern.exec(text)) !== null) {
  const pos = match.index;
  console.log('At', pos, ':', text.substring(Math.max(0, pos - 60), pos + 60));
}

// Find the area around the decryption call more precisely
console.log('\n\n=== Full decryption call (970600-971200) ===');
console.log(text.substring(970600, 971200));
