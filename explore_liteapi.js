const axios = require('axios');
const BASE = 'https://liteapi.pw4free.in';

async function testRaw(endpoint) {
  try {
    const resp = await axios.get(`${BASE}${endpoint}`, { timeout: 15000, validateStatus: () => true });
    console.log(`\n=== ${endpoint} ===`);
    console.log('Status:', resp.status);
    console.log('Headers:', JSON.stringify(resp.headers));
    const data = resp.data;
    if (typeof data === 'object') {
      console.log('Keys:', Object.keys(data));
      if (data.data) {
        console.log('data field length:', data.data.length);
        console.log('data field (first 50):', JSON.stringify(data.data.substring(0, 50)));
      } else {
        console.log('Full response:', JSON.stringify(data).substring(0, 300));
      }
    } else {
      console.log('Raw response:', JSON.stringify(data).substring(0, 300));
    }
  } catch(e) {
    console.log(`\n${endpoint}: ERROR -`, e.message);
  }
}

async function testPost(endpoint, body) {
  try {
    const resp = await axios.post(`${BASE}${endpoint}`, body, { timeout: 15000, validateStatus: () => true });
    console.log(`\n=== POST ${endpoint} ===`);
    console.log('Status:', resp.status);
    console.log('Data:', JSON.stringify(resp.data).substring(0, 300));
  } catch(e) {
    console.log(`\nPOST ${endpoint}: ERROR -`, e.message);
  }
}

async function main() {
  await testRaw('/api/v1/batches/details?batch_id=69d5e461a9fb5635c1f53e0d');
  await testRaw('/api/v1/subjects?batch_id=69d5e461a9fb5635c1f53e0d');
  await testRaw('/api/v1/contents?batch_id=69d5e461a9fb5635c1f53e0d');
  await testRaw('/api/v1/video/url?batch_id=69d5e461a9fb5635c1f53e0d&child_id=test');
  await testRaw('/api/v1/syllabus?batch_id=69d5e461a9fb5635c1f53e0d');
  
  // Try POST versions
  await testPost('/api/v1/batches/details', { batch_id: '69d5e461a9fb5635c1f53e0d' });
  
  // Try different parameter names
  await testRaw('/api/v1/subjects?batchId=69d5e461a9fb5635c1f53e0d');
  await testRaw('/api/v1/subjects?BatchId=69d5e461a9fb5635c1f53e0d');
  await testRaw('/api/v1/contents?batchId=69d5e461a9fb5635c1f53e0d');
  await testRaw('/api/v1/syllabus?batchId=69d5e461a9fb5635c1f53e0d');
}

main().catch(console.error);
