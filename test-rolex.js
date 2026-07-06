const https = require('https');

function rawGet(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname, port: 443, path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      let d = ''; res.on('data', c => { d += c; if (d.length > 100000) req.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: d }));
    });
    req.on('error', (e) => resolve({ status: 0, headers: {}, body: e.message }));
    req.setTimeout(15000, () => req.destroy(new Error('Timeout')));
    req.end();
  });
}

(async () => {
  console.log('=== GET https://rolexcoderz.com/PW/ ===');
  let res = await rawGet('https://rolexcoderz.com/PW/');
  console.log(`Status: ${res.status}`);
  console.log(`Content-Type: ${res.headers['content-type'] || 'none'}`);
  console.log(`Content-Length: ${res.headers['content-length'] || 'unknown'}`);
  console.log(`Body length: ${res.body.length}`);
  console.log(`Body (first 2000): ${res.body.substring(0, 2000)}`);
  
  // Check for patterns
  ['api', 'token', 'batch', 'video', 'mpd', 'm3u8', 'player', 'Bearer', 'penpencil', 'pwthor'].forEach(p => {
    const idx = res.body.indexOf(p);
    if (idx >= 0) console.log(`\n"${p}" at ${idx}: ...${res.body.substring(Math.max(0,idx-30), idx+100)}...`);
  });
  
  // Check if it's a directory listing
  if (res.body.includes('<a href=')) {
    console.log('\n=== Directory listing? ===');
    const links = [...res.body.matchAll(/<a\s+href=["']([^"']+)["']/gi)];
    links.forEach(l => console.log(`  ${l[1]}`));
  }
})();
