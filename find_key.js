const axios = require('axios');
const https = require('https');
const instance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 20000,
  validateStatus: () => true
});

async function main() {
  const chunks = [
    '/_next/static/chunks/app/study-v2/batches/page-d5c527a79f1dc02a.js',
    '/_next/static/chunks/1978-12b596b82ab8ac2f.js',
    '/_next/static/chunks/6656-03e3411c4283869a.js',
    '/_next/static/chunks/6766-f2792f9c41ae1964.js',
    '/_next/static/chunks/5072-de2a987a8d286311.js',
  ];
  for (const chunk of chunks) {
    try {
      const r = await instance.get('https://deltastudy.site' + chunk);
      const text = typeof r.data === 'string' ? r.data : '';
      const patterns = [/maggikhalo/i, /[a-f0-9]{32}/g, /encryptionKey/i, /decrypt/i, /aes/i, /gcm/i];
      for (const pat of patterns) {
        const matches = text.match(pat);
        if (matches) {
          console.log(chunk + ' => ' + pat.source + ': ' + matches.slice(0,3).join(', '));
        }
      }
      console.log(chunk + ' done (len: ' + text.length + ')');
    } catch(e) {
      console.log(chunk + ' => error: ' + e.message);
    }
  }
}
main().catch(console.error);
