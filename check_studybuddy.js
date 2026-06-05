const axios = require('axios');
const https = require('https');
const instance = axios.create({httpsAgent: new https.Agent({rejectUnauthorized: false}), timeout: 10000, validateStatus: () => true});
async function main() {
  const r = await instance.get('https://study-buddy-official.netlify.app');
  const html = typeof r.data === 'string' ? r.data : '';
  const scripts = html.match(/src="[^"]+\.js"/g);
  console.log('Scripts:', scripts);
  const apiCalls = html.match(/fetch\([^)]+\)|https?:\/\/[^"'<>]+/g);
  if (apiCalls) console.log('URLs found:', apiCalls.slice(0, 10));
  // Look for any inline script
  const inline = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
  if (inline) {
    inline.forEach((s, i) => {
      if (s.length > 20 && s.length < 5000) console.log('Inline script ' + i + ':', s.substring(0, 300));
    });
  }
}
main().catch(console.error);
