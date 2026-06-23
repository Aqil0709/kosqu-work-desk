/**
 * fix-encoding.cjs
 * Fixes mojibake in JSX files: UTF-8 emoji bytes misread as Latin-1/Windows-1252.
 * Strategy: read file as binary Buffer, detect the mojibake byte sequences,
 * replace them with correct UTF-8 emoji bytes.
 */
const fs = require('fs');
const path = require('path');

// Map: mojibake Latin-1 string -> correct emoji string
// Each entry: the file when read as utf8 shows the LEFT side; we replace with RIGHT side
// The LEFT strings are the Latin-1 misread versions of the emoji
const MAP = [
  // People
  ['ð¥', '\u{1F465}'],  // 👥
  ['ð¤', '\u{1F464}'],  // 👤
  ['ð·', '\u{1F477}'],  // 👷
  ['ð', '\u{1F393}'],  // 🎓
  ['ð', '\u{1F60A}'],  // 😊
  // Status
  ['â', '✅'],           // ✅
  ['â', '✔'],           // ✔
  ['â', '✗'],           // ✗
  ['â', '⛔'],           // ⛔
  ['â', '❌'],           // ❌
  ['â ï¸', '⚠️'], // ⚠️
  ['â ', '⚠'],           // ⚠
  ['â¡', '⚡'],           // ⚡
  ['ð´', '\u{1F534}'],  // 🔴
  ['ð¢', '\u{1F7E2}'],  // 🟢
  ['ð ', '\u{1F7E0}'],  // 🟠
  ['ð¡', '\u{1F7E1}'],  // 🟡
  ['ðµ', '\u{1F535}'],  // 🔵
  // Documents
  ['ð', '\u{1F4C4}'],  // 📄
  ['ð', '\u{1F4CB}'],  // 📋
  ['ð', '\u{1F4C3}'],  // 📃
  ['ð', '\u{1F4DD}'],  // 📝
  ['ð', '\u{1F4CA}'],  // 📊
  ['ð', '\u{1F4C8}'],  // 📈
  ['ð', '\u{1F4C9}'],  // 📉
  ['ð', '\u{1F4CC}'],  // 📌
  ['ð', '\u{1F4CE}'],  // 📎
  ['ð', '\u{1F4D1}'],  // 📑
  ['ð', '\u{1F4C5}'],  // 📅
  ['ð', '\u{1F4C6}'],  // 📆
  ['ð', '\u{1F4C2}'],  // 📂
  // Finance
  ['ð°', '\u{1F4B0}'],  // 💰
  ['ðµ', '\u{1F4B5}'],  // 💵
  ['ð¸', '\u{1F4B8}'],  // 💸
  ['ð³', '\u{1F4B3}'],  // 💳
  ['ð¦', '\u{1F3E6}'],  // 🏦
  // Time
  ['ð', '\u{1F558}'],  // 🕘
  ['ð', '\u{1F553}'],  // 🕓
  ['ð', '\u{1F551}'],  // 🕑
  ['â±ï¸', '⏱️'], // ⏱️
  ['â±', '⏱'],                 // ⏱
  ['â²', '⏲'],                 // ⏲
  ['ð°', '\u{1F570}'],  // 🕰
  ['â°', '‰'],           // ‰ (permille - not usually wanted but handle it)
  ['â³', '\u{1F553}'],        // fallback
  ['â³', '⏳'],                 // ⏳
  ['â', '⌛'],           // ⌛
  ['â', '⌚'],           // ⌚
  ['â', '‰'],
  // Buildings
  ['ð¢', '\u{1F3E2}'],  // 🏢
  ['ð ', '\u{1F3E0}'],  // 🏠
  ['ð', '\u{1F4CD}'],  // 📍
  // Actions
  ['ð¥', '\u{1F525}'],  // 🔥
  ['ð', '\u{1F517}'],  // 🔗
  ['ð§', '\u{1F527}'],  // 🔧
  ['ð¨', '\u{1F528}'],  // 🔨
  ['ð', '\u{1F512}'],  // 🔒
  ['ð', '\u{1F513}'],  // 🔓
  ['ð', '\u{1F511}'],  // 🔑
  ['ð', '\u{1F50E}'],  // 🔎
  ['ð', '\u{1F514}'],  // 🔔
  ['ð', '\u{1F515}'],  // 🔕
  ['ð', '\u{1F505}'],  // 🔅
  ['ð', '\u{1F506}'],  // 🔆
  ['ð', '\u{1F50B}'],  // 🔋
  ['ð', '\u{1F50C}'],  // 🔌
  ['ð¼ï¸', '\u{1F5BC}️'], // 🖼️
  ['ð¼', '\u{1F5BC}'],  // 🖼
  ['ð¨ï¸', '\u{1F5A8}️'], // 🖨️
  ['ð¥ï¸', '\u{1F5A5}️'], // 🖥️
  ['ð»', '\u{1F4BB}'],  // 💻
  ['ð¾', '\u{1F4BE}'],  // 💾
  ['ð±', '\u{1F4F1}'],  // 📱
  // Media
  ['ð¥', '\u{1F5A5}'],  // 🖥
  ['ð¤', '\u{1F5A4}'],  // 🖤 (black heart)
  // Misc
  ['ð', '\u{1F680}'],  // 🚀
  ['ð¯', '\u{1F3AF}'],  // 🎯
  ['ð', '\u{1F389}'],  // 🎉
  ['ð', '\u{1F3C6}'],  // 🏆
  ['ð', '\u{1F310}'],  // 🌐
  ['ð', '\u{1F319}'],  // 🌙
  ['ð', '\u{1F31E}'],  // 🌞
  ['â', '☕'],           // ☕ (actually ⛅ but treat as is)
  ['âï¸', '☀️'], // ☀️
  ['â', '☀'],           // ☀
  ['â', '☁'],           // ☁
  ['ð¡', '\u{1F4A1}'],  // 💡
  ['ð', '\u{1F448}'],  // 👈
  ['ð', '\u{1F449}'],  // 👉
  ['ð', '\u{1F446}'],  // 👆
  ['ð', '\u{1F447}'],  // 👇
  ['ðª', '\u{1F4AA}'],  // 💪
  ['ð¤', '\u{1F91D}'],  // 🤝
  ['ð', '\u{1F64F}'],  // 🙏
  ['ð®', '\u{1F52E}'],  // 🔮
  ['ð§©', '\u{1F9E9}'],  // 🧩
  ['ðï¸', '\u{1F5C2}️'], // 🗂️
  ['ð', '\u{1F5C2}'],  // 🗂
  ['ðï¸', '\u{1F5D1}️'], // 🗑️
  ['ð', '\u{1F5D1}'],  // 🗑
  ['ðï¸', '\u{1F5D3}️'], // 🗓️
  ['ð', '\u{1F5D3}'],  // 🗓
  // Employee / HR
  ['ð¼', '\u{1F4BC}'],  // 💼
  ['ð', '\u{1F381}'],  // 🎁
  ['ð', '\u{1F38A}'],  // 🎊
  ['ðï¸', '\u{1F396}️'], // 🎖️
  ['ð', '\u{1F4D9}'],  // 📙
  ['ð', '\u{1F4DA}'],  // 📚
  ['ð', '\u{1F4DC}'],  // 📜
  ['ð§', '\u{1F4E7}'],  // 📧
  ['ð¨', '\u{1F4E8}'],  // 📨
  ['ð©', '\u{1F4E9}'],  // 📩
  ['ðª', '\u{1F4EA}'],  // 📪
  ['ð«', '\u{1F4EB}'],  // 📫
  // Text punctuation
  ['â¦', '…'],           // …
  ['â', '—'],           // —
  ['â', '–'],           // –
  ['â', '“'],           // "
  ['â', '”'],           // "
  ['â', '‘'],           // '
  ['â', '’'],           // '
  ['Â·', '·'],                 // ·
  ['Ã·', '÷'],                 // ÷ (or ×?)
  ['Â°', '°'],                 // °
  ['Â©', '©'],                 // ©
  ['Â®', '®'],                 // ®
  ['â¢', '™'],           // ™
  // Hand/emoji that didn't fix
  ['ðï¸', '\u{1F590}️'], // 🖐️
  ['ð', '\u{1F590}'],  // 🖐
  // Numbers / special
  ['â¹', 'ℹ'],           // ℹ
  ['â¹ï¸', 'ℹ️'], // ℹ️
  // More emoji
  ['ð¢', '\u{1F622}'],  // 😢
  ['ð­', '\u{1F62D}'],  // 😭
  ['ð¤', '\u{1F624}'],  // 😤
  ['ð', '\u{1F45A}'],  // 👚
  ['ð', '\u{1F685}'],  // 🚅
  ['ð¨', '\u{1F6A8}'],  // 🚨
];

function fixBuffer(content) {
  let changed = false;
  // We need to iterate carefully - replace longer sequences first
  // Sort by length descending to avoid partial replacements
  const sorted = [...MAP].sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sorted) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  }
  return { content, changed };
}

function processDir(dir) {
  let count = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) count += processDir(p);
    else if (/\.(jsx|js|tsx|ts)$/.test(e.name)) {
      const raw = fs.readFileSync(p, 'utf8');
      const { content, changed } = fixBuffer(raw);
      if (changed) {
        fs.writeFileSync(p, content, 'utf8');
        console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/', ''));
        count++;
      }
    }
  }
  return count;
}

const n = processDir('c:/Users/Aqil/work-desk/frontend/src');
console.log('\nTotal fixed:', n);
