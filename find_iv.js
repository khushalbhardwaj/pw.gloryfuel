const bundle = require('fs').readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Find the uZodO key assignment context
const uZodOPos = bundle.indexOf("'uZodO'");
if (uZodOPos > 0) {
  console.log('uZodO found at', uZodOPos);
  const ctx = bundle.substring(Math.max(0, uZodOPos - 500), uZodOPos + 500);
  console.log('Context:\n', ctx);
}

console.log('\n----------------------------------------\n');

// Find nf variable (the IV)
let nfPos = bundle.indexOf("'nf'");
if (nfPos < 0) nfPos = bundle.indexOf('"nf"');
if (nfPos < 0) nfPos = bundle.indexOf(' nf=');
if (nfPos < 0) nfPos = bundle.indexOf('nf=');
if (nfPos < 0) {
  // Search for nf as a property name
  const nfRegex = /[,'"\s]nf\s*:/;
  const match = bundle.match(nfRegex);
  if (match) {
    nfPos = match.index;
    console.log(`'nf:' found at ${nfPos}`);
    const ctx = bundle.substring(Math.max(0, nfPos - 200), nfPos + 300);
    console.log('Context:', ctx.substring(0, 600));
  } else {
    console.log("'nf' pattern not found directly");
  }
}

// Also search for 0x132 references near the key area
console.log('\n----------------------------------------\n');
console.log('Searching for 0x132 near uZodO area:');
const nearUzodo = bundle.substring(Math.max(0, uZodOPos - 500), uZodOPos + 500);
const idx132 = nearUzodo.indexOf('0x132');
if (idx132 > 0) {
  console.log('0x132 found at offset', idx132);
}

// Search for the hex IV candidate '7c3dec87ad88b4b97459f983d3d5cd14'
const ivCandidate = '7c3dec87ad88b4b97459f983d3d5cd14';
let ivPos = bundle.indexOf(ivCandidate);
if (ivPos > 0) {
  console.log(`\nIV candidate "${ivCandidate}" found at ${ivPos}`);
  const ctx = bundle.substring(Math.max(0, ivPos - 200), ivPos + 200);
  console.log('Context:', ctx);
}

// Also search the array for likely IV values (16-char UTF-8 strings or 32-char hex)
console.log('\n----------------------------------------\n');
// Use vm to extract some values near the key in the deobfuscated array
const vm = require('vm');
const context = {};
vm.createContext(context);
const code11fd = bundle.substring(189108, 189251);
const code9183 = bundle.substring(3814683, 5486199);
const endPattern = '}(_0x9183,0x9279c));';
const shuffleCode = bundle.substring(0, bundle.indexOf(endPattern) + endPattern.length);
vm.runInContext(code11fd, context);
vm.runInContext(code9183, context);
vm.runInContext(shuffleCode, context);

// The key is at _0x4d130f(0x44f4) = array[17205] (after deobfuscator subtraction)
// Let me check nearby indices for IV
console.log('Checking indices near key (0x44f4):');
for (let i = 0x44f0; i <= 0x44f8; i++) {
  try {
    const val = vm.runInContext(`_0x4d130f(${i})`, context);
    console.log(`  [0x${i.toString(16)}]: ${typeof val === 'string' ? JSON.stringify(val) : val}`);
  } catch(e) {
    console.log(`  [0x${i.toString(16)}]: ERROR`);
  }
}

// Check around 0x132 (which is too small - negative after subtraction)
// Maybe the IV is at a higher index? Let me check common nearby values
console.log('\nChecking for IV candidates around key area:');
for (let i = 17200; i <= 17210; i++) {
  try {
    const val = vm.runInContext(`_0x9183()[${i}]`, context);
    if (typeof val === 'string' && (val.length === 16 || val.length === 32 || val.length === 24)) {
      console.log(`  array[${i}]: ${JSON.stringify(val)} (len=${val.length})`);
    }
  } catch(e) {}
}

// Search the entire array for IV-like strings
console.log('\nSearching array for IV-like strings (16 chars or 32 hex chars):');
const arr = vm.runInContext('_0x9183()', context);
let ivCount = 0;
for (let i = 0; i < arr.length && ivCount < 20; i++) {
  const val = arr[i];
  if (typeof val === 'string') {
    // Check for 16-char printable UTF-8
    if (val.length === 16 && /^[\x20-\x7E]+$/.test(val)) {
      console.log(`  array[${i}] = ${JSON.stringify(val)} (16-char printable)`);
      ivCount++;
    }
    // Check for 32-char hex
    if (val.length === 32 && /^[a-f0-9]+$/.test(val)) {
      console.log(`  array[${i}] = ${JSON.stringify(val)} (32-char hex)`);
      ivCount++;
    }
  }
}
