const fs = require('fs');
const bundlePath = 'E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js';
const bundle = fs.readFileSync(bundlePath, 'utf8');
const len = bundle.length;

// Find the string array definition and deobfuscator
function findPattern(regex, name) {
  const match = bundle.match(regex);
  if (match) {
    console.log(`\n=== ${name} ===`);
    console.log('Full match length:', match[0].length);
    console.log('Start:', match.index, 'End:', match.index + match[0].length);
    // Show first 200 chars
    console.log('Preview:', match[0].substring(0, 200));
  } else {
    console.log(`\n${name}: NOT FOUND`);
  }
  return match;
}

// Search for the string array (typically var _0xXXXX = [...] or const _0xXXXX = [...])
const arrMatch = bundle.match(/(?:var|const|let)\s+(_0x[0-9a-f]+)\s*=\s*\[/);
findPattern(/(?:var|const|let)\s+_0x[0-9a-f]+\s*=\s*\[/, "String array definition");

// Find _0x11fd definition
findPattern(/(?:var|const|let)\s+_0x11fd\s*=/, "_0x11fd definition");

// Find the deobfuscator pattern (typically function that takes a number and returns a string)
findPattern(/(?:var|const|let)\s+_0x[0-9a-f]+\s*=\s*function\s*\(_0x[0-9a-f]+\)\s*\{[^}]+(?:parseInt|indexOf|length)[^}]{10,300}\}/, "Deobfuscator function");

// Search for all _0x variable definitions in first 5000 chars
console.log('\n=== First 3000 chars of bundle ===');
console.log(bundle.substring(0, 3000));

// Find where the string array literal ends (find matching brackets)
const arrStart = bundle.indexOf('=[');
if (arrStart > 0 && arrStart < 5000) {
  let depth = 0;
  let inString = false;
  let escape = false;
  let arrEnd = -1;
  for (let i = bundle.indexOf('[', arrStart); i < Math.min(bundle.length, arrStart + 500000); i++) {
    const ch = bundle[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {
      if (!inString) inString = ch;
      else if (inString === ch) inString = false;
      continue;
    }
    if (!inString) {
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) { arrEnd = i; break; }
      }
    }
  }
  if (arrEnd > 0) {
    console.log(`\nArray literal: ${arrStart} to ${arrEnd} (${arrEnd - arrStart + 1} chars)`);
    // Count how many strings are in the array
    const arrContent = bundle.substring(bundle.indexOf('[', arrStart), arrEnd + 1);
    const strCount = (arrContent.match(/,"/g) || []).length + (arrContent.match(/"([^"]*)"/g) || []).length;
    console.log(`Approx string count: ${strCount}`);
  }
}
