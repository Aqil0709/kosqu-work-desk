import { useEffect, useState } from "react";
import { employeeAPI } from "../../../services/employeeAPI";
import { offerLetterPDFService } from "../../../services/offerLetterPDFService";
import companyLogo from "../../../assets/img/company.png";
import stampPng from "../../../assets/img/stamp.png";
import { TbWorld } from "react-icons/tb";
import { TfiEmail } from "react-icons/tfi";
import { HiOutlineDocumentText, HiOutlineUserGroup, HiOutlineBriefcase, HiOutlineArrowDownOnSquare, HiOutlineEye, HiOutlineArrowDownTray, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import offerLetterAPI from "../../../services/offerLetterAPI";
import brandingAPI from "../../../services/brandingAPI";

// Helper function to convert number to words (Indian numbering system)
const numberToWords = (num) => {
  if (!num || isNaN(num) || num <= 0) return "";
  const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";
  let str = "";
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + " " + a[n[1][1]]) + "Crore " : "";
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + " " + a[n[2][1]]) + "Lakh " : "";
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + " " + a[n[3][1]]) + "Thousand " : "";
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + " " + a[n[4][1]]) + "Hundred " : "";
  str += (n[5] != 0) ? ((str != "") ? "and " : "") + (a[Number(n[5])] || b[n[5][0]] + " " + a[n[5][1]]) : "";
  return str.trim();
};

const salaryBreakupRows = [
  { key: "basicSalary", label: "Basic Salary" },
  { key: "hra", label: "HRA" },
  { key: "conveyanceAllowance", label: "Conveyance Allowance" },
  { key: "specialAllowance", label: "Special Allowance" },
  { key: "medicalAllowance", label: "Medical Allowance" },
  { key: "ctc", label: "Total Earning", bold: true },
  { key: "professionalTax", label: "Professional Tax (PT)" },
  { key: "tds", label: "TDS" },
  { key: "employerPfContribution", label: "Employer PF Contribution" },
  { key: "employerEsiContribution", label: "Employer ESI Contribution" },
  { key: "netSalary", label: "Net Pay", bold: true }
];

const emptySalaryBreakup = salaryBreakupRows.reduce((acc, row) => {
  acc[row.key] = { monthly: "", annual: "" };
  return acc;
}, {});

const calculateAnnualFromMonthly = (value) => {
  if (value === "" || value === null || value === undefined) return "";

  const monthly = Number(value);
  if (Number.isNaN(monthly)) return "";

  return String(monthly * 12);
};

