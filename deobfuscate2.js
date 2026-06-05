const fs = require('fs');

const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

console.log('Bundle size:', (text.length/1024/1024).toFixed(2), 'MB\n');

// 1. Search for pw4freelite and surrounding context
console.log('=== pw4freelite context ===');
let idx = text.indexOf('pw4freelite');
if (idx !== -1) {
  // Find the enclosing object/function scope
  const start = Math.max(0, idx - 300);
  const end = Math.min(text.length, idx + 300);
  console.log(text.substring(start, end));
  console.log('');
}

// 2. Find the key used in the encryption chain
console.log('=== Encryption setup near API base URL ===');
idx = text.indexOf('https://liteapi.pw4free.in/api/v1');
if (idx !== -1) {
  const start = Math.max(0, idx - 500);
  const end = Math.min(text.length, idx + 100);
  console.log(text.substring(start, end));
  console.log('');
}

// 3. Find "encryptionKey" or similar config keys
console.log('=== Searching for encryption config ===');
const configTerms = ['encryptionKey', 'secretKey', 'apiKey', 'ENCRYPTION', 'api_key', 'secret', 'accessKey'];
for (const term of configTerms) {
  idx = text.indexOf(term);
  if (idx !== -1) {
    const start = Math.max(0, idx - 200);
    const end = Math.min(text.length, idx + 200);
    console.log('Found "' + term + '" at', idx + ':');
    console.log(text.substring(start, end));
    console.log('');
  }
}

// 4. Search for the encryption key being used - look at the PasswordBasedCipher area
console.log('=== PasswordBasedCipher area ===');
idx = text.indexOf('PasswordBasedCipher');
if (idx !== -1) {
  const start = Math.max(0, idx - 500);
  const end = Math.min(text.length, idx + 500);
  console.log(text.substring(start, end));
  console.log('');
}

// 5. Search for where the key is passed to API calls
console.log('=== Fetch/axios calls in context ===');
// Look for fetch/ajax calls that include the API base
const fetchArea = text.substring(948000, 955000);
console.log('Area around API base URL (948k-955k):');
console.log(fetchArea);
console.log('');

// 6. Find all unique hex keys in context
console.log('=== Hex keys with context ===');
const hexPattern = /['"][a-f0-9]{32,64}['"]/gi;
let match;
while ((match = hexPattern.exec(text)) !== null) {
  const start = Math.max(0, match.index - 150);
  const end = Math.min(text.length, match.index + match[0].length + 150);
  console.log('At', match.index + ':');
  console.log(text.substring(start, end));
  console.log('');
}

// 7. Look for base64 strings that could be keys
console.log('=== Searching for base64-encoded keys ===');
const b64Pattern = /['"][A-Za-z0-9+/]{20,60}=*['"]/g;
let count = 0;
while ((match = b64Pattern.exec(text)) !== null && count < 20) {
  const val = match[0].replace(/['"]/g, '');
  // Filter probable keys (not common CSS/image data)
  if (val.length >= 20 && val.length <= 64 && !val.includes(' ') && !val.startsWith('data:')) {
    const start = Math.max(0, match.index - 100);
    const end = Math.min(text.length, match.index + match[0].length + 100);
    console.log('Found at', match.index + ':', val);
    console.log(text.substring(start, end));
    console.log('');
    count++;
  }
}

// 8. Check what string is used as the user_id/identifier
console.log('=== Search for user_id or app identifier ===');
const idTerms = ['user_id', 'app_id', 'client_id', 'device_id', 'session', 'token'];
for (const term of idTerms) {
  idx = text.indexOf(term);
  if (idx !== -1) {
    const start = Math.max(0, idx - 150);
    const end = Math.min(text.length, idx + 150);
    console.log('Found "' + term + '" at', idx + ':');
    console.log(text.substring(start, end));
    console.log('');
  }
}
