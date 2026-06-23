// src/services/invoicePDFService.js
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { brandingAPI } from './brandingAPI';

// Import your images
import companyLogo from '../../src/assets/img/company.png';

export const invoicePDFService = {
  downloadInvoicePDF: async (invoice) => {
    try {
      // Extract service settings from invoice
      const serviceBankDetails = invoice.service_bank_details || {};
      const serviceGstDetails = invoice.service_gst_details || {};

      // Fetch branding
      let branding = {};
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) branding = res.data.branding;
      } catch (_) {}

      const logoUrl = branding.logo_url ? brandingAPI.getImageUrl(branding.logo_url) : companyLogo;

      // Create invoice data
      const invoiceData = {
        invoice: {
          id: invoice.id,
          invoice_no: invoice.invoice_no,
          invoice_date: invoice.invoice_date,
          ref_no: invoice.ref_no,
          buyer_gstin: invoice.buyer_gstin,
          party_address: invoice.party_address,
          items: invoice.items,
          total_before_discount: invoice.total_before_discount,
          discount: invoice.discount,
          gst_details: invoice.gst_details,
          round_off: invoice.round_off,
          total_after_tax: invoice.total_after_tax,
          service_bank_details: serviceBankDetails,
          service_gst_details: serviceGstDetails
        },
        company: {
          name: branding.company_name || '',
          address: branding.company_address || '',
          email: branding.company_email || '',
          phone: branding.company_phone || '',
          gstn: serviceGstDetails.gstin || '',
          bank: {
            name: serviceBankDetails.bank_name || '',
            branch: serviceBankDetails.branch || '',
            account: serviceBankDetails.account_number || '',
            ifsc: serviceBankDetails.ifsc_code || '',
            account_holder: serviceBankDetails.account_holder || branding.company_name || ''
          }
        },
        images: {
          logo: logoUrl
        }
      };

      // Generate PDF
      const pdf = await generatePDF(invoiceData);
      
      // Download as PDF file
      pdf.save(`invoice-${invoice.invoice_no}.pdf`);

    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  }
};

const generatePDF = async (invoiceData) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary div to render the invoice
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

      // Generate the invoice HTML with imported images
      tempDiv.innerHTML = generateInvoiceHTML(invoiceData);
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

