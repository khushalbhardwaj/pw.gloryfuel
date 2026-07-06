const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const LBAK = 'https://learnbyakp.onrender.com';
const PW_API = 'https://api.penpencil.xyz';
const PW_CO_API = 'https://api.penpencil.co';
const DATA_DIR = path.join(__dirname, 'data');
const PW_TOKEN_FILE = path.join(DATA_DIR, 'pw_token.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---- in-memory token storage ----
let userToken = '';
let cloudfrontCookies = '';

// ---- PW (penpencil.co) token for video access ----
let pwToken = null;
let pwRandomId = null;
let pwTokenExpiry = 0;

function loadPWToken() {
  try {
    const saved = JSON.parse(fs.readFileSync(PW_TOKEN_FILE, 'utf8'));
    if (saved && saved.token && saved.expiry > Date.now()) {
      pwToken = saved.token;
      pwRandomId = saved.randomId || '';
      pwTokenExpiry = saved.expiry;
    }
  } catch {}
}
function savePWToken(token, randomId, expiresIn) {
  pwToken = token;
  pwRandomId = randomId || '';
  pwTokenExpiry = Date.now() + (expiresIn || 86400) * 1000;
  fs.writeFileSync(PW_TOKEN_FILE, JSON.stringify({ token, randomId: pwRandomId, expiry: pwTokenExpiry }));
}
loadPWToken();

// ---- Batch slug map (batchId → slug) ----
let batchSlugMap = {};
(function buildBatchSlugMap() {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'batches.json'), 'utf8'));
    let batches = Array.isArray(raw) ? raw : null;
    if (!batches) { if (raw.batches) batches = raw.batches; else if (raw.data) batches = raw.data; else batches = []; }
    batches.forEach(b => {
      if (b._id && b.slug) batchSlugMap[b._id] = b.slug;
      if (b.batchId && b.slug) batchSlugMap[b.batchId] = b.slug;
    });
  } catch {}
})();

// ---- Signed params cache for CloudFront segment proxy ----
const signedParamsCache = new Map();
const PARAM_TTL = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of signedParamsCache) {
    if (now - entry.ts > PARAM_TTL) signedParamsCache.delete(key);
  }
}, 60000);

// ---- Helper: fetch from penpencil.co with PW token ----
async function pwCoFetch(method, path, opts = {}) {
  if (!pwToken) return { status: 401, body: { error: 'PW token not available — login via admin panel' } };
  const headers = {
    'Authorization': `Bearer ${pwToken}`,
    'client-id': '5eb393ee95fab7468a79d189',
    'client-type': 'WEB',
    'randomid': pwRandomId,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Referer': 'https://www.pw.live/',
  };
  if (opts.headers) Object.assign(headers, opts.headers);
  const url = `${PW_CO_API}${path}${opts.params ? '?' + new URLSearchParams(opts.params).toString() : ''}`;
  try {
    const resp = await fetch(url, { method, headers, body: opts.data ? JSON.stringify(opts.data) : undefined });
    const text = await resp.text();
    try { return { status: resp.status, body: JSON.parse(text) }; } catch { return { status: resp.status, body: { raw: text } }; }
  } catch (err) {
    return { status: 0, body: { error: err.message } };
  }
}

// ---- static files ----
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/player.html', (req, res) => res.sendFile(path.join(__dirname, 'player.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/logo.jpg', (req, res) => res.sendFile(path.join(__dirname, 'logo.jpg')));
app.get('/favicon.ico', (req, res) => res.redirect('/logo.jpg'));
app.get('/config.js', (req, res) => res.sendFile(path.join(__dirname, 'config.js')));

// ---- penpencil helpers ----
async function penpencilDirect(path, query) {
  if (!userToken) return { success: false, data: null, error: 'No token set' };
  const url = `${PW_API}${path}${query ? '?' + new URLSearchParams(query).toString() : ''}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${userToken}`, 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://pw.live/', Origin: 'https://pw.live' }
  });
  if (!resp.ok) return { success: false, data: null, status: resp.status };
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, data: null, raw: text }; }
}

