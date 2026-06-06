async function apiFetch(url, opts = {}) {
  opts.headers = { ...opts.headers, 'x-api-key': API_KEY };
  return fetch(url, opts);
}

// Resize + convert to WebP via free image proxy (thumbs load 5x faster)
function optImg(url, w = 400) {
  if (!url || url.startsWith('/') || url.startsWith('data:')) return url;
  // Skip if already a weserv URL
  if (url.includes('images.weserv.nl')) return url;
  return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&w=${w}&output=webp&q=80`;
}
function showLoad() { document.getElementById('loading-overlay').style.display = 'flex'; }
function hideLoad() { document.getElementById('loading-overlay').style.display = 'none'; }

// ---- Watch/Download modal ----
let wdWatchUrl = '', wdDlUrlBase = '', wdDlTitle = '';
function openWDDialog(watchUrl, dlUrlBase, title) {
  wdWatchUrl = watchUrl; wdDlUrlBase = dlUrlBase; wdDlTitle = title || 'Video';
  document.getElementById('wd-title').textContent = title || 'Video';
  document.getElementById('wd-watch-btn').onclick = () => { closeWDDialog(); window.location.href = wdWatchUrl; };
  document.getElementById('wd-dl-btn').onclick = showQualityPicker;
  document.getElementById('wd-back-btn').onclick = showWDActions;
  document.getElementById('wd-action-view').style.display = 'block';
  document.getElementById('wd-quality-view').style.display = 'none';
  document.getElementById('wd-modal').style.display = 'flex';
}
function closeWDDialog() { document.getElementById('wd-modal').style.display = 'none'; }
function showWDActions() {
  document.getElementById('wd-action-view').style.display = 'block';
  document.getElementById('wd-quality-view').style.display = 'none';
}
async function showQualityPicker() {
  document.getElementById('wd-action-view').style.display = 'none';
  document.getElementById('wd-quality-view').style.display = 'block';
  const list = document.getElementById('wd-quality-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4)">Loading...</div>';
  // Extract params from dlUrlBase to pass to qualities endpoint
  const params = new URLSearchParams(wdDlUrlBase.split('?')[1]);
  try {
    const resp = await fetch(`${API_BASE}/study/video-qualities?${params.toString()}`, { headers: { 'x-api-key': API_KEY } });
    const data = await resp.json();
    if (!data.success) { list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.4)">No qualities available</div>'; return; }
    list.innerHTML = '';
    data.data.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'wd-quality-item';
      const label = q.height >= 720 ? 'HD' : q.height >= 480 ? 'SD' : 'LD';
      btn.innerHTML = `<span class="qlabel">${q.height}p</span><span class="qdetail">${q.width}x${q.height} &middot; ${label} &middot; ${(q.bandwidth/1000).toFixed(0)} kbps</span>`;
      btn.onclick = () => { closeWDDialog(); window.open(`${wdDlUrlBase}&quality=${q.id}`, '_blank'); };
      list.appendChild(btn);
    });
  } catch (e) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6b6b">Failed to load qualities</div>';
  }
}

let favs = JSON.parse(localStorage.getItem('gloryfuel-favs') || '[]');
let allBatches = [];
const PAGE_SIZE = 60;
let currentBatches = [];
let page = 0;

// ---- RENDER BATCHES with pagination ----
function renderBatches(batches, append) {
  const grid = document.getElementById('all-grid');
  const count = document.querySelector('.batch-count');
  if (!append) { grid.innerHTML = ''; page = 0; }
  currentBatches = batches;
  const slice = batches.slice(0, (page + 1) * PAGE_SIZE);
  if (!append) count.textContent = `${batches.length} batches`;

  if (!append) {
    grid.innerHTML = '';
    page = 0;
  }

  slice.forEach((b, i) => {
    const batchId = b.batchId || '';
    const hasContent = !!batchId;
    const bid = batchId || b._id || b.id || b.slug || `batch-${i}`;
    const name = b.name || 'Unknown Batch';
    const img = optImg(b.image || b.thumbnail || '');
    const isFav = favs.includes(bid);

    const card = document.createElement('div');
    card.className = `card${isFav ? ' fav-card' : ''}${!hasContent ? ' disabled-card' : ''}`;
    card.id = `card-${bid}`;
    card.style.animationDelay = `${(i % PAGE_SIZE) * 0.04}s`;
    if (hasContent) card.onclick = () => openBatchView(batchId, name);

    let btnHtml = '';
    if (hasContent) {
      btnHtml = `<button class="study-btn" onclick="event.stopPropagation(); openBatchView('${batchId}', '${name.replace(/'/g, "\\'")}')">
          Let's Study
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>
        </button>`;
    } else {
      btnHtml = `<div class="no-content-badge">No Content</div>`;
    }

    card.innerHTML = `
      <button class="heart-btn${isFav ? ' active' : ''}" onclick="toggleFav(event, '${bid}')" title="Favourite mein add karo">
        <svg class="heart-outline" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        <svg class="heart-filled" width="16" height="16" viewBox="0 0 24 24" fill="#fb7185"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
      <div class="card-img">
        <img src="${img}" alt="${name}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload="this.classList.add('loaded')" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'>📖</div>'">
      </div>
      <div class="card-body">
        <div class="card-name">${name}</div>
        ${btnHtml}
      </div>`;
    grid.appendChild(card);
  });

  // Remove old load-more if any
  const oldBtn = document.getElementById('load-more');
  if (oldBtn) oldBtn.remove();

  if (slice.length < batches.length) {
    const btn = document.createElement('button');
    btn.id = 'load-more';
    btn.className = 'load-more-btn';
    btn.textContent = `Show more (${batches.length - slice.length} remaining)`;
    btn.onclick = () => { page++; renderBatches(batches, true); };
    grid.appendChild(btn);
  }
}

let currentCategory = 'All';
let allBatchesFlat = [];

function filterBatches() {
  const q = document.getElementById('search-input').value.toLowerCase().trim();
  let source;
  if (currentCategory === 'All') source = allBatchesFlat;
  else source = sortByRecent([...(allBatches[currentCategory] || [])]);
  const filtered = q ? source.filter(b => b.name.toLowerCase().includes(q)) : source;
  renderBatches(filtered);
}

function filterByCategory(category) {
  currentCategory = category;
  document.getElementById('search-input').value = '';
  filterBatches();
}

function sortByRecent(batches) {
  return batches.sort((a, b) => {
    const idA = a._id || a.batchId || '';
    const idB = b._id || b.batchId || '';
    const ta = idA ? parseInt(idA.substring(0, 8), 16) * 1000 : 0;
    const tb = idB ? parseInt(idB.substring(0, 8), 16) * 1000 : 0;
    return tb - ta;
  });
}

// ---- FAVOURITES ----
window.toggleFav = function (e, id) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const card = document.getElementById(`card-${id}`);
  const idx = favs.indexOf(id);
  if (idx === -1) { favs.push(id); btn.classList.add('active'); if (card) card.classList.add('fav-card'); }
  else { favs.splice(idx, 1); btn.classList.remove('active'); if (card) card.classList.remove('fav-card'); }
  localStorage.setItem('gloryfuel-favs', JSON.stringify(favs));
  btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
  updateFavSection();
};

function getFavBatches() {
  const all = [];
  Object.values(allBatches).forEach(arr => arr.forEach(b => all.push(b)));
  return all.filter(b => favs.includes(b.batchId || b._id || b.id || b.slug));
}

function updateFavCount() {
  document.getElementById('fav-count').textContent = favs.length;
}

window.showFavourites = function () {
  document.querySelector('.page-title').innerHTML = 'choose your <span>batch</span>';
  document.getElementById('cat-filter').style.display = 'flex';
  document.getElementById('all-label').style.display = 'flex';
  const sel = document.getElementById('cat-select');
  sel.value = 'All';
  document.getElementById('search-input').value = '';
  currentCategory = 'All';
  const favBatches = getFavBatches();
  renderBatches(sortByRecent(favBatches));
}

function updateFavSection() {
  updateFavCount();
}

// ---- BATCH VIEW ----
function goBackToBatches() {
  document.querySelector('.page-title').innerHTML = 'choose your <span>batch</span>';
  document.getElementById('cat-filter').style.display = 'flex';
  document.getElementById('all-label').style.display = 'flex';
  document.getElementById('nav-back-btn').style.display = 'none';
  const sel = document.getElementById('cat-select');
  filterByCategory(sel.value);
  updateFavSection();
}

let currentBatchId = '';
let currentBatchName = '';

function openBatchView(batchId, batchName) {
  currentBatchId = batchId;
  currentBatchName = batchName;
  document.querySelector('.page-title').innerHTML = batchName;
  document.getElementById('cat-filter').style.display = 'none';
  document.getElementById('all-label').style.display = 'none';
  document.getElementById('nav-back-btn').style.display = 'flex';
  document.getElementById('nav-back-btn').onclick = goBackToBatches;
  renderSubjects(batchId);
  // Check availability in background — marks batch for removal if unavailable
  apiFetch(`${API_BASE}/study/check-batch?batchId=${encodeURIComponent(batchId)}`).catch(() => {});
}

function renderSubjects(batchId) {
  document.querySelector('.page-title').innerHTML = currentBatchName;
  document.getElementById('nav-back-btn').style.display = 'flex';
  document.getElementById('nav-back-btn').onclick = goBackToBatches;
  const grid = document.getElementById('all-grid');
  grid.innerHTML = '';
  showLoad();
  apiFetch(`${API_BASE}/study/batch-details`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId })
  })
    .then(r => r.json())
    .then(data => {
      hideLoad();
      if (!data.success) { grid.innerHTML = '<div class="empty"><div>⚠️</div><div>Failed to load batch details</div></div>'; return; }
      const subjects = data.data?.subjects || [];
      if (subjects.length === 0) { grid.innerHTML = '<div class="empty"><div>📚</div><div>No subjects found</div></div>'; return; }
      grid.innerHTML = '';
      const todayCard = document.createElement('div');
      todayCard.className = 'card';
      todayCard.style.animationDelay = '0s';
      todayCard.onclick = () => renderTodayClasses(batchId);
      todayCard.innerHTML = `<div class="card-body" style="text-align:center;padding:40px 20px"><div style="font-size:40px;margin-bottom:8px">📅</div><div class="card-name">Today's Classes</div><div style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:6px">View today's schedule</div></div>`;
      grid.appendChild(todayCard);
      subjects.forEach((s, i) => {
        const sName = s.subject || s.name || 'Subject';
        const slug = s.slug;
        const icon = s.icon || 'https://static.pw.live/react-batches/assets/svg/subjects/defaultSubject.svg';
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${i * 0.07}s`;
        card.onclick = () => renderTopics(batchId, slug, sName, s._id);
        const sLec = s.lectureCount || s.videoCount || 0;
        const sNote = s.notesCount || s.noteCount || 0;
        const sDpp = s.dppCount || 0;
        card.innerHTML = `<div class="card-body" style="text-align:center;padding:40px 20px"><img src="${icon}" alt="${sName}" style="width:48px;height:48px;margin-bottom:12px" onerror="this.style.display='none'"><div class="card-name">${sName}</div><div style="display:flex;gap:12px;justify-content:center;color:rgba(255,255,255,0.4);font-size:12px;margin-top:6px"><span>📹 ${sLec}</span><span>📄 ${sNote}</span><span>📝 ${sDpp}</span></div></div>`;
        grid.appendChild(card);
      });
    })
    .catch(() => { hideLoad(); grid.innerHTML = '<div class="empty"><div>⚠️</div><div>Failed to load subjects</div></div>'; });
}

