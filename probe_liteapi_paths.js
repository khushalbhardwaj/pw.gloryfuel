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

async function test(desc, endpoint) {
  try {
    const resp = await axios.get(`${BASE}${endpoint}`, { timeout: 15000, validateStatus: () => true });
    if (resp.data && resp.data.data) {
      const dec = decrypt(resp.data.data);
      if (dec) {
        console.log(`✅ ${desc} -> ${JSON.stringify(dec).substring(0, 200)}`);
        return dec;
      }
    }
    console.log(`❌ ${desc} -> status=${resp.status} data=${JSON.stringify(resp.data).substring(0, 100)}`);
    return null;
  } catch(e) {
    console.log(`❌ ${desc} -> ${e.message.substring(0, 100)}`);
    return null;
  }
}

async function main() {
  const batchId = '69d5e461a9fb5635c1f53e0d';
  
  // Try every pattern found in the array
  await test('/batches?q=Arjuna', '/batches?q=Arjuna');
  await test('/subjectdetails?batchId=', `/subjectdetails?batchId=${batchId}`);
  await test('/videodetails?batchId=', `/videodetails?batchId=${batchId}`);
  await test('/chapterdetails?batchId=', `/chapterdetails?batchId=${batchId}`);
  await test('/pdfdetails?batchId=', `/pdfdetails?batchId=${batchId}`);
  await test('/batchcohort', `/batchcohort?batchId=${batchId}`);
  await test('/subjects?batchId=', `/subjects?batchId=${batchId}`);
  await test('/contents?batchId=', `/contents?batchId=${batchId}`);
  await test('/syllabus?batchId=', `/syllabus?batchId=${batchId}`);
  await test('/details?batchId=', `/details?batchId=${batchId}`);
}

main().catch(console.error);
