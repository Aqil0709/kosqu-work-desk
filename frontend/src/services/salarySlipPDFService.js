import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import fallbackLogo from '../assets/img/company.png';
import fallbackStamp from '../assets/img/stamp.png';
import { brandingAPI } from './brandingAPI';
import { buildDocHeader, buildDocFooter } from './docHeaderService';
import { getWatermarkConfig, buildWatermarkLayer } from './documentWatermarkService';
import { applyWatermarkToPdfBytes, createPdfUrl, savePdfBytes } from './pdfPageWatermarkService';

export const salarySlipPDFService = {
  // Download salary slip from a DB salary record (employee self-service or admin view)
  downloadFromRecord: async (record) => {
    try {
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) branding = res.data.branding;
      } catch (_) {}

      const details = (() => {
        if (!record.details) return {};
        if (typeof record.details === 'object') return record.details;
        try { return JSON.parse(record.details); } catch (_) { return {}; }
      })();

      const earnings = {
        basic: Number(record.salary_basic || record.basic_salary || details.basic_salary || details.basic || 0),
        hra: Number(record.salary_hra || details.hra || 0),
        conveyance: Number(record.salary_travel_allowance || details.travel_allowance || details.conveyance || 0),
        medical: Number(record.salary_medical_allowance || details.medical_allowance || details.medical || 0),
        special: Number(record.salary_other_allowance || details.other_allowance || details.special_allowance || details.special || 0),
      };

      // Fallback: if breakdown sums to 0 but gross exists, put remainder in special allowance
      const earningsSum = Object.values(earnings).reduce((a, b) => a + b, 0);
      if (earningsSum === 0 && Number(record.gross_salary) > 0) {
        earnings.basic = Number(record.basic_salary || 0);
        earnings.special = Math.max(0, Number(record.gross_salary) - earnings.basic);
      }

      const formData = {
        fullName: `${record.first_name || ''} ${record.last_name || ''}`.trim() || 'Employee',
        monthYear: `${record.month || ''} ${record.year || ''}`.trim(),
        designation: record.position || record.designation || '',
        paymentMode: 'Bank Transfer',
        earnings,
        deductions: {
          pf: Number(record.epf_fixed_amount || record.salary_pf || details.pf || 0),
          pt: Number(record.salary_professional_tax || details.professional_tax || 0),
          tds: Number(record.tds_amount || details.tds || 0),
        },
      };

      const html = generateSalarySlipHTML(formData, branding, undefined, false);
      const pdfBytes = await generatePDFFromHTML(html);
      const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, getWatermarkConfig(branding));
      savePdfBytes(watermarkedBytes, `SalarySlip_${formData.fullName.replace(/\s+/g, '_')}_${(formData.monthYear || 'Slip').replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF from record:', err);
      throw err;
    }
  },

  downloadSalarySlip: async (formData) => {
    try {
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) branding = res.data.branding;
      } catch (err) { console.error("Failed to fetch branding data", err); }

      const html = generateSalarySlipHTML(formData, branding, undefined, false);
      const pdfBytes = await generatePDFFromHTML(html);
      const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, getWatermarkConfig(branding));
      savePdfBytes(watermarkedBytes, `SalarySlip_${formData.fullName.replace(/\s+/g, '_')}_${formData.monthYear.replace(/[\s,]+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  },

  viewSalarySlip: async (formData) => {
    try {
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) branding = res.data.branding;
      } catch (err) { console.error("Failed to fetch branding data", err); }

      const html = generateSalarySlipHTML(formData, branding, undefined, false);
      const pdfBytes = await generatePDFFromHTML(html);
      const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, getWatermarkConfig(branding));
      const blobUrl = createPdfUrl(watermarkedBytes);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      throw error;
    }
  }
};

const generatePDFFromHTML = async (html) => {
  const tempDiv = document.createElement('div');
  tempDiv.style.cssText = 'position:absolute;left:-9999px;top:0;width:794px;background:#fff;font-family:Arial,sans-serif;color:#000;box-sizing:border-box;color-scheme:light;';
  tempDiv.innerHTML = html;
  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdfW = 210;
    const pdfH = Math.max(297, (canvas.height / canvas.width) * pdfW);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfW, pdfH],
    });

    const imgH = (canvas.height / canvas.width) * pdfW;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, imgH);
    return pdf.output('arraybuffer');
  } finally {
    document.body.removeChild(tempDiv);
  }
};

const formatCurrency = (amt) => {
  return new Intl.NumberFormat('en-IN').format(amt || 0);
};

