const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

/**
 * Applies a corporate branding watermark (Logo image or Text) 
 * on EVERY page of an existing PDF document.
 * Excludes: ID Cards.
 * * @param {Buffer} pdfBuffer  - Original PDF bytes
 * @param {string} text       - Fallback watermark text (Company Name)
 * @param {object} opts
 * @param {number} opts.opacity   - 0–1, default 0.07
 * @param {string} opts.size      - 'small'|'medium'|'large', default 'medium'
 * @param {string} opts.logo_url  - Branding logo filename or URL path
 * @returns {Promise<Buffer>}
 */
async function applyWatermark(pdfBuffer, text, opts = {}) {
  const { opacity = 0.07, size = 'medium', logo_url = null } = opts;

  const fontSizes = { small: 32, medium: 48, large: 64 };
  const fontSize = fontSizes[size] || 48;

  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  let embeddedImage = null;
  let imageWidth = 0;
  let imageHeight = 0;

  // Issue 3 Fix: Load corporate branding logo image as watermark background if available
  if (logo_url) {
    try {
      const filename = path.basename(logo_url);
      const possibleLogoPaths = [
        path.join(__dirname, '..', 'features', 'uploads', 'branding', filename),
        path.join(__dirname, '..', '..', 'src', 'features', 'uploads', 'branding', filename),
        path.join(__dirname, '..', '..', 'uploads', 'branding', filename),
        path.join(process.cwd(), 'src', 'features', 'uploads', 'branding', filename),
        path.join(process.cwd(), 'uploads', 'branding', filename)
      ];

      let logoPathOnDisk = null;
      for (const possiblePath of possibleLogoPaths) {
        if (fs.existsSync(possiblePath)) {
          logoPathOnDisk = possiblePath;
          break;
        }
      }

      if (logoPathOnDisk) {
        const imageBytes = fs.readFileSync(logoPathOnDisk);
        const lowerName = filename.toLowerCase();
        
        if (lowerName.endsWith('.png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        if (embeddedImage) {
          const dims = embeddedImage.scale(1);
          imageWidth = dims.width;
          imageHeight = dims.height;
        }
      }
    } catch (err) {
      console.warn('[Watermark] Could not load or embed branding image:', err.message);
    }
  }

  // Draw on EVERY single page of the document
  for (const page of pages) {
    const { width, height } = page.getSize();

    if (embeddedImage) {
      // Scale and place corporate logo centered in watermarked page background
      const maxDim = size === 'small' ? 160 : size === 'large' ? 320 : 240;
      const scale = Math.min(maxDim / imageWidth, maxDim / imageHeight);
      const w = imageWidth * scale;
      const h = imageHeight * scale;
      const x = (width - w) / 2;
      const y = (height - h) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: w,
        height: h,
        opacity: opacity,
      });
    } else {
      // Fallback: Diagonal company name text
      const watermarkText = text || 'CONFIDENTIAL';
      const positions = [
        [width * 0.5, height * 0.5],
        [width * 0.25, height * 0.75],
        [width * 0.75, height * 0.25],
      ];
      for (const [x, y] of positions) {
        page.drawText(watermarkText, {
          x: x - (watermarkText.length * fontSize * 0.28),
          y,
          size: fontSize,
          opacity,
          rotate: degrees(-35),
          color: rgb(0.36, 0.31, 0.97), // #5B4FF7 signature purple
        });
      }
    }
  }

  const watermarkedBytes = await pdfDoc.save();
  return Buffer.from(watermarkedBytes);
}

module.exports = { applyWatermark };