/**
 * docHeaderService.js
 *
 * Single source of truth for the branded document header used by ALL HR PDFs.
 * Layout matches the reference image:
 *   [LOGO]  |  [Company Name + Tagline]
 *            |  +91 Phone   🌐
 *            |  www.website.com
 *            |  📍 Address
 * ─────────────────────────────────────── (full-width divider)
 *
 * 1 cm margins (38 px on the 794 px canvas = 210 mm A4 width).
 * Always light-theme / print-safe: color-scheme:light, background:#fff, color:#000.
 */

import fallbackLogo from '../assets/img/company.png';
import brandingAPI from './brandingAPI';

/** Fetch active branding; returns {} on failure so callers never throw. */
export const fetchBranding = async () => {
  try {
    const res = await brandingAPI.get();
    if (res.data?.success && res.data?.branding) return res.data.branding;
  } catch (_) {}
  return {};
};

/**
 * buildDocContext(branding)
 * Converts a raw branding record into the shape every PDF service needs.
 */
export const buildDocContext = (branding) => ({
  logo:      branding.logo_url      ? brandingAPI.getImageUrl(branding.logo_url)      : fallbackLogo,
  stamp:     branding.stamp_url     ? brandingAPI.getImageUrl(branding.stamp_url)     : null,
  signature: branding.signature_url ? brandingAPI.getImageUrl(branding.signature_url) : null,
  company: {
    name:     branding.company_name     || '',
    tagline:  branding.company_tagline  || '',
    address:  branding.company_address  || '',
    email:    branding.company_email    || '',
    phone:    branding.company_phone    || '',
    website:  branding.company_website  || '',
    cin:      branding.company_cin      || '',
    gst:      branding.company_gst      || '',
  },
  hr: {
    name:        branding.hr_name        || '',
    designation: branding.hr_designation || '',
  },
});

/**
 * buildDocHeader(logo, company)
 *
 * Returns an HTML string for the full-width, branded document header.
 * Matches the reference image: logo left | vertical divider | company info right.
 *
 * All measurements in px (not mm) to guarantee identical rendering across
 * all PDF services — html2canvas resolves mm units inconsistently at 96dpi.
 *
 * Canvas is always 794px wide (A4 @ 96dpi).
 * 1 cm = 794 * (10/210) ≈ 38px.
 *
 * @param {string} logo        – fully-qualified image URL (or fallback)
 * @param {object} company     – { name, tagline, address, phone, website, email, cin, gst }
 * @param {string} [accentColor='#1C47C9'] – divider / accent colour
 */
export const buildDocHeader = (logo, company = {}, accentColor = '#1C47C9') => {
  const hasLogo = logo && logo !== fallbackLogo;

  // Left cell: logo image constrained to fit the 42%-wide column
  // 42% of 794px = 333px; minus 38px left pad + 16px right pad = 279px usable
  const logoCell = hasLogo
    ? `<img src="${logo}" alt="Logo"
          style="max-height:76px;max-width:260px;width:auto;height:auto;display:block;
                 object-fit:contain;object-position:left center;" />`
    : `<div style="font-size:16pt;font-weight:800;color:#111;letter-spacing:-.3px;line-height:1.1;">${esc(company.name)}</div>`;

  // Right cell info lines — only render lines that have a value
  const infoLines = [];
  if (company.phone)
    infoLines.push(`<div style="font-size:9pt;font-weight:700;color:#111;margin-bottom:2px;letter-spacing:.2px;">${esc(company.phone)}</div>`);
  if (company.website)
    infoLines.push(`<div style="font-size:8pt;color:#333;margin-bottom:1px;">${esc(company.website)}</div>`);
  if (company.email)
    infoLines.push(`<div style="font-size:7.5pt;color:#555;margin-bottom:1px;">${esc(company.email)}</div>`);
  if (company.address)
    infoLines.push(`<div style="font-size:7.5pt;color:#555;line-height:1.45;margin-bottom:1px;">${esc(company.address).replace(/\n/g, '<br/>')}</div>`);
  if (company.cin)
    infoLines.push(`<div style="font-size:7pt;color:#777;">CIN: ${esc(company.cin)}</div>`);
  if (company.gst)
    infoLines.push(`<div style="font-size:7pt;color:#777;">GST: ${esc(company.gst)}</div>`);

  const rightBlock = `
    ${company.name    ? `<div style="font-size:10.5pt;font-weight:800;color:#111;letter-spacing:-.2px;margin-bottom:2px;line-height:1.15;">${esc(company.name)}</div>` : ''}
    ${company.tagline ? `<div style="font-size:7.5pt;color:#555;font-style:italic;margin-bottom:4px;">${esc(company.tagline)}</div>` : ''}
    ${infoLines.join('')}
  `;

  // All padding in px — guaranteed identical across every PDF renderer
  return `
    <div style="width:100%;background:#fff;box-sizing:border-box;color-scheme:light;color:#000;">
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;color:#000;">
        <colgroup>
          <col style="width:42%;" />
          <col style="width:1px;" />
          <col />
        </colgroup>
        <tbody>
          <tr>
            <td style="padding:28px 16px 20px 38px;vertical-align:middle;">
              ${logoCell}
            </td>
            <td style="padding:20px 0;vertical-align:middle;">
              <div style="width:1px;background:#d1d5db;height:100%;min-height:60px;">&nbsp;</div>
            </td>
            <td style="padding:20px 38px 20px 20px;vertical-align:middle;text-align:right;">
              ${rightBlock}
            </td>
          </tr>
        </tbody>
      </table>
      <div style="height:3px;background:${accentColor};width:100%;font-size:0;line-height:0;">&nbsp;</div>
    </div>`;
};

/**
 * buildDocFooter(company, pageLabel)
 * Returns an HTML string for the document footer line.
 */
export const buildDocFooter = (company = {}, pageLabel = '') => {
  const parts = [company.address, company.email, company.phone].filter(Boolean);
  const text = parts.join('  |  ');
  return text
    ? `<div style="border-top:1.5px solid #000;padding:8px 38px;text-align:center;
                   font-size:8pt;color:#444;background:#fff;width:100%;
                   box-sizing:border-box;color-scheme:light;color:#000;">
         ${esc(text)}${pageLabel ? `<span style="float:right;font-size:7.5pt;">${esc(pageLabel)}</span>` : ''}
       </div>`
    : '';
};

/** HTML-escape helper */
const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
