import React, { useState, useEffect } from "react";
import { incrementLetterAPI } from "../../../services/incrementLetterAPI";
import { incrementPDFService } from "../../../services/incrementPDFService";
import { employeeAPI } from "../../../services/employeeAPI";
import { API_BASE_URL } from "../../../services/api";
import { useLocation } from "react-router-dom";
import { HiOutlineDocumentText, HiOutlineEye, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";

const getEmployeeSelectId = (employee) => employee?.employee_id || employee?.id || employee?.user_id || "";

const getEmployeeCode = (employee) => employee?.employee_code || employee?.employee_id || employee?.id || "";

const getEmployeeName = (employee) => {
  const fullName = `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim();
  return fullName || employee?.name || employee?.employee_name || employee?.email || "Unnamed Employee";
};

const getEmployeeDepartment = (employee) => (
  employee?.department_names?.join(", ") ||
  employee?.department_name ||
  employee?.department ||
  ""
);

const isEmployeeActive = (employee) => {
  const status = String(employee?.status || "").toLowerCase();
  const isActiveValue = employee?.is_active;
  const isActive = isActiveValue === true || isActiveValue === 1 || isActiveValue === "1";
  return isActive && status !== "inactive";
};

const IncrementLetters  = ({ initialEmployee = null }) => {
    const location = useLocation();
      const routedEmployee = initialEmployee || location.state?.employee || null;
  const [letters, setLetters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: "",
    employee_code: "",
    date_of_issue: new Date().toISOString().split('T')[0],
    effective_date: "",
    previous_ctc: "",
    revised_ctc: "",
    currency: "INR",
    designation: "",
    department: "",
    performance_note: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [lettersResult, employeesResult] = await Promise.allSettled([
        incrementLetterAPI.getAllLetters(),
        employeeAPI.getAll({ is_active: true })
      ]);

      if (lettersResult.status === "fulfilled") {
        setLetters(lettersResult.value.data?.data || []);
      } else {
        console.error("Error fetching increment letters:", lettersResult.reason);
        setLetters([]);
      }

      if (employeesResult.status === "fulfilled") {
        const employeesPayload = employeesResult.value.data;
        const employeesList = employeesPayload?.employees || employeesPayload?.data || [];
        setEmployees(Array.isArray(employeesList) ? employeesList.filter(isEmployeeActive) : []);
      } else {
        console.error("Error fetching employees:", employeesResult.reason);
        setEmployees([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    const emp = employees.find(x => String(getEmployeeSelectId(x)) === String(empId));
    if (emp) {
      setFormData({
        ...formData,
        employee_id: getEmployeeSelectId(emp),
        employee_code: getEmployeeCode(emp),
        designation: emp.designation || emp.position || "",
        department: getEmployeeDepartment(emp),
        previous_ctc: emp.ctc || emp.salary || ""
      });
    } else {
      setFormData({ ...formData, employee_id: empId });
    }
  };

  const calculatePercentage = () => {
    const prev = parseFloat(formData.previous_ctc);
    const rev = parseFloat(formData.revised_ctc);
    if (!isNaN(prev) && !isNaN(rev) && prev > 0) {
      return ((rev - prev) / prev * 100).toFixed(2);
    }
    return "0.00";
  };

  const handlePreview = async () => {
    if (!formData.employee_id) {
      alert("Please select an employee");
      return;
    }
    
    const emp = employees.find(x => String(getEmployeeSelectId(x)) === String(formData.employee_id));
    
    const pdfData = {
      employeeName: getEmployeeName(emp),
      employeeCode: formData.employee_code || getEmployeeCode(emp),
      designation: formData.designation,
      department: formData.department,
      dateOfIssue: formData.date_of_issue,
      effectiveDate: formData.effective_date,
      previousCtc: formData.previous_ctc,
      revisedCtc: formData.revised_ctc,
      currency: formData.currency,
      incrementPercentage: calculatePercentage(),
      performanceNote: formData.performance_note,
      refNumber: `PREVIEW/${new Date().getFullYear()}/001`
    };
    
    try {
      const pdfBlob = await incrementPDFService.generatePDFBlob(pdfData);
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error("Preview error:", err);
      alert("Failed to preview letter: " + err.message);
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const emp = employees.find(x => String(getEmployeeSelectId(x)) === String(formData.employee_id));
      
      if (!emp) {
        alert("Employee not found");
        setIsProcessing(false);
        return;
      }
      
      const pdfData = {
        employeeName: getEmployeeName(emp),
        employeeCode: formData.employee_code || getEmployeeCode(emp),
        designation: formData.designation,
        department: formData.department,
        dateOfIssue: formData.date_of_issue,
        effectiveDate: formData.effective_date,
        previousCtc: formData.previous_ctc,
        revisedCtc: formData.revised_ctc,
        currency: formData.currency,
        incrementPercentage: calculatePercentage(),
        performanceNote: formData.performance_note,
        refNumber: `INC/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
      };

      const pdfBlob = await incrementPDFService.generatePDFBlob(pdfData);

      const fData = new FormData();
      fData.append('employee_id', formData.employee_id);
      fData.append('employee_code', formData.employee_code);
      fData.append('date_of_issue', formData.date_of_issue);
      fData.append('effective_date', formData.effective_date);
      fData.append('previous_ctc', formData.previous_ctc);
      fData.append('revised_ctc', formData.revised_ctc);
      fData.append('currency', formData.currency);
      fData.append('designation', formData.designation);
      fData.append('department', formData.department);
      fData.append('performance_note', formData.performance_note);
      fData.append('pdf', pdfBlob, 'increment_letter.pdf');

      await incrementLetterAPI.generateLetter(fData);
      setShowGenerateModal(false);
      resetForm();
      fetchData();
      alert("Increment letter generated successfully!");
    } catch (err) {
      console.error("Error generating increment letter:", err);
      alert(`Failed to generate letter: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: "",
      employee_code: "",
      date_of_issue: new Date().toISOString().split('T')[0],
      effective_date: "",
      previous_ctc: "",
      revised_ctc: "",
      currency: "INR",
      designation: "",
      department: "",
      performance_note: ""
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to revoke this increment letter?")) return;
    try {
      await incrementLetterAPI.deleteLetter(id);
      fetchData();
    } catch (err) {
      console.error("Failed to delete", err);
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

  return (
    <div style={{ padding: "30px", background: "var(--theme-bg-muted,#f8fafc)", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "var(--theme-text-strong,#1e293b)", display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
          <HiOutlineDocumentText size={28} color="#4f46e5" />
          Increment Letters
        </h2>
        <button onClick={() => setShowGenerateModal(true)} style={{ background: "#4f46e5", color: "var(--card-bg,#fff)", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <HiOutlinePlus size={20} /> Generate Letter
        </button>
      </div>

      <div style={{ background: "var(--card-bg,#fff)", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "800px" }}>
          <thead>
            <tr style={{ background: "var(--theme-bg-muted,#f1f5f9)", color: "var(--theme-text,#475569)", fontSize: "0.9rem" }}>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Ref Number</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Employee Name</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Designation</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Effective Date</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Previous CTC</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Revised CTC</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>Increment %</th>
              <th style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>Loading...</td></tr>
            ) : letters.length > 0 ? (
              letters.map(letter => (
                <tr key={letter.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "16px", fontWeight: "bold", color: "var(--theme-text,#334155)" }}>{letter.ref_number}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text,#334155)" }}>{letter.first_name} {letter.last_name}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{letter.designation}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{letter.effective_date && new Date(letter.effective_date).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{Number(letter.previous_ctc).toLocaleString()} {letter.currency}</td>
                  <td style={{ padding: "16px", color: "#15803d", fontWeight: "bold" }}>{Number(letter.revised_ctc).toLocaleString()} {letter.currency}</td>
                  <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{letter.increment_percentage}%</td>
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
              <tr><td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>No increment letters issued yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showGenerateModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 }}>
          <div style={{ background: "var(--card-bg,#fff)", padding: "24px", borderRadius: "12px", width: "650px", maxWidth: "90%", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button type="button" onClick={() => setShowGenerateModal(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>×</button>
            <h3 style={{ margin: "0 0 20px 0", color: "var(--theme-text-strong,#1e293b)", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Generate Increment Letter</h3>
            <form onSubmit={handleGenerateSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Select Employee *</label>
                  <select required style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.employee_id} onChange={handleEmployeeSelect}>
                    <option value="">-- Select Employee --</option>
                    {employees.map(emp => (
                      <option key={getEmployeeSelectId(emp)} value={getEmployeeSelectId(emp)}>
                        {getEmployeeName(emp)} - {emp.designation || emp.position || 'No Designation'} ({getEmployeeCode(emp)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Employee Code *</label>
                  <input type="text" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.employee_code} onChange={e => setFormData({...formData, employee_code: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Date of Issue *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.date_of_issue} onChange={e => setFormData({...formData, date_of_issue: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Effective Date *</label>
                  <input type="date" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.effective_date} onChange={e => setFormData({...formData, effective_date: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Previous CTC *</label>
                  <input type="number" step="0.01" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.previous_ctc} onChange={e => setFormData({...formData, previous_ctc: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Revised CTC *</label>
                  <input type="number" step="0.01" required style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.revised_ctc} onChange={e => setFormData({...formData, revised_ctc: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Currency</label>
                  <select style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Increment %</label>
                  <div style={{ padding: "10px", background: "#e8f4f8", borderRadius: "6px", textAlign: "center", color: "#15803d", fontWeight: "bold", fontSize: "16px" }}>
                    {calculatePercentage()}%
                  </div>
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
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", fontSize: "14px" }}>Performance Note (Optional)</label>
                  <textarea rows="3" placeholder="We extend our warm congratulations to you for your outstanding contributions..." style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1" }} value={formData.performance_note} onChange={e => setFormData({...formData, performance_note: e.target.value})} />
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

export default IncrementLetters;
