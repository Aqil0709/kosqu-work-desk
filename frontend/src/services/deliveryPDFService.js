// src/services/deliveryPDFService.js
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Import your company logo
import companyLogo from '../../src/assets/img/company.png'; // Update path as needed

export const deliveryPDFService = {
  downloadChallanPDF: async (challan) => {
    try {
      // Generate HTML using the template with logo
      const htmlContent = generateChallanHTML(challan);
      
      // Create a temporary div to render the challan
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.innerHTML = htmlContent;
      document.body.appendChild(tempDiv);

      // Wait for logo to load
      await new Promise((resolve) => {
        const logoImg = tempDiv.querySelector('.company-logo');
        if (logoImg && logoImg.complete) {
          resolve();
        } else if (logoImg) {
          logoImg.onload = resolve;
          logoImg.onerror = resolve; // Continue even if logo fails
        } else {
          resolve();
        }
        // Add timeout as fallback
        setTimeout(resolve, 1000);
      });

      // Use html2canvas to capture the div as an image
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true
      });

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
      
      // Download as PDF file
      pdf.save(`delivery-challan-${challan.challan_no}.pdf`);

    } catch (error) {
      console.error('Error downloading delivery challan:', error);
      throw error;
    }
  },

  // Generate HTML for PDF preview
  generateChallanHTML: (challan) => {
    return generateChallanHTML(challan);
  }
};

