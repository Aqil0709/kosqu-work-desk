const fs = require('fs'), path = require('path');

// The quote fixer replaced — (em-dash) with -- which then became "" in some contexts
// We need to find "" IN TEXT CONTENT (not in JSX attributes like value="" key="" etc.)
// Strategy: replace "" that appears in JSX text nodes or string literals in JSX
// Safe pattern: replace " "" " (space-quotes-space) with " – " (en-dash with spaces)
// and "" at end of text content strings

function fixFile(p) {
  let c = fs.readFileSync(p, 'utf8');
  const orig = c;
  
  // Replace " "" " pattern (space-doublequote-doublequote-space) with " – " 
  // This catches em-dash between words: "word "" word"
  c = c.replace(/ "" /g, ' – ');
  
  // Replace "" at end of line in JSX text (before </tag> or newline in JSX context)
  // Pattern: text followed by "" followed by space and more text
  // Already handled by the above
  
  if (c !== orig) {
    fs.writeFileSync(p, c, 'utf8');
    return true;
  }
  return false;
}

function scan(dir) {
  let fixed = [];
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fixed = fixed.concat(scan(p));
    else if (/\.(jsx|js|tsx|ts)$/.test(e.name)) {
      if (fixFile(p)) fixed.push(e.name);
    }
  }
  return fixed;
}

const fixed = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('Fixed', fixed.length, 'files:', fixed.join(', '));
