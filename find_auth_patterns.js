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

// Search for auth/cookie/storage related strings
const patterns = ['token', 'auth', 'cookie', 'storage', 'header', 'Authorization', 'Bearer', 'x-auth', 'login', 'register'];
console.log('=== Strings related to auth/storage ===');
patterns.forEach(p => {
  arr.forEach((v, i) => {
    if (typeof v === 'string' && v.toLowerCase().includes(p) && v.length < 80) {
      console.log(`  [${i}]: "${v}"`);
    }
  });
});

// Search for enrollment/subscription/subscribe
console.log('\n=== Strings related to enrollment/subscription ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && (v.toLowerCase().includes('enroll') || v.toLowerCase().includes('subscription') || v.toLowerCase().includes('subscribe') || v.toLowerCase().includes('purchase') || v.toLowerCase().includes('mycourses') || v.toLowerCase().includes('mybatch'))) {
    if (v.length < 80) console.log(`  [${i}]: "${v}"`);
  }
});

// Search for axios or fetch configuration
console.log('\n=== Strings containing "baseURL" or "baseUrl" or "headers" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && (v.toLowerCase().includes('baseurl') || v.toLowerCase().includes('headers') || v.toLowerCase().includes('interceptor'))) {
    if (v.length < 80) console.log(`  [${i}]: "${v}"`);
  }
});

// Search for the actual axios GET/POST call patterns
console.log('\n=== Strings that look like HTTP method calls ===');
const methodPatterns = ['get', 'post', 'put', 'delete'];
methodPatterns.forEach(m => {
  arr.forEach((v, i) => {
    if (typeof v === 'string' && (v === m || v === m.toUpperCase()) && i > 0 && i < arr.length) {
      console.log(`  [${i}]: "${v}"`);
    }
  });
});
