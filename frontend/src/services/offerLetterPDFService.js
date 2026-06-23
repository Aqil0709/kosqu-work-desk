import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import fallbackLogo from '../assets/img/company.png';
import fallbackStamp from '../assets/img/stamp.png';
import { brandingAPI } from './brandingAPI';
import { buildDocHeader, buildDocFooter } from './docHeaderService';
import { getWatermarkConfig, buildWatermarkLayer } from './documentWatermarkService';
import { applyWatermarkToPdfBytes, createPdfUrl, savePdfBytes } from './pdfPageWatermarkService';

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (v) => v ? Number(v).toLocaleString('en-IN') : '0';

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const monthlyCtc = (formData) => {
  if (formData.totalEarning) return Number(formData.totalEarning);
  if (formData.ctc) return Math.round(Number(formData.ctc) / 12);
  return 0;
};

const annualCtc = (formData) => {
  if (formData.ctc) return Number(formData.ctc);
  if (formData.totalEarning) return Number(formData.totalEarning) * 12;
  return 0;
};

// ── PDF page renderer ─────────────────────────────────────────────────────────

const A4_PX = 794;

const renderPage = async (html) => {
  const div = document.createElement('div');
  div.style.cssText = `position:absolute;left:-9999px;top:0;width:${A4_PX}px;background:#fff;font-family:Arial,sans-serif;color:#000;box-sizing:border-box;color-scheme:light;`;
  div.innerHTML = html;
  document.body.appendChild(div);
  try {
    const canvas = await html2canvas(div, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: A4_PX });
    return canvas;
  } finally {
    document.body.removeChild(div);
  }
};

const buildPDF = async (pages) => {
  const pdfW = 210;
  let pdf = null;
  for (let i = 0; i < pages.length; i++) {
    const canvas = await renderPage(pages[i]);
    const img = canvas.toDataURL('image/png');
    const imgH = (canvas.height / canvas.width) * pdfW;
    const pageH = Math.max(297, imgH);
    if (i === 0) {
      pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pageH] });
    } else {
      pdf.addPage([pdfW, pageH], 'portrait');
    }
    pdf.addImage(img, 'PNG', 0, 0, pdfW, imgH);
  }
  return pdf.output('arraybuffer');
};

// ── Header & layout constants ──────────────────────────────────────────────────
// 1 cm on A4 @ 794px canvas: 794*(10/210) ≈ 38px
const MARGIN = 38; // px

// Delegate to shared header service (same design used by all HR docs)
const header = (logo, company) => buildDocHeader(logo, company, '#1C47C9');

// ── Section renderers ─────────────────────────────────────────────────────────

const BASE_STYLE = `width:100%;background:#fff;box-sizing:border-box;color-scheme:light;`;
const BODY_STYLE = `padding:18px ${MARGIN}px 36px ${MARGIN}px;font-size:10.5pt;line-height:1.65;color:#111;font-family:Arial,sans-serif;`;

const renderSectionContent = (section) => {
  const { type, content, items, tableData } = section;

  switch (type) {
    case 'paragraph':
      return `<p style="margin:0 0 12px;text-align:justify;">${content || ''}</p>`;

    case 'bullet_list':
      if (!Array.isArray(items) || items.length === 0) return '';
      return `<ul style="margin:0 0 14px 20px;padding:0;">${items.map(i => `<li style="margin-bottom:5px;text-align:justify;">${i}</li>`).join('')}</ul>`;

    case 'numbered_list':
      if (!Array.isArray(items) || items.length === 0) return '';
      return `<ol style="margin:0 0 14px 20px;padding:0;">${items.map(i => `<li style="margin-bottom:5px;text-align:justify;">${i}</li>`).join('')}</ol>`;

    case 'table':
      if (!tableData) return '';
      return `
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:16px;">
          ${(tableData.headers || []).length > 0 ? `
          <thead>
            <tr style="background:#1C47C9;color:#fff;">
              ${tableData.headers.map(h => `<th style="padding:8px 10px;border:1px solid #1C47C9;text-align:left;">${h}</th>`).join('')}
            </tr>
          </thead>` : ''}
          <tbody>
            ${(tableData.rows || []).map((row, ri) => `
            <tr style="${ri % 2 === 0 ? 'background:#f8fafc;' : ''}">
              ${Array.isArray(row) ? row.map(cell => `<td style="padding:7px 10px;border:1px solid #ddd;">${cell}</td>`).join('') : ''}
            </tr>`).join('')}
          </tbody>
        </table>`;

    case 'signature_block':
      return `
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:30px;">
          <div>
            <div style="margin-top:50px;padding-top:8px;border-top:1.5px solid #000;width:200px;">
              <div style="font-weight:700;">Authorised Signatory</div>
              <div style="color:#555;font-size:10pt;">${content || ''}</div>
            </div>
          </div>
          <div>
            <div style="margin-top:50px;padding-top:8px;border-top:1.5px solid #000;width:220px;">
              <div style="font-weight:700;">Candidate Signature</div>
              <div style="color:#555;font-size:10pt;margin-top:5px;">Date: _____________________</div>
            </div>
          </div>
        </div>`;

    default:
      return content ? `<p style="margin:0 0 12px;">${content}</p>` : '';
  }
};