function renderTodayClasses(batchId) {
  const grid = document.getElementById('all-grid');
  grid.innerHTML = '';
  showLoad();
  document.querySelector('.page-title').innerHTML = 'Today\'s Classes';
  document.getElementById('nav-back-btn').style.display = 'flex';
  document.getElementById('nav-back-btn').onclick = () => renderSubjects(batchId);
  apiFetch(`${API_BASE}/study/today`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId }) })
    .then(r => r.json())
    .then(data => {
      hideLoad();
      if (!data.success || !Array.isArray(data.data) || data.data.length === 0) { grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>🎉</div><div>No classes scheduled for today</div></div>'; return; }
      grid.innerHTML = '';
      data.data.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${i * 0.07}s`;
        const tcTitle = item.topic || "Today's Class";
        card.onclick = () => window.location.href = `player.html?batchId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(item.childId)}&subjectId=${encodeURIComponent(item.subjectId)}&subjectSlug=${encodeURIComponent(item.subjectSlug)}&title=${encodeURIComponent(tcTitle)}`;
        card.innerHTML = `<div class="card-img"><div class="no-img" style="font-size:40px">📅</div></div><div class="card-body"><div class="card-name">${item.topic || 'Today\'s Class'}</div><div style="color:rgba(255,255,255,0.4);font-size:12px"><span>📘 ${item.subject}</span><span style="margin-left:12px">🕐 ${item.startTime ? item.startTime.slice(0, 5) : ''}</span></div></div>`;
        grid.appendChild(card);
      });
    })
    .catch(() => { hideLoad(); grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>⚠️</div><div>Failed to load today\'s classes</div></div>'; });
}

function renderTopics(batchId, subjectSlug, subjectName, subjectId) {
  const grid = document.getElementById('all-grid');
  grid.innerHTML = '';
  showLoad();
  document.querySelector('.page-title').innerHTML = subjectName;
  document.getElementById('nav-back-btn').style.display = 'flex';
  document.getElementById('nav-back-btn').onclick = () => renderSubjects(batchId);
  apiFetch(`${API_BASE}/study/topics?batchId=${encodeURIComponent(batchId)}&subjectId=${encodeURIComponent(subjectId)}`)
    .then(r => r.json())
    .then(data => {
      hideLoad();
      if (!data.success || !Array.isArray(data.data) || data.data.length === 0) { grid.innerHTML = '<div class="empty"><div>📄</div><div>No topics found</div></div>'; return; }
      grid.innerHTML = '';
      data.data.forEach((t, i) => {
        const tName = t.name || t.topic || t.title || 'Topic';
        const slug = t.slug || t.alias || t._id || `topic-${i}`;
        const vidCount = t.videos || t.lectureVideos || t.videoCount || 0;
        const noteCount = t.notes || t.noteCount || 0;
        const dppCount = t.exercises || t.dppCount || t.dpp || 0;
        const card = document.createElement('div');
        card.className = 'card';
        card.style.animationDelay = `${i * 0.07}s`;
        card.onclick = () => renderTopicContent(batchId, subjectSlug, { slug, name: tName, data: t }, tName, subjectId);
        card.innerHTML = `<div class="card-body" style="text-align:center;padding:40px 20px"><div style="font-size:36px;margin-bottom:8px">📖</div><div class="card-name">${tName}</div><div style="display:flex;gap:12px;justify-content:center;color:rgba(255,255,255,0.4);font-size:12px;margin-top:6px"><span>📹 ${vidCount}</span><span>📄 ${noteCount}</span><span>📝 ${dppCount}</span></div></div>`;
        grid.appendChild(card);
      });
    })
    .catch(() => { hideLoad(); grid.innerHTML = '<div class="empty"><div>⚠️</div><div>Failed to load topics</div></div>'; });
}

function renderTopicContent(batchId, subjectSlug, topic, topicName, subjectId) {
  const grid = document.getElementById('all-grid');
  grid.innerHTML = '';
  document.querySelector('.page-title').innerHTML = topicName;
  document.getElementById('nav-back-btn').style.display = 'flex';
  document.getElementById('nav-back-btn').onclick = () => renderTopics(batchId, subjectSlug, topicName, subjectId);
  const tabs = document.createElement('div');
  tabs.className = 'tab-bar';
  tabs.innerHTML = `<button class="tab active" data-type="videos">📹 Videos</button><button class="tab" data-type="notes">📄 Notes</button><button class="tab" data-type="dpp">📝 DPP</button>`;
  grid.appendChild(tabs);
  const container = document.createElement('div');
  container.id = 'content-grid';
  container.style.cssText = 'grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:20px;width:100%';
  grid.appendChild(container);

  function loadContent(contentType) {
    container.innerHTML = '';
    showLoad();
    apiFetch(`${API_BASE}/study/datacontent?batchId=${encodeURIComponent(batchId)}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(topic.slug)}&contentType=${encodeURIComponent(contentType)}`)
      .then(r => r.json())
      .then(data => {
        hideLoad();
        if (!data.success) { container.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>⚠️</div><div>Failed to load</div></div>'; return; }
        const items = data.data;
        if (!Array.isArray(items) || items.length === 0) { container.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>📭</div><div>No content found</div></div>'; return; }
        container.innerHTML = '';
        if (contentType === 'videos') {
          items.forEach((item, i) => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${i * 0.07}s`;
            const childId = item.videoDetails?.findKey || item._id;
            const videoTitle = item.topic || 'Untitled';
            const watchUrl = `player.html?batchId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(subjectId || '')}&subjectSlug=${encodeURIComponent(subjectSlug)}&topicSlug=${encodeURIComponent(topic.slug)}&title=${encodeURIComponent(videoTitle)}`;
            card.onclick = () => window.location.href = watchUrl;
            card.innerHTML = `<div class="card-img"><img src="${optImg(item.videoDetails?.image || item.image || '')}" alt="${videoTitle}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'>📹</div>'"></div><div class="card-body"><div class="card-name">${videoTitle}</div><div style="display:flex;gap:12px;color:rgba(255,255,255,0.4);font-size:12px"><span>📅 ${(item.date || '').split('T')[0]}</span><span>⏱ ${item.duration || item.videoDetails?.duration || ''}</span></div></div>`;
            container.appendChild(card);
          });
        } else {
          items.forEach((item, i) => {
            const homeworkIds = item.homeworkIds || [];
            const card = document.createElement('div');
            card.className = 'card';
            card.style.animationDelay = `${i * 0.07}s`;
            const rawAtt = homeworkIds[0]?.attachmentIds?.[0] || homeworkIds[0]?.attachments?.[0] || homeworkIds[0]?.files?.[0] || null;
            console.log('Raw att from item:', rawAtt, 'homeworkIds[0] keys:', Object.keys(homeworkIds[0] || {}));
            const attTitle = rawAtt?.topic || rawAtt?.title || rawAtt?.name || rawAtt?.fileName || '';
            const itemTitle = item.topic || item.title || item.name || item.heading || item.lectureName || item.description || item.fileName || attTitle || 'Untitled';
            card.onclick = () => {
              if (homeworkIds.length > 0) {
                const att = homeworkIds[0]?.attachmentIds?.[0] || homeworkIds[0]?.attachments?.[0] || null;
                const directUrl = att?.url || att?.fileUrl || att?.fileUrlHD || att?.path || null;
                if (directUrl) {
                  window.open(directUrl, '_blank');
                } else {
                  apiFetch(`${API_BASE}/study/attachments?BatchId=${encodeURIComponent(batchId)}&SubjectId=${encodeURIComponent(subjectId)}&ContentId=${encodeURIComponent(item._id)}`)
                    .then(async r => { const txt = await r.text(); console.log('Attach status:', r.status, 'body:', txt); return txt; })
                    .then(txt => { try { const data = JSON.parse(txt); const items = Array.isArray(data) ? data : data.data || []; const att = items[0]; const u = att?.url || att?.fileUrl || (typeof att === 'string' ? att : null); if (u) window.open(u, '_blank'); } catch {} }).catch(e => console.log('Attach error:', e));
                }
              }
            };
            card.innerHTML = `<div class="card-body" style="text-align:center;padding:40px 20px"><div style="font-size:40px;margin-bottom:8px">${contentType === 'notes' ? '📄' : '📝'}</div><div class="card-name">${itemTitle}</div><div style="color:rgba(255,255,255,0.4);font-size:12px">${homeworkIds.length} file(s)</div></div>`;
            container.appendChild(card);
          });
        }
      })
      .catch(() => { hideLoad(); container.innerHTML = '<div class="empty" style="grid-column:1/-1"><div>⚠️</div><div>Failed to load content</div></div>'; });
  }
  tabs.addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadContent(tab.dataset.type);
  });
  loadContent('videos');
}