const OfferLetter = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [updatingOfferId, setUpdatingOfferId] = useState(null);

  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    salutation: "Mr.",
    fullName: "",
    address: "",
    phone: "",
    email: "",
    designation: "",
    joiningDate: "",
    ctc: "",
    ctcInWords: "",
    salaryBreakup: emptySalaryBreakup,
    termsAndConditions: [
      "The employee shall abide by all company policies, rules, and regulations.",
      "This offer is contingent upon satisfactory background verification and reference checks.",
      "The first three months shall be a probationary period, during which either party may terminate employment with one week's notice.",
      "The company reserves the right to modify terms with prior notice.",
      "Confidentiality of company information must be maintained during and after employment.",
      "All intellectual property created during employment shall belong to the company.",
      "The employee agrees not to engage in any competing business during employment and for six months after termination.",
      "Employment may be terminated by either party with one month's notice or payment in lieu thereof."
    ]
  });

  const [branding, setBranding] = useState({
    company_name: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    company_website: '',
    hr_name: '',
    hr_designation: '',
    logo_url: null,
    stamp_url: stampPng,
    signature_url: null
  });

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeAPI.getAll();
        // console.log("Employees API Response:", res.data);
        const employeesData = res.data.employees || res.data.data || (Array.isArray(res.data) ? res.data : []);
        setEmployees(employeesData);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };
    const fetchDepartments = async () => {
      try {
        const res = await employeeAPI.getDepartments();
        setDepartments(res.data.departments || []);
      } catch (err) {
        console.error("Error fetching departments:", err);
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
            company_phone: b.company_phone || '',
            company_website: b.company_website || '',
            hr_name: b.hr_name || '',
            hr_designation: b.hr_designation || '',
            logo_url: b.logo_url ? brandingAPI.getImageUrl(b.logo_url) : null,
            stamp_url: b.stamp_url ? brandingAPI.getImageUrl(b.stamp_url) : stampPng,
            signature_url: b.signature_url ? brandingAPI.getImageUrl(b.signature_url) : null
          });

          // Set default terms from branding if available
          if (b.default_terms) {
            try {
              const parsedTerms = typeof b.default_terms === 'string' ? JSON.parse(b.default_terms) : b.default_terms;
              if (Array.isArray(parsedTerms) && parsedTerms.length > 0) {
                setFormData(prev => ({ ...prev, termsAndConditions: parsedTerms }));
              }
            } catch (e) {
              console.error('Failed to parse default_terms from branding:', e);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching branding:", err);
      }
    };
    fetchEmployees();
    fetchDepartments();
    fetchHistory();
    fetchBranding();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await offerLetterAPI.getAll();
      setHistory(res.data.data || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelect = async (e) => {
    const empId = e.target.value;
    setSelectedEmployee(empId);

    if (!empId) {
      setSelectedUserId(null);
      setFormData({
        issueDate: new Date().toISOString().split('T')[0],
        fullName: "",
        address: "",
        phone: "",
        email: "",
        designation: "",
        joiningDate: "",
        ctc: "",
        ctcInWords: "",
        salaryBreakup: emptySalaryBreakup
      });
      return;
    }

    try {
      const res = await employeeAPI.getById(empId);
      const emp = res.data.employee || res.data;

      setSelectedUserId(emp.user_id);
      setFormData((prev) => ({
        ...prev,
        fullName: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
        email: emp.email || "",
        phone: emp.phone || emp.mobile || "",
        address: emp.address || "",
        designation: emp.position || emp.role_name || "",
        joiningDate: emp.joining_date || ""
      }));
    } catch (err) {
      console.error("Error fetching employee details:", err);
    }
  };

  const handleDownload = async () => {
    if (!formData.fullName) {
      alert("Please select or enter employee details first.");
      return;
    }
    setIsGenerating(true);
    try {
      await offerLetterPDFService.downloadOfferLetter(formData);
    } catch (err) {
      console.error("Error in generation:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getOfferCandidateName = (item) => {
    return item.candidate_name || item.form_data?.fullName || `${item.first_name || ""} ${item.last_name || ""}`.trim() || "Candidate";
  };

  const getOfferCandidateEmail = (item) => {
    return item.candidate_email || item.form_data?.email || item.email || "";
  };

  const getOfferStatus = (item) => String(item.status || "Pending");

  const isFinalOfferStatus = (status) => ["Accepted", "Rejected"].includes(status);

  const handleRejectOffer = async (item) => {
    const status = getOfferStatus(item);
    if (isFinalOfferStatus(status)) return;

    if (!window.confirm(`Reject offer letter for ${getOfferCandidateName(item)}?`)) return;

    setUpdatingOfferId(item.id);
    try {
      await offerLetterAPI.updateStatus(item.id, { status: "Rejected" });
      alert("Offer letter rejected.");
      await fetchHistory();
    } catch (err) {
      console.error("Error rejecting offer:", err);
      alert(err.response?.data?.message || "Failed to reject offer letter.");
    } finally {
      setUpdatingOfferId(null);
    }
  };

  const handleAcceptOffer = async (item) => {
    const status = getOfferStatus(item);
    if (isFinalOfferStatus(status)) return;

    const candidateName = getOfferCandidateName(item);
    const defaultEmployeeId = item.employee_display_id || "";
    const newEmployeeId = window.prompt(`Enter employee ID for ${candidateName}`, defaultEmployeeId);
    if (!newEmployeeId) return;

    const departmentHelp = departments.length > 0
      ? departments.map((department) => `${department.id}: ${department.name}`).join("\n")
      : "Create a department first, then enter the department ID here.";
    const departmentId = window.prompt(`Enter department ID:\n${departmentHelp}`, departments[0]?.id || "");
    if (!departmentId) return;

    const employmentType = window.prompt("Enter employment type", item.form_data?.employmentType || "Full-time");
    if (!employmentType) return;

    if (!window.confirm(`Accept offer for ${candidateName} and create employee ${newEmployeeId}?`)) return;

    setUpdatingOfferId(item.id);
    try {
      await offerLetterAPI.updateStatus(item.id, {
        status: "Accepted",
        new_employee_id: newEmployeeId.trim(),
        department_id: String(departmentId).trim(),
        employment_type: employmentType.trim()
      });
      alert("Offer accepted and employee created successfully.");
      await Promise.all([fetchHistory(), employeeAPI.getAll().then((res) => {
        const employeesData = res.data.employees || res.data.data || (Array.isArray(res.data) ? res.data : []);
        setEmployees(employeesData);
      })]);
    } catch (err) {
      console.error("Error accepting offer:", err);
      alert(err.response?.data?.message || "Failed to accept offer letter.");
    } finally {
      setUpdatingOfferId(null);
    }
  };

  const handleSave = async () => {
    if (!selectedUserId) {
      alert("Please select an existing employee from the search list to save to their dashboard.");
      return;
    }

    setIsGenerating(true);
    try {
      await offerLetterAPI.save({
        employee_id: selectedUserId,
        form_data: formData,
        issue_date: formData.issueDate
      });
      alert("Offer letter successfully saved to employee's dashboard!");
      fetchHistory(); // Refresh history
    } catch (err) {
      console.error("Error saving to database:", err);
      alert("Failed to save. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const inputStyle = {
    padding: "10px 14px",
    width: "100%",
    border: "1px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "15px",
    boxSizing: "border-box",
    transition: "all 0.2s ease",
    background: "var(--theme-bg-muted,#f8fafc)"
  };

  const sectionHeaderStyle = {
    fontSize: "16px",
    fontWeight: "700",
    color: "#4f46e5",
    marginBottom: "15px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderBottom: "1.5px solid #eef2ff",
    paddingBottom: "8px"
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--theme-text,#475569)",
    marginBottom: "6px",
    display: "block"
  };

  const handleSalaryBreakupChange = (rowKey, column, value) => {
    setFormData((prev) => {
      const nextRow = {
        ...emptySalaryBreakup[rowKey],
        ...(prev.salaryBreakup?.[rowKey] || {}),
        [column]: value
      };

      if (column === "monthly") {
        nextRow.annual = calculateAnnualFromMonthly(value);
      }

      const salaryBreakup = {
        ...emptySalaryBreakup,
        ...(prev.salaryBreakup || {}),
        [rowKey]: nextRow
      };

      const updates = { salaryBreakup };
      if (rowKey === "ctc" && column === "annual") {
        updates.ctc = value;
        updates.ctcInWords = numberToWords(value) || prev.ctcInWords;
      }
      if (rowKey === "ctc" && column === "monthly") {
        updates.ctc = nextRow.annual;
        updates.ctcInWords = numberToWords(nextRow.annual) || prev.ctcInWords;
      }

      return { ...prev, ...updates };
    });
  };

  const salaryTableCellStyle = {
    border: "1px solid #000",
    padding: "6px 8px",
    fontSize: "9pt"
  };

  const renderSalaryBreakupPreviewRows = () => salaryBreakupRows.map((row) => (
    <tr key={row.key}>
      <td style={{ ...salaryTableCellStyle, fontWeight: row.bold ? "bold" : "normal" }}>{row.label}</td>
      <td style={{ ...salaryTableCellStyle, textAlign: "right", fontWeight: row.bold ? "bold" : "normal" }}>
        {formData.salaryBreakup?.[row.key]?.monthly || "-"}
      </td>
      <td style={{ ...salaryTableCellStyle, textAlign: "right", fontWeight: row.bold ? "bold" : "normal" }}>
        {formData.salaryBreakup?.[row.key]?.annual || "-"}
      </td>
    </tr>
  ));

  const formatDate = (dateString) => {
    if (!dateString) return "DD-MM-YYYY";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
  };

  return (
    <div style={{ padding: "20px", background: "#f4f7f6", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
        <h1 style={{ margin: 0, color: "#2c3e50", fontSize: "28px" }}>Offer Letter Generator</h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleSave}
            disabled={isGenerating}
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            <HiOutlineArrowDownOnSquare size={20} />
            {isGenerating ? "Saving..." : "Save to Dashboard"}
          </button>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            style={{
              padding: "12px 24px",
              background: "#2ecc71",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.3s ease",
              opacity: isGenerating ? 0.7 : 1
            }}
          >
            <HiOutlineArrowDownTray size={20} />
            {isGenerating ? "Processing..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "30px" }}>
        {/* 🔥 LEFT COLUMN: FORM */}
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>

          <section style={{ marginBottom: "25px" }}>
            <h3 style={sectionHeaderStyle}>
              <HiOutlineDocumentText size={20} /> General Info
            </h3>
            <div>
              <label style={labelStyle}>Letter Issue Date</label>
              <input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} style={inputStyle} />
            </div>
          </section>

          <section style={{ marginBottom: "25px" }}>
            <h3 style={sectionHeaderStyle}>
              <HiOutlineUserGroup size={20} /> Personal Info
            </h3>
            <label style={labelStyle}>Full Name & Salutation</label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
              <select
                value={formData.salutation}
                onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                style={{ ...inputStyle, width: "80px", marginBottom: 0 }}
              >
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
              </select>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  list="employee-list"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, fullName: val });

                    // Auto-populate search
                    const match = employees.find(emp =>
                      `${emp.first_name} ${emp.last_name}`.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (match) {
                      const empId = match.id || match.employee_id;
                      if (empId) handleSelect({ target: { value: empId } });
                    }
                  }}
                  style={{ ...inputStyle, marginBottom: 0 }}
                />
                <datalist id="employee-list">
                  {employees.map(emp => (
                    <option key={emp.id || emp.employee_id} value={`${emp.first_name} ${emp.last_name}`.trim()} />
                  ))}
                </datalist>
              </div>
            </div>
            <label style={labelStyle}>Address</label>
            <input placeholder="Enter full address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Phone Number</label>
            <input placeholder="e.g. +91 98765 43210" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />

            <label style={labelStyle}>Email Address</label>
            <input placeholder="e.g. employee@example.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
          </section>

          <section style={{ marginBottom: "20px" }}>
            <h3 style={sectionHeaderStyle}>
              <HiOutlineBriefcase size={20} /> Job & Salary
            </h3>
            <label style={labelStyle}>Designation</label>
            <input placeholder="e.g. Full Stack Developer" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} style={inputStyle} />

            <div style={{ marginBottom: "12px" }}>
              <label style={labelStyle}>Joining Date</label>
              <input type="date" value={formData.joiningDate} onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })} style={inputStyle} />
            </div>

            <label style={labelStyle}>Annual CTC</label>
            <input placeholder="e.g. 96000" value={formData.ctc} onChange={(e) => {
              const val = e.target.value;
              setFormData({
                ...formData,
                ctc: val,
                ctcInWords: numberToWords(val),
                salaryBreakup: {
                  ...emptySalaryBreakup,
                  ...(formData.salaryBreakup || {}),
                  ctc: {
                    ...emptySalaryBreakup.ctc,
                    ...(formData.salaryBreakup?.ctc || {}),
                    annual: val
                  }
                }
              });
            }} style={inputStyle} type="number" />

            <label style={labelStyle}>CTC in Words</label>
            <input placeholder="Auto generated or enter manually" value={formData.ctcInWords} onChange={(e) => setFormData({ ...formData, ctcInWords: e.target.value })} style={inputStyle} />
          </section>

          <section style={{ marginBottom: "20px" }}>
            <h3 style={sectionHeaderStyle}>
              <HiOutlineDocumentText size={20} /> Salary Breakup
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Component</th>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Per Month</th>
                    <th style={{ textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0" }}>Per Annum</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryBreakupRows.map((row) => (
                    <tr key={row.key}>
                      <td style={{ padding: "8px", fontWeight: row.bold ? "700" : "500", color: "var(--theme-text,#334155)" }}>{row.label}</td>
                      <td style={{ padding: "8px" }}>
                        <input
                          placeholder="e.g. Rs. 6,000"
                          value={formData.salaryBreakup?.[row.key]?.monthly || ""}
                          onChange={(e) => handleSalaryBreakupChange(row.key, "monthly", e.target.value)}
                          style={{ ...inputStyle, marginBottom: 0, padding: "8px 10px" }}
                        />
                      </td>
                      <td style={{ padding: "8px" }}>
                        <input
                          placeholder="e.g. Rs. 72,000"
                          value={formData.salaryBreakup?.[row.key]?.annual || ""}
                          onChange={(e) => handleSalaryBreakupChange(row.key, "annual", e.target.value)}
                          style={{ ...inputStyle, marginBottom: 0, padding: "8px 10px" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Terms and Conditions Section */}
          <section style={{ marginBottom: "20px" }}>
            <h3 style={sectionHeaderStyle}>
              <HiOutlineClipboardDocumentList size={20} /> Terms & Conditions
            </h3>
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Add Terms and Conditions (one per line)</label>
              <textarea
                placeholder="Enter each term on a new line"
                value={formData.termsAndConditions?.join('\n') || ''}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(line => line.trim() !== '');
                  setFormData({ ...formData, termsAndConditions: lines });
                }}
                style={{
                  ...inputStyle,
                  minHeight: "150px",
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: "13px"
                }}
              />
              <div style={{ fontSize: "12px", color: "var(--theme-text-muted,#64748b)", marginTop: "5px" }}>
                Each line will be treated as a separate term. Current count: {formData.termsAndConditions?.length || 0} terms
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const newTerms = [...(formData.termsAndConditions || []), "New term..."];
                  setFormData({ ...formData, termsAndConditions: newTerms });
                }}
                style={{
                  padding: "8px 16px",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Add Term
              </button>
              <button
                onClick={() => {
                  const newTerms = formData.termsAndConditions?.slice(0, -1) || [];
                  setFormData({ ...formData, termsAndConditions: newTerms });
                }}
                style={{
                  padding: "8px 16px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Remove Last
              </button>
              <button
                onClick={() => {
                  setFormData({
                    ...formData,
                    termsAndConditions: [
                      "The employee shall abide by all company policies, rules, and regulations.",
                      "This offer is contingent upon satisfactory background verification and reference checks.",
                      "The first three months shall be a probationary period, during which either party may terminate employment with one week's notice.",
                      "The company reserves the right to modify terms with prior notice.",
                      "Confidentiality of company information must be maintained during and after employment.",
                      "All intellectual property created during employment shall belong to the company.",
                      "The employee agrees not to engage in any competing business during employment and for six months after termination.",
                      "Employment may be terminated by either party with one month's notice or payment in lieu thereof."
                    ]
                  });
                }}
                style={{
                  padding: "8px 16px",
                  background: "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px"
                }}
              >
                Reset to Default
              </button>
            </div>
          </section>
        </div>

        {/* 🔥 RIGHT COLUMN: LIVE PREVIEW */}
        <div style={{ background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 8px 30px rgba(0,0,0,0.12)", position: "sticky", top: "20px", maxHeight: "calc(100vh - 40px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: "30px" }}>
          {/* PAGE 1 PREVIEW */}
          <div style={{ border: "1px solid #eee", minHeight: "1000px", background: "white", color: "#000", fontSize: "11pt", lineHeight: "1.6", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "5px 10px", background: "var(--theme-bg-muted,#f8fafc)", borderBottom: "1px solid #eee", fontSize: "10pt", color: "var(--theme-text-muted,#64748b)", fontWeight: "bold" }}>Page 1</div>
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "50px", borderBottom: "5px solid #000", padding: "20px 40px 10px 40px", marginBottom: "30px", boxSizing: "border-box", width: "100%"
            }}>
              <div style={{ flex: "0 0 auto" }}>
                {branding.logo_url && <img src={branding.logo_url} alt="Logo" style={{ height: "120px", width: "auto", maxWidth: "300px", objectFit: "contain", display: "block", padding: "0 2px" }} />}
              </div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center", maxWidth: "60%", flex: "0 0 auto", wordBreak: "break-all" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TbWorld size={18} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_website}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TfiEmail size={16} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_email}</span>
                </div>
              </div>
            </div>

            {/* Content area Page 1 */}
            <div style={{ padding: "0 40px 40px 40px", flexGrow: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
                <div style={{ textAlign: "left" }}>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>To,</p>
                  <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>{formData.salutation} {formData.fullName || "________________"}</p>
                  <p style={{ margin: "0 0 5px 0" }}>{formData.address || "________________"}</p>
                  <p style={{ margin: "0 0 5px 0" }}>Tel : {formData.phone || "________________"}</p>
                  <p style={{ margin: "0 0 5px 0" }}>E-mail: {formData.email || "________________"}</p>
                </div>
                <div style={{ textAlign: "right", fontWeight: "bold" }}>
                  Date :- {formatDate(formData.issueDate)}
                </div>
              </div>
              <h3 style={{ textAlign: "center", marginBottom: "15px", fontSize: "12pt", fontWeight: "bold" }}>Subject : Offer Letter</h3>
              <div style={{ textAlign: "justify", fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", marginTop: "27px" }}>
                <p>Congratulations!</p>
                <p>We are pleased to offer you the position of <strong>{formData.designation || "________________"}</strong> with the Company. The effective date of your appointment is agreed as <strong>{formatDate(formData.joiningDate)}</strong>.</p>
                <p>Your annual compensation (CTC) will be <strong>Rs. {formData.ctc || "________"} ({formData.ctcInWords || "________________"} only)</strong> per annum.</p>
                <p>Your continued employment is contingent upon your satisfactorily meeting the Company's expectations.</p>
                <p>Your salary structure is provided in <strong>Annexure 1</strong>.</p>
                <p>On your first day, please bring the documents as provided in <strong>Annexure 2</strong>.</p>
              </div>
            </div>
          </div>

          {/* PAGE 2 PREVIEW */}
          <div style={{ border: "1px solid #eee", minHeight: "1000px", background: "white", color: "#000", fontSize: "11pt", lineHeight: "1.6", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "5px 10px", background: "var(--theme-bg-muted,#f8fafc)", borderBottom: "1px solid #eee", fontSize: "10pt", color: "var(--theme-text-muted,#64748b)", fontWeight: "bold" }}>Page 2</div>
            {/* Header Mirror */}
            <div style={{
              display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "50px", borderBottom: "5px solid #000", padding: "20px 40px 10px 40px", marginBottom: "30px", boxSizing: "border-box", width: "100%"
            }}>
              <div style={{ flex: "0 0 auto" }}>
                {branding.logo_url && <img src={branding.logo_url} alt="Logo" style={{ height: "120px", width: "auto", maxWidth: "300px", objectFit: "contain", display: "block", padding: "0 2px" }} />}
              </div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center", maxWidth: "60%", flex: "0 0 auto", wordBreak: "break-all" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TbWorld size={18} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_website}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TfiEmail size={16} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_email}</span>
                </div>
              </div>
            </div>

            {/* Content area Page 2 */}
            <div style={{ padding: "0 40px 60px 40px", flexGrow: 1 }}>
              <div style={{ textAlign: "justify", fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt", marginTop: "20px" }}>
                <p>Note that this Letter of Offer is valid for <strong>two (2) working days</strong> from the date of receipt.</p>
                <p style={{ marginTop: "30px" }}>We look forward to you joining <strong>{branding.company_name}</strong> and to a mutually rewarding working relationship.</p>
              </div>

              {/* Stamp & Signature */}
              <div style={{ marginTop: "40px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <div style={{ textAlign: "center", display: "contents" }}>
                  {branding.signature_url ? <img src={branding.signature_url} alt="Signature" style={{ height: "50px", marginBottom: "5px", objectFit: "contain" }} /> : <div style={{ height: "55px" }} />}
                  {branding.stamp_url && <img src={branding.stamp_url} alt="Stamp" style={{ height: "80px", maxWidth: "130px", marginBottom: "5px", objectFit: "contain" }} />}
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "2px" }}>Best Regards,</div>
                    <div style={{ fontWeight: "bold", fontSize: "11pt", marginBottom: "1pt" }}>{branding.hr_name},</div>
                    <div style={{ fontSize: "10pt", marginBottom: "1pt" }}>{branding.hr_designation},</div>
                    <div style={{ fontWeight: "bold", fontSize: "10pt" }}>{branding.company_name}</div>
                  </div>
                </div>
              </div>

              {/* Acceptance Section */}
              <div style={{ marginTop: "60px", fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt" }}>
                <p>I agree and accept this Letter of Offer which has been read, understood and accepted by me.</p>
                <div style={{ marginTop: "30px" }}>Signature : ____________________</div>
                <div style={{ marginTop: "20px" }}>Name :- {formData.salutation} {formData.fullName || "________________"}</div>
                <div style={{ marginTop: "20px" }}>Date : </div>
              </div>
            </div>
          </div>

          {/* PAGE 3 PREVIEW (Annexure 1) */}
          <div style={{ border: "1px solid #eee", minHeight: "1000px", background: "white", color: "#000", fontSize: "11pt", lineHeight: "1.6", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "5px 10px", background: "var(--theme-bg-muted,#f8fafc)", borderBottom: "1px solid #eee", fontSize: "10pt", color: "var(--theme-text-muted,#64748b)", fontWeight: "bold" }}>Page 3 (Annexure 1)</div>
            {/* Header Mirror */}
            <div style={{
              display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "50px", borderBottom: "5px solid #000", padding: "20px 40px 10px 40px", marginBottom: "30px", boxSizing: "border-box", width: "100%"
            }}>
              <div style={{ flex: "0 0 auto" }}>
                {branding.logo_url && <img src={branding.logo_url} alt="Logo" style={{ height: "120px", width: "auto", maxWidth: "300px", objectFit: "contain", display: "block", padding: "0 2px" }} />}
              </div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center", maxWidth: "60%", flex: "0 0 auto", wordBreak: "break-all" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TbWorld size={18} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_website}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TfiEmail size={16} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_email}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "0 40px 40px 40px", flexGrow: 1 }}>
              <div style={{ fontWeight: "bold", marginBottom: "15px" }}>Annexure 1 - Salary Structure</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "var(--theme-bg-muted,#f1f5f9)" }}>
                    <th style={{ ...salaryTableCellStyle, textAlign: "left" }}>Component</th>
                    <th style={{ ...salaryTableCellStyle, textAlign: "right" }}>Per Month</th>
                    <th style={{ ...salaryTableCellStyle, textAlign: "right" }}>Per Annum</th>
                  </tr>
                </thead>
                <tbody>{renderSalaryBreakupPreviewRows()}</tbody>
              </table>
            </div>
          </div>

          {/* PAGE 4 PREVIEW (Annexure 2) */}
          <div style={{ border: "1px solid #eee", minHeight: "1000px", background: "white", color: "#000", fontSize: "11pt", lineHeight: "1.6", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}>
            <div style={{ padding: "5px 10px", background: "var(--theme-bg-muted,#f8fafc)", borderBottom: "1px solid #eee", fontSize: "10pt", color: "var(--theme-text-muted,#64748b)", fontWeight: "bold" }}>Page 4 (Annexure 2)</div>
            {/* Header Mirror */}
            <div style={{
              display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "50px", borderBottom: "5px solid #000", padding: "20px 40px 10px 40px", marginBottom: "30px", boxSizing: "border-box", width: "100%"
            }}>
              <div style={{ flex: "0 0 auto" }}>
                {branding.logo_url && <img src={branding.logo_url} alt="Logo" style={{ height: "120px", width: "auto", maxWidth: "300px", objectFit: "contain", display: "block", padding: "0 2px" }} />}
              </div>
              <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center", maxWidth: "60%", flex: "0 0 auto", wordBreak: "break-all" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TbWorld size={18} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_website}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                  <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <TfiEmail size={16} />
                  </div>
                  <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_email}</span>
                </div>
              </div>
            </div>

            <div style={{ padding: "0 40px 40px 40px", flexGrow: 1 }}>
              <div style={{ fontWeight: "bold", marginBottom: "15px" }}>Annexure 2 - Documents required at the time of joining</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9pt", border: "1px solid #000" }}>
                <thead>
                  <tr style={{ background: "var(--theme-bg-muted,#f1f5f9)" }}>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>S. No.</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Documents Required</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Format</th>
                    <th style={{ border: "1px solid #000", padding: "8px" }}>Document Type</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 1, req: "Proof of Age and ID", fmt: "Photocopy", type: "Aadhar Card/ Driver License/10th Certificate/PAN Card" },
                    { id: 2, req: "Proof of Residence", fmt: "Photocopy", type: "Aadhar/Phone Bill/Ration Card/Voter ID/Electricity Bill/Rent Agreement" },
                    { id: 3, req: "Educational Qualifications", fmt: "Photocopy", type: "Graduation, Post-Graduation" },
                    { id: 4, req: "Experience Certificate/s", fmt: "Photocopy", type: "On the letterhead of the previous company" },
                    { id: 5, req: "Last 3 months' payslip/Bank Statement", fmt: "Original", type: "Letter with Stamp of the previous company/bank" },
                    { id: 6, req: "Relieving Letter", fmt: "Photocopy", type: "On the letterhead of the previous company" },
                    { id: 7, req: "Updated Resume", fmt: "", type: "" },
                    { id: 9, req: "Cancelled Cheque", fmt: "Soft Copy", type: "" },
                    { id: 10, req: "EPF Details", fmt: "", type: "EPF number" }
                  ].map(row => (
                    <tr key={row.id}>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{row.id}.</td>
                      <td style={{ border: "1px solid #000", padding: "6px" }}>{row.req}</td>
                      <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center" }}>{row.fmt}</td>
                      <td style={{ border: "1px solid #000", padding: "6px" }}>{row.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGE 5 PREVIEW (Terms & Conditions) */}
          {formData.termsAndConditions && formData.termsAndConditions.length > 0 && (
            <div style={{ border: "1px solid #eee", minHeight: "1000px", background: "white", color: "#000", fontSize: "11pt", lineHeight: "1.6", display: "flex", flexDirection: "column", boxShadow: "0 0 10px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "5px 10px", background: "var(--theme-bg-muted,#f8fafc)", borderBottom: "1px solid #eee", fontSize: "10pt", color: "var(--theme-text-muted,#64748b)", fontWeight: "bold" }}>Page 5 (Terms & Conditions)</div>
              {/* Header Mirror */}
              <div style={{
                display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "50px", borderBottom: "5px solid #000", padding: "20px 40px 10px 40px", marginBottom: "30px", boxSizing: "border-box", width: "100%"
              }}>
                <div style={{ flex: "0 0 auto" }}>
                  {branding.logo_url && <img src={branding.logo_url} alt="Logo" style={{ height: "120px", width: "auto", maxWidth: "300px", objectFit: "contain", display: "block", padding: "0 2px" }} />}
                </div>
                <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center", maxWidth: "60%", flex: "0 0 auto", wordBreak: "break-all" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                    <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <TbWorld size={18} />
                    </div>
                    <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_website}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px" }}>
                    <div style={{ background: "#000", color: "var(--card-bg,#fff)", borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <TfiEmail size={16} />
                    </div>
                    <span style={{ fontWeight: "bold", fontSize: "11pt" }}>{branding.company_email}</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: "0 40px 40px 40px", flexGrow: 1 }}>
                <div style={{ fontWeight: "bold", marginBottom: "20px", fontSize: "12pt" }}>Terms & Conditions</div>
                <ol style={{ paddingLeft: "20px", fontFamily: "'Times New Roman', Times, serif", fontSize: "10pt", lineHeight: "1.8" }}>
                  {formData.termsAndConditions.map((term, index) => (
                    <li key={index} style={{ marginBottom: "10px", textAlign: "justify" }}>
                      {term}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔥 BOTTOM SECTION: HISTORY */}
      <div style={{ marginTop: "40px", background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
        <h3 style={{ ...sectionHeaderStyle, borderBottom: "none", marginBottom: "20px" }}>
          <HiOutlineDocumentText size={24} /> Recent Offer Letters
        </h3>

        {isLoadingHistory ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>Loading history...</div>
        ) : history.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9", color: "var(--theme-text-muted,#64748b)", fontSize: "13px" }}>
                  <th style={{ padding: "12px 16px", fontWeight: "600" }}>Employee Name</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600" }}>Employee ID</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600" }}>Designation</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600" }}>Issue Date</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const status = getOfferStatus(item);
                  const isFinalStatus = isFinalOfferStatus(status);
                  const isUpdating = updatingOfferId === item.id;

                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "14px", transition: "background 0.2s" }}>
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontWeight: "600", color: "var(--theme-text-strong,#1e293b)" }}>{getOfferCandidateName(item)}</div>
                        <div style={{ fontSize: "12px", color: "var(--theme-text-muted,#64748b)" }}>{getOfferCandidateEmail(item) || "No email"}</div>
                      </td>
                      <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{item.employee_display_id || "N/A"}</td>
                      <td style={{ padding: "16px", color: "var(--theme-text-strong,#1e293b)" }}>{item.form_data?.designation || "-"}</td>
                      <td style={{ padding: "16px", color: "var(--theme-text-muted,#64748b)" }}>{new Date(item.issue_date).toLocaleDateString('en-GB')}</td>
                      <td style={{ padding: "16px" }}>
                        <span style={{
                          display: "inline-flex",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
                          fontWeight: "700",
                          background: status === "Accepted" ? "#dcfce7" : status === "Rejected" ? "#fee2e2" : "#e0f2fe",
                          color: status === "Accepted" ? "#166534" : status === "Rejected" ? "#991b1b" : "#075985"
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: "16px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
                          <button
                            onClick={() => offerLetterPDFService.viewOfferLetter(item.form_data)}
                            title="View"
                            style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#4f46e5" }}
                          >
                            <HiOutlineEye size={18} />
                          </button>
                          <button
                            onClick={() => offerLetterPDFService.downloadOfferLetter(item.form_data)}
                            title="Download"
                            style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#2ecc71" }}
                          >
                            <HiOutlineArrowDownTray size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setFormData(item.form_data);
                              setSelectedEmployee(item.employee_display_id);
                              setSelectedUserId(item.employee_id);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            title="Edit"
                            style={{ padding: "6px", background: "var(--theme-bg-muted,#f1f5f9)", border: "none", borderRadius: "4px", cursor: "pointer", color: "var(--theme-text-muted,#64748b)" }}
                          >
                            <HiOutlineArrowDownOnSquare size={18} />
                          </button>
                          {!isFinalStatus && (
                            <>
                              <button
                                onClick={() => handleAcceptOffer(item)}
                                disabled={isUpdating}
                                title="Accept offer and create employee"
                                style={{ padding: "6px 10px", background: "#dcfce7", border: "none", borderRadius: "4px", cursor: isUpdating ? "not-allowed" : "pointer", color: "#166534", fontWeight: "700" }}
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleRejectOffer(item)}
                                disabled={isUpdating}
                                title="Reject offer"
                                style={{ padding: "6px 10px", background: "#fee2e2", border: "none", borderRadius: "4px", cursor: isUpdating ? "not-allowed" : "pointer", color: "#991b1b", fontWeight: "700" }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--theme-text-muted,#64748b)" }}>No offer letters found in history.</div>
        )}
      </div>
    </div>
  );
};

export default OfferLetter;
