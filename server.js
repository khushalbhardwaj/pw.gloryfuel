const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---- CORS ----
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) return cb(null, true);
    cb(null, false);
  },
}));

// ---- API key (set via env on Render, hardcoded fallback for dev) ----
const API_KEY = process.env.API_KEY || 'gf-pw-secret-api-key-2024';

// Serve files with API key injected (replaces /* GF_KEY */ placeholder)
function serveWithKey(filePath, contentType) {
  return (req, res) => {
    const fullPath = path.join(__dirname, filePath);
    fs.readFile(fullPath, 'utf8', (err, content) => {
      if (err) return res.status(404).send('Not found');
      content = content.replace(/'\/\* GF_KEY \*\/'/, "'" + API_KEY + "'");
      if (contentType) res.type(contentType);
      res.send(content);
    });
  };
}
app.get('/', serveWithKey('index.html', '.html'));
app.get('/config.js', serveWithKey('config.js', '.js'));
app.get('/script.js', serveWithKey('script.js', '.js'));
app.get('/admin.html', serveWithKey('admin.html', '.html'));
app.get('/player.html', serveWithKey('player.html', '.html'));

// All /api/* routes require the API key (except those in skip list)
function apiAuth(req, res, next) {
  const skip = ['/study/mpd', '/study/proxy', '/study/view', '/study/download', '/notification', '/maintenance', '/batches/list'];
  if (skip.some(p => req.path === p || req.path.startsWith(p + '?')) || req.path.startsWith('/study/') || req.path.startsWith('/batches/')) return next();
  console.log(`Auth check: path="${req.path}" originalUrl="${req.originalUrl}"`);
  const key = req.headers['x-api-key'] || req.query.key;
  if (key !== API_KEY) {
    console.log(`403: ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
app.use('/api', apiAuth);

// ---- Persistence helpers (in-memory fallback for Vercel) ----
const memCache = {};
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {} }

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')); }
  catch { return file in memCache ? memCache[file] : fallback; }
}
function writeJSON(file, data) {
  memCache[file] = data;
  try { fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2)); } catch {}
}

// ---- Visit tracking ----
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html' || req.path.startsWith('/api/study/')) {
    const stats = readJSON('stats.json', { totalVisits: 0, todayVisits: 0, lastDate: '', dailyLog: {} });
    const today = new Date().toISOString().slice(0, 10);
    if (stats.lastDate !== today) {
      stats.lastDate = today;
      stats.todayVisits = 0;
    }
    stats.totalVisits = (stats.totalVisits || 0) + 1;
    stats.todayVisits = (stats.todayVisits || 0) + 1;
    if (!stats.dailyLog) stats.dailyLog = {};
    stats.dailyLog[today] = (stats.dailyLog[today] || 0) + 1;
    writeJSON('stats.json', stats);
  }
  next();
});

// ---- Admin auth ----
const ADMIN_EMAIL = 'khushal@gloryfuel.com';
const ADMIN_PASS = '123ho123';
const ADMIN_SECRET = 'gf-admin-secret-' + Date.now();
const adminTokens = new Set();

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ---- Notification persistence ----
function getNotification() {
  return readJSON('notification.json', { title: '', message: '', active: false, createdAt: '' });
}
function setNotification(data) {
  writeJSON('notification.json', data);
}

const ENCRYPTION_KEY = "maggikhalo";
const keyBuf = Buffer.alloc(32, 0);
Buffer.from(ENCRYPTION_KEY, 'utf8').copy(keyBuf);

function decryptAESGCM(encrypted) {
  const [ivHex, cipherPart] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const combined = Buffer.from(cipherPart, 'hex');
  const tag = combined.slice(-16);
  const ciphertext = combined.slice(0, -16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuf, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

// ---- Multi-source proxy with fallback ----
const PROXY_SOURCES = [
  { name: 'Delta Study (primary)', base: 'https://apiserver.deltastudy.site' },
  { name: 'Delta Study (alt)',      base: 'https://deltastudy.site' },
  { name: 'LearnByAKP', base: 'https://learnbyakp.onrender.com', referer: 'https://learnbyakp.online/' },
];
let sourceHealth = {};
PROXY_SOURCES.forEach(s => sourceHealth[s.name] = true);
let lastSourceCheck = 0;

async function checkAllSources() {
  for (const s of PROXY_SOURCES) {
    try {
      await axios.head(s.base, { timeout: 3000 });
      sourceHealth[s.name] = true;
    } catch {
      sourceHealth[s.name] = false;
    }
  }
  lastSourceCheck = Date.now();
}
setInterval(checkAllSources, 30000);
checkAllSources();
function isAnySourceAlive() { return Object.values(sourceHealth).some(v => v); }

// Convenience ref to primary proxy source
const STUDY_API = PROXY_SOURCES[0].base;



// Cache signed CDN params so segment proxies can attach them
const signedParamsCache = new Map();
const PARAM_TTL = 10 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of signedParamsCache) {
    if (now - entry.ts > PARAM_TTL) signedParamsCache.delete(key);
  }
}, 60000);

// Endpoint-specific cache directories
const EP_CACHE = {
  'batchdetails': { dir: path.join(DATA_DIR, 'details_cache') },
  'topics':       { dir: path.join(DATA_DIR, 'topics_cache') },
  'datacontent':  { dir: path.join(DATA_DIR, 'content_cache') },
  'today':        { dir: path.join(DATA_DIR, 'today_cache') },
};

function cacheFilePath(type, key) {
  const cfg = EP_CACHE[type];
  if (!cfg) return null;
  if (!fs.existsSync(cfg.dir)) try { fs.mkdirSync(cfg.dir, { recursive: true }); } catch {}
  return path.join(cfg.dir, `${key}.json`);
}
function readCache(type, key) {
  const fp = cacheFilePath(type, key);
  if (fp && fs.existsSync(fp)) {
    try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch {}
  }
  return null;
}
function writeCache(type, key, data) {
  const fp = cacheFilePath(type, key);
  if (fp) {
    try { fs.writeFileSync(fp, JSON.stringify(data, null, 2)); } catch {}
  }
}

// Multi-source fetch with retry + cache fallback
async function multiSourceFetch(method, path, body, cacheType, cacheKey) {
  // 1. Try cache first
  if (cacheType && cacheKey) {
    const cached = readCache(cacheType, cacheKey);
    if (cached) return { status: 200, body: cached, source: 'cache' };
  }

  // 2. Try each proxy source
  if (Date.now() - lastSourceCheck > 10000) await checkAllSources();
  const alive = PROXY_SOURCES.filter(s => sourceHealth[s.name]);
  const tried = [];

  for (const s of (alive.length ? alive : PROXY_SOURCES)) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const cfg = { method, url: `${s.base}${path}`, timeout: 15000, validateStatus: () => true };
        if (body) cfg.data = body;
        if (s.referer) cfg.headers = { Referer: s.referer, Origin: new URL(s.referer).origin };
        const resp = await axios(cfg);
        let decrypted;
        try { decrypted = decryptAESGCM(resp.data.data); } catch { decrypted = resp.data; }
        // Only return if source actually has the data (skip 404/403 responses)
        if (resp.status >= 200 && resp.status < 300 && decrypted?.success !== false) {
          if (cacheType && cacheKey) writeCache(cacheType, cacheKey, decrypted);
          sourceHealth[s.name] = true;
          return { status: resp.status, body: decrypted, source: s.name };
        }
        // Non-successful — try next source
        tried.push(`${s.name} attempt ${attempt}: status ${resp.status} success=${decrypted?.success}`);
      } catch (e) {
        sourceHealth[s.name] = false;
        tried.push(`${s.name} attempt ${attempt}: ${e.message?.substring(0,60)}`);
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // 3. Final fallback: try cache again (might have been written by another request)
  if (cacheType && cacheKey) {
    const cached = readCache(cacheType, cacheKey);
    if (cached) return { status: 200, body: cached, source: 'cache' };
  }

  return { status: 503, body: { success: false, error: 'All sources unavailable' }, source: 'none', errors: tried };
}

// Helper: call Delta Study API (kept for backward compat, new code uses multiSourceFetch)
async function deltaFetch(method, path, body) {
  const cfg = { method, url: `${PROXY_SOURCES[0].base}${path}`, timeout: 15000, validateStatus: () => true };
  if (body) cfg.data = body;
  const resp = await axios(cfg);
  let decrypted;
  try { decrypted = decryptAESGCM(resp.data.data); }
  catch { return { status: resp.status, body: resp.data }; }
  return { status: resp.status, body: decrypted };
}

// Batches cache populated from LearnByAKP
let cachedBatches = null;

async function refreshBatchesCache() {
  try {
    const resp = await axios.get(AKP_BATCHES_LIST, { timeout: 30000 });
    const data = resp.data;
    cachedBatches = Array.isArray(data) ? data : (data.data || data.batches || []);
  } catch {
    cachedBatches = [];
  }
}
refreshBatchesCache();

// Categorize batches by name keywords
function categorizeBatches(batches) {
  if (!batches) {
    batches = cachedBatches || [];
  }
  if (!batches.length) return { sections: [], catMap: {} };
  const rules = [
    ['IIT-JEE', ['\\bjee\\b','\\biit','bitsat','\\bprayas\\b','\\barjuna\\b(?!.*neet)','striker','varun','fighter','power class.*jee','power.*batch.*jee','jee crash','jee ultimate','jee t20','jee.*restart']],
    ['NEET', ['\\bneet\\b','aiims','yakeen','dropper.*neet','saakaar(?! )','power.*batch.*neet','power class.*neet','neet.*restart','mission.*neet','neet coaching']],
    ['UPSC', ['upsc','csat','\\bias\\b','\\bips\\b','\\bifs\\b','civil service','optional','sociology.*optional','anthropology','rpp','mains test series','select 360','weekly current affairs','idmp','upsc.*sankalp','sankalp.*upsc','sankalp.*2025','varshiki']],
    ['Govt. Exams (State)', ['bpsc','uppsc','mppsc','mpsc','ukpsc','upsssc','bihar.*police','up.*police','daroga','rajdhani','saksham','nirnayak','bihar.*ssc','beltron','bihar.*d\\.?el\\.?ed','vikramshila','pratibha','ramban','tejas.*up','up.*arts']],
    ['CA, CS, Banking & Finance', ['ca (foundation|inter)','cs executive','cseet','\\bcma\\b','sampurna','udesh','sarv']],
    ['All Government Job Exams', ['ssc(?! je| )','cgl','chsl','cpo','gd constable','steno','mts','ibps','sbi ','rbi ','bank(?!ing)','banking','railway','rrb','insurance','defence','army','navy','airforce','cds','capf','police','constable','icg navik','kvs','dsssb','up tet','uptet','ctet','khakee','daksh','karmath','surya','brahmastra.*ssc','chayan(?! )','ssc exams','ssc khazana','ssc mahapack','ssc gd']],
    ['Engineering & Medical Exams (College & Job)', ['\\bgate\\b','\\bese\\b','psu','drdo','ceptam','ae/je','ssc je','kartavya','parakram','shreshth','super 1500','electrical.*1500','vijay','riser']],
    ['College Entrance Exams (UG & PG)', ['cuet','clat','ipmat','mht','kcet','afmc','nimcet','pw-sat','\\bnsat\\b','\\bmba\\b','pravesh','chhava','\\bnda\\b','\\bnd[^a-z]','wbjee','gpat','sarthak.*mht','sarthak.*wbjee','ssb mantra']],
    ['Schools, Boards & Olympiads', ['class \\d','board(?! )','uday','udaan','neev','umang','junoon','champs','victory','radiant','foundation(?! )','olympiad','nsejs','nsep','nseb','ioqm','nsec','10th','11th','12th','9th','8th','7th','6th','icse','cbse','pathshala','summer camp','board booster','project','nurture','accelerate','after-school','tivr','saarthi','hunkar','sambhav','buniya','vidyapeeth','prahar','parishram','goat','sankalp','saakaar.*physics|chemistry|mathematics','fastrack','reloaded','bihar board','up board','mp board','rbse board','jac board','hindi medium','english medium','kohinoor','miq','arjuna bangla','sandesh','sip ','prastuti','curiousjr','pragati.*bangla','jeet.*crash','aarambh','pahal','smriti','parakh','mission.*hindi']],
    ['NET Exams & Teacher Training', ['\\bnet\\b','jrf','mission.*jrf','phd','\\bshodh\\b']],
  ];
  const catMap = {};
  batches.forEach(b => {
    const l = b.name.toLowerCase();
    let cat = 'Other';
    for (const [name, kws] of rules) {
      for (const kw of kws) {
        if (new RegExp(kw, 'i').test(l)) { cat = name; break; }
      }
      if (cat !== 'Other') break;
    }
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push({ _id: b._id, name: b.name, image: b.image || b.previewImage || '', slug: b.slug, batchId: b.batchId || b._id || '' });
  });
  const sections = [
    { section: 'Popular Exams', categories: ['IIT-JEE', 'NEET', 'UPSC', 'Govt. Exams (State)'], prominent: true },
    { section: 'All Exams', categories: ['Engineering & Medical Exams (College & Job)', 'College Entrance Exams (UG & PG)', 'Schools, Boards & Olympiads', 'All Government Job Exams', 'CA, CS, Banking & Finance', 'NET Exams & Teacher Training'], prominent: false },
    { section: 'Other Offerings', categories: ['Other'], prominent: false },
  ];
  return { sections, catMap };
}

const batchesCategorized = categorizeBatches();

// Batch content availability cache (persisted)
const BATCH_CONTENT_FILE = 'batch_content.json';
function getContentCache() { return readJSON(BATCH_CONTENT_FILE, {}); }
function setContentCache(id, val) {
  const cache = getContentCache();
  cache[id] = val;
  writeJSON(BATCH_CONTENT_FILE, cache);
}

function filterAvailableMap(catMap) {
  const cache = getContentCache();
  const result = {};
  for (const [cat, batches] of Object.entries(catMap)) {
    const filtered = batches.filter(b => cache[b.batchId || b._id] !== false);
    if (filtered.length) result[cat] = filtered;
  }
  return result;
}

app.get('/api/study/categories', (req, res) => {
  const filtered = filterAvailableMap(batchesCategorized.catMap);
  res.json({ ...batchesCategorized, catMap: filtered });
});

app.get('/api/study/batches', (req, res) => {
  const { category, admin } = req.query;
  if (!category || !batchesCategorized.catMap[category]) return res.json([]);
  const cache = getContentCache();
  const sorted = [...batchesCategorized.catMap[category]]
    .filter(b => admin ? true : (cache[b.batchId || b._id] !== false))
    .sort((a, b) => {
      const ta = a._id ? parseInt(a._id.substring(0, 8), 16) * 1000 : 0;
      const tb = b._id ? parseInt(b._id.substring(0, 8), 16) * 1000 : 0;
      return tb - ta;
    });
  res.json(sorted);
});

// ---- LearnByAKP proxy ----
const AKP_SHEET = 'https://opensheet.elk.sh/1dyjS6Im6bejI29K6RutDoCmXBWmsPynmXqOwezLgP8o/Sheet1';
const AKP_BATCHES_LIST = 'https://raw.githubusercontent.com/akp-la/Learnbyakp/refs/heads/main/apv/batches.json';

// Fallback for missing batch placeholder image
app.get('/pwbatch.png', (req, res) => {
  res.redirect('https://static.pw.live/5eb393ee95fab7468a79d189/GLOBAL_CMS/f10eb934-422b-448f-aa2c-157078acb032.webp');
});

app.get('/api/batches/list', async (req, res) => {
  try {
    const resp = await axios.get(AKP_BATCHES_LIST, { timeout: 30000 });
    res.json(resp.data);
  } catch {
    res.status(502).json({ error: 'Failed to fetch batches' });
  }
});

app.get('/api/learnbyakp/batches', async (req, res) => {
  try {
    // LearnByAKP's data is backed by this Google Sheet (accessed via opensheet.elk.sh)
    const resp = await axios.get(AKP_SHEET, { timeout: 30000 });
    const rows = resp.data;
    const batches = [...new Set(rows.map(r => r.batch).filter(Boolean))];
    res.json({ success: true, total: rows.length, batches });
  } catch (err) {
    res.status(502).json({ error: 'LearnByAKP unavailable', detail: err.message });
  }
});

app.get('/api/learnbyakp/resources', async (req, res) => {
  const { batch, className, subject, category } = req.query;
  try {
    const resp = await axios.get(AKP_SHEET, { timeout: 30000 });
    let filtered = resp.data;
    if (batch) filtered = filtered.filter(r => r.batch?.toLowerCase() === batch.toLowerCase());
    if (className) filtered = filtered.filter(r => r.className?.toLowerCase() === className.toLowerCase());
    if (subject) filtered = filtered.filter(r => r.subject?.toLowerCase() === subject.toLowerCase());
    if (category) filtered = filtered.filter(r => r.category?.toLowerCase() === category.toLowerCase());
    res.json({ success: true, count: filtered.length, data: filtered });
  } catch (err) {
    res.status(502).json({ error: 'LearnByAKP unavailable', detail: err.message });
  }
});

// Check batch content availability (lazy check, caches result)
app.get('/api/study/check-batch', async (req, res) => {
  const { batchId } = req.query;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });
  const cache = getContentCache();
  if (batchId in cache) return res.json({ available: cache[batchId], cached: true });
  try {
    const batchResp = await multiSourceFetch('POST', '/api/pw/batchdetails', { searchParams: { BatchId: batchId } }, 'batchdetails', batchId);
    if (!batchResp.body?.success || !batchResp.body.data?.subjects?.length) {
      setContentCache(batchId, false); return res.json({ available: false });
    }
    const sub = batchResp.body.data.subjects[0];
    const topResp = await multiSourceFetch('GET', `/api/pw/topics?BatchId=${encodeURIComponent(batchId)}&SubjectId=${encodeURIComponent(sub._id)}`, null, 'topics', `${batchId}_${sub._id}`);
    if (!topResp.body?.success || !topResp.body.data?.length) {
      setContentCache(batchId, false); return res.json({ available: false });
    }
    const topicWithVideos = topResp.body.data.find(t => t.videos > 0 || t.lectureVideos > 0);
    if (!topicWithVideos) {
      setContentCache(batchId, false); return res.json({ available: false });
    }
    const dcResp = await multiSourceFetch('GET', `/api/pw/datacontent?batchId=${encodeURIComponent(batchId)}&subjectSlug=${encodeURIComponent(sub.slug)}&topicSlug=${encodeURIComponent(topicWithVideos.slug)}&contentType=videos`, null, 'datacontent', `${batchId}_${sub.slug}_${topicWithVideos.slug}_videos`);
    if (!dcResp.body?.success || !dcResp.body.data?.length) {
      setContentCache(batchId, false); return res.json({ available: false });
    }
    const firstVideo = dcResp.body.data[0];
    const childId = firstVideo.videoDetails?.findKey || firstVideo._id || '';
    if (!childId) {
      setContentCache(batchId, false); return res.json({ available: false });
    }
    // Try each source for the unencrypted video-url endpoint
    let available = false;
    for (const s of PROXY_SOURCES) {
      try {
        const vResp = await axios.get(`${s.base}/api/pw/video-url-details?batchId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(sub._id)}`, { timeout: 10000, validateStatus: () => true });
        if (vResp.data?.success && vResp.data?.data?.[0]?.url) {
          available = true; break;
        }
      } catch {}
    }
    setContentCache(batchId, available);
    res.json({ available });
  } catch (err) {
    setContentCache(batchId, false);
    res.json({ available: false });
  }
});

const DETAILS_CACHE_DIR = path.join(DATA_DIR, 'details_cache');
if (!fs.existsSync(DETAILS_CACHE_DIR)) fs.mkdirSync(DETAILS_CACHE_DIR, { recursive: true });

app.post('/api/study/batch-details', async (req, res) => {
  const { batchId } = req.body;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });
  // Check file cache first
  const cachePath = path.join(DETAILS_CACHE_DIR, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return res.status(200).json(cached);
    } catch {}
  }
  try {
    const result = await multiSourceFetch('POST', '/api/pw/batchdetails', { searchParams: { BatchId: batchId } }, 'batchdetails', batchId);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const TOPICS_CACHE_DIR = path.join(DATA_DIR, 'topics_cache');
if (!fs.existsSync(TOPICS_CACHE_DIR)) fs.mkdirSync(TOPICS_CACHE_DIR, { recursive: true });

app.get('/api/study/topics', async (req, res) => {
  const { batchId, subjectId } = req.query;
  if (!batchId || !subjectId) return res.status(400).json({ error: 'batchId and subjectId required' });
  try {
    const result = await multiSourceFetch('GET', `/api/pw/topics?BatchId=${encodeURIComponent(batchId)}&SubjectId=${encodeURIComponent(subjectId)}`, null, 'topics', `${batchId}_${subjectId}`);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study/datacontent', async (req, res) => {
  const { batchId, subjectSlug, topicSlug, contentType } = req.query;
  if (!batchId || !subjectSlug || !topicSlug || !contentType) {
    return res.status(400).json({ error: 'batchId, subjectSlug, topicSlug, contentType required' });
  }
  try {
    const result = await multiSourceFetch('GET', `/api/pw/datacontent?batchId=${encodeURIComponent(batchId)}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(topicSlug)}&contentType=${encodeURIComponent(contentType)}`, null, 'datacontent', `${batchId}_${subjectSlug}_${topicSlug}_${contentType}`);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error('datacontent error:', err?.message, err?.stack);
    res.status(500).json({ error: err?.message || 'Unknown error', detail: err?.stack?.substring(0, 200) });
  }
});

// In-memory cache for today's classes (bypasses read-only filesystem on Vercel)
const todayCache = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of todayCache) {
    if (now - entry.ts > 3600000) todayCache.delete(key);
  }
}, 60000);

app.post('/api/study/today', async (req, res) => {
  const { batchId } = req.body;
  if (!batchId) return res.status(400).json({ error: 'batchId required' });
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `${batchId}_${today}`;
    const cached = todayCache.get(cacheKey);
    if (cached) return res.json(cached.data);

    // Use LearnByAKP directly (Delta Study may have stale/incomplete data)
    const lakBase = PROXY_SOURCES.filter(s => s.name === 'LearnByAKP')[0]?.base;
    if (!lakBase) return res.status(502).json({ error: 'LearnByAKP source not configured' });

    const lakFetch = async (method, path, body) => {
      const cfg = { method, url: `${lakBase}${path}`, timeout: 25000, validateStatus: () => true, headers: { Referer: 'https://learnbyakp.online/', Origin: 'https://learnbyakp.online' } };
      if (body) cfg.data = body;
      const resp = await axios(cfg);
      if (typeof resp.data?.data === 'string') return decryptAESGCM(resp.data.data);
      return resp.data || {};
    };

    const bd = await lakFetch('POST', '/api/pw/batchdetails', { searchParams: { BatchId: batchId } });
    if (!bd.success || !bd.data?.subjects) return res.status(400).json({ error: 'batch details failed from LearnByAKP' });
    const subjects = bd.data.subjects;
    const items = [];
    const seen = new Set();

    // Scan up to 6 subjects, all topics with videos
    const subjectPromises = subjects.slice(0, 6).map(async sub => {
      try {
        const topicsResp = await lakFetch('GET', `/api/pw/topics?BatchId=${encodeURIComponent(batchId)}&SubjectId=${encodeURIComponent(sub._id)}`);
        if (!topicsResp.success || !Array.isArray(topicsResp.data)) return;
        const withVideos = topicsResp.data.filter(t => t.videos > 0 || t.lectureVideos > 0);
        if (!withVideos.length) return;

        const topicPromises = withVideos.map(async tv => {
          try {
            const dc = await lakFetch('GET', `/api/pw/datacontent?batchId=${encodeURIComponent(batchId)}&subjectSlug=${encodeURIComponent(sub.slug)}&topicSlug=${encodeURIComponent(tv.slug)}&contentType=videos`);
            if (!dc.success || !Array.isArray(dc.data)) return;
            dc.data.forEach(v => {
              if (v.date && v.date.slice(0, 10) === today && !seen.has(v._id)) {
                seen.add(v._id);
                items.push({
                  subject: sub.subject || sub.name || '',
                  subjectSlug: sub.slug || '',
                  subjectId: sub._id || '',
                  topic: v.topic || tv.name || '',
                  scheduleId: v._id || '',
                  startTime: v.startTime || '',
                  status: v.status || '',
                  childId: v.videoDetails?.findKey || v._id || '',
                  date: v.date,
                });
              }
            });
          } catch { /* skip topic on error */ }
        });
        await Promise.all(topicPromises);
      } catch { /* skip subject on error */ }
    });
    await Promise.all(subjectPromises);

    const result = { success: true, data: items };
    todayCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (err) {
    console.error('today error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study/attachments', async (req, res) => {
  const { BatchId, SubjectId, ContentId } = req.query;
  if (!BatchId || !SubjectId || !ContentId) {
    return res.status(400).json({ error: 'BatchId, SubjectId, ContentId required' });
  }
  try {
    const result = await multiSourceFetch('GET', `/api/pw/attachments-url?BatchId=${encodeURIComponent(BatchId)}&SubjectId=${encodeURIComponent(SubjectId)}&ContentId=${encodeURIComponent(ContentId)}`, null, null, null);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Video stream endpoints (no encryption + encrypted fallback)
app.get('/api/study/video-url', async (req, res) => {
  const { batchId, childId, subjectId, subjectSlug } = req.query;
  if (!batchId || !childId) return res.status(400).json({ error: 'batchId, childId required' });
  // Try each source for unencrypted video-url-details
  for (const s of PROXY_SOURCES) {
    try {
      const resp = await axios.get(`${s.base}/api/pw/video-url-details?batchId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(subjectId)}`, { timeout: 15000, validateStatus: () => true });
      if (resp.data?.success && resp.data?.data?.[0]?.url) {
        return res.json(resp.data);
      }
    } catch {}
  }
  // Fallback: encrypted /api/pw/video (uses subjectSlug as subjectId param)
  if (subjectSlug) {
    for (const s of PROXY_SOURCES) {
      try {
        const { status, body } = await multiSourceFetch('GET', `/api/pw/video?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectSlug)}&childId=${encodeURIComponent(childId)}`, null, null, null);
        if (body?.success && body?.data?.url) {
          return res.json({ success: true, data: [{ url: body.data.signedUrl ? body.data.url + body.data.signedUrl : body.data.url, type: 'mpd' }] });
        }
      } catch {}
    }
  }
  res.status(404).json({ success: false, error: 'Video not available' });
});

// Helper: fetch MPD and extract video quality options
async function getVideoQualities(batchId, childId, subjectId, subjectSlug) {
  let mpdUrl;
  // Try all sources for unencrypted video-url-details
  for (const s of PROXY_SOURCES) {
    try {
      const resp = await axios.get(`${s.base}/api/pw/video-url-details?batchId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(subjectId)}`, { timeout: 15000, validateStatus: () => true });
      if (resp.data?.success && resp.data?.data?.[0]?.url) { mpdUrl = resp.data.data[0].url; break; }
    } catch {}
  }
  // Fallback: encrypted /api/pw/video with subjectSlug
  if (!mpdUrl && subjectSlug) {
    for (const s of PROXY_SOURCES) {
      try {
        const { body } = await multiSourceFetch('GET', `/api/pw/video?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectSlug)}&childId=${encodeURIComponent(childId)}`, null, null, null);
        if (body?.success && body?.data?.url) { mpdUrl = body.data.signedUrl ? body.data.url + body.data.signedUrl : body.data.url; break; }
      } catch {}
    }
  }
  if (!mpdUrl) return null;
  const mpdResp = await axios.get(mpdUrl, {
      headers: { 'Origin': 'https://pw.live', 'Referer': 'https://pw.live/study-v2/batches', 'User-Agent': 'Mozilla/5.0' },
      responseType: 'text', timeout: 15000, validateStatus: () => true,
    });
    let mpd = mpdResp.data;
    const qidx = mpdUrl.indexOf('?');
  const baseUrl = qidx >= 0 ? mpdUrl.substring(0, qidx) : mpdUrl;
  const cdnBase = baseUrl.substring(0, baseUrl.lastIndexOf('/')) + '/';
  if (qidx >= 0) {
    const signedParams = mpdUrl.substring(qidx + 1);
      const cdnPath = new URL(cdnBase).pathname;
      const m2 = cdnPath.match(/^(\/[^/]+\/)/);
      const basePath = m2 ? m2[1] : cdnPath;
      signedParamsCache.set(basePath, { params: signedParams, ts: Date.now() });
  }
  return { mpdUrl, mpd, cdnBase };
}

app.get('/api/study/video-qualities', async (req, res) => {
  const { batchId, childId, subjectId, subjectSlug } = req.query;
  if (!batchId || !childId) return res.status(400).json({ error: 'batchId, childId required' });
  try {
    const info = await getVideoQualities(batchId, childId, subjectId, subjectSlug);
    if (!info) return res.status(404).json({ error: 'Video not available' });
    const qualities = [];
    const repRe = /<Representation\s[^>]*?>/g;
    let m;
    while ((m = repRe.exec(info.mpd)) !== null) {
      const tag = m[0];
      const id = tag.match(/id="(\d+)"/);
      const height = tag.match(/\bheight="(\d+)"/);
      const width = tag.match(/\bwidth="(\d+)"/);
      const bw = tag.match(/\bbandwidth="(\d+)"/);
      if (id && height && width && bw) {
        qualities.push({ id: parseInt(id[1]), height: parseInt(height[1]), width: parseInt(width[1]), bandwidth: parseInt(bw[1]) });
      }
    }
    if (qualities.length === 0) return res.status(404).json({ error: 'No video qualities found' });
    qualities.sort((a, b) => b.height - a.height);
    res.json({ success: true, data: qualities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: filter MPD to keep only one video representation
function filterMpdByQuality(mpd, qualityId) {
  const vidStart = mpd.indexOf('contentType="video"');
  if (vidStart < 0) return mpd;
  const asStart = mpd.lastIndexOf('<AdaptationSet', vidStart);
  const asEnd = mpd.indexOf('</AdaptationSet>', vidStart) + '</AdaptationSet>'.length;
  const videoAs = mpd.substring(asStart, asEnd);

  let keptRep = null;
  const repRe = /<Representation[^>]*?id="(\d+)"[^>]*>[\s\S]*?<\/Representation>/g;
  let r;
  while ((r = repRe.exec(videoAs)) !== null) {
    if (r[1] === String(qualityId)) { keptRep = r[0]; break; }
  }
  if (!keptRep) return mpd;

  // Build new AdaptationSet with only the selected Representation
  const asAttrEnd = videoAs.indexOf('>') + 1;
  const asOpen = videoAs.substring(0, asAttrEnd);
  // Keep ContentProtection elements
  const cps = [];
  const cpRe = /<ContentProtection[\s\S]*?<\/ContentProtection>/g;
  let cp;
  while ((cp = cpRe.exec(videoAs)) !== null) cps.push(cp[0]);
  const newAs = asOpen + cps.join('') + keptRep + '</AdaptationSet>';
  return mpd.substring(0, asStart) + newAs + mpd.substring(asEnd);
}

// Download: decrypt + package video via ffmpeg
const FFMPEG_PATH = (() => {
  // Try winget install location first, then PATH
  const winget = path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.1.1-essentials_build', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(winget)) return winget;
  return 'ffmpeg';
})();

app.get('/api/study/download', async (req, res) => {
  const { batchId, childId, subjectId, subjectSlug, title, quality } = req.query;
  if (!batchId || !childId) return res.status(400).json({ error: 'batchId, childId required' });

  try {
    // 1. Get video MPD info
    const info = await getVideoQualities(batchId, childId, subjectId, subjectSlug);
    if (!info) return res.status(404).json({ error: 'Video not available' });
    let mpd = info.mpd;
    const mpdUrl = info.mpdUrl;
    const cdnBase = info.cdnBase;

    // 2. Filter to selected quality if specified
    if (quality) {
      const filtered = filterMpdByQuality(mpd, quality);
      if (filtered === mpd) return res.status(400).json({ error: `Quality ${quality} not found` });
      mpd = filtered;
    }

    // 3. Strip PSSH/ContentProtection from MPD — ffmpeg confuses them with -c copy
    mpd = mpd.replace(/<ContentProtection[\s\S]*?<\/ContentProtection>/g, '');

    // 4. Get decryption key — use -cenc_decryption_key with just the hex key (not KID:KEY)
    const kidResp = await axios.get(`${STUDY_API}/api/pw/kid?mpdUrl=${encodeURIComponent(mpdUrl)}`, { timeout: 15000 });
    if (!kidResp.data?.success) return res.status(500).json({ error: 'Failed to get KID' });
    const otpResp = await axios.get(`${STUDY_API}/api/pw/otp?kid=${kidResp.data.kid}`, { timeout: 15000 });
    if (!otpResp.data?.success) return res.status(500).json({ error: 'Failed to get KEY' });
    const key = otpResp.data.key;

    // 5. Rewrite segment URLs directly — replace relative paths in SegmentTemplate
    //    with absolute proxy URLs (avoids URL resolution stripping query params)
    const hostUrl = `${req.protocol}://${req.get('host')}`;
    // Encode just the cdnBase; segment path keeps $Number$ as-is for DASH template
    const encodedBase = encodeURIComponent(cdnBase);
    const rewriteUrl = (relPath) => `${hostUrl}/api/study/proxy?url=${encodedBase}${relPath}`;
    mpd = mpd.replace(/(<SegmentTemplate\s[^>]*?initialization=")([^"]+)(")/g, (m, pre, path, post) => pre + rewriteUrl(path) + post);
    mpd = mpd.replace(/(<SegmentTemplate\s[^>]*?media=")([^"]+)(")/g, (m, pre, path, post) => pre + rewriteUrl(path) + post);

    // 6. Create temp MPD file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gf-dl-'));
    const tmpMpd = path.join(tmpDir, 'video.mpd');
    fs.writeFileSync(tmpMpd, mpd);

    // 7. Set download headers
    const baseName = (title || 'video').replace(/[^\w\s.-]/g, '').trim() || 'video';
    const filename = baseName + (baseName.endsWith('.mp4') ? '' : '.mp4');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // 8. Spawn ffmpeg: decrypt + remux into MP4, pipe to response
    const logPath = path.join(tmpDir, 'ffmpeg.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'w' });
    const proc = spawn(FFMPEG_PATH, [
      '-protocol_whitelist', 'file,http,https,tcp,tls,crypto,data',
      '-i', tmpMpd,
      '-cenc_decryption_key', key,
      '-c', 'copy',
      '-reset_timestamps', '1',
      '-f', 'mp4',
      'pipe:1'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let errorLog = '';
    proc.stderr.on('data', d => { const s = d.toString(); errorLog += s; logStream.write(s); });
    proc.stdout.pipe(res);

    res.on('finish', () => {
      try { setTimeout(() => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} }, 5000); } catch {}
    });

    proc.on('close', code => {
      logStream.end();
      if (code !== 0 && !res.headersSent) {
        res.status(500).json({ error: 'Download failed', detail: errorLog.slice(-500) });
      }
    });

    proc.on('error', err => {
      logStream.write(`Spawn error: ${err.message}\n`); logStream.end();
      if (!res.headersSent) res.status(500).json({ error: err.message });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy MPD content from CDN (injects BaseURL, adds CORS + proper Origin header)
app.get('/api/study/mpd', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const resp = await axios.get(url, {
      headers: {
        'Origin': 'https://pw.live',
        'Referer': 'https://pw.live/study-v2/batches',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      responseType: 'text',
      timeout: 15000,
      validateStatus: () => true,
    });
    let mpd = resp.data;
    // Calculate CDN base URL from the signed MPD URL
    const qidx = url.indexOf('?');
    const baseUrl = qidx >= 0 ? url.substring(0, qidx) : url;
    const cdnBase = baseUrl.substring(0, baseUrl.lastIndexOf('/')) + '/';
    // Extract signed query params and cache them for segment proxy requests
    if (qidx >= 0) {
      const signedParams = url.substring(qidx + 1);
      // Use top-level path prefix (e.g. /<uuid>/) so proxy can match any segment under it
      const cdnPath = new URL(cdnBase).pathname;
      const m = cdnPath.match(/^(\/[^/]+\/)/);
      const basePath = m ? m[1] : cdnPath;
      signedParamsCache.set(basePath, { params: signedParams, ts: Date.now() });
    }
    // Inject BaseURL and add signed params directly to segment URLs (URL resolution drops base query string)
    if (qidx >= 0) {
      const signedParams = url.substring(qidx + 1);
      const escapedParams = signedParams.replace(/&/g, '&amp;');
      mpd = mpd.replace(/<MPD[^>]*>/, match => `${match}<BaseURL>${cdnBase}</BaseURL>`);
      mpd = mpd.replace(/(initialization="[^"]+)(")/g, `$1?${escapedParams}$2`);
      mpd = mpd.replace(/(media="[^"]+)(")/g, `$1?${escapedParams}$2`);
      mpd = mpd.replace(/(<SegmentURL[^>]*media="[^"]+)(")/g, `$1?${escapedParams}$2`);
    } else {
      mpd = mpd.replace(/<MPD[^>]*>/, match => `${match}<BaseURL>${cdnBase}</BaseURL>`);
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', 'application/dash+xml');
    res.status(resp.status).send(mpd);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study/kid', async (req, res) => {
  const { mpdUrl } = req.query;
  if (!mpdUrl) return res.status(400).json({ error: 'mpdUrl required' });
  for (const s of PROXY_SOURCES) {
    try {
      const resp = await axios.get(`${s.base}/api/pw/kid?mpdUrl=${encodeURIComponent(mpdUrl)}`, { timeout: 15000, validateStatus: () => true });
      if (resp.data?.success) return res.json(resp.data);
    } catch {}
  }
  res.status(404).json({ success: false, error: 'KID not found' });
});

app.get('/api/study/otp', async (req, res) => {
  const { kid } = req.query;
  if (!kid) return res.status(400).json({ error: 'kid required' });
  for (const s of PROXY_SOURCES) {
    try {
      const resp = await axios.get(`${s.base}/api/pw/otp?kid=${encodeURIComponent(kid)}`, { timeout: 15000, validateStatus: () => true });
      if (resp.data?.success) return res.json(resp.data);
    } catch {}
  }
  res.status(404).json({ success: false, error: 'OTP not found' });
});

// Proxy for video segments (adds CORS + proper Origin header)
app.get('/api/study/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  let fetchUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'sec-prod-mediacdn.pw.live') {
      // Only add cached signed params if URL doesn't already carry them
      if (!parsed.search) {
        const m = parsed.pathname.match(/^(\/[^/]+\/)/);
        const basePath = m ? m[1] : parsed.pathname;
        const entry = signedParamsCache.get(basePath);
        if (entry) {
          fetchUrl = url + '?' + entry.params;
        }
      }
    }
  } catch {}
  try {
    const resp = await axios.get(fetchUrl, {
      headers: {
        'Origin': 'https://pw.live',
        'Referer': 'https://pw.live/study-v2/batches',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: () => true,
    });
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Range');
    if (resp.headers['content-type']) res.set('Content-Type', resp.headers['content-type']);
    if (resp.headers['content-length']) res.set('Content-Length', resp.headers['content-length']);
    if (resp.headers['content-range']) res.set('Content-Range', resp.headers['content-range']);
    if (resp.headers['accept-ranges']) res.set('Accept-Ranges', resp.headers['accept-ranges']);
    res.status(resp.status);
    resp.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study/attachment-link', async (req, res) => {
  const { batchId, subjectId, scheduleId } = req.query;
  if (!batchId || !subjectId || !scheduleId) {
    return res.status(400).json({ error: 'batchId, subjectId, scheduleId required' });
  }
  try {
    const { status, body } = await deltaFetch('GET', `/api/pw/attachment-link?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectId)}&scheduleId=${encodeURIComponent(scheduleId)}`);
    res.status(status).json(body);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/study/view', async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const deltaRes = await axios.get(`${STUDY_API}/api/pw/view`, {
      params: { url, filename: filename || '' },
      headers: { 'Origin': 'https://pw.live', 'Referer': 'https://pw.live/study-v2/batches' },
      responseType: 'stream',
      timeout: 30000,
      validateStatus: () => true
    });
    res.status(deltaRes.status);
    if (deltaRes.headers['content-type']) res.setHeader('content-type', deltaRes.headers['content-type']);
    if (deltaRes.headers['content-disposition']) res.setHeader('content-disposition', deltaRes.headers['content-disposition']);
    deltaRes.data.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Admin login ----
app.post('/api/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
    const token = crypto.randomBytes(32).toString('hex');
    adminTokens.add(token);
    return res.json({ token, email });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/logout', adminAuth, (req, res) => {
  const token = req.headers['x-admin-token'];
  adminTokens.delete(token);
  res.json({ ok: true });
});

// ---- Admin stats ----
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const stats = readJSON('stats.json', { totalVisits: 0, todayVisits: 0, lastDate: '', dailyLog: {} });
  const notification = getNotification();
  let batches = cachedBatches || [];

  // Batch category breakdown
  const categorized = categorizeBatches(batches);
  const categoryStats = {};
  for (const [cat, items] of Object.entries(categorized.catMap)) {
    categoryStats[cat] = items.length;
  }

  // Recent batches (last 30 days)
  const now = Date.now();
  const thirtyDays = 30 * 86400 * 1000;
  const recentBatches = batches.filter(b => {
    const ts = b._id ? parseInt(b._id.substring(0, 8), 16) * 1000 : 0;
    return ts > now - thirtyDays;
  }).length;

  // Total subjects across all batches (estimate from categories)
  const totalCategories = Object.keys(categorized.catMap).length;

  // Type distribution
  const typeDist = {};
  const langDist = {};
  let working = 0;
  let notWorking = 0;
  for (const b of batches) {
    if (b.batchId) working++; else notWorking++;
    const t = b.type || 'UNKNOWN';
    typeDist[t] = (typeDist[t] || 0) + 1;
    const l = b.language || 'Unknown';
    langDist[l] = (langDist[l] || 0) + 1;
  }

  res.json({
    totalBatches: batches.length,
    recentBatches,
    totalCategories,
    categoryStats,
    typeDistribution: typeDist,
    languageDistribution: langDist,
    workingCount: working,
    notWorkingCount: notWorking,
    visits: {
      total: stats.totalVisits || 0,
      today: stats.todayVisits || 0,
      lastDate: stats.lastDate,
      dailyLog: stats.dailyLog || {},
    },
    notification: {
      hasActive: notification.active,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
    },
    maintenance: getMaintenance(),
  });
});

// ---- Notification CRUD ----
app.get('/api/notification', (req, res) => {
  const n = getNotification();
  res.json({ title: n.title, message: n.message, active: n.active });
});

app.post('/api/admin/notification', adminAuth, (req, res) => {
  const { title, message, active } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  setNotification({
    title,
    message,
    active: active !== false,
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true });
});

app.delete('/api/admin/notification', adminAuth, (req, res) => {
  setNotification({ title: '', message: '', active: false, createdAt: '' });
  res.json({ ok: true });
});

// ---- Maintenance mode ----
function getMaintenance() {
  return readJSON('maintenance.json', { active: false, message: 'Site is under maintenance. Please check back later.' });
}
function setMaintenance(data) {
  writeJSON('maintenance.json', data);
}

app.get('/api/maintenance', (req, res) => {
  const m = getMaintenance();
  res.json({ active: m.active, message: m.message });
});

app.post('/api/admin/maintenance', adminAuth, (req, res) => {
  const { active, message } = req.body;
  setMaintenance({
    active: active === true,
    message: message || 'Site is under maintenance. Please check back later.',
  });
  res.json({ ok: true });
});

app.use(express.static(path.join(__dirname)));

module.exports = app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
