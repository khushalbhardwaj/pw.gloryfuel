const axios = require('axios');
const https = require('https');
const instance = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 15000,
  validateStatus: () => true
});

async function main() {
  const r = await instance.get('https://deltastudy.site/study-v2/batches');
  const html = typeof r.data === 'string' ? r.data : '';
  const chunks = html.match(/\/_next\/static\/chunks\/[^"']+\.js/g);
  const unique = [...new Set(chunks)];
  console.log('Found', unique.length, 'JS chunks');

  for (const chunk of unique) {
    try {
      const cr = await instance.get('https://deltastudy.site' + chunk);
      const text = typeof cr.data === 'string' ? cr.data : '';

      const terms = ['maggikhalo', 'encrypt', 'decrypt', 'aes', 'gcm', 'cipher', 'createDecipher', 'createCipher'];
      for (const term of terms) {
        if (text.toLowerCase().includes(term)) {
          console.log('FOUND in', chunk, ':', term);
        }
      }
    } catch(e) {
      // skip failed chunks
    }
  }
  console.log('Done scanning all chunks');
}
main().catch(console.error);
