const axios = require('axios');
const https = require('https');
const instance = axios.create({httpsAgent: new https.Agent({rejectUnauthorized: false}), timeout: 60000, validateStatus: () => true});

async function main() {
  console.log('Downloading first 2MB of JS bundle...');
  const resp = await instance({
    method: 'GET',
    url: 'https://lite.pw4free.in/assets/index-CX79u9h4.js',
    responseType: 'arraybuffer',
    maxContentLength: 3 * 1024 * 1024,
    timeout: 30000
  });
  
  const buf = Buffer.from(resp.data);
  const text = buf.toString('utf8');
  console.log('Downloaded', text.length, 'bytes');
  
  // Search for common patterns
  const searches = [
    'encrypt', 'decrypt', 'cipher', 'aes', 'gcm', 'maggikhalo', 
    'secret', 'password', 'apiKey', 'api_key', 'key',
    'ciphertext', 'plaintext', 'CryptoJS', 'createDecipher'
  ];
  
  for (const term of searches) {
    const idx = text.toLowerCase().indexOf(term);
    if (idx >= 0) {
      console.log('\nFound "' + term + '" at position', idx);
      console.log('Context:', text.substring(Math.max(0, idx - 50), idx + 100));
    }
  }
  
  // Look for string assignments that look like keys
  const keyRegex = /const\s+\w*[Kk]ey\w*\s*=\s*['"]([^'"]+)['"]|let\s+\w*[Kk]ey\w*\s*=\s*['"]([^'"]+)['"]|var\s+\w*[Kk]ey\w*\s*=\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = keyRegex.exec(text)) !== null) {
    const val = match[1] || match[2] || match[3];
    if (val && val.length >= 6 && val.length <= 40) {
      console.log('Key assignment:', val);
    }
  }
  
  // Look for 32-char hex strings (AES-256 keys)
  const hexKeys = text.match(/['"][a-f0-9]{32}['"]/gi);
  if (hexKeys) {
    console.log('\nPotential AES-256 keys (hex):');
    hexKeys.slice(0, 10).forEach(k => console.log(' ', k));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
});