// ---- Client-side batch categorization (mirrors server logic) ----
const CATEGORY_RULES = [
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
const CATEGORY_SECTIONS = [
  { section: 'Popular Exams', categories: ['IIT-JEE', 'NEET', 'UPSC', 'Govt. Exams (State)'], prominent: true },
  { section: 'All Exams', categories: ['Engineering & Medical Exams (College & Job)', 'College Entrance Exams (UG & PG)', 'Schools, Boards & Olympiads', 'All Government Job Exams', 'CA, CS, Banking & Finance', 'NET Exams & Teacher Training'], prominent: false },
  { section: 'Other Offerings', categories: ['Other'], prominent: false },
];

function categorizeBatches(batches) {
  const catMap = {};
  batches.forEach(b => {
    const l = (b.name || '').toLowerCase();
    let cat = 'Other';
    for (const [name, kws] of CATEGORY_RULES) {
      for (const kw of kws) {
        if (new RegExp(kw, 'i').test(l)) { cat = name; break; }
      }
      if (cat !== 'Other') break;
    }
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push({ _id: b._id, name: b.name, image: optImg(b.image || b.previewImage || ''), slug: b.slug, batchId: b.batchId || b._id || '' });
  });
  return { sections: CATEGORY_SECTIONS, catMap };
}

// ---- INIT ----
async function initApp() {
  const catFilter = document.getElementById('cat-filter');
  try {
    // Load batches from LearnByAKP API
    const resp = await apiFetch(API_BASE + '/batches/list');
    const rawBatches = await resp.json();
    const batchArray = rawBatches.data || rawBatches.batches || rawBatches;
    const data = categorizeBatches(batchArray);
    allBatches = data.catMap || {};
    const total = Object.values(allBatches).reduce((s, a) => s + a.length, 0);
    document.querySelector('.batch-count').textContent = `${total} batches`;
    // Populate dropdown
    const sel = document.getElementById('cat-select');
    sel.innerHTML = '<option value="All">All Categories</option>';
    const allCats = new Set();
    data.sections.forEach(s => s.categories.forEach(c => allCats.add(c)));
    allCats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    sel.onchange = () => filterByCategory(sel.value);
    document.getElementById('search-input').oninput = () => filterBatches();
    catFilter.style.display = 'flex';
    allBatchesFlat = [];
    Object.values(allBatches).forEach(arr => arr.forEach(b => allBatchesFlat.push(b)));
    sortByRecent(allBatchesFlat);
    filterByCategory('All');
    updateFavSection();
  } catch {
    document.getElementById('all-grid').innerHTML = '<div class="empty"><div>❌</div><div>Failed to load</div></div>';
  }
}

document.addEventListener('DOMContentLoaded', checkMaintenance);
document.addEventListener('DOMContentLoaded', checkNotification);

function dismissNotif() {
  document.getElementById('notif-popup').style.display = 'none';
}

async function checkNotification() {
  try {
    const r = await apiFetch(API_BASE + '/notification');
    const data = await r.json();
    if (data.active && data.title) {
      document.getElementById('notif-popup-title').textContent = data.title;
      document.getElementById('notif-popup-msg').innerHTML = data.message.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#a78bfa;text-decoration:underline">$1</a>');
      document.getElementById('notif-popup').style.display = 'flex';
    }
  } catch {}
}

async function checkMaintenance() {
  try {
    const r = await apiFetch(API_BASE + '/maintenance');
    const data = await r.json();
    if (data.active) {
      document.getElementById('maint-msg').textContent = data.message || 'Site is under maintenance. Please check back later.';
      document.getElementById('maint-overlay').style.display = 'flex';
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', initApp);
