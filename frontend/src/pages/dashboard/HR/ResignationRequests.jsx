import React, { useState, useEffect } from "react";
import { resignationAPI } from "../../../services/resignationAPI";
import { resignationPDFService } from "../../../services/resignationPDFService";
import { employeeAPI } from "../../../services/employeeAPI";
import { API_BASE_URL } from "../../../services/api";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineClock } from "react-icons/hi2";

const ResignationRequests = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [employeesMap, setEmployeesMap] = useState({});
  const [authUserId, setAuthUserId] = useState(null);

  // Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  
  const [acceptData, setAcceptData] = useState({ acceptedLastDay: "", hrNote: "" });
  const [rejectReason, setRejectReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchAuthUser();
  }, []);

  const fetchAuthUser = () => {
    // Basic way to get auth user details if needed for generatedBy? We don't strictly need it for Accept.
  };

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const apiRes = await resignationAPI.getAllRequests();
      setRequests(apiRes.data?.data || []);
      
      const empRes = await employeeAPI.getAll();
      const empData = empRes.data?.employees || empRes.data?.data || [];
      const map = {};
      empData.forEach(e => { map[e.user_id] = e; });
      setEmployeesMap(map);
      setError(null);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to load requests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAccept = (req) => {
    setSelectedRequest(req);
    // Auto-fill accepted day to requested day initially
    setAcceptData({
      acceptedLastDay: new Date(req.requested_last_day).toISOString().split('T')[0],
      hrNote: ""
    });
    setShowAcceptModal(true);
  };

  const handleOpenReject = (req) => {
    setSelectedRequest(req);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
        // 1. Generate PDF Blob
        const pdfData = {
            employeeName: `${selectedRequest.first_name} ${selectedRequest.last_name}`,
            joiningDate: selectedRequest.joining_date,
            requestedLastDay: acceptData.acceptedLastDay,
            hrNote: acceptData.hrNote,
            generatedAt: new Date(),
            refNumber: selectedRequest.ref_number
        };
        
    
        
        const pdfBlob = await resignationPDFService.generatePDFBlob(pdfData);
        
    

        // 2. Submit to API
        const formData = new FormData();
        formData.append('accepted_last_day', acceptData.acceptedLastDay);
        formData.append('hr_note', acceptData.hrNote);
        formData.append('pdf', pdfBlob, `resignation_${selectedRequest.id}.pdf`);
        
      

        const response = await resignationAPI.acceptRequest(selectedRequest.id, formData);
  
        
        setShowAcceptModal(false);
        await fetchRequests(); // Refresh the list
        alert("Resignation accepted and letter generated successfully!");
        
    } catch (err) {
        console.error("Error accepting request:", err);
        alert("Failed to accept request or generate PDF: " + (err.response?.data?.message || err.message));
    } finally {
        setIsProcessing(false);
    }
};

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await resignationAPI.rejectRequest(selectedRequest.id, { rejection_reason: rejectReason });
      setShowRejectModal(false);
      fetchRequests();
    } catch (err) {
      console.error("Error rejecting request:", err);
      alert("Failed to reject request.");
    } finally {
      setIsProcessing(false);
    }
  };

  const viewLetter = (url) => {
    if (!url) return;
    const watermarked = url.replace('/uploads/', '/uploads-watermarked/');
    const token = localStorage.getItem('token');
    const sep = watermarked.includes('?') ? '&' : '?';
    window.open(`${watermarked}${sep}token=${token}`, "_blank");
  };

  const StatusBadge = ({ status }) => {
    switch(status) {
      case 'accepted': return <span style={{ color: "#15803d", background: "#dcfce7", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>Accepted</span>;
      case 'rejected': return <span style={{ color: "#b91c1c", background: "#fee2e2", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>Rejected</span>;
      default: return <span style={{ color: "#b45309", background: "#fef3c7", padding: "4px 8px", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold" }}>Pending</span>;
    }
  };

  return (
    <div style={{ padding: "30px", background: "var(--theme-bg-muted,#f8fafc)", minHeight: "100vh" }}>
      <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--theme-text-strong,#1e293b)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <HiOutlineDocumentText size={28} color="#4f46e5" />
        Resignation Requests
      </h2>

      <div style={{ background: "var(--card-bg,#fff)", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", fontSize: "0.9rem" }}>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Ref Number</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Employee Name</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Department</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Applied On</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Req. Last Day</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Status</th>
                <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#b91c1c" }}>{error}</td></tr>
              ) : requests.length > 0 ? (
                requests.map(req => (
                  <tr key={req.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "all 0.2s" }}>
                    <td style={{ padding: "16px", fontWeight: "bold", color: "var(--theme-text,#334155)" }}>{req.ref_number}</td>
                    <td style={{ padding: "16px", color: "var(--theme-text,#334155)" }}>{req.first_name} {req.last_name}</td>
                    <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{req.department}</td>
                    <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{new Date(req.created_at).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{new Date(req.requested_last_day).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: "16px" }}><StatusBadge status={req.status} /></td>
                    <td style={{ padding: "16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                        {req.status === 'pending' && (
                          <>
                            <button onClick={() => handleOpenAccept(req)} title="Accept" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#15803d" }}><HiOutlineCheckCircle size={18} /></button>
                            <button onClick={() => handleOpenReject(req)} title="Reject" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#b91c1c" }}><HiOutlineXCircle size={18} /></button>
                          </>
                        )}
                        {req.status === 'accepted' && req.letter_url && (
                          <button onClick={() => viewLetter(API_BASE_URL + req.letter_url)} title="View Letter" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#4f46e5" }}><HiOutlineEye size={18} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>No requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAcceptModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg,#fff)", padding: "24px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--theme-text-strong,#1e293b)" }}>Accept Resignation</h3>
            <p style={{ fontSize: "14px", color: "var(--theme-text-muted,#64748b)", marginBottom: "16px" }}>You are about to accept the resignation for {selectedRequest?.first_name} {selectedRequest?.last_name}. A PDF letter will be automatically generated.</p>
            <form onSubmit={handleAcceptSubmit}>
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px", color: "var(--theme-text,#334155)" }}>Acceptance Date (Last Working Day)</label>
                <input type="date" required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} 
                       value={acceptData.acceptedLastDay} onChange={e => setAcceptData({...acceptData, acceptedLastDay: e.target.value})} />
              </div>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px", color: "var(--theme-text,#334155)" }}>HR Note (Optional)</label>
                <textarea rows="3" placeholder="Additional note in letter..." style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                          value={acceptData.hrNote} onChange={e => setAcceptData({...acceptData, hrNote: e.target.value})}></textarea>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowAcceptModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ padding: "8px 16px", background: "#15803d", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer", opacity: isProcessing ? 0.7 : 1 }}>
                  {isProcessing ? 'Generating...' : 'Accept & Generate Letter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg,#fff)", padding: "24px", borderRadius: "12px", width: "400px", maxWidth: "90%" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "var(--theme-text-strong,#1e293b)" }}>Reject Resignation</h3>
            <form onSubmit={handleRejectSubmit}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px", color: "var(--theme-text,#334155)" }}>Rejection Reason</label>
                <textarea required rows="4" placeholder="Briefly explain why..." style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
                          value={rejectReason} onChange={e => setRejectReason(e.target.value)}></textarea>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setShowRejectModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={isProcessing} style={{ padding: "8px 16px", background: "#b91c1c", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer", opacity: isProcessing ? 0.7 : 1 }}>
                  {isProcessing ? 'Processing...' : 'Reject Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResignationRequests;
