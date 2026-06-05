const https = require('https');
const http = require('http');

const endpoints = [
  { name: 'DS allbatches (unencrypted)', url: 'https://apiserver.deltastudy.site/allbatches.json' },
  { name: 'DS batches (encrypted)', url: 'https://apiserver.deltastudy.site/api/pw/batches' },
  { name: 'liteapi search', url: 'https://liteapi.pw4free.in/api/v1/batches?q=arjuna&page=1&limit=3' },
];

let completed = 0;

function check(name, url) {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, { timeout: 15000, rejectUnauthorized: false }, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      const size = (data.length / 1024).toFixed(1);
      console.log('=== ' + name + ' ===');
      console.log('Status: ' + res.statusCode);
      console.log('Size: ' + size + 'KB');
      console.log('Headers:', JSON.stringify(res.headers));
      
      if (data.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(data);
          if (parsed.data) {
            console.log('Has "data" field: true');
            console.log('Encrypted data first 80 chars:', parsed.data.substring(0, 80));
            console.log('Encrypted data length:', parsed.data.length);
            
            // Check format - AES-GCM has 12 byte IV (16 base64 chars) + tag
            const buf = Buffer.from(parsed.data, 'base64');
            console.log('Binary length:', buf.length);
          } else {
            console.log('Response keys:', Object.keys(parsed));
            console.log('Response preview:', JSON.stringify(parsed).substring(0, 200));
          }
        } catch(e) {
          console.log('Parse error:', e.message);
        }
      } else {
        console.log('Raw first 200:', data.substring(0, 200));
      }
      console.log('');
      completed++;
      if (completed === endpoints.length) process.exit(0);
    });
  });
  req.on('error', (e) => {
    console.log(name + ': ERROR - ' + e.message);
    completed++;
    if (completed === endpoints.length) process.exit(0);
  });
}

endpoints.forEach(e => check(e.name, e.url));