async function penpencil(path, query) {
  // Try direct token first, fallback to learnbyakp proxy
  if (userToken) {
    const direct = await penpencilDirect(path, query);
    if (direct.success) return direct;
  }
  const url = `${LBAK}/api/penpencil${path}${query ? '?' + new URLSearchParams(query).toString() : ''}`;
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { success: false, data: null, raw: text }; }
}

// ---- static batches ----
const batchesPath = path.join(DATA_DIR, 'batches.json');
let allBatches = [];
try { allBatches = JSON.parse(fs.readFileSync(batchesPath, 'utf8')); } catch {}
if (!Array.isArray(allBatches)) {
  if (allBatches.batches) allBatches = allBatches.batches;
  else if (allBatches.data) allBatches = allBatches.data;
  else allBatches = [];
}

app.get('/api/batches/list', (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  let result = allBatches;
  if (search) {
    const q = search.toLowerCase();
    result = allBatches.filter(b => (b.name || b.batch_name || '').toLowerCase().includes(q));
  }
  const start = (page - 1) * limit;
  res.json({ success: true, data: result.slice(start, start + +limit), total: result.length });
});

// ---- BATCH DETAILS (subjects) ----
app.post('/api/study/batch-details', async (req, res) => {
  try {
    const id = req.query.batchId || req.query.batch_id || req.body?.batchId || req.body?.batch_id;
    if (!id) return res.status(400).json({ success: false, error: 'batchId required' });
    const data = await penpencil(`/v3/batches/${id}/details`);
    if (data?.success && data?.data) return res.json({ success: true, data: data.data });
    res.json({ success: false, error: 'Could not fetch batch details' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ---- TOPICS ----
app.get('/api/study/topics', async (req, res) => {
  try {
    const { batchId, subjectId } = req.query;
    if (!batchId || !subjectId) return res.status(400).json({ success: false, error: 'batchId and subjectId required' });
    const data = await penpencil(`/v2/batches/${batchId}/subject/${subjectId}/topics`, { page: 1 });
    if (data?.success && data?.data) return res.json({ success: true, data: data.data });
    // try more pages
    const data2 = await penpencil(`/v2/batches/${batchId}/subject/${subjectId}/topics`, { page: 2 });
    if (data2?.success && data2?.data) return res.json({ success: true, data: data2.data });
    res.json({ success: false, data: [], error: 'No topics' });
  } catch (e) { res.json({ success: false, data: [], error: e.message }); }
});

// ---- CONTENT (videos/notes/dpp) ----
app.get('/api/study/datacontent', async (req, res) => {
  try {
    const { batchId, subjectId, subjectSlug, topicSlug, contentType } = req.query;
    const subId = subjectId || subjectSlug;
    if (!batchId || !subId || !topicSlug) return res.status(400).json({ success: false, error: 'Missing params' });
    const topicsResp = await penpencil(`/v2/batches/${batchId}/subject/${subId}/topics`, { page: 1 });
    if (topicsResp?.success && topicsResp?.data) {
      const topic = topicsResp.data.find(t => t.slug === topicSlug || t._id === topicSlug || t.alias === topicSlug);
      if (topic) {
        const ct = contentType || 'videos';
        const contentResp = await penpencil(`/v2/batches/${batchId}/subject/${subId}/contents?tag=${topic._id}&contentType=${ct}`, { page: 1 });
        if (contentResp?.success && contentResp?.data?.length) {
          const items = contentResp.data.map(item => ({
            _id: item._id || topic._id,
            topic: item.topic || topic.name,
            date: item.date || item.scheduleDate || '',
            startTime: item.startTime || '',
            duration: item.videoDetails?.duration || '',
            isVideoLecture: item.isVideoLecture || false,
            lectureType: item.lectureType || '',
            videoDetails: {
              image: item.videoDetails?.image || '',
              videoUrl: item.videoDetails?.videoUrl || '',
              findKey: item.videoDetails?.findKey || item._id,
              duration: item.videoDetails?.duration || ''
            },
            homeworkIds: item.homeworkIds || [],
            dpp: item.dpp || null
          }));
          return res.json({ success: true, data: items });
        }
      }
    }
    res.json({ success: false, data: [], error: 'No content' });
  } catch (e) { res.json({ success: false, data: [], error: e.message }); }
});

// ---- TODAY'S SCHEDULE ----
app.post('/api/study/today', async (req, res) => {
  try {
    const { batchId } = req.body || req.query;
    if (!batchId) return res.status(400).json({ success: false, error: 'batchId required' });
    const data = await penpencil(`/v1/batches/${batchId}/todays-schedule`);
    if (data?.success && data?.data) {
      const items = data.data.map(item => ({
        childId: item._id || '',
        subjectId: item.batchSubjectId || '',
        subjectSlug: item.batchSubjectId || '',
        topic: item.topic || 'Today\'s Class',
        startTime: item.date || item.scheduleDate || '',
        subject: item.subjectName || 'Lecture',
        batchId
      }));
      return res.json({ success: true, data: items });
    }
    res.json({ success: false, data: [] });
  } catch (e) { res.json({ success: false, data: [], error: e.message }); }
});

// ---- VIDEO URL (get direct video URL from schedule) ----
app.get('/api/study/video-url', async (req, res) => {
  try {
    const { batchId, childId, subjectId } = req.query;
    if (!batchId || !childId) return res.status(400).json({ success: false, error: 'Missing params' });
    // Try v1 schedule endpoint with the schedule's own _id
    if (subjectId) {
      const data = await penpencil(`/v1/batches/${batchId}/subject/${subjectId}/schedule/${childId}`);
      if (data?.success && data?.data) {
        const vd = data.data.videoDetails;
        const videoUrl = vd?.videoUrl || data.data.url || '';
        const findKey = vd?.findKey || childId;
        if (videoUrl) return res.json({ success: true, data: [{ url: videoUrl, findKey }] });
        return res.json({ success: true, data: [{ url: '', findKey }] });
      }
    }
    // Fallback: try v2 contents to get video details
    if (subjectId) {
      const data = await penpencil(`/v2/batches/${batchId}/subject/${subjectId}/contents?tag=&contentType=videos&page=1`);
      if (data?.success && data?.data) {
        const item = data.data.find(s => s._id === childId);
        if (item?.videoDetails) {
          const vd = item.videoDetails;
          const videoUrl = vd?.videoUrl || item.url || '';
          const findKey = vd?.findKey || childId;
          return res.json({ success: true, data: [{ url: videoUrl, findKey }] });
        }
      }
    }
    res.json({ success: true, data: [{ url: '', findKey: childId }] });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// ---- TODAY'S CLASSES (across all batches) ----
app.get('/api/study/today-classes', async (req, res) => {
  try {
    const results = [];
    const sampleBatches = allBatches.slice(0, 10);
    for (const batch of sampleBatches) {
      const id = batch._id || batch.batch_id;
      if (!id) continue;
      try {
        const data = await penpencil(`/v1/batches/${id}/todays-schedule`);
        if (data?.success && data?.data?.length) {
          data.data.forEach(item => {
            results.push({
              batchId: id,
              batchName: batch.name || batch.batch_name || '',
              childId: item._id || '',
              subjectId: item.batchSubjectId || '',
              subjectSlug: item.batchSubjectId || '',
              subject: item.subjectName || '',
              topic: item.topic || 'Today\'s Class',
              startTime: item.date || item.scheduleDate || '',
              thumbnail: '',
              duration: ''
            });
          });
        }
      } catch {}
    }
    res.json({ success: true, data: results });
  } catch (e) { res.json({ success: false, data: [], error: e.message }); }
});

// ---- ADMIN ENDPOINTS (token + cookies) ----
app.post('/api/admin/token', (req, res) => {
  const { token } = req.body || req.query;
  if (!token) return res.status(400).json({ error: 'Missing token' });
  userToken = token;
  console.log('User token updated');
  res.json({ ok: true });
});

app.get('/api/admin/token', (req, res) => {
  res.json({ set: !!userToken, length: userToken.length });
});

app.post('/api/admin/cookies', (req, res) => {
  const { cookies } = req.body || req.query;
  if (!cookies) return res.status(400).json({ error: 'Missing cookies' });
  cloudfrontCookies = cookies;
  console.log('CloudFront cookies updated');
  res.json({ ok: true });
});

app.get('/api/admin/cookies', (req, res) => {
  res.json({ set: !!cloudfrontCookies, length: cloudfrontCookies.length });
});

// ---- PW OTP LOGIN (admin endpoints) ----
app.post('/api/admin/pw/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number required' });
  try {
    const resp = await fetch(`${PW_CO_API}/v1/users/get-otp?smsType=0`, {
      method: 'POST',
      headers: { 'client-id': '5eb393ee95fab7468a79d189', 'client-type': 'WEB', 'client-version': '6.0.6', 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ username: phone.replace(/[^0-9]/g, ''), countryCode: '+91', organizationId: '5eb393ee95fab7468a79d189' })
    });
    const data = await resp.json();
    if (data.success) return res.json({ success: true, message: 'OTP sent' });
    res.status(400).json({ error: 'Failed to send OTP' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/pw/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
  try {
    const resp = await fetch(`${PW_CO_API}/v3/oauth/token`, {
      method: 'POST',
      headers: { 'client-id': '5eb393ee95fab7468a79d189', 'client-type': 'WEB', 'client-version': '6.0.6', 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({
        username: phone.replace(/[^0-9]/g, ''),
        otp: String(otp),
        client_id: 'system-admin',
        client_secret: 'KjPXuAVfC5xbmgreETNMaL7z',
        grant_type: 'password',
        organizationId: '5eb393ee95fab7468a79d189',
        latitude: 0, longitude: 0
      })
    });
    const data = await resp.json();
    const d = data?.data || {};
    const token = d.access_token || '';
    const randomId = d.random_id || '';
    const expiresIn = d.expires_in || 86400;
    if (!token) return res.status(400).json({ error: 'OTP verification failed' });
    savePWToken(token, randomId, expiresIn);
    res.json({ success: true, message: 'Logged in to PW', expiresIn });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/pw/status', (req, res) => {
  res.json({ loggedIn: !!pwToken, expiresAt: pwTokenExpiry, remaining: pwTokenExpiry ? Math.max(0, Math.floor((pwTokenExpiry - Date.now()) / 1000)) : 0 });
});

app.post('/api/admin/pw/clear', (req, res) => {
  pwToken = null;
  pwRandomId = null;
  pwTokenExpiry = 0;
  try { fs.unlinkSync(PW_TOKEN_FILE); } catch {}
  res.json({ ok: true });
});

// ---- VIDEO ENDPOINTS (require PW token from OTP) ----

// Get signed video URL from PW API
app.get('/api/study/video-url', async (req, res) => {
  const { batchId, childId, subjectId, subjectSlug } = req.query;
  if (!batchId || !childId) return res.status(400).json({ error: 'batchId, childId required' });
  const slug = batchSlugMap[batchId] || batchId;
  try {
    const params = { type: 'BATCHES', childId, parentId: slug, reqType: 'query', videoContainerType: 'DASH' };
    if (subjectSlug) params.subjectId = subjectSlug;
    else if (subjectId) params.subjectId = subjectId;
    const { status, body } = await pwCoFetch('GET', '/v1/videos/video-url-details', { params });
    if (body?.data?.[0]?.url) return res.json({ success: true, data: body.data });
    res.status(404).json({ success: false, error: 'Video not available' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Get KID (Key ID) from MPD manifest
app.get('/api/study/kid', async (req, res) => {
  const { mpdUrl } = req.query;
  if (!mpdUrl) return res.status(400).json({ error: 'mpdUrl required' });
  try {
    const resp = await fetch(mpdUrl, { headers: { 'User-Agent': 'Mozilla/5.0', Origin: 'https://www.pw.live', Referer: 'https://www.pw.live/study/lectures' } });
    const mpd = await resp.text();
    const match = mpd.match(/default_KID="([^"]+)"/);
    if (!match) return res.status(404).json({ success: false, error: 'KID not found' });
    res.json({ success: true, kid: match[1].replace(/-/g, '') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get decryption key from PW OTP endpoint
app.get('/api/study/otp', async (req, res) => {
  const { kid } = req.query;
  if (!kid) return res.status(400).json({ error: 'kid required' });
  try {
    const kidBytes = Buffer.from(kid, 'hex');
    const xorBytes = Buffer.alloc(kidBytes.length);
    for (let i = 0; i < kidBytes.length; i++) xorBytes[i] = kidBytes[i] ^ pwToken.charCodeAt(i % pwToken.length);
    let otpKey = xorBytes.toString('base64');
    otpKey = Buffer.from(otpKey, 'utf8').toString('hex');
    let encodedKey = '';
    for (let i = 0; i < otpKey.length; i += 2) { encodedKey += otpKey.substring(i, i + 2) + '00'; }
    const { status, body } = await pwCoFetch('GET', '/v1/videos/get-otp', { params: { key: encodedKey, isEncoded: 'true' } });
    if (!body?.data?.otp) return res.status(404).json({ success: false, error: 'OTP not found' });
    const decoded = Buffer.from(body.data.otp, 'base64');
    let key = '';
    for (let i = 0; i < decoded.length; i++) key += String.fromCharCode(decoded[i] ^ pwToken.charCodeAt(i % pwToken.length));
    if (key.length < 32) key = key.padEnd(32, '0');
    res.json({ success: true, key });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Proxy MPD content from CDN (injects BaseURL pointing to our proxy)
app.get('/api/study/mpd', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const resp = await fetch(url, { headers: { 'Origin': 'https://www.pw.live', 'Referer': 'https://www.pw.live/study/lectures', 'User-Agent': 'Mozilla/5.0' } });
    let mpd = await resp.text();
    const qidx = url.indexOf('?');
    const baseUrl = qidx >= 0 ? url.substring(0, qidx) : url;
    const cdnBase = baseUrl.substring(0, baseUrl.lastIndexOf('/')) + '/';
    if (qidx >= 0) {
      const signedParams = url.substring(qidx + 1);
      const basePath = new URL(cdnBase).pathname;
      signedParamsCache.set(basePath, { params: signedParams, ts: Date.now() });
    }
    const host = req.headers.host || 'localhost:3000';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const proxyBase = `${proto}://${host}/api/study/proxy?url=${encodeURIComponent(cdnBase)}`;
    // Remove any existing BaseURL
    mpd = mpd.replace(/<BaseURL[^>]*>[^<]*<\/BaseURL>/g, '');
    mpd = mpd.replace(/<MPD[^>]*>/, match => `${match}<BaseURL>${proxyBase}</BaseURL>`);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/dash+xml');
    res.send(mpd);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Proxy for video segments (adds CORS + cached signed params)
app.get('/api/study/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  let fetchUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('cloudfront.net') || parsed.hostname === 'sec-prod-mediacdn.pw.live') {
      // Look for the base path of the video in the cache
      for (const [basePath, entry] of signedParamsCache) {
        if (parsed.pathname.startsWith(basePath)) {
          fetchUrl = url + (url.includes('?') ? '&' : '?') + entry.params;
          break;
        }
      }
    }
  } catch {}
  try {
    const resp = await fetch(fetchUrl, { headers: { 'Origin': 'https://www.pw.live', 'Referer': 'https://www.pw.live/study/lectures', 'User-Agent': 'Mozilla/5.0' } });
    const ct = resp.headers.get('content-type') || 'application/octet-stream';
    const body = await resp.arrayBuffer();
    res.set('Access-Control-Allow-Origin', '*');
    if (ct) res.set('Content-Type', ct);
    res.send(Buffer.from(body));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ---- NOTIFICATION / MAINTENANCE ----
const notifPath = path.join(DATA_DIR, 'notification.json');
const maintPath = path.join(DATA_DIR, 'maintenance.json');
app.get('/notification', (req, res) => { try { res.json(JSON.parse(fs.readFileSync(notifPath, 'utf8'))); } catch { res.json({}); } });
app.get('/maintenance', (req, res) => { try { res.json(JSON.parse(fs.readFileSync(maintPath, 'utf8'))); } catch { res.json({}); } });
app.post('/api/admin/notification', (req, res) => {
  const { msg, from } = req.body;
  if (!msg) return res.status(400).json({ error: 'msg required' });
  fs.writeFileSync(notifPath, JSON.stringify({ msg, from: from || 'Gloryfuel', ts: Date.now() }));
  res.json({ ok: true });
});

// ---- START ----
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
