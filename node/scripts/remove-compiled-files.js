const fs = require('fs');

const compiledSelectorPath = 'assets/compiled_selector.js';

if (fs.existsSync(compiledSelectorPath)) {
  fs.unlinkSync(compiledSelectorPath);
  console.log('Removed compiled selector file:', compiledSelectorPath);
} else {
  console.log('No compiled selector file to remove');
} 