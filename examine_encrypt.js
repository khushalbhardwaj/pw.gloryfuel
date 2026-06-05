const axios = require('axios');
const https = require('https');
const instance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 15000,
  validateStatus: () => true
});

async function main() {
  const chunks = [
    '/_next/static/chunks/4bd1b696-8ad51578e2a901e5.js',
    '/_next/static/chunks/app/study-v2/batches/page-d5c527a79f1dc02a.js',
  ];

  for (const chunk of chunks) {
    console.log('===', chunk, '===');
    const cr = await instance.get('https://deltastudy.site' + chunk);
    const text = typeof cr.data === 'string' ? cr.data : '';

    // Find lines/context around "encrypt"
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('encrypt')) {
        console.log('Line', i, ':', lines[i].substring(0, 300));
      }
    }

    // Look for all string literals that look like keys (10-40 chars)
    const keyPattern = /['"]([a-zA-Z0-9_@#$%^&*!]{8,40})['"]/g;
    let match;
    const found = [];
    while ((match = keyPattern.exec(text)) !== null) {
      const val = match[1];
      // Filter out common non-keys
      if (val.length >= 8 && 
          !val.startsWith('http') && 
          !['localhost', 'undefined', 'function', ' prototypes', '__esModule', 'development', 'production'].includes(val) &&
          !/^[0-9]+$/.test(val) &&
          !/^[a-f0-9]{32}$/i.test(val)) {
        found.push(val);
      }
    }
    if (found.length > 0) {
      console.log('\nPotential keys found:', found.slice(0, 20));
    }
    console.log('');
  }
  console.log('Done');
}
main().catch(console.error);
