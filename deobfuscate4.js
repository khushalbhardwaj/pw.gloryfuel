const fs = require('fs');

const text = fs.readFileSync('E:\\gloryfuel project\\gloryfuel pw\\lite_bundle_downloaded.js', 'utf8');

// Extract the search function (async arrow function at position ~969358)
console.log('=== SEARCH FUNCTION (pos 969350-972500) ===');
console.log(text.substring(969350, 972500));

// Also extract the fetch call area more precisely  
console.log('\n\n=== FETCH CALL DETAIL (pos 969850-970800) ===');
console.log(text.substring(969850, 970800));

// Extract the area around the callback function that processes results
console.log('\n\n=== RESULT PROCESSING (pos 970700-972000) ===');
console.log(text.substring(970700, 972000));
