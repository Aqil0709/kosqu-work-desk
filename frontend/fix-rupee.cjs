const fs = require('fs'), path = require('path');

// â‚¹ is ₹ (Indian Rupee, U+20B9)
// âˆ' is − (Minus sign, U+2212)
const FIXES = [
  ['â‚¹', '₹'],
  ['âˆ'', '−'],
];

function fixFile(p) {
  let c = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [from, to] of FIXES) {
    if (c.includes(from)) {
      c = c.split(from).join(to);
      changed = true;
    }
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
    else if (/\.(jsx|js|tsx|ts)$/.test(e.name)) {
      if (fixFile(p)) { console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/','')); n++; }
    }
  }
  return n;
}
const n = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('Fixed:', n);
