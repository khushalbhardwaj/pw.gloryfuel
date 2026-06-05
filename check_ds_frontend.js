const https = require('https');

// Fetch DeltaStudy main page to find JS bundles
const url = 'https://deltastudy.site';
const req = https.get(url, { timeout: 20000, rejectUnauthorized: false }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Find all script src references
    const scriptPattern = /<script[^>]*src=["']([^"']+)["'][^>]*>/g;
    let match;
    console.log('=== Scripts found ===');
    while ((match = scriptPattern.exec(data)) !== null) {
      const src = match[1];
      if (src.includes('_next/static')) {
        console.log(src);
      }
    }

    // Also find all JS chunks in _next/static/chunks
    const chunkPattern = /\/_next\/static\/chunks\/[^"']+\.js/g;
    console.log('\n=== Chunks found ===');
    while ((match = chunkPattern.exec(data)) !== null) {
      console.log(match[0]);
    }

    // Check for inline scripts that might contain keys
    const inlinePattern = /<script[^>]*>([\s\S]{100,5000}?)<\/script>/g;
    console.log('\n=== Inline scripts (first 2) ===');
    let count = 0;
    while ((match = inlinePattern.exec(data)) !== null && count < 2) {
      const script = match[1];
      if (script.includes('key') || script.includes('decrypt') || script.includes('cipher')) {
        console.log('Key-related inline script:', script.substring(0, 500));
      }
      count++;
    }

    // Check total page size
    console.log('\nPage size:', (data.length / 1024).toFixed(1) + 'KB');
  });
});
req.on('error', (e) => console.log('ERROR:', e.message));
