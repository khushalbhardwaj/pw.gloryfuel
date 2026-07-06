const API_SERVER = window.location.origin;
const urlParams = new URLSearchParams(location.search);
const courseId = urlParams.get('course_id'), videoId = urlParams.get('video_id'), isLive = urlParams.get('isLive')==='true';
const directUrl = urlParams.get('file_url') || urlParams.get('url') || urlParams.get('src');
const title = urlParams.get('title') || 'Video';

const $ = id => document.getElementById(id);
const video = $('video'), vpRoot = $('vpRoot'), vpVideoShell = $('vpVideoShell'), vpControls = $('vpControls');
const vpLoading = $('vpLoading'), vpErrorOverlay = $('vpErrorOverlay'), vpErrorMsg = $('vpErrorMsg'), vpRetryBtn = $('vpRetryBtn');
const vpQualityModal = $('vpQualityModal'), vpQualityList = $('vpQualityList'), vpCloseQuality = $('vpCloseQuality');
const videoTitleTxt = $('videoTitleTxt'), vpMeta = $('vpMeta'), vpLiveBadge = $('vpLiveBadge'), vpVodBadge = $('vpVodBadge');
const centerPlayBtn = $('centerPlayBtn'), backwardBtn = $('backwardBtn'), playPauseBtn = $('playPauseBtn'), forwardBtn = $('forwardBtn');
const muteBtn = $('muteBtn'), volumeSlider = $('volumeSlider'), vpSpeedSelect = $('vpSpeedSelect'), fullscreenBtn = $('fullscreenBtn'), pipBtn = $('pipBtn');
const moreBtn = $('moreBtn'), moreMenu = $('moreMenu'), vpToast = $('vpToast');
const vpProgressBar = $('vpProgressBar'), vpProgressFill = $('vpProgressFill'), vpBuffer = $('vpBuffer'), vpProgressHandle = $('vpProgressHandle');
const vpProgressTooltip = $('vpProgressTooltip'), vpCurrentTime = $('vpCurrentTime'), vpDuration = $('vpDuration');

let hls = null, isScrubbing = false, controlsTimeout;

function showControls(){vpVideoShell.classList.add('user-active');clearTimeout(controlsTimeout);if(!video.paused&&!moreMenu.classList.contains('open'))controlsTimeout=setTimeout(hideControls,4000);}
function hideControls(){if(video.paused||moreMenu.classList.contains('open'))return;vpVideoShell.classList.remove('user-active');}
vpVideoShell.addEventListener('mousemove',showControls); vpVideoShell.addEventListener('mouseenter',showControls);
vpVideoShell.addEventListener('mouseleave',()=>{if(!video.paused){clearTimeout(controlsTimeout);controlsTimeout=setTimeout(hideControls,1000);}});
vpControls.addEventListener('mousemove',(e)=>{e.stopPropagation();vpVideoShell.classList.add('user-active');clearTimeout(controlsTimeout);});

let isTouch = false; window.addEventListener('touchstart',()=>{isTouch=true;},{once:true});
video.addEventListener('click',(e)=>{if(!isTouch){e.preventDefault();e.stopPropagation();if(vpVideoShell.classList.contains('user-active'))hideControls();else showControls();}});
let lastTap=0; video.addEventListener('touchstart',(e)=>{const n=Date.now();if(n-lastTap<300&&n>0){if(video.paused)video.play().catch(()=>{});else video.pause();lastTap=0;}else{if(vpVideoShell.classList.contains('user-active'))hideControls();else showControls();lastTap=n;}},{passive:true});

document.addEventListener('keydown',(e)=>{if(['SELECT','INPUT'].includes(document.activeElement.tagName))return;
switch(e.code){case'Space':case'KeyK':e.preventDefault();showControls();if(video.paused)video.play();else video.pause();break;
case'ArrowRight':case'KeyL':e.preventDefault();showControls();video.currentTime=Math.min(video.duration||0,video.currentTime+10);break;
case'ArrowLeft':case'KeyJ':e.preventDefault();showControls();video.currentTime=Math.max(0,video.currentTime-10);break;
case'KeyM':e.preventDefault();showControls();video.muted=!video.muted;break;
case'KeyF':e.preventDefault();showControls();toggleFullscreen();break;}});

