// src/services/quotationPDFService.js
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { brandingAPI } from './brandingAPI';

// Import your logo only
import companyLogo from '../../src/assets/img/company.png';

export const quotationPDFService = {
  downloadQuotationPDF: async (quotation) => {
    try {
      const serviceGstDetails = quotation.service_gst_details || null;
      const gstin = serviceGstDetails?.gstin || '';
      const panNumber = serviceGstDetails?.pan_number || '';
      const totalAfterTax = parseFloat(quotation.total_after_tax) || 0;

      // Fetch branding
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) branding = res.data.branding;
      } catch (_) {}

      const logoUrl = branding.logo_url ? brandingAPI.getImageUrl(branding.logo_url) : companyLogo;

      const quotationData = {
        quotation: {
          id: quotation.id,
          quotation_no: quotation.quotation_no,
          quotation_date: quotation.quotation_date,
          ref_no: quotation.ref_no,
          buyer_gstin: quotation.buyer_gstin,
          party_address: quotation.party_address,
          items: quotation.items,
          total_before_discount: parseFloat(quotation.total_before_discount) || 0,
          discount: parseFloat(quotation.discount) || 0,
          gst_details: quotation.gst_details,
          round_off: parseFloat(quotation.round_off) || 0,
          total_after_tax: totalAfterTax,
          service_bank_details: quotation.service_bank_details,
          service_gst_details: serviceGstDetails
        },
        company: {
          name: branding.company_name || '',
          address: branding.company_address || '',
          email: branding.company_email || '',
          phone: branding.company_phone || '',
          gstin: gstin,
          pan: panNumber
        },
        images: {
          logo: logoUrl
        }
      };

      const pdf = await generatePDF(quotationData);

      pdf.save(`quotation-${quotation.quotation_no}.pdf`);

    } catch (error) {
      console.error('Error downloading quotation:', error);
      throw error;
    }
  }
};


