/**
 * fix-emoji.mjs
 * Replaces mojibake emoji sequences in JSX files with proper Unicode or Lucide icons.
 * Run: node fix-emoji.mjs
 */
import fs from 'fs';
import path from 'path';

// Map of mojibake sequence -> replacement
// These are UTF-8 emoji bytes misread as Latin-1
const REPLACEMENTS = [
  // People / Users
  [/ðŸ'¥/g, '👥'],
  [/ðŸ'¤/g, '👤'],
  [/ðŸ'¨â€ðŸ'¼/g, '👨‍💼'],
  [/ðŸ'©â€ðŸ'¼/g, '👩‍💼'],
  [/ðŸ'·/g, '👷'],
  [/ðŸŽ"/g, '🎓'],
  [/ðŸ˜Š/g, '😊'],
  [/ðŸ'â€/g, '👁'],

  // Status / Checks
  [/âœ…/g, '✅'],
  [/âœ"/g, '✓'],
  [/âœ—/g, '✗'],
  [/â›"/g, '⛔'],
  [/âŒ/g, '❌'],
  [/â—/g, '❗'],
  [/â„¹ï¸/g, 'ℹ️'],
  [/â„¹/g, 'ℹ'],
  [/âš ï¸/g, '⚠️'],
  [/âš /g, '⚠'],
  [/âš¡/g, '⚡'],
  [/ðŸ"´/g, '🔴'],
  [/ðŸŸ¢/g, '🟢'],
  [/ðŸŸ /g, '🟠'],
  [/ðŸŸ¡/g, '🟡'],
  [/ðŸ"µ/g, '🔵'],

  // Documents / Files
  [/ðŸ"„/g, '📄'],
  [/ðŸ"‹/g, '📋'],
  [/ðŸ"ƒ/g, '📃'],
  [/ðŸ"/g, '📝'],
  [/ðŸ"Š/g, '📊'],
  [/ðŸ"ˆ/g, '📈'],
  [/ðŸ"‰/g, '📉'],
  [/ðŸ"Œ/g, '📌'],
  [/ðŸ"Ž/g, '📎'],
  [/ðŸ"'/g, '📑'],

  // Finance
  [/ðŸ'°/g, '💰'],
  [/ðŸ'µ/g, '💵'],
  [/ðŸ'¸/g, '💸'],
  [/ðŸ'³/g, '💳'],
  [/ðŸ¦/g, '🏦'],

  // Time / Calendar
  [/ðŸ"…/g, '📅'],
  [/ðŸ"†/g, '📆'],
  [/ðŸ•˜/g, '🕘'],
  [/ðŸ•"/g, '🕓'],
  [/ðŸ•'/g, '🕑'],
  [/â±ï¸/g, '⏱️'],
  [/â±/g, '⏱'],
  [/â²/g, '⏲'],
  [/ðŸ•°/g, '🕰'],
  [/â°/g, '⏰'],
  [/â³/g, '⏳'],
  [/âŒ›/g, '⌛'],

  // Buildings / Places
  [/ðŸ¢/g, '🏢'],
  [/ðŸ /g, '🏠'],
  [/ðŸ"/g, '📍'],
  [/ðŸ—ºï¸/g, '🗺️'],

  // Actions
  [/ðŸ"‚/g, '📂'],
  [/ðŸ"¥/g, '🔥'],
  [/ðŸ"—/g, '🔗'],
  [/ðŸ"§/g, '🔧'],
  [/ðŸ"¨/g, '🔨'],
  [/ðŸ"'/g, '🔒'],
  [/ðŸ""/g, '🔓'],
  [/ðŸ"'/g, '🔑'],
  [/ðŸ"Ž/g, '🔎'],
  [/ðŸ""/g, '🔔'],
  [/ðŸ"•/g, '🔕'],
  [/ðŸ"…/g, '🔅'],
  [/ðŸ"†/g, '🔆'],
  [/ðŸ"‹/g, '🔋'],
  [/ðŸ"Œ/g, '🔌'],
  [/ðŸ–¼ï¸/g, '🖼️'],
  [/ðŸ–¼/g, '🖼'],
  [/ðŸ–ï¸/g, '🖐️'],
  [/ðŸ–/g, '🖐'],
  [/ðŸ'¾/g, '💾'],
  [/ðŸ–¨ï¸/g, '🖨️'],
  [/ðŸ–¥ï¸/g, '🖥️'],
  [/ðŸ'»/g, '💻'],
  [/ðŸ"±/g, '📱'],

  // Misc
  [/ðŸš€/g, '🚀'],
  [/ðŸŽ¯/g, '🎯'],
  [/ðŸŽ‰/g, '🎉'],
  [/ðŸ†/g, '🏆'],
  [/ðŸŒ/g, '🌐'],
  [/ðŸŒ™/g, '🌙'],
  [/ðŸŒž/g, '🌞'],
  [/â˜€ï¸/g, '☀️'],
  [/â˜€/g, '☀'],
  [/â˜/g, '☁'],
  [/ðŸ'¡/g, '💡'],
  [/ðŸ'ˆ/g, '👈'],
  [/ðŸ'‰/g, '👉'],
  [/ðŸ'†/g, '👆'],
  [/ðŸ'‡/g, '👇'],
  [/ðŸ'ª/g, '💪'],
  [/ðŸ¤/g, '🤝'],
  [/ðŸ™/g, '🙏'],
  [/ðŸ"®/g, '🔮'],
  [/ðŸ§©/g, '🧩'],
  [/ðŸ—‚ï¸/g, '🗂️'],
  [/ðŸ—‚/g, '🗂'],
  [/ðŸ—'ï¸/g, '🗑️'],
  [/ðŸ—'/g, '🗑'],
  [/ðŸ—"ï¸/g, '🗓️'],
  [/ðŸ—"/g, '🗓'],

  // Arrows
  [/â†'/g, '←'],
  [/â†'/g, '→'],
  [/â†'/g, '↑'],
  [/â†"/g, '↓'],
  [/â†©/g, '↩'],
  [/â†ª/g, '↪'],

  // Text punctuation
  [/â€¦/g, '…'],
  [/â€"/g, '—'],
  [/â€"/g, '–'],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/â€˜/g, '‘'],
  [/â€™/g, "'"],
  [/Â·/g, '·'],
  [/Ã—/g, '×'],
  [/Â°/g, '°'],
  [/Â©/g, '©'],
  [/Â®/g, '®'],
  [/â„¢/g, '™'],

  // More emoji
  [/ðŸ§'â€ðŸ'¼/g, '🧑‍💼'],
  [/ðŸ§'/g, '🧑'],
  [/ðŸ'ˆðŸ»/g, '👈🏻'],
  [/ðŸ'†ðŸ»/g, '👆🏻'],
];

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  for (const [pattern, replacement] of REPLACEMENTS) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let fixed = 0;
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) fixed += scanDir(p);
    else if (e.name.endsWith('.jsx') || e.name.endsWith('.js') || e.name.endsWith('.tsx') || e.name.endsWith('.ts')) {
      if (fixFile(p)) {
        console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/', ''));
        fixed++;
      }
    }
  }
  return fixed;
}

const total = scanDir('c:/Users/Aqil/work-desk/frontend/src');
console.log(`\nTotal files fixed: ${total}`);
