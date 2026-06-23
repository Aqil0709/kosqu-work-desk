import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import fallbackLogo from '../assets/img/company.png';
import fallbackStamp from '../assets/img/stamp.png';
import { brandingAPI } from './brandingAPI';
import { buildDocHeader, buildDocFooter } from './docHeaderService';
import { getWatermarkConfig, buildWatermarkLayer } from './documentWatermarkService';
import { applyWatermarkToPdfBytes, createPdfUrl, savePdfBytes } from './pdfPageWatermarkService';

export const resignationPDFService = {
  generatePDFBlob: async (pdfData) => {
    try {
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) branding = res.data.branding;
      } catch (err) { console.error("Failed to load branding", err); }
      
      const fullData = {
        ...pdfData,
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
        hr: {
          name: branding.hr_name || "HR Name",
          designation: branding.hr_designation || "HR Designation",
          signature: branding.signature_url ? brandingAPI.getImageUrl(branding.signature_url) : null
        },
        logo: branding.logo_url ? brandingAPI.getImageUrl(branding.logo_url) : fallbackLogo,
        stamp: branding.stamp_url ? brandingAPI.getImageUrl(branding.stamp_url) : fallbackStamp
      };

      const wmConfig = getWatermarkConfig(branding);
      const htmlContent = generateLetterHTML(fullData, wmConfig, false);
      const pdfBytes = await generatePDF(htmlContent);
      const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, wmConfig);
      return new Blob([watermarkedBytes], { type: 'application/pdf' });

    } catch (error) {
      console.error('Error generating resignation letter:', error);
      throw error;
    }
  }
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Delegate to shared header service
const commonHeader = (logo, company = {}) =>
  buildDocHeader(logo, company, '#1C47C9');

const generateLetterHTML = ({ employeeName, joiningDate, requestedLastDay, hrNote, company, hr, logo, stamp, generatedAt, refNumber }, wmConfig = null, includeHtmlWatermark = true) => {
  const joinDate = new Date(joiningDate);
  const leaveDate = new Date(requestedLastDay);
  let tenure = "";
  if (!isNaN(joinDate) && !isNaN(leaveDate)) {
    let diffObj = diffDates(joinDate, leaveDate);
    tenure = `${diffObj.years} Years, ${diffObj.months} Months`;
  }

  const wm = buildWatermarkLayer(wmConfig);
  return `
    <div style="position:relative;font-family: Arial, sans-serif; color: #000; line-height: 1.6; min-height: 297mm; display: flex; flex-direction: column; overflow:hidden;">
      ${includeHtmlWatermark ? wm : ''}
      <div style="position:relative;z-index:1;width:100%;display:flex;flex-direction:column;min-height:297mm;">
      ${commonHeader(logo, company)}
      <div style="padding: 10mm 10mm 20mm 10mm; flex-grow: 1;">
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div style="width: 50%;">
            <div style="font-weight: bold; font-size: 12pt;">Date: ${formatShortDate(generatedAt)}</div>
          </div>
          <div style="text-align: right; width: 45%;">
            <div style="font-weight: bold; font-size: 12pt;">Ref No: ${refNumber || '-'}</div>
          </div>
        </div>

        <div style="font-weight: bold; font-size: 12pt; margin-bottom: 25px;">
          Dear ${employeeName || 'Employee'},
        </div>

        <div style="text-align: justify; font-size: 11pt; font-family: 'Times New Roman', Times, serif;">
          <p>This letter is to acknowledge the receipt of your resignation letter. We hereby accept your resignation effective <strong>${formatShortDate(requestedLastDay)}</strong>.</p>
          
          ${hrNote ? `<p>${hrNote}</p>` : ''}
          
          <p>We thank you for your contributions to <strong>${company.name}</strong> during your tenure of <strong>${tenure}</strong>.</p>
          
          <p>Wishing you the best in your future endeavors.</p>
        </div>

        <div style="margin-top: 60px; display: flex; flex-direction: column; align-items: flex-start;">
          <div style="text-align: left; font-family: Arial, sans-serif;">
            ${hr.signature ? `<img src="${hr.signature}" alt="Signature" style="height: 50px; margin-bottom: 5px; object-fit: contain;">` : '<div style="height:50px"></div>'}
            ${stamp ? `<img src="${stamp}" alt="Stamp" style="height: 80px; width: auto; max-width: 130px; object-fit: contain; margin-bottom: 5px; position: absolute; margin-top:-30px; opacity: 0.8; z-index:-1;">` : ''}
            <div>
              <div style="font-weight: bold; font-size: 11pt; margin-bottom: 4px;">Regards,</div>
              <div style="font-weight: bold; font-size: 11pt; margin-bottom: 2px;">${hr.name}</div>
              <div style="font-size: 10pt; margin-bottom: 2px;">${hr.designation}</div>
              <div style="font-weight: bold; font-size: 10pt;">${company.name}</div>
            </div>
          </div>
        </div>

      </div>
      <div style="margin-top: 'auto'; border-top: 3px solid #000; padding: 15px 20px; text-align: center; font-size: 10pt; font-weight: bold; background: #fff; width: 100%; box-sizing: border-box; white-space: pre-line;">
        ${company.address}
      </div>
      </div><!-- end z-index:1 content -->
    </div><!-- end page wrapper -->
  `;
};

// Helper inside file for date diffs
function diffDates(date1, date2) {
  let d1 = new Date(Math.min(date1, date2));
  let d2 = new Date(Math.max(date1, date2));
  let years = d2.getFullYear() - d1.getFullYear();
  let months = d2.getMonth() - d1.getMonth();
  if (months < 0) { years--; months += 12; }
  return { years, months };
}

const generatePDF = async (htmlContent) => {
  return new Promise(async (resolve, reject) => {
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.minHeight = '297mm';
      tempDiv.style.padding = '0';
      tempDiv.style.fontFamily = "Arial, sans-serif";
      tempDiv.style.background = 'white';
      tempDiv.style.color = '#333';
      
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      const canvas = await html2canvas(tempDiv, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      document.body.removeChild(tempDiv);

      resolve(await pdf.output('arraybuffer'));
    } catch (error) {
      reject(error);
    }
  });
};
