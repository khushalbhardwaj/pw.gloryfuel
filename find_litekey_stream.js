const https = require('https');
const crypto = require('crypto');

function searchInText(text) {
  const results = [];
  const searches = [
    'encrypt', 'decrypt', 'maggikhalo', 'secret', 'password', 
    'apiKey', 'api_key', 'cipher', 'aes', 'gcm', 'CryptoJS', 'createDecipher'
  ];
  for (const term of searches) {
    const idx = text.toLowerCase().indexOf(term);
    if (idx >= 0) {
      results.push({ term, idx, context: text.substring(Math.max(0, idx - 30), idx + 80) });
    }
  }
  
  // Look for const/let/var key assignments
  const keyAssignments = text.match(/=(=|>)?\s*['"][a-zA-Z0-9_@#$%^&*!]{8,40}['"]/g);
  if (keyAssignments) {
    keyAssignments.forEach(k => {
      const val = k.replace(/=[=>\s]*['"]?/g, '').replace(/['"]/g, '');
      if (val.length >= 6 && val.length <= 40 && !/^[0-9]+$/.test(val)) {
        results.push({ term: 'potential_key', context: val });
      }
    });
  }
  
  return results;
}

function downloadAndSearch(url) {
  return new Promise((resolve, reject) => {
    let data = '';
    let found = false;
    
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      rejectUnauthorized: false,
      timeout: 30000
    }, (res) => {
      res.on('data', (chunk) => {
        data += chunk.toString();
        // Process in 500KB chunks
        if (data.length > 500000) {
          const results = searchInText(data);
          if (results.length > 0) {
            found = true;
            resolve(results);
            req.destroy();
          }
          data = ''; // clear to save memory
        }
      });
      res.on('end', () => {
        if (!found) {
          const results = searchInText(data);
          resolve(results);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

const crypto_req = require('crypto');
async function main() {
  console.log('Downloading and searching lite.pw4free JS bundle...');
  try {
    const results = await downloadAndSearch('https://lite.pw4free.in/assets/index-CX79u9h4.js');
    console.log('Search results:');
    results.forEach(r => {
      if (r.term === 'potential_key') {
        console.log('  Potential key:', r.context);
      } else {
        console.log('  ' + r.term + ' at ' + r.idx + ': ' + r.context);
      }
    });
    if (results.length === 0) {
      console.log('  No relevant terms found');
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
}
main().catch(console.error);
