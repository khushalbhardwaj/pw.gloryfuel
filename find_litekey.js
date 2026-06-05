const axios = require('axios');
const https = require('https');
const instance = axios.create({httpsAgent: new https.Agent({rejectUnauthorized: false}), timeout: 30000, validateStatus: () => true});

async function main() {
  console.log('Fetching JS bundle...');
  const r = await instance.get('https://lite.pw4free.in/assets/index-CX79u9h4.js');
  const text = typeof r.data === 'string' ? r.data : '';
  console.log('JS length:', text.length);
  
  // Search for specific patterns
  const patterns = [
    /encryptionKey\s*[:=]\s*['"][^'"]+['"]/gi,
    /secretKey\s*[:=]\s*['"][^'"]+['"]/gi,
    /apiKey\s*[:=]\s*['"][^'"]+['"]/gi,
    /password\s*[:=]\s*['"][^'"]+['"]/gi,
    /['"][a-zA-Z0-9_]{16,40}['"]\s*[,;)]/g,
    /SECRET_KEY\s*[:=]\s*['"][^'"]+['"]/g,
    /ENCRYPTION_KEY\s*[:=]\s*['"][^'"]+['"]/g,
    /ciphertext|decipher|encryptData|decryptData/g,
    /AES|aes|GCM|gcm|createDecipheriv/g,
  ];
  
  for (const pat of patterns) {
    const matches = text.match(pat);
    if (matches) {
      console.log('\nPattern ' + pat.source.substring(0, 40) + ':');
      matches.slice(0, 5).forEach(m => console.log('  ' + m));
    }
  }
  
  // Also look for any string like "maggikhalo" or variations
  const allKeys = text.match(/['\"][a-zA-Z0-9_@!#$%^&*]{6,40}['\"]/g);
  if (allKeys) {
    const potentialKeys = allKeys
      .map(k => k.replace(/['\"]/g, ''))
      .filter(k => 
        k.length >= 6 && 
        k.length <= 40 &&
        !k.startsWith('http') &&
        !k.includes(' ') &&
        !/^[0-9]+$/.test(k) &&
        !['undefined', 'function', 'prototype', 'constructor', 'development', 'production', 'localhost', 'default', 'boolean', 'number', 'string', 'object', 'Array', 'Error', 'null', 'true', 'false'].includes(k)
      );
    console.log('\nPotential keys found:', potentialKeys.length);
    potentialKeys.slice(0, 30).forEach(k => console.log('  ' + k));
  }
  
  // Look for the word "encrypt" or "decrypt" in context
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('decrypt') || lines[i].toLowerCase().includes('encrypt')) {
      console.log('Line near encrypt/decrypt:', lines[Math.max(0,i-1)].substring(0,200));
      console.log('  >', lines[i].substring(0,200));
      if (i+1 < lines.length) console.log('  <', lines[i+1].substring(0,200));
      console.log('');
    }
  }
}
main().catch(console.error);
