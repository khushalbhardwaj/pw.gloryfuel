const bundle = require('fs').readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Find uZodO position and show broader context
const uZodOPos = bundle.indexOf("'uZodO'");
if (uZodOPos > 0) {
  const start = Math.max(0, uZodOPos - 2000);
  const end = Math.min(bundle.length, uZodOPos + 500);
  const ctx = bundle.substring(start, end);
  console.log('=== Broad context around uZodO ===');
  console.log(ctx);
}
