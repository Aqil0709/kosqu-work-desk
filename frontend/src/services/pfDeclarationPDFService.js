// pfDeclarationPDFService.js
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import fallbackLogo from '../assets/img/company.png';
import fallbackStamp from '../assets/img/stamp.png';
import { buildDocHeader } from './docHeaderService';
import { getWatermarkConfig, buildWatermarkLayer } from './documentWatermarkService';

const pfDeclarationPDFService = {
  downloadPFDeclaration: async (formData) => {
    try {
      const branding = formData.branding || {};
      
      const fullData = {
        ...formData,
        company: {
          name:    branding.company_name    || '',
          tagline: branding.company_tagline || '',
          address: branding.company_address || '',
          email:   branding.company_email   || '',
          website: branding.company_website || '',
          phone:   branding.company_phone   || '',
          cin:     branding.company_cin     || '',
          gst:     branding.company_gst     || ''
        },
        hr: {
          name: branding.hr_name || "HR Name",
          designation: branding.hr_designation || "HR Designation"
        },
        logo: branding.logo_url || fallbackLogo,
        stamp: branding.stamp_url || fallbackStamp
      };

      const wmConfig = getWatermarkConfig(branding);
      // Generate separate HTML for Page 1 and Page 2
      const page1HTML = generatePage1HTML(fullData, wmConfig);
      const page2HTML = generatePage2HTML(fullData, wmConfig);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Render Page 1
      const page1Element = document.createElement('div');
      page1Element.innerHTML = page1HTML;
      page1Element.style.position = 'absolute';
      page1Element.style.left = '-9999px';
      page1Element.style.top = '0';
      page1Element.style.width = '210mm';
      page1Element.style.backgroundColor = 'white';
      page1Element.style.padding = '0';
      page1Element.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(page1Element);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas1 = await html2canvas(page1Element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210;
      const imgHeight1 = (canvas1.height * imgWidth) / canvas1.width;
      
      pdf.addImage(imgData1, 'JPEG', 0, 0, imgWidth, imgHeight1);
      document.body.removeChild(page1Element);
      
      // Render Page 2
      const page2Element = document.createElement('div');
      page2Element.innerHTML = page2HTML;
      page2Element.style.position = 'absolute';
      page2Element.style.left = '-9999px';
      page2Element.style.top = '0';
      page2Element.style.width = '210mm';
      page2Element.style.backgroundColor = 'white';
      page2Element.style.padding = '0';
      page2Element.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(page2Element);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas2 = await html2canvas(page2Element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
      const imgHeight2 = (canvas2.height * imgWidth) / canvas2.width;
      
      pdf.addPage();
      pdf.addImage(imgData2, 'JPEG', 0, 0, imgWidth, imgHeight2);
      document.body.removeChild(page2Element);
      
      const fileName = `PF_Declaration_${fullData.nameOfMember?.replace(/\s/g, '_') || 'Form11'}.pdf`;
      pdf.save(fileName);
      
      return true;
      
    } catch (error) {
      console.error('Error in PDF generation:', error);
      alert('Failed to generate PDF: ' + error.message);
      throw error;
    }
  },

  generatePDFBlob: async (formData) => {
    try {
      const branding = formData.branding || {};
      
      const fullData = {
        ...formData,
        company: {
          name:    branding.company_name    || '',
          tagline: branding.company_tagline || '',
          address: branding.company_address || '',
          email:   branding.company_email   || '',
          website: branding.company_website || '',
          phone:   branding.company_phone   || '',
          cin:     branding.company_cin     || '',
          gst:     branding.company_gst     || ''
        },
        hr: {
          name: branding.hr_name || "HR Name",
          designation: branding.hr_designation || "HR Designation"
        },
        logo: branding.logo_url || fallbackLogo,
        stamp: branding.stamp_url || fallbackStamp
      };

      const wmConfig = getWatermarkConfig(branding);
      // Generate separate HTML for Page 1 and Page 2
      const page1HTML = generatePage1HTML(fullData, wmConfig);
      const page2HTML = generatePage2HTML(fullData, wmConfig);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Render Page 1
      const page1Element = document.createElement('div');
      page1Element.innerHTML = page1HTML;
      page1Element.style.position = 'absolute';
      page1Element.style.left = '-9999px';
      page1Element.style.top = '0';
      page1Element.style.width = '210mm';
      page1Element.style.backgroundColor = 'white';
      page1Element.style.padding = '0';
      page1Element.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(page1Element);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas1 = await html2canvas(page1Element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData1 = canvas1.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210;
      const imgHeight1 = (canvas1.height * imgWidth) / canvas1.width;
      
      pdf.addImage(imgData1, 'JPEG', 0, 0, imgWidth, imgHeight1);
      document.body.removeChild(page1Element);
      
      // Render Page 2
      const page2Element = document.createElement('div');
      page2Element.innerHTML = page2HTML;
      page2Element.style.position = 'absolute';
      page2Element.style.left = '-9999px';
      page2Element.style.top = '0';
      page2Element.style.width = '210mm';
      page2Element.style.backgroundColor = 'white';
      page2Element.style.padding = '0';
      page2Element.style.fontFamily = 'Arial, sans-serif';
      document.body.appendChild(page2Element);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const canvas2 = await html2canvas(page2Element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData2 = canvas2.toDataURL('image/jpeg', 0.95);
      const imgHeight2 = (canvas2.height * imgWidth) / canvas2.width;
      
      pdf.addPage();
      pdf.addImage(imgData2, 'JPEG', 0, 0, imgWidth, imgHeight2);
      document.body.removeChild(page2Element);
      
      return pdf.output('blob');
    } catch (error) {
      console.error('Error generating PDF blob:', error);
      throw error;
    }
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB');
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Delegate to shared header service
const commonHeader = (logo, website, email, address, phone, companyName, tagline='', cin='', gst='') =>
  buildDocHeader(logo, { name: companyName, tagline, address, phone, email, website, cin, gst }, '#1C47C9');

// PAGE 1 - ONLY FORM FIELDS (No UNDERTAKING)
const generatePage1HTML = (data, wmConfig = null) => {
  const {
    nameOfMember = '',
    selectedRelation = 'father',
    fatherName = '',
    spouseName = '',
    dateOfBirth = '',
    gender = '',
    maritalStatus = '',
    emailId = '',
    mobileNo = '',
    wasEPFMember = '',
    wasEPSMember = '',
    previousUAN = '',
    previousPFAccount = '',
    previousExitDate = '',
    schemeCertificateNo = '',
    ppoNo = '',
    isInternationalWorker = '',
    countryOfOrigin = 'India',
    otherCountry = '',
    passportNo = '',
    passportValidFrom = '',
    passportValidTo = '',
    bankAccountNo = '',
    ifscCode = '',
    aadharNumber = '',
    panNumber = '',
    company = {},
    logo = ''
  } = data;

  const relationName = selectedRelation === 'father' ? (fatherName || '_____________') : (spouseName || '_____________');
  
  const epfYes = wasEPFMember === 'yes' ? '✓' : '☐';
  const epfNo = wasEPFMember === 'no' ? '✓' : '☐';
  const epsYes = wasEPSMember === 'yes' ? '✓' : '☐';
  const epsNo = wasEPSMember === 'no' ? '✓' : '☐';
  const internationalYes = isInternationalWorker === 'yes' ? '✓' : '☐';
  const internationalNo = isInternationalWorker === 'no' ? '✓' : '☐';

  const showPreviousSection = wasEPFMember === 'yes' || wasEPSMember === 'yes';
  const wm1 = buildWatermarkLayer(wmConfig);

  return `
    <div style="position:relative;font-family: Arial, sans-serif; color: #000; line-height: 1.3; width: 210mm; margin: 0 auto; color-scheme: light; overflow:hidden;">
      ${wm1}
      <div style="position:relative;z-index:1;width:100%;">
      ${commonHeader(logo, company.website, company.email, company.address, company.phone, company.name, company.tagline || '', company.cin || '', company.gst || '')}

      <div style="padding: 8mm 10mm 10mm 10mm;">
        
        <div style="text-align: center; margin-bottom: 10px;">
          <div style="font-size: 14pt; font-weight: bold; margin: 3px 0;">EMPLOYEES' PROVIDENT FUND ORGANISATION</div>
          <div style="font-size: 12pt; font-weight: bold; margin: 3px 0;">Form 11 (Revised)</div>
          <div style="font-size: 9pt; font-style: italic;">To be submitted at the time of joining the establishment</div>
        </div>

        <!-- 1. Name of the member -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">1. Name of the member</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${nameOfMember || '_________________________'}</div>
        </div>

        <!-- 2. Father's / Spouse's Name -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">2. Father's Name □ Spouse's Name □ (Please tick whichever is applicable)</div>
          <div style="padding: 6px 8px; font-size: 9pt;">
            ${selectedRelation === 'father' ? '✓' : '☐'} Father's Name &nbsp;&nbsp;&nbsp; ${selectedRelation === 'spouse' ? '✓' : '☐'} Spouse's Name<br>
            ${relationName}
          </div>
        </div>

        <!-- 3. Date of Birth -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">3. Date of Birth: (DD/MM/YYYY)</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${formatDate(dateOfBirth) || '___/___/______'}</div>
        </div>

        <!-- 4. Gender -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">4. Gender: (Male/Female/Transgender)</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${gender || '_________'}</div>
        </div>

        <!-- 5. Marital Status -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">5. Marital Status: (Married/Unmarried/Widow/Widower/Divorce)</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${maritalStatus || '_________'}</div>
        </div>

        <!-- 6(a). Email ID -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">6(a). Email ID:</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${emailId || '_________________________'}</div>
        </div>

        <!-- 6(b). Mobile No -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">6(b). Mobile No.:</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${mobileNo || '___________'}</div>
        </div>

        <!-- 7. EPF Member -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">7. Whether earlier a member of Employees' Provident Fund Scheme, 1952</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${epfYes} Yes / ${epfNo} No</div>
        </div>

        <!-- 8. EPS Member -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">8. Whether earlier a member of Employees' Pension Scheme, 1995</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${epsYes} Yes / ${epsNo} No</div>
        </div>

        <!-- 9. Previous Employment Details -->
        ${showPreviousSection ? `
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">9. Previous employment details: [if Yes to 7 AND/OR 8 above]</div>
          <div style="padding: 6px 8px; font-size: 9pt;">
            <div><strong>a) Universal Account Number:</strong> ${previousUAN || '_________________________'}</div>
            <div style="margin-top: 4px;"><strong>b) Previous PF Account Number:</strong> ${previousPFAccount || '_________________________'}</div>
            <div style="margin-top: 4px;"><strong>c) Date of exit from previous employment:</strong> ${formatDate(previousExitDate) || '___/___/______'}</div>
            <div style="margin-top: 4px;"><strong>d) Scheme Certificate No. (if issued):</strong> ${schemeCertificateNo || '_________________________'}</div>
            <div style="margin-top: 4px;"><strong>e) Pension Payment Order (PPO) No. (if issued):</strong> ${ppoNo || '_________________________'}</div>
          </div>
        </div>
        ` : ''}

        <!-- 10. International Worker -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">10(a). International Worker:</div>
          <div style="padding: 6px 8px; font-size: 9pt;">${internationalYes} Yes / ${internationalNo} No</div>
        </div>

        ${isInternationalWorker === 'yes' ? `
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="padding: 6px 8px; font-size: 9pt;">
            <div><strong>b) Country of origin:</strong> ${countryOfOrigin === 'Other' ? (otherCountry || '___________') : (countryOfOrigin || '___________')}</div>
            <div style="margin-top: 4px;"><strong>c) Passport No.:</strong> ${passportNo || '_________________'}</div>
            <div style="margin-top: 4px;"><strong>d) Validity of passport:</strong> ${formatDate(passportValidFrom) || '___/___/______'} to ${formatDate(passportValidTo) || '___/___/______'}</div>
          </div>
        </div>
        ` : ''}

        <!-- 11. KYC Details -->
        <div style="border: 1px solid #333; margin-bottom: 3px;">
          <div style="background: #f5f5f5; padding: 4px 8px; font-weight: bold; font-size: 9pt;">11. KYC Details: (attach self attested copies of following KYCs)</div>
          <div style="padding: 6px 8px; font-size: 9pt;">
            <div><strong>a) Bank Account No. & IFSC Code:</strong> ${bankAccountNo || '_________________________'} / ${ifscCode || '___________'}</div>
            <div style="margin-top: 4px;"><strong>b) AADHAR Number:</strong> ${aadharNumber || '_________________'}</div>
            <div style="margin-top: 4px;"><strong>c) Permanent Account Number (PAN), if available:</strong> ${panNumber || '_________________'}</div>
          </div>
        </div>
      </div>
      </div><!-- end z-index:1 content -->
    </div><!-- end page wrapper -->
  `;
};

