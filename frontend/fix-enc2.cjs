/**
 * fix-enc2.cjs
 * The files contain UTF-8 emoji bytes but were somehow stored where the high bytes
 * got re-encoded. We read as binary and re-encode correctly.
 *
 * Strategy: Read file as Buffer (raw bytes). The emoji bytes are there correctly in raw form.
 * But when Node reads as 'utf8', the non-ASCII Latin-1 bytes (like 0x9F, 0x91 etc.)
 * are not valid UTF-8 sequences on their own, so they appear as replacement chars.
 *
 * Actually the issue may be different. Let's detect and fix by reading as latin1
 * then re-encoding sections as utf8.
 */
const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  // Read raw bytes
  const buf = fs.readFileSync(filePath);

  // Check if file has any high bytes that might be Latin-1 encoded emoji
  let hasHighBytes = false;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] > 0x7F && buf[i] < 0xC0) {
      // Byte in range 0x80-0xBF that is not preceded by a valid multi-byte sequence start
      // This could be a Latin-1 char misplaced
      hasHighBytes = true;
      break;
    }
  }

  if (!hasHighBytes) return false;

  // Read as latin1 to get raw byte values
  const asLatin1 = buf.toString('latin1');

  // Try to re-encode: collect sections that look like UTF-8 emoji encoded as Latin-1
  // When a 4-byte UTF-8 emoji (F0 9F xx xx) is read as Latin-1:
  // byte F0 = char 'ð' (U+00F0)
  // byte 9F = char (U+009F, undefined control or specific char)
  // etc.

  // The easiest approach: convert latin1 string back to Buffer treating each char as its byte value
  // then decode that Buffer as UTF-8
  const recoveredBuf = Buffer.from(asLatin1, 'latin1');

  try {
    const asUtf8 = recoveredBuf.toString('utf8');
    // Check if this is valid and different from original
    const originalUtf8 = buf.toString('utf8');

    if (asUtf8 !== originalUtf8 && !asUtf8.includes('�')) {
      // Valid UTF-8! Write it
      fs.writeFileSync(filePath, asUtf8, 'utf8');
      return true;
    }
  } catch (e) {
    // Not valid UTF-8 after re-encoding
  }

  return false;
}

function scanDir(dir) {
  let count = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) count += scanDir(p);
    else if (/\.(jsx|js|tsx|ts|css|md)$/.test(e.name)) {
      if (fixFile(p)) {
        console.log('Fixed:', p.replace('c:/Users/Aqil/work-desk/frontend/', ''));
        count++;
      }
    }
  }
  return count;
}

const total = scanDir('c:/Users/Aqil/work-desk/frontend/src');
console.log('\nTotal files fixed:', total);