function showLoading(s){vpLoading.style.display=s?'flex':'none';}
function showError(m){vpErrorMsg.textContent=m;vpErrorOverlay.style.display='flex';}
function hideError(){vpErrorOverlay.style.display='none';}
function showToast(m){vpToast.textContent=m;vpToast.classList.add('show');setTimeout(()=>vpToast.classList.remove('show'),2000);}
function destroyHls(){if(hls){hls.destroy();hls=null;}}
function loadFileSource(url){showLoading(true);hideError();destroyHls();video.pause();video.removeAttribute('src');video.load();video.src=url;video.muted=false;video.playsInline=true;video.addEventListener('loadedmetadata',async()=>{showLoading(false);try{await video.play();}catch(e){}},{once:true});video.addEventListener('error',()=>{showLoading(false);showError('Video load error');},{once:true});}
function loadHlsSource(url){showLoading(true);hideError();destroyHls();video.pause();video.removeAttribute('src');video.load();if(Hls.isSupported()){hls=new Hls({enableWorker:true,lowLatencyMode:false});hls.attachMedia(video);hls.on(Hls.Events.MEDIA_ATTACHED,()=>{hls.loadSource(url);});hls.on(Hls.Events.MANIFEST_PARSED,async()=>{showLoading(false);try{await video.play();}catch(e){}});hls.on(Hls.Events.ERROR,(e,d)=>{if(d.fatal){showLoading(false);showError("Playback failed");}});}else if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;video.addEventListener('loadedmetadata',async()=>{showLoading(false);try{await video.play();}catch(e){}},{once:true});}else{showLoading(false);showError('HLS not supported');}}

function formatTime(sec){if(isNaN(sec))return"00:00";sec=Math.floor(sec);var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}
function updatePlayState(){if(video.paused){playPauseBtn.textContent='▶';centerPlayBtn.style.display='block';vpVideoShell.classList.add('paused');}else{playPauseBtn.textContent='⏸';centerPlayBtn.style.display='none';vpVideoShell.classList.remove('paused');}}
playPauseBtn.onclick=async()=>{if(video.paused){try{await video.play();}catch(e){}}else video.pause();updatePlayState();};
centerPlayBtn.onclick=async()=>{if(video.paused){try{await video.play();}catch(e){}}else video.pause();updatePlayState();};
backwardBtn.onclick=()=>{video.currentTime=Math.max(0,video.currentTime-10);showControls();};
forwardBtn.onclick=()=>{video.currentTime=Math.min(video.duration||Infinity,video.currentTime+10);showControls();};
muteBtn.onclick=()=>{video.muted=!video.muted;muteBtn.textContent=video.muted?'🔇':'🔊';volumeSlider.value=video.muted?0:video.volume;};
volumeSlider.oninput=function(){var v=parseFloat(this.value);video.volume=v;video.muted=v===0;muteBtn.textContent=video.muted?'🔇':'🔊';};
vpSpeedSelect.onchange=function(){video.playbackRate=parseFloat(this.value);};
async function toggleFullscreen(){try{if(document.fullscreenElement){await document.exitFullscreen();if(screen.orientation&&screen.orientation.unlock)screen.orientation.unlock();vpRoot.classList.remove("force-landscape");showToast("Fullscreen off");}else{await vpRoot.requestFullscreen();if(screen.orientation&&screen.orientation.lock)screen.orientation.lock("landscape").catch(()=>{vpRoot.classList.add("force-landscape");});vpRoot.classList.add("force-landscape");showControls();showToast("Fullscreen on");}}catch(e){showToast("Fullscreen error");}}
fullscreenBtn.onclick=toggleFullscreen;
pipBtn.onclick=async()=>{try{if(document.pictureInPictureElement)await document.exitPictureInPicture();else if(document.pictureInPictureEnabled)await video.requestPictureInPicture();else showToast("PiP not supported");}catch(e){}};

video.addEventListener('waiting',()=>showLoading(true)); video.addEventListener('stalled',()=>showLoading(true)); video.addEventListener('seeking',()=>showLoading(true));
video.addEventListener('playing',()=>showLoading(false)); video.addEventListener('canplay',()=>showLoading(false)); video.addEventListener('seeked',()=>showLoading(false));
video.addEventListener('play',()=>{updatePlayState();showControls();}); video.addEventListener('pause',()=>{updatePlayState();showControls();});
video.addEventListener('loadedmetadata',()=>{vpDuration.textContent=formatTime(video.duration);});
video.addEventListener('timeupdate',()=>{if(!isScrubbing){var cur=video.currentTime||0,dur=video.duration||0;vpCurrentTime.textContent=formatTime(cur);vpDuration.textContent=dur?formatTime(dur):'00:00';if(dur>0){var p=(cur/dur)*100;vpProgressFill.style.width=p+'%';vpProgressHandle.style.left=p+'%';}}var b=video.buffered;if(b.length){var end=b.end(b.length-1),dur=video.duration||0;if(dur>0)vpBuffer.style.width=(end/dur*100)+'%';}});