const generateInvoiceHTML = (invoiceData) => {
  const { invoice, company, images } = invoiceData;
  
  const formatCurrency = (amount) => {
    if (!amount) return '0.00';
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
  if (!num || num === 0) return 'Zero Rupees only';
  
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  let words = '';
  
  // Handle integer part (Rupees)
  let integerPart = Math.floor(Math.abs(num));
  let decimalPart = Math.round((Math.abs(num) - integerPart) * 100); // Get paise
  
  // If there's no integer part (less than 1 rupee)
  if (integerPart === 0) {
    words = 'Zero';
  } else {
    let n = integerPart;
    
    // Handle crore
    if (n >= 10000000) {
      const crores = Math.floor(n / 10000000);
      words += numberToWords(crores) + ' Crore ';
      n %= 10000000;
    }
    
    // Handle lakh
    if (n >= 100000) {
      const lakhs = Math.floor(n / 100000);
      words += (lakhs >= 100 ? numberToWords(lakhs) : convertBelow1000(lakhs)) + ' Lakh ';
      n %= 100000;
    }
    
    // Handle thousand
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      words += (thousands >= 100 ? numberToWords(thousands) : convertBelow1000(thousands)) + ' Thousand ';
      n %= 1000;
    }
    
    // Handle hundred and below
    words += convertBelow1000(n);
  }
  
  // Add "Rupees"
  words = words.trim() + ' Rupees';
  
  // Handle paise (decimal part)
  if (decimalPart > 0) {
    words += ' and ' + convertBelow100(decimalPart) + ' Paise';
  }
  
  return words + ' only';
  
  // Helper function to convert numbers below 1000
  function convertBelow1000(n) {
    if (n === 0) return '';
    
    let result = '';
    
    // Handle hundreds
    if (n >= 100) {
      const hundreds = Math.floor(n / 100);
      result += units[hundreds] + ' Hundred ';
      n %= 100;
    }
    
    // Handle tens and units
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
  }
  
  // Helper function to convert numbers below 100 (for paise)
  function convertBelow100(n) {
    if (n === 0) return 'Zero';
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    
    const ten = tens[Math.floor(n / 10)];
    const unit = n % 10 > 0 ? ' ' + units[n % 10] : '';
    return ten + unit;
  }
};

  // Calculate GST breakdown
  const calculateGSTBreakdown = () => {
    const taxableAmount = (invoice.total_before_discount || 0) - (invoice.discount || 0);
    const gstBreakdown = [];
    
    if (invoice.gst_details && invoice.gst_details.length > 0) {
      invoice.gst_details.forEach(gst => {
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
  const taxableAmount = (invoice.total_before_discount || 0) - (invoice.discount || 0);

  // Use service GST details if available
  const companyGSTN = invoice.service_gst_details?.gstin || company.gstn;

  return `
    <div style="padding: 12mm; height: 267mm; position: relative; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
      <!-- Header -->
      <div style="margin-bottom:12px;border-bottom:2px solid #2c3e50;">
        <img src="${images.logo}" alt="Logo" style="width:100%;display:block;object-fit:contain;object-position:left center;" />
        ${companyGSTN ? `<div style="font-size:11px;font-weight:bold;text-align:right;padding:4px 0;">GSTN: ${companyGSTN}</div>` : ''}
      </div>
      
      <!-- Invoice Title -->
      <div style="text-align: center; margin: 12px 0; padding: 8px; background-color: #f8f9fa; border: 1px solid #2c3e50;">
        <div style="font-size: 20px; font-weight: bold; color: #2c3e50; text-transform: uppercase; letter-spacing: 1.5px;">
          TAX INVOICE
        </div>
      </div>
      
      <!-- Invoice and Client Details -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; gap: 10px;">
        <div style="width: 60%; padding: 10px; border: 1px solid #2c3e50; background-color: #f8f9fa;">
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">Invoice no : ${invoice.invoice_no}</div>
          <div style="margin-bottom: 3px;">Invoice Date: ${formatDate(invoice.invoice_date)}</div>
          <div style="margin-bottom: 3px;">Ref.No: ${invoice.ref_no || 'N/A'}</div>
          <div style="margin-bottom: 3px;">GSTN: ${invoice.buyer_gstin || 'N/A'}</div>
        </div>
        
        <div style="width: 38%; padding: 10px; border: 1px solid #2c3e50; background-color: #f8f9fa;">
          <div style="font-weight: bold; margin-bottom: 6px; color: #2c3e50; font-size: 13px;">Invoice to Party</div>
          <div>${invoice.party_address || 'N/A'}</div>
        </div>
      </div>
      
      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; border: 1px solid #2c3e50;">
        <thead>
          <tr>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="5%">Sr. No.</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="45%">Description of Goods</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="12%">HSN Code</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="8%">Qty</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="15%">Rate (₹)</th>
            <th style="border: 1px solid #2c3e50; padding: 6px 8px; font-weight: bold; background-color: #e9ecef; text-align: center;" width="15%">Total Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items && invoice.items.map(item => `
            <tr>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px;">${item.sr_no || ''}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px;">${item.description || ''}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px;">${item.hsn_code || ''}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px;">${item.quantity || 0}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px; text-align: right;">${formatCurrency(item.rate)}</td>
              <td style="border: 1px solid #2c3e50; padding: 6px 8px; text-align: right;">${formatCurrency(item.total_amount)}</td>
            </tr>
          `).join('') || '<tr><td colspan="6" style="text-align: center;">No items</td></tr>'}
        </tbody>
      </table>
      
      <!-- Total Section -->
      <div style="display: flex; justify-content: space-between; margin-top: 15px; margin-bottom: 20px;">
        <div style="width: 60%; padding-right: 10px;">
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #2c3e50; font-weight: bold; background-color: #f8f9fa; font-size: 11px;">
            Amount in words: ${numberToWords(invoice.total_after_tax || 0)}
          </div>
          
          <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #2c3e50; line-height: 1.4; background-color: #f8f9fa; font-size: 11px;">
            <strong>Terms and conditions:</strong><br>
            1. Goods once sold will not be taken back or exchanged<br>
            2. Seller is not responsible for any loss or damage to goods in transit<br>
            3. Buyer undertakes to submit prescribed GST declaration to seller on demand
          </div>
          
          <div style="padding: 10px; border: 1px solid #2c3e50; font-weight: bold; line-height: 1.4; background-color: #f8f9fa; font-size: 11px;">
            <strong>Bank Details:</strong><br>
            Account Holder: ${company.bank.account_holder}<br>
            Bank Name: ${company.bank.name}<br>
            Account No: ${company.bank.account}<br>
            IFSC code: ${company.bank.ifsc}<br>
            ${company.bank.branch ? `Branch: ${company.bank.branch}<br>` : ''}
          </div>
        </div>
        
        <div style="width: 38%; border: 1px solid #2c3e50; padding: 10px; background-color: #f8f9fa;">
          <table style="width: 100%; border-collapse: collapse;">
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
              <td style="padding: 4px 6px; border: none; text-align: right;">${formatCurrency(invoice.round_off)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 6px; border-top: 1px solid #2c3e50; font-weight: bold; font-size: 12px;">Total amount after tax</td>
              <td style="padding: 6px 6px; border-top: 1px solid #2c3e50; font-weight: bold; font-size: 12px; text-align: right;">${formatCurrency(invoice.total_after_tax)}</td>
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
        This is a computer-generated invoice. No signature required.
      </div>
    </div>
  `;
};