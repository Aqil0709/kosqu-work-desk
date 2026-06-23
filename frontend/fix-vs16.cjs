const fs = require('fs'), path = require('path');
const VS16 = String.fromCharCode(0xef) + String.fromCharCode(0xb8) + String.fromCharCode(0x8f);
function fixFile(p) {
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes(VS16)) return false;
  fs.writeFileSync(p, c.split(VS16).join('️'), 'utf8');
  return true;
}
function scan(dir) {
  let fixed = [];
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (e.name==='node_modules'||e.name==='.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fixed = fixed.concat(scan(p));
    else if (/\.(jsx|js)$/.test(e.name) && fixFile(p)) fixed.push(e.name);
  }
  return fixed;
}
const r = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('Fixed', r.length, 'files:', r.join(', '));
