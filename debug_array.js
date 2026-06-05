const fs = require('fs');
const vm = require('vm');

const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

const code11fd = bundle.substring(189108, 189251);
const code9183 = bundle.substring(3814683, 5486199);
const endPattern = '}(_0x9183,0x9279c));';
const shuffleCode = bundle.substring(0, bundle.indexOf(endPattern) + endPattern.length);

const context = {};
vm.createContext(context);

vm.runInContext(code11fd, context);
vm.runInContext(code9183, context);

// Check array length BEFORE shuffling
const lenBefore = vm.runInContext('_0x9183().length', context);
console.log('Array length before shuffle:', lenBefore);

// Check first and last elements before shuffle
const firstBefore = vm.runInContext('_0x9183()[0]', context);
const lastBefore = vm.runInContext('_0x9183()[' + (lenBefore - 1) + ']', context);
console.log('First element:', JSON.stringify(firstBefore));
console.log('Last element:', JSON.stringify(lastBefore));

// Now run the shuffling
vm.runInContext(shuffleCode, context);

// Check array length AFTER shuffling
const lenAfter = vm.runInContext('_0x9183().length', context);
console.log('\nArray length after shuffle:', lenAfter);

// Check adjusted indices
// _0x11fd(0x132) = array[0x132 - 0x1bf] = array[-141]
// Wait, this should be array[306 - 447] = array[-141]
// Negative index returns undefined for arrays
// 
// UNLESS the array was shifted and the deobfuscator uses a different formula!

// Let me check what _0x4d130f actually is
const alias = vm.runInContext('typeof _0x4d130f', context);
console.log('\n_0x4d130f type:', alias);

// Try calling _0x4d130f with various indices
for (const idx of [0x130, 0x132, 0x140, 0x1bf, 0x1c0, 0x200, 0x300, 0x44f4]) {
  const val = vm.runInContext(`_0x4d130f(${idx})`, context);
  console.log(`_0x4d130f(0x${idx.toString(16)}): ${typeof val === 'string' ? JSON.stringify(val) : val}`);
}

// Also check what the array contains at key positions
for (const pos of [0, 1, 100, 446, 447, 448, lenAfter - 1, lenAfter - 2]) {
  if (pos >= 0 && pos < lenAfter) {
    const val = vm.runInContext(`_0x9183()[${pos}]`, context);
    console.log(`array[${pos}]: ${typeof val === 'string' ? JSON.stringify(val.substring(0, 50)) : val}`);
  }
}