// Helper function to generate HTML for delivery challan
const generateChallanHTML = (challan) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  };

  // Convert line breaks to HTML
  const formatTextWithBreaks = (text) => {
    if (!text) return '';
    return text.replace(/\n/g, '<br>');
  };

  // This replicates the structure of delivery.html with logo
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delivery Challan - ${challan.challan_no}</title>
    <style>
        /* Copy all styles from delivery.html */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Times New Roman', Times, serif;
        }
        
        @page {
            size: A4;
            margin: 0;
        }
        
        body {
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
            font-size: 11pt;
        }
        
        .a4-page {
            width: 210mm;
            height: 297mm;
            background-color: white;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            position: relative;
            border: none;
            overflow: hidden;
        }
        
        .content-area {
            position: absolute;
            top: 15mm;
            left: 15mm;
            right: 15mm;
            overflow: visible;
            padding: 1rem;
            border: 2px solid #000;
        }
        
        .header-section {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 10mm;
            padding-bottom: 5mm;
            border-bottom: 2px solid #000;
        }
        
        .logo-container {
            width: 30%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        
        .company-logo {
            max-width: 170px;
            max-height: 80px;
            object-fit: contain;
        }
        
        .title-container {
            width: 40%;
            text-align: center;
        }
        
        .delivery-title {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1.5pt;
            padding: 2mm 0;
        }
        
        .date-container {
            width: 30%;
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        
        .challan-date {
            font-size: 11pt;
            font-weight: bold;
            padding: 2mm 0;
            display: inline-block;
        }
        
        .unified-container {
            border: 2px solid #000;
            border-radius: 4px;
            margin-bottom: 6mm;
            background-color: #fff;
        }
        
        .delivery-info-container {
            display: flex;
            justify-content: space-between;
            padding: 0;
            border-bottom: 2px solid #000;
            min-height: 20mm;
        }
        
        .delivery-info-left,
        .delivery-info-right {
            flex: 1;
            padding: 4mm;
            display: flex;
            flex-direction: column;
        }
        
        .delivery-info-right {
            border-left: 2px solid #000;
        }
        
        .challan-number {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 2mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #000;
        }
        
        .destination-info {
            font-size: 10pt;
            margin-bottom: 1mm;
            padding-top: 1mm;
        }
        
        .payment-info {
            font-size: 10pt;
            font-weight: bold;
            margin-bottom: 2mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #000;
        }
        
        .dispatch-info {
            font-size: 10pt;
            padding-top: 1mm;
        }
        
        .address-container {
            display: flex;
            justify-content: space-between;
            padding: 0;
            min-height: 25mm;
        }
        
        .address-left,
        .address-right {
            flex: 1;
            padding: 4mm;
            display: flex;
            flex-direction: column;
        }
        
        .address-right {
            border-left: 2px solid #000;
        }
        
        .address-label {
            font-weight: bold;
            font-size: 10pt;
            color: #000;
            padding-bottom: 1mm;
        }
        
        .address-content {
            font-size: 9pt;
            line-height: 1.4;
            flex-grow: 1;
        }
        
        .from-address-content {
            font-size: 9pt;
            line-height: 1.4;
            text-align: left;
            flex-grow: 1;
        }
        
        .contact-info {
            margin-top: 2mm;
            font-size: 9pt;
            line-height: 1.3;
        }
        
        .table-container {
            margin: 4mm 0;
        }
        
        .table-header {
            display: flex;
            border: 2px solid #000;
        }
        
        .table-header-cell {
            padding: 2mm 1mm;
            font-size: 10pt;
            font-weight: bold;
            text-align: center;
            border-right: 1px solid #000;
        }
        
        .table-header-cell:last-child {
            border-right: none;
        }
        
        .sr-header {
            width: 15%;
        }
        
        .desc-header {
            width: 70%;
        }
        
        .qty-header {
            width: 15%;
        }
        
        .table-row {
            display: flex;
            border-left: 2px solid #000;
            border-right: 2px solid #000;
            border-bottom: 1px solid #000;
        }
        
        .table-row:last-child {
            border-bottom: 2px solid #000;
        }
        
        .table-cell {
            padding: 3mm 1mm;
            font-size: 10pt;
            border-right: 1px solid #000;
            min-height: 8mm;
            display: flex;
            align-items: center;
        }
        
        .table-cell:last-child {
            border-right: none;
        }
        
        .sr-cell {
            width: 15%;
            justify-content: center;
        }
        
        .desc-cell {
            width: 70%;
        }
        
        .qty-cell {
            width: 15%;
            justify-content: center;
        }
        
        .conditions {
            font-size: 10pt;
            margin-top: 4mm;
            margin-bottom: 8mm;
            padding-top: 2mm;
            border-top: 1px dashed #000;
        }
        
        .signature-container {
            display: flex;
            justify-content: space-between;
            bottom: 0;
            left: 0;
            right: 0;
        }
        
        .signature-box {
            width: 45%;
        }
        
        .signature-line {
            width: 50mm;
            height: 1px;
            background-color: #000;
            margin-top: 15mm;
        }
        
        .company-signature .signature-line {
            margin-right: auto;
        }
        
        .receiver-signature {
            text-align: right;
        }
        
        .receiver-signature .signature-line {
            margin-left: auto;
        }
        
        .signature-label {
            font-weight: bold;
            font-size: 9pt;
            margin-top: 1mm;
        }
        
        /* Print styles */
        @media print {
            body {
                padding: 0;
                margin: 0;
                background: white;
                font-size: 9pt;
            }
            
            .a4-page {
                width: 210mm;
                height: 297mm;
                border: none;
                box-shadow: none;
                margin: 0;
                page-break-after: always;
            }
            
            .content-area {
                top: 15mm;
                left: 15mm;
                right: 15mm;
            }
            
            .print-button {
                display: none !important;
            }
        }
    </style>
</head>
<body>
    <div class="a4-page">
        <div class="content-area">
            
            <!-- HEADER SECTION with Logo -->
            <div class="header-section">
                <div class="logo-container">
                    <!-- Company Logo - Using imported image -->
                    <img src="${companyLogo}" alt="Company Logo" class="company-logo" />
                </div>
                
                <div class="title-container">
                    <div class="delivery-title">Delivery Challan</div>
                </div>
                
                <div class="date-container">
                    <div class="challan-date">Date: ${formatDate(challan.challan_date)}</div>
                </div>
            </div>
            
            <!-- Unified Container for all sections -->
            <div class="unified-container">
                <!-- Delivery Info -->
                <div class="delivery-info-container">
                    <div class="delivery-info-left">
                        <div class="challan-number">Delivery Challan No: ${challan.challan_no}</div>
                        <div class="destination-info">Destination: ${challan.destination}</div>
                    </div>
                    
                    <div class="delivery-info-right">
                        <div class="payment-info">Payment: ${challan.payment_info || '100% against delivery'}</div>
                        <div class="dispatch-info">Dispatched Through: ${challan.dispatched_through || 'By Hand'}</div>
                    </div>
                </div>
                
                <!-- Address Sections -->
                <div class="address-container">
                    <div class="address-left">
                        <div class="address-label">To,</div>
                        <div class="address-content">
                            ${formatTextWithBreaks(challan.to_address) || 'N/A'}
                        </div>
                    </div>
                    
                    <div class="address-right">
                        <div class="address-label">From,</div>
                        <div class="from-address-content">
                            ${formatTextWithBreaks(challan.from_address) || ''}
                            <div class="contact-info">
                                ${formatTextWithBreaks(challan.contact_info || '')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Goods Table -->
            <div class="table-container">
                <div class="table-header">
                    <div class="table-header-cell sr-header">Sr. No.</div>
                    <div class="table-header-cell desc-header">Description of Goods</div>
                    <div class="table-header-cell qty-header">Qty</div>
                </div>
                
                ${challan.items && challan.items.map(item => `
                    <div class="table-row">
                        <div class="table-cell sr-cell">${item.sr_no}</div>
                        <div class="table-cell desc-cell">${item.description || ''}</div>
                        <div class="table-cell qty-cell">${item.quantity || 0}</div>
                    </div>
                `).join('') || `
                    <div class="table-row">
                        <div class="table-cell sr-cell">1</div>
                        <div class="table-cell desc-cell">No items</div>
                        <div class="table-cell qty-cell">0</div>
                    </div>
                `}
            </div>
            
            <!-- Conditions Section -->
            <div class="conditions">
                Received above goods as per order and in good condition
            </div>
            
            <!-- Signature Sections -->
            <div class="signature-container">
                <div class="signature-box company-signature">
                    <div class="signature-line"></div>
                    <div class="signature-label">Authorised Signature</div>
                </div>
                
                <div class="signature-box receiver-signature">
                    <div class="signature-line"></div>
                    <div class="signature-label">Receiver's Signature</div>
                </div>
            </div>
            
        </div>
    </div>
</body>
</html>
  `;
};