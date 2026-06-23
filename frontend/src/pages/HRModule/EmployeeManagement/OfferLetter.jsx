import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { offerLetterAPI } from '../../../services/offerLetterAPI';
import { employeeAPI } from '../../../services/employeeAPI';
import offerLetterPDFService, { getDefaultSections } from '../../../services/offerLetterPDFService';
import { dialog } from '../../../components/ui/CustomDialog';
import brandingAPI from '../../../services/brandingAPI';
import './Employee.css';
import './OfferLetterBuilder.css';

const numberToWords = (num) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if ((num = num.toString()).length > 9) return 'overflow';
  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return; var str = '';
  str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() ? str.trim() + ' Rupees Only' : '';
};

const defaultTerms = [
  "The employee shall abide by all company policies, rules, and regulations.",
  "This offer is contingent upon satisfactory background verification and reference checks.",
  "The first three months shall be a probationary period, during which either party may terminate employment with one week's notice.",
  "The company reserves the right to modify terms with prior notice.",
  "Confidentiality of company information must be maintained during and after employment.",
  "All intellectual property created during employment shall belong to the company.",
  "The employee agrees not to engage in any competing business during employment and for six months after termination.",
  "Employment may be terminated by either party with one month's notice or payment in lieu thereof."
];

const defaultResponsibilities = [
  'Developing and maintaining web applications, APIs, and backend services',
  'Working with modern frameworks and related technologies',
  'Designing, developing, and optimizing database structures and data models',
  'Supporting frontend development and integration',
  'Developing and consuming RESTful APIs and integrating third-party services',
  'Participating in software development, debugging, testing, and deployment activities',
  'Writing clean, scalable, secure, and efficient code as per project requirements',
  'Collaborating with cross-functional teams to ensure timely project delivery',
  'Maintaining project documentation and following coding best practices',
  'Learning and adapting to new technologies and development methodologies as required',
];

const BLANK_FORM = {
  issueDate: new Date().toISOString().slice(0, 10),
  salutation: 'Mr.',
  fullName: '', address: '', phone: '', email: '',
  designation: '', joiningDate: '', location: '', offerValidDays: '5',
  ctc: '', ctcInWords: '',
  basicSalary: '', hra: '', conveyanceAllowance: '', specialAllowance: '', medicalAllowance: '',
  totalEarning: '', professionalTax: '', tds: '', employerPf: '', employerEsi: '', netPay: '',
  responsibilities: [...defaultResponsibilities],
  terms: [...defaultTerms],
  sections: null, // null = use defaults from getDefaultSections()
};

const PER_PAGE = 10;

/* ── sort icon ─────────────────────────────────────────── */
const SortIcon = ({ active, dir }) => (
  <span style={{ marginLeft: 4, opacity: active ? 1 : 0.35, fontSize: 10 }}>
    {active ? (dir === 'asc' ? '▲' : '▼') : '⇅'}
  </span>
);

