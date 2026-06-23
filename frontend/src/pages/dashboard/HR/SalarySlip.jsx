import React, { useState, useEffect, useRef } from 'react';
import { employeeAPI } from '../../../services/employeeAPI';
import companyLogo from "../../../assets/img/company.png";
import stampPng from "../../../assets/img/stamp.png";
import { 
  HiOutlineCurrencyDollar, 
  HiOutlineUser, 
  HiOutlineCalendarDays, 
  HiOutlineArrowDownTray,
  HiOutlineEye,
  HiOutlineDocumentPlus,
  HiOutlinePhone,
  HiOutlineArrowDownOnSquare
} from "react-icons/hi2";
import { TbWorld } from "react-icons/tb";
import { TfiEmail } from "react-icons/tfi";
import './SalarySlip.css';
import { salarySlipPDFService } from '../../../services/salarySlipPDFService';
import { salaryAPI } from '../../../services/salaryAPI';
import brandingAPI from '../../../services/brandingAPI';
import { getWatermarkConfig } from '../../../services/documentWatermarkService';
import axios from 'axios';

const SalarySlip = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const formRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    designation: "",
    departmentId: "",
    monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    paymentMode: "Bank Transfer",
    earnings: {
      basic: 0,
      hra: 0,
      conveyance: 0,
      medical: 0,
      special: 0
    },
    deductions: {
      pf: 0,
      pt: 0,
      tds: 0
    }
  });

  const [branding, setBranding] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    company_website: '',
    hr_name: '',
    hr_designation: '',
    logo_url: null,
    stamp_url: stampPng,
    signature_url: null,
    watermark_enabled: true,
    watermark_opacity: 0.07,
    watermark_size: 'medium',
    watermark_position: 'center',
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeAPI.getAll();
        setEmployees(res.data.employees || res.data.data || []);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    const fetchBranding = async () => {
      try {
        const res = await brandingAPI.get();
        if (res.data?.success && res.data?.branding) {
          const b = res.data.branding;
          setBranding({
            company_name: b.company_name || '',
            company_address: b.company_address || '',
            company_email: b.company_email || '',
            company_website: b.company_website || '',
            hr_name: b.hr_name || '',
            hr_designation: b.hr_designation || '',
            logo_url: b.logo_url ? brandingAPI.getImageUrl(b.logo_url) : null,
            stamp_url: b.stamp_url ? brandingAPI.getImageUrl(b.stamp_url) : stampPng,
            signature_url: b.signature_url ? brandingAPI.getImageUrl(b.signature_url) : null,
            watermark_enabled: b.watermark_enabled !== false && b.watermark_enabled !== 0,
            watermark_opacity: Number(b.watermark_opacity ?? 0.07),
            watermark_size: b.watermark_size || 'medium',
            watermark_position: b.watermark_position || 'center',
          });
        }
      } catch (err) {
        console.error("Error fetching branding:", err);
      }
    };
    fetchEmployees();
    fetchBranding();
  }, []);

  const handleInputChange = (category, field, value) => {
    const numValue = (category === 'earnings' || category === 'deductions') ? (parseFloat(value) || 0) : value;
    if (category) {
      setFormData(prev => ({
        ...prev,
        [category]: {
          ...prev[category],
          [field]: numValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return { field: 'fullName', msg: "Please select or enter an employee name." };
    if (!formData.designation.trim()) return { field: 'designation', msg: "Designation is required." };
    if (!formData.monthYear.trim()) return { field: 'monthYear', msg: "Month & Year is required." };
    if (formData.earnings.basic <= 0) return { field: 'earnings_basic', msg: "Basic Salary must be greater than 0." };
    return null;
  };

  const scrollToField = (fieldId) => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
  };

  const totalEarnings = Object.values(formData.earnings).reduce((a, b) => a + Number(b), 0);
  const totalDeductions = Object.values(formData.deductions).reduce((a, b) => a + Number(b), 0);
  const netPay = totalEarnings - totalDeductions;

  const handleDownload = async () => {
    const error = validateForm();
    if (error) {
      alert(error.msg);
      scrollToField(error.field);
      return;
    }
    setIsGenerating(true);
    try {
      await salarySlipPDFService.downloadSalarySlip(formData);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      alert(error.msg);
      scrollToField(error.field);
      return;
    }
    if (!selectedEmployeeId) {
      alert("Please select an existing employee from the search list to save.");
      scrollToField('fullName');
      return;
    }

    setIsGenerating(true);
    const [month, year] = formData.monthYear.split(' ');
    const payload = {
      employee_id: selectedEmployeeId,
      department_id: formData.departmentId,
      basic_salary: formData.earnings.basic,
      allowances: {
        hra: formData.earnings.hra,
        transport: formData.earnings.conveyance,
        medical: formData.earnings.medical,
        special: formData.earnings.special
      },
      deductions: {
        tax: formData.deductions.tds,
        provident_fund: formData.deductions.pf,
        professional_tax: formData.deductions.pt
      },
      net_salary: netPay,
      month: month || "Unknown",
      year: year || new Date().getFullYear().toString(),
      status: 'paid',
      payment_date: new Date().toISOString().split('T')[0]
    };

    try {
      await salaryAPI.create(payload);
      alert("Salary record saved successfully!");
    } catch (err) {
      console.error("Error saving salary record:", err);
      alert(err.response?.data?.message || "Failed to save record. Ensure the backend is running on port 3000.");
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN').format(amt);
  };

  return (
    <div className="salary-slip-manager">
      <div className="slip-form-container" ref={formRef}>
        <h2><HiOutlineCurrencyDollar /> Salary Slip Generator</h2>
        
        <div className="form-section">
          <div className="section-label"><HiOutlineUser /> Employee Selection</div>
          <div className="form-group">
            <label>Full Name (Searchable)</label>
            <input 
              id="fullName"
              list="employee-list"
              className="salary-input" 
              placeholder="Start typing employee name..."
              value={formData.fullName}
              style={{fontWeight: '600', color: 'var(--theme-text-strong,#1e293b)', border: '2px solid #cbd5e1'}}
              onChange={(e) => {
                const val = e.target.value;
                handleInputChange(null, 'fullName', val);
                const match = employees.find(emp => 
                  `${emp.first_name} ${emp.last_name}`.trim().toLowerCase() === val.trim().toLowerCase()
                );
                if (match) {
                  setSelectedEmployeeId(match.id || match.employee_id);
                  setFormData(prev => ({
                    ...prev,
                    designation: match.position || match.role_name || "",
                    departmentId: match.department_id || "",
                    earnings: {
                      ...prev.earnings,
                      basic: match.salary || 0
                    }
                  }));
                }
              }}
            />
            <datalist id="employee-list">
              {employees.map(emp => (
                <option key={emp.id || emp.employee_id} value={`${emp.first_name} ${emp.last_name}`.trim()} />
              ))}
            </datalist>
          </div>
          <div className="input-grid">
            <div className="form-group">
              <label>Designation</label>
              <input 
                id="designation"
                type="text" 
                className="salary-input" 
                value={formData.designation} 
                onChange={(e) => handleInputChange(null, 'designation', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Month & Year</label>
              <input 
                id="monthYear"
                type="text" 
                className="salary-input" 
                placeholder="e.g. November 2025"
                value={formData.monthYear} 
                onChange={(e) => handleInputChange(null, 'monthYear', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-label"><HiOutlineCalendarDays /> Payment Basis</div>
          <div className="form-group">
            <label>Payment Mode Statement</label>
            <input 
              id="paymentMode"
              type="text" 
              className="salary-input" 
              value={formData.paymentMode} 
              placeholder="e.g. Cash / Bank Transfer"
              onChange={(e) => handleInputChange(null, 'paymentMode', e.target.value)}
            />
          </div>
        </div>

        <div className="form-section">
          <div className="section-label">Earnings Breakdown (₹)</div>
          <div className="input-grid">
            <div className="form-group">
              <label>Basic Salary</label>
              <input 
                id="earnings_basic"
                type="number" 
                className="salary-input" 
                value={formData.earnings.basic} 
                onChange={(e) => handleInputChange('earnings', 'basic', e.target.value)}
              />
            </div>
            {['hra', 'conveyance', 'medical', 'special'].map(key => (
              <div className="form-group" key={key}>
                <label>{key === 'hra' ? 'HRA' : key.charAt(0).toUpperCase() + key.slice(1)}</label>
                <input 
                  type="number" 
                  className="salary-input" 
                  value={formData.earnings[key]} 
                  onChange={(e) => handleInputChange('earnings', key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="section-label">Deductions Breakdown (₹)</div>
          <div className="input-grid">
            {Object.keys(formData.deductions).map(key => (
              <div className="form-group" key={key}>
                <label>{key.toUpperCase()}</label>
                <input 
                  type="number" 
                  className="salary-input" 
                  value={formData.deductions[key]} 
                  onChange={(e) => handleInputChange('deductions', key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="slip-preview-container">
        <div className="slip-action-buttons">
          <button
            onClick={handleSave}
            disabled={isGenerating}
            className="btn-save-premium"
          >
            <HiOutlineArrowDownOnSquare size={20} />
            {isGenerating ? "Saving..." : "Save to Dashboard"}
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="btn-download-premium"
          >
            <HiOutlineArrowDownTray size={20} />
            {isGenerating ? "Processing..." : "Download PDF"}
          </button>
        </div>

        <div className="slip-preview-scroll">
        <div className="slip-paper" id="salary-slip-content" style={{ position: 'relative', overflow: 'hidden' }}>
          {/* Watermark overlay */}
          {(() => {
            const wm = getWatermarkConfig(branding);
            if (!wm.enabled || !wm.logoUrl) return null;
            const pageWidth = 794;
            const wmWidth = Math.round(pageWidth * (wm.sizePct || 0.5));
            const leftCenter = Math.round((pageWidth - wmWidth) / 2);
            const posStyle = wm.position === 'top-center'
              ? { top: 80, left: leftCenter }
              : wm.position === 'bottom-center'
                ? { bottom: 80, left: leftCenter }
                : { top: '50%', left: leftCenter, marginTop: -Math.round(wmWidth * 0.2) };
            return (
              <div style={{
                position: 'absolute', ...posStyle,
                width: wmWidth, pointerEvents: 'none', zIndex: 0,
                transform: wm.position === 'diagonal' ? 'rotate(-35deg)' : undefined,
              }}>
                <img src={wm.logoUrl} alt="" crossOrigin="anonymous"
                  style={{ width: '100%', height: 'auto', display: 'block', opacity: wm.opacity, filter: 'grayscale(30%)', objectFit: 'contain' }} />
              </div>
            );
          })()}
          <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          {/* Header -- full-width branding image, aspect ratio preserved, no crop */}
          <div style={{ width: "100%", background: "#fff" }}>
            {branding.logo_url
              ? <img src={branding.logo_url} alt="Logo" style={{ width: "100%", display: "block", objectFit: "contain", objectPosition: "left center" }} />
              : branding.company_name
                ? <div style={{ padding: "18px 24px 14px 24px", fontSize: "16pt", fontWeight: "bold", color: "#111" }}>{branding.company_name}</div>
                : null
            }
            <div style={{ borderBottom: "3px solid #000" }} />
          </div>

          <div style={{ padding: "0 40px" }}>
            <div style={{ textAlign: 'center', fontSize: '15pt', fontWeight: 'bold', margin: '10px 0 20px 0' }}>Employee Salary Slip</div>

            <div style={{ fontSize: '12pt', lineHeight: '1.8', marginBottom: '20px' }}>
              <p><strong>Employee Name:</strong> {formData.fullName || "________________"}</p>
              <p><strong>Month & Year:</strong> {formData.monthYear}</p>
              <p><strong>Designation:</strong> {formData.designation || "________________"}</p>
              <p style={{marginTop: '15px'}}><strong>Salary paid by {formData.paymentMode.toLowerCase()}:</strong></p>
            </div>

            <table className="slip-table">
              <thead>
                <tr>
                  <th style={{background: 'var(--theme-bg-muted,#f8fafc)', fontWeight: 'bold', border: '1px solid #000'}}>Earnings (₹)</th>
                  <th className="text-right" style={{background: 'var(--theme-bg-muted,#f8fafc)', fontWeight: 'bold', border: '1px solid #000'}}>Amount (₹)</th>
                  <th style={{background: 'var(--theme-bg-muted,#f8fafc)', fontWeight: 'bold', border: '1px solid #000'}}>Deductions (₹)</th>
                  <th className="text-right" style={{background: 'var(--theme-bg-muted,#f8fafc)', fontWeight: 'bold', border: '1px solid #000'}}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Salary</td>
                  <td className="text-right">₹ {formatCurrency(formData.earnings.basic)}</td>
                  <td>Provident Fund (PF)</td>
                  <td className="text-right">₹ {formatCurrency(formData.deductions.pf)}</td>
                </tr>
                <tr>
                  <td>House Rent Allowance (HRA)</td>
                  <td className="text-right">₹ {formatCurrency(formData.earnings.hra)}</td>
                  <td>Professional Tax (PT)</td>
                  <td className="text-right">₹ {formatCurrency(formData.deductions.pt)}</td>
                </tr>
                <tr>
                  <td>Conveyance Allowance</td>
                  <td className="text-right">₹ {formatCurrency(formData.earnings.conveyance)}</td>
                  <td>Income Tax (TDS)</td>
                  <td className="text-right">₹ {formatCurrency(formData.deductions.tds)}</td>
                </tr>
                <tr>
                  <td>Medical Allowance</td>
                  <td className="text-right">₹ {formatCurrency(formData.earnings.medical)}</td>
                  <td className="font-bold">Total Deductions</td>
                  <td className="text-right font-bold">₹ {formatCurrency(totalDeductions)}</td>
                </tr>
                <tr>
                  <td>Special Allowance</td>
                  <td className="text-right">₹ {formatCurrency(formData.earnings.special)}</td>
                  <td colSpan="2"></td>
                </tr>
                <tr style={{background: 'var(--theme-bg-muted,#f1f5f9)'}}>
                  <td className="font-bold">Total Earnings</td>
                  <td className="text-right font-bold">₹ {formatCurrency(totalEarnings)}</td>
                  <td className="font-bold">Net Pay (Take-home)</td>
                  <td className="text-right font-bold">₹ {formatCurrency(netPay)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop: 'auto', paddingTop: '100px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{textAlign: 'center'}}>
                <div style={{height: '60px'}}></div>
                <div style={{borderTop: '1.5px solid #000', width: '180px', paddingTop: '5px'}}>
                  <p style={{fontSize: '10pt', fontWeight: 'bold'}}>Employee Signature</p>
                </div>
              </div>
              <div style={{textAlign: 'right', position: 'relative'}}>
                {branding.signature_url ? <img src={branding.signature_url} alt="Signature" style={{height: '50px', position: 'absolute', right: '30px', top: '-60px', zIndex: 2, objectFit: 'contain'}} /> : <div style={{ height: "50px", position: "absolute", top: "-60px" }} />}
                {branding.stamp_url && <img src={branding.stamp_url} alt="Stamp" style={{width: '120px', position: 'absolute', right: '30px', top: '-60px', opacity: '0.9', zIndex: 1, objectFit: 'contain'}} />}
                <div style={{position: 'relative', zIndex: 2, marginTop: '20px'}}>
                  <p style={{fontWeight: "bold", margin: 0}}>Best Regards,</p>
                  <p style={{fontWeight: "bold", margin: 0, fontSize: '13pt'}}>{branding.hr_name}</p>
                  <p style={{fontSize: '10pt', margin: '2px 0'}}>{branding.hr_designation}</p>
                  <p style={{fontWeight: "bold", margin: 0}}>{branding.company_name}</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 'auto',
            borderTop: "3px solid #000",
            padding: "15px 20px",
            textAlign: "center",
            fontSize: "10pt",
            fontWeight: "bold",
            background: "var(--card-bg,#fff)",
            width: "100%",
            boxSizing: "border-box",
            whiteSpace: "pre-line"
          }}>
            {branding.company_address}
          </div>
          </div>{/* end z-index:1 content wrapper */}
        </div>
        </div>{/* slip-preview-scroll */}
      </div>
    </div>
  );
};

export default SalarySlip;
