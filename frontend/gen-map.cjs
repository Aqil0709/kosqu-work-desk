const fs = require('fs');

// Windows-1252 special chars in 0x80-0x9F range
const win1252 = {
  0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E,
  0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6,
  0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152,
  0x8E: 0x017D, 0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C,
  0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A,
  0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178,
};

function byteToW1252(b) {
  return win1252[b] !== undefined ? win1252[b] : b;
}

function emojiToMojibake(emoji) {
  const bytes = Buffer.from(emoji, 'utf8');
  return [...bytes].map(b => String.fromCodePoint(byteToW1252(b))).join('');
}

const emojis = [
  '\u{1F465}', '\u{1F464}', '\u{1F477}', '\u{1F393}',
  '✅', '\u{1F4CA}', '\u{1F4C5}', '\u{1F4C6}',
  '\u{1F3E2}', '\u{1F4B0}', '\u{1F4B5}', '\u{1F4B8}',
  '\u{1F4B3}', '\u{1F3E6}', '\u{1F4C8}', '\u{1F4C9}',
  '⚠', '\u{1F534}', '\u{1F7E2}', '\u{1F7E0}',
  '\u{1F7E1}', '\u{1F535}', '\u{1F4C4}', '\u{1F4CB}',
  '\u{1F4C3}', '\u{1F4DD}', '\u{1F4CC}', '\u{1F4CE}',
  '\u{1F4D1}', '\u{1F4C2}', '\u{1F525}', '\u{1F517}',
  '\u{1F527}', '\u{1F528}', '\u{1F512}', '\u{1F513}',
  '\u{1F511}', '\u{1F50E}', '\u{1F514}', '\u{1F515}',
  '\u{1F4BB}', '\u{1F4BE}', '\u{1F4F1}', '\u{1F680}',
  '\u{1F3AF}', '\u{1F389}', '\u{1F3C6}', '\u{1F310}',
  '\u{1F319}', '\u{1F31E}', '☀', '\u{1F4A1}',
  '\u{1F448}', '\u{1F449}', '\u{1F446}', '\u{1F447}',
  '\u{1F4AA}', '\u{1F91D}', '\u{1F64F}', '\u{1F52E}',
  '\u{1F9E9}', '\u{1F5C2}', '\u{1F5D1}', '\u{1F5D3}',
  '\u{1F4BC}', '\u{1F381}', '\u{1F388}', '\u{1F4E7}',
  '\u{1F4E8}', '\u{1F4E9}', '⌛', '⏳',
  '⏱', '\u{1F570}', '\u{1F558}', '\u{1F553}',
  '\u{1F551}', '\u{1F3E0}', '\u{1F4CD}', '\u{1F5BC}',
  '\u{1F5A8}', '\u{1F5A5}', '\u{1F590}', '\u{1F44B}',
  '\u{1F60A}', '\u{1F62D}', '\u{1F622}', '❤',
  '✔', '❌', '\u{1F50D}', '\u{1F4DC}',
  '\u{1F4DA}', '\u{1F4D9}', '\u{1F4D8}', '\u{1F4D7}',
  '\u{1F4D6}', '\u{1F6A8}', '\u{1F6A9}', '\u{1F396}',
  '\u{1F3C5}', '✨', '\u{1F4AF}', '\u{1F4AC}',
  '\u{1F5E8}', '\u{1F4AB}', '\u{1F494}',
  '\u{1F455}', '\u{1F481}', '\u{1F485}',
  '\u{1F4A5}', '\u{1F4A6}', '\u{1F4A7}',
  '\u{1F4A8}', '\u{1F4A9}', '\u{1F4AA}',
  '\u{1F4BC}', '\u{1F4BD}', '\u{1F4BF}',
  '\u{1F4C0}', '\u{1F4C1}', '\u{1F4C7}',
  '\u{1F4CF}', '\u{1F4D0}', '\u{1F4D2}',
  '\u{1F4D3}', '\u{1F4D4}', '\u{1F4D5}',
  '\u{1F4DB}', '\u{1F4DF}', '\u{1F4E0}',
  '\u{1F4E1}', '\u{1F4E2}', '\u{1F4E3}',
  '\u{1F4E4}', '\u{1F4E5}', '\u{1F4E6}',
  '\u{1F4EA}', '\u{1F4EB}', '\u{1F4EC}',
  '\u{1F4ED}', '\u{1F4EE}', '\u{1F4EF}',
  '\u{1F4F0}', '\u{1F4F2}', '\u{1F4F3}',
  '\u{1F4F4}', '\u{1F4F5}', '\u{1F4F6}',
  '\u{1F4F7}', '\u{1F4F8}', '\u{1F4F9}',
  '\u{1F4FA}', '\u{1F4FB}', '\u{1F4FC}',
  '\u{1F4FF}',
  '\u{1F3D7}', '\u{1F3D8}', '\u{1F3E3}', '\u{1F3E4}',
  '\u{1F3E5}', '\u{1F3E7}', '\u{1F3E8}', '\u{1F3E9}',
  '\u{1F3EA}', '\u{1F3EB}', '\u{1F3EC}', '\u{1F3ED}',
  '\u{1F50A}', '\u{1F50B}', '\u{1F50C}', '\u{1F50F}',
  '\u{1F510}', '\u{1F516}', '\u{1F518}', '\u{1F519}',
  '\u{1F51A}', '\u{1F51B}', '\u{1F51C}', '\u{1F51D}',
  '\u{1F51E}', '\u{1F51F}', '\u{1F520}', '\u{1F521}',
  '\u{1F522}', '\u{1F523}', '\u{1F524}', '\u{1F526}',
  '\u{1F529}', '\u{1F52A}', '\u{1F52B}', '\u{1F52C}',
  '\u{1F52D}', '\u{1F52F}', '\u{1F530}', '\u{1F531}',
  '\u{1F532}', '\u{1F533}', '\u{1F536}', '\u{1F537}',
  '\u{1F538}', '\u{1F539}', '\u{1F53A}', '\u{1F53B}',
  '\u{1F53C}', '\u{1F53D}', '\u{1F549}', '\u{1F54A}',
];

const map = [];
const seen = new Set();
for (const emoji of emojis) {
  const mojibake = emojiToMojibake(emoji);
  if (mojibake !== emoji && !seen.has(mojibake)) {
    seen.add(mojibake);
    map.push([mojibake, emoji]);
  }
}

// Sort by mojibake length descending (replace longer first)
map.sort((a, b) => b[0].length - a[0].length);

console.log('Generated', map.length, 'mappings');
console.log('Sample:', JSON.stringify(map.slice(0, 3)));

// Write the actual fixer script
const fixerCode = `const fs = require('fs');
const path = require('path');

const MAP = ${JSON.stringify(map)};

function fixFile(p) {
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [from, to] of MAP) {
    while (content.includes(from)) {
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
    else if (/\\.(jsx|js|tsx|ts)$/.test(e.name)) {
      if (fixFile(p)) { console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/', '')); n++; }
    }
  }
  return n;
}

const total = scan('c:/Users/Aqil/work-desk/frontend/src');
console.log('\\nTotal files fixed:', total);
`;

fs.writeFileSync('c:/Users/Aqil/work-desk/frontend/do-fix.cjs', fixerCode, 'utf8');
console.log('Wrote do-fix.cjs');
