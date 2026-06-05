const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\extract_key.js', 'utf8');

try {
  // Search for the problematic area
  // Check how the function ends
  const funcEnd = code.indexOf('return _0x9183();}');
  console.log('Found return _0x9183();} at', funcEnd);
  
  const afterFunc = code.substring(funcEnd, funcEnd + 100);
  console.log('After function end:', JSON.stringify(afterFunc));
  
  // Check how many characters after the function end
  const beforeConst = code.substring(funcEnd, code.indexOf('const ivHex'));
  console.log('Between function end and const ivHex:', 
    JSON.stringify(beforeConst.substring(0, 200)));
  
  // Try to compile with vm
  const script = new vm.Script(code, { filename: 'extract_key.js' });
  console.log('\nScript compiles OK with vm.Script!');
} catch (e) {
  console.log('\nSyntax error:', e.message);
  
  // Show context around the error location
  const msg = e.message;
  const lineMatch = msg.match(/line (\d+)/);
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1]);
    console.log(`Error at line ${lineNum}`);
    const lines = code.split('\n');
    console.log(`Line ${lineNum}:`, lines[lineNum - 1].substring(0, 200));
    console.log(`Line ${lineNum - 1}:`, (lines[lineNum - 2] || '').substring(0, 200));
    console.log(`Line ${lineNum + 1}:`, (lines[lineNum] || '').substring(0, 200));
  }
}
