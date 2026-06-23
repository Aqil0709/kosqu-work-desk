/**
 * fix-quotes.cjs
 * Replaces curly/smart quotes introduced by the emoji fixer back to straight quotes.
 * Also handles em-dash and en-dash in JS contexts.
 */
const fs = require('fs');
const path = require('path');

function fixFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  if (!content.includes('“') && !content.includes('”') &&
      !content.includes('‘') && !content.includes('’') &&
      !content.includes('…') && !content.includes('–') &&
      !content.includes('—') && !content.includes('•')) return false;

  let changed = false;
  const original = content;

  // In JSX/JS files, smart quotes should be straight quotes in code contexts
  // But we need to be careful: in JSX text content, curly quotes are FINE
  // The issue is when they appear inside JS string literals (between ' or ")
  // Most problematic: U+201C and U+201D replacing " in string literals

  // Simple approach: replace ALL curly quotes with straight equivalents in JS/JSX
  // This is safe because JSX text content can use &ldquo; if needed
  content = content
    .split('“').join('"')   // left double quote -> "
    .split('”').join('"')   // right double quote -> "
    .split('‘').join("'")   // left single quote -> '
    .split('’').join("'")   // right single quote -> '
    .split('…').join('...')  // ellipsis -> ...
    .split('–').join('-')    // en-dash -> -
    .split('—').join('--')   // em-dash -> --
    .split('•').join('•'); // bullet stays (it's fine in JSX text)

  if (content !== original) {
    fs.writeFileSync(p, content, 'utf8');
    return true;
  }
  return false;
}

function scan(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += scan(p);
    else if (/\.(jsx|js|tsx|ts)$/.test(e.name)) {
      if (fixFile(p)) {
        console.log('Fixed quotes:', p.replace('c:/Users/Aqil/work-desk/frontend/', ''));
        n++;
      }
    }
  }
  return n;
}

const total = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('\nTotal files fixed:', total);
