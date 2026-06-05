const axios = require('axios');
const https = require('https');
const instance = axios.create({httpsAgent: new https.Agent({rejectUnauthorized: false}), timeout: 10000, validateStatus: () => true});
async function main() {
  const r = await instance.get('https://lite.pw4free.in');
  const html = typeof r.data === 'string' ? r.data : '';
  // Find all external JS
  const jsFiles = html.match(/src="[^"]+\.js"/g);
  console.log('JS files:', jsFiles);
  // Find inline scripts
  const inline = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
  if (inline) {
    inline.forEach((s, i) => {
      if (s.length > 50 && s.length < 30000) {
        // Look for API endpoints
        const apis = s.match(/\/api\/[^"'\s)]+/g);
        if (apis) console.log('Inline script ' + i + ' APIs:', apis);
        if (s.toLowerCase().includes('batch') || s.toLowerCase().includes('fetch')) {
          console.log('Script ' + i + ' (batch/fetch):', s.substring(0, 400));
        }
      }
    });
  }
}
main().catch(console.error);
