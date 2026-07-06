const CONFIG = {
  BASE_API: window.location.origin,
  LOGO: "https://i.ibb.co/9Hm0NqsH/f69ed82b-7169-45fc-a82b-915e453c6340.png"
};

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const qp = {
  videoUrl: params.get("video_url") || params.get("file_url") || params.get("url"),
  videoId: params.get("video_id") || params.get("video") || params.get("id"),
  subjectSlug: params.get("subject_slug"),
  batchId: params.get("batch_id"),
  scheduleId: params.get("schedule_id"),
  subjectId: params.get("subject_id"),
  topicSlug: params.get("topicSlug"),
  kid: params.get("kid"),
  otp: params.get("otp"),
  title: params.get("title") || "Video"
};

const video = $("video");
let shakaPlayer = null;
let hlsInstance = null;

function showLoader(msg) {
  const el = $("loader");
  if (el) { el.style.display = "flex"; el.querySelector(".load-text").textContent = msg || "Loading..."; }
}

function hideLoader() {
  const el = $("loader");
  if (el) el.style.display = "none";
}

function showError(title, msg) {
  hideLoader();
  const el = $("errorState");
  if (el) {
    el.classList.add("show");
    if ($("errorTitle")) $("errorTitle").textContent = title || "Video Not Available";
    if ($("errorText")) $("errorText").textContent = msg || "This video is not available right now.";
  }
}

function formatTime(t) {
  t = Number(t || 0);
  if (!isFinite(t)) return "00:00";
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60);
  return h > 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isHls(src) {
  return (src || "").toLowerCase().includes(".m3u8");
}

function isMpd(src) {
  return (src || "").toLowerCase().includes(".mpd");
}

async function loadShaka(url) {
  return new Promise((resolve, reject) => {
    if (!window.shaka) {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/shaka-player@4/dist/shaka-player.compiled.js";
      s.onload = async () => {
        try {
          await initShaka(url);
          resolve();
        } catch (e) { reject(e); }
      };
      s.onerror = () => reject(new Error("Failed to load Shaka Player"));
      document.head.appendChild(s);
    } else {
      initShaka(url).then(resolve).catch(reject);
    }
  });
}

async function initShaka(url) {
  if (!shaka.Player.isBrowserSupported()) throw new Error("Shaka not supported");
  if (shakaPlayer) { try { await shakaPlayer.destroy(); } catch(e) {} }
  shakaPlayer = new shaka.Player();
  await shakaPlayer.attach(video);
  
  shakaPlayer.configure({
    streaming: { lowLatencyMode: true, rebufferingGoal: 2, bufferingGoal: 10 },
    manifest: { retryParameters: { maxAttempts: 5, baseDelay: 1000, backoffFactor: 2, fuzzFactor: 0.5, timeout: 30000 } }
  });
  
  // If we have kid + otp, configure clearkey
  if (qp.kid && qp.otp) {
    shakaPlayer.configure({ drm: { clearKeys: { [qp.kid]: qp.otp } } });
  }
  
  await shakaPlayer.load(url);
  hideLoader();
  video.play().catch(() => {});
}

function loadHls(url) {
  return new Promise((resolve, reject) => {
    if (window.Hls && Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 20 });
      hlsInstance.loadSource(url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => { hideLoader(); video.play().catch(() => {}); resolve(); });
      hlsInstance.on(Hls.Events.ERROR, (e, d) => { if (d.fatal) reject(new Error("HLS error: " + d.type)); });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => { hideLoader(); resolve(); }, { once: true });
    } else {
      reject(new Error("HLS not supported"));
    }
  });
}

