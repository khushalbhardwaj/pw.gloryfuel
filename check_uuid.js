const crypto = require('crypto');
const axios = require('axios');
const KEY = Buffer.alloc(32, 0);
Buffer.from('maggikhalo', 'utf8').copy(KEY);
function decrypt(enc) {
  const p = enc.split(':');
  const nonce = Buffer.from(p[0], 'hex');
  const ct = Buffer.from(p[1], 'hex');
  const tag = ct.subarray(ct.length - 16);
  const data = ct.subarray(0, ct.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, nonce);
  d.setAuthTag(tag);
  return JSON.parse(d.update(data) + d.final('utf8'));
}

async function main() {
  // Working batch (Arjuna NEET 2027)
  const wrkBid = '69897f0ad7c19b7b2f7cc35f';
  const bd = await axios.post('https://learnbyakp.onrender.com/api/pw/batchdetails', { searchParams: { BatchId: wrkBid } }, { timeout: 15000 });
  const batch = decrypt(bd.data.data);
  const sub = batch.data.subjects[3]; // Botany By Vipin Sharma Sir
  console.log('Working batch - Subject:', sub.subject, sub._id, sub.slug);

  const tR = await axios.get('https://learnbyakp.onrender.com/api/pw/topics?BatchId=' + encodeURIComponent(wrkBid) + '&SubjectId=' + encodeURIComponent(sub._id), { timeout: 15000 });
  const topics = decrypt(tR.data.data);
  const cellTopic = (topics.data || []).find(t => t.name.includes('Cell Cycle'));
  if (!cellTopic) { console.log('Topic not found'); return; }
  console.log('Topic:', cellTopic.name, cellTopic.slug);

  const dcR = await axios.get('https://learnbyakp.onrender.com/api/pw/datacontent?batchId=' + encodeURIComponent(wrkBid) + '&subjectSlug=' + encodeURIComponent(sub.slug) + '&topicSlug=' + encodeURIComponent(cellTopic.slug) + '&contentType=videos', { timeout: 15000 });
  const content = decrypt(dcR.data.data);
  const vids = (content.data || []).filter(v => v.urlType === 'penpencilvdo');
  if (!vids.length) { console.log('No penpencilvdo videos found'); return; }

  const v = vids[0];
  const childId = v.videoDetails?.findKey || v._id;
  console.log('Video:', v.topic);
  console.log('_id:', v._id);
  console.log('findKey:', v.videoDetails?.findKey);
  console.log('childId used:', childId);
  
  // Get the MPD URL from video-url-details
  const vR = await axios.get('https://learnbyakp.onrender.com/api/pw/video-url-details?batchId=' + encodeURIComponent(wrkBid) + '&childId=' + encodeURIComponent(childId) + '&subjectId=' + encodeURIComponent(sub._id), { timeout: 15000 });
  const mpdUrl = vR.data?.data?.[0]?.url || '';
  console.log('MPD URL:', mpdUrl.substring(0, 150));
  
  // Extract UUID from MPD URL
  const uuidMatch = mpdUrl.match(/pw\.live\/([^\/]+)\//);
  if (uuidMatch) console.log('UUID from MPD:', uuidMatch[1]);
  
  // Check if UUID matches any field
  console.log('\nAny relationship?');
  console.log('v._id:', v._id);
  console.log('findKey:', v.videoDetails?.findKey);
  console.log('videoDetails._id:', v.videoDetails?._id);
  console.log('videoDetails.id:', v.videoDetails?.id);
  console.log('videoDetails.video_id:', v.videoDetails?.video_id);

  // Now try the SAME check for the non-working batch
  console.log('\n\n--- Non-working batch ---');
  const badBid = '6956255ad2a5c8571815029a';
  const bd2 = await axios.post('https://learnbyakp.onrender.com/api/pw/batchdetails', { searchParams: { BatchId: badBid } }, { timeout: 15000 });
  const batch2 = decrypt(bd2.data.data);
  const sci = batch2.data.subjects.find(s => s.subject === 'Science');
  console.log('Subject:', sci.subject, sci._id, sci.slug);
  
  const tR2 = await axios.get('https://learnbyakp.onrender.com/api/pw/topics?BatchId=' + encodeURIComponent(badBid) + '&SubjectId=' + encodeURIComponent(sci._id), { timeout: 15000 });
  const topics2 = decrypt(tR2.data.data);
  const t2 = (topics2.data || []).find(t => t.videos > 0 || t.lectureVideos > 0);
  console.log('Topic:', t2.name, t2.slug);
  
  const dcR2 = await axios.get('https://learnbyakp.onrender.com/api/pw/datacontent?batchId=' + encodeURIComponent(badBid) + '&subjectSlug=' + encodeURIComponent(sci.slug) + '&topicSlug=' + encodeURIComponent(t2.slug) + '&contentType=videos', { timeout: 15000 });
  const content2 = decrypt(dcR2.data.data);
  const v2 = (content2.data || []).find(v => v.urlType === 'penpencilvdo') || content2.data?.[0];
  
  console.log('Video:', v2.topic);
  console.log('_id:', v2._id);
  console.log('findKey:', v2.videoDetails?.findKey);
  console.log('videoDetails._id:', v2.videoDetails?._id);
  console.log('videoDetails.id:', v2.videoDetails?.id);
  console.log('videoDetails.video_id:', v2.videoDetails?.video_id);
  console.log('videoDetails.vimeoId:', v2.videoDetails?.vimeoId);
  
  // Try constructing MPD URL from known patterns
  const idsToTry = [v2._id, v2.videoDetails?.findKey, v2.videoDetails?._id, v2.videoDetails?.id, v2.videoDetails?.video_id];
  for (const id of idsToTry) {
    if (id) {
      // Try as UUID format
      console.log('\nTrying ID:', id);
      const dashUrl = 'https://sec-prod-mediacdn.pw.live/' + id + '/dash/240/init.mp4';
      const mpdUrl2 = 'https://sec-prod-mediacdn.pw.live/' + id + '/master.mpd';
      try {
        const r = await axios.get(dashUrl + '?foo=bar', { timeout: 5000, validateStatus: () => true });
        console.log('  dash/240:', r.status, r.status === 200 ? 'WORKS!' : 'no');
        if (r.status === 200) break;
      } catch(e) {}
      try {
        const r = await axios.get(mpdUrl2 + '?foo=bar', { timeout: 5000, validateStatus: () => true });
        console.log('  master.mpd:', r.status, r.status === 200 ? 'WORKS!' : 'no');
        if (r.status === 200) break;
      } catch(e) {}
    }
  }
}
main();
