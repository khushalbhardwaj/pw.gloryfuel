const a = require('axios');
const c = require('crypto');
(async () => {
  try {
    const r = await a.get('https://learnbyakp.onrender.com/api/pw/video?batchId=6984a17d4520f144c34e3745&subjectId=notices-485697&childId=69dbb85797f3cc9b5b61af5c', { timeout: 15000, validateStatus: () => true });
    console.log('Status:', r.status);
    if (r.data && r.data.data && r.data.data.includes(':')) {
      const p = r.data.data.split(':');
      const kb = Buffer.alloc(32, 0);
      Buffer.from('maggikhalo', 'utf8').copy(kb);
      const iv = Buffer.from(p[0], 'hex');
      const cb = Buffer.from(p[1], 'hex');
      const tag = cb.slice(-16);
      const ct = cb.slice(0, -16);
      const d = c.createDecipheriv('aes-256-gcm', kb, iv);
      d.setAuthTag(tag);
      const dec = Buffer.concat([d.update(ct), d.final()]).toString();
      console.log('DECRYPTED:', JSON.stringify(JSON.parse(dec)).substring(0, 500));
    } else {
      console.log('Response:', JSON.stringify(r.data).substring(0, 500));
    }
  } catch (e) {
    console.log('Error:', e.message);
  }
})();
