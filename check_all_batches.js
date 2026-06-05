const fs = require('fs');
const path = require('path');
const axios = require('axios');

const STUDY_API = 'https://apiserver.deltastudy.site';
const ENCRYPTION_KEY = "maggikhalo";
const keyBuf = Buffer.alloc(32, 0);
Buffer.from(ENCRYPTION_KEY, 'utf8').copy(keyBuf);
const CRYPTO = require('crypto');

function decryptAESGCM(encrypted) {
  const [ivHex, cipherPart] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const combined = Buffer.from(cipherPart, 'hex');
  const tag = combined.slice(-16);
  const ciphertext = combined.slice(0, -16);
  const decipher = CRYPTO.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function deltaFetch(method, urlPath, body) {
  const opts = { method, url: `${STUDY_API}${urlPath}`, timeout: 20000, validateStatus: () => true };
  if (body) opts.data = body;
  const resp = await axios(opts);
  try { return { status: resp.status, body: decryptAESGCM(resp.data.data) }; }
  catch { return { status: resp.status, body: resp.data }; }
}

const BATCH_CONTENT_FILE = path.join(__dirname, 'data', 'batch_content.json');
let cache = {};
try { cache = JSON.parse(fs.readFileSync(BATCH_CONTENT_FILE, 'utf8')); } catch {}

const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'batches.json'), 'utf8'));
const allIds = (raw.data || raw).filter(b => b.batchId).map(b => b.batchId);
const toCheck = allIds.filter(id => !(id in cache));

let working = Object.values(cache).filter(v => v === true).length;
let notWorking = Object.values(cache).filter(v => v === false).length;
let checked = 0;
const startTime = Date.now();
const CONCURRENCY = 2;

console.log('Total:' + allIds.length + ' Cached:' + Object.keys(cache).length + ' ToCheck:' + toCheck.length);

async function checkOne(id, retries) {
  for (let a = 1; a <= retries; a++) {
    try {
      const br = await deltaFetch('POST', '/api/pw/batchdetails', { searchParams: { BatchId: id } });
      if (!br.body?.success || !br.body.data?.subjects?.length) return false;
      const sub = br.body.data.subjects[0];
      const tr = await deltaFetch('GET', `/api/pw/topics?BatchId=${encodeURIComponent(id)}&SubjectId=${encodeURIComponent(sub._id)}`);
      if (!tr.body?.success || !tr.body.data?.length) return false;
      if (!tr.body.data.find(t => t.videos > 0 || t.lectureVideos > 0)) return false;
      const dc = await deltaFetch('GET', `/api/pw/datacontent?batchId=${encodeURIComponent(id)}&subjectSlug=${encodeURIComponent(sub.slug)}&topicSlug=${encodeURIComponent(tr.body.data.find(t => t.videos > 0 || t.lectureVideos > 0).slug)}&contentType=videos`);
      if (!dc.body?.success || !dc.body.data?.length) return false;
      const childId = dc.body.data[0].videoDetails?.findKey || dc.body.data[0]._id || '';
      if (!childId) return false;
      const vr = await axios.get(`${STUDY_API}/api/pw/video-url-details?batchId=${encodeURIComponent(id)}&childId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(sub._id)}`, { timeout: 20000, validateStatus: () => true });
      return !!(vr.data?.success && vr.data?.data?.[0]?.url);
    } catch (e) {
      const msg = e.message || '';
      if ((msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT') || msg.includes('timeout')) && a < retries)
        await new Promise(r => setTimeout(r, 2000 * a));
      else return false;
    }
  }
  return false;
}

(async () => {
  for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
    const batch = toCheck.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(id => checkOne(id, 3)));
    for (let j = 0; j < results.length; j++) {
      cache[batch[j]] = results[j];
      if (results[j]) working++; else notWorking++;
      checked++;
      const m = ((Date.now() - startTime) / 60000).toFixed(1);
      console.log(`[${checked}/${toCheck.length} ${(checked/toCheck.length*100).toFixed(1)}% ${m}min] ${results[j]?'✓':'✗'} ${batch[j]}`);
    }
    if (checked % 20 === 0 || i + CONCURRENCY >= toCheck.length)
      fs.writeFileSync(BATCH_CONTENT_FILE, JSON.stringify(cache, null, 2));
    if (i + CONCURRENCY < toCheck.length) await new Promise(r => setTimeout(r, 100));
  }
  fs.writeFileSync(BATCH_CONTENT_FILE, JSON.stringify(cache, null, 2));
  const m = ((Date.now() - startTime) / 60000).toFixed(1);
  const w = Object.values(cache).filter(v => v === true).length;
  const n = Object.values(cache).filter(v => v === false).length;
  console.log(`\nDONE: Total=${allIds.length} Working=${w} NotWorking=${n} Time=${m}min`);
})().catch(e => console.error('FATAL:', e));