const generateSalarySlipHTML = (data, branding, wmConfig = null, includeHtmlWatermark = true) => {
  if (!wmConfig) wmConfig = getWatermarkConfig(branding);
  const totalEarnings = Object.values(data.earnings).reduce((a, b) => a + Number(b), 0);
  const totalDeductions = Object.values(data.deductions).reduce((a, b) => a + Number(b), 0);
  const netPay = totalEarnings - totalDeductions;

  const company_name = branding?.company_name || '';
  const company_address = branding?.company_address ? branding.company_address.replace(/\n/g, '<br />') : '';
  const hr_name = branding?.hr_name || '';
  const hr_designation = branding?.hr_designation || '';

  const logo_url = branding?.logo_url ? brandingAPI.getImageUrl(branding.logo_url) : fallbackLogo;
  const stamp_url = branding?.stamp_url ? brandingAPI.getImageUrl(branding.stamp_url) : fallbackStamp;
  const signature_url = branding?.signature_url ? brandingAPI.getImageUrl(branding.signature_url) : null;

  const company_address_inline = branding?.company_address ? branding.company_address.replace(/\n/g, ', ') : '';
  const company = {
    name:    company_name,
    tagline: branding?.company_tagline || '',
    address: branding?.company_address || '',
    email:   branding?.company_email   || '',
    phone:   branding?.company_phone   || '',
    website: branding?.company_website || '',
    cin:     branding?.company_cin     || '',
    gst:     branding?.company_gst     || '',
  };

  return `
    <div style="position:relative;font-family:Arial,sans-serif;color:#000;width:100%;background:#fff;box-sizing:border-box;color-scheme:light;overflow:hidden;">
      ${includeHtmlWatermark ? buildWatermarkLayer(wmConfig) : ''}
      <div style="position:relative;z-index:1;width:100%;">

      <!-- ── Header (identical to Offer Letter) ── -->
      ${buildDocHeader(logo_url, company, '#1C47C9')}

      <!-- ── Body ── -->
      <div style="padding:18px 38px 20px 38px;">
        <div style="text-align:center;font-size:15pt;font-weight:bold;margin-bottom:20px;">Employee Salary Slip</div>

        <div style="font-size:11pt;line-height:1.8;margin-bottom:24px;">
          <p style="margin:4px 0;"><strong>Employee Name:</strong> ${data.fullName}</p>
          <p style="margin:4px 0;"><strong>Month &amp; Year:</strong> ${data.monthYear}</p>
          <p style="margin:4px 0;"><strong>Designation:</strong> ${data.designation}</p>
          <p style="margin:16px 0 8px 0;"><strong>Salary paid by ${data.paymentMode || 'Bank Transfer'}:</strong></p>
        </div>

        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:40px;font-size:11pt;">
          <thead>
            <tr>
              <th style="border:1.5px solid #000;padding:14px 10px;text-align:left;background:#f8fafc;font-weight:700;">Earnings (₹)</th>
              <th style="border:1.5px solid #000;padding:14px 10px;text-align:right;background:#f8fafc;font-weight:700;">Amount (₹)</th>
              <th style="border:1.5px solid #000;padding:14px 10px;text-align:left;background:#f8fafc;font-weight:700;">Deductions (₹)</th>
              <th style="border:1.5px solid #000;padding:14px 10px;text-align:right;background:#f8fafc;font-weight:700;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="border:1.5px solid #000;padding:12px 10px;">Basic Salary</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.earnings.basic)}</td><td style="border:1.5px solid #000;padding:12px 10px;">Provident Fund (PF)</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.deductions.pf)}</td></tr>
            <tr><td style="border:1.5px solid #000;padding:12px 10px;">House Rent Allowance</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.earnings.hra)}</td><td style="border:1.5px solid #000;padding:12px 10px;">Professional Tax (PT)</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.deductions.pt)}</td></tr>
            <tr><td style="border:1.5px solid #000;padding:12px 10px;">Conveyance Allowance</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.earnings.conveyance)}</td><td style="border:1.5px solid #000;padding:12px 10px;">Income Tax (TDS)</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.deductions.tds)}</td></tr>
            <tr><td style="border:1.5px solid #000;padding:12px 10px;">Medical Allowance</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.earnings.medical)}</td><td style="border:1.5px solid #000;padding:12px 10px;font-weight:bold;">Total Deductions</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;font-weight:bold;">₹ ${formatCurrency(totalDeductions)}</td></tr>
            <tr><td style="border:1.5px solid #000;padding:12px 10px;">Special Allowance</td><td style="border:1.5px solid #000;padding:12px 10px;text-align:right;">₹ ${formatCurrency(data.earnings.special)}</td><td colspan="2" style="border:1.5px solid #000;padding:12px 10px;"></td></tr>
            <tr style="background:#f1f5f9;">
              <td style="border:1.5px solid #000;padding:14px 10px;font-weight:bold;">Total Earnings</td>
              <td style="border:1.5px solid #000;padding:14px 10px;text-align:right;font-weight:bold;">₹ ${formatCurrency(totalEarnings)}</td>
              <td style="border:1.5px solid #000;padding:14px 10px;font-weight:bold;">Net Pay (Take-home)</td>
              <td style="border:1.5px solid #000;padding:14px 10px;text-align:right;font-weight:bold;">₹ ${formatCurrency(netPay)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Signatures row -->
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-top:60px;">
          <tr>
            <td style="width:50%;vertical-align:bottom;text-align:center;">
              <div style="height:50px;"></div>
              <div style="border-top:1.5px solid #000;width:180px;margin:0 auto;padding-top:5px;">
                <p style="font-size:10pt;font-weight:bold;margin:0;">Employee Signature</p>
              </div>
            </td>
            <td style="width:50%;vertical-align:bottom;text-align:right;position:relative;">
              ${stamp_url ? `<img src="${stamp_url}" alt="Stamp" style="height:80px;width:auto;max-width:120px;position:absolute;right:0;top:-65px;opacity:0.9;object-fit:contain;">` : ''}
              ${signature_url ? `<img src="${signature_url}" alt="Signature" style="height:40px;margin-bottom:4px;object-fit:contain;display:block;margin-left:auto;">` : '<div style="height:44px;"></div>'}
              ${hr_name ? `<p style="font-weight:bold;margin:0;font-size:11pt;">${hr_name}</p>` : ''}
              ${hr_designation ? `<p style="font-size:9pt;margin:2px 0;">${hr_designation}</p>` : ''}
              ${company_name ? `<p style="font-weight:bold;margin:0;font-size:10pt;">${company_name}</p>` : ''}
            </td>
          </tr>
        </table>
      </div>

      <!-- ── Footer ── -->
      ${buildDocFooter(company)}
      </div><!-- end z-index:1 content wrapper -->
    </div><!-- end page wrapper -->
  `;
};
