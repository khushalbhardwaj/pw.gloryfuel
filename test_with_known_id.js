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

async function test(endpoint, desc) {
  try {
    const resp = await axios.get(`${BASE}${endpoint}`, { timeout: 15000, validateStatus: () => true });
    if (resp.data && resp.data.data) {
      const dec = decrypt(resp.data.data);
      console.log(`✅ ${desc}: success=${dec.success}`);
      return dec;
    } else {
      console.log(`❌ ${desc}: ${resp.status} - ${JSON.stringify(resp.data).substring(0, 300)}`);
      return null;
    }
  } catch(e) {
    if (e.response) {
      console.log(`❌ ${desc}: ${e.response.status} - ${JSON.stringify(e.response.data).substring(0, 300)}`);
    } else {
      console.log(`❌ ${desc}: ${e.message.substring(0, 200)}`);
    }
    return null;
  }
}

async function main() {
  const batchId = '69d5e461a9fb5635c1f53e0d';
  
  // Try with a valid MongoDB ObjectId (any 24 hex chars)
  // From Prayas JEE 2026, Physics subject:
  const knownSubjectId = '6774c79727cd349473611a3b';
  
  let r = await test(`/api/v1/subjectdetails?batchId=${batchId}&subjectId=${knownSubjectId}`, 'subjectdetails with known subjectId');
  if (r && r.data) {
    console.log('  Data:', JSON.stringify(r.data).substring(0, 1000));
  }
  if (r && r.subjects) {
    console.log('  Subjects:', JSON.stringify(r.subjects).substring(0, 1000));
  }
  
  // Try a random 24 hex char ID that probably doesn't exist
  const randomId = '000000000000000000000000';
  r = await test(`/api/v1/subjectdetails?batchId=${batchId}&subjectId=${randomId}`, 'subjectdetails with random subjectId');
  if (r) console.log('  Data:', JSON.stringify(r).substring(0, 500));
  
  // Try /chapterdetails
  r = await test(`/api/v1/chapterdetails?batchId=${batchId}&chapterId=${knownSubjectId}&type=subject`, 'chapterdetails with known IDs');
  if (r) console.log('  Data:', JSON.stringify(r).substring(0, 500));
  
  // Search for batches the way the frontend does
  r = await test(`/api/v1/batches?q=Arjuna`, 'batches q=Arjuna');
  if (r && r.batches) {
    console.log('  Found', r.batches.length, 'batches');
    r.batches.forEach(b => console.log(`    ${b._id}: ${b.batchName}`));
  }
}

main().catch(console.error);