// PAGE 2 - ONLY UNDERTAKING AND DECLARATION
const generatePage2HTML = (data, wmConfig = null) => {
  const {
    nameOfMember = '',
    selectedRelation = 'father',
    fatherName = '',
    spouseName = '',
    wasEPFMember = '',
    wasEPSMember = '',
    undertakingDate = '',
    undertakingPlace = '',
    memberSalutation = 'Mr.',
    joiningDate = '',
    pfNumber = '',
    uanNumber = '',
    kycStatus = '',
    transferRequestGenerated = '',
    employerDate = '',
    company = {},
    hr = {},
    logo = '',
    stamp = ''
  } = data;

  const relationName = selectedRelation === 'father' ? (fatherName || '_____________') : (spouseName || '_____________');
  
  let kycCheck1 = "☐", kycCheck2 = "☐", kycCheck3 = "☐";
  if (kycStatus === "not_uploaded") kycCheck1 = "✓";
  else if (kycStatus === "uploaded_not_approved") kycCheck2 = "✓";
  else if (kycStatus === "uploaded_approved") kycCheck3 = "✓";
  
  let transferCheck1 = "☐", transferCheck2 = "☐";
  if (transferRequestGenerated === "yes") transferCheck1 = "✓";
  else if (transferRequestGenerated === "no") transferCheck2 = "✓";

  const wasMember = wasEPFMember === 'yes' || wasEPSMember === 'yes';
  const wm2 = buildWatermarkLayer(wmConfig);

  return `
    <div style="position:relative;font-family: Arial, sans-serif; color: #000; line-height: 1.3; width: 210mm; margin: 0 auto; color-scheme: light; overflow:hidden;">
      ${wm2}
      <div style="position:relative;z-index:1;width:100%;">
      ${commonHeader(logo, company.website, company.email, company.address, company.phone, company.name, company.tagline || '', company.cin || '', company.gst || '')}

      <div style="padding: 8mm 10mm 10mm 10mm;">
        
        <!-- UNDERTAKING SECTION -->
        <div style="font-size: 13pt; font-weight: bold; margin: 0 0 8px 0; border-bottom: 2px solid #000; padding-bottom: 3px;">UNDERTAKING</div>
        
        <div style="border: 1.5px solid #000; padding: 10px; margin: 8px 0;">
          <p style="margin: 4px 0; font-size: 8.5pt; line-height: 1.35;"><strong>1)</strong> Certified that the particulars are true to the best of my knowledge.</p>
          <p style="margin: 4px 0; font-size: 8.5pt; line-height: 1.35;"><strong>2)</strong> I authorize EPFO to use my Aadhar for verification/authentication/KYC purpose for service delivery.</p>
          <p style="margin: 4px 0; font-size: 8.5pt; line-height: 1.35;"><strong>3)</strong> Kindly transfer the funds and service details, if applicable, from the previous PF account as declared above to the present P.F. Account. (The transfer would be possible only if the identified KYC detail approved by previous employer has been verified by present employer using his Digital Signature Certificate)</p>
          <p style="margin: 4px 0; font-size: 8.5pt; line-height: 1.35;"><strong>4)</strong> In case of changes in above details, the same will be intimate to employer at the earliest.</p>
        </div>
        
        <!-- Signature of Member -->
        <div style="display: flex; justify-content: space-between; margin: 15px 0 25px 0;">
          <div style="text-align: center; width: 45%;">
            <div style="border-top: 1px solid #000; padding-top: 8px; width: 90%; margin: 0 auto;">
              <span style="font-size: 9pt;"><strong>Signature of Member</strong></span>
            </div>
          </div>
          <div style="width: 45%;">
            <div style="font-size: 9pt;"><strong>Date:</strong> ${formatShortDate(undertakingDate) || '_____________'}</div>
            <div style="font-size: 9pt; margin-top: 5px;"><strong>Place:</strong> ${undertakingPlace || '_____________'}</div>
          </div>
        </div>

        <!-- DECLARATION BY PRESENT EMPLOYER SECTION -->
        <div style="font-size: 13pt; font-weight: bold; margin: 10px 0 8px 0; border-bottom: 2px solid #000; padding-bottom: 3px;">DECLARATION BY PRESENT EMPLOYER</div>
        
        <div style="border: 1.5px solid #000; padding: 10px;">
          <p style="margin: 5px 0; font-size: 8.5pt; line-height: 1.35;">
            <strong>A.</strong> The member ${memberSalutation || 'Mr./Ms./Mrs.'} ${nameOfMember || '________'} has joined on ${formatShortDate(joiningDate) || '________'} and has been allotted PF Number <strong>${pfNumber || '________'}</strong>
          </p>
          
          ${!wasMember ? `
          <p style="margin: 5px 0; font-size: 8.5pt; line-height: 1.35;">
            <strong>B.</strong> In case the person was earlier not a member of EPF Scheme, 1952 and EPS, 1995:
          </p>
          <p style="margin: 3px 0 3px 12px; font-size: 8.5pt;">
            Post allotment of UAN) The UAN allotted for the member is <strong>${uanNumber || '________'}</strong>
          </p>
          ` : ''}
          
          <p style="margin: 8px 0 3px 0; font-size: 8.5pt;"><strong>Please Tick the Appropriate Option:</strong></p>
          <p style="margin: 3px 0; font-size: 8.5pt;">The KYC details of the above member in the UAN database</p>
          
          <div style="margin: 3px 0 3px 20px; font-size: 8.5pt;">${kycCheck1} Have not been uploaded</div>
          <div style="margin: 3px 0 3px 20px; font-size: 8.5pt;">${kycCheck2} Have been uploaded but not approved</div>
          <div style="margin: 3px 0 3px 20px; font-size: 8.5pt;">${kycCheck3} Have been uploaded and approved with DSC</div>
          
          ${wasMember ? `
          <p style="margin: 10px 0 3px 0; font-size: 8.5pt;">
            <strong>C.</strong> In case the person was earlier a member of EPF Scheme, 1952 and EPS, 1995:
          </p>
          <p style="margin: 3px 0; font-size: 8.5pt;">
            The above PF Account number/UAN of the member as mentioned in (A) above has been tagged with his/her UAN/Previous Member ID as declared by member.
          </p>
          <p style="margin: 8px 0 3px 0; font-size: 8.5pt; font-weight: bold;">Please Tick the Appropriate Option:-</p>
          
          <div style="margin: 3px 0 3px 20px; font-size: 8.5pt;">
            ${transferCheck1} The KYC details of the above member in the UAN database have been approved with Digital Signature Certificate and transfer request has been generated on portal.
          </div>
          <div style="margin: 3px 0 3px 20px; font-size: 8.5pt;">
            ${transferCheck2} As the DSC of establishment are not registered with EPFO, the member has been informed to file physical claim (Form-13) for transfer of funds from his previous establishment.
          </div>
          ` : ''}
          
          <!-- Signature of Employer -->
          <div style="display: flex; justify-content: space-between; margin-top: 25px;">
            <div style="text-align: center; width: 45%;">
              ${stamp ? `<img src="${stamp}" alt="Stamp" style="height: 100px; width: 100px; margin-bottom: 5px;">` : ''}
              <div style="border-top: 1px solid #000; margin-top: 5px; padding-top: 8px;">
                <span style="font-size: 9pt;"><strong>Signature of Employer / Authorized Signatory</strong></span>
              </div>
              <div style="margin-top: 8px; font-size: 8pt;">Name: ${hr.name || '_____________'}</div>
              <div style="font-size: 8pt;">Designation: ${hr.designation || '_____________'}</div>
            </div>
            <div style="width: 45%;">
              <div style="font-size: 9pt;"><strong>Date:</strong> ${formatShortDate(employerDate) || '_____________'}</div>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="margin-top: 20px; border-top: 2px solid #000; padding: 10px; text-align: center; font-size: 8pt; font-weight: bold;">
          ${company.address || ''}
        </div>
      </div>
      </div><!-- end z-index:1 content -->
    </div><!-- end page wrapper -->
  `;
};

export default pfDeclarationPDFService;