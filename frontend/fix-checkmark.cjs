const fs = require('fs'), path = require('path');

function fixFile(p) {
  let c = fs.readFileSync(p, 'utf8');
  let changed = false;

  // checkmark broken: U+00E2 U+0153 U+0022 (was E2 9C 93, then 93->Win1252->U+201C->quote-fixed to ")
  // We search for the two-char prefix U+00E2 + U+0153 followed by "
  const chk = 'âœ"';
  if (c.includes(chk)) {
    c = c.split(chk).join('✓'); // ✓
    changed = true;
  }

  // Also: U+00E2 U+009C U+0022 (alternative encoding path)
  const chk2 = 'â"';
  if (c.includes(chk2)) {
    c = c.split(chk2).join('✓');
    changed = true;
  }

  if (changed) { fs.writeFileSync(p, c, 'utf8'); return true; }
  return false;
}

function scan(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (e.name==='node_modules'||e.name==='.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) n += scan(p);
    else if (/\.(jsx|js)$/.test(e.name)) {
      if (fixFile(p)) { console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/','')); n++; }
    }
  }
  return n;
}
const n = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('Fixed:', n);
