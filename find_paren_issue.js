// Find the exact minimal failing case
function test(label, code) {
  try {
    new Function(code);
    console.log(`${label}: OK`);
  } catch(e) {
    console.log(`${label}: FAIL - ${e.message}`);
  }
}

test('Empty IIFE with args', '(function(){}(1,2))');
test('Empty IIFE with _0x9183', '(function(){}(_0x9183,0x9279c))');
test('Param+Arg match', '(function(a,b){}(_0x9183,0x9279c))');
test('No outer parens', 'function(){}(_0x9183,0x9279c)');
test('Var instead of function', '(function(){}.call(null,_0x9183,0x9279c))');
test('Arrow with _0x9183', '((a,b)=>{}(_0x9183,0x9279c))');

// Test: is _0x9183 a problem?
test('_0x9183 alone', '_0x9183');
test('0x9279c alone', '0x9279c');
test('_0x9183 as statement', '_0x9183;');
test('0x9279c as statement', '0x9279c;');

// Test: what about _0x before the value?
test('_0x1111 value', '(function(){}(_0x1111,0x9279c))');

// Test: mixing hex and identifier
test('var a=0x9279c', 'var a=0x9279c');
test('_0x9183 test', 'var a=_0x9183');

// The puzzle: "(function(a,b){}(a,b))" works but "(function(a,b){}(_0x9183,0x9279c))" doesn't?
// Let me verify
test('SIMPLE: (a,b)', '(function(a,b){}(a,b))');
test('SIMPLE: (_0x9183,0x9279c)', '(function(a,b){}(_0x9183,0x9279c))');

// Try without outer parens (not wrapping in expression)
test('NO WRAP: (a,b)', 'function(a,b){}(a,b)');
test('NO WRAP: (_0x9183,0x9279c)', 'function(a,b){}(_0x9183,0x9279c)');

// Try standalone identifier
test('_0x9183 as identifier', 'var x=_0x9183');

// Could it be the number of _0x chars?
test('_0x1234 test', '(function(a,b){}(_0x1234,0x9279c))');
test('_0x5678 test', '(function(a,b){}(_0x5678,0x9279c))');

// What about just the hex number
test('only 0x9279c', '(function(a,b){}(b,0x9279c))');
test('only _0x9183', '(function(a,b){}(_0x9183,b))');

// What about something simpler
test('0x1 as arg', '(function(a,b){}(a,0x1))');
test('0x9279c as arg with a', '(function(a,b){}(a,0x9279c))');
