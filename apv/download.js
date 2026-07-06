var API_BASE = window.location.origin;
var state = { masterUrl: "", urlPrefix: "", key: "", qualities: [], selectedQuality: null, segments: [], estimatedBytes: 0, downloadedBytes: 0, running: false, paused: false, stopped: false };
var els = {};
["masterUrl","urlPrefix","keyInput","fetchPlaylist","loadSegments","downloadMp4","runningActions","pauseDownload","stopDownload","progressBar","statusText","qualityCount","segmentCount","estimatedSize","downloadedSize","qualitySection","qualityList","logList"].forEach(function(id) { els[id] = document.getElementById(id); });

function log(msg, type) {
  var line = document.createElement("div"); var time = new Date().toLocaleTimeString();
  line.className = "log-line " + (type||"info");
  line.innerHTML = "<span></span><span></span>";
  line.children[0].textContent = "["+time+"]"; line.children[1].textContent = msg;
  els.logList.appendChild(line); els.logList.parentElement.scrollTop = els.logList.parentElement.scrollHeight;
}
function mb(b) { return (b/1048576).toFixed(2)+" MB"; }
function setProgress(v, t) { els.progressBar.style.width = Math.max(0,Math.min(100,v||0))+"%"; els.statusText.textContent = t||"Ready"; }
function updateStats() { els.qualityCount.textContent = state.qualities.length; els.segmentCount.textContent = state.segments.length; els.estimatedSize.textContent = state.estimatedBytes ? mb(state.estimatedBytes) : "N/A"; els.downloadedSize.textContent = mb(state.downloadedBytes); }
function showAction(a) { els.fetchPlaylist.hidden = a !== "fetch"; els.loadSegments.hidden = a !== "segments"; els.downloadMp4.hidden = a !== "download"; els.runningActions.hidden = a !== "running"; }
function buildUrl(p, b) { try { var u = new URL(p, b); u.search = state.urlPrefix; return u.href; } catch(e) { return ""; } }
function hexToBuffer(hex) { var bytes = new Uint8Array(hex.length/2); for (var i=0; i<hex.length; i+=2) bytes[i/2] = parseInt(hex.slice(i,i+2), 16); return bytes.buffer; }
async function decryptSegment(buffer, keyHex) { var key = await crypto.subtle.importKey("raw", hexToBuffer(keyHex), {name:"AES-CBC"}, false, ["decrypt"]); var iv = new Uint8Array(16); return new Uint8Array(await crypto.subtle.decrypt({name:"AES-CBC",iv:iv}, key, buffer)); }
function renderQualities() { els.qualityList.innerHTML = ""; state.qualities.forEach(function(q,i) { var b = document.createElement("button"); b.type="button"; b.className="quality-item"+(q.selected?" active":""); b.innerHTML="<span></span><strong></strong>"; b.children[0].textContent=q.name; b.children[1].textContent=q.selected?"Selected":""; b.onclick=function(){ selectQuality(i); }; els.qualityList.appendChild(b); }); els.qualitySection.hidden = state.qualities.length===0; }
function selectQuality(idx) { state.qualities = state.qualities.map(function(q,i){q.selected=i===idx;return q;}); state.selectedQuality=state.qualities[idx]; state.segments=[]; state.estimatedBytes=0; state.downloadedBytes=0; renderQualities(); updateStats(); log("Selected: "+state.selectedQuality.name); showAction("segments"); }
async function fetchPlaylist() {
  state.masterUrl = els.masterUrl.value.trim(); state.urlPrefix = els.urlPrefix.value.trim(); state.key = els.keyInput.value.trim();
  if (!state.masterUrl) { log("Enter master URL","error"); return; }
  log("Fetching master..."); setProgress(20,"Fetching...");
  try { var url=state.masterUrl+state.urlPrefix; var r=await fetch(url); if(!r.ok)throw new Error("HTTP "+r.status); var t=await r.text(); setProgress(40,"Parsing...");
    var lines=t.split("\n"), qualities=[];
    for(var i=0;i<lines.length;i++){if(lines[i].startsWith("#EXT-X-STREAM-INF:")){var res=(lines[i].match(/RESOLUTION=(\d+x\d+)/)||[])[1]||"";var name=res?res.split("x")[1]+"p":"Unknown";var path=(lines[i+1]||"").trim();if(path)qualities.push({name:name,resolution:res,path:path,url:buildUrl(path,url),selected:false});}}
    if(!qualities.length)throw new Error("No qualities"); state.qualities=qualities; log("Found "+qualities.length+" qualities"); selectQuality(0); setProgress(80,"Ready");
  } catch(e) { log("Error: "+e.message,"error"); setProgress(0,"Failed"); }
}
async function loadSegments() {
  if(!state.selectedQuality){log("No quality selected","error");return;}
  log("Loading segments..."); setProgress(10,"Fetching playlist...");
  try { var r=await fetch(state.selectedQuality.url); if(!r.ok)throw new Error("HTTP "+r.status); var t=await r.text(); setProgress(30,"Parsing...");
    state.segments = t.split("\n").filter(function(l){l=l.trim();return l&&!l.startsWith("#")&&l.endsWith(".ts");}).map(function(l,i){return{index:i+1,name:"segment_"+String(i+1).padStart(3,"0")+".ts",url:buildUrl(l.trim(),state.selectedQuality.url)};});
    if(!state.segments.length)throw new Error("No segments"); var first=await fetch(state.segments[0].url); var firstSize=(await first.arrayBuffer()).byteLength;
    state.estimatedBytes=firstSize*state.segments.length; updateStats(); log("Found "+state.segments.length+" segments"); setProgress(100,"Ready"); showAction("download");
  } catch(e) { log("Error: "+e.message,"error"); setProgress(0,"Failed"); }
}
async function downloadMp4() {
  if(!state.segments.length||!state.key){log("No segments or key","error");return;}
  state.running=true; state.paused=false; state.stopped=false; state.downloadedBytes=0; showAction("running"); updateStats();
  var parts=new Array(state.segments.length), downloaded=0;
  try { for(var i=0;i<state.segments.length;i++){while(state.paused&&!state.stopped)await new Promise(function(r){setTimeout(r,350);}); if(state.stopped)return;
    var seg=state.segments[i], r=await fetch(seg.url); if(!r.ok)throw new Error("HTTP "+r.status); var enc=await r.arrayBuffer(); var dec=await decryptSegment(enc,state.key);
    parts[i]=dec; state.downloadedBytes+=dec.length; downloaded++; updateStats(); setProgress(downloaded/state.segments.length*100,"Downloaded "+downloaded+"/"+state.segments.length);
  } var total=parts.reduce(function(s,p){return s+p.length;},0); var merged=new Uint8Array(total); var offset=0; parts.forEach(function(p){merged.set(p,offset);offset+=p.length;});
    log("Combined: "+mb(total),"success"); var blob=new Blob([merged],{type:"video/mp4"}); var link=document.createElement("a"); link.href=URL.createObjectURL(blob); link.download="video.mp4"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href); setProgress(100,"Complete!");
  } catch(e) { log("Failed: "+e.message,"error"); setProgress(0,"Failed"); }
  finally { state.running=false; state.paused=false; showAction("download"); els.pauseDownload.textContent="Pause"; }
}
els.fetchPlaylist.onclick=fetchPlaylist; els.loadSegments.onclick=loadSegments; els.downloadMp4.onclick=downloadMp4;
els.pauseDownload.onclick=function(){state.paused=!state.paused;els.pauseDownload.textContent=state.paused?"Resume":"Pause";log(state.paused?"Paused.":"Resumed.","warning");};
els.stopDownload.onclick=function(){state.stopped=true;state.running=false;state.paused=false;log("Stopped.","warning");setProgress(0,"Stopped");showAction("download");};
log("Ready"); (async function(){var p=new URLSearchParams(location.search),eu=p.get("url");if(!eu)return;var d=decodeURIComponent(eu);var parts=d.split("?");els.masterUrl.value=parts[0];els.urlPrefix.value=parts[1]?"?"+parts.slice(1).join("?"):"";})();
