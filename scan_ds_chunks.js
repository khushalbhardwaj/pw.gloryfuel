const https = require('https');
const fs = require('fs');
const path = require('path');

const CHUNKS = [
  '/_next/static/chunks/main-app-b91091492d96fda2.js',
  '/_next/static/chunks/app/layout-2b71538a15895cb5.js',
  '/_next/static/chunks/app/page-c19f2a6a8e96cabf.js',
  '/_next/static/chunks/4bd1b696-8ad51578e2a901e5.js',
  '/_next/static/chunks/7770-ec4e393f6f6ed589.js',
  '/_next/static/chunks/1684-f538fbdd777ac9d8.js',
  '/_next/static/chunks/5514-209d70f1286c8c32.js',
  '/_next/static/chunks/3856-c31c89b8d86d3b4b.js',
  '/_next/static/chunks/7683-bdb090b831289dd4.js',
  '/_next/static/chunks/6257-7dfa3cdc4424a0e3.js',
];

let remaining = CHUNKS.length;

function downloadChunk(chunkPath) {
  const url = 'https://deltastudy.site' + chunkPath;
  const filename = 'ds_chunk_' + path.basename(chunkPath);
  const filepath = path.join(__dirname, filename);

  const req = https.get(url, { timeout: 20000, rejectUnauthorized: false }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      // Search for encryption-related patterns
      const cryptoPatterns = [
        /encrypt/gi, /decrypt/gi, /aes/gi, /gcm/gi, /cbc/gi,
        /cipher/gi, /subtle/gi, /importKey/gi, /deriveKey/gi,
        /maggikhalo/gi, /encryptionKey/gi, /secretKey/gi,
      ];

      let found = false;
      for (const pat of cryptoPatterns) {
        const match = data.match(pat);
        if (match) {
          if (!found) {
            console.log('\n=== ' + chunkPath + ' (' + (data.length/1024).toFixed(1) + 'KB) ===');
            found = true;
          }
          // Show context for each match
          const indices = [];
          let idx = 0;
          while ((idx = data.search(pat)) !== -1 && indices.length < 3) {
            indices.push(idx);
            data = data.substring(idx + 1);
          }
          // Re-fetch to show context (this is inefficient but works)
          data = fs.readFileSync(filepath, 'utf8');
          for (const i of indices) {
            const start = Math.max(0, i - 60);
            const end = Math.min(data.length, i + 80);
            console.log(`  ${pat.source.substring(0,20)}: ${data.substring(start, end).replace(/\n/g, '\\n')}`);
          }
          data = data.substring(Math.max(...indices) + 1);
        }
      }

      if (!found) {
        // Check for any hardcoded strings that look like keys
        const keyPatterns = [
          /['"][A-Za-z0-9_!@#$%^&*()]{8,40}['"]/g,
          /['"][a-f0-9]{32,64}['"]/gi,
        ];
        for (const pat of keyPatterns) {
          const matches = data.match(pat);
          if (matches) {
            const unique = [...new Set(matches)];
            console.log(chunkPath + ': found ' + unique.length + ' potential key strings');
          }
        }
      }
      
      remaining--;
      if (remaining === 0) {
        console.log('\n=== All chunks scanned ===');
        process.exit(0);
      }
    });
  });
  req.on('error', (e) => {
    console.log(chunkPath + ': ERROR - ' + e.message);
    remaining--;
    if (remaining === 0) process.exit(0);
  });
}

// First save the data then search
function downloadAndSave(chunkPath) {
  const url = 'https://deltastudy.site' + chunkPath;
  const filename = 'ds_chunk_' + path.basename(chunkPath);
  const filepath = path.join(__dirname, filename);

  https.get(url, { timeout: 20000, rejectUnauthorized: false }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      fs.writeFileSync(filepath, data);
      analyzeChunk(chunkPath, filepath, data);
    });
  }).on('error', (e) => {
    console.log(chunkPath + ': ERROR - ' + e.message);
    remaining--;
    if (remaining === 0) process.exit(0);
  });
}

function analyzeChunk(chunkPath, filepath, data) {
  const cryptoPatterns = [
    { name: 'encrypt', re: /encrypt/i },
    { name: 'decrypt', re: /decrypt/i },
    { name: 'aes', re: /\baes\b/i },
    { name: 'gcm', re: /\bgcm\b/i },
    { name: 'cbc', re: /\bcbc\b/i },
    { name: 'cipher', re: /cipher/i },
    { name: 'importKey', re: /importKey/ },
    { name: 'keyStr', re: /keystr|keyhex|keybytes|keybuf/i },
    { name: 'maggikhalo', re: /maggikhalo/i },
  ];

  let found = false;
  for (const p of cryptoPatterns) {
    if (p.re.test(data)) {
      if (!found) {
        console.log('\n=== ' + chunkPath + ' (' + (data.length/1024).toFixed(1) + 'KB) ===');
        found = true;
      }
      let idx = 0;
      let count = 0;
      const indices = [];
      while ((idx = data.indexOf(p.name, idx)) !== -1 && count < 3) {
        indices.push(idx);
        idx += p.name.length;
        count++;
      }
      for (const i of indices) {
        const start = Math.max(0, i - 60);
        const end = Math.min(data.length, i + 80);
        console.log(`  ${p.name}: ...${data.substring(start, end).replace(/\n/g, '\\n')}...`);
      }
    }
  }

  if (!found) {
    // Look for long hex strings that could be keys
    const hexKeys = data.match(/['"][a-f0-9]{32,64}['"]/gi);
    if (hexKeys) {
      const unique = [...new Set(hexKeys)];
      console.log(chunkPath + ': ' + unique.length + ' hex key candidates');
      unique.slice(0, 5).forEach(k => {
        const idx = data.indexOf(k);
        const ctx = data.substring(Math.max(0, idx-40), idx + k.length + 40);
        console.log('  hex: ' + ctx.replace(/\n/g, '\\n').substring(0, 120));
      });
    }
  }

  remaining--;
  if (remaining === 0) {
    console.log('\n=== All chunks scanned ===');
    process.exit(0);
  }
}

CHUNKS.forEach(downloadAndSave);
