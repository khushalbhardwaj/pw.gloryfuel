const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');
const shuffleCode = bundle.substring(0, 661);
const iife = shuffleCode.substring(28);

// Extract the end part to check args
console.log('Last 100 chars of IIFE:');
console.log(JSON.stringify(iife.substring(iife.length - 100)));

// Try with different args at the end
const tests = [
  { name: 'ORIGINAL', args: '(_0x9183,0x9279c)' },
  { name: 'a,b', args: '(a,b)' },
  { name: '1,2', args: '(1,2)' },
  { name: '_0x9183,b', args: '(_0x9183,b)' },
  { name: 'a,0x9279c', args: '(a,0x9279c)' },
  { name: '_0x11fd,0x9279c', args: '(_0x11fd,0x9279c)' },
  { name: 'x,y', args: '(x,y)' },
];

for (const t of tests) {
  // Replace the args at the VERY END
  const modified = iife.substring(0, iife.length - '(_0x9183,0x9279c)'.length) + t.args;
  try {
    new Function(modified);
    console.log(`${t.name}: OK`);
  } catch(e) {
    console.log(`${t.name}: FAIL - ${e.message}`);
  }
}

// Now let me check if the body itself has an issue
// Remove the closing parens and args and gradually rebuild
const bodyStart = iife.indexOf('{') + 1;
const bodyEnd = iife.lastIndexOf('}');
const bodyWithoutOuter = iife.substring(0, bodyEnd + 1) + ')'; // Close the function but without args+calls
console.log('\nBody without IIFE call (first/last 50 chars):');
console.log(JSON.stringify(bodyWithoutOuter.substring(0, 50)));
console.log(JSON.stringify(bodyWithoutOuter.substring(bodyWithoutOuter.length - 50)));

try {
  new Function(bodyWithoutOuter + '()'); // try calling it as an IIFE after
  console.log('Body as separate function: OK');
} catch(e) {
  console.log('Body as separate function: FAIL -', e.message);
}
