const crypto = require('crypto');
const axios = require('axios');

const KEY = Buffer.from('c1b352360b3a99ff358d277aa7f6ae54d34981725c599537fb922fda68847e7a', 'hex');
const IV = Buffer.from('7c3dec87ad88b4b97459f983d3d5cd14', 'hex');
const BASE = 'https://liteapi.pw4free.in';

function decrypt(raw) {
  const buf = Buffer.from(raw, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
  d.setAutoPadding(true);
  return JSON.parse(Buffer.concat([d.update(buf), d.final()]).toString('utf8'));
}

async function test(endpoint) {
  try {
    const resp = await axios.get(`${BASE}${endpoint}`, { timeout: 15000, validateStatus: () => true });
    if (resp.data && resp.data.data) {
      const dec = decrypt(resp.data.data);
      console.log(`✅ ${endpoint} -> success=${dec.success} keys=${Object.keys(dec).join(',')}`);
      return dec;
    } else {
      console.log(`❌ ${endpoint} -> no data field`);
      return null;
    }
  } catch(e) {
    console.log(`❌ ${endpoint} -> ${e.message}`);
    return null;
  }
}

async function main() {
  // Test all likely endpoints
  const endpoints = [
    '/api/v1/batches?q=Arjuna',
    '/api/v1/batches/details?batch_id=69d5e461a9fb5635c1f53e0d',
    '/api/v1/subjects?batch_id=69d5e461a9fb5635c1f53e0d',
    '/api/v1/contents?subject_id=6726社群4b6d90416c96421a',
    '/api/v1/video/url?batch_id=69d5e461a9fb5635c1f53e0d&child_id=test',
    '/api/v1/syllabus?batch_id=69d5e461a9fb5635c1f53e0d',
    '/api/v1/video?batch_id=69d5e461a9fb5635c1f53e0d',
  ];
  
  for (const ep of endpoints) {
    const result = await test(ep);
    if (result) {
      console.log('  data:', JSON.stringify(result).substring(0, 200));
    }
  }
}

main().catch(console.error);
