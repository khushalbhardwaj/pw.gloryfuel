const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');
const shuffleCode = bundle.substring(0, 661);

console.log('Shuffle code ends @ 661');
console.log('Last 100 chars:', JSON.stringify(shuffleCode.substring(shuffleCode.length - 100)));

// Find where the shuffling actually ends
const endPattern = '}(_0x9183,0x9279c));';
const endIdx = bundle.indexOf(endPattern);
console.log(`\n"${endPattern}" found at ${endIdx}`);
console.log(`After that: ${JSON.stringify(bundle.substring(endIdx + endPattern.length, endIdx + endPattern.length + 50))}`);

// Let me try with the end pattern as boundary
const shuffleCode2 = bundle.substring(0, endIdx + endPattern.length);
console.log(`\nShuffle code 2: 0 to ${endIdx + endPattern.length} (${shuffleCode2.length} chars)`);
console.log('Last 100:', JSON.stringify(shuffleCode2.substring(shuffleCode2.length - 100)));

// Try vm again with this
const vm = require('vm');
const context = {};
vm.createContext(context);

// First define the functions
const code11fd = bundle.substring(189108, 189251);
const code9183 = bundle.substring(3814683, 5486199);
vm.runInContext(code11fd, context);
vm.runInContext(code9183, context);

try {
  vm.runInContext(shuffleCode2, context);
  console.log('Shuffle 2: OK');
} catch(e) {
  console.log('Shuffle 2: FAIL -', e.message);
}

// Also try with trailing newline
try {
  vm.runInContext(shuffleCode2 + '\n', context);
  console.log('Shuffle 2 + newline: OK');
} catch(e) {
  console.log('Shuffle 2 + newline: FAIL -', e.message);
}
