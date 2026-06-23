/**
 * documentWatermarkService.js
 *
 * Centralized watermark service for ALL HR PDF documents.
 *
 * Architecture:
 *   1. getWatermarkConfig(branding)  → reads watermark settings from branding object
 *   2. buildWatermarkLayer(config)   → returns an HTML string (absolute-positioned div)
 *                                      that must be injected INSIDE the document wrapper
 *   3. applyWatermarkToCanvas(canvas, config) → draws the logo onto a jsPDF canvas
 *                                               AFTER html2canvas renders (alternative path)
 *
 * Usage pattern (in every PDF service):
 *
 *   import { buildWatermarkCSS, buildWatermarkLayer, getWatermarkConfig } from './documentWatermarkService';
 *
 *   // 1. After fetching branding:
 *   const wmConfig = getWatermarkConfig(branding);
 *
 *   // 2. In your HTML template, wrap content in a `position:relative` container
 *   //    and inject the watermark layer inside it:
 *   const html = `
 *     <div style="position:relative;width:100%;...">
 *       ${buildWatermarkLayer(wmConfig)}
 *       ... your document content ...
 *     </div>
 *   `;
 *
 * Fallback: if no logo_url is configured → no watermark, no errors, no broken PDF.
 * Multi-page: call buildWatermarkLayer(wmConfig) inside each page wrapper.
 */

import { brandingAPI } from './brandingAPI';

// ── Default watermark settings ─────────────────────────────────────────────────

const DEFAULTS = {
  enabled:  true,
  opacity:  0.07,   // 7% — professional, non-intrusive
  size:     'medium',
  position: 'center',
};

// Size presets: max dimension of the watermark logo as a % of page width (794px)
const SIZE_MAP = {
  small:  0.35,  // 35% of page width
  medium: 0.50,  // 50% of page width
  large:  0.65,  // 65% of page width
};

// ── Config resolver ────────────────────────────────────────────────────────────

/**
 * getWatermarkConfig(branding)
 *
 * Reads watermark settings stored in the branding record (new fields added
 * to tenant_branding table). Falls back to safe defaults.
 *
 * @param {object} branding  - raw branding record from GET /api/branding
 * @returns {object} wmConfig - resolved config object
 */
export const getWatermarkConfig = (branding = {}) => {
  // If no logo is uploaded, watermark is impossible — return disabled config
  if (!branding.logo_url) {
    return { enabled: false, logoUrl: null, opacity: 0, size: 'medium', position: 'center' };
  }

  // MySQL returns TINYINT as 0/1; JS boolean false also handled
  const enabled  = branding.watermark_enabled !== false && branding.watermark_enabled !== 0;
  const opacity  = Math.min(0.15, Math.max(0.02, Number(branding.watermark_opacity  ?? DEFAULTS.opacity)));
  const size     = SIZE_MAP[branding.watermark_size] ? branding.watermark_size : DEFAULTS.size;
  const position = ['center','top-center','bottom-center','diagonal'].includes(branding.watermark_position)
    ? branding.watermark_position
    : DEFAULTS.position;

  return {
    enabled,
    logoUrl:  enabled ? brandingAPI.getImageUrl(branding.logo_url) : null,
    opacity,
    size,
    sizePct:  SIZE_MAP[size],
    position,
  };
};

// ── HTML watermark layer ───────────────────────────────────────────────────────

/**
 * buildWatermarkLayer(wmConfig)
 *
 * Returns an HTML string for an absolutely-positioned watermark div.
 * Inject this INSIDE a `position:relative` page wrapper, BEFORE content.
 * The `z-index: 0` combined with `z-index: 1` on content ensures watermark
 * sits behind all text and images.
 *
 * For diagonal watermarks, CSS rotate() is applied.
 *
 * @param {object} wmConfig - from getWatermarkConfig()
 * @returns {string} HTML string
 */