async function loadVideo() {
  showLoader("Loading video...");
  
  const url = qp.videoUrl;
  if (!url) {
    showError("No Video URL", "Missing video URL parameter.");
    return;
  }
  
  try {
    if (isMpd(url)) {
      // Ensure Shaka is loaded
      if (!window.shaka) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/shaka-player@4/dist/shaka-player.compiled.js";
          s.onload = resolve;
          s.onerror = () => reject(new Error("Failed to load Shaka"));
          document.head.appendChild(s);
        });
      }
      await initShaka(url);
    } else if (isHls(url)) {
      if (!window.Hls) {
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.7/dist/hls.min.js";
          s.onload = resolve;
          s.onerror = () => reject(new Error("Failed to load HLS.js"));
          document.head.appendChild(s);
        });
      }
      await loadHls(url);
    } else {
      video.src = url;
      video.addEventListener("loadedmetadata", () => hideLoader(), { once: true });
      video.addEventListener("error", () => showError("Video Error", "Failed to load video source."), { once: true });
    }
  } catch (e) {
    showError("Playback Error", e.message || "Failed to load video.");
  }
}

// UI helpers
function togglePlay() {
  if (video.paused) video.play().catch(() => {}); else video.pause();
}

function seekBy(s) { video.currentTime = Math.max(0, Math.min(video.currentTime + s, video.duration || 0)); }

function updatePlayBtn() {
  const btn = $("playBtn");
  if (btn) btn.innerHTML = video.paused ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>` : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>`;
}

function updateProgress() {
  const dur = video.duration || 0, cur = video.currentTime || 0;
  const pct = dur ? (cur / dur) * 100 : 0;
  const el = $("progressPlayed");
  if (el) el.style.width = pct + "%";
  const el2 = $("progressThumb");
  if (el2) el2.style.left = pct + "%";
  const t = $("currentTime");
  if (t) t.textContent = formatTime(cur);
  const d = $("durationTime");
  if (d) d.textContent = formatTime(dur);
}

function bindEvents() {
  const shell = $("player");
  if (shell) {
    shell.addEventListener("click", (e) => {
      if (e.target.closest(".controls") || e.target.closest("button") || e.target.closest(".settings-panel")) return;
      togglePlay();
    });
  }
  
  const playBtn = $("playBtn");
  if (playBtn) playBtn.onclick = (e) => { e.stopPropagation(); togglePlay(); };
  
  const rewindBtn = $("rewindBtn");
  if (rewindBtn) rewindBtn.onclick = (e) => { e.stopPropagation(); seekBy(-10); };
  
  const forwardBtn = $("forwardBtn");
  if (forwardBtn) forwardBtn.onclick = (e) => { e.stopPropagation(); seekBy(10); };
  
  const fullBtn = $("fullscreenBtn");
  if (fullBtn) fullBtn.onclick = async (e) => {
    e.stopPropagation();
    try {
      if (document.fullscreenElement) { await document.exitFullscreen(); }
      else { await document.documentElement.requestFullscreen(); }
    } catch(err) {}
  };
  
  const titleEl = $("videoTitle");
  if (titleEl) titleEl.textContent = qp.title;
  
  video.addEventListener("play", updatePlayBtn);
  video.addEventListener("pause", updatePlayBtn);
  video.addEventListener("timeupdate", updateProgress);
  video.addEventListener("loadedmetadata", updateProgress);
  
  // Resume from localStorage
  const resumeKey = `gf_resume_${qp.videoId || ""}`;
  const savedTime = localStorage.getItem(resumeKey);
  if (savedTime) {
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = parseFloat(savedTime);
    }, { once: true });
  }
  
  // Save progress at 75% and on end
  video.addEventListener("timeupdate", () => {
    if (video.duration && (video.currentTime / video.duration) >= 0.75) {
      try {
        const data = JSON.parse(localStorage.getItem("gf_pw_progress") || "{}");
        if (qp.videoId) { data[qp.videoId] = "watched"; localStorage.setItem("gf_pw_progress", JSON.stringify(data)); }
      } catch(e) {}
    }
  });
  
  video.addEventListener("ended", () => {
    try {
      const data = JSON.parse(localStorage.getItem("gf_pw_progress") || "{}");
      if (qp.videoId) { data[qp.videoId] = "watched"; localStorage.setItem("gf_pw_progress", JSON.stringify(data)); }
      localStorage.removeItem(resumeKey);
    } catch(e) {}
  });
  
  // Save resume position
  video.addEventListener("timeupdate", () => {
    if (video.currentTime > 5) {
      localStorage.setItem(resumeKey, String(video.currentTime));
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadVideo();
});