const OfferLetter = ({ onEmployeeConverted }) => {
  /* ── main tab ─────────────────────────────────── */
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'issued'

  /* ── issued letters state ─────────────────────── */
  const [offerLetters, setOfferLetters] = useState([]);
  const [lettersLoading, setLettersLoading] = useState(false);
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [selectedOfferLetter, setSelectedOfferLetter] = useState(null);
  const [acceptFormData, setAcceptFormData] = useState({ employee_id: '', department_id: '', employment_type: '' });
  const [departments, setDepartments] = useState([]);
  const [lettersPage, setLettersPage] = useState(1);

  /* ── employee list state ──────────────────────── */
  const [allEmployees, setAllEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [empSortKey, setEmpSortKey] = useState('first_name');
  const [empSortDir, setEmpSortDir] = useState('asc');
  const [empPage, setEmpPage] = useState(1);

  /* ── offer letter builder modal ───────────────── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickGenModal, setIsQuickGenModal] = useState(false);
  const [sendToExistingId, setSendToExistingId] = useState('');
  const [formData, setFormData] = useState({ ...BLANK_FORM });
  const [activeSections, setActiveSections] = useState(null); // null = use defaults
  const [builderTab, setBuilderTab] = useState('details'); // 'details' | 'sections'

  /* ── branding ────────────────────────────────── */
  const [branding, setBranding] = useState({});

  /* ── load data ────────────────────────────────── */
  const loadOfferLetters = useCallback(async () => {
    try {
      setLettersLoading(true);
      const response = await offerLetterAPI.getAll();
      setOfferLetters(response.data.data || []);
      setLettersPage(1);
    } catch (err) {
      console.error('Failed to load offer letters:', err);
    } finally {
      setLettersLoading(false);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      setEmpLoading(true);
      const r = await employeeAPI.getAll();
      setAllEmployees(r.data?.users || r.data?.employees || []);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setEmpLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    employeeAPI.getDepartments().then(r => setDepartments(r.data.departments || [])).catch(() => {});
    brandingAPI.get().then(res => {
      if (res.data?.success && res.data?.branding) setBranding(res.data.branding);
    }).catch(() => {});
  }, [loadEmployees]);

  useEffect(() => {
    if (activeTab === 'issued' && offerLetters.length === 0 && !lettersLoading) {
      loadOfferLetters();
    }
  }, [activeTab, offerLetters.length, lettersLoading, loadOfferLetters]);

  /* ── employee list filtering / sorting ─────────── */
  const filteredEmps = useMemo(() => {
    const q = empSearch.toLowerCase();
    const list = allEmployees.filter(e => {
      const name  = `${e.first_name||''} ${e.last_name||''}`.toLowerCase();
      const id    = (e.employee_id || e.id || '').toString().toLowerCase();
      const dept  = (e.department_name || e.department || '').toLowerCase();
      const pos   = (e.position || '').toLowerCase();
      return !q || name.includes(q) || id.includes(q) || dept.includes(q) || pos.includes(q);
    });

    list.sort((a, b) => {
      let av = '', bv = '';
      if (empSortKey === 'first_name')   { av = `${a.first_name||''} ${a.last_name||''}`; bv = `${b.first_name||''} ${b.last_name||''}`; }
      else if (empSortKey === 'employee_id')  { av = a.employee_id || ''; bv = b.employee_id || ''; }
      else if (empSortKey === 'department')   { av = a.department_name || a.department || ''; bv = b.department_name || b.department || ''; }
      else if (empSortKey === 'position')     { av = a.position || ''; bv = b.position || ''; }
      else if (empSortKey === 'joining_date') { av = a.joining_date || a.date_of_joining || ''; bv = b.joining_date || b.date_of_joining || ''; }
      const cmp = String(av).localeCompare(String(bv));
      return empSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [allEmployees, empSearch, empSortKey, empSortDir]);

  const empTotalPages = Math.max(1, Math.ceil(filteredEmps.length / PER_PAGE));
  const empSafePage   = Math.min(empPage, empTotalPages);
  const empPageSlice  = filteredEmps.slice((empSafePage - 1) * PER_PAGE, empSafePage * PER_PAGE);

  const toggleEmpSort = (key) => {
    if (empSortKey === key) setEmpSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setEmpSortKey(key); setEmpSortDir('asc'); }
    setEmpPage(1);
  };

  /* ── issued letters pagination ─────────────────── */
  const ltTotalPages = Math.max(1, Math.ceil(offerLetters.length / PER_PAGE));
  const ltSafePage   = Math.min(lettersPage, ltTotalPages);
  const ltSlice      = offerLetters.slice((ltSafePage - 1) * PER_PAGE, ltSafePage * PER_PAGE);

  /* ── open modal pre-filled with employee ────────── */
  const handleGenerateForEmployee = (emp) => {
    const joiningRaw = emp.joining_date || emp.date_of_joining || '';
    const joiningDate = joiningRaw ? joiningRaw.slice(0, 10) : '';

    const basic    = Number(emp.salary_basic             || 0);
    const hra      = Number(emp.salary_hra               || 0);
    const travel   = Number(emp.salary_travel_allowance  || 0);
    const medical  = Number(emp.salary_medical_allowance || 0);
    const special  = Number(emp.salary_other_allowance   || 0);
    const pf       = Number(emp.epf_fixed_amount          || emp.salary_pf     || 0);
    const esic     = Number(emp.salary_esic              || emp.employer_esic || 0);
    const pt       = Number(emp.salary_professional_tax  || 0);
    const tds      = Number(emp.tds_amount               || 0);
    const gross    = basic + hra + travel + medical + special;
    const net      = Math.max(0, gross - pf - esic - pt - tds);
    const ctcAnnual = Number(emp.salary || 0) || gross * 12;

    setFormData({
      ...BLANK_FORM,
      issueDate:             new Date().toISOString().slice(0, 10),
      fullName:              `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      email:                 emp.email || '',
      phone:                 emp.phone || emp.mobile || '',
      designation:           emp.position || '',
      joiningDate,
      address:               emp.address || '',
      location:              emp.work_location || '',
      ctc:                   String(ctcAnnual),
      ctcInWords:            numberToWords(ctcAnnual) || '',
      basicSalary:           String(basic),
      hra:                   String(hra),
      conveyanceAllowance:   String(travel),
      medicalAllowance:      String(medical),
      specialAllowance:      String(special),
      totalEarning:          String(gross),
      employerPf:            String(pf),
      employerEsi:           String(esic),
      professionalTax:       String(pt),
      tds:                   String(tds),
      netPay:                String(net),
    });
    setSendToExistingId(emp.user_id || emp.id || '');
    setIsQuickGenModal(true);
  };

  /* ── form handlers ───────────────────────────────── */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const n = { ...prev, [name]: value };
      if (name === 'ctc' && value) n.ctcInWords = numberToWords(parseInt(value.replace(/,/g, ''), 10)) || '';
      return n;
    });
  };

  const handleTermChange = (index, value) => {
    const t = [...formData.terms]; t[index] = value;
    setFormData({ ...formData, terms: t });
  };

  const doSaveOfferLetter = async (onSuccess) => {
    try {
      setIsSubmitting(true);
      const payload = {
        candidate_name: formData.fullName,
        candidate_email: formData.email,
        issue_date: formData.issueDate,
        form_data: { ...formData, sections: activeSections },
        ...(sendToExistingId ? { employee_id: sendToExistingId } : {}),
      };
      await offerLetterAPI.save(payload);
      await dialog.alert('Offer letter saved successfully!');
      onSuccess();
      setSendToExistingId('');
      setFormData({ ...BLANK_FORM });
      loadOfferLetters();
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Failed to save offer letter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await doSaveOfferLetter(() => setIsModalOpen(false));
  };

  const handleUpdateStatus = async (id, status) => {
    if (status === 'Accepted') {
      setSelectedOfferLetter(offerLetters.find(o => o.id === id));
      setAcceptFormData({ employee_id: '', department_id: '', employment_type: '' });
      setIsAcceptModalOpen(true);
      return;
    }
    if (!await dialog.confirm(`Mark this offer as ${status}?`)) return;
    try {
      await offerLetterAPI.updateStatus(id, { status });
      await dialog.alert(`Offer letter marked as ${status}`);
      loadOfferLetters();
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    if (!acceptFormData.employee_id || !acceptFormData.department_id || !acceptFormData.employment_type) {
      await dialog.alert('Please provide Employee ID, Department, and Employee Type');
      return;
    }
    try {
      setIsSubmitting(true);
      await offerLetterAPI.updateStatus(selectedOfferLetter.id, {
        status: 'Accepted',
        new_employee_id: acceptFormData.employee_id,
        department_id: acceptFormData.department_id,
        employment_type: acceptFormData.employment_type
      });
      await dialog.alert('Offer accepted and Employee created successfully!');
      setIsAcceptModalOpen(false);
      loadOfferLetters();
      if (onEmployeeConverted) onEmployeeConverted();
    } catch (err) {
      await dialog.alert(err.response?.data?.message || 'Failed to accept offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (String(status || '').toLowerCase()) {
      case 'accepted': return <span className="status-badge status-active">ACCEPTED</span>;
      case 'rejected': return <span className="status-badge status-inactive">REJECTED</span>;
      case 'sent':     return <span className="status-badge" style={{ background:'#3b82f6', color:'var(--card-bg,#fff)' }}>SENT</span>;
      default:         return <span className="status-badge" style={{ background:'#f59e0b', color:'var(--card-bg,#fff)' }}>PENDING</span>;
    }
  };

  const canActOnOffer = (status) => !['accepted', 'rejected'].includes(String(status || '').toLowerCase());

  // Live preview pages -- same HTML as the PDF generator
  const effectiveSections = activeSections || getDefaultSections();
  const previewPages = useMemo(
    () => offerLetterPDFService.getPreviewPages(formData, branding, effectiveSections),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, branding, activeSections]
  );

  // Helpers to open modal and reset sections
  const openBuilderModal = () => {
    setBuilderTab('details');
    setIsModalOpen(true);
  };

  // Section editor helpers
  const getSections = () => activeSections || getDefaultSections();
  const updateSection = (idx, changes) => {
    const s = [...getSections()];
    s[idx] = { ...s[idx], ...changes };
    setActiveSections(s);
  };
  const moveSection = (idx, dir) => {
    const s = [...getSections()];
    const target = idx + dir;
    if (target < 0 || target >= s.length) return;
    [s[idx], s[target]] = [s[target], s[idx]];
    setActiveSections(s);
  };
  const addSection = () => {
    const s = [...getSections()];
    s.push({ id: `custom_${Date.now()}`, title: 'New Section', type: 'paragraph', content: '', items: [], visible: true, fixed: false });
    setActiveSections(s);
  };
  const removeSection = (idx) => {
    const s = [...getSections()];
    if (s[idx].fixed) return; // fixed sections cannot be deleted
    s.splice(idx, 1);
    setActiveSections(s);
  };
  const addItem = (idx) => {
    const s = [...getSections()];
    s[idx] = { ...s[idx], items: [...(s[idx].items || []), ''] };
    setActiveSections(s);
  };
  const updateItem = (sIdx, iIdx, val) => {
    const s = [...getSections()];
    const items = [...(s[sIdx].items || [])];
    items[iIdx] = val;
    s[sIdx] = { ...s[sIdx], items };
    setActiveSections(s);
  };
  const removeItem = (sIdx, iIdx) => {
    const s = [...getSections()];
    const items = [...(s[sIdx].items || [])];
    items.splice(iIdx, 1);
    s[sIdx] = { ...s[sIdx], items };
    setActiveSections(s);
  };

  /* ── shared pagination renderer ─────────────────── */
  const renderPagination = (currentPage, totalPages, setPage) => {
    if (totalPages <= 1) return null;
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(n => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1)
      .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i-1] > 1) acc.push('...'); acc.push(n); return acc; }, []);
    return (
      <div className="pagination">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="pagination-btn">
          <i className="fas fa-chevron-left" /> Previous
        </button>
        <div className="pagination-numbers">
          {pages.map((n, i) =>
            n === '...'
              ? <span key={`e${i}`} style={{ padding:'0 6px', color:'var(--theme-text-muted,#64748b)' }}>...</span>
              : <button key={n} onClick={() => setPage(n)} className={`pagination-number ${currentPage === n ? 'active' : ''}`}>{n}</button>
          )}
        </div>
        <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="pagination-btn">
          Next <i className="fas fa-chevron-right" />
        </button>
      </div>
    );
  };

  /* ── styles ─────────────────────────────────────── */
  const S = {
    tabBar:  { display:'flex', gap:0, borderBottom:'2px solid var(--card-border,#e2e8f0)', marginBottom:20 },
    tab:     (active) => ({
      padding:'10px 22px', fontWeight:700, fontSize:13, cursor:'pointer', border:'none', background:'transparent',
      color: active ? '#1C47C9' : 'var(--theme-text-muted,#64748b)',
      borderBottom: active ? '2px solid #1C47C9' : '2px solid transparent',
      marginBottom:-2, transition:'color .15s',
    }),
    toolbar: { display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' },
    search:  { padding:'8px 14px', border:'1.5px solid var(--card-border,#e2e8f0)', borderRadius:9, fontSize:13, minWidth:240, background:'var(--card-bg,#fff)', color:'var(--theme-text,#0f172a)', outline:'none' },
    table:   { width:'100%', borderCollapse:'collapse', fontSize:13 },
    th:      { padding:'10px 14px', textAlign:'left', fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:.5, color:'var(--theme-text-muted,#64748b)', borderBottom:'2px solid var(--card-border,#e2e8f0)', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' },
    td:      { padding:'11px 14px', borderBottom:'1px solid var(--card-border,#e2e8f0)', color:'var(--theme-text,#0f172a)', verticalAlign:'middle' },
    genBtn:  { padding:'6px 16px', background:'#1C47C9', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', whiteSpace:'nowrap' },
    avatar:  { width:34, height:34, borderRadius:'50%', background:'#1C47C9', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:12, flexShrink:0 },
    empCell: { display:'flex', alignItems:'center', gap:10 },
  };

  return (
    <div className="employee-section">
      <div className="employee-table-container glass-form">

        {/* ── top header ───────────────────────────── */}
        <div className="table-header employee-management-header">
          <h3 style={{ margin:0 }}>Offer Letters</h3>
          <button className="add-employee-btn" onClick={() => { setFormData({ ...BLANK_FORM }); setSendToExistingId(''); setActiveSections(null); openBuilderModal(); }}>
            <i className="fas fa-plus" /> New Offer Letter
          </button>
        </div>

        {/* ── tab bar ──────────────────────────────── */}
        <div style={S.tabBar}>
          <button style={S.tab(activeTab === 'employees')} onClick={() => setActiveTab('employees')}>
            Employees ({allEmployees.length})
          </button>
          <button style={S.tab(activeTab === 'issued')} onClick={() => setActiveTab('issued')}>
            Issued Letters ({offerLetters.length})
          </button>
        </div>

        {/* ════════════════════════════════════════════
            TAB 1 -- Employee list
        ════════════════════════════════════════════ */}
        {activeTab === 'employees' && (
          <div className="table-wrapper">
            {/* toolbar */}
            <div style={S.toolbar}>
              <input
                style={S.search}
                placeholder="Search by name, ID, department or position..."
                value={empSearch}
                onChange={e => { setEmpSearch(e.target.value); setEmpPage(1); }}
              />
              <span style={{ marginLeft:'auto', fontSize:12, color:'var(--theme-text-muted,#64748b)' }}>
                {filteredEmps.length} employee{filteredEmps.length !== 1 ? 's' : ''}
              </span>
            </div>

            {empLoading ? (
              <div className="loading-container" style={{ padding:'40px 0', textAlign:'center' }}>Loading employees...</div>
            ) : filteredEmps.length === 0 ? (
              <div className="no-employees" style={{ padding:'40px 0' }}>
                <div className="no-data-icon"><i className="fas fa-users" /></div>
                <div>{empSearch ? 'No employees match your search.' : 'No employees found.'}</div>
              </div>
            ) : (
              <>
                <div style={{ borderRadius:12, border:'1px solid var(--card-border,#e2e8f0)', overflow:'hidden', background:'var(--card-bg,#fff)' }}>
                  <table style={S.table}>
                    <thead style={{ background:'var(--theme-bg-muted,#f8fafc)' }}>
                      <tr>
                        <th style={S.th} onClick={() => toggleEmpSort('first_name')}>
                          Employee <SortIcon active={empSortKey==='first_name'} dir={empSortDir} />
                        </th>
                        <th style={S.th} onClick={() => toggleEmpSort('employee_id')}>
                          Employee ID <SortIcon active={empSortKey==='employee_id'} dir={empSortDir} />
                        </th>
                        <th style={S.th} onClick={() => toggleEmpSort('position')}>
                          Position <SortIcon active={empSortKey==='position'} dir={empSortDir} />
                        </th>
                        <th style={S.th} onClick={() => toggleEmpSort('department')}>
                          Department <SortIcon active={empSortKey==='department'} dir={empSortDir} />
                        </th>
                        <th style={S.th} onClick={() => toggleEmpSort('joining_date')}>
                          Joining Date <SortIcon active={empSortKey==='joining_date'} dir={empSortDir} />
                        </th>
                        <th style={{ ...S.th, textAlign:'center', cursor:'default' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empPageSlice.map(emp => {
                        const ini = `${emp.first_name?.[0]||''}${emp.last_name?.[0]||''}`.toUpperCase() || '?';
                        const joiningRaw = emp.joining_date || emp.date_of_joining;
                        const joiningFmt = joiningRaw ? new Date(joiningRaw).toLocaleDateString('en-IN') : '--';
                        return (
                          <tr key={emp.user_id || emp.id}
                            style={{ transition:'background .1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--theme-bg-muted,#f8fafc)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={S.td}>
                              <div style={S.empCell}>
                                <div style={S.avatar}>{ini}</div>
                                <div>
                                  <div style={{ fontWeight:600 }}>{emp.first_name} {emp.last_name}</div>
                                  <div style={{ fontSize:11, color:'var(--theme-text-muted,#64748b)' }}>{emp.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={S.td}>
                              <span style={{ fontFamily:'monospace', fontSize:12, background:'var(--theme-bg-muted,#f1f5f9)', padding:'2px 7px', borderRadius:5 }}>
                                {emp.employee_id || emp.id || '--'}
                              </span>
                            </td>
                            <td style={S.td}>{emp.position || '--'}</td>
                            <td style={S.td}>{emp.department_name || emp.department || '--'}</td>
                            <td style={S.td}>{joiningFmt}</td>
                            <td style={{ ...S.td, textAlign:'center' }}>
                              <button style={S.genBtn} onClick={() => handleGenerateForEmployee(emp)}>
                                Generate Offer Letter
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {renderPagination(empSafePage, empTotalPages, setEmpPage)}
                {empTotalPages > 1 && (
                  <div className="pagination-info">
                    Showing {(empSafePage - 1) * PER_PAGE + 1}-{Math.min(empSafePage * PER_PAGE, filteredEmps.length)} of {filteredEmps.length} employees
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════
            TAB 2 -- Issued Letters
        ════════════════════════════════════════════ */}
        {activeTab === 'issued' && (
          <div className="table-wrapper">
            {lettersLoading ? (
              <div className="loading-container" style={{ padding:'40px 0', textAlign:'center' }}>Loading...</div>
            ) : offerLetters.length === 0 ? (
              <div className="no-employees">
                <div className="no-data-icon"><i className="fas fa-file-signature" /></div>
                <div>No offer letters found.</div>
                <p className="no-data-subtext">Generate an offer letter to see it here.</p>
              </div>
            ) : (
              <>
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Email</th>
                      <th>Designation</th>
                      <th>Issue Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ltSlice.map(offer => (
                      <tr key={offer.id}>
                        <td>{offer.candidate_name || offer.form_data?.fullName}</td>
                        <td>{offer.candidate_email || offer.form_data?.email}</td>
                        <td>{offer.form_data?.designation || '--'}</td>
                        <td>{new Date(offer.issue_date).toLocaleDateString('en-IN')}</td>
                        <td>{getStatusBadge(offer.status)}</td>
                        <td className="actions-cell">
                          <button className="viewedit-btn" title="View PDF" onClick={() => offerLetterPDFService.viewOfferLetter(offer.form_data, offer.form_data?.sections)}>
                            <i className="fas fa-eye" />
                          </button>
                          {canActOnOffer(offer.status) && (
                            <>
                              <button className="accept-btn" title="Accept Offer" onClick={() => handleUpdateStatus(offer.id, 'Accepted')}>
                                <i className="fas fa-check" />
                              </button>
                              <button className="deletebtn" title="Reject Offer" onClick={() => handleUpdateStatus(offer.id, 'Rejected')}>
                                <i className="fas fa-times" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPagination(ltSafePage, ltTotalPages, setLettersPage)}
                {ltTotalPages > 1 && (
                  <div className="pagination-info">
                    Showing {(ltSafePage - 1) * PER_PAGE + 1}-{Math.min(ltSafePage * PER_PAGE, offerLetters.length)} of {offerLetters.length} offer letters
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════
          QUICK GENERATE MODAL (from employee list)
      ════════════════════════════════════════════ */}
      {isQuickGenModal && (
        <div className="offer-letter-builder-overlay">
          <div style={{ background:'var(--card-bg,#fff)', borderRadius:16, padding:32, maxWidth:520, width:'90%', boxShadow:'0 8px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <h2 style={{ margin:0, fontSize:18, color:'var(--theme-text,#0f172a)' }}>
                <i className="fas fa-file-signature" style={{ color:'#1C47C9', marginRight:8 }} />
                Offer Letter Ready
              </h2>
              <button
                onClick={() => setIsQuickGenModal(false)}
                style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--theme-text-muted,#64748b)', lineHeight:1 }}
              >×</button>
            </div>

            <div style={{ background:'var(--theme-bg-muted,#f8fafc)', borderRadius:10, padding:'14px 16px', marginBottom:20, border:'1px solid var(--card-border,#e2e8f0)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px', fontSize:13, color:'var(--theme-text,#0f172a)' }}>
                <div><span style={{ color:'var(--theme-text-muted,#64748b)', display:'block', fontSize:11, marginBottom:2 }}>Name</span><strong>{formData.fullName || '--'}</strong></div>
                <div><span style={{ color:'var(--theme-text-muted,#64748b)', display:'block', fontSize:11, marginBottom:2 }}>Designation</span><strong>{formData.designation || '--'}</strong></div>
                <div><span style={{ color:'var(--theme-text-muted,#64748b)', display:'block', fontSize:11, marginBottom:2 }}>Joining Date</span><strong>{formData.joiningDate || '--'}</strong></div>
                <div><span style={{ color:'var(--theme-text-muted,#64748b)', display:'block', fontSize:11, marginBottom:2 }}>Annual CTC</span><strong>₹{Number(formData.ctc || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color:'var(--theme-text-muted,#64748b)', display:'block', fontSize:11, marginBottom:2 }}>Basic / mo</span><strong>₹{Number(formData.basicSalary || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color:'var(--theme-text-muted,#64748b)', display:'block', fontSize:11, marginBottom:2 }}>Net Pay / mo</span><strong>₹{Number(formData.netPay || 0).toLocaleString('en-IN')}</strong></div>
              </div>
            </div>

            <p style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', margin:'0 0 20px', display:'flex', alignItems:'center', gap:6 }}>
              <i className="fas fa-info-circle" style={{ color:'#3b82f6' }} />
              PDF will use your company branding (Kosqu format). Use "Edit Details" to change any field before saving.
            </p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <button
                type="button"
                style={{ padding:'11px 16px', background:'#1C47C9', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer' }}
                onClick={() => offerLetterPDFService.viewOfferLetter(formData, effectiveSections)}
              >
                <i className="fas fa-eye" style={{ marginRight:6 }} />Preview PDF
              </button>
              <button
                type="button"
                style={{ padding:'11px 16px', background:'#059669', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer' }}
                onClick={() => offerLetterPDFService.downloadOfferLetter(formData, effectiveSections)}
              >
                <i className="fas fa-download" style={{ marginRight:6 }} />Download PDF
              </button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button
                type="button"
                disabled={isSubmitting}
                style={{ padding:'11px 16px', background:'#f59e0b', color:'#fff', border:'none', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer', opacity:isSubmitting?0.7:1 }}
                onClick={() => doSaveOfferLetter(() => setIsQuickGenModal(false))}
              >
                <i className="fas fa-save" style={{ marginRight:6 }} />{isSubmitting ? 'Saving...' : 'Save & Issue'}
              </button>
              <button
                type="button"
                style={{ padding:'11px 16px', background:'var(--card-bg,#fff)', color:'#1C47C9', border:'1.5px solid #1C47C9', borderRadius:9, fontWeight:700, fontSize:13, cursor:'pointer' }}
                onClick={() => { setIsQuickGenModal(false); openBuilderModal(); }}
              >
                <i className="fas fa-edit" style={{ marginRight:6 }} />Edit Details
              </button>
            </div>

            <button
              type="button"
              style={{ width:'100%', marginTop:10, padding:'9px 16px', background:'none', color:'var(--theme-text-muted,#64748b)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:9, fontWeight:600, fontSize:13, cursor:'pointer' }}
              onClick={() => setIsQuickGenModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          OFFER LETTER BUILDER MODAL
      ════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="offer-letter-builder-overlay">
          <div className="offer-letter-builder-content" style={{ position:'relative' }}>
            <div className="builder-header">
              <h2><i className="fas fa-file-signature" /> Offer Letter Builder</h2>
              <div className="builder-header-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  style={{ background: 'var(--theme-primary,#2563eb)', color: '#fff', borderColor: 'transparent' }}
                  onClick={() => offerLetterPDFService.downloadOfferLetter(formData, effectiveSections)}
                >
                  <i className="fas fa-download" /> Preview PDF
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="cancel-btn">Cancel</button>
                <button type="button" onClick={handleSubmit} className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Generating...' : 'Generate and Save'}
                </button>
              </div>
            </div>

            {/* Builder tab bar */}
            <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--theme-border,#e2e8f0)', background:'var(--card-bg,#fff)', padding:'0 20px' }}>
              {[['details','Details & Salary'],['sections','Document Sections']].map(([key, label]) => (
                <button key={key} type="button" onClick={() => setBuilderTab(key)}
                  style={{ padding:'10px 20px', fontWeight:700, fontSize:12, cursor:'pointer', border:'none', background:'transparent',
                    color: builderTab===key ? '#1C47C9' : 'var(--theme-text-muted,#64748b)',
                    borderBottom: builderTab===key ? '2px solid #1C47C9' : '2px solid transparent', marginBottom:-2 }}>
                  {label}
                </button>
              ))}
            </div>

            <div className="builder-main" style={{ display: builderTab === 'sections' ? 'none' : undefined }}>
              <div className="builder-form-side">

                <div className="builder-section">
                  <h3>General Info</h3>
                  <div className="form-group-builder">
                    <label>Letter Issue Date</label>
                    <input type="date" name="issueDate" value={formData.issueDate} onChange={handleInputChange} />
                  </div>
                  <div className="form-group-builder">
                    <label>Linked Employee <span style={{ fontWeight:400, color:'#9ca3af' }}>(auto-filled when opened from employee list)</span></label>
                    <select value={sendToExistingId} onChange={e => setSendToExistingId(e.target.value)}>
                      <option value="">-- New Candidate (no link) --</option>
                      {allEmployees.map(emp => (
                        <option key={emp.user_id || emp.id} value={emp.user_id || emp.id}>
                          {`${emp.first_name||''} ${emp.last_name||''}`.trim()} ({emp.employee_id || emp.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="builder-section">
                  <h3>Personal Info</h3>
                  <div className="row-2">
                    <div className="form-group-builder">
                      <label>Salutation</label>
                      <select name="salutation" value={formData.salutation} onChange={handleInputChange}>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                      </select>
                    </div>
                    <div className="form-group-builder">
                      <label>Full Name</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="e.g. John Doe" />
                    </div>
                  </div>
                  <div className="form-group-builder">
                    <label>Address</label>
                    <textarea name="address" value={formData.address} onChange={handleInputChange} placeholder="Enter full address" rows="2" />
                  </div>
                  <div className="row-2">
                    <div className="form-group-builder">
                      <label>Phone Number</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+91 98765 43210" />
                    </div>
                    <div className="form-group-builder">
                      <label>Email Address</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="name@company.com" />
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <h3>Job &amp; Salary</h3>
                  <div className="row-2">
                    <div className="form-group-builder">
                      <label>Designation</label>
                      <input type="text" name="designation" value={formData.designation} onChange={handleInputChange} placeholder="e.g. Full Stack Developer" />
                    </div>
                    <div className="form-group-builder">
                      <label>Joining Date</label>
                      <input type="date" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="row-2">
                    <div className="form-group-builder">
                      <label>Place of Posting / Location</label>
                      <input type="text" name="location" value={formData.location} onChange={handleInputChange} placeholder="e.g. Navi Mumbai, Maharashtra" />
                    </div>
                    <div className="form-group-builder">
                      <label>Offer Valid (Days)</label>
                      <input type="number" name="offerValidDays" value={formData.offerValidDays} onChange={handleInputChange} placeholder="5" />
                    </div>
                  </div>
                  <div className="row-2">
                    <div className="form-group-builder">
                      <label>Annual CTC (₹)</label>
                      <input type="number" name="ctc" value={formData.ctc} onChange={handleInputChange} placeholder="e.g. 300000" />
                    </div>
                    <div className="form-group-builder">
                      <label>CTC in Words</label>
                      <input type="text" name="ctcInWords" value={formData.ctcInWords} onChange={handleInputChange} placeholder="Auto-generated" />
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <h3>Salary Breakup</h3>
                  <table className="salary-table">
                    <thead>
                      <tr><th>Component</th><th>Per Month</th><th>Per Annum</th></tr>
                    </thead>
                    <tbody>
                      {[
                        ['basicSalary', 'Basic Salary'],
                        ['hra', 'HRA'],
                        ['conveyanceAllowance', 'Conveyance Allowance'],
                        ['specialAllowance', 'Special Allowance'],
                        ['medicalAllowance', 'Medical Allowance'],
                        ['totalEarning', 'Total Earning', true],
                        ['professionalTax', 'Professional Tax (PT)'],
                        ['tds', 'TDS'],
                        ['employerPf', 'Employer PF Contribution'],
                        ['employerEsi', 'Employer ESI Contribution'],
                        ['netPay', 'Net Pay', true],
                      ].map(([field, label, bold]) => (
                        <tr key={field}>
                          <td>{bold ? <strong>{label}</strong> : label}</td>
                          <td><input type="number" name={field} value={formData[field]} onChange={handleInputChange} placeholder="0" /></td>
                          <td>{formData[field] ? formData[field] * 12 : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legacy fields — still saved but now managed from Sections tab */}
                <div className="builder-section" style={{ opacity:.4, pointerEvents:'none' }}>
                  <h3>Role &amp; Responsibilities <span style={{ fontSize:11, fontWeight:400, color:'#3b82f6' }}>(manage in Sections tab)</span></h3>
                  <div className="form-group-builder terms-container">
                    {(formData.responsibilities || []).map((r, i) => (
                      <div key={i} className="term-row">
                        <textarea
                          value={r}
                          rows={2}
                          onChange={e => {
                            const arr = [...(formData.responsibilities || [])];
                            arr[i] = e.target.value;
                            setFormData({ ...formData, responsibilities: arr });
                          }}
                          placeholder={`Responsibility ${i + 1}`}
                        />
                      </div>
                    ))}
                    <div style={{ fontSize: '0.8rem', color: 'var(--theme-text-muted,#64748b)' }}>
                      {(formData.responsibilities || []).length} responsibilities
                    </div>
                    <div className="term-actions">
                      <button type="button" className="add-term-btn" onClick={() => setFormData({ ...formData, responsibilities: [...(formData.responsibilities || []), ''] })}>
                        Add Responsibility
                      </button>
                      <button type="button" className="add-term-btn" onClick={() => { const a = [...(formData.responsibilities || [])]; a.pop(); setFormData({ ...formData, responsibilities: a }); }}>
                        Remove Last
                      </button>
                      <button type="button" className="reset-term-btn" onClick={() => setFormData({ ...formData, responsibilities: [...defaultResponsibilities] })}>
                        Reset to Default
                      </button>
                    </div>
                  </div>
                </div>

                <div className="builder-section" style={{ opacity:.4, pointerEvents:'none' }}>
                  <h3>Terms &amp; Conditions <span style={{ fontSize:11, fontWeight:400, color:'#3b82f6' }}>(manage in Sections tab)</span></h3>
                  <div className="form-group-builder terms-container">
                    {formData.terms.map((term, i) => (
                      <div key={i} className="term-row">
                        <textarea value={term} onChange={e => handleTermChange(i, e.target.value)} placeholder={`Term ${i + 1}`} />
                      </div>
                    ))}
                    <div style={{ fontSize:'0.8rem', color:'var(--theme-text-muted,#64748b)' }}>
                      {formData.terms.length} terms
                    </div>
                    <div className="term-actions">
                      <button type="button" className="add-term-btn" onClick={() => setFormData({ ...formData, terms: [...formData.terms, ''] })}>Add Term</button>
                      <button type="button" className="add-term-btn" onClick={() => { const t = [...formData.terms]; t.pop(); setFormData({ ...formData, terms: t }); }}>Remove Last</button>
                      <button type="button" className="reset-term-btn" onClick={() => setFormData({ ...formData, terms: [...defaultTerms] })}>Reset to Default</button>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── live preview ── */}
              <div className="builder-preview-side">
                {previewPages.map((html, i) => (
                  <div
                    key={i}
                    className="preview-page"
                    style={{ padding: 0, minHeight: 'auto', fontFamily: 'Arial, sans-serif' }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                ))}
              </div>
            </div>

            {/* ── Sections tab (full-width, not two-panel) ── */}
            {builderTab === 'sections' && (
              <div style={{ flex:1, minHeight:0, overflowY:'auto', background:'var(--card-bg,#fff)', padding:'20px 24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--theme-text-strong,#0f172a)' }}>Document Sections</div>
                    <div style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', marginTop:2 }}>Add, remove, reorder and edit every section of the offer letter</div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button type="button" onClick={addSection}
                      style={{ padding:'8px 16px', background:'#1C47C9', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer' }}>
                      <i className="fas fa-plus" style={{ marginRight:6 }} />Add Section
                    </button>
                    <button type="button" onClick={() => setActiveSections(null)}
                      style={{ padding:'8px 14px', background:'none', color:'var(--theme-text-muted,#64748b)', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:8, fontSize:12, cursor:'pointer' }}>
                      Reset to Default
                    </button>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {getSections().map((section, idx) => (
                    <div key={section.id || idx} style={{ border:'1px solid var(--card-border,#e2e8f0)', borderRadius:10, background:'var(--card-bg,#fff)', overflow:'hidden' }}>
                      {/* Section header row */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--theme-bg-muted,#f8fafc)', borderBottom:'1px solid var(--card-border,#e2e8f0)' }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                          <button type="button" onClick={() => moveSection(idx, -1)} disabled={idx === 0} title="Move up"
                            style={{ background:'none', border:'none', cursor:'pointer', color:idx===0?'#d1d5db':'#6b7280', fontSize:10, padding:1, lineHeight:1 }}>▲</button>
                          <button type="button" onClick={() => moveSection(idx, 1)} disabled={idx === getSections().length-1} title="Move down"
                            style={{ background:'none', border:'none', cursor:'pointer', color:idx===getSections().length-1?'#d1d5db':'#6b7280', fontSize:10, padding:1, lineHeight:1 }}>▼</button>
                        </div>
                        <label style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', flex:1 }}>
                          <input type="checkbox" checked={section.visible} onChange={e => updateSection(idx, { visible: e.target.checked })} />
                          <span style={{ fontWeight:600, fontSize:13, color:'var(--theme-text-strong,#0f172a)' }}>
                            {section.title || <em style={{ color:'#9ca3af' }}>Untitled Section</em>}
                          </span>
                          {section.fixed && <span style={{ fontSize:10, background:'#dbeafe', color:'#1d4ed8', padding:'1px 6px', borderRadius:4, fontWeight:600 }}>FIXED</span>}
                        </label>
                        <select value={section.type} onChange={e => updateSection(idx, { type: e.target.value })} disabled={section.fixed}
                          style={{ fontSize:11, padding:'3px 6px', borderRadius:5, border:'1px solid var(--card-border,#e2e8f0)', background:'var(--card-bg,#fff)', color:'var(--theme-text,#374151)' }}>
                          <option value="paragraph">Paragraph</option>
                          <option value="bullet_list">Bullet List</option>
                          <option value="numbered_list">Numbered List</option>
                          <option value="table">Table</option>
                          <option value="signature_block">Signature Block</option>
                        </select>
                        {!section.fixed && (
                          <button type="button" onClick={() => removeSection(idx)} title="Remove section"
                            style={{ background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                            <i className="fas fa-trash" />
                          </button>
                        )}
                      </div>

                      {/* Section body editor */}
                      {section.visible && !section.fixed && (
                        <div style={{ padding:'12px 14px' }}>
                          <div style={{ marginBottom:8 }}>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase', letterSpacing:.4 }}>Section Title</label>
                            <input type="text" value={section.title} onChange={e => updateSection(idx, { title: e.target.value })}
                              placeholder="e.g. Role & Responsibilities"
                              style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:7, fontSize:13, marginTop:4, boxSizing:'border-box', background:'var(--input-bg,#fff)', color:'var(--theme-text,#0f172a)' }} />
                          </div>

                          {(section.type === 'paragraph' || section.type === 'signature_block') && (
                            <div>
                              <label style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase', letterSpacing:.4 }}>Content</label>
                              <textarea rows={3} value={section.content || ''} onChange={e => updateSection(idx, { content: e.target.value })}
                                placeholder="Enter paragraph text..."
                                style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:7, fontSize:13, marginTop:4, boxSizing:'border-box', background:'var(--input-bg,#fff)', color:'var(--theme-text,#0f172a)', resize:'vertical' }} />
                            </div>
                          )}

                          {(section.type === 'bullet_list' || section.type === 'numbered_list') && (
                            <div>
                              <label style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase', letterSpacing:.4 }}>Items</label>
                              <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:6 }}>
                                {(section.items || []).map((item, iIdx) => (
                                  <div key={iIdx} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                                    <span style={{ padding:'8px 4px', color:'#9ca3af', fontSize:12, flexShrink:0 }}>{section.type === 'numbered_list' ? `${iIdx+1}.` : '•'}</span>
                                    <input type="text" value={item} onChange={e => updateItem(idx, iIdx, e.target.value)}
                                      placeholder={`Item ${iIdx + 1}`}
                                      style={{ flex:1, padding:'7px 10px', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:7, fontSize:13, background:'var(--input-bg,#fff)', color:'var(--theme-text,#0f172a)' }} />
                                    <button type="button" onClick={() => removeItem(idx, iIdx)}
                                      style={{ padding:'6px 10px', background:'#fee2e2', color:'#b91c1c', border:'none', borderRadius:6, cursor:'pointer', fontSize:11, flexShrink:0 }}>✕</button>
                                  </div>
                                ))}
                              </div>
                              <button type="button" onClick={() => addItem(idx)}
                                style={{ marginTop:8, padding:'5px 14px', background:'none', border:'1px dashed var(--card-border,#e2e8f0)', borderRadius:6, color:'#1C47C9', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                                + Add Item
                              </button>
                            </div>
                          )}

                          {section.type === 'table' && (
                            <div style={{ fontSize:12, color:'var(--theme-text-muted,#64748b)', padding:'10px', background:'var(--theme-bg-muted,#f8fafc)', borderRadius:7, border:'1px dashed var(--card-border,#e2e8f0)' }}>
                              Table editor: set headers and rows via JSON.
                              <textarea rows={4} value={JSON.stringify(section.tableData || { headers: ['Column 1', 'Column 2'], rows: [['Row 1A', 'Row 1B']] }, null, 2)}
                                onChange={e => { try { updateSection(idx, { tableData: JSON.parse(e.target.value) }); } catch (_) {} }}
                                style={{ width:'100%', marginTop:6, padding:'6px', fontFamily:'monospace', fontSize:11, border:'1px solid var(--card-border,#e2e8f0)', borderRadius:6, boxSizing:'border-box', background:'var(--input-bg,#fff)', color:'var(--theme-text,#0f172a)' }} />
                            </div>
                          )}

                          {section.note !== undefined && (
                            <div style={{ marginTop:8 }}>
                              <label style={{ fontSize:11, fontWeight:600, color:'var(--theme-text-muted,#64748b)', textTransform:'uppercase', letterSpacing:.4 }}>Additional Note (after items)</label>
                              <input type="text" value={section.note || ''} onChange={e => updateSection(idx, { note: e.target.value })}
                                placeholder="Optional note below the list..."
                                style={{ width:'100%', padding:'7px 10px', border:'1px solid var(--card-border,#e2e8f0)', borderRadius:7, fontSize:13, marginTop:4, boxSizing:'border-box', background:'var(--input-bg,#fff)', color:'var(--theme-text,#0f172a)' }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Accept → Convert to Employee modal ─────── */}
      {isAcceptModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content1">
            <div className="modal-header">
              <h2>Convert to Employee</h2>
              <button className="close-btn" onClick={() => setIsAcceptModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom:20 }}>Provide Employee ID, Department, and Employee Type to convert this candidate into an employee.</p>
              <form onSubmit={handleAcceptSubmit} className="employee-form">
                <div className="form-group" style={{ marginBottom:15 }}>
                  <label>Employee ID *</label>
                  <input type="text" value={acceptFormData.employee_id}
                    onChange={e => setAcceptFormData({ ...acceptFormData, employee_id: e.target.value })}
                    placeholder="e.g. EMP00101" required />
                </div>
                <div className="form-group" style={{ marginBottom:15 }}>
                  <label>Department *</label>
                  <select value={acceptFormData.department_id}
                    onChange={e => setAcceptFormData({ ...acceptFormData, department_id: e.target.value })} required>
                    <option value="">Select Department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Employee Type *</label>
                  <select value={acceptFormData.employment_type}
                    onChange={e => setAcceptFormData({ ...acceptFormData, employment_type: e.target.value })} required>
                    <option value="">Select Type</option>
                    {['Full-time','Part-time','Intern','Contract','Consultant','Temporary'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-actions" style={{ marginTop:25 }}>
                  <button type="button" onClick={() => setIsAcceptModalOpen(false)} className="cancel-btn">Cancel</button>
                  <button type="submit" className="c-to-e-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Accept & Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferLetter;
