const https = require('https');
const http = require('http');

// Check only the allbatches.json endpoint (fast)
const url = 'https://apiserver.deltastudy.site/allbatches.json';
const req = https.get(url, { timeout: 10000, rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const size = (data.length / 1024 / 1024).toFixed(1);
    const isJSON = data.trim().startsWith('[');
    const sample = data.substring(0, 200);
    console.log('Status: ' + res.statusCode);
    console.log('Size: ' + size + 'MB');
    console.log('Is array: ' + isJSON);
    console.log('Sample: ' + sample);
    process.exit(0);
  });
});
req.on('error', (e) => {
  console.log('ERROR: ' + e.message);
  process.exit(1);
});
