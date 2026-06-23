import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import fallbackLogo from '../assets/img/company.png';
import fallbackStamp from '../assets/img/stamp.png';
import { brandingAPI } from './brandingAPI';
import { buildDocHeader, buildDocFooter } from './docHeaderService';
import { getWatermarkConfig, buildWatermarkLayer, buildWatermarkCSS, buildWatermarkImgTag } from './documentWatermarkService';
import { applyWatermarkToPdfBytes, createPdfBlob, createPdfUrl, savePdfBytes } from './pdfPageWatermarkService';

export const incrementPDFService = {
  generatePDFBlob: async (pdfData) => {
    try {
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) {
          branding = res.data.branding;
        }
      } catch (err) { 
        console.warn("Failed to load branding, using defaults", err); 
      }
      
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
          name: branding.hr_name || '',
          designation: branding.hr_designation || '',
          signature: branding.signature_url ? brandingAPI.getImageUrl(branding.signature_url) : null
        },
        logo: branding.logo_url ? brandingAPI.getImageUrl(branding.logo_url) : fallbackLogo,
        stamp: branding.stamp_url ? brandingAPI.getImageUrl(branding.stamp_url) : fallbackStamp
      };

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const wmConfig = getWatermarkConfig(branding);
      // Generate HTML for both pages
      const page1HTML = generatePage1HTML(fullData, wmConfig, false);
      const page2HTML = generatePage2HTML(fullData, wmConfig, false);
      
      // Render Page 1
      const page1Canvas = await renderHTMLToCanvas(page1HTML);
      const imgWidth = 210;
      const imgHeight1 = (page1Canvas.height * imgWidth) / page1Canvas.width;
      pdf.addImage(page1Canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight1);
      
      // Add Page 2
      pdf.addPage();

      // Render Page 2
      const page2Canvas = await renderHTMLToCanvas(page2HTML);
      const imgHeight2 = (page2Canvas.height * imgWidth) / page2Canvas.width;
      pdf.addImage(page2Canvas.toDataURL('image/png', 1.0), 'PNG', 0, 0, imgWidth, imgHeight2);
      
      const pdfBytes = await pdf.output('arraybuffer');
      const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, wmConfig);
      return createPdfBlob(watermarkedBytes);
      
    } catch (error) {
      console.error('Error in PDF generation:', error);
      throw new Error(`Failed to generate letter: ${error.message}`);
    }
  }
};

// Helper function to render HTML to canvas
const renderHTMLToCanvas = async (htmlContent) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Create a container div
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.backgroundColor = 'white';
      container.innerHTML = htmlContent;
      document.body.appendChild(container);
      
      // Wait for images to load
      const images = container.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          setTimeout(resolve, 1000);
        });
      }));
      
      // Wait a bit for rendering
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Render to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Clean up
      document.body.removeChild(container);
      resolve(canvas);
      
    } catch (error) {
      console.error('Error rendering HTML to canvas:', error);
      reject(error);
    }
  });
};

// Shared header — delegates to docHeaderService (same design across all HR docs)
const sharedHeaderHTML = (logo, name, address, phone, email, website, tagline='', cin='', gst='') =>
  buildDocHeader(logo, { name, tagline, address, phone, email, website, cin, gst }, '#1C47C9');

const formatDateWithOrdinal = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    
    return `${day}${suffix} ${month} ${year}`;
  } catch (error) {
    return dateStr;
  }
};

const calculateCompensationStructure = (annualCTC) => {
  const ctc = Number(annualCTC);
  if (isNaN(ctc) || ctc === 0) {
    return {
      basic: 0, hra: 0, conveyance: 0, special: 0, medical: 0,
      basicAnnual: 0, hraAnnual: 0, conveyanceAnnual: 0, specialAnnual: 0, medicalAnnual: 0,
      pt: 200, ptAnnual: 2400, tds: 0, netSalary: 0, netAnnual: 0, 
      employerPf: 0, employerPfAnnual: 0, employerEsi: 0, employerEsiAnnual: 0, 
      ctc: ctc, ctcMonthly: 0
    };
  }
  
  const basicPercentage = 0.50;
  const hraPercentage = 0.15;
  const conveyancePercentage = 0.05;
  const specialPercentage = 0.20;
  const medicalPercentage = 0.10;
  
  const basicAnnual = ctc * basicPercentage;
  const hraAnnual = ctc * hraPercentage;
  const conveyanceAnnual = ctc * conveyancePercentage;
  const specialAnnual = ctc * specialPercentage;
  const medicalAnnual = ctc * medicalPercentage;
  
  const basicMonthly = basicAnnual / 12;
  const hraMonthly = hraAnnual / 12;
  const conveyanceMonthly = conveyanceAnnual / 12;
  const specialMonthly = specialAnnual / 12;
  const medicalMonthly = medicalAnnual / 12;
  
  const ptMonthly = 200;
  const ptAnnual = 2400;
  
  const grossMonthly = basicMonthly + hraMonthly + conveyanceMonthly + specialMonthly + medicalMonthly;
  const netMonthly = grossMonthly - ptMonthly;
  const netAnnual = netMonthly * 12;
  const ctcMonthly = ctc / 12;
  
  return {
    basic: Math.round(basicMonthly),
    hra: Math.round(hraMonthly),
    conveyance: Math.round(conveyanceMonthly),
    special: Math.round(specialMonthly),
    medical: Math.round(medicalMonthly),
    basicAnnual: Math.round(basicAnnual),
    hraAnnual: Math.round(hraAnnual),
    conveyanceAnnual: Math.round(conveyanceAnnual),
    specialAnnual: Math.round(specialAnnual),
    medicalAnnual: Math.round(medicalAnnual),
    pt: ptMonthly,
    ptAnnual: ptAnnual,
    tds: 0,
    netSalary: Math.round(netMonthly),
    netAnnual: Math.round(netAnnual),
    employerPf: 0,
    employerPfAnnual: 0,
    employerEsi: 0,
    employerEsiAnnual: 0,
    ctc: ctc,
    ctcMonthly: Math.round(ctcMonthly)
  };
};

