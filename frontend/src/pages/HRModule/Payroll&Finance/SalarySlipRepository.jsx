import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { salarySlipPDFService } from '../../../services/salarySlipPDFService';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtAmt = (v) => fmt.format(Number(v || 0));

const MONTHS = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' }, { value: '2', label: 'February' }, { value: '3', label: 'March' },
  { value: '4', label: 'April' },   { value: '5', label: 'May' },      { value: '6', label: 'June' },
  { value: '7', label: 'July' },    { value: '8', label: 'August' },   { value: '9', label: 'September' },
  { value: '10', label: 'October' },{ value: '11', label: 'November' },{ value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function SalarySlipRepository() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [regenerating, setRegenerating] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (year) params.set('year', year);
      const res = await axios.get(`${API}/api/salary/slips?${params}`, { headers: authH() });
      setSlips(res.data?.slips || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load salary slips');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const filtered = slips.filter(s =>
    !search || s.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDownload = async (slip) => {
    setDownloading(slip.salary_record_id);
    try {
      const res = await axios.get(`${API}/api/salary/slip/${slip.salary_record_id}`, { headers: authH() });
      const slipData = res.data?.salary_slip;
      if (!slipData) throw new Error('Slip data not found');

      const brandingRes = await axios.get(`${API}/api/branding`, { headers: authH() });
      const branding = brandingRes.data?.branding || {};

      const data = {
        fullName: slip.employee_name,
        monthYear: `${slip.month} ${slip.year}`,
        designation: slipData.position || '',
        paymentMode: 'Bank Transfer',
        earnings: {
          basic: slipData.basic_salary || 0,
          hra: slipData.salary_hra || 0,
          conveyance: slipData.salary_travel_allowance || 0,
          medical: slipData.salary_medical_allowance || 0,
          special: slipData.salary_other_allowance || 0,
        },
        deductions: {
          pf: slipData.epf_fixed_amount || slipData.pf_amount || slipData.salary_pf || 0,
          pt: slipData.professional_tax || slipData.salary_professional_tax || 0,
          tds: slipData.tds_amount || 0,
        },
      };

      const pdf = await salarySlipPDFService.generatePDF(data, branding);
      pdf.save(`SalarySlip_${slip.employee_name?.replace(/\s+/g, '_')}_${slip.month}_${slip.year}.pdf`);
    } catch (err) {
      alert('Failed to generate PDF: ' + (err.message || 'Unknown error'));
    } finally {
      setDownloading(null);
    }
  };

  const handleRegenerate = async (slip) => {
    setRegenerating(slip.salary_record_id);
    try {
      await axios.post(`${API}/api/salary/slips/regenerate/${slip.salary_record_id}`, {}, { headers: authH() });
      await load();
    } catch (err) {
      alert('Failed to regenerate: ' + (err.response?.data?.message || err.message));
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: 'var(--theme-text, #1e293b)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Salary Slip Repository</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--theme-text-muted, #64748b)' }}>
            Auto-generated salary slips — created when salary is marked as paid
          </p>
        </div>
        <button className="btn-refresh" onClick={load} style={{ gap: '6px' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search employee name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1', minWidth: '200px', maxWidth: '320px',
            padding: '8px 12px', borderRadius: '8px',
            border: '1px solid var(--theme-border, #e2e8f0)',
            background: 'var(--theme-bg, #fff)',
            color: 'var(--theme-text, #1e293b)',
            fontSize: '0.875rem',
          }}
        />
        <select value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--theme-border, #e2e8f0)', background: 'var(--theme-bg, #fff)', color: 'var(--theme-text, #1e293b)', fontSize: '0.875rem', cursor: 'pointer' }}>
          {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={year} onChange={e => setYear(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--theme-border, #e2e8f0)', background: 'var(--theme-bg, #fff)', color: 'var(--theme-text, #1e293b)', fontSize: '0.875rem', cursor: 'pointer' }}>
          <option value="">All Years</option>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Slips', value: filtered.length, color: '#5B4FF7' },
          { label: 'Unique Employees', value: new Set(filtered.map(s => s.employee_detail_id)).size, color: '#0ea5e9' },
          { label: 'Total Net Paid', value: fmtAmt(filtered.reduce((a, s) => a + Number(s.net_salary || 0), 0)), color: '#10b981' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--theme-card-bg, #fff)',
            border: '1px solid var(--theme-border, #e2e8f0)',
            borderRadius: '12px', padding: '14px 20px',
            minWidth: '140px', flex: '1',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted, #64748b)', marginTop: '2px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', marginBottom: '16px', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: 'var(--theme-card-bg, #fff)', borderRadius: '12px', border: '1px solid var(--theme-border, #e2e8f0)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text-muted, #64748b)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
            Loading salary slips...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--theme-text-muted, #64748b)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📄</div>
            <div style={{ fontWeight: 600 }}>No salary slips found</div>
            <div style={{ fontSize: '0.875rem', marginTop: '4px' }}>Slips are auto-generated when salary is marked as paid</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: 'var(--theme-bg-muted, #f8fafc)', borderBottom: '2px solid var(--theme-border, #e2e8f0)' }}>
                  {['Employee', 'Month', 'Year', 'Net Salary', 'Status', 'Generated On', 'Generated By', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.8rem', color: 'var(--theme-text-muted, #64748b)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((slip, i) => (
                  <tr key={slip.id} style={{ borderBottom: '1px solid var(--theme-border, #e2e8f0)', background: i % 2 === 1 ? 'var(--theme-bg-muted, #f8fafc)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{slip.employee_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--theme-text-muted, #64748b)' }}>{slip.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{slip.month}</td>
                    <td style={{ padding: '12px 16px' }}>{slip.year}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{fmtAmt(slip.net_salary)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                        background: slip.payment_status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: slip.payment_status === 'paid' ? '#059669' : '#d97706',
                      }}>
                        {slip.payment_status === 'paid' ? 'Paid' : slip.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--theme-text-muted, #64748b)' }}>
                      {slip.generated_at ? new Date(slip.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--theme-text-muted, #64748b)' }}>
                      {slip.generated_by_name || 'System'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
                        <button
                          className="btn-primary"
                          style={{ minHeight: '32px', padding: '0 12px', fontSize: '0.8rem' }}
                          onClick={() => handleDownload(slip)}
                          disabled={downloading === slip.salary_record_id}
                        >
                          {downloading === slip.salary_record_id ? '⏳' : '⬇'} PDF
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ minHeight: '32px', padding: '0 10px', fontSize: '0.8rem' }}
                          onClick={() => handleRegenerate(slip)}
                          disabled={regenerating === slip.salary_record_id}
                        >
                          {regenerating === slip.salary_record_id ? '⏳' : '↻'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
