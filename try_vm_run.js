const fs = require('fs');
const vm = require('vm');

const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Extract pieces
const code11fd = bundle.substring(189108, 189251);
const code9183 = bundle.substring(3814683, 5486199);
const shuffleCode = bundle.substring(0, 661);

// Try to run the code in an isolated VM context
const context = {};
vm.createContext(context);

// First, evaluate the function declarations
try {
  vm.runInContext(code11fd, context);
  console.log('_0x11fd defined');
} catch(e) {
  console.log('_0x11fd error:', e.message);
}

try {
  vm.runInContext(code9183, context);
  console.log('_0x9183 defined');
} catch(e) {
  console.log('_0x9183 error:', e.message);
}

// Now evaluate the shuffle code
try {
  vm.runInContext(shuffleCode, context);
  console.log('Shuffle completed');
} catch(e) {
  console.log('Shuffle error:', e.message);
}

// Now try to get the key and IV
try {
  const ivResult = vm.runInContext('_0x4d130f(0x132)', context);
  console.log('IV:', ivResult);
} catch(e) {
  console.log('IV error:', e.message);
}

try {
  const keyResult = vm.runInContext('_0x4d130f(0x44f4)', context);
  console.log('Key:', keyResult);
} catch(e) {
  console.log('Key error:', e.message);
}
