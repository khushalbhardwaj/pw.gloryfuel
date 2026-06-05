// Let me try to isolate the issue

const fs = require('fs');
const bundle = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_latest.js', 'utf8');
const shuffleCode = bundle.substring(0, 661);

// Extract just the IIFE part
const iife = shuffleCode.substring(28); // Remove "const _0x4d130f=_0x11fd;"
console.log('IIFE length:', iife.length);

// Test simpler versions
function testCompile(label, code) {
  try {
    new Function(code);
    console.log(`${label}: OK`);
  } catch(e) {
    console.log(`${label}: FAIL -`, e.message);
  }
}

testCompile('Empty function', '(function(){})()');
testCompile('With params', '(function(a,b){}(1,2))');

// Try the actual IIFE body with minimal content
const simpleBody = '(function(_0x1263a8,_0x5b983b){var x=1;}(_0x9183,0x9279c))';
testCompile('Simple IIFE with params', simpleBody);

// Try with const declarations like the real code
const constBody = '(function(_0x1263a8,_0x5b983b){const _0x36cd61={_0x24b0b7:0x663f},_0x4b2fab=_0x11fd,_0x138446=_0x1263a8();}(_0x9183,0x9279c))';
testCompile('IIFE with const', constBody);

// Try with while loop
const whileBody = '(function(_0x1263a8,_0x5b983b){const _0x138446=_0x1263a8();while(!![]){try{break;}catch(e){}}(a,b))';
testCompile('IIFE with while+try', whileBody);

// The actual code with try-catch
const actualBody = '(function(_0x1263a8,_0x5b983b){const _0x36cd61={_0x24b0b7:0x663f,_0x4cc9ba:0x7152,_0x558139:0x2260,_0x6ec54c:0x608d},_0x4b2fab=_0x11fd,_0x138446=_0x1263a8();while(!![]){try{const _0x2b4e1d=parseInt(_0x4b2fab(0x7a47))/0x1*(-parseInt(_0x4b2fab(0x7358))/0x2)+parseInt(_0x4b2fab(_0x36cd61._0x24b0b7))/0x3+parseInt(_0x4b2fab(_0x36cd61._0x4cc9ba))/0x4+-parseInt(_0x4b2fab(0x692))/0x5+parseInt(_0x4b2fab(_0x36cd61._0x558139))/0x6+parseInt(_0x4b2fab(0x5d36))/0x7+parseInt(_0x4b2fab(_0x36cd61._0x6ec54c))/0x8;if(_0x2b4e1d===_0x5b983b)break;else _0x138446["push"](_0x138446["shift"]());}catch(_0x176a8b){_0x138446["push"](_0x138446["shift"]());}}}(a,b))';
testCompile('Actual IIFE body', actualBody);
