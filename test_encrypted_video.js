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
  const bid = '6956255ad2a5c8571815029a';
  
  // Get first video with penpencilvdo urlType
  const bd = await axios.post('https://learnbyakp.onrender.com/api/pw/batchdetails', { searchParams: { BatchId: bid } }, { timeout: 15000 });
  const batch = decrypt(bd.data.data);
  const sci = batch.data.subjects.find(s => s.subject === 'Science');
  
  const tR = await axios.get('https://learnbyakp.onrender.com/api/pw/topics?BatchId=' + encodeURIComponent(bid) + '&SubjectId=' + encodeURIComponent(sci._id), { timeout: 15000 });
  const topics = decrypt(tR.data.data);
  const firstTopic = (topics.data || []).find(t => t.videos > 0 || t.lectureVideos > 0);
  
  const dcR = await axios.get('https://learnbyakp.onrender.com/api/pw/datacontent?batchId=' + encodeURIComponent(bid) + '&subjectSlug=' + encodeURIComponent(sci.slug) + '&topicSlug=' + encodeURIComponent(firstTopic.slug) + '&contentType=videos', { timeout: 15000 });
  const content = decrypt(dcR.data.data);
  const v = (content.data || []).find(v => v.urlType === 'penpencilvdo') || content.data?.[0];
  const childId = v.videoDetails?.findKey || v._id;
  
  console.log('Video:', v.topic);
  console.log('urlType:', v.urlType);
  console.log('childId:', childId);
  console.log('subjectId:', sci._id);
  console.log('subjectSlug:', sci.slug);

  // Try the ENCRYPTED fallback endpoint (/api/pw/video) via ALL proxy sources
  for (const src of [
    { name: 'LAK', base: 'https://learnbyakp.onrender.com' },
    { name: 'DS', base: 'https://apiserver.deltastudy.site' },
    { name: 'DSalt', base: 'https://deltastudy.site' },
  ]) {
    try {
      // Encrypted endpoint uses GET with batchId, subjectId (slug), childId
      const url = src.base + '/api/pw/video?batchId=' + encodeURIComponent(bid) + '&subjectId=' + encodeURIComponent(sci.slug) + '&childId=' + encodeURIComponent(childId);
      console.log('\n' + src.name + ': trying encrypted /api/pw/video');
      const r = await axios.get(url, { timeout: 20000, validateStatus: () => true });
      console.log('  status:', r.status);
      
      let data = r.data;
      if (typeof r.data?.data === 'string') {
        try { data = decrypt(r.data.data); console.log('  decrypted success:', data.success); } catch(e) { console.log('  decrypt failed'); }
      }
      
      if (data.success && data.data?.url) {
        console.log('  URL:', (data.data.url || '').substring(0, 100));
      }
      console.log('  response:', JSON.stringify(data).substring(0, 300));
    } catch(e) {
      console.log(src.name + ': ERR ' + (e.message || '').substring(0, 60));
    }
  }
}
main();
