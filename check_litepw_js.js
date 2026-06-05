const axios = require('axios');
const https = require('https');
const instance = axios.create({httpsAgent: new https.Agent({rejectUnauthorized: false}), timeout: 10000, validateStatus: () => true});
async function main() {
  const r = await instance.get('https://lite.pw4free.in/assets/index-CX79u9h4.js');
  const text = typeof r.data === 'string' ? r.data : '';
  console.log('JS length:', text.length);
  const apis = text.match(/\/api\/[a-zA-Z0-9_\/-]+/g);
  if (apis) {
    console.log('API routes:');
    [...new Set(apis)].forEach(a => console.log('  ' + a));
  }
  const domains = text.match(/https?:\/\/[^"'`)\s]+/g);
  if (domains) {
    console.log('Domains:');
    [...new Set(domains)].slice(0, 15).forEach(d => console.log('  ' + d));
  }
  if (text.includes('maggikhalo') || text.includes('encrypt') || text.includes('decrypt')) {
    console.log('Contains encryption keywords');
  }
}
main().catch(console.error);
