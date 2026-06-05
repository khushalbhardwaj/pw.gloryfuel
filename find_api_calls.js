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
vm.runInContext(shuffleCode, context);

const arr = vm.runInContext('_0x9183()', context);

// Search for strings that look like API endpoint patterns
// These might be template strings or partial URLs used in axios calls
console.log('=== Strings containing "api" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.includes('api') && v.length < 100) {
    console.log(`  [${i}]: ${JSON.stringify(v)}`);
  }
});

console.log('\n=== Strings containing "subject" or "topic" or "chapter" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && (v.toLowerCase().includes('subject') || v.toLowerCase().includes('topic') || v.toLowerCase().includes('chapter') || v.toLowerCase().includes('lecture'))) {
    if (v.length < 120) console.log(`  [${i}]: ${JSON.stringify(v)}`);
  }
});

console.log('\n=== Strings containing "batch" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.toLowerCase().includes('batch') && v.length < 100) {
    console.log(`  [${i}]: ${JSON.stringify(v)}`);
  }
});

console.log('\n=== Strings containing "detail" or "details" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.toLowerCase().includes('detail') && v.length < 80) {
    console.log(`  [${i}]: ${JSON.stringify(v)}`);
  }
});
