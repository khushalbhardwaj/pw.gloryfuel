const HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
const SHAKA_URL = "https://cdn.jsdelivr.net/npm/shaka-player@4/dist/shaka-player.compiled.js";

async function loadHlsLibrary() {
  if (window.Hls && Hls.isSupported()) return true;
  if (document.createElement('video').canPlayType('application/vnd.apple.mpegurl')) return true;
  const s = document.createElement('script'); s.src = HLS_JS_URL; s.async = true;
  return new Promise((resolve, reject) => { s.onload = () => resolve(true); s.onerror = () => reject(new Error('HLS.js failed to load')); document.head.appendChild(s); });
}

const $ = (id) => document.getElementById(id);
const video = $("video"), vpRoot = $("vpRoot"), videoShell = $("vpVideoShell"), vpControls = $("vpControls");
const playPauseBtn = $("playPauseBtn"), centerPlayBtn = $("centerPlayBtn");
const backwardBtn = $("backwardBtn"), forwardBtn = $("forwardBtn");
const muteBtn = $("muteBtn"), volumeSlider = $("volumeSlider");
const fullscreenBtn = $("fullscreenBtn"), pipBtn = $("pipBtn");
const progressBar = $("vpProgressBar"), progressFill = $("vpProgressFill"), progressHandle = $("vpProgressHandle");
const bufferBar = $("vpBuffer"), progressTooltip = $("vpProgressTooltip");
const currentTimeEl = $("vpCurrentTime"), durationEl = $("vpDuration"), toastEl = $("vpToast");
const liveBadge = $("vpLiveBadge"), vodBadge = $("vpVodBadge");
const speedSelect = $("vpSpeedSelect"), titleEl = $("videoTitleTxt"), metaEl = $("vpMeta");
const videoLoader = $("videoLoader"), loadText = $("loadText");

let hlsInstance = null, hideTimer = null, isDragging = false, isLive = false, lastVolume = 1, errorShown = false, lastTapTime = 0;
const HIDE_TIMEOUT = 3000, DOUBLE_TAP_DELAY = 300, SEEK_OFFSET = 5;

function showToast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(showToast._t); showToast._t = setTimeout(() => toastEl.classList.remove("show"), 1800); }
function showLoader(msg) { if (!videoLoader) return; videoLoader.style.display = "flex"; if (loadText) loadText.textContent = msg || "Loading..."; }
function hideLoader() { if (videoLoader) videoLoader.style.display = "none"; }

let errorBox = null;
function createErrorBox() {
  if (errorBox) return;
  errorBox = document.createElement("div"); errorBox.id = "vpErrorBox";
  errorBox.innerHTML = `<div class="error-backdrop"></div><div class="error-card"><button id="vpErrorClose" class="error-close">✖</button><div class="error-icon-wrap"><div class="error-icon">✕</div></div><h3 id="vpErrorTitle">Video Not Found</h3><p id="vpErrorMsg">Video source not available or expired.</p></div>`;
  (vpRoot || document.body).appendChild(errorBox);
  $("vpErrorClose").onclick = () => errorBox.classList.remove("show");
  errorBox.onclick = (e) => { if (e.target === errorBox || e.target.classList.contains("error-backdrop")) errorBox.classList.remove("show"); };
}
function showError(msg) { createErrorBox(); errorShown = true; hideLoader(); $("vpErrorMsg").textContent = msg || "Video not available"; requestAnimationFrame(() => errorBox.classList.add("show")); }
function hideError() { errorShown = false; if (errorBox) errorBox.classList.remove("show"); }

function formatTime(s) { if (!isFinite(s) || s < 0) return "00:00"; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60); return h > 0 ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

function updatePlayButtons() { const p = video.paused; if (playPauseBtn) playPauseBtn.innerHTML = p ? "▶" : "❚❚"; if (centerPlayBtn) centerPlayBtn.style.display = p ? "flex" : "none"; }
function updateMuteUI() { if (!muteBtn || !volumeSlider) return; const m = video.muted || video.volume === 0; muteBtn.innerHTML = m ? "🔇" : "🔊"; volumeSlider.value = m ? 0 : video.volume; }
function updateTimeUI() { if (currentTimeEl) currentTimeEl.textContent = formatTime(video.currentTime); if (durationEl) durationEl.textContent = (isFinite(video.duration) && video.duration > 0) ? formatTime(video.duration) : "00:00"; }
function updateProgressUI() {
  if (!progressBar || !progressFill || !progressHandle) return;
  const dur = video.duration || 0, cur = video.currentTime || 0, played = dur ? (cur/dur)*100 : 0;
  progressFill.style.transform = `scaleX(${played/100})`; progressHandle.style.left = `${played}%`;
  try { if (video.buffered && video.buffered.length && bufferBar) { const be = video.buffered.end(video.buffered.length-1); const bp = dur ? (be/dur)*100 : 0; bufferBar.style.transform = `scaleX(${bp/100})`; } } catch(e) {}
}
function updateBadges() { isLive = isLive || video.duration === Infinity; if (liveBadge) liveBadge.style.display = isLive ? "inline-flex" : "none"; if (vodBadge) vodBadge.style.display = isLive ? "none" : "inline-flex"; }