function updateScrub(e){var cx=e.clientX||(e.touches&&e.touches[0]&&e.touches[0].clientX);if(!cx&&e.changedTouches)cx=e.changedTouches[0].clientX;if(!cx)return 0;
var rect=vpProgressBar.getBoundingClientRect(),pos=Math.min(Math.max(cx-rect.left,0),rect.width),ratio=rect.width?pos/rect.width:0,dur=video.duration||0,time=ratio*dur;
vpProgressFill.style.width=(ratio*100)+'%';vpProgressHandle.style.left=(ratio*100)+'%';vpProgressTooltip.style.left=(ratio*100)+'%';vpProgressTooltip.textContent=formatTime(time);vpCurrentTime.textContent=formatTime(time);return time;}
vpProgressBar.addEventListener('mousemove',(e)=>{if(!video.duration)return;var rect=vpProgressBar.getBoundingClientRect(),pos=Math.min(Math.max(e.clientX-rect.left,0),rect.width),ratio=rect.width?pos/rect.width:0;vpProgressTooltip.style.left=(ratio*100)+'%';vpProgressTooltip.textContent=formatTime(ratio*video.duration);vpProgressTooltip.classList.add('show');});
vpProgressBar.addEventListener('mouseleave',()=>{if(!isScrubbing)vpProgressTooltip.classList.remove('show');});
vpProgressBar.addEventListener('mousedown',(e)=>{if(!video.duration)return;isScrubbing=true;vpProgressTooltip.classList.add('show');var t=updateScrub(e);video.pause();var m=(ev)=>updateScrub(ev);var u=(ev)=>{document.removeEventListener('mousemove',m);document.removeEventListener('mouseup',u);video.currentTime=updateScrub(ev);isScrubbing=false;vpProgressTooltip.classList.remove('show');video.play().catch(()=>{});};document.addEventListener('mousemove',m);document.addEventListener('mouseup',u);});
vpProgressBar.addEventListener('touchstart',(e)=>{if(!video.duration)return;isScrubbing=true;vpProgressTooltip.classList.add('show');updateScrub(e);video.pause();var m=(ev)=>updateScrub(ev);var ed=(ev)=>{document.removeEventListener('touchmove',m);document.removeEventListener('touchend',ed);video.currentTime=updateScrub(ev);isScrubbing=false;vpProgressTooltip.classList.remove('show');video.play().catch(()=>{});};document.addEventListener('touchmove',m,{passive:false});document.addEventListener('touchend',ed);},{passive:true});

vpCloseQuality.onclick=()=>{vpQualityModal.classList.remove('open');}; vpRetryBtn.onclick=()=>{hideError();initPlayer();};
moreBtn.onclick=(e)=>{e.stopPropagation();moreMenu.classList.toggle('open');showControls();};
moreMenu.onclick=(e)=>{e.stopPropagation();}; document.onclick=(e)=>{if(!moreMenu.contains(e.target)&&e.target!==moreBtn)moreMenu.classList.remove('open');};

// Resume + Progress
function initPlayer(){
  if (titleEl) videoTitleTxt.textContent = title;
  if (directUrl) {
    if (directUrl.includes('.m3u8')) loadHlsSource(directUrl);
    else loadFileSource(directUrl);
  } else if (courseId && videoId) {
    // fetch from API
    showLoading(true);
    fetch(API_SERVER+'/api/pw/video-url?batchId='+encodeURIComponent(courseId)+'&childId='+encodeURIComponent(videoId))
      .then(r=>r.json()).then(d=>{
        if(d.success&&d.url){if(d.url.includes('.m3u8'))loadHlsSource(d.url);else loadFileSource(d.url);}
        else showError('Video not available on this server');
      }).catch(e=>showError('Failed to load'));
  } else showError('No video source');
  
  var vk = videoId || courseId || directUrl || '';
  var rk = 'gf_resume_'+vk;
  var st = localStorage.getItem(rk);
  if(st) video.addEventListener('loadedmetadata',function(){video.currentTime=parseFloat(st);},{once:true});
  video.addEventListener('timeupdate',function(){if(video.duration&&(video.currentTime/video.duration)>=0.75){try{var d=JSON.parse(localStorage.getItem('gf_pw_progress')||'{}');d[vk]='watched';localStorage.setItem('gf_pw_progress',JSON.stringify(d));}catch(e){}}if(video.currentTime>5)localStorage.setItem(rk,String(video.currentTime));});
  video.addEventListener('ended',function(){try{var d=JSON.parse(localStorage.getItem('gf_pw_progress')||'{}');d[vk]='watched';localStorage.setItem('gf_pw_progress',JSON.stringify(d));localStorage.removeItem(rk);}catch(e){}});
}

document.addEventListener('DOMContentLoaded', initPlayer);
