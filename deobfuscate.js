const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, 'lite_bundle_downloaded.js');

function downloadAll(url) {
  return new Promise((resolve, reject) => {
    let data = '';
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      rejectUnauthorized: false,
      timeout: 120000
    }, (res) => {
      console.log('Status:', res.statusCode);
      console.log('Size:', res.headers['content-length']);
      let downloaded = 0;
      res.on('data', (chunk) => {
        data += chunk.toString();
        downloaded += chunk.length;
        if (downloaded % 1000000 < 100000) {
          console.log('Downloaded:', (downloaded/1024/1024).toFixed(1), 'MB');
        }
      });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function main() {
  console.log('Downloading lite.pw4free.in JS bundle...');
  const text = await downloadAll('https://lite.pw4free.in/assets/index-CX79u9h4.js');
  console.log('Total:', (text.length/1024/1024).toFixed(2), 'MB');
  
  // Save to file for analysis
  fs.writeFileSync(OUTPUT_FILE, text);
  console.log('Saved to:', OUTPUT_FILE);
  
  // Now do comprehensive analysis
  console.log('\n=== ANALYSIS ===\n');
  
  // 1. Find the string array (common in obfuscated JS)
  const stringArrayMatch = text.match(/var\s+\w+\s*=\s*\[[\s\S]{100,30000}?\]\s*[,;]/);
  if (stringArrayMatch) {
    const arrContent = stringArrayMatch[0].substring(0, 500);
    console.log('Found string array (first 500 chars):', arrContent);
  }
  
  // 2. Find all hex string references like _0x...
  const hexRefs = text.match(/0x[a-f0-9]{4,5}/gi);
  if (hexRefs) {
    const unique = [...new Set(hexRefs)];
    console.log('\nHex references count:', unique.length);
    console.log('Sample:', unique.slice(0, 20));
  }
  
  // 3. Search for everything related to encryption
  const cryptoKeywords = [
    'encrypt', 'decrypt', 'aes', 'gcm', 'cbc', 'cipher',
    'importKey', 'deriveKey', 'generateKey', 'exportKey',
    'subtle', 'createCipheriv', 'createDecipheriv',
    'crypto', 'CryptoJS', 'ciphertext', 'plaintext',
    'utf8', 'hex', 'base64', 'btoa', 'atob',
    'encryptionKey', 'secretKey', 'apiKey', 'password',
    'keyStr', 'keyHex', 'KEY', 'keyBytes', 'keyBuffer',
  ];
  
  for (const kw of cryptoKeywords) {
    let idx = text.toLowerCase().indexOf(kw.toLowerCase());
    let count = 0;
    while (idx !== -1 && count < 3) {
      console.log(`\nFound "${kw}" at pos ${idx}:`);
      console.log('  Before:', text.substring(Math.max(0, idx - 60), idx));
      console.log('  After:', text.substring(idx, idx + 120));
      idx = text.toLowerCase().indexOf(kw.toLowerCase(), idx + 1);
      count++;
    }
  }
  
  // 4. Find all string literals that look like keys
  const keyPatterns = [
    /['"][A-Za-z0-9+/=]{16,100}['"]/g,  // base64-like
    /['"][a-f0-9]{32,64}['"]/gi,        // hex keys
    /['"][A-Za-z0-9_!@#$%^&*]{8,40}['"]/g, // general strings
  ];
  
  console.log('\n=== STRING SEARCH ===');
  for (const pat of keyPatterns) {
    const matches = text.match(pat);
    if (matches) {
      const unique = [...new Set(matches.slice(0, 50))];
      console.log(`Pattern ${pat.source.substring(0, 30)}: ${unique.length} unique matches`);
      unique.slice(0, 10).forEach(m => console.log('  ', m));
    }
  }
  
  // 5. Search for the actual API base URL or encryption configuration
  const apiPatterns = [
    /liteapi\.pw4free\.in/g,
    /api\.pw4free/g,
    /pw4free/g,
    /api\/v1/g,
  ];
  for (const pat of apiPatterns) {
    let idx = text.search(pat);
    if (idx !== -1) {
      console.log(`\nFound API ref at ${idx}:`);
      console.log('  Context:', text.substring(Math.max(0, idx - 100), idx + 100));
    }
  }
  
  // 6. Search for any hardcoded salts or IVs
  const saltPattern = /salt|iv\s*[:=]\s*['"][^'"]+['"]|nonce/g;
  let match;
  while ((match = saltPattern.exec(text)) !== null) {
    if (match[0] === 'salt' || match[0] === 'iv' || match[0] === 'nonce') continue;
    console.log('\nPotential fixed salt/iv:', match[0]);
    console.log('  Context:', text.substring(Math.max(0, match.index - 50), match.index + 80));
  }
  
  console.log('\n=== ANALYSIS COMPLETE ===');
}
main().catch(console.error);
