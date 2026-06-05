const https = require('https');
const http = require('http');

const endpoints = [
  { name: 'DS allbatches', url: 'https://apiserver.deltastudy.site/allbatches.json' },
  { name: 'DS batches', url: 'https://apiserver.deltastudy.site/api/pw/batches' },
  { name: 'DS batchdetails', url: 'https://apiserver.deltastudy.site/api/pw/batchdetails/6954e2a08e0ee2b956f2b595' },
  { name: 'DS topics', url: 'https://apiserver.deltastudy.site/api/pw/topics/6660f1d39ce3f7a4ace0049a' },
  { name: 'liteapi search', url: 'https://liteapi.pw4free.in/api/v1/batches?q=arjuna&page=1&limit=3' },
  { name: 'gloryfuel site', url: 'http://localhost:3000' },
];

let completed = 0;

function check(name, url) {
  const mod = url.startsWith('https') ? https : http;
  const req = mod.get(url, { timeout: 15000, rejectUnauthorized: false }, (res) => {
    let data = '';
    const total = parseInt(res.headers['content-length'] || '0');
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      const size = (data.length / 1024).toFixed(1);
      const isJSON = data.trim().startsWith('{') || data.trim().startsWith('[');
      const isHTML = data.trim().startsWith('<');
      let type = isJSON ? 'JSON' : isHTML ? 'HTML' : 'RAW';
      console.log(name + ': ' + res.statusCode + ' (' + size + 'KB, ' + type + ') ' + data.substring(0, 80).replace(/\n/g, '\\n'));
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
console.log('Checking endpoints...');
