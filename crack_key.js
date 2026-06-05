const crypto = require('crypto');

const encryptedSample = 'f35a8f2d36c3c44d51d5db82:3bc356132e406711ff6072c4d296289e996a0ca0b9f251d3c9f7ddaa1449d7b2248fddf1fda';

function tryKey(key) {
  try {
    const keyBuf = Buffer.alloc(32, 0);
    Buffer.from(key, 'utf8').copy(keyBuf);
    const parts = encryptedSample.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const combined = Buffer.from(parts[1], 'hex');
    const tag = combined.slice(-16);
    const ciphertext = combined.slice(0, -16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
    decipher.setAuthTag(tag);
    const d = decipher.update(ciphertext);
    return Buffer.concat([d, decipher.final()]).toString('utf8');
  } catch(e) {
    return null;
  }
}

// Generate variations of "maggikhalo"
const base = 'maggikhalo';
const variations = [];
// Exact variations
variations.push(base);
variations.push(base.charAt(0).toUpperCase() + base.slice(1));
variations.push(base.toUpperCase());
variations.push('Maggikhalo');

// With suffixes
const suffixes = ['123', '1234', '2023', '2024', '2025', '2026', '@123', '_2024', '_2025', '_2026', '!', '#', '$', '1', '2'];
for (const s of suffixes) {
  variations.push(base + s);
  variations.push(base.charAt(0).toUpperCase() + base.slice(1) + s);
}

// With prefixes
const prefixes = ['@', '#', 'PW', 'delta', 'Delta', 'study', 'Study', 'pw', 'ds'];
for (const p of prefixes) {
  variations.push(p + base);
}

// Common proxy passwords
const common = [
  'deltastudy', 'DeltaStudy', 'DELTASTUDY', 'delta123', 'Delta@123',
  'studystark', 'StudyStark', 'STUDYSTARK', 'stark123', 'Study@123',
  'password', 'admin123', 'secret', 'key123',
  'pw@123', 'pw_live', 'pwlive', 'physicswallah',
  '4964YRAZ', 'delta', 'study', 'proxy',
  'apiserver', 'deltastudy@2024', 'deltastudy@2025',
  'maggikhalo@123', 'maggikhalo@2024', 'maggikhalo@2025',
  'maggikhalo@2026', 'maggikhalo123456',
  // Try the coupon code from their site
  '4964YRAZ',
  // Try some obvious patterns
  'DELTA@2025', 'delta@2025', 'Delta@2025',
  'DELTA@2026', 'delta@2026', 'Delta@2026',
  'deltastudy@2026', 'deltastudy@2025',
  // Numbers
  '12345678', '123456789',
  // Padded versions
  'maggikhalo ', ' maggikhalo',
];

allKeys = [...new Set([...variations, ...common])];
console.log('Testing', allKeys.length, 'keys...\n');

for (const key of allKeys) {
  const result = tryKey(key);
  if (result) {
    console.log('=== KEY FOUND:', key, '===');
    console.log('Decrypted:', result.substring(0, 500));
    process.exit(0);
  }
}

console.log('No key found in initial set.');

// Try incremental combos: lowercase only, longer phrases
const moreAttempts = [
  'maggikhalomaggikhalo', 'maggikhalomaggikhal', 'maggikhalo1234',
  'delta study', 'delta-study', 'deltastudy2024', 'deltastudy2025',
  'maggie', 'khallo', 'maggi', 'khalo',
  'maggikhalo@12345', 'maggikhalo2024!',
  // Try with different capitalization patterns
  'Maggikhalo@123', 'MAGGIKHALO@123', 'Maggikhalo123',
  // Common Indian names/words
  'physics', 'wallah', 'pwallet', 'pw2025', 'pw2026',
  'studyhard', 'hardwork', 'success',
  'delta12345', 'Delta12345',
  // Random attempts
  'admin@123', 'admin@1234', 'admin12345',
  'test@123', 'test123', 'test1234',
  'maggikhalo2025!', 'maggikhalo2026!',
  // Empty / space
  '', ' ',
];

for (const key of moreAttempts) {
  const result = tryKey(key);
  if (result) {
    console.log('=== KEY FOUND:', key, '===');
    console.log('Decrypted:', result.substring(0, 500));
    process.exit(0);
  }
}

console.log('All attempts failed.');
