const fs = require('fs');
const path = require('path');

const MAP = JSON.parse(fs.readFileSync('c:/Users/Aqil/work-desk/frontend/full-map.json', 'utf8'));

function fixFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  // Quick check: does file have any mojibake sequences?
  // Key indicator: U+00F0 (ð) followed shortly by U+0178 (Ÿ)
  if (!content.includes('ðŸ') && !content.includes('â') &&
      !content.includes('â') && !content.includes('â') &&
      !content.includes('â')) return false;

  let changed = false;
  for (const [from, to] of MAP) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  if (changed) {
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
        console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/', ''));
        n++;
      }
    }
  }
  return n;
}

const total = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('\nTotal files fixed:', total);