const buildSectionHtml = (section, idx) => {
  if (!section.visible) return '';
  const titleHtml = section.title
    ? `<p style="margin:0 0 8px;"><strong>${idx != null ? `${idx + 1}. ` : ''}${section.title}</strong></p>`
    : '';
  return titleHtml + renderSectionContent(section);
};

// ── Page layout helpers ───────────────────────────────────────────────────────

const coverBlock = (formData, company) => `
  <div style="text-align:center;font-size:15pt;font-weight:bold;letter-spacing:2px;margin:18px 0 22px;text-transform:uppercase;">
    Offer of Employment
  </div>
  <div style="text-align:right;font-size:10pt;margin-bottom:18px;">
    <strong>Date:</strong> ${fmtDate(formData.issueDate)}
  </div>
  <div style="margin-bottom:16px;line-height:1.8;">
    To,<br/>
    <strong>${formData.salutation || ''} ${formData.fullName || '[Name]'}</strong><br/>
    ${formData.address ? formData.address.replace(/\n/g, '<br/>') + '<br/>' : ''}
    ${formData.phone ? `Tel: ${formData.phone}<br/>` : ''}
    ${formData.email ? `Email: ${formData.email}` : ''}
  </div>
  <p style="margin:0 0 10px;"><strong>Congratulations!</strong></p>
  <p style="margin:0 0 10px;text-align:justify;">
    We are pleased to offer you the position of <strong>${formData.designation || '[Designation]'}</strong>${company.name ? ` at <strong>${company.name}</strong>` : ''}.
    Your place of posting will be <strong>${formData.location || '[Location]'}</strong>.
    You are requested to join your duties on or before <strong>${fmtDate(formData.joiningDate) || '[Joining Date]'}</strong>.
  </p>`;

const annexure1Block = (formData) => {
  const m = (f) => Number(formData[f] || 0);
  const monthly = {
    gross:    m('totalEarning') || Math.round(annualCtc(formData) / 12),
    basic:    m('basicSalary'),
    hra:      m('hra'),
    travel:   m('conveyanceAllowance'),
    medical:  m('medicalAllowance'),
    special:  m('specialAllowance'),
    pf:       m('employerPf'),
    esic:     m('employerEsi'),
    pt:       m('professionalTax'),
    tds:      m('tds'),
    takeHome: m('netPay'),
  };
  const compRow = (label, mo, hi = false) => {
    const s = hi ? 'background:#dbeafe;font-weight:700;' : '';
    return `<tr><td style="padding:8px 12px;border:1px solid #ccc;${s}">${label}</td><td style="padding:8px 12px;border:1px solid #ccc;text-align:right;${s}">₹ ${fmtINR(mo)}</td><td style="padding:8px 12px;border:1px solid #ccc;text-align:right;${s}">₹ ${fmtINR(mo * 12)}</td></tr>`;
  };
  return `
    <div style="text-align:center;font-size:13pt;font-weight:bold;margin-bottom:22px;letter-spacing:.5px;">
      Annexure 1 – Compensation Structure
    </div>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:10pt;">
      <tr><td style="padding:7px 12px;border:1px solid #ccc;font-weight:700;width:35%;">Name</td><td style="padding:7px 12px;border:1px solid #ccc;">${formData.fullName || ''}</td></tr>
      <tr><td style="padding:7px 12px;border:1px solid #ccc;font-weight:700;">Designation</td><td style="padding:7px 12px;border:1px solid #ccc;">${formData.designation || ''}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:10.5pt;">
      <thead><tr style="background:#1C47C9;color:#fff;">
        <th style="padding:10px 12px;border:1px solid #1C47C9;text-align:left;width:50%;">Particulars</th>
        <th style="padding:10px 12px;border:1px solid #1C47C9;text-align:right;width:25%;">Monthly (₹)</th>
        <th style="padding:10px 12px;border:1px solid #1C47C9;text-align:right;width:25%;">Annual (₹)</th>
      </tr></thead>
      <tbody>
        ${compRow('Gross Salary', monthly.gross, true)}
        ${compRow('Basic + DA', monthly.basic)}
        ${compRow('HRA', monthly.hra)}
        ${compRow('Travel Allowance', monthly.travel)}
        ${compRow('Medical Allowance', monthly.medical)}
        ${compRow('Special Allowance', monthly.special)}
        <tr><td colspan="3" style="padding:7px 12px;border:1px solid #ccc;font-weight:700;background:#f1f5f9;text-align:center;font-size:9.5pt;text-transform:uppercase;letter-spacing:.5px;">Deductions</td></tr>
        ${compRow('Provident Fund (PF)', monthly.pf)}
        ${compRow('ESIC', monthly.esic)}
        ${compRow('Professional Tax (PT)', monthly.pt)}
        ${monthly.tds ? compRow('TDS', monthly.tds) : ''}
        ${compRow('Total Take Home', monthly.takeHome, true)}
      </tbody>
    </table>`;
};