function showControls() {
  if (!videoShell) return;
  videoShell.classList.add("user-active");
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
  if (!video.paused) hideTimer = setTimeout(() => videoShell.classList.remove("user-active"), HIDE_TIMEOUT);
}
function hideControls() { if (!videoShell) return; if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } videoShell.classList.remove("user-active"); }

function togglePlay() { if (video.paused) video.play().catch(()=>{}); else video.pause(); }
function seekBy(s) { if (isFinite(video.duration)) video.currentTime = clamp(video.currentTime+s, 0, video.duration); }
function setPlaybackRate(r) { video.playbackRate = Number(r) || 1; showToast(`Speed: ${video.playbackRate}x`); }

function seekFromPointer(cx) {
  if (!progressBar || !isFinite(video.duration)) return;
  const rect = progressBar.getBoundingClientRect(), ratio = clamp((cx-rect.left)/rect.width, 0, 1);
  video.currentTime = ratio * video.duration; updateProgressUI(); updateTimeUI();
}

function toggleMute() { if (video.muted || video.volume === 0) { video.muted = false; video.volume = lastVolume > 0 ? lastVolume : 1; } else { lastVolume = video.volume; video.muted = true; } updateMuteUI(); }
function setVolume(v) { const vol = clamp(Number(v), 0, 1); video.volume = vol; video.muted = vol === 0; if (vol > 0) lastVolume = vol; updateMuteUI(); }

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) { await document.exitFullscreen(); if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); showToast("Fullscreen off"); }
    else { await (vpRoot || document.documentElement).requestFullscreen(); if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(()=>{}); showControls(); showToast("Fullscreen on"); }
  } catch(e) { showToast("Fullscreen error"); }
}
async function togglePip() {
  try { if (!document.pictureInPictureEnabled) { showToast("PiP not supported"); return; } if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await video.requestPictureInPicture(); } catch(e) {}
}

function isHlsSource(src) { return (src||"").toLowerCase().includes(".m3u8"); }

function setupNativeFallback(src) {
  hideError(); hideLoader();
  video.src = src;
  const timeout = setTimeout(() => { if (!video.videoWidth && video.error) showError("Video source not available"); }, 3000);
  video.addEventListener("loadedmetadata", () => { hideLoader(); hideError(); clearTimeout(timeout); updateTimeUI(); updateProgressUI(); updateBadges(); }, { once: true });
  video.addEventListener("loadeddata", () => { hideLoader(); clearTimeout(timeout); }, { once: true });
  video.addEventListener("canplay", () => { hideLoader(); clearTimeout(timeout); if (video.paused) video.play().catch(()=>{}); }, { once: true });
  video.addEventListener("error", () => { hideLoader(); clearTimeout(timeout); if (!errorShown) showError("Video source not available"); }, { once: true });
}

function initHls(src) {
  hideError(); hideLoader();
  if (window.Hls && Hls.isSupported()) {
    hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 90, maxBufferLength: 20, maxMaxBufferLength: 300 });
    hlsInstance.loadSource(src); hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => { hideLoader(); hideError(); updateTimeUI(); updateProgressUI(); updateBadges(); video.play().catch(()=>{}); });
    hlsInstance.on(Hls.Events.ERROR, (e, d) => { if (!d.fatal) return; hideLoader(); if (d.type === Hls.ErrorTypes.NETWORK_ERROR) showError("Network error loading stream"); else showError("Video source not available"); });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
    video.addEventListener("loadedmetadata", () => { hideLoader(); hideError(); updateTimeUI(); updateProgressUI(); updateBadges(); video.play().catch(()=>{}); }, { once: true });
  } else { hideLoader(); showError("HLS not supported"); }
}

async function initPlayer() {
  createErrorBox();
  const params = new URLSearchParams(location.search);
  const src = params.get("file_url") || params.get("url") || params.get("src") || params.get("video_url");
  const title = params.get("title") || "Video";
  if (titleEl) titleEl.textContent = title;
  
  if (!src) { showError("Video source missing"); hideLoader(); return; }
  showLoader("Loading video...");
  
  if (isHlsSource(src)) initHls(src);
  else setupNativeFallback(src);
  
  // Resume
  const vidKey = params.get("video_id") || params.get("id") || src;
  const resumeKey = `gf_resume_${vidKey}`;
  const saved = localStorage.getItem(resumeKey);
  if (saved) { video.addEventListener("loadedmetadata", () => { video.currentTime = parseFloat(saved); }, { once: true }); }
  
  // Progress
  video.addEventListener("timeupdate", () => {
    if (video.duration && (video.currentTime/video.duration) >= 0.75) {
      try { const d = JSON.parse(localStorage.getItem("gf_pw_progress")||"{}"); d[vidKey]="watched"; localStorage.setItem("gf_pw_progress",JSON.stringify(d)); } catch(e) {}
    }
    if (video.currentTime > 5) localStorage.setItem(resumeKey, String(video.currentTime));
  });
  video.addEventListener("ended", () => {
    try { const d = JSON.parse(localStorage.getItem("gf_pw_progress")||"{}"); d[vidKey]="watched"; localStorage.setItem("gf_pw_progress",JSON.stringify(d)); localStorage.removeItem(resumeKey); } catch(e) {}
  });
}

