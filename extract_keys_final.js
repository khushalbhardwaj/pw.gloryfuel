const fs = require('fs');
const vm = require('vm');

const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Extract all pieces
const code11fd = bundle.substring(189108, 189251);
const code9183 = bundle.substring(3814683, 5486199);

// Extract shuffle code at correct boundary
const endPattern = '}(_0x9183,0x9279c));';
const endIdx = bundle.indexOf(endPattern);
const shuffleCode = bundle.substring(0, endIdx + endPattern.length);

console.log('Shuffle code:', shuffleCode.length, 'chars');

// Setup VM context
const context = {};
vm.createContext(context);

// Define functions
vm.runInContext(code11fd, context);
vm.runInContext(code9183, context);

// Run shuffling
vm.runInContext(shuffleCode, context);

// Now get the key and IV values
try {
  const iv = vm.runInContext('_0x4d130f(0x132)', context);
  const key = vm.runInContext('_0x4d130f(0x44f4)', context);
  
  console.log('\n=== Results ===');
  console.log('IV string:', JSON.stringify(iv));
  console.log('IV length:', iv.length);
  console.log('IV hex:', Buffer.from(iv, 'utf8').toString('hex'));
  
  console.log('\nKey string:', JSON.stringify(key));
  console.log('Key length:', key.length);
  
  // Also try _0x11fd directly
  const iv2 = vm.runInContext('_0x11fd(0x132)', context);
  const key2 = vm.runInContext('_0x11fd(0x44f4)', context);
  console.log('\nVia _0x11fd:');
  console.log('IV:', JSON.stringify(iv2));
  console.log('Key:', JSON.stringify(key2));
} catch(e) {
  console.log('Error:', e.message);
}

// Let's also check what some other indices return to understand the array
console.log('\n=== Nearby indices ===');
for (let i = 0x130; i <= 0x138; i++) {
  try {
    const val = vm.runInContext(`_0x4d130f(${i})`, context);
    console.log(`  [0x${i.toString(16)}]: ${JSON.stringify(val)}`);
  } catch(e) {
    console.log(`  [0x${i.toString(16)}]: ERROR`);
  }
}
