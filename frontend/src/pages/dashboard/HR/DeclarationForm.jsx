import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../../services/employeeAPI';
import companyLogo from "../../../assets/img/company.png";
import stampPng from "../../../assets/img/stamp.png";
import { 
  HiOutlineArrowDownTray,
  HiOutlineDocumentText,
  HiOutlinePhone,
  HiOutlineEye,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineCalendar,
  HiOutlineEnvelope
} from "react-icons/hi2";
import { TfiEmail } from "react-icons/tfi";
import './DeclarationForm.css';
import pfDeclarationPDFService from '../../../services/pfDeclarationPDFService';
import brandingAPI from '../../../services/brandingAPI';
import declarationFormAPI from '../../../services/declarationFormAPI';

const DeclarationForm = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedForms, setSavedForms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const companyId = localStorage.getItem('companyId') || '1';

  const [formData, setFormData] = useState({
    nameOfMember: "",
    fatherName: "",
    spouseName: "",
    selectedRelation: "father",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    emailId: "",
    mobileNo: "",
    wasEPFMember: "",
    wasEPSMember: "",
    previousUAN: "",
    previousPFAccount: "",
    previousExitDate: "",
    schemeCertificateNo: "",
    ppoNo: "",
    isInternationalWorker: "",
    countryOfOrigin: "India",
    otherCountry: "",
    passportNo: "",
    passportValidFrom: "",
    passportValidTo: "",
    bankAccountNo: "",
    ifscCode: "",
    aadharNumber: "",
    panNumber: "",
    undertakingDate: new Date().toISOString().split('T')[0],
    undertakingPlace: "",
    memberSalutation: "Mr.",
    joiningDate: "",
    pfNumber: "",
    uanNumber: "",
    kycStatus: "",
    transferRequestGenerated: "",
    employerDate: new Date().toISOString().split('T')[0]
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
    signature_url: null
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [employeesRes, brandingRes, formsRes] = await Promise.all([
          employeeAPI.getAll(),
          brandingAPI.get(),
          declarationFormAPI.getAll(companyId)
        ]);
        
        setEmployees(employeesRes.data.employees || employeesRes.data.data || []);
        
        if (brandingRes.data?.success && brandingRes.data?.branding) {
          const b = brandingRes.data.branding;
          setBranding(prev => ({
            ...prev,
            company_name: b.company_name || '',
            company_address: b.company_address || '',
            company_email: b.company_email || '',
            company_website: b.company_website || '',
            hr_name: b.hr_name || '',
            hr_designation: b.hr_designation || '',
            logo_url: b.logo_url ? brandingAPI.getImageUrl(b.logo_url) : null,
            stamp_url: b.stamp_url ? brandingAPI.getImageUrl(b.stamp_url) : prev.stamp_url
          }));
        }
        
        setSavedForms(formsRes.data.data || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getEmployeeId = (emp) => emp.employee_id || emp.id;

  const handleEmployeeSelect = (employeeId) => {
    const match = employees.find(emp => getEmployeeId(emp) === employeeId);
    if (match) {
      setSelectedEmployeeId(employeeId);
      setFormData(prev => ({
        ...prev,
        nameOfMember: `${match.first_name} ${match.last_name}`.trim(),
        emailId: match.email || "",
        mobileNo: match.phone || "",
        dateOfBirth: match.date_of_birth || "",
        gender: match.gender || "",
        maritalStatus: match.marital_status || "",
        fatherName: match.father_name || ""
      }));
    }
  };

  const validateForm = () => {
    if (!formData.nameOfMember.trim()) return "Name of member is required";
    if (!formData.dateOfBirth) return "Date of birth is required";
    if (!formData.emailId.trim()) return "Email ID is required";
    if (!formData.mobileNo.trim()) return "Mobile number is required";
    if (!formData.aadharNumber.trim()) return "Aadhar number is required";
    if (formData.aadharNumber.length !== 12) return "Aadhar number must be 12 digits";
    return null;
  };

  const handleSave = async () => {
    if (!selectedEmployeeId) {
      alert("Please select an employee");
      return;
    }

    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    setIsGenerating(true);
    try {
      await declarationFormAPI.save({
        employee_id: typeof selectedEmployeeId === 'string' ? parseInt(selectedEmployeeId) : selectedEmployeeId,
        company_id: companyId,
        form_data: formData,
        issue_date: new Date().toISOString().split('T')[0]
      });
      
      alert("Form saved successfully!");
      const res = await declarationFormAPI.getAll(companyId);
      setSavedForms(res.data.data || []);
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error("Error saving:", err);
      alert("Failed to save");
    } finally {
      setIsGenerating(false);
    }
  };

  // View PDF - opens in new tab
  const handleViewPDF = async (formDataToView) => {
    setIsGenerating(true);
    try {
      const pdfBlob = await pfDeclarationPDFService.generatePDFBlob({ ...formDataToView, branding });
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download PDF
  const handleDownload = async (formDataToDownload) => {
    setIsGenerating(true);
    try {
      await pfDeclarationPDFService.downloadPFDeclaration({ ...formDataToDownload, branding });
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nameOfMember: "",
      fatherName: "",
      spouseName: "",
      selectedRelation: "father",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      emailId: "",
      mobileNo: "",
      wasEPFMember: "",
      wasEPSMember: "",
      previousUAN: "",
      previousPFAccount: "",
      previousExitDate: "",
      schemeCertificateNo: "",
      ppoNo: "",
      isInternationalWorker: "",
      countryOfOrigin: "India",
      otherCountry: "",
      passportNo: "",
      passportValidFrom: "",
      passportValidTo: "",
      bankAccountNo: "",
      ifscCode: "",
      aadharNumber: "",
      panNumber: "",
      undertakingDate: new Date().toISOString().split('T')[0],
      undertakingPlace: "",
      memberSalutation: "Mr.",
      joiningDate: "",
      pfNumber: "",
      uanNumber: "",
      kycStatus: "",
      transferRequestGenerated: "",
      employerDate: new Date().toISOString().split('T')[0]
    });
    setSelectedEmployeeId("");
    setEditingForm(null);
  };

  const handleEdit = (form) => {
    setFormData(form.form_data);
    setSelectedEmployeeId(form.employee_id);
    setEditingForm(form);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      try {
        await declarationFormAPI.delete(id);
        const res = await declarationFormAPI.getAll(companyId);
        setSavedForms(res.data.data || []);
        alert('Deleted successfully');
      } catch (err) {
        alert('Failed to delete');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  // Get KYC status text for display
  const getKycStatusText = (kycStatus) => {
    switch(kycStatus) {
      case 'not_uploaded': return 'Not uploaded';
      case 'uploaded_not_approved': return 'Uploaded but not approved';
      case 'uploaded_approved': return 'Uploaded & approved with DSC';
      default: return '';
    }
  };

  return (
    <div style={{ padding: "30px", background: "var(--theme-bg-muted,#f8fafc)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--theme-text-strong,#1e293b)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
          <HiOutlineDocumentText size={28} color="#4f46e5" />
          EPF Form 11 (Revised)
        </h2>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }} 
          style={{ background: "#4f46e5", color: "var(--card-bg,#fff)", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <HiOutlinePlus size={20} /> Add Information
        </button>
      </div>

      {/* Table */}
      <div style={{ background: "var(--card-bg,#fff)", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", fontSize: "0.9rem" }}>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Member Name</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Email</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Mobile</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>AADHAR</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Created Date</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>Loading...</td></tr>
            ) : savedForms.length > 0 ? (
              savedForms.map(form => (
                <tr key={form.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px", fontWeight: "bold", color: "var(--theme-text,#334155)" }}>{form.form_data?.nameOfMember || 'N/A'}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{form.form_data?.emailId || 'N/A'}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{form.form_data?.mobileNo || 'N/A'}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{form.form_data?.aadharNumber ? `****${form.form_data.aadharNumber.slice(-4)}` : 'N/A'}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{new Date(form.created_at).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                      <button 
                        onClick={() => handleViewPDF(form.form_data)} 
                        title="View PDF" 
                        style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#4f46e5" }}
                        disabled={isGenerating}
                      >
                        <HiOutlineEye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDownload(form.form_data)} 
                        title="Download PDF" 
                        style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#10b981" }}
                        disabled={isGenerating}
                      >
                        <HiOutlineArrowDownTray size={18} />
                      </button>
                      <button onClick={() => handleEdit(form)} title="Edit" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#f59e0b" }}>
                        <HiOutlinePencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(form.id)} title="Delete" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#b91c1c" }}>
                        <HiOutlineTrash size={18} />
                      </button>
                    </div>
                    </td>
                 </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>No forms found. Click "Add Information" to create a new EPF declaration form.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit Form */}
      {showModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg,#fff)", padding: "24px", borderRadius: "12px", width: "800px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 20px 0", color: "var(--theme-text-strong,#1e293b)", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
              {editingForm ? "Edit EPF Declaration Form" : "Add New EPF Declaration Form"}
            </h3>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                {/* Select Employee */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px", color: "var(--theme-text,#334155)" }}>Select Employee *</label>
                  <select 
                    required 
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                    value={selectedEmployeeId} 
                    onChange={(e) => handleEmployeeSelect(parseInt(e.target.value) || e.target.value)}
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={getEmployeeId(emp)} value={getEmployeeId(emp)}>
                        {emp.first_name} {emp.last_name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name of Member */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>1. Name of the member *</label>
                  <input 
                    type="text" 
                    required
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                    value={formData.nameOfMember}
                    onChange={(e) => handleInputChange('nameOfMember', e.target.value)}
                  />
                </div>

                {/* Father's / Spouse's Name */}
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>2. Father's / Spouse's Name</label>
                  <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
                    <label><input type="radio" name="relation" value="father" checked={formData.selectedRelation === 'father'} onChange={() => handleInputChange('selectedRelation', 'father')} /> Father</label>
                    <label><input type="radio" name="relation" value="spouse" checked={formData.selectedRelation === 'spouse'} onChange={() => handleInputChange('selectedRelation', 'spouse')} /> Spouse</label>
                  </div>
                  <input 
                    type="text" 
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                    placeholder={formData.selectedRelation === 'father' ? "Father's name" : "Spouse's name"}
                    value={formData.selectedRelation === 'father' ? formData.fatherName : formData.spouseName}
                    onChange={(e) => handleInputChange(formData.selectedRelation === 'father' ? 'fatherName' : 'spouseName', e.target.value)}
                  />
                </div>

                {/* Date of Birth, Gender, Marital Status */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>3. Date of Birth *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.dateOfBirth} onChange={(e) => handleInputChange('dateOfBirth', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>4. Gender</label>
                  <select style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>5. Marital Status</label>
                  <select style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.maritalStatus} onChange={(e) => handleInputChange('maritalStatus', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Married">Married</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Widow">Widow</option>
                    <option value="Widower">Widower</option>
                    <option value="Divorce">Divorce</option>
                  </select>
                </div>

                {/* Email and Mobile */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>6(a). Email ID *</label>
                  <input type="email" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.emailId} onChange={(e) => handleInputChange('emailId', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>6(b). Mobile No. *</label>
                  <input type="tel" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.mobileNo} onChange={(e) => handleInputChange('mobileNo', e.target.value)} />
                </div>

                {/* Previous Employment */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>7. Earlier member of EPF Scheme, 1952?</label>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <label><input type="radio" name="wasEPF" value="yes" checked={formData.wasEPFMember === 'yes'} onChange={() => handleInputChange('wasEPFMember', 'yes')} /> Yes</label>
                    <label><input type="radio" name="wasEPF" value="no" checked={formData.wasEPFMember === 'no'} onChange={() => handleInputChange('wasEPFMember', 'no')} /> No</label>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>8. Earlier member of EPS, 1995?</label>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <label><input type="radio" name="wasEPS" value="yes" checked={formData.wasEPSMember === 'yes'} onChange={() => handleInputChange('wasEPSMember', 'yes')} /> Yes</label>
                    <label><input type="radio" name="wasEPS" value="no" checked={formData.wasEPSMember === 'no'} onChange={() => handleInputChange('wasEPSMember', 'no')} /> No</label>
                  </div>
                </div>

                {/* AADHAR and PAN */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>AADHAR Number *</label>
                  <input type="text" required placeholder="12 digits" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.aadharNumber} onChange={(e) => handleInputChange('aadharNumber', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>PAN Number</label>
                  <input type="text" placeholder="ABCDE1234F" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.panNumber} onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())} />
                </div>

                {/* Undertaking Date and Place */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Undertaking Date</label>
                  <input type="date" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.undertakingDate} onChange={(e) => handleInputChange('undertakingDate', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Place *</label>
                  <input type="text" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.undertakingPlace} onChange={(e) => handleInputChange('undertakingPlace', e.target.value)} />
                </div>

                {/* PF and UAN Numbers */}
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>PF Number</label>
                  <input type="text" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.pfNumber} onChange={(e) => handleInputChange('pfNumber', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>UAN Number</label>
                  <input type="text" style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.uanNumber} onChange={(e) => handleInputChange('uanNumber', e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: "8px 16px", background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isGenerating} style={{ padding: "8px 16px", background: "#4f46e5", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer", opacity: isGenerating ? 0.7 : 1 }}>
                  {isGenerating ? 'Saving...' : (editingForm ? 'Update Form' : 'Save Form')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeclarationForm;