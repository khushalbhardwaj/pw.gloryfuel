const https = require('https');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000, rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function main() {
  // First check if the bundle we have matches the current version
  console.log('Fetching current bundle from lite.pw4free.in...');
  const res = await fetch('https://lite.pw4free.in/assets/index-CX79u9h4.js');
  console.log('Status:', res.status);
  console.log('Size:', (res.data.length / 1024 / 1024).toFixed(2), 'MB');
  
  if (res.status === 200) {
    fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', res.data);
    
    // Search for _0x11fd definition in the NEW bundle
    const searchPatterns = [
      { name: 'function _0x11fd', pattern: /function\s+_0x11fd\s*\(/ },
      { name: 'var _0x11fd = function', pattern: /var\s+_0x11fd\s*=\s*function/ },
      { name: '_0x11fd = function', pattern: /_0x11fd\s*=\s*function/ },
      { name: 'function declaration', pattern: /function\s+_0x[0-9a-f]{4,6}\s*\(/ },
    ];
    
    for (const s of searchPatterns) {
      const match = res.data.match(s.pattern);
      if (match) {
        const ctx = res.data.substring(Math.max(0, match.index - 30), match.index + 150);
        console.log(`\n${s.name}: @${match.index}`);
        console.log('  ', ctx.substring(0, 250));
      } else {
        console.log(`\n${s.name}: NOT FOUND`);
      }
    }
    
    // Check first 10000 chars for structure
    console.log('\n=== First 1000 chars ===');
    console.log(res.data.substring(0, 1000));
  }
}

main().catch(console.error);
