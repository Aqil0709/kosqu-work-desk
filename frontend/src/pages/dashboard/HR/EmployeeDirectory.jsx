import React, { useState, useEffect } from 'react';
import { employeeAPI } from '../../../services/employeeAPI';
import offerLetterAPI from '../../../services/offerLetterAPI';
import { salaryAPI } from '../../../services/salaryAPI';
import { offerLetterPDFService } from '../../../services/offerLetterPDFService';
import { salarySlipPDFService } from '../../../services/salarySlipPDFService';
import {
  HiOutlineUser,
  HiOutlineDocumentText,
  HiOutlineCurrencyDollar,
  HiOutlineEye,
  HiOutlineArrowDownTray,
  HiMagnifyingGlass,
  HiOutlineFunnel,
  HiArrowLeft,
  HiOutlineBuildingOffice2,
} from "react-icons/hi2";
import './EmployeeDirectory.css';

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS  = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

// ─── Employee Detail Page ─────────────────────────────────────
const EmployeeDetail = ({ emp, allOfferLetters, allSlipRecords, onBack }) => {
  const [activeTab,  setActiveTab]  = useState('offer');
  const [slipMonth,  setSlipMonth]  = useState('');
  const [slipYear,   setSlipYear]   = useState('');

  const offerLetters = allOfferLetters.filter(l => String(l.employee_id) === String(emp.employee_id));

  const slips = allSlipRecords.filter(s => {
    const empMatch   = String(s.employee_id) === String(emp.employee_id);
    const monthMatch = !slipMonth || s.month === slipMonth;
    const yearMatch  = !slipYear  || String(s.year) === String(slipYear);
    return empMatch && monthMatch && yearMatch;
  });

  const getInitials = (f, l) => `${f?.[0]||''}${l?.[0]||''}`.toUpperCase();

  const mapToFormData = r => ({
    fullName: r.employee_name, designation: r.designation,
    monthYear: `${r.month} ${r.year}`, paymentMode: r.payment_mode || "Bank Transfer",
    earnings: { basic: r.basic_salary, hra: r.allowances?.hra||0, conveyance: r.allowances?.transport||0, medical: r.allowances?.medical||0, special: r.allowances?.special||0 },
    deductions: { pf: r.deductions?.provident_fund||0, pt: r.deductions?.professional_tax||0, tds: r.deductions?.tax||0 }
  });

  const handleAction = async (type, action, doc) => {
    try {
      if (type === 'offer') {
        action === 'view' ? await offerLetterPDFService.viewOfferLetter(doc.form_data)
                          : await offerLetterPDFService.downloadOfferLetter(doc.form_data);
      } else {
        const fd = mapToFormData(doc);
        action === 'view' ? await salarySlipPDFService.viewSalarySlip(fd)
                          : await salarySlipPDFService.downloadSalarySlip(fd);
      }
    } catch { alert("Failed to process document. Please try again."); }
  };

  return (
    <div className="detail-page">
      {/* Back */}
      <button className="back-btn" onClick={onBack}>
        <HiArrowLeft /> Back to Directory
      </button>

      {/* Employee Card */}
      <div className="detail-hero">
        <div className="detail-avatar">{getInitials(emp.first_name, emp.last_name)}</div>
        <div>
          <h2>{emp.first_name} {emp.last_name}</h2>
          <p className="detail-meta">{emp.email}</p>
          <p className="detail-meta">
            <HiOutlineBuildingOffice2 style={{ verticalAlign: 'middle', marginRight: 5 }} />
            {emp.department_name || 'General'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button
          className={`detail-tab-btn ${activeTab === 'offer' ? 'active' : ''}`}
          onClick={() => setActiveTab('offer')}
        >
          <HiOutlineDocumentText /> Offer Letters
          <span className="tab-badge">{offerLetters.length}</span>
        </button>
        <button
          className={`detail-tab-btn ${activeTab === 'salary' ? 'active' : ''}`}
          onClick={() => setActiveTab('salary')}
        >
          <HiOutlineCurrencyDollar /> Salary Slips
          <span className="tab-badge">{allSlipRecords.filter(s => String(s.employee_id) === String(emp.employee_id)).length}</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="detail-body">
        {activeTab === 'offer' ? (
          offerLetters.length > 0 ? offerLetters.map(letter => (
            <div key={letter.id} className="doc-item">
              <div className="doc-item-label">
                <HiOutlineDocumentText className="doc-item-icon offer" />
                <div>
                  <div className="doc-title">Offer Letter</div>
                  <div className="doc-sub">Issued: {letter.issue_date ? new Date(letter.issue_date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : 'N/A'}</div>
                </div>
              </div>
              <div className="doc-item-actions">
                <button className="doc-btn view" onClick={() => handleAction('offer','view',letter)}><HiOutlineEye /> View</button>
                <button className="doc-btn download" onClick={() => handleAction('offer','download',letter)}><HiOutlineArrowDownTray /> Download</button>
              </div>
            </div>
          )) : (
            <div className="no-doc-state">
              <HiOutlineDocumentText size={48} />
              <p>No offer letter available for this employee</p>
            </div>
          )
        ) : (
          <>
            {/* Salary Filters */}
            <div className="slip-filter-bar">
              <select value={slipMonth} onChange={e => setSlipMonth(e.target.value)}>
                <option value="">All Months</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={slipYear} onChange={e => setSlipYear(e.target.value)}>
                <option value="">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {(slipMonth || slipYear) && (
                <button className="clear-filter-btn" onClick={() => { setSlipMonth(''); setSlipYear(''); }}>Clear</button>
              )}
            </div>

            {slips.length > 0 ? slips.map(slip => (
              <div key={slip.id} className="doc-item">
                <div className="doc-item-label">
                  <HiOutlineCurrencyDollar className="doc-item-icon salary" />
                  <div>
                    <div className="doc-title">Salary Slip</div>
                    <div className="doc-sub">Period: {slip.month} {slip.year}</div>
                  </div>
                </div>
                <div className="doc-item-actions">
                  <button className="doc-btn view" onClick={() => handleAction('salary','view',slip)}><HiOutlineEye /> View</button>
                  <button className="doc-btn download" onClick={() => handleAction('salary','download',slip)}><HiOutlineArrowDownTray /> Download</button>
                </div>
              </div>
            )) : (
              <div className="no-doc-state">
                <HiOutlineCurrencyDollar size={48} />
                <p>No salary slips found for the selected period</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── Main Directory List ──────────────────────────────────────
const EmployeeDirectory = () => {
  const [employees,       setEmployees]       = useState([]);
  const [departments,     setDepartments]     = useState([]);
  const [allOfferLetters, setAllOfferLetters] = useState([]);
  const [allSlipRecords,  setAllSlipRecords]  = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [selectedDept,    setSelectedDept]    = useState('');
  const [selectedEmp,     setSelectedEmp]     = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [empRes, deptRes, lettersRes, slipsRes] = await Promise.all([
          employeeAPI.getAll({ is_active: 'true' }),
          employeeAPI.getDepartments(),
          offerLetterAPI.getAll(),
          salaryAPI.getAll()
        ]);
        setEmployees(empRes.data.employees || empRes.data.data || []);
        setDepartments(deptRes.data.departments || deptRes.data.data || []);
        setAllOfferLetters(lettersRes.data.letters || lettersRes.data.data || []);
        setAllSlipRecords(slipsRes.data.salaryRecords || slipsRes.data.data || []);
      } catch (err) { console.error("Error loading directory:", err); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  // Show detail page if an employee is selected
  if (selectedEmp) {
    return (
      <EmployeeDetail
        emp={selectedEmp}
        allOfferLetters={allOfferLetters}
        allSlipRecords={allSlipRecords}
        onBack={() => setSelectedEmp(null)}
      />
    );
  }

  const filtered = employees.filter(emp => {
    const nameMatch = `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const deptMatch = !selectedDept || String(emp.department_id) === String(selectedDept);
    return nameMatch && deptMatch;
  });

  const getInitials = (f, l) => `${f?.[0]||''}${l?.[0]||''}`.toUpperCase();

  const countDocs = (empId) => ({
    offers: allOfferLetters.filter(l => String(l.employee_id) === String(empId)).length,
    slips:  allSlipRecords.filter(s => String(s.employee_id) === String(empId)).length,
  });

  return (
    <div className="directory-container">
      <div className="directory-header">
        <div>
          <h1>Employee Directory</h1>
          <p>Click an employee to view their documents</p>
        </div>
        <span className="stat-pill">{filtered.length} Employees</span>
      </div>

      <div className="directory-controls">
        <div className="search-box">
          <HiMagnifyingGlass className="control-icon" />
          <input type="text" placeholder="Search by name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="filter-box">
          <HiOutlineFunnel className="control-icon" />
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="directory-loading"><div className="loading-spinner"></div><p>Loading directory...</p></div>
      ) : filtered.length > 0 ? (
        <div className="directory-list">
          <div className="list-header-row">
            <span>Employee</span>
            <span>Department</span>
            <span>Documents</span>
          </div>
          {filtered.map(emp => {
            const { offers, slips } = countDocs(emp.employee_id);
            return (
              <div key={emp.employee_id} className="list-row clickable" onClick={() => setSelectedEmp(emp)}>
                <div className="list-avatar-cell">
                  <div className="list-avatar">{getInitials(emp.first_name, emp.last_name)}</div>
                  <div>
                    <div className="list-name">{emp.first_name} {emp.last_name}</div>
                    <div className="list-email">{emp.email}</div>
                  </div>
                </div>
                <div className="list-cell dept-cell">{emp.department_name || 'General'}</div>
                <div className="list-cell">
                  <span className={`badge ${offers > 0 ? 'has' : ''}`}>{offers} offer letter{offers !== 1 ? 's' : ''}</span>
                  &nbsp;·&nbsp;
                  <span className={`badge ${slips > 0 ? 'has' : ''}`}>{slips} salary slip{slips !== 1 ? 's' : ''}</span>
                </div>
                <div className="row-arrow">→</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-results">
          <HiOutlineUser size={64} />
          <h3>No employees found</h3>
          <p>Try adjusting your search or filter</p>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