// PAGE 1 HTML
const generatePage1HTML = ({
  employeeName, employeeCode, designation, dateOfIssue, effectiveDate,
  revisedCtc, currency, performanceNote, refNumber, company, hr, stamp, logo
}, wmConfig = null, includeHtmlWatermark = true) => {
  
  const safeEmployeeName = employeeName || 'Employee Name';
  const safeEmployeeCode = employeeCode || 'EMPXXXXX';
  const safeDesignation = designation || 'Designation';
  const safeRefNumber = refNumber || `INC/${new Date().getFullYear()}/001`;
  const safeCurrency = currency || 'INR';
  const safeRevisedCtc = Number(revisedCtc) || 0;
  
  const formattedIssueDate = formatDateWithOrdinal(dateOfIssue);
  const formattedEffectiveDate = formatDateWithOrdinal(effectiveDate);
  
  const companyName = company?.name || '';
  const companyAddress = company?.address || '';
  const companyPhone = company?.phone || '';
  const hrName = hr?.name || '';
  const hrDesignation = hr?.designation || '';

  const defaultPerformanceNote = `We extend our warm congratulations to you for your outstanding contributions and dedication to the objectives of ${companyName || 'the company'}. It gives us immense pleasure to inform you of a salary increment as a token of appreciation for your hard work.`;
  
  const finalPerformanceNote = performanceNote || defaultPerformanceNote;
  const firstName = safeEmployeeName.split(' ')[0] || 'Employee';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${includeHtmlWatermark ? buildWatermarkCSS(wmConfig) : ''}
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', Times, serif;
          background: white;
          width: 210mm;
          min-height: 297mm;
          color-scheme: light;
        }
        .container { width: 100%; padding: 0 10mm 10mm 10mm; }
        .date-ref { display: flex; justify-content: space-between; margin: 20px 0 25px 0; }
        .to-section { margin-bottom: 25px; line-height: 1.6; }
        .letter-title { font-size: 14pt; font-weight: bold; text-decoration: underline; text-align: center; margin: 25px 0 20px 0; }
        .subject { font-weight: bold; margin: 20px 0 15px 0; font-size: 12pt; }
        .greeting { margin-bottom: 15px; font-size: 12pt; }
        .content { text-align: justify; font-size: 12pt; line-height: 1.6; margin-bottom: 20px; }
        .content p { margin-bottom: 15px; }
        .signature-line { margin: 40px 0 10px 0; font-size: 12pt; }
        .signature-section { margin: 20px 0 30px 0; position: relative; }
        .for-company { font-weight: bold; font-size: 12pt; margin-top: 15px; }
        .hr-signature { margin-bottom: 10px; }
        .hr-signature img { height: 55px; object-fit: contain; }
        .stamp-image { position: absolute; left: 120px; top: -5px; height: 75px; width: auto; opacity: 0.8; }
        .bold { font-weight: bold; }
        .ref-no { text-align: right; }
      </style>
    </head>
    <body>
      <div class="wm-page-wrapper" style="min-height:297mm;">
        ${includeHtmlWatermark ? `<div class="wm-layer">${buildWatermarkImgTag(wmConfig)}</div>` : ''}
        <div class="wm-content">
      ${sharedHeaderHTML(logo, companyName, companyAddress, companyPhone, company?.email || '', company?.website || '', company?.tagline || '', company?.cin || '', company?.gst || '')}
      <div class="container">

        <div class="date-ref">
          <div>Date: ${formattedIssueDate}</div>
          <div class="ref-no">Ref No: ${safeRefNumber}</div>
        </div>
        
        <div class="to-section">
          <div>To,</div>
          <div class="bold">${safeEmployeeName}</div>
          <div>Emp. Code- ${safeEmployeeCode}</div>
          <div>${safeDesignation}</div>
        </div>
        
        <div class="letter-title">LETTER OF INCREMENT</div>
        <div class="subject">Subject: Salary increment letter</div>
        <div class="greeting">Dear ${firstName},</div>
        
        <div class="content">
          <p>${finalPerformanceNote}</p>
          <p>Effective from <strong>${formattedEffectiveDate}</strong>, your revised annual CTC will be <strong>${safeCurrency} ${safeRevisedCtc.toLocaleString()}</strong>.</p>
          <p>We appreciate your efforts and hard work and hope the same will continue in the future as well.</p>
        </div>
        
        <div class="signature-line">Your Sincerely,</div>
        
        <div class="signature-section">
          <div class="hr-signature">
            ${hr?.signature ? `<img src="${hr.signature}" alt="Signature">` : '<div style="height: 55px;"></div>'}
          </div>
          ${stamp ? `<img src="${stamp}" class="stamp-image" alt="Stamp">` : ''}
          <div class="for-company">For ${companyName},</div>
          <div class="bold" style="margin-top: 10px;">${hrName}</div>
          <div>${hrDesignation}</div>
        </div>
      </div>
      </div>
        </div><!-- end wm-content -->
      </div><!-- end wm-page-wrapper -->
    </body>
    </html>
  `;
};

// PAGE 2 HTML - SIMPLIFIED TO ENSURE IT RENDERS
const generatePage2HTML = ({ revisedCtc, currency, company, logo }, wmConfig = null, includeHtmlWatermark = true) => {
  const safeCurrency = currency || 'INR';
  const safeRevisedCtc = Number(revisedCtc) || 540000;
  const comp = calculateCompensationStructure(safeRevisedCtc);

  const companyName = company?.name || '';
  const companyAddress = company?.address || '';
  const companyPhone = company?.phone || '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${includeHtmlWatermark ? buildWatermarkCSS(wmConfig) : ''}
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', Times, serif;
          background: white;
          width: 210mm;
          min-height: 297mm;
          color-scheme: light;
        }
        .container { width: 100%; padding: 0 10mm 10mm 10mm; }
        .annexure-title { font-weight: bold; text-decoration: underline; margin: 20px 0 16px 0; font-size: 14pt; text-align: center; }
        .compensation-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11pt; }
        .compensation-table th, .compensation-table td { border: 1px solid #000; padding: 10px 8px; }
        .compensation-table th { background-color: #f5f5f5; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        .bg-light { background-color: #f9f9f9; }
        .bg-highlight { background-color: #e8f4f8; }
      </style>
    </head>
    <body>
      <div class="wm-page-wrapper" style="min-height:297mm;">
        ${includeHtmlWatermark ? `<div class="wm-layer">${buildWatermarkImgTag(wmConfig)}</div>` : ''}
        <div class="wm-content">
      ${sharedHeaderHTML(logo, companyName, companyAddress, companyPhone, company?.email || '', company?.website || '', company?.tagline || '', company?.cin || '', company?.gst || '')}
      <div class="container">
        <div class="annexure-title">ANNEXURE B: COMPENSATION STRUCTURE</div>
        
        <table class="compensation-table">
          <thead>
            <tr>
              <th class="text-left">Particulars</th>
              <th class="text-right">Per Month (${safeCurrency})</th>
              <th class="text-right">Per Annum (${safeCurrency})</th>
            </tr>
          </thead>
          <tbody>
            <tr><td class="text-left">Basic Salary</td><td class="text-right">${comp.basic.toLocaleString('en-IN')}</td><td class="text-right">${comp.basicAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td class="text-left">HRA</td><td class="text-right">${comp.hra.toLocaleString('en-IN')}</td><td class="text-right">${comp.hraAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td class="text-left">Conveyance Allowance</td><td class="text-right">${comp.conveyance.toLocaleString('en-IN')}</td><td class="text-right">${comp.conveyanceAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td class="text-left">Special Allowance</td><td class="text-right">${comp.special.toLocaleString('en-IN')}</td><td class="text-right">${comp.specialAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td class="text-left">Medical Allowance</td><td class="text-right">${comp.medical.toLocaleString('en-IN')}</td><td class="text-right">${comp.medicalAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td class="text-left">Professional Tax (PT)</td><td class="text-right">${comp.pt.toLocaleString('en-IN')}</td><td class="text-right">${comp.ptAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td class="text-left">TDS</td><td class="text-right">${comp.tds}</td><td class="text-right">${comp.tds}</td></tr>
            <tr class="bg-light bold"><td class="text-left">Net Salary</td><td class="text-right">${comp.netSalary.toLocaleString('en-IN')}</td><td class="text-right">${comp.netAnnual.toLocaleString('en-IN')}</td></tr>
            <tr><td colspan="3">&nbsp;</td></tr>
            <tr><td class="text-left">Employer PF Contribution</td><td class="text-right">${comp.employerPf}</td><td class="text-right">${comp.employerPfAnnual}</td></tr>
            <tr><td class="text-left">Employer ESI Contribution</td><td class="text-right">${comp.employerEsi}</td><td class="text-right">${comp.employerEsiAnnual}</td></tr>
            <tr class="bg-highlight bold"><td class="text-left">CTC</td><td class="text-right">${comp.ctcMonthly.toLocaleString('en-IN')}</td><td class="text-right">${comp.ctc.toLocaleString('en-IN')}</td></tr>
          </tbody>
        </table>
      </div>
        </div><!-- end wm-content -->
      </div><!-- end wm-page-wrapper -->
    </body>
    </html>
  `;
};