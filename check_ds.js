const dns = require('dns');
const https = require('https');

// Check DNS resolution
dns.resolve('apiserver.deltastudy.site', (err, addresses) => {
  if (err) {
    console.log('DNS error:', err.code);
  } else {
    console.log('DNS resolution:', addresses);
  }
  
  // Try a quick HEAD request
  const req = https.request('https://apiserver.deltastudy.site/allbatches.json', {
    method: 'HEAD',
    timeout: 8000,
    rejectUnauthorized: false
  }, (res) => {
    console.log('HEAD status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers));
    process.exit(0);
  });
  req.on('error', (e) => {
    console.log('Request error:', e.message);
    process.exit(1);
  });
  req.end();
});