const generatePDF = async (quotationData) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary div to render the quotation
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '210mm';
      tempDiv.style.minHeight = '297mm';
      tempDiv.style.padding = '15mm';
      tempDiv.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
      tempDiv.style.fontSize = '12px';
      tempDiv.style.background = 'white';
      tempDiv.style.color = '#333';
      tempDiv.style.lineHeight = '1.4';

      // Generate the quotation HTML with service settings
      tempDiv.innerHTML = generateQuotationHTML(quotationData);
      document.body.appendChild(tempDiv);

      // Use html2canvas to capture the div as an image
      html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: tempDiv.offsetWidth,
        height: tempDiv.offsetHeight,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Clean up
        document.body.removeChild(tempDiv);
        
        resolve(pdf);
      }).catch(error => {
        document.body.removeChild(tempDiv);
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

const generateQuotationHTML = (quotationData) => {
  const { quotation, company, images } = quotationData;
  
  // Get GSTIN from quotation's service_gst_details if available
  // Otherwise fallback to company.gstin
  const gstinToUse = quotation.service_gst_details?.gstin || company.gstin || '';
  

  
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN');
    } catch (error) {
      return dateString;
    }
  };

const numberToWords = (num) => {

  if (num === null || num === undefined || num === '') {
   
    return 'Zero Rupees only';
  }
  
  let numStr = String(num);
 
  numStr = numStr.replace(/,/g, '').trim();

  const number = parseFloat(numStr);
 
  if (isNaN(number)) {
  
    return 'Zero Rupees only';
  }
  
  if (number === 0) {
    return 'Zero Rupees only';
  }
  
  const isNegative = number < 0;
  const absoluteNumber = Math.abs(number);
  
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Function to convert numbers less than 1000
  const convertHundreds = (n) => {
    if (n === 0) return '';
    
    let result = '';
    
    // Hundreds place
    if (n >= 100) {
      result += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    // Tens and units place
    if (n > 0) {
      if (n < 10) {
        result += units[n];
      } else if (n < 20) {
        result += teens[n - 10];
      } else {
        result += tens[Math.floor(n / 10)];
        if (n % 10 > 0) {
          result += ' ' + units[n % 10];
        }
      }
    }
    
    return result.trim();
  };
  
  // Convert the whole number part (rupees)
  const convertNumberToWords = (n) => {
    if (n === 0) return '';
    
    let words = '';
    
    // Handle crores (10^7)
    if (n >= 10000000) {
      const crores = Math.floor(n / 10000000);
      words += convertHundreds(crores) + ' Crore ';
      n %= 10000000;
    }
    
    // Handle lakhs (10^5)
    if (n >= 100000) {
      const lakhs = Math.floor(n / 100000);
      words += convertHundreds(lakhs) + ' Lakh ';
      n %= 100000;
    }
    
    // Handle thousands (10^3)
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      words += convertHundreds(thousands) + ' Thousand ';
      n %= 1000;
    }
    
    // Handle hundreds, tens, and units
    if (n > 0) {
      words += convertHundreds(n);
    }
    
    return words.trim();
  };

  const rupeePart = Math.floor(absoluteNumber);
  const paisePart = Math.round((absoluteNumber - rupeePart) * 100);

  let result = '';

  if (rupeePart > 0) {
    result = convertNumberToWords(rupeePart) + ' Rupees';
  } else {
    result = 'Zero Rupees';
  }
  
  if (paisePart > 0) {
    if (rupeePart > 0) {
      result += ' and ';
    }
    result += convertNumberToWords(paisePart) + ' Paise';
  }
  
  result += ' only';
  

  if (isNegative) {
    result = 'Minus ' + result;
  }
 
  return result;
};


  const calculateGSTBreakdown = () => {
    const taxableAmount = (quotation.total_before_discount || 0) - (quotation.discount || 0);
    const gstBreakdown = [];
    
    if (quotation.gst_details && quotation.gst_details.length > 0) {
      quotation.gst_details.forEach(gst => {
        const amount = (taxableAmount * (gst.percentage || 0)) / 100;
        gstBreakdown.push({
          type: gst.tax_type || 'GST',
          percentage: gst.percentage || 0,
          amount: amount
        });
      });
    }
    
    return gstBreakdown;
  };

  const gstBreakdown = calculateGSTBreakdown();
  const taxableAmount = (quotation.total_before_discount || 0) - (quotation.discount || 0);

  return `
    <div style="padding: 12mm; height: 267mm; position: relative; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <!-- Header -->
      <div style="margin-bottom:12px;border-bottom:2px solid #2c3e50;">
        <img src="${images.logo}" alt="Logo" style="width:100%;display:block;object-fit:contain;object-position:left center;" />
        ${company.gstin ? `<div style="font-size:11px;font-weight:bold;text-align:right;padding:4px 0;">GSTN: ${company.gstin}</div>` : ''}
      </div>
      
      <!-- Quotation Title -->
      <div style="text-align: center; margin: 12px 0; padding: 8px; background-color: #f8f9fa; border: 1px solid #2c3e50;">
        <div style="font-size: 20px; font-weight: bold; color: #2c3e50; text-transform: uppercase; letter-spacing: 1.5px;">
          QUOTATION
        </div>
      </div>
      
      <!-- Quotation and Client Details -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; gap: 10px;">
        <div style="width: 60%; padding: 10px; border: 1px solid #2c3e50; background-color: #f8f9fa;">
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">Quotation no : ${quotation.quotation_no}</div>
          <div style="margin-bottom: 3px;">Quotation Date: ${formatDate(quotation.quotation_date)}</div>
          <div style="margin-bottom: 3px;">Ref.No: ${quotation.ref_no || 'N/A'}</div>
          <div style="margin-bottom: 3px;">Buyer GSTIN: ${quotation.buyer_gstin || 'N/A'} </div>
        </div>
        
        <div style="width: 38%; padding: 10px; border: 1px solid #2c3e50; background-color: #f8f9fa;">
          <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 13px;">Quotation to Party</div>
          <div>${quotation.party_address || 'N/A'}</div>
        </div>
      </div>
      
      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; border: 1px solid #2c3e50;">
        <thead>
          <tr>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="5%">Sr. No.</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="60%">Description of Goods</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="8%">Qty</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="12%">Rate (₹)</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="15%">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${quotation.items && quotation.items.map(item => `
            <tr>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px; text-align: center;">${item.sr_no || ''}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px;">${item.description || ''}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px; text-align: center;">${item.quantity || 0}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px; text-align: right;">${formatCurrency(item.rate)}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px; text-align: right;">${formatCurrency(item.total_amount)}</td>
            </tr>
          `).join('') || '<tr><td colspan="5" style="text-align: center;">No items</td></tr>'}
        </tbody>
      </table>
      
      <!-- Total Section -->
      <div style="display: flex; justify-content: space-between; margin-top: 15px; margin-bottom: 20px;">
        <div style="width: 60%; padding-right: 10px;">
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #2c3e50; font-weight: bold; background-color: #f8f9fa; font-size: 11px;">
            Amount in words: ${numberToWords(quotation.total_after_tax)}
          </div>
          
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #2c3e50; line-height: 1.4; background-color: #f8f9fa; font-size: 11px;">
            <strong>Terms and conditions:</strong><br>
            1. Payment  :  100% against delivery of material.<br>
            2. Warranty : 1 year against manufacturing defects.<br>
            3. Delivery   : Within 2 - 3 weeks from the PO.<br>
            4. Taxes       : GST @ 18 %  Extra.
          </div>
        </div>
        
        <div style="width: 38%; border: 1px solid #2c3e50; padding: 10px; background-color: #f8f9fa;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 6px; border: none;">Total amount before discount</td>
              <td style="padding: 4px 6px; border: none; text-align: right;">${formatCurrency(quotation.total_before_discount)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; border: none;">Discount ${quotation.discount > 0 && quotation.total_before_discount > 0 ? ((quotation.discount / quotation.total_before_discount) * 100).toFixed(1) + '%' : ''}</td>
              <td style="padding: 4px 6px; border: none; text-align: right;">${formatCurrency(quotation.discount)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 6px; border: none;">Total amount before Tax</td>
              <td style="padding: 4px 6px; border: none; text-align: right;">${formatCurrency(taxableAmount)}</td>
            </tr>
            ${gstBreakdown.map(gst => `
              <tr>
                <td style="padding: 4px 6px; border: none;">Add ${gst.type}@${gst.percentage}%</td>
                <td style="padding: 4px 6px; border: none; text-align: right;">${formatCurrency(gst.amount)}</td>
              </tr>
            `).join('')}
            <tr>
              <td style="padding: 4px 6px; border: none;">Rounded off</td>
              <td style="padding: 4px 6px; border: none; text-align: right;">${formatCurrency(quotation.round_off)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 6px; border-top: 1px solid #2c3e50; font-weight: bold; font-size: 12px;">Total amount after tax</td>
              <td style="padding: 6px 6px; border-top: 1px solid #2c3e50; font-weight: bold; font-size: 12px; text-align: right;">${formatCurrency(quotation.total_after_tax)}</td>
            </tr>
          </table>
        </div>
      </div>
      
       <!-- Signature Section -->
      <div style="display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 15px; border-top: 2px solid #2c3e50;">
        <div style="width: 50%; text-align: center; position: relative;">
          <!-- Blank space for company signature -->
          <div style="height: 80px; margin-bottom: 10px; width: 100%;"></div>
          <div style="width: 70%; height: 1px; background-color: #2c3e50; margin: 10px auto 10px;"></div>
          ${company.name ? `<div style="font-weight: bold; margin-top: 5px; font-size: 14px;">For ${company.name}</div>` : ''}
          <div style="font-weight: bold; margin-top: 5px; font-size: 12px;">Authorized Signatory</div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 10px; font-style: italic; font-size: 10px; color: #7f8c8d;">
        This is a computer-generated quotation. No signature required.
      </div>
    </div>
  `;
};