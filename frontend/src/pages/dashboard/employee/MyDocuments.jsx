import React, { useState, useEffect } from 'react';
import offerLetterAPI from '../../../services/offerLetterAPI';
import { salaryAPI } from '../../../services/salaryAPI';
import { offerLetterPDFService } from '../../../services/offerLetterPDFService';
import { salarySlipPDFService } from '../../../services/salarySlipPDFService';
import { resignationAPI } from '../../../services/resignationAPI';
import { experienceLetterAPI } from '../../../services/experienceLetterAPI';
import { incrementLetterAPI } from '../../../services/incrementLetterAPI';
import { API_BASE_URL } from '../../../services/api';

import { 
  HiOutlineDocumentText, 
  HiOutlineArrowDownTray, 
  HiOutlineEye, 
  HiOutlineCurrencyDollar,
  HiOutlineClipboardDocumentList,
  HiOutlineBriefcase,
  HiOutlineArrowTrendingUp,
  HiOutlinePlus
} from "react-icons/hi2";
import './MyDocuments.css';

const MyDocuments = () => {
  const [letters, setLetters] = useState([]);
  const [slips, setSlips] = useState([]);
  const [resignations, setResignations] = useState([]);
  const [experiences, setExperiences] = useState([]);
  const [increments, setIncrements] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('offer'); 
  const [slipFilters, setSlipFilters] = useState({ month: '', year: '' });
  const [error, setError] = useState(null);
  
  // Resignation Modal
  const [showResignModal, setShowResignModal] = useState(false);
  const [resignData, setResignData] = useState({ requested_last_day: '', reason: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

const fetchDocs = async () => {
  try {
    setLoading(true);
    setError(null);
 
    
    // Get current user from localStorage
    const userStr = localStorage.getItem('user');
    let currentUser = {};
    
    try {
      currentUser = JSON.parse(userStr || '{}');
    
    } catch (e) {
      console.error("Error parsing user data:", e);
    }
    
    // Fetch all data in parallel
    const [letterRes, salaryRes, resigRes, expRes, incRes] = await Promise.all([
      offerLetterAPI.getMyOfferLetters(),
      salaryAPI.getMySalaryRecords(slipFilters),  // ✅ Use the correct endpoint
      resignationAPI.getMyRequests(),
      experienceLetterAPI.getMyLetters(),
      incrementLetterAPI.getMyLetters()
    ]);
    

    
    // Handle Offer Letters
    let offerLettersData = [];
    if (letterRes.data?.letters) offerLettersData = letterRes.data.letters;
    else if (letterRes.data?.data) offerLettersData = letterRes.data.data;
    else if (Array.isArray(letterRes.data)) offerLettersData = letterRes.data;
    else if (letterRes.data) offerLettersData = [letterRes.data];
    setLetters(offerLettersData);
    
    // Handle Salary Slips - Extract from salaryRecords array
    let salaryData = [];
    if (salaryRes.data) {
      if (salaryRes.data.salaryRecords && Array.isArray(salaryRes.data.salaryRecords)) {
      
        salaryData = salaryRes.data.salaryRecords;
      } 
      else if (Array.isArray(salaryRes.data)) {
        salaryData = salaryRes.data;
      }
      else if (salaryRes.data.results && Array.isArray(salaryRes.data.results)) {
        salaryData = salaryRes.data.results;
      }
      else if (salaryRes.data.data && Array.isArray(salaryRes.data.data)) {
        salaryData = salaryRes.data.data;
      }
    }
    
 
    setSlips(salaryData);
    
    // Handle Resignations
    let resignationsData = [];
    if (resigRes.data) {
      if (Array.isArray(resigRes.data)) resignationsData = resigRes.data;
      else if (resigRes.data.data && Array.isArray(resigRes.data.data)) resignationsData = resigRes.data.data;
      else if (resigRes.data.resignations && Array.isArray(resigRes.data.resignations)) resignationsData = resigRes.data.resignations;
    }
    setResignations(resignationsData);
    
    // Handle Experience Letters
    let experienceData = [];
    if (expRes.data) {
      if (Array.isArray(expRes.data)) experienceData = expRes.data;
      else if (expRes.data.data && Array.isArray(expRes.data.data)) experienceData = expRes.data.data;
      else if (expRes.data.letters && Array.isArray(expRes.data.letters)) experienceData = expRes.data.letters;
    }
    setExperiences(experienceData);
    
    // Handle Increment Letters
    let incrementData = [];
    if (incRes.data) {
      if (Array.isArray(incRes.data)) incrementData = incRes.data;
      else if (incRes.data.data && Array.isArray(incRes.data.data)) incrementData = incRes.data.data;
      else if (incRes.data.letters && Array.isArray(incRes.data.letters)) incrementData = incRes.data.letters;
    }
    setIncrements(incrementData);
    
  } catch (err) {
    console.error("Error fetching documents:", err);
    setError(err.response?.data?.message || err.message || "Failed to load documents");
  } finally {
    setLoading(false);
  }
};
  useEffect(() => {
    fetchDocs();
  }, [slipFilters]);

  const mapRecordToFormData = (record) => ({
    fullName: record.employee_name,
    designation: record.designation,
    monthYear: `${record.month} ${record.year}`,
    paymentMode: record.payment_mode || "Bank Transfer",
    earnings: {
      basic: record.basic_salary,
      hra: record.allowances?.hra || 0,
      conveyance: record.allowances?.transport || 0,
      medical: record.allowances?.medical || 0,
      special: record.allowances?.special || 0
    },
    deductions: {
      pf: record.deductions?.provident_fund || 0,
      pt: record.deductions?.professional_tax || 0,
      tds: record.deductions?.tax || 0
    }
  });

const handleDocAction = async (type, action, doc) => {
  try {

    
    if (type === 'offer') {
      if (action === 'view') await offerLetterPDFService.viewOfferLetter(doc.form_data);
      else await offerLetterPDFService.downloadOfferLetter(doc.form_data);
    } else if (type === 'salary') {
      const formData = mapRecordToFormData(doc);
      if (action === 'view') await salarySlipPDFService.viewSalarySlip(formData);
      else await salarySlipPDFService.downloadSalarySlip(formData);
    } else if (type === 'backend-pdf') {
      let pdfUrl = doc.letter_url || doc.pdf_url || doc.url;
      
      if (!pdfUrl) {
        alert("PDF URL not available for this document");
        return;
      }
      
      let backendBaseUrl = API_BASE_URL?.replace('/api', '') || 'http://localhost:8000';
      let finalUrl = pdfUrl.startsWith('http') ? pdfUrl : backendBaseUrl + (pdfUrl.startsWith('/') ? pdfUrl : '/' + pdfUrl);
      // Apply watermark for non-idcard documents
      if (finalUrl.toLowerCase().endsWith('.pdf') && !finalUrl.toLowerCase().includes('idcard')) {
        finalUrl = finalUrl.replace('/uploads/', '/uploads-watermarked/');
        const token = localStorage.getItem('token');
        finalUrl = `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}token=${token}`;
      }
      window.open(finalUrl, "_blank");
    }
  } catch (err) {
    console.error("Error:", err);
    alert("Failed to process document. Please try again.");
  }
};

  const handleResignationSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await resignationAPI.submitRequest(resignData);
      setShowResignModal(false);
      setResignData({ requested_last_day: '', reason: '' });
      fetchDocs();
      alert("Resignation request submitted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit resignation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const statusLower = status?.toLowerCase();
    switch(statusLower) {
      case 'accepted': 
      case 'approved': 
        return <span style={{ color: "#15803d", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>Accepted</span>;
      case 'rejected': 
        return <span style={{ color: "#b91c1c", background: "#fee2e2", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>Rejected</span>;
      case 'pending': 
        return <span style={{ color: "#b45309", background: "#fef3c7", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>Pending</span>;
      default: 
        return <span style={{ color: "var(--theme-text-muted,#64748b)", background: "var(--theme-bg-muted,#f1f5f9)", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>{status || 'Unknown'}</span>;
    }
  };

  if (loading && letters.length === 0 && slips.length === 0 && experiences.length === 0 && increments.length === 0) {
    return (
      <div className="docs-loading">
        <div className="spinner"></div>
        <p>Loading your documents...</p>
      </div>
    );
  }

  return (
    <div className="my-docs-container">
      <div className="docs-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>My Documents</h1>
          <p>View and download your official company documents.</p>
        </div>
        {activeTab === 'resignation' && !resignations.some(r => r.status?.toLowerCase() === 'pending') && (
          <button onClick={() => setShowResignModal(true)} style={{ background: "#ef4444", color: "var(--card-bg,#fff)", padding: "10px 16px", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <HiOutlinePlus size={20} /> Apply Resignation
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "8px", marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
          <button onClick={fetchDocs} style={{ marginLeft: "10px", padding: "4px 8px", background: "#b91c1c", color: "var(--card-bg,#fff)", border: "none", borderRadius: "4px", cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      <div className="docs-tabs" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button className={`tab-btn ${activeTab === 'offer' ? 'active' : ''}`} onClick={() => setActiveTab('offer')}>
          <HiOutlineDocumentText /> Offer Letters ({letters.length})
        </button>
        <button className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>
          <HiOutlineCurrencyDollar /> Salary Slips ({slips.length})
        </button>
        <button className={`tab-btn ${activeTab === 'experience' ? 'active' : ''}`} onClick={() => setActiveTab('experience')}>
          <HiOutlineBriefcase /> Experience Letters ({experiences.length})
        </button>
        <button className={`tab-btn ${activeTab === 'increment' ? 'active' : ''}`} onClick={() => setActiveTab('increment')}>
          <HiOutlineArrowTrendingUp /> Increment Letters ({increments.length})
        </button>
        <button className={`tab-btn ${activeTab === 'resignation' ? 'active' : ''}`} onClick={() => setActiveTab('resignation')}>
          <HiOutlineClipboardDocumentList /> Resignation ({resignations.length})
        </button>
      </div>

      <div className="docs-list">
        {activeTab === 'offer' && (
          letters.length > 0 ? letters.map((letter) => (
            <div key={letter.id} className="doc-card">
              <div className="doc-icon-container"><HiOutlineDocumentText className="doc-icon" /></div>
              <div className="doc-info">
                <h3>Offer Letter</h3>
                <p>Issued on: {new Date(letter.issue_date).toLocaleDateString('en-GB')}</p>
              </div>
              <div className="doc-actions">
                <button className="doc-view-btn" onClick={() => handleDocAction('offer', 'view', letter)}><HiOutlineEye size={20} /> <span>View</span></button>
                <button className="doc-download-btn" onClick={() => handleDocAction('offer', 'download', letter)}><HiOutlineArrowDownTray size={20} /> <span>Download</span></button>
              </div>
            </div>
          )) : <div className="no-docs"><HiOutlineDocumentText size={48} /><h3>No offer letters found</h3></div>
        )}

        {activeTab === 'salary' && (
          <>
            <div className="slips-filter-bar">
              <select value={slipFilters.month} onChange={(e) => setSlipFilters({ ...slipFilters, month: e.target.value })} className="filter-select">
                <option value="">All Months</option>
                {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={slipFilters.year} onChange={(e) => setSlipFilters({ ...slipFilters, year: e.target.value })} className="filter-select">
                <option value="">All Years</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {slips.length > 0 ? slips.map((slip) => (
              <div key={slip.id} className="doc-card">
                <div className="doc-icon-container salary-icon-bg"><HiOutlineCurrencyDollar className="doc-icon" /></div>
                <div className="doc-info">
                  <h3>Salary Slip</h3>
                  <p>Period: {slip.month} {slip.year}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--theme-text-muted,#64748b)" }}>Basic: ₹{slip.basic_salary?.toLocaleString()}</p>
                </div>
                <div className="doc-actions">
                  <button className="doc-view-btn" onClick={() => handleDocAction('salary', 'view', slip)}><HiOutlineEye size={20} /> <span>View</span></button>
                  <button className="doc-download-btn" onClick={() => handleDocAction('salary', 'download', slip)}><HiOutlineArrowDownTray size={20} /> <span>Download</span></button>
                </div>
              </div>
            )) : <div className="no-docs"><HiOutlineCurrencyDollar size={48} /><h3>No salary slips found</h3><p>Salary slips will appear here once generated.</p></div>}
          </>
        )}

        {activeTab === 'experience' && (
          experiences.length > 0 ? experiences.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon-container" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}><HiOutlineBriefcase className="doc-icon" /></div>
              <div className="doc-info">
                <h3>Experience Letter</h3>
                <p>Issued on: {doc.date_of_issue ? new Date(doc.date_of_issue).toLocaleDateString('en-GB') : 'N/A'}</p>
                {doc.ref_number && <p style={{ fontSize: "0.75rem", color: "var(--theme-text-muted,#64748b)" }}>Ref: {doc.ref_number}</p>}
              </div>
              <div className="doc-actions">
                {doc.letter_url && (
                  <button className="doc-view-btn" onClick={() => handleDocAction('backend-pdf', 'view', doc)}><HiOutlineEye size={20} /> <span>View</span></button>
                )}
              </div>
            </div>
          )) : <div className="no-docs"><HiOutlineBriefcase size={48} /><h3>No experience letters found</h3></div>
        )}

        {activeTab === 'increment' && (
          increments.length > 0 ? increments.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon-container" style={{ background: 'rgba(16,185,129,0.12)', color: '#15803d' }}><HiOutlineArrowTrendingUp className="doc-icon" /></div>
              <div className="doc-info">
                <h3>Increment Letter</h3>
                <p>Effective: {doc.effective_date ? new Date(doc.effective_date).toLocaleDateString('en-GB') : 'N/A'}</p>
                {doc.increment_percentage && <p>{doc.increment_percentage}% Increase</p>}
              </div>
              <div className="doc-actions">
                {doc.letter_url && (
                  <button className="doc-view-btn" onClick={() => handleDocAction('backend-pdf', 'view', doc)}><HiOutlineEye size={20} /> <span>View</span></button>
                )}
              </div>
            </div>
          )) : <div className="no-docs"><HiOutlineArrowTrendingUp size={48} /><h3>No increment letters found</h3></div>
        )}

        {activeTab === 'resignation' && (
          resignations.length > 0 ? resignations.map((doc) => (
            <div key={doc.id} className="doc-card">
              <div className="doc-icon-container" style={{ background: 'rgba(220,38,38,0.12)', color: '#b91c1c' }}><HiOutlineClipboardDocumentList className="doc-icon" /></div>
              <div className="doc-info">
                <h3>Resignation Request</h3>
                <p>Applied: {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB') : 'N/A'}</p>
                <p>Last Day: {doc.requested_last_day ? new Date(doc.requested_last_day).toLocaleDateString('en-GB') : 'N/A'}</p>
                {doc.reason && <p style={{ fontSize: "0.75rem", color: "var(--theme-text-muted,#64748b)" }}>Reason: {doc.reason.substring(0, 100)}</p>}
                <div style={{ marginTop: '8px' }}><StatusBadge status={doc.status} /></div>
              </div>
              <div className="doc-actions">
                {(doc.status?.toLowerCase() === 'accepted' || doc.status?.toLowerCase() === 'approved') && doc.letter_url && (
                  <button className="doc-view-btn" onClick={() => handleDocAction('backend-pdf', 'view', doc)}>
                    <HiOutlineEye size={20} /> <span>View Letter</span>
                  </button>
                )}
              </div>
            </div>
          )) : <div className="no-docs"><HiOutlineClipboardDocumentList size={48} /><h3>No resignation records found</h3><button onClick={() => setShowResignModal(true)} style={{ marginTop: "10px", padding: "8px 16px", background: "#ef4444", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer" }}>Apply for Resignation</button></div>
        )}
      </div>

      {showResignModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg,#fff)", padding: "24px", borderRadius: "12px", width: "400px", maxWidth: "90%", position: "relative" }}>
            <button type="button" onClick={() => setShowResignModal(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>×</button>
            <h3>Apply for Resignation</h3>
            <form onSubmit={handleResignationSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label>Requested Last Working Day *</label>
                <input type="date" required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} 
                       value={resignData.requested_last_day} onChange={e => setResignData({...resignData, requested_last_day: e.target.value})} />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label>Reason *</label>
                <textarea required rows="4" style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                          value={resignData.reason} onChange={e => setResignData({...resignData, reason: e.target.value})}></textarea>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowResignModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "8px 16px", background: "#ef4444", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDocuments;