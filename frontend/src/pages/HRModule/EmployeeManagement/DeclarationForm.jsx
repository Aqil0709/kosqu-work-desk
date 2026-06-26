import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../../services/employeeAPI';
import companyLogo from "../../../assets/img/company.png";
import stampPng from "../../../assets/img/stamp.png";
import { useLocation } from "react-router-dom";
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

const DeclarationForm  = ({ initialEmployee = null }) => {
    const location = useLocation();
      const routedEmployee = initialEmployee || location.state?.employee || null;
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
        const [employeesRes, brandingRes] = await Promise.all([
          employeeAPI.getAll(),
          brandingAPI.get(),
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

        try {
          const formsRes = await declarationFormAPI.getAll(companyId);
          setSavedForms(formsRes.data.data || []);
        } catch (formsErr) {
          if (formsErr?.response?.status !== 403) console.error('Error fetching forms:', formsErr);
        }
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
    <div className="epf-container">
      {/* Header */}
      <div className="epf-header-card">
        <h2 className="epf-card-title">
          <HiOutlineDocumentText size={28} color="#4f46e5" />
          EPF Form 11 (Revised)
        </h2>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }} 
          className="btn btn-primary"
        >
          <HiOutlinePlus size={20} /> Add Information
        </button>
      </div>

      {/* Table */}
      <div className="epf-form-card">
        <table className="epf-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>AADHAR</th>
              <th>Created Date</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="6" className="epf-loading">Loading...</td></tr>}
            {!loading && savedForms.length > 0 ? (
              savedForms.map(form => (
                <tr key={form.id}>
                  <td className="epf-card-details">{form.form_data?.nameOfMember || 'N/A'}</td>
                  <td className="epf-card-details">{form.form_data?.emailId || 'N/A'}</td>
                  <td className="epf-card-details">{form.form_data?.mobileNo || 'N/A'}</td>
                  <td className="epf-card-details">{form.form_data?.aadharNumber ? `****${form.form_data.aadharNumber.slice(-4)}` : 'N/A'}</td>
                  <td className="epf-card-details">{new Date(form.created_at).toLocaleDateString('en-GB')}</td>
                  <td>
                    <div className="epf-actions">
                      <button 
                        onClick={() => handleViewPDF(form.form_data)} 
                        title="View PDF" 
                        className="epf-action-btn view"
                        disabled={isGenerating}
                      >
                        <HiOutlineEye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDownload(form.form_data)} 
                        title="Download PDF" 
                        className="epf-action-btn download"
                        disabled={isGenerating}
                      >
                        <HiOutlineArrowDownTray size={18} />
                      </button>
                      <button onClick={() => handleEdit(form)} title="Edit" className="epf-action-btn edit">
                        <HiOutlinePencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(form.id)} title="Delete" className="epf-action-btn delete">
                        <HiOutlineTrash size={18} />
                      </button>
                    </div>
                    </td>
                 </tr>
              ))
            ) : (!loading && <tr><td colSpan="6" className="epf-empty">No forms found. Click "Add Information" to create a new EPF declaration form.</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* Modal for Add/Edit Form */}
      {showModal && (
        <div className="epf-modal-overlay">
          <div className="epf-modal">
            <div className="epf-modal-header">
              <h3>{editingForm ? "Edit EPF Declaration Form" : "Add New EPF Declaration Form"}</h3>
              <button onClick={() => setShowModal(false)} className="epf-modal-close">×</button>
            </div>
            <form className="epf-modal-body" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="epf-form-grid">
                {/* Select Employee */}
                <div className="epf-form-field span-2">
                  <label>Select Employee *</label>
                  <select 
                    required 
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
                <div className="epf-form-field span-2">
                  <label>1. Name of the member *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.nameOfMember}
                    onChange={(e) => handleInputChange('nameOfMember', e.target.value)}
                  />
                </div>

                {/* Father's / Spouse's Name */}
                <div className="epf-form-field span-2">
                  <label>2. Father's / Spouse's Name</label>
                  <div className="radio-group">
                    <label><input type="radio" name="relation" value="father" checked={formData.selectedRelation === 'father'} onChange={() => handleInputChange('selectedRelation', 'father')} /> Father</label>
                    <label><input type="radio" name="relation" value="spouse" checked={formData.selectedRelation === 'spouse'} onChange={() => handleInputChange('selectedRelation', 'spouse')} /> Spouse</label>
                  </div>
                  <input 
                    type="text" 
                    placeholder={formData.selectedRelation === 'father' ? "Father's name" : "Spouse's name"}
                    value={formData.selectedRelation === 'father' ? formData.fatherName : formData.spouseName}
                    onChange={(e) => handleInputChange(formData.selectedRelation === 'father' ? 'fatherName' : 'spouseName', e.target.value)}
                  />
                </div>

                {/* Date of Birth, Gender, Marital Status */}
                <div className="epf-form-field">
                  <label>3. Date of Birth *</label>
                  <input type="date" required value={formData.dateOfBirth} onChange={(e) => handleInputChange('dateOfBirth', e.target.value)} />
                </div>
                <div className="epf-form-field">
                  <label>4. Gender</label>
                  <select value={formData.gender} onChange={(e) => handleInputChange('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                  </select>
                </div>
                <div className="epf-form-field">
                  <label>5. Marital Status</label>
                  <select value={formData.maritalStatus} onChange={(e) => handleInputChange('maritalStatus', e.target.value)}>
                    <option value="">Select</option>
                    <option value="Married">Married</option>
                    <option value="Unmarried">Unmarried</option>
                    <option value="Widow">Widow</option>
                    <option value="Widower">Widower</option>
                    <option value="Divorce">Divorce</option>
                  </select>
                </div>

                {/* Email and Mobile */}
                <div className="epf-form-field">
                  <label>6(a). Email ID *</label>
                  <input type="email" required value={formData.emailId} onChange={(e) => handleInputChange('emailId', e.target.value)} />
                </div>
                <div className="epf-form-field">
                  <label>6(b). Mobile No. *</label>
                  <input type="tel" required value={formData.mobileNo} onChange={(e) => handleInputChange('mobileNo', e.target.value)} />
                </div>

                {/* Previous Employment */}
                <div className="epf-form-field">
                  <label>7. Earlier member of EPF Scheme, 1952?</label>
                  <div className="radio-group">
                    <label><input type="radio" name="wasEPF" value="yes" checked={formData.wasEPFMember === 'yes'} onChange={() => handleInputChange('wasEPFMember', 'yes')} /> Yes</label>
                    <label><input type="radio" name="wasEPF" value="no" checked={formData.wasEPFMember === 'no'} onChange={() => handleInputChange('wasEPFMember', 'no')} /> No</label>
                  </div>
                </div>
                <div className="epf-form-field">
                  <label>8. Earlier member of EPS, 1995?</label>
                  <div className="radio-group">
                    <label><input type="radio" name="wasEPS" value="yes" checked={formData.wasEPSMember === 'yes'} onChange={() => handleInputChange('wasEPSMember', 'yes')} /> Yes</label>
                    <label><input type="radio" name="wasEPS" value="no" checked={formData.wasEPSMember === 'no'} onChange={() => handleInputChange('wasEPSMember', 'no')} /> No</label>
                  </div>
                </div>

                {/* AADHAR and PAN */}
                <div className="epf-form-field">
                  <label>AADHAR Number *</label>
                  <input type="text" required placeholder="12 digits" value={formData.aadharNumber} onChange={(e) => handleInputChange('aadharNumber', e.target.value)} />
                </div>
                <div className="epf-form-field">
                  <label>PAN Number</label>
                  <input type="text" placeholder="ABCDE1234F" value={formData.panNumber} onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())} />
                </div>

                {/* Undertaking Date and Place */}
                <div className="epf-form-field">
                  <label>Undertaking Date</label>
                  <input type="date" value={formData.undertakingDate} onChange={(e) => handleInputChange('undertakingDate', e.target.value)} />
                </div>
                <div className="epf-form-field">
                  <label>Place *</label>
                  <input type="text" required value={formData.undertakingPlace} onChange={(e) => handleInputChange('undertakingPlace', e.target.value)} />
                </div>

                {/* PF and UAN Numbers */}
                <div className="epf-form-field">
                  <label>PF Number</label>
                  <input type="text" value={formData.pfNumber} onChange={(e) => handleInputChange('pfNumber', e.target.value)} />
                </div>
                <div className="epf-form-field">
                  <label>UAN Number</label>
                  <input type="text" value={formData.uanNumber} onChange={(e) => handleInputChange('uanNumber', e.target.value)} />
                </div>
              </div>

              <div className="epf-form-actions">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={isGenerating} className="btn btn-primary">
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