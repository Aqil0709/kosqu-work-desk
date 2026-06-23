import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import fallbackLogo from '../assets/img/company.png';
import fallbackStamp from '../assets/img/stamp.png';
import { brandingAPI } from './brandingAPI';
import { buildDocHeader, buildDocFooter } from './docHeaderService';
import { getWatermarkConfig, buildWatermarkLayer, buildWatermarkCSS, buildWatermarkImgTag } from './documentWatermarkService';
import { applyWatermarkToPdfBytes, createPdfUrl, savePdfBytes } from './pdfPageWatermarkService';

export const experiencePDFService = {
  generatePDFBlob: async (pdfData) => {
    try {
      // Validate required data
      if (!pdfData) {
        throw new Error('PDF data is required');
      }
      
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

      const wmConfig = getWatermarkConfig(branding);
      const htmlContent = generateLetterHTML(fullData, wmConfig, false);
      const pdfBytes = await generatePDF(htmlContent);
      const watermarkedBytes = await applyWatermarkToPdfBytes(pdfBytes, wmConfig);
      return new Blob([watermarkedBytes], { type: 'application/pdf' });

    } catch (error) {
      console.error('Error generating experience letter:', error);
      throw new Error(`Failed to generate letter: ${error.message}`);
    }
  }
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

// Format date with ordinal suffix (1st, 2nd, 3rd, 4th)
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
    console.error('Date ordinal formatting error:', error);
    return dateStr;
  }
};

// Delegate to shared header service
const commonHeader = (logo, website, email, companyName, address, phone, tagline='', cin='', gst='') =>
  buildDocHeader(logo, { name: companyName, tagline, address, phone, email, website, cin, gst }, '#1C47C9');

