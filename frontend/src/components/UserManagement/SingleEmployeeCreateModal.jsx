/**
 * SingleEmployeeCreateModal – Premium 5-step employee creation form
 * Sections: Personal Info | Employment | Reporting | Salary & Finance | Account
 */
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './SingleEmployeeCreateModal.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authHdr = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

// ── Constants ────────────────────────────────────────────────────────────────
const NOTICE_PERIODS = ['15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Custom'];
const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Consultant', 'Temporary'];
const EMPLOYMENT_CATEGORIES = [
  { value: 'employee',   label: 'Employee' },
  { value: 'intern',     label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
];
const WORK_LOCATIONS = ['Office', 'Remote', 'Hybrid'];
const STATUSES = ['active', 'inactive'];
const TDS_CATEGORIES = ['Salary', 'Professional Services', 'Contract', 'Other'];
const CONSULTANT_TYPES = ['Independent', 'Agency', 'Freelance', 'Retainer'];
const DURATION_OPTIONS = ['1 Month', '2 Months', '3 Months', '6 Months', '1 Year', 'Custom'];

const POLICY_RULES = [
  { key: 'len',     label: '8+ chars',   test: p => p.length >= 8 },
  { key: 'upper',   label: 'Uppercase',  test: p => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Lowercase',  test: p => /[a-z]/.test(p) },
  { key: 'digit',   label: 'Number',     test: p => /[0-9]/.test(p) },
  { key: 'special', label: 'Symbol',     test: p => /[^A-Za-z0-9]/.test(p) },
];

const SECTIONS = [
  { label: 'Personal',   icon: '👤' },
  { label: 'Employment', icon: '💼' },
  { label: 'Reporting',  icon: '🏢' },
  { label: 'Salary',     icon: '₹'  },
  { label: 'Account',    icon: '🔐' },
];

// ── Initial form state ───────────────────────────────────────────────────────
const initForm = () => ({
  // Personal
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', address: '', emergency_contact: '',

  // Employment
  position: '', employment_type: 'Full-time',
  employment_category: 'employee', notice_period: '',
  notice_period_custom: '', joining_date: '',
  work_location: 'Office', shift_id: '', status: 'active',
  department_id: '',

  // Consultant fields
  gst_number: '', consultant_type: '', contract_duration: '',
  contract_start_date: '', contract_end_date: '',

  // Intern fields
  college_name: '', internship_duration: '',
  internship_start_date: '', internship_end_date: '',
  stipend_amount: '', mentor_id: '',

  // Reporting
  reporting_manager_id: '', team_lead_id: '', client_id: '',

  // Salary
  salary: '', salary_basic: '', salary_hra: '',
  salary_medical_allowance: '', salary_travel_allowance: '', salary_other_allowance: '',
  bonus: '', incentives: '', reimbursements: '', other_deductions: '',

  // PF
  pf_applicable: false, pf_number: '', uan_number: '',
  epf_fixed_amount: '',

  // TDS
  tds_applicable: false, tds_percentage: '', tds_category: '',

  // Compliance
  pan_number: '', aadhar_number: '',
  bank_account_number: '', ifsc_code: '',

  // Account
  password: '', confirm_password: '', force_reset: true,
});

// ── Sub-components ──────────────────────────────────────────────────────────
const Field = ({ label, required, error, hint, children, span }) => (
  <div className={`ecm-field${span ? ` ecm-span-${span}` : ''}${error ? ' ecm-has-error' : ''}`}>
    <label className="ecm-label">
      {label}{required && <span className="ecm-req">*</span>}
    </label>
    {children}
    {hint && !error && <span className="ecm-hint">{hint}</span>}
    {error && <span className="ecm-error-msg">{error}</span>}
  </div>
);

const SectionTitle = ({ icon, title, subtitle }) => (
  <div className="ecm-section-title">
    <span className="ecm-section-icon">{icon}</span>
    <div>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  </div>
);

const Toggle = ({ checked, onChange, label }) => (
  <label className="ecm-toggle-wrap">
    <span className="ecm-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="ecm-toggle-slider" />
    </span>
    <span className="ecm-toggle-label">{label}</span>
  </label>
);

const PolicyMeter = ({ password }) => {
  if (!password) return null;
  const passed = POLICY_RULES.filter(r => r.test(password)).length;
  const pct = (passed / POLICY_RULES.length) * 100;
  const color = pct <= 40 ? '#ef4444' : pct <= 80 ? '#f59e0b' : '#10b981';
  return (
    <div className="ecm-policy">
      <div className="ecm-meter"><div style={{ width: `${pct}%`, background: color }} /></div>
      <div className="ecm-rules">
        {POLICY_RULES.map(r => (
          <span key={r.key} className={r.test(password) ? 'ok' : 'fail'}>
            {r.test(password) ? '✓' : '✗'} {r.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ── Payroll preview calculation ──────────────────────────────────────────────
const calcPreview = (form) => {
  const n = v => Math.max(0, Number(String(v || '').replace(/,/g, '')) || 0);
  const basic = n(form.salary_basic);
  const hra = n(form.salary_hra);
  const medical = n(form.salary_medical_allowance);
  const travel = n(form.salary_travel_allowance);
  const other = n(form.salary_other_allowance);
  const gross = basic + hra + medical + travel + other;
  // PF = stored fixed amount only — never auto-calculated
  const pf = n(form.epf_fixed_amount);
  const esic = gross > 0 && gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const pt = gross > 10000 ? 200 : 0;
  const tds = form.tds_applicable && form.tds_percentage
    ? Math.round(gross * (n(form.tds_percentage) / 100))
    : 0;
  const totalDed = pf + esic + pt + tds;
  const net = Math.max(0, gross - totalDed);
  return { gross, pf, esic, pt, tds, totalDed, net };
};

// ── Main Component ────────────────────────────────────────────────────────────
const SingleEmployeeCreateModal = ({ open, onClose, onSuccess }) => {
  const [form, setForm] = useState(initForm());
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [section, setSection] = useState(0);
  const [nextId, setNextId] = useState('EMP...');
  const [dataLoading, setDataLoading] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [clients,     setClients]     = useState([]);
  const [shifts,      setShifts]      = useState([]);

  // Load lookup data + preview ID on open
  useEffect(() => {
    if (!open) return;
    setDataLoading(true);
    const h = authHdr();
    Promise.all([
      axios.get(`${API}/api/employees/departments`,  { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/api/employees`,              { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/api/clients`,                { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/api/shifts`,                 { headers: h }).catch(() => ({ data: {} })),
      axios.get(`${API}/api/employees/next-id`,      { headers: h }).catch(() => ({ data: {} })),
    ]).then(([d, e, c, s, nid]) => {
      setDepartments(d.data.departments || []);
      setEmployees((e.data.employees || e.data.data || []).filter(emp => emp.is_active !== false));
      setClients(c.data.clients || c.data.data || []);
      setShifts(s.data.shifts || s.data.data || []);
      if (nid.data.next_id) setNextId(nid.data.next_id);
    }).finally(() => setDataLoading(false));
  }, [open]);

  if (!open) return null;

  const set = (key, val) => {
    setForm(p => ({ ...p, [key]: val }));
    setErrors(p => ({ ...p, [key]: '' }));
  };

  // ── Section validation ───────────────────────────────────────────────────
  const validateSection = (idx) => {
    const e = {};
    if (idx === 0) {
      if (!form.first_name.trim()) e.first_name = 'Required';
      if (!form.last_name.trim())  e.last_name  = 'Required';
      if (!form.email.trim())      e.email      = 'Required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    }
    if (idx === 1) {
      if (!form.position.trim())  e.position   = 'Required';
      if (!form.joining_date)     e.joining_date = 'Required';
    }
    if (idx === 4) {
      if (form.password) {
        for (const r of POLICY_RULES) {
          if (!r.test(form.password)) { e.password = `Must contain: ${r.label}`; break; }
        }
        if (!e.password && form.password !== form.confirm_password)
          e.confirm_password = 'Passwords do not match';
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (validateSection(section)) setSection(s => s + 1);
  };

  const goBack = () => setSection(s => s - 1);

  // ── Submit ───────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!validateSection(4)) return;
    setLoading(true);
    setApiError('');
    try {
      const payload = { ...form };
      // Resolve custom notice period
      if (payload.notice_period === 'Custom') {
        payload.notice_period = payload.notice_period_custom || 'Custom';
      }
      delete payload.notice_period_custom;
      if (!payload.password) { delete payload.password; delete payload.confirm_password; }
      delete payload.confirm_password;

      await axios.post(`${API}/api/user-management/employees/create`, payload, { headers: authHdr() });
      onSuccess?.();
      close();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to create employee. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setForm(initForm()); setErrors({}); setApiError('');
    setSection(0); setNextId('EMP...'); onClose();
  };

  const preview = calcPreview(form);
  const cat = form.employment_category;

  // ── Step progress bar ─────────────────────────────────────────────────────
  const renderSteps = () => (
    <div className="ecm-steps">
      {SECTIONS.map((s, i) => (
        <button
          key={s.label}
          className={`ecm-step ${i === section ? 'active' : ''} ${i < section ? 'done' : ''}`}
          onClick={() => { if (i < section) setSection(i); }}
          type="button"
        >
          <span className="ecm-step-circle">
            {i < section ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <span>{i + 1}</span>
            )}
          </span>
          <span className="ecm-step-label">{s.label}</span>
        </button>
      ))}
      <div className="ecm-step-line" style={{ '--progress': `${(section / (SECTIONS.length - 1)) * 100}%` }} />
    </div>
  );

  // ── Section 0: Personal Info ─────────────────────────────────────────────
  const renderPersonal = () => (
    <div className="ecm-grid">
      <SectionTitle icon="👤" title="Personal Information" subtitle="Basic identity and contact details" />

      {/* Employee ID Preview */}
      <div className="ecm-id-preview">
        <span className="ecm-id-label">Auto-Generated Employee ID</span>
        <span className="ecm-id-value">{dataLoading ? '...' : nextId}</span>
        <span className="ecm-id-note">Assigned automatically on creation</span>
      </div>

      <Field label="First Name" required error={errors.first_name}>
        <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" />
      </Field>
      <Field label="Last Name" required error={errors.last_name}>
        <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" />
      </Field>
      <Field label="Email Address" required error={errors.email}>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="employee@company.com" />
      </Field>
      <Field label="Mobile Number" error={errors.phone}>
        <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9XXXXXXXX" />
      </Field>
      <Field label="Date of Birth" error={errors.date_of_birth}>
        <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
      </Field>
      <Field label="Emergency Contact" error={errors.emergency_contact} hint="Name & number">
        <input value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Name: +91 9XXXXXXXX" />
      </Field>
      <Field label="Address" error={errors.address} span={2}>
        <textarea rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full residential address" />
      </Field>
    </div>
  );

  // ── Section 1: Employment Info ───────────────────────────────────────────
  const renderEmployment = () => (
    <div className="ecm-grid">
      <SectionTitle icon="💼" title="Employment Information" subtitle="Role, category, and work arrangement" />

      <Field label="Designation / Position" required error={errors.position}>
        <input value={form.position} onChange={e => set('position', e.target.value)} placeholder="e.g. Software Engineer" />
      </Field>
      <Field label="Department" error={errors.department_id}>
        <select value={form.department_id} onChange={e => set('department_id', e.target.value)}>
          <option value="">Select department</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>
      <Field label="Employment Type" error={errors.employment_type}>
        <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
          {EMPLOYMENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Employment Category" error={errors.employment_category}>
        <select value={form.employment_category} onChange={e => set('employment_category', e.target.value)}>
          {EMPLOYMENT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Joining Date" required error={errors.joining_date}>
        <input type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
      </Field>
      <Field label="Notice Period" error={errors.notice_period}>
        <select value={form.notice_period} onChange={e => set('notice_period', e.target.value)}>
          <option value="">Not specified</option>
          {NOTICE_PERIODS.map(p => <option key={p}>{p}</option>)}
        </select>
      </Field>
      {form.notice_period === 'Custom' && (
        <Field label="Custom Notice Period" error={errors.notice_period_custom}>
          <input value={form.notice_period_custom} onChange={e => set('notice_period_custom', e.target.value)} placeholder="e.g. 120 Days" />
        </Field>
      )}
      <Field label="Work Location" error={errors.work_location}>
        <select value={form.work_location} onChange={e => set('work_location', e.target.value)}>
          {WORK_LOCATIONS.map(l => <option key={l}>{l}</option>)}
        </select>
      </Field>
      <Field label="Shift" error={errors.shift_id}>
        <select value={form.shift_id} onChange={e => set('shift_id', e.target.value)}>
          <option value="">Default / No Shift</option>
          {shifts.map(s => <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>)}
        </select>
      </Field>
      <Field label="Status" error={errors.status}>
        <select value={form.status} onChange={e => set('status', e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </Field>

      {/* ── Consultant-specific fields ── */}
      {cat === 'consultant' && (
        <>
          <div className="ecm-subsection-divider" style={{ '--accent': '#6366f1' }}>
            <span>Consultant Details</span>
          </div>
          <Field label="GST Number" error={errors.gst_number}>
            <input value={form.gst_number} onChange={e => set('gst_number', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
          </Field>
          <Field label="Consultant Type" error={errors.consultant_type}>
            <select value={form.consultant_type} onChange={e => set('consultant_type', e.target.value)}>
              <option value="">Select type</option>
              {CONSULTANT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Contract Duration" error={errors.contract_duration}>
            <select value={form.contract_duration} onChange={e => set('contract_duration', e.target.value)}>
              <option value="">Select duration</option>
              {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Contract Start Date" error={errors.contract_start_date}>
            <input type="date" value={form.contract_start_date} onChange={e => set('contract_start_date', e.target.value)} />
          </Field>
          <Field label="Contract End Date" error={errors.contract_end_date}>
            <input type="date" value={form.contract_end_date} onChange={e => set('contract_end_date', e.target.value)} />
          </Field>
        </>
      )}

      {/* ── Intern-specific fields ── */}
      {cat === 'intern' && (
        <>
          <div className="ecm-subsection-divider" style={{ '--accent': '#10b981' }}>
            <span>Internship Details</span>
          </div>
          <Field label="College / University" error={errors.college_name}>
            <input value={form.college_name} onChange={e => set('college_name', e.target.value)} placeholder="Institution name" />
          </Field>
          <Field label="Internship Duration" error={errors.internship_duration}>
            <select value={form.internship_duration} onChange={e => set('internship_duration', e.target.value)}>
              <option value="">Select duration</option>
              {DURATION_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Internship Start Date" error={errors.internship_start_date}>
            <input type="date" value={form.internship_start_date} onChange={e => set('internship_start_date', e.target.value)} />
          </Field>
          <Field label="Internship End Date" error={errors.internship_end_date}>
            <input type="date" value={form.internship_end_date} onChange={e => set('internship_end_date', e.target.value)} />
          </Field>
          <Field label="Stipend Amount (₹/month)" error={errors.stipend_amount}>
            <input type="number" value={form.stipend_amount} onChange={e => set('stipend_amount', e.target.value)} placeholder="0" min="0" />
          </Field>
          <Field label="Mentor Assigned" error={errors.mentor_id}>
            <select value={form.mentor_id} onChange={e => set('mentor_id', e.target.value)}>
              <option value="">Select mentor</option>
              {employees.map(e => <option key={e.user_id} value={e.user_id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </Field>
        </>
      )}
    </div>
  );

  // ── Section 2: Reporting Structure ───────────────────────────────────────
  const renderReporting = () => (
    <div className="ecm-grid">
      <SectionTitle icon="🏢" title="Reporting Structure" subtitle="Management hierarchy and client linkage" />

      <Field label="Reporting Manager" error={errors.reporting_manager_id}>
        <select value={form.reporting_manager_id} onChange={e => set('reporting_manager_id', e.target.value)}>
          <option value="">Select manager</option>
          {employees.map(e => <option key={e.user_id} value={e.user_id}>{e.first_name} {e.last_name} – {e.position || 'N/A'}</option>)}
        </select>
      </Field>
      <Field label="Team Lead" error={errors.team_lead_id}>
        <select value={form.team_lead_id} onChange={e => set('team_lead_id', e.target.value)}>
          <option value="">Select team lead</option>
          {employees.map(e => <option key={`tl-${e.user_id}`} value={e.user_id}>{e.first_name} {e.last_name} – {e.position || 'N/A'}</option>)}
        </select>
      </Field>
      <Field label="Linked Client" error={errors.client_id}>
        <select value={form.client_id} onChange={e => set('client_id', e.target.value)}>
          <option value="">None</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name || c.company_name}</option>)}
        </select>
      </Field>

      {/* Reporting info card */}
      <div className="ecm-info-card ecm-span-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>Reporting structure determines notification routing for leave approvals, performance alerts, and attendance exceptions. All fields are optional at creation.</p>
      </div>
    </div>
  );

  // ── Section 3: Salary & Finance ──────────────────────────────────────────
  const renderSalary = () => (
    <div className="ecm-grid">
      <SectionTitle icon="₹" title="Salary & Finance" subtitle="Compensation, compliance numbers, and banking" />

      {/* Salary components */}
      <div className="ecm-subsection-divider" style={{ '--accent': '#6366f1' }}>
        <span>Salary Components</span>
      </div>
      <Field label="Basic Salary (₹)" error={errors.salary_basic} hint="40-50% of CTC">
        <input type="number" value={form.salary_basic} onChange={e => set('salary_basic', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="HRA (₹)" error={errors.salary_hra} hint="House Rent Allowance">
        <input type="number" value={form.salary_hra} onChange={e => set('salary_hra', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="Medical Allowance (₹)" error={errors.salary_medical_allowance}>
        <input type="number" value={form.salary_medical_allowance} onChange={e => set('salary_medical_allowance', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="Travel Allowance (₹)" error={errors.salary_travel_allowance}>
        <input type="number" value={form.salary_travel_allowance} onChange={e => set('salary_travel_allowance', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="Other Allowance (₹)" error={errors.salary_other_allowance}>
        <input type="number" value={form.salary_other_allowance} onChange={e => set('salary_other_allowance', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="Bonus (₹/month)" error={errors.bonus}>
        <input type="number" value={form.bonus} onChange={e => set('bonus', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="Incentives (₹/month)" error={errors.incentives}>
        <input type="number" value={form.incentives} onChange={e => set('incentives', e.target.value)} placeholder="0" min="0" />
      </Field>
      <Field label="Other Deductions (₹)" error={errors.other_deductions}>
        <input type="number" value={form.other_deductions} onChange={e => set('other_deductions', e.target.value)} placeholder="0" min="0" />
      </Field>

      {/* PF */}
      <div className="ecm-subsection-divider" style={{ '--accent': '#10b981' }}>
        <span>Provident Fund (PF)</span>
      </div>
      <div className="ecm-span-2">
        <Toggle
          checked={form.pf_applicable}
          onChange={v => set('pf_applicable', v)}
          label="PF Applicable"
        />
      </div>
      {form.pf_applicable && (
        <>
          <Field label="PF Account Number" error={errors.pf_number}>
            <input value={form.pf_number} onChange={e => set('pf_number', e.target.value)} placeholder="PF Account No." />
          </Field>
          <Field label="UAN Number" error={errors.uan_number}>
            <input value={form.uan_number} onChange={e => set('uan_number', e.target.value)} placeholder="Universal Account No." />
          </Field>
          <Field label="EPF Fixed Amount (₹)" hint="Leave blank if no PF deduction" error={errors.epf_fixed_amount}>
            <input type="number" value={form.epf_fixed_amount || ''} onChange={e => set('epf_fixed_amount', e.target.value)} placeholder="e.g. 1800" min="0" step="1" />
          </Field>
        </>
      )}

      {/* TDS */}
      <div className="ecm-subsection-divider" style={{ '--accent': '#f59e0b' }}>
        <span>Tax Deducted at Source (TDS)</span>
      </div>
      <div className="ecm-span-2">
        <Toggle
          checked={form.tds_applicable}
          onChange={v => set('tds_applicable', v)}
          label="TDS Applicable"
        />
      </div>
      {form.tds_applicable && (
        <>
          <Field label="TDS Percentage (%)" error={errors.tds_percentage}>
            <input type="number" value={form.tds_percentage} onChange={e => set('tds_percentage', e.target.value)} placeholder="10" min="0" max="100" step="0.01" />
          </Field>
          <Field label="TDS Category" error={errors.tds_category}>
            <select value={form.tds_category} onChange={e => set('tds_category', e.target.value)}>
              <option value="">Select category</option>
              {TDS_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </>
      )}

      {/* Compliance & Banking */}
      <div className="ecm-subsection-divider" style={{ '--accent': '#8b5cf6' }}>
        <span>Compliance & Banking</span>
      </div>
      <Field label="PAN Number" error={errors.pan_number}>
        <input value={form.pan_number} onChange={e => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
      </Field>
      <Field label="Aadhaar Number" error={errors.aadhar_number}>
        <input value={form.aadhar_number} onChange={e => set('aadhar_number', e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14} />
      </Field>
      <Field label="Bank Account Number" error={errors.bank_account_number}>
        <input value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} placeholder="Account number" />
      </Field>
      <Field label="IFSC Code" error={errors.ifsc_code}>
        <input value={form.ifsc_code} onChange={e => set('ifsc_code', e.target.value.toUpperCase())} placeholder="SBIN0001234" maxLength={11} />
      </Field>

      {/* Live Payroll Preview */}
      {(Number(form.salary_basic) > 0 || Number(form.salary_hra) > 0) && (
        <div className="ecm-payroll-preview ecm-span-2">
          <div className="ecm-pp-title">Live Salary Preview</div>
          <div className="ecm-pp-grid">
            <div className="ecm-pp-row earnings">
              <span>Gross Salary</span>
              <strong>₹{preview.gross.toLocaleString('en-IN')}</strong>
            </div>
            <div className="ecm-pp-row deduction">
              <span>Employee PF</span>
              <span>- ₹{preview.pf.toLocaleString('en-IN')}</span>
            </div>
            <div className="ecm-pp-row deduction">
              <span>ESIC</span>
              <span>- ₹{preview.esic.toLocaleString('en-IN')}</span>
            </div>
            <div className="ecm-pp-row deduction">
              <span>Professional Tax</span>
              <span>- ₹{preview.pt.toLocaleString('en-IN')}</span>
            </div>
            {form.tds_applicable && (
              <div className="ecm-pp-row deduction">
                <span>TDS</span>
                <span>- ₹{preview.tds.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="ecm-pp-row net">
              <span>Net Take-Home</span>
              <strong>₹{preview.net.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Section 4: Account ───────────────────────────────────────────────────
  const renderAccount = () => (
    <div className="ecm-grid">
      <SectionTitle icon="🔐" title="Login Credentials" subtitle="Optional - can be configured later by admin" />

      <div className="ecm-info-card ecm-span-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <p>If you skip this section, the employee can still be added. Login credentials can be set by the admin later. The employee's email is used as the login identifier.</p>
      </div>

      <Field label="Password" error={errors.password} span={2}>
        <div className="ecm-pw-wrap">
          <input
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="Leave blank to set later"
          />
          <button type="button" className="ecm-eye" onClick={() => setShowPw(v => !v)}>
            {showPw
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>
        {form.password && <PolicyMeter password={form.password} />}
      </Field>

      {form.password && (
        <Field label="Confirm Password" error={errors.confirm_password} span={2}>
          <div className="ecm-pw-wrap">
            <input
              type={showCp ? 'text' : 'password'}
              value={form.confirm_password}
              onChange={e => set('confirm_password', e.target.value)}
              placeholder="Repeat password"
            />
            <button type="button" className="ecm-eye" onClick={() => setShowCp(v => !v)}>
              {showCp
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
        </Field>
      )}

      <label className="ecm-checkbox ecm-span-2">
        <input type="checkbox" checked={form.force_reset} onChange={e => set('force_reset', e.target.checked)} />
        <span>Require password change on first login</span>
      </label>
    </div>
  );

  const RENDERERS = [renderPersonal, renderEmployment, renderReporting, renderSalary, renderAccount];

  return (
    <div className="ecm-backdrop" onClick={close}>
      <div className="ecm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="ecm-header">
          <div className="ecm-header-left">
            <div className="ecm-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <h2>Add Employee</h2>
              <p>Step {section + 1} of {SECTIONS.length} – {SECTIONS[section].label}</p>
            </div>
          </div>
          <button className="ecm-close" onClick={close} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Steps */}
        {renderSteps()}

        {/* API Error */}
        {apiError && (
          <div className="ecm-api-error">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {apiError}
          </div>
        )}

        {/* Body */}
        <div className="ecm-body">
          {RENDERERS[section]()}
        </div>

        {/* Footer */}
        <div className="ecm-footer">
          {section > 0 ? (
            <button className="ecm-btn ecm-btn-ghost" onClick={goBack} disabled={loading} type="button">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="ecm-footer-right">
            <button className="ecm-btn ecm-btn-ghost" onClick={close} disabled={loading} type="button">
              Cancel
            </button>
            {section < SECTIONS.length - 1 ? (
              <button className="ecm-btn ecm-btn-primary" onClick={goNext} type="button">
                Next
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            ) : (
              <button className="ecm-btn ecm-btn-primary" onClick={submit} disabled={loading} type="button">
                {loading ? (
                  <>
                    <svg className="ecm-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="45" strokeLinecap="round"/>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Create Employee
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SingleEmployeeCreateModal;

