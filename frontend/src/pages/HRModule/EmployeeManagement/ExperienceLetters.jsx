import React, { useState, useEffect } from "react";
import { experienceLetterAPI } from "../../../services/experienceLetterAPI";
import { experiencePDFService } from "../../../services/experiencePDFService";
import { employeeAPI } from "../../../services/employeeAPI";
import { API_BASE_URL } from "../../../services/api";
import { useLocation } from "react-router-dom";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

const ExperienceLetters  = ({ initialEmployee = null }) => {
    const location = useLocation();
      const routedEmployee = initialEmployee || location.state?.employee || null;
  const [letters, setLetters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: "",
    date_of_issue: new Date().toISOString().split('T')[0],
    date_of_joining: "",
    last_working_day: "",
    designation: "",
    department: "",
    employment_type: "Full-Time",
    custom_note: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [letRes, empRes] = await Promise.all([
        experienceLetterAPI.getAllLetters(),
        employeeAPI.getAll()
      ]);
      setLetters(letRes.data?.data || []);
      setEmployees(empRes.data?.employees || empRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    const emp = employees.find(x => String(x.employee_id) === String(empId) || String(x.employee_id) === String(empId));
    if (emp) {
      setFormData({
        ...formData,
        employee_id: emp.employee_id || emp.employee_id,
        date_of_joining: emp.joining_date ? new Date(emp.joining_date).toISOString().split('T')[0] : "",
        last_working_day: emp.last_working_day ? new Date(emp.last_working_day).toISOString().split('T')[0] : "",
        designation: emp.designation || emp.position || "",
        department: emp.department || ""
      });
    } else {
      setFormData({ ...formData, employee_id: empId });
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const emp = employees.find(x => String(x.employee_id) === String(formData.employee_id) || String(x.employee_id) === String(formData.employee_id));
      
      // Build custom note that includes the exceptional performance text from original document
      const defaultCustomNote = `${emp?.first_name || 'The employee'} demonstrated exceptional technical skills, a strong work ethic, and a keen ability to adapt to new challenges. Their contributions have significantly impacted the success of our projects and the overall growth of the company.`;
      
      const pdfData = {
        employeeName: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim(),
        firstName: emp?.first_name || 'The employee',
        dateOfIssue: formData.date_of_issue,
        dateOfJoining: formData.date_of_joining,
        lastWorkingDay: formData.last_working_day,
        designation: formData.designation,
        department: formData.department,
        employmentType: formData.employment_type,
        customNote: formData.custom_note || defaultCustomNote,
        refNumber: `EXP/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      };

      const pdfBlob = await experiencePDFService.generatePDFBlob(pdfData);

      const fData = new FormData();
      Object.keys(formData).forEach(key => fData.append(key, formData[key]));
      fData.append('pdf', pdfBlob, 'experience_letter.pdf');

      await experienceLetterAPI.generateLetter(fData);
      setShowGenerateModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error("Error generating experience letter:", err);
      alert("Failed to generate letter. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: "",
      date_of_issue: new Date().toISOString().split('T')[0],
      date_of_joining: "",
      last_working_day: "",
      designation: "",
      department: "",
      employment_type: "Full-Time",
      custom_note: ""
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to revoke and delete this letter?")) return;
    try {
      await experienceLetterAPI.deleteLetter(id);
      fetchData();
    } catch (err) {
      console.error("Failed to delete", err);
      alert("Failed to delete letter.");
    }
  };

  const viewLetter = (url) => {
    if (url) {
      const base = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
      const watermarked = base.replace('/uploads/', '/uploads-watermarked/');
      const token = localStorage.getItem('token');
      window.open(`${watermarked}?token=${token}`, "_blank");
    }
  };

  const handlePreview = async () => {
    if (!formData.employee_id) {
      alert("Please select an employee first");
      return;
    }
    
    const emp = employees.find(x => String(x.employee_id) === String(formData.employee_id) || String(x.employee_id) === String(formData.employee_id));
    
    if (!formData.date_of_joining || !formData.last_working_day) {
      alert("Please fill in joining date and last working day");
      return;
    }
    
    const defaultCustomNote = `${emp?.first_name || 'The employee'} demonstrated exceptional technical skills, a strong work ethic, and a keen ability to adapt to new challenges. Their contributions have significantly impacted the success of our projects and the overall growth of the company.`;
    
    const pdfData = {
      employeeName: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim(),
      firstName: emp?.first_name || 'The employee',
      dateOfIssue: formData.date_of_issue,
      dateOfJoining: formData.date_of_joining,
      lastWorkingDay: formData.last_working_day,
      designation: formData.designation,
      department: formData.department,
      employmentType: formData.employment_type,
      customNote: formData.custom_note || defaultCustomNote,
      refNumber: `PREVIEW/${new Date().getFullYear()}/001`
    };
    
    try {
      const pdfBlob = await experiencePDFService.generatePDFBlob(pdfData);
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Preview error:", err);
      alert("Failed to preview letter");
    }
  };

  return (
    <div style={{ padding: "30px", background: "var(--theme-bg-muted,#f8fafc)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--theme-text-strong,#1e293b)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
          <HiOutlineDocumentText size={28} color="#4f46e5" />
          Experience Letters
        </h2>
        <button onClick={() => setShowGenerateModal(true)} style={{ background: "#4f46e5", color: "var(--card-bg,#fff)", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <HiOutlinePlus size={20} /> Generate Letter
        </button>
      </div>

      <div style={{ background: "var(--card-bg,#fff)", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "600px" }}>
          <thead>
            <tr style={{ background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", fontSize: "0.9rem" }}>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Ref Number</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Employee Name</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Designation</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Department</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Period</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Issue Date</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>Loading...</td></tr>
            ) : letters.length > 0 ? (
              letters.map(letter => (
                <tr key={letter.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px", fontWeight: "bold", color: "var(--theme-text,#334155)" }}>{letter.ref_number}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text,#334155)" }}>{letter.first_name} {letter.last_name}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{letter.designation}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{letter.department}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)", fontSize: "12px" }}>
                    {letter.date_of_joining && new Date(letter.date_of_joining).toLocaleDateString('en-GB')} - {letter.last_working_day && new Date(letter.last_working_day).toLocaleDateString('en-GB')}
                  </td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{letter.date_of_issue && new Date(letter.date_of_issue).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: "16px", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                      <button onClick={() => viewLetter(letter.letter_url)} title="View" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#4f46e5" }}>
                        <HiOutlineEye size={18} />
                      </button>
                      <button onClick={() => handleDelete(letter.id)} title="Revoke" style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#b91c1c" }}>
                        <HiOutlineTrash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>No experience letters issued yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showGenerateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg,#fff)", padding: "24px", borderRadius: "12px", width: "550px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button type="button" onClick={() => setShowGenerateModal(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>×</button>
            <h3 style={{ margin: "0 0 20px 0", color: "var(--theme-text-strong,#1e293b)", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Generate Experience Letter</h3>
            <form onSubmit={handleGenerateSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px", color: "var(--theme-text,#334155)" }}>Select Employee *</label>
                  <select required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.employee_id} onChange={handleEmployeeSelect}>
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={emp.employee_id || emp.employee_id} value={emp.employee_id || emp.employee_id}>
                        {emp.first_name} {emp.last_name} - {emp.designation || emp.position || 'No Designation'}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Date of Issue *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.date_of_issue} onChange={e => setFormData({...formData, date_of_issue: e.target.value})} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Employment Type *</label>
                  <select required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.employment_type} onChange={e => setFormData({...formData, employment_type: e.target.value})}>
                    <option>Full-Time</option>
                    <option>Part-Time</option>
                    <option>Contract</option>
                    <option>Internship</option>
                  </select>
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Date of Joining *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.date_of_joining} onChange={e => setFormData({...formData, date_of_joining: e.target.value})} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Last Working Day *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.last_working_day} onChange={e => setFormData({...formData, last_working_day: e.target.value})} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Designation *</label>
                  <input type="text" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
                </div>
                
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Department *</label>
                  <input type="text" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Custom Note (Optional)</label>
                  <textarea rows="3" placeholder="Add any additional achievements or notes about the employee..." style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontFamily: "inherit" }} value={formData.custom_note} onChange={e => setFormData({...formData, custom_note: e.target.value})}></textarea>
                  <small style={{ color: "var(--theme-text-muted,#64748b)", fontSize: "11px" }}>Leave empty to use the default exceptional performance statement</small>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", marginTop: "20px" }}>
                <button type="button" onClick={() => setShowGenerateModal(false)} style={{ padding: "8px 16px", background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                  Cancel
                </button>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" onClick={handlePreview} style={{ padding: "8px 16px", background: "#10b981", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer" }}>
                    Preview
                  </button>
                  <button type="submit" disabled={isProcessing} style={{ padding: "8px 16px", background: "#4f46e5", color: "var(--card-bg,#fff)", border: "none", borderRadius: "6px", cursor: "pointer", opacity: isProcessing ? 0.7 : 1 }}>
                    {isProcessing ? 'Generating...' : 'Generate & Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExperienceLetters;