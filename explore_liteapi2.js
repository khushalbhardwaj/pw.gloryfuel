const crypto = require('crypto');
const axios = require('axios');

const KEY = Buffer.from('c1b352360b3a99ff358d277aa7f6ae54d34981725c599537fb922fda68847e7a', 'hex');
const IV = Buffer.from('7c3dec87ad88b4b97459f983d3d5cd14', 'hex');
const BASE = 'https://liteapi.pw4free.in/api/v1';

function decrypt(raw) {
  if (!raw) return null;
  const buf = Buffer.from(raw, 'base64');
  const d = crypto.createDecipheriv('aes-256-cbc', KEY, IV);
  d.setAutoPadding(true);
  return JSON.parse(Buffer.concat([d.update(buf), d.final()]).toString('utf8'));
}

async function test(desc, endpoint, method = 'GET', body = null) {
  try {
    const cfg = { url: `${BASE}${endpoint}`, method, timeout: 15000, validateStatus: () => true };
    if (body) cfg.data = body;
    const resp = await axios(cfg);
    if (resp.data && resp.data.data && typeof resp.data.data === 'string') {
      const dec = decrypt(resp.data.data);
      if (dec) {
        console.log(`✅ ${desc} -> success=${dec.success} keys=${Object.keys(dec).join(',')}`);
        console.log(`   ${JSON.stringify(dec).substring(0, 500)}`);
        return dec;
      }
    }
    const msg = JSON.stringify(resp.data).substring(0, 300);
    console.log(`✅ ${desc} -> (raw) ${msg}`);
    return resp.data;
  } catch(e) {
    console.log(`❌ ${desc} -> ${e.message.substring(0, 100)}`);
    return null;
  }
}

async function main() {
  const batchId = '69d5e461a9fb5635c1f53e0d';
  
  // Try a different approach - get first subjectId from batches
  // Maybe batches has more info with a different query
  const batches = await test('/batches?limit=50', `/batches?limit=50&q=Arjuna`);
  
  // Look for the specific Arjuna JEE 2027 batch
  if (batches?.batches) {
    const arjuna2027 = batches.batches.filter(b => b._id === batchId);
    console.log('\nArjuna 2027:', JSON.stringify(arjuna2027[0], null, 2));
  }
  
  // Try to get subjects
  // Maybe we can get subjectIds from subjectdetails with page param
  console.log('\n=== Trying to discover subject IDs ===');
  
  // Try page=all or all subjects
  await test('/subjectdetails page=all', `/subjectdetails?batchId=${batchId}&subjectId=all&page=all`);
  
  // Try encrypting a request for subjects
  // Maybe the API key is different for batches
  console.log('\n=== Trying different batch endpoints ===');
  
  // Try batches/detail
  await test('/batches/detail', `/batches/detail?batch_id=${batchId}`);
  await test('/batch', `/batch?batch_id=${batchId}`);
  
  // Try with accept header
  const resp = await axios.get(`${BASE}/batches?limit=50&page=1`, { 
    timeout: 15000, 
    validateStatus: () => true,
    headers: { 'Accept': 'application/json' }
  });
  
  if (resp.data?.data) {
    const dec = decrypt(resp.data.data);
    if (dec?.batches) {
      const target = dec.batches.find(b => b._id === batchId || b.id === batchId);
      if (target) {
        console.log('\nTarget batch full data:', JSON.stringify(target, null, 2));
      }
    }
  }

  // A different approach: maybe subjectdetails returns subjects list when no subjectId
  // Test with various param names
  console.log('\n=== Trying subjectdetails with various params ===');
  await test('subject_id=', `/subjectdetails?batchId=${batchId}&subject_id=`);
  await test('subject=', `/subjectdetails?batchId=${batchId}&subject=`);
  await test('id=', `/subjectdetails?batchId=${batchId}&id=`);
}

main().catch(console.error);
