const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');
const shuffleCode = bundle.substring(0, 661);

// Verify the length of "const _0x4d130f=_0x11fd;"
const prefix = 'const _0x4d130f=_0x11fd;';
console.log(`Prefix length: ${prefix.length}`);
console.log(`Prefix: ${prefix}`);

// Extract IIFE at correct offset
const iife = shuffleCode.substring(prefix.length);
console.log(`IIFE (first 50): ${JSON.stringify(iife.substring(0, 50))}`);
console.log(`IIFE (last 50): ${JSON.stringify(iife.substring(iife.length - 50))}`);

// Test each piece
function test(label, code) {
  try {
    new Function(code);
    console.log(`${label}: OK`);
  } catch(e) {
    console.log(`${label}: FAIL - ${e.message}`);
  }
}

// Test just the IIFE (should be valid)
test('IIFE only', iife);

// Test the full shuffle code
test('Full shuffle', shuffleCode);

// Test with replacement of _0x11fd reference to avoid ReferenceError at parse time
// (ReferenceError shouldn't happen at parse time, only at runtime)
// But let me check if _0x11fd causes any parse issue
test('IIFE with undefined ref', '(function(a,b){const c=a;c();}(d,1))');

// Test the complete full script
const fullScript = shuffleCode + '\nconsole.log("done");';
test('Full script', fullScript);