const annexure2Block = () => {
  const docs = [
    'Proof of Age & ID (Aadhaar Card / Driver License / PAN Card / 10th Certificate)',
    'Proof of Residence (Aadhaar / Phone Bill / Ration Card / Voter ID)',
    'Educational Qualification Certificates (Graduation / Post-Graduation)',
    'Updated Resume (Latest CV)',
    'Bank Account Details (Passbook / Cancelled Cheque)',
    'PAN Card (Photocopy)',
    'Passport Size Photograph (2 copies)',
    'Resignation Letter from Previous Employer (Copy)',
    'Relieving Letter from Previous Employer (Copy)',
    'Last 3 Months Salary Slips or Bank Statement',
    'EPF / UAN Details (EPF Number if applicable)',
  ];
  return `
    <div style="text-align:center;font-size:13pt;font-weight:bold;margin-bottom:22px;letter-spacing:.5px;">
      Annexure 2 – Documents Required at Time of Joining
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:10pt;margin-bottom:26px;">
      <thead><tr style="background:#1C47C9;color:#fff;">
        <th style="padding:9px 10px;border:1px solid #1C47C9;text-align:center;width:8%;">Sr.</th>
        <th style="padding:9px 10px;border:1px solid #1C47C9;text-align:left;">Document Required</th>
        <th style="padding:9px 10px;border:1px solid #1C47C9;text-align:center;width:10%;">&#9744;</th>
      </tr></thead>
      <tbody>
        ${docs.map((d, i) => `<tr style="${i % 2 === 0 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">${i + 1}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;">${d}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;font-size:14pt;">&#9744;</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p style="margin:0 0 6px;font-size:10pt;text-align:justify;">
      For more detailed information, please read the HR Policy Book. If you choose to accept this offer, kindly sign and return the second copy of this letter.
    </p>
    <p style="margin:16px 0 40px;font-style:italic;font-size:10pt;">
      I agree and accept this Offer Letter which has been read, understood and accepted by me.
    </p>`;
};

// ── Default sections ──────────────────────────────────────────────────────────

export const getDefaultSections = () => [
  {
    id: 'intro',
    title: '',
    type: 'paragraph',
    content: 'This role is designed to provide you with hands-on experience in software development, working on live projects and product requirements.',
    visible: true,
    fixed: false,
  },
  {
    id: 'responsibilities',
    title: 'Role & Responsibilities',
    type: 'bullet_list',
    items: [
      'Developing and maintaining web applications, APIs, and backend services',
      'Working with modern frameworks and related technologies',
      'Designing, developing, and optimizing database structures and data models',
      'Supporting frontend development and integration',
      'Developing and consuming RESTful APIs and integrating third-party services',
      'Participating in software development, debugging, testing, and deployment activities',
      'Writing clean, scalable, secure, and efficient code as per project requirements',
      'Collaborating with cross-functional teams to ensure timely project delivery',
      'Maintaining project documentation and following coding best practices',
      'Learning and adapting to new technologies and development methodologies as required',
    ],
    visible: true,
    fixed: false,
  },
  {
    id: 'compensation',
    title: 'Compensation Structure',
    type: 'paragraph',
    content: 'Your Cost to Company (CTC) will be discussed as per the salary annexure. A detailed salary structure is provided in Annexure 1.',
    visible: true,
    fixed: true, // replaced dynamically with actual salary data
    isAnnexure1: true,
  },
  {
    id: 'working_hours',
    title: 'Working Hours & Weekly Off',
    type: 'bullet_list',
    items: [
      'Working Days: 6 days per week (subject to client/project requirements)',
      'Office Timings: 09:00 AM to 06:00 PM (subject to client/project requirements)',
      'Weekly Off: Sunday',
      'Employees are required to report to the office on the 1st and 4th Saturday of every month',
    ],
    note: 'Working schedules may vary depending on client requirements and project demands. You may be required to work beyond regular hours based on business needs.',
    visible: true,
    fixed: false,
  },
  {
    id: 'leave_policy',
    title: 'Leave Policy',
    type: 'bullet_list',
    items: [
      'You will be entitled to 12 days of paid leave annually after confirmation',
      'A maximum of 6 leaves can be taken at one time',
      'Leaves during ongoing project assignments may be restricted',
      'Leave requests must be submitted at least one month in advance',
      'Unapproved leave or excessive absenteeism may lead to disciplinary action',
    ],
    visible: true,
    fixed: false,
  },
  {
    id: 'confidentiality',
    title: 'Confidentiality & Code of Conduct',
    type: 'bullet_list',
    items: [
      'You are required to maintain strict confidentiality regarding company data, client information, and internal processes',
      'Any unauthorized disclosure or misuse of company information is strictly prohibited',
      'All company policies, including data security and professional conduct, must be adhered to',
      'Any violation may result in disciplinary action as per company policy and applicable laws',
    ],
    visible: true,
    fixed: false,
  },
  {
    id: 'documentation',
    title: 'Documentation Requirement',
    type: 'paragraph',
    content: 'This offer is subject to successful verification of your documents and background checks. You are required to submit the necessary documents at the time of joining as mentioned in Annexure 2.',
    visible: true,
    fixed: false,
  },
  {
    id: 'performance',
    title: 'Performance & Compensation Review',
    type: 'bullet_list',
    items: [
      'Any salary increment or revision will be based on individual performance as well as business growth',
      'Increment in compensation will be considered only if there is a corresponding increase in billing/revenue',
      'The decision regarding increment will be at the sole discretion of the management',
    ],
    visible: true,
    fixed: false,
  },
  {
    id: 'general_terms',
    title: 'General Terms',
    type: 'bullet_list',
    items: [
      'This offer is valid for 5 days from the date of issuance',
      'Employment terms may be governed by company policies, which may be updated from time to time',
      'You are expected to comply with all organizational rules and regulations',
    ],
    visible: true,
    fixed: false,
  },
  {
    id: 'annexure2',
    title: 'Annexure 2 – Documents Required',
    type: 'paragraph',
    content: '',
    visible: true,
    fixed: true,
    isAnnexure2: true,
  },
];

// ── Page assembly ─────────────────────────────────────────────────────────────

const assemblePagesFromSections = (formData, company, logo, sections, wmConfig = null, includeHtmlWatermark = true) => {
  const visibleSections = (sections || getDefaultSections()).filter(s => s.visible);

  // Separate annexure 2 (always on its own page)
  const annexure2 = visibleSections.find(s => s.isAnnexure2);
  const mainSections = visibleSections.filter(s => !s.isAnnexure2);

  let numberedIdx = 0;

  const renderSection = (s) => {
    if (s.fixed && s.isAnnexure1) {
      return `<p style="margin:0 0 8px;"><strong>${++numberedIdx}. ${s.title}</strong></p>
        <p style="margin:0 0 6px;text-align:justify;">
          Your Cost to Company (CTC) will be
          <strong>₹${fmtINR(annualCtc(formData))} per annum (₹${fmtINR(monthlyCtc(formData))} per month)</strong>.
        </p>
        <p style="margin:0;">A detailed salary structure is provided in Annexure 1.</p>`;
    }

    const hasTitle = s.title && !s.fixed;
    if (hasTitle) {
      numberedIdx++;
      return `<p style="margin:0 0 8px;"><strong>${numberedIdx}. ${s.title}</strong></p>${renderSectionContent(s)}
        ${s.note ? `<p style="margin:0 0 14px;text-align:justify;">${s.note}</p>` : ''}`;
    }
    return renderSectionContent(s) + (s.note ? `<p style="margin:0 0 14px;text-align:justify;">${s.note}</p>` : '');
  };

  const wm = includeHtmlWatermark ? buildWatermarkLayer(wmConfig) : '';
  const wrapPage = (innerHtml) =>
    `<div style="${BASE_STYLE}position:relative;overflow:hidden;">
       ${wm}
       <div style="position:relative;z-index:1;width:100%;">${innerHtml}</div>
     </div>`;

  const pages = [];

  // Page 1 — Cover + first sections
  const page1Body = coverBlock(formData, company) + mainSections.slice(0, 3).map(renderSection).join('');
  pages.push(wrapPage(`${header(logo, company)}<div style="${BODY_STYLE}">${page1Body}</div>`));

  // Page 2 — remaining main sections
  if (mainSections.length > 3) {
    const page2Body = mainSections.slice(3).map(renderSection).join('');
    pages.push(wrapPage(`${header(logo, company)}<div style="${BODY_STYLE}">${page2Body}</div>`));
  }

  // Annexure 1 page — salary breakdown
  pages.push(wrapPage(`${header(logo, company)}<div style="${BODY_STYLE}">${annexure1Block(formData)}</div>`));

  // Annexure 2 page — documents checklist + signature
  if (!annexure2 || annexure2.visible) {
    pages.push(wrapPage(`${header(logo, company)}<div style="${BODY_STYLE}">${annexure2Block()}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;">
        <div>
          <div style="margin-top:50px;padding-top:8px;border-top:1.5px solid #000;width:200px;">
            <div style="font-weight:700;">Authorised Signatory</div>
            <div style="color:#555;font-size:10pt;">${company.name || ''}</div>
          </div>
        </div>
        <div>
          <div style="margin-top:50px;padding-top:8px;border-top:1.5px solid #000;width:220px;">
            <div style="font-weight:700;">${formData.salutation || ''} ${formData.fullName || '____________________'}</div>
            <div style="color:#555;font-size:10pt;">${formData.designation || ''}</div>
            <div style="color:#555;font-size:10pt;margin-top:5px;">Date: _____________________</div>
          </div>
        </div>
      </div>
    </div>`));
  }

  return pages;
};

// ── Public API ────────────────────────────────────────────────────────────────

const getBranding = async () => {
  try {
    const res = await brandingAPI.get();
    if (res.data?.success && res.data?.branding) return res.data.branding;
  } catch (_) {}
  return {};
};

const buildCtx = (branding, formData) => ({
  formData,
  company: {
    name:    branding.company_name    || '',
    tagline: branding.company_tagline || '',
    address: branding.company_address || '',
    email:   branding.company_email   || '',
    website: branding.company_website || '',
    phone:   branding.company_phone   || '',
    cin:     branding.company_cin     || '',
    gst:     branding.company_gst     || '',
  },
  logo:  branding.logo_url  ? brandingAPI.getImageUrl(branding.logo_url)  : fallbackLogo,
  stamp: branding.stamp_url ? brandingAPI.getImageUrl(branding.stamp_url) : fallbackStamp,
});

export const offerLetterPDFService = {
  downloadOfferLetter: async (formData, sections) => {
    const branding = await getBranding();
    const ctx = buildCtx(branding, formData);
    const wmConfig = getWatermarkConfig(branding);
    const pages = assemblePagesFromSections(ctx.formData, ctx.company, ctx.logo, sections || formData.sections, wmConfig, false);
    const pdfBytes = await buildPDF(pages);
    const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, wmConfig);
    savePdfBytes(watermarkedBytes, `OfferLetter_${(formData.fullName || 'Employee').replace(/\s+/g, '_')}.pdf`);
  },

  viewOfferLetter: async (formData, sections) => {
    const branding = await getBranding();
    const ctx = buildCtx(branding, formData);
    const wmConfig = getWatermarkConfig(branding);
    const pages = assemblePagesFromSections(ctx.formData, ctx.company, ctx.logo, sections || formData.sections, wmConfig, false);
    const pdfBytes = await buildPDF(pages);
    const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, wmConfig);
    const blobUrl = createPdfUrl(watermarkedBytes);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  },

  // Returns HTML strings for the live in-page preview — identical to PDF output
  getPreviewPages: (formData, branding, sections) => {
    const ctx = buildCtx(branding, formData);
    const wmConfig = getWatermarkConfig(branding);
    return assemblePagesFromSections(ctx.formData, ctx.company, ctx.logo, sections || formData.sections, wmConfig);
  },
};

export default offerLetterPDFService;
