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
console.log('Array length:', arr.length);

// Search for API-like strings
const apiPatterns = [/\/api\//, /\/v1\//, /http/, /batch/, /subject/, /content/, /video/, /details/, /syllabus/];
const results = [];

for (let i = 0; i < arr.length; i++) {
  const val = arr[i];
  if (typeof val === 'string') {
    for (const pat of apiPatterns) {
      if (pat.test(val)) {
        results.push({ index: i, value: val });
        break;
      }
    }
  }
}

console.log(`\nFound ${results.length} API-related strings:`);
results.forEach(r => console.log(`  [${r.index}]: ${r.value}`));

// Also search for /api/v1/batches/details and related
console.log('\n=== All strings containing "api" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.includes('api')) {
    console.log(`  [${i}]: ${v}`);
  }
});

console.log('\n=== All strings containing "/v1" ===');
arr.forEach((v, i) => {
  if (typeof v === 'string' && v.includes('/v1')) {
    console.log(`  [${i}]: ${v}`);
  }
});
