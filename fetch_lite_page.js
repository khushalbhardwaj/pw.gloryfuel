const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 20000, rejectUnauthorized: false }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

async function main() {
  // Fetch the main page
  console.log('Fetching https://lite.pw4free.in/ ...');
  const page = await fetch('https://lite.pw4free.in/');
  console.log('Status:', page.status);
  console.log('Content-Type:', page.headers['content-type']);
  console.log('Page size:', (page.data.length / 1024).toFixed(1), 'KB');
  
  // Find ALL script tags
  const scriptTags = page.data.match(/<script[\s\S]*?<\/script>/gi);
  if (scriptTags) {
    console.log('\n=== Script tags (' + scriptTags.length + ') ===');
    scriptTags.forEach((s, i) => {
      const srcMatch = s.match(/src=["']([^"']*)["']/);
      const src = srcMatch ? srcMatch[1] : '(inline)';
      console.log(`  [${i}] ${src.substring(0, 120)} (${s.length} chars)`);
    });
  }

  // Find all JS files referenced
  const jsRefs = page.data.match(/(?:src|href)=["'][^"']*\.js[^"']*["']/gi);
  if (jsRefs) {
    console.log('\n=== JS file references ===');
    jsRefs.forEach(r => console.log('  ' + r));
  }

  // Check for modulepreload or prefetch
  const moduleLinks = page.data.match(/<link[^>]*modulepreload[^>]*>/gi);
  if (moduleLinks) {
    console.log('\n=== Module preloads ===');
    moduleLinks.forEach(l => console.log('  ' + l));
  }
}

main().catch(console.error);
