const fs = require('fs');

const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Find the af() function that returns the string array
// It starts right after the tf function definition
const afStart = text.indexOf('function af(){');
if (afStart !== -1) {
  // Find where af returns - look for where the array is returned
  console.log('=== af() function (string array initialization) ===');
  console.log(text.substring(afStart, afStart + 800));
  
  // Find where af() ends - look for return statement with array
  const afEnd = text.indexOf('\n', afStart + 3000);
  if (afEnd !== -1) {
    console.log('\n\n=== af() function (extended) ===');
    console.log(text.substring(afStart, Math.min(text.length, afStart + 5000)));
  }
}

// This is complex - let me try a different approach.
// Extract the actual string array inline at the position where af returns
// af() is supposed to return a string array [str0, str1, ...]
// Let me find where af's return is

// Search for where af body returns an array
console.log('\n\n=== Searching for array return in af() ===');
const afBody = text.substring(afStart, afStart + 8000);
// Look for patterns like return [...] or return [...]
const returnMatch = afBody.match(/return\s*\[[\s\S]{100,30000}?\];/);
if (returnMatch) {
  console.log('Found return array (first 1000 chars):');
  console.log(returnMatch[0].substring(0, 1000));
}
