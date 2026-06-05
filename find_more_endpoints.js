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

// All strings containing "get" or "fetch" or "request" or "axios" - these might be API call wrappers
console.log('=== Strings containing "get" or "fetch" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && (v.startsWith('get') || v.startsWith('fetch')) && v.length < 30) {
    console.log(`  [${i}]: ${JSON.stringify(v)}`);
  }
});

// Look for URL construction patterns
console.log('\n=== Strings containing "/" near "api" or "details" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.includes('/') && v.length < 60 && v.length > 5) {
    if (v.includes('api') || v.includes('detail') || v.includes('video') || v.includes('lecture') || v.includes('chapter')) {
      console.log(`  [${i}]: ${JSON.stringify(v)}`);
    }
  }
});

// Search for any strings that look like they might be API endpoint path constructions
// like `/${something}/details`
console.log('\n=== Strings starting with "/" (likely endpoint paths) ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.startsWith('/') && v.length < 60 && v.length > 2 && !v.includes(' ')) {
    console.log(`  [${i}]: ${JSON.stringify(v)}`);
  }
});
