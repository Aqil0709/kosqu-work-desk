import React, { useState, useEffect } from 'react';
import { payrollComplianceAPI } from '../../services/payrollComplianceAPI';

const currentFY = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
};

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const FIELDS = [
  { key: 'sec_80c', label: 'Section 80C', desc: 'PPF, ELSS, LIC, NSC, Principal repayment, etc.', max: 150000 },
  { key: 'sec_80d', label: 'Section 80D', desc: 'Health insurance premium (self, family, parents)', max: 50000 },
  { key: 'sec_80e', label: 'Section 80E', desc: 'Education loan interest (no limit)', max: null },
  { key: 'sec_80g', label: 'Section 80G', desc: 'Donations to charitable institutions', max: null },
  { key: 'sec_80tta', label: 'Section 80TTA/TTB', desc: 'Interest on savings bank account (max ₹10,000)', max: 10000 },
  { key: 'hra_claimed', label: 'HRA Exemption', desc: 'House Rent Allowance exemption (if applicable)', max: null },
  { key: 'lta_claimed', label: 'LTA Exemption', desc: 'Leave Travel Allowance (if applicable)', max: null },
  { key: 'other_deductions', label: 'Other Deductions', desc: 'Any other eligible deductions', max: null },
];

export default function EmployeeDeclaration() {
  const [fy, setFy] = useState(currentFY());
  const [form, setForm] = useState({});
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await payrollComplianceAPI.getMyDeclaration(fy);
      const d = r.data?.declaration;
      setExisting(d);
      const init = {};
      FIELDS.forEach(f => { init[f.key] = d ? Number(d[f.key] || 0) : 0; });
      setForm(init);
    } catch { setForm({}); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [fy]);

  const total = FIELDS.reduce((a, f) => a + Number(form[f.key] || 0), 0);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await payrollComplianceAPI.saveMyDeclaration({ financial_year: fy, ...form });
      setMsg({ type: 'success', text: 'Investment declaration submitted successfully! HR will review and approve.' });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Submission failed' });
    }
    setSaving(false);
  };

  const STATUS_COLOR = { draft: '#6b7280', submitted: '#1d4ed8', approved: '#15803d', rejected: '#b91c1c' };
  const STATUS_BG = { draft: '#f3f4f6', submitted: '#dbeafe', approved: '#dcfce7', rejected: '#fee2e2' };

  return (
    <div style={{ padding: 24, fontFamily: '"Inter",system-ui,sans-serif', maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--theme-text-strong,#0f172a)' }}>Investment Declaration (Form 12BB)</h2>
        <p style={{ margin: '4px 0 0', color: 'var(--theme-text-muted,#6b7280)', fontSize: '0.86rem' }}>
          Declare your tax-saving investments for TDS computation. Submit before the deadline.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <label style={{ fontWeight: 600, fontSize: '0.82rem', color: '#6b7280' }}>Financial Year:</label>
        <select value={fy} onChange={e => setFy(e.target.value)} style={inputStyle}>
          {['2024-25','2023-24','2022-23'].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        {existing && (
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: STATUS_COLOR[existing.status], background: STATUS_BG[existing.status], padding: '4px 10px', borderRadius: 5 }}>
            {existing.status.toUpperCase()}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading...</div>
      ) : (
        <>
          {existing?.status === 'rejected' && existing.remarks && (
            <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.88rem' }}>
              <strong>Rejected:</strong> {existing.remarks}
            </div>
          )}
          {existing?.status === 'approved' && (
            <div style={{ background: '#dcfce7', color: '#15803d', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.88rem' }}>
              ✓ Your declaration for FY {fy} has been approved and is being used for TDS computation.
            </div>
          )}

          <div style={{ background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e5e7eb)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
            {FIELDS.map((field, i) => (
              <div key={field.key} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: 16, alignItems: 'center',
                padding: '16px 20px',
                borderBottom: i < FIELDS.length - 1 ? '1px solid var(--card-border,#f3f4f6)' : 'none',
                background: i % 2 === 0 ? 'transparent' : 'var(--table-row-alt,rgba(0,0,0,0.03))',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--theme-text-strong,#0f172a)', marginBottom: 2 }}>
                    {field.label}
                    {field.max && <span style={{ fontSize: '0.76rem', fontWeight: 500, color: '#6b7280', marginLeft: 8 }}>(Max: {fmtCurrency(field.max)})</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{field.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>₹</span>
                  <input
                    type="number"
                    min={0}
                    max={field.max || undefined}
                    value={form[field.key] || ''}
                    onChange={e => setForm(f => ({ ...f, [field.key]: Math.max(0, Number(e.target.value)) }))}
                    disabled={existing?.status === 'approved'}
                    style={{ ...inputStyle, width: 140, textAlign: 'right' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total Summary */}
          <div style={{ background: 'var(--highlight-bg,#dbeafe)', borderRadius: 10, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--highlight-text,#1e40af)', fontSize: '0.9rem' }}>Total Declared Deductions</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--highlight-text-muted,#3b82f6)', marginTop: 2 }}>
                This will be considered for TDS computation after HR approval
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#1d4ed8' }}>{fmtCurrency(total)}</div>
          </div>

          {msg && (
            <div style={{ background: msg.type === 'success' ? '#dcfce7' : '#fee2e2', color: msg.type === 'success' ? '#15803d' : '#b91c1c', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.88rem', fontWeight: 600 }}>
              {msg.text}
            </div>
          )}

          {existing?.status !== 'approved' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{ padding: '11px 28px', background: '#1C47C9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Submitting...' : existing ? 'Update & Resubmit' : 'Submit Declaration'}
              </button>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af', alignSelf: 'center' }}>
                You can update your declaration until HR approves it.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle = { padding: '8px 12px', borderRadius: 7, border: '1px solid var(--card-border,#d1d5db)', fontSize: '0.88rem', background: 'var(--input-bg,#fff)', color: 'var(--theme-text-strong,#111)' };
