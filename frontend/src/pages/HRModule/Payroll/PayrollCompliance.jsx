import React, { useState, useEffect } from 'react';
import { payrollComplianceAPI } from '../../../services/payrollComplianceAPI';

const TABS = [
  { id: 'declarations', label: '📋 Investment Declarations (12BB)' },
  { id: 'tds', label: '🧾 TDS Computation' },
  { id: 'pf', label: '🏦 PF / EPF Report' },
  { id: 'esic', label: '🏥 ESIC Report' },
  { id: 'pt', label: '🏛 Professional Tax' },
  { id: 'form24q', label: '📊 Form 24Q' },
  { id: 'settings', label: '⚙️ Compliance Settings' },
];

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const currentFY = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
};

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayrollCompliance() {
  const [tab, setTab] = useState('declarations');

  return (
    <div style={{ padding: 24, fontFamily: '"Inter",system-ui,sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--theme-text-strong,#0f172a)' }}>Payroll Compliance</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--theme-text-muted,#6b7280)' }}>
          India statutory compliance -- TDS, PF, ESIC, Professional Tax, Form 16 & 24Q
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--card-border,#e5e7eb)', marginBottom: 24, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 16px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
            background: 'transparent', borderBottom: t.id === tab ? '2px solid #1C47C9' : '2px solid transparent',
            color: t.id === tab ? '#1C47C9' : 'var(--theme-text-muted,#6b7280)', marginBottom: -2, whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'declarations' && <DeclarationsTab />}
      {tab === 'tds' && <TDSTab />}
      {tab === 'pf' && <PFTab />}
      {tab === 'esic' && <ESICTab />}
      {tab === 'pt' && <PTTab />}
      {tab === 'form24q' && <Form24QTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

// ── Declarations (12BB) ────────────────────────────────────────────────────────
function DeclarationsTab() {
  const [decls, setDecls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fy, setFy] = useState(currentFY());
  const [approving, setApproving] = useState(null);
  const [remarks, setRemarks] = useState('');

  const load = async () => {
    setLoading(true);
    try { const r = await payrollComplianceAPI.getAllDeclarations(fy); setDecls(r.data?.declarations || []); }
    catch { setDecls([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [fy]);

  const approve = async (id, status) => {
    await payrollComplianceAPI.approveDeclaration(id, status, remarks);
    setApproving(null);
    setRemarks('');
    load();
  };

  const STATUS = { draft: ['#6b7280','#f3f4f6'], submitted: ['#1d4ed8','#dbeafe'], approved: ['#15803d','#dcfce7'], rejected: ['#b91c1c','#fee2e2'] };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <label style={{ fontWeight: 600, fontSize: '0.85rem', color: '#6b7280' }}>Financial Year:</label>
        <select value={fy} onChange={e => setFy(e.target.value)} style={selectStyle}>
          {['2024-25','2023-24','2022-23'].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div> : (
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead><tr style={{ background: 'var(--table-header-bg,#f9fafb)', borderBottom: '2px solid var(--card-border,#e5e7eb)' }}>
              {['Employee','80C','80D','HRA','LTA','Total Deductions','Status','Action'].map(h =>
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: '0.76rem', textTransform: 'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {decls.map((d, i) => {
                const total = [d.sec_80c,d.sec_80d,d.sec_80e,d.sec_80g,d.sec_80tta,d.hra_claimed,d.lta_claimed,d.other_deductions].reduce((a,v) => a + Number(v||0), 0);
                const [col, bg] = STATUS[d.status] || STATUS.draft;
                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i%2===0?'transparent':'var(--table-row-alt,#fafafa)' }}>
                    <td style={tdStyle}><div style={{ fontWeight: 600 }}>{d.employee_name}</div><div style={{ fontSize:'0.76rem', color:'#9ca3af' }}>{d.email}</div></td>
                    <td style={tdStyle}>{fmtCurrency(d.sec_80c)}</td>
                    <td style={tdStyle}>{fmtCurrency(d.sec_80d)}</td>
                    <td style={tdStyle}>{fmtCurrency(d.hra_claimed)}</td>
                    <td style={tdStyle}>{fmtCurrency(d.lta_claimed)}</td>
                    <td style={tdStyle}><strong>{fmtCurrency(total)}</strong></td>
                    <td style={tdStyle}><span style={{ color: col, background: bg, padding: '3px 9px', borderRadius: 5, fontSize: '0.75rem', fontWeight: 700 }}>{d.status}</span></td>
                    <td style={tdStyle}>
                      {d.status === 'submitted' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => approve(d.id, 'approved')} style={{ ...smBtnStyle, background: '#15803d', color: '#fff' }}>Approve</button>
                          <button onClick={() => setApproving(d.id)} style={{ ...smBtnStyle, background: '#b91c1c', color: '#fff' }}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {decls.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No declarations for {fy}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {approving && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, padding: 28, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 14px', fontWeight: 700 }}>Reject Declaration</h4>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Reason for rejection (optional)" style={{ ...selectStyle, width: '100%', marginBottom: 16, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setApproving(null)} style={{ ...smBtnStyle, background: '#e5e7eb', color: '#374151' }}>Cancel</button>
              <button onClick={() => approve(approving, 'rejected')} style={{ ...smBtnStyle, background: '#b91c1c', color: '#fff' }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TDS Computation ────────────────────────────────────────────────────────────
function TDSTab() {
  const [employeeId, setEmployeeId] = useState('');
  const [fy, setFy] = useState(currentFY());
  const [regime, setRegime] = useState('new');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    import('../../../services/employeeAPI').then(m => m.employeeAPI.getAll().then(r => setEmployees(r.data?.employees || [])).catch(()=>{}));
  }, []);

  const compute = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const r = await payrollComplianceAPI.computeTDS({ employee_id: employeeId, financial_year: fy, regime });
      setResult(r.data);
    } catch (err) { alert(err.response?.data?.message || 'Computation failed'); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, marginBottom: 24, alignItems: 'end' }}>
        <div>
          <label style={labelStyle}>Employee</label>
          <select value={employeeId} onChange={e => setEmployeeId(e.target.value)} style={selectStyle}>
            <option value="">Select Employee</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Financial Year</label>
          <select value={fy} onChange={e => setFy(e.target.value)} style={selectStyle}>
            {['2024-25','2023-24','2022-23'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Tax Regime</label>
          <select value={regime} onChange={e => setRegime(e.target.value)} style={selectStyle}>
            <option value="new">New Regime</option>
            <option value="old">Old Regime</option>
          </select>
        </div>
        <button onClick={compute} disabled={loading || !employeeId} style={{ ...smBtnStyle, background: '#1C47C9', color: '#fff', padding: '10px 20px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Computing...' : 'Compute TDS'}
        </button>
      </div>

      {result && (
        <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e5e7eb)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem' }}>TDS Computation -- FY {result.fy} ({result.regime === 'new' ? 'New Regime' : 'Old Regime'})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 30px' }}>
            {[
              ['Annual Gross Salary', fmtCurrency(result.annualGross)],
              ['Standard Deduction', fmtCurrency(result.standardDeduction)],
              ['Approved Deductions (80C/80D etc.)', fmtCurrency(result.annualGross - result.taxableIncome - result.standardDeduction)],
              ['Taxable Income', fmtCurrency(result.taxableIncome)],
              ['Basic Tax', fmtCurrency(result.basicTax)],
              ['Surcharge', fmtCurrency(result.surcharge)],
              ['Health & Education Cess (4%)', fmtCurrency(result.cess)],
              ['Total Tax Liability (Annual)', fmtCurrency(result.totalTax)],
              ['Monthly TDS to Deduct', fmtCurrency(result.monthlyTds)],
            ].map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--card-border,#f3f4f6)' }}>
                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{label}</span>
                <span style={{ fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)', fontSize: '0.88rem' }}>{value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '14px 18px', background: '#dbeafe', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>Monthly TDS Deduction</span>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#1d4ed8' }}>{fmtCurrency(result.monthlyTds)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reusable monthly report tab ─────────────────────────────────────────────
function MonthlyReportTab({ title, fetchFn, columns }) {
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await fetchFn(month); setData(r.data); }
    catch { setData(null); } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={selectStyle} />
        </div>
        <button onClick={load} disabled={loading} style={{ ...smBtnStyle, background: '#1C47C9', color: '#fff', padding: '10px 20px', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Loading...' : 'Generate Report'}
        </button>
      </div>

      {data && (
        <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--card-border,#e5e7eb)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--theme-text-strong,#0f172a)' }}>
            {title} -- {month} &nbsp;<span style={{ fontSize: '0.78rem', fontWeight: 500, color: '#6b7280' }}>({data.records?.length || 0} employees)</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead><tr style={{ background: 'var(--table-header-bg,#f9fafb)' }}>
              {columns.map(c => <th key={c.key} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>{c.label}</th>)}
            </tr></thead>
            <tbody>
              {(data.records || []).map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i%2===0?'transparent':'var(--table-row-alt,#fafafa)' }}>
                  {columns.map(c => <td key={c.key} style={tdStyle}>{c.fmt ? c.fmt(r[c.key]) : (r[c.key] ?? '--')}</td>)}
                </tr>
              ))}
            </tbody>
            {data.totals && (
              <tfoot><tr style={{ background: '#f0f4ff', fontWeight: 700 }}>
                {columns.map((c, i) => <td key={c.key} style={{ ...tdStyle, fontWeight: 800 }}>{i === 0 ? 'TOTAL' : (c.fmt && data.totals[c.key] !== undefined ? c.fmt(data.totals[c.key]) : '')}</td>)}
              </tr></tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}

function PFTab() {
  return <MonthlyReportTab
    title="PF / EPF Contribution Report"
    fetchFn={payrollComplianceAPI.getPFECR}
    columns={[
      { key: 'name', label: 'Employee' },
      { key: 'uan_number', label: 'UAN' },
      { key: 'pf_wages', label: 'PF Wages', fmt: fmtCurrency },
      { key: 'employee_pf', label: 'Employee EPF (12%)', fmt: fmtCurrency },
      { key: 'employer_eps', label: 'Employer EPS (8.33%)', fmt: fmtCurrency },
      { key: 'employer_epf', label: 'Employer EPF Diff', fmt: fmtCurrency },
      { key: 'total_liability', label: 'Total Liability', fmt: fmtCurrency },
    ]}
  />;
}

function ESICTab() {
  return <MonthlyReportTab
    title="ESIC Contribution Report"
    fetchFn={payrollComplianceAPI.getESICReport}
    columns={[
      { key: 'name', label: 'Employee' },
      { key: 'esic_number', label: 'ESIC No.' },
      { key: 'gross_wages', label: 'Gross Wages', fmt: fmtCurrency },
      { key: 'employee_esic', label: 'Employee ESIC (0.75%)', fmt: fmtCurrency },
      { key: 'employer_esic', label: 'Employer ESIC (3.25%)', fmt: fmtCurrency },
      { key: 'total_esic', label: 'Total ESIC', fmt: fmtCurrency },
    ]}
  />;
}

function PTTab() {
  return <MonthlyReportTab
    title="Professional Tax Deductions"
    fetchFn={payrollComplianceAPI.getPTReport}
    columns={[
      { key: 'name', label: 'Employee' },
      { key: 'state_code', label: 'State' },
      { key: 'gross_salary', label: 'Gross Salary', fmt: fmtCurrency },
      { key: 'pt_deducted', label: 'PT Deducted', fmt: fmtCurrency },
    ]}
  />;
}

// ── Form 24Q ──────────────────────────────────────────────────────────────────
function Form24QTab() {
  const [fy, setFy] = useState(currentFY());
  const [quarter, setQuarter] = useState('Q1');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await payrollComplianceAPI.getForm24Q(fy, quarter); setData(r.data); }
    catch { setData(null); } finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'end', marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>Financial Year</label>
          <select value={fy} onChange={e => setFy(e.target.value)} style={selectStyle}>
            {['2024-25','2023-24'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Quarter</label>
          <select value={quarter} onChange={e => setQuarter(e.target.value)} style={selectStyle}>
            {['Q1','Q2','Q3','Q4'].map(q => <option key={q} value={q}>{q} {q==='Q1'?'(Apr-Jun)':q==='Q2'?'(Jul-Sep)':q==='Q3'?'(Oct-Dec)':'(Jan-Mar)'}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading} style={{ ...smBtnStyle, background: '#1C47C9', color: '#fff', padding: '10px 20px' }}>
          {loading ? 'Loading...' : 'Generate'}
        </button>
      </div>

      {data && (
        <div>
          <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', background: '#dbeafe', borderRadius: 8, padding: '10px 18px', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, color: '#1d4ed8' }}>Total TDS for {data.quarter} FY {data.fy}:</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1d4ed8' }}>{fmtCurrency(data.total_tds)}</span>
          </div>
          <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 12, border: '1px solid var(--card-border,#e5e7eb)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead><tr style={{ background: 'var(--table-header-bg,#f9fafb)' }}>
                {['Employee','PAN','Designation','Month','Gross Salary','TDS Deducted'].map(h =>
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(data.records||[]).map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--card-border,#f3f4f6)', background: i%2===0?'transparent':'var(--table-row-alt,#fafafa)' }}>
                    <td style={tdStyle}>{r.name}</td>
                    <td style={tdStyle}>{r.pan_number || '--'}</td>
                    <td style={tdStyle}>{r.designation || '--'}</td>
                    <td style={tdStyle}>{r.month}</td>
                    <td style={tdStyle}>{fmtCurrency(r.gross_salary)}</td>
                    <td style={tdStyle}><strong>{fmtCurrency(r.tds_deducted)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Compliance Settings ──────────────────────────────────────────────────────
function SettingsTab() {
  const [settings, setSettings] = useState({ pf_applicable: 1, esic_applicable: 1, pt_state: 'MH', default_regime: 'new', pf_wage_ceiling: 15000, esic_wage_ceiling: 21000 });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    payrollComplianceAPI.getSettings().then(r => { if (r.data?.settings) setSettings(r.data.settings); }).catch(()=>{});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await payrollComplianceAPI.saveSettings(settings);
      setMsg('Settings saved successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to save'); }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 560 }}>
      {msg && <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontWeight: 600 }}>{msg}</div>}
      <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e5e7eb)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {[
          { label: 'PF / EPF Applicable', key: 'pf_applicable', type: 'toggle' },
          { label: 'ESIC Applicable', key: 'esic_applicable', type: 'toggle' },
          { label: 'PT State', key: 'pt_state', type: 'select', options: [['MH','Maharashtra'],['KA','Karnataka'],['TN','Tamil Nadu'],['AP','Andhra Pradesh'],['TS','Telangana']] },
          { label: 'Default Tax Regime', key: 'default_regime', type: 'select', options: [['new','New Regime (FY 2024-25)'],['old','Old Regime']] },
          { label: 'PF Wage Ceiling (₹)', key: 'pf_wage_ceiling', type: 'number' },
          { label: 'ESIC Wage Ceiling (₹)', key: 'esic_wage_ceiling', type: 'number' },
        ].map(({ label, key, type, options }) => (
          <div key={key}>
            <label style={labelStyle}>{label}</label>
            {type === 'toggle' ? (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={!!settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked ? 1 : 0 }))} />
                <span style={{ fontSize: '0.88rem', color: 'var(--theme-text-strong,#374151)' }}>{settings[key] ? 'Enabled' : 'Disabled'}</span>
              </label>
            ) : type === 'select' ? (
              <select value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} style={selectStyle}>
                {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            ) : (
              <input type="number" value={settings[key] || ''} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} style={selectStyle} />
            )}
          </div>
        ))}
        <button onClick={save} disabled={saving} style={{ ...smBtnStyle, background: '#1C47C9', color: '#fff', padding: '11px 24px', alignSelf: 'flex-start', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontWeight: 600, fontSize: '0.8rem', color: 'var(--theme-text-muted,#6b7280)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.4px' };
const selectStyle = { padding: '8px 12px', borderRadius: 7, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.88rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)', minWidth: 160 };
const smBtnStyle = { padding: '7px 14px', borderRadius: 7, border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' };
const tdStyle = { padding: '10px 14px', color: 'var(--theme-text-strong,#374151)', verticalAlign: 'middle' };
