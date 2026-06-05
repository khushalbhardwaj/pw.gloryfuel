const axios = require('axios');
const https = require('https');
const instance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 20000,
  validateStatus: () => true
});

async function main() {
  // Check deltastudy.site page JS for API calls
  const r = await instance.get('https://deltastudy.site/_next/static/chunks/app/study-v2/batches/page-d5c527a79f1dc02a.js');
  const text = typeof r.data === 'string' ? r.data : '';
  console.log('Total length:', text.length);
  
  // Find fetch/axios API calls
  const fetchMatches = text.match(/fetch\([^)]+\)/g);
  if (fetchMatches) {
    console.log('fetch calls:');
    fetchMatches.slice(0, 10).forEach(c => console.log('  ' + c));
  }
  
  // Find API routes
  const apiRoutes = text.match(/\/api\/pw\/[a-z-]+/g);
  if (apiRoutes) {
    console.log('API routes:', [...new Set(apiRoutes)].join(', '));
  }
  
  // Find base URLs or domains
  const domains = text.match(/https?:\\\/\\\/[^"'\\]+/g);
  if (domains) {
    console.log('Domains:', [...new Set(domains)].slice(0, 5).join(', '));
  }
  
  // Find encryption-related code
  const encMatches = text.match(/[a-zA-Z]*[Kk]ey[a-zA-Z]*\s*[:=]\s*['"][^'"]+['"]/g);
  if (encMatches) {
    console.log('Key assignments:');
    encMatches.slice(0, 5).forEach(c => console.log('  ' + c));
  }
}
main().catch(console.error);
