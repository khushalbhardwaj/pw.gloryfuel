const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Find _0x9183 function body
const openIdx = bundle.indexOf('{', 3814683);
const funcBody = bundle.substring(openIdx, openIdx + 10000); // first 10k chars

console.log('=== First 3000 chars of function body ===');
console.log(funcBody.substring(0, 3000));

console.log('\n=== Window references (first 10) ===');
let idx = 0;
let count = 0;
while ((idx = funcBody.indexOf('window', idx)) !== -1 && count < 10) {
  const ctx = funcBody.substring(Math.max(0, idx - 30), idx + 40);
  console.log(`  @${idx}: ...${ctx}...`);
  idx += 6;
  count++;
}

console.log('\n=== Document references ===');
idx = 0;
count = 0;
while ((idx = funcBody.indexOf('document', idx)) !== -1 && count < 5) {
  const ctx = funcBody.substring(Math.max(0, idx - 30), idx + 40);
  console.log(`  @${idx}: ...${ctx}...`);
  idx += 8;
  count++;
}
