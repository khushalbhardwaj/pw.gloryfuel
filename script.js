// PiMaxer API integration for GloryFuel PW
// Replaces Delta Study / Vidcloud proxy approaches

async function getPimaxerUrl(batchId, childId) {
  const url = `https://api.pimaxer.in/v1/videos/video-url-details?parentId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(childId)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PiMaxer API error: ${res.status}`);
  const data = await res.json();
  if (!data.success || !data.data) throw new Error('PiMaxer API unsuccessful');
  const { url: mpdUrl, drmDetails } = data.data;
  const hlsUrl = mpdUrl.replace(/\.mpd$/, '.m3u8');
  return { mpdUrl, hlsUrl, kid: null, key: null };
}

function openPlayer(batchId, childId) {
  const base = window.location.origin + '/player.html';
  window.open(`${base}?batchId=${encodeURIComponent(batchId)}&childId=${encodeURIComponent(childId)}`, '_blank');
}

// Example usage:
// await getPimaxerUrl('67a2fa1daa42be00186a95c1', '67b3c9e30b847c0018687af1');
// openPlayer('67a2fa1daa42be00186a95c1', '67b3c9e30b847c0018687af1');
