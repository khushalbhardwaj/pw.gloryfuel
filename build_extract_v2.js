const fs = require('fs');

// Re-read the original bundle
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');

// Extract the necessary parts
const func11fd = bundle.substring(189108, 189251);
const func9183 = bundle.substring(3814683, 5486199);
const shuffleCode = bundle.substring(0, 661);

// Create a wrapper that avoids any parsing issues
// We wrap everything in a function so all declarations are local
// and there's no issue with top-level const
const wrapperScript = `
(function() {
  "use strict";
  
  ${func11fd}
  
  ${func9183}
  
  ${shuffleCode}
  
  // At this point, array is shuffled and _0x9183() returns the shifted array
  // _0x4d130f is the deobfuscator alias
  // Get the key and IV
  const ivStr = _0x4d130f(0x132);
  const keyStr = _0x4d130f(0x44f4);
  
  console.log('IV:', ivStr);
  console.log('Key:', keyStr);
  
  // Return them for programmatic use
  return { iv: ivStr, key: keyStr };
})();
`;

fs.writeFileSync('E:\\gloryfuel project\\gloryfuel pw\\extract_key_v2.js', wrapperScript);
console.log('Written extract_key_v2.js (' + (wrapperScript.length / 1024 / 1024).toFixed(2) + ' MB)');
