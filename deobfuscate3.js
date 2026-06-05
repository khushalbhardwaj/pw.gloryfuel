const fs = require('fs');

const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// 1. Find the API call logic - search for the fetch/axios around the API base URL
console.log('=== API call context (searching for fetch/axios/xmlhttprequest) ===\n');

const apiPos = text.indexOf('https://liteapi.pw4free.in/api/v1');
console.log('API base URL at position:', apiPos);

// Search forward from API URL position for function calls
const searchStart = Math.max(0, apiPos - 10000);
const searchEnd = Math.min(text.length, apiPos + 50000);
const context = text.substring(searchStart, searchEnd);

// Find function definitions near the API call
const functionPatterns = [
  'function', '=>', 'fetch', 'axios', 'getJSON', 'request',
  'XMLHttpRequest', '$.get', '$.ajax', 'http.get', 'get('
];
for (const pat of functionPatterns) {
  let idx = context.indexOf(pat);
  while (idx !== -1) {
    const pos = searchStart + idx;
    const snippet = text.substring(Math.max(0, pos - 50), pos + 150);
    console.log(`Found "${pat}" at ${pos}:`);
    console.log('  ', snippet.replace(/\n/g, '\\n'));
    console.log('');
    idx = context.indexOf(pat, idx + 1);
  }
}

// 2. Look for where "pw4freelite" is used in a localStorage context
console.log('\n=== pw4freelite usage ===\n');
let idx2 = text.indexOf('pw4freelite');
while (idx2 !== -1) {
  const start = Math.max(0, idx2 - 200);
  const end = Math.min(text.length, idx2 + 200);
  console.log('At', idx2);
  console.log(text.substring(start, end));
  console.log('');
  idx2 = text.indexOf('pw4freelite', idx2 + 1);
}

// 3. Look for CryptoJS decrypt call where the key is passed
console.log('\n=== Search for the actual decrypt invocation ===\n');

// Search for patterns like .decrypt( or .decrypt(
const decryptInvocation = text.match(/\.decrypt\([^)]{10,200}\)/g);
if (decryptInvocation) {
  decryptInvocation.slice(0, 10).forEach(m => {
    const idx = text.indexOf(m);
    const start = Math.max(0, idx - 100);
    const end = Math.min(text.length, idx + m.length + 100);
    console.log('Found:', m.substring(0, 100));
    console.log(text.substring(start, end));
    console.log('');
  });
}

// 4. look for where the API response data is parsed/decrypted
console.log('\n=== Search for "parse" or "JSON.parse" near API calls ===\n');
idx2 = text.indexOf('JSON.parse');
while (idx2 !== -1 && idx2 < searchEnd) {
  const start = Math.max(0, idx2 - 150);
  const end = Math.min(text.length, idx2 + 150);
  if (idx2 > searchStart) {
    console.log('At', idx2);
    console.log(text.substring(start, end));
    console.log('');
  }
  idx2 = text.indexOf('JSON.parse', idx2 + 1);
}

// 5. Extract the string array to deobfuscate key strings
console.log('\n=== String array extraction ===\n');
// Find the string array assignment
const arrMatch = text.match(/var\s+(\w+)\s*=\s*\[([\s\S]{500,30000}?)\]\s*[,;]/);
if (arrMatch) {
  console.log('Array name:', arrMatch[1]);
  console.log('Array length:', arrMatch[2].length);
  // Extract individual strings
  const strMatches = arrMatch[2].match(/['"][^\n'"]*['"]/g);
  if (strMatches) {
    console.log('String count:', strMatches.length);
    strMatches.slice(0, 30).forEach(s => console.log('  ', s));
  }
}

// 6. Look for the main app logic area - search for Vue/React specific patterns
console.log('\n=== Framework identification ===\n');
const frameworkPatterns = ['createApp', 'Vue', 'React', 'createRoot', 'useState'];
for (const pat of frameworkPatterns) {
  if (text.includes(pat)) {
    const idx = text.indexOf(pat);
    console.log(`Found "${pat}" at ${idx}:`, text.substring(idx, idx + 80));
  }
}

// 7. Search for where the key/password is used in the CryptoJS encrypt/decrypt
console.log('\n=== Search for CryptoJS.create or new instance ===\n');
const createPatterns = [
  /\.create\(/g,
  /\bnew\s+\w+[({]/g
];