// Events
video.addEventListener("click", (e) => { if (!('ontouchstart' in window)) { e.stopPropagation(); showControls(); } });
video.addEventListener("touchstart", (e) => {
  const now = Date.now();
  if (now - lastTapTime < 300 && lastTapTime > 0) { e.preventDefault(); togglePlay(); lastTapTime = 0; }
  else { lastTapTime = now; showControls(); }
}, { passive: true });

videoShell.addEventListener("mouseenter", showControls);
videoShell.addEventListener("mousemove", showControls);
videoShell.addEventListener("mouseleave", () => { if (!video.paused) { clearTimeout(hideTimer); hideTimer = setTimeout(() => videoShell.classList.remove("user-active"), 1000); } });
vpControls.addEventListener("mouseenter", () => { clearTimeout(hideTimer); videoShell.classList.add("user-active"); });
vpControls.addEventListener("mouseleave", showControls);

if (playPauseBtn) playPauseBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
if (centerPlayBtn) centerPlayBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
if (backwardBtn) backwardBtn.onclick = (e) => { e.stopPropagation(); seekBy(-10); showControls(); };
if (forwardBtn) forwardBtn.onclick = (e) => { e.stopPropagation(); seekBy(10); showControls(); };
if (muteBtn) muteBtn.onclick = (e) => { e.stopPropagation(); toggleMute(); };
if (pipBtn) pipBtn.onclick = (e) => { e.stopPropagation(); togglePip(); };
if (fullscreenBtn) fullscreenBtn.onclick = (e) => { e.stopPropagation(); toggleFullscreen(); };
if (volumeSlider) volumeSlider.addEventListener("input", (e) => { setVolume(e.target.value); });
if (speedSelect) speedSelect.addEventListener("change", (e) => { setPlaybackRate(e.target.value); });

if (progressBar) {
  progressBar.addEventListener("mousedown", (e) => { isDragging = true; seekFromPointer(e.clientX); });
  progressBar.addEventListener("touchstart", (e) => { isDragging = true; seekFromPointer(e.touches[0].clientX); }, { passive: true });
}
document.addEventListener("mousemove", (e) => { if (isDragging) { e.preventDefault(); seekFromPointer(e.clientX); } });
document.addEventListener("touchmove", (e) => { if (isDragging) { e.preventDefault(); if (e.touches[0]) seekFromPointer(e.touches[0].clientX); } }, { passive: false });
document.addEventListener("mouseup", () => { isDragging = false; });
document.addEventListener("touchend", () => { isDragging = false; });

video.addEventListener("play", () => { updatePlayButtons(); showControls(); });
video.addEventListener("pause", updatePlayButtons);
video.addEventListener("timeupdate", () => { updateTimeUI(); updateProgressUI(); });
video.addEventListener("loadedmetadata", () => { updateTimeUI(); updateProgressUI(); updateBadges(); });
video.addEventListener("waiting", () => showLoader("Loading..."));
video.addEventListener("playing", () => { hideLoader(); updatePlayButtons(); hideError(); showControls(); });
video.addEventListener("seeking", () => showLoader("Loading..."));
video.addEventListener("seeked", hideLoader);
video.addEventListener("volumechange", updateMuteUI);
video.addEventListener("progress", updateProgressUI);
video.addEventListener("error", () => { hideLoader(); showError("Video source not available"); });

document.addEventListener("keydown", (e) => {
  if (document.activeElement && ["INPUT","TEXTAREA","SELECT"].includes(document.activeElement.tagName)) return;
  switch (e.key.toLowerCase()) {
    case " ": case "k": e.preventDefault(); togglePlay(); break;
    case "arrowleft": e.preventDefault(); seekBy(-5); break;
    case "arrowright": e.preventDefault(); seekBy(10); break;
    case "m": e.preventDefault(); toggleMute(); break;
    case "f": e.preventDefault(); toggleFullscreen(); break;
    case "p": e.preventDefault(); togglePip(); break;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  createErrorBox();
  try { await loadHlsLibrary(); } catch(e) { console.warn("HLS.js failed:", e); }
  initPlayer();
  updatePlayButtons(); updateMuteUI(); updateTimeUI(); updateProgressUI();
  showControls();
});