export const buildWatermarkLayer = (wmConfig) => {
  if (!wmConfig?.enabled || !wmConfig?.logoUrl) return '';

  // Page is 794px wide. Watermark width = sizePct * 794.
  const pageWidth   = 794;
  const wmWidth     = Math.round(pageWidth * wmConfig.sizePct);

  // Position styles
  const positionStyle = getPositionStyle(wmConfig.position, wmWidth);

  // Diagonal gets a CSS transform
  const transform = wmConfig.position === 'diagonal'
    ? 'transform:rotate(-35deg);transform-origin:center center;'
    : '';

  return `
    <div style="
      position:absolute;
      ${positionStyle}
      width:${wmWidth}px;
      pointer-events:none;
      z-index:0;
      ${transform}
    ">
      <img
        src="${wmConfig.logoUrl}"
        alt=""
        crossorigin="anonymous"
        style="
          width:100%;
          height:auto;
          display:block;
          opacity:${wmConfig.opacity};
          filter:grayscale(30%);
          object-fit:contain;
          -webkit-user-select:none;
          user-select:none;
        "
      />
    </div>`;
};

/**
 * buildContentWrapper(content, wmConfig)
 *
 * Wraps document content in a `position:relative` container and injects
 * the watermark layer behind it. This is the preferred usage pattern for
 * multi-page PDFs — call this for every page wrapper.
 *
 * The content div gets `position:relative; z-index:1` to sit above the watermark.
 *
 * @param {string} content  - inner HTML of the page
 * @param {object} wmConfig - from getWatermarkConfig()
 * @param {string} [extraStyle] - additional styles for the wrapper div
 * @returns {string} HTML string
 */
export const buildContentWrapper = (content, wmConfig, extraStyle = '') => {
  const watermarkHtml = buildWatermarkLayer(wmConfig);

  return `
    <div style="position:relative;width:100%;min-height:297mm;background:#fff;overflow:hidden;${extraStyle}">
      ${watermarkHtml}
      <div style="position:relative;z-index:1;width:100%;">
        ${content}
      </div>
    </div>`;
};

// ── Position helpers ───────────────────────────────────────────────────────────

function getPositionStyle(position, wmWidth) {
  const pageWidth  = 794;
  const leftCenter = Math.round((pageWidth - wmWidth) / 2);

  switch (position) {
    case 'top-center':
      return `top:80px;left:${leftCenter}px;`;

    case 'bottom-center':
      return `bottom:80px;left:${leftCenter}px;`;

    case 'diagonal':
      // Place at true center; rotation handles the diagonal appearance
      return `top:50%;left:${leftCenter}px;margin-top:${-Math.round(wmWidth * 0.4)}px;`;

    case 'center':
    default:
      // Vertically centered: offset from top 50% - half the estimated image height
      // Image height ≈ width * 0.4 (typical logo aspect ratio)
      return `top:50%;left:${leftCenter}px;margin-top:${-Math.round(wmWidth * 0.2)}px;`;
  }
}

// ── CSS block for pages using <style> tags ─────────────────────────────────────

/**
 * buildWatermarkCSS(wmConfig)
 *
 * Returns a `<style>` block that can be injected into full HTML page documents
 * (used by incrementPDFService and experiencePDFService which build full
 * <!DOCTYPE html> pages). The CSS targets a `.wm-layer` class.
 *
 * @param {object} wmConfig
 * @returns {string} <style> HTML string, or '' if disabled
 */
export const buildWatermarkCSS = (wmConfig) => {
  if (!wmConfig?.enabled || !wmConfig?.logoUrl) return '';

  const pageWidth = 794;
  const wmWidth   = Math.round(pageWidth * wmConfig.sizePct);
  const positionStyle = getPositionStyle(wmConfig.position, wmWidth);
  const rotateStyle   = wmConfig.position === 'diagonal' ? 'transform:rotate(-35deg);' : '';

  return `
    <style>
      .wm-page-wrapper { position:relative; overflow:hidden; background:#fff; }
      .wm-layer {
        position:absolute;
        ${positionStyle}
        width:${wmWidth}px;
        pointer-events:none;
        z-index:0;
        ${rotateStyle}
      }
      .wm-layer img {
        width:100%;
        height:auto;
        display:block;
        opacity:${wmConfig.opacity};
        filter:grayscale(30%);
        object-fit:contain;
      }
      .wm-content {
        position:relative;
        z-index:1;
        width:100%;
      }
    </style>`;
};

/**
 * buildWatermarkImgTag(wmConfig)
 *
 * Returns just the img tag HTML for use inside .wm-layer divs
 * in full HTML page templates.
 */
export const buildWatermarkImgTag = (wmConfig) => {
  if (!wmConfig?.enabled || !wmConfig?.logoUrl) return '';
  return `<img src="${wmConfig.logoUrl}" alt="" crossorigin="anonymous" />`;
};