const generateLetterHTML = ({ employeeName, firstName, dateOfIssue, dateOfJoining, lastWorkingDay, designation, department, employmentType, customNote, refNumber, company, hr, logo, stamp }, wmConfig = null, includeHtmlWatermark = true) => {
  // Set defaults for missing values
  const safeEmployeeName = employeeName || 'Employee Name';
  const safeFirstName = firstName || 'the employee';
  const safeDesignation = designation || 'Position';
  const safeDepartment = department || 'Department';
  const safeEmploymentType = employmentType || 'Full-time';
  const safeRefNumber = refNumber || `EXP/${new Date().getFullYear()}/001`;
  
  // Format dates with ordinal suffix
  const formattedJoiningDate = formatDateWithOrdinal(dateOfJoining);
  const formattedLastDate = formatDateWithOrdinal(lastWorkingDay);
  const formattedIssueDate = formatDateWithOrdinal(dateOfIssue);
  
  // Use custom note or default performance statement
  const performanceNote = customNote && customNote.trim() !== '' 
    ? customNote 
    : `${safeFirstName} demonstrated exceptional technical skills, a strong work ethic, and a keen ability to adapt to new challenges. Their contributions have significantly impacted the success of our projects and the overall growth of the company.`;
  
  const companyName = company?.name || '';
  const companyAddress = company?.address || '';
  const companyWebsite = company?.website || '';
  const companyEmail = company?.email || '';
  const hrName = hr?.name || '';
  const hrDesignation = hr?.designation || '';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      ${includeHtmlWatermark ? buildWatermarkCSS(wmConfig) : ''}
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          background: white;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          color-scheme: light;
        }
      </style>
    </head>
    <body>
      <div class="wm-page-wrapper" style="font-family: 'Times New Roman', Times, serif; color: #000; line-height: 1.5; width: 100%; min-height: 297mm;">
        ${includeHtmlWatermark ? `<div class="wm-layer">${buildWatermarkImgTag(wmConfig)}</div>` : ''}
        <div class="wm-content">
        ${commonHeader(logo, companyWebsite, companyEmail, companyName, companyAddress, company?.phone || '', company?.tagline || '', company?.cin || '', company?.gst || '')}

        <div style="padding: 10mm 10mm 20mm 10mm;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 35px;">
            <div>
              <div style="font-weight: bold; font-size: 11pt;">Date: ${formattedIssueDate || formatShortDate(dateOfIssue)}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; font-size: 11pt;">Ref No: ${safeRefNumber}</div>
            </div>
          </div>

          <div style="text-align: center; font-weight: bold; font-size: 13pt; margin-bottom: 28px; letter-spacing: 1px;">
            TO WHOMSOEVER IT MAY CONCERN
          </div>

          <div style="text-align: justify; font-size: 11pt; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">This is to certify that <strong>${safeEmployeeName}</strong> has been employed with <strong>${companyName}</strong> as a <strong>${safeDesignation}</strong> from <strong>${formattedJoiningDate || formatShortDate(dateOfJoining)}</strong> to <strong>${formattedLastDate || formatShortDate(lastWorkingDay)}</strong>.</p>
            
            <p style="margin: 0 0 10px 0;">During this period, ${safeFirstName} has been a valuable asset to our team. Their responsibilities included but were not limited to:</p>
            
            <ul style="margin: 0 0 12px 0; padding-left: 25px;">
              <li style="margin-bottom: 6px;">Developing, testing, and maintaining software applications to ensure their functionality and efficiency.</li>
              <li style="margin-bottom: 6px;">Collaborating with cross-functional teams to design and implement new features.</li>
              <li style="margin-bottom: 6px;">Leading software development projects, ensuring timely delivery and adherence to quality standards.</li>
              <li style="margin-bottom: 6px;">Mentoring junior developers and providing technical guidance to the team.</li>
              <li style="margin-bottom: 6px;">Troubleshooting and debugging applications to resolve issues promptly.</li>
            </ul>
            
            <p style="margin: 0 0 12px 0;">${performanceNote}</p>
            
            <p style="margin: 0 0 12px 0;">We wish ${safeFirstName} all the best in their future endeavours and highly recommend ${safeFirstName} for any suitable position.</p>
            
            <p style="margin: 20px 0 0 0;">If you have any questions or require further information, please do not hesitate to contact us.</p>
          </div>

          <div style="margin-top: 55px; position: relative;">
            <div style="margin-bottom: 5px;">
              ${hr?.signature ? `<img src="${hr.signature}" alt="Signature" style="height: 55px; object-fit: contain;">` : '<div style="height: 55px;"></div>'}
            </div>
            ${stamp ? `<img src="${stamp}" alt="Company Stamp" style="position: absolute; left: 140px; top: -10px; height: 80px; width: auto; object-fit: contain; opacity: 0.8;">` : ''}
            <div style="margin-top: 8px;">
              <div style="font-weight: bold; font-size: 11pt; margin-bottom: 3px;">${hrName}</div>
              <div style="font-size: 10pt; margin-bottom: 3px;">${hrDesignation}</div>
              <div style="font-weight: bold; font-size: 10pt;">${companyName}</div>
            </div>
          </div>
        </div>
        
        ${buildDocFooter({ name: companyName, address: companyAddress, email: companyEmail, phone: company?.phone || '' })}
        </div><!-- end wm-content -->
      </div><!-- end wm-page-wrapper -->
    </body>
    </html>
  `;
};

const generatePDF = async (htmlContent) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if jsPDF is available globally or through import
      let PDFLib;
      
      if (typeof window !== 'undefined' && window.jspdf) {
        // If using CDN or global
        PDFLib = window.jspdf.jsPDF;
      } else {
        // If using module import
        const jspdfModule = await import('jspdf');
        PDFLib = jspdfModule.jsPDF || jspdfModule.default || jspdfModule;
      }
      
      if (!PDFLib || typeof PDFLib !== 'function') {
        throw new Error('jsPDF library not properly loaded');
      }
      
      const pdf = new PDFLib({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Create temporary container
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.backgroundColor = '#ffffff';
      tempDiv.style.padding = '0';
      tempDiv.style.margin = '0';
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);
      
      // Wait for images to load
      const images = tempDiv.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = (err) => {
            console.warn('Image failed to load:', img.src);
            resolve(); // Continue even if image fails
          };
        });
      }));
      
      // Render to canvas
      const canvas = await html2canvas(tempDiv, { 
        scale: 2.5, 
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: tempDiv.scrollWidth,
        windowHeight: tempDiv.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      document.body.removeChild(tempDiv);
      
      const pdfBytes = await pdf.output('arraybuffer');
      resolve(pdfBytes);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(new Error(`PDF generation failed: ${error.message}`));
    }
  });
};