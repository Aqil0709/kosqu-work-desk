import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { salarySlipPDFService } from '../../services/salarySlipPDFService';
import offerLetterPDFService from '../../services/offerLetterPDFService';
import { offerLetterAPI } from '../../services/offerLetterAPI';
import './EmployeePayslips.css';

const MONTHS_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const fmtNum = (v) => fmt.format(Number(v || 0));

const STATUS_META = {
  paid:         { label: 'Paid',         color: '#16a34a', bg: 'rgba(22,163,74,0.1)',   border: 'rgba(22,163,74,0.3)'   },
  partial:      { label: 'Partial',      color: '#d97706', bg: 'rgba(217,119,6,0.1)',   border: 'rgba(217,119,6,0.3)'   },
  pending:      { label: 'Pending',      color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.3)'   },
  unpaid:       { label: 'Unpaid',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   border: 'rgba(220,38,38,0.3)'   },
  processing:   { label: 'Processing',   color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  border: 'rgba(124,58,237,0.3)'  },
};

const statusMeta = (status) => STATUS_META[String(status || 'pending').toLowerCase()] || STATUS_META.pending;

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EmployeePayslips = () => {
  const [activeTab, setActiveTab] = useState('payslips'); // 'payslips' | 'my-slips' | 'offer-letter'
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState(null);
  // Generated salary slips from salary_slips table
  const [mySlips, setMySlips] = useState([]);
  const [mySlipsLoading, setMySlipsLoading] = useState(false);
  const [mySlipsLoaded, setMySlipsLoaded] = useState(false);
  const [slipYearFilter, setSlipYearFilter] = useState('');
  const [slipMonthFilter, setSlipMonthFilter] = useState('');
  // Offer letter state
  const [offerLetters, setOfferLetters] = useState([]);
  const [olLoading, setOlLoading] = useState(false);
  const [olError, setOlError] = useState('');
  const [olLoaded, setOlLoaded] = useState(false);
  const [downloadingOl, setDownloadingOl] = useState(false);
  const [attSummary, setAttSummary] = useState(null);

  const loadAttSummary = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/salary/my-attendance-summary`, { headers: authH() });
      if (res.data?.success) setAttSummary(res.data);
    } catch (_) {}
  }, []);

  const loadPayslips = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API_BASE}/api/salary/my-history`, { headers: authH() });
      const history = res.data?.history || res.data?.data || [];
      setRecords(history.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return (b.month_number || b.month_num || 0) - (a.month_number || a.month_num || 0);
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load payslips');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOfferLetters = useCallback(async () => {
    if (olLoading) return;
    try {
      setOlLoading(true);
      setOlError('');
      const res = await offerLetterAPI.getMyOfferLetters();
      setOfferLetters(res.data?.letters || res.data?.data || res.data?.offer_letters || []);
    } catch (err) {
      setOlError(err.response?.data?.message || 'Failed to load offer letter');
    } finally {
      setOlLoading(false);
      setOlLoaded(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMySlips = useCallback(async () => {
    if (mySlipsLoading) return;
    try {
      setMySlipsLoading(true);
      const params = new URLSearchParams();
      if (slipYearFilter) params.set('year', slipYearFilter);
      if (slipMonthFilter) params.set('month', slipMonthFilter);
      const res = await axios.get(`${API_BASE}/api/salary/my-slips?${params}`, { headers: authH() });
      setMySlips(res.data?.slips || []);
    } catch (err) {
      console.error('Failed to load generated slips', err);
    } finally {
      setMySlipsLoading(false);
      setMySlipsLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slipYearFilter, slipMonthFilter]);

  useEffect(() => { loadPayslips(); loadAttSummary(); }, [loadPayslips, loadAttSummary]);

  useEffect(() => {
    if (activeTab === 'my-slips' && !mySlipsLoaded) loadMySlips();
  }, [activeTab, mySlipsLoaded, loadMySlips]);

  useEffect(() => {
    if (activeTab === 'offer-letter' && !olLoaded && !olLoading) {
      loadOfferLetters();
    }
  }, [activeTab, olLoaded, olLoading, loadOfferLetters]);

  const years = [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);
  const filtered = yearFilter === 'all' ? records : records.filter((r) => String(r.year) === yearFilter);

  const totalPaid   = filtered.filter((r) => String(r.payment_status).toLowerCase() === 'paid').length;
  const totalNet    = filtered.reduce((s, r) => s + Number(r.net_salary || 0), 0);
  const totalPaidAmt = filtered.reduce((s, r) => s + Number(r.paid_amount || 0), 0);

  const handleDownloadSlip = async (rec) => {
    setDownloadingId(rec.id);
    try {
      // Fetch the full slip with salary component breakdown
      const res = await axios.get(`${API_BASE}/api/salary/my-slip/${rec.id}`, { headers: authH() });
      const fullRec = res.data?.salary_slip || rec;
      await salarySlipPDFService.downloadFromRecord(fullRec);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to the summary record
      try {
        await salarySlipPDFService.downloadFromRecord(rec);
      } catch (_) {
        alert('Failed to generate salary slip PDF');
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadOL = async (letter) => {
    setDownloadingOl(true);
    try {
      const formData = letter.form_data || {};
      await offerLetterPDFService.downloadOfferLetter(formData);
    } catch (err) {
      console.error('Offer letter download failed:', err);
      alert('Failed to generate offer letter PDF');
    } finally {
      setDownloadingOl(false);
    }
  };

  const tabStyle = (active) => ({
    padding: '10px 22px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
    border: 'none', background: 'transparent',
    color: active ? '#1C47C9' : 'var(--theme-text-muted,#64748b)',
    borderBottom: active ? '2px solid #1C47C9' : '2px solid transparent',
    marginBottom: -2, transition: 'color .15s',
  });

  if (loading && activeTab === 'payslips') {
    return <div className="ep-page"><div className="ep-loading">Loading payslips...</div></div>;
  }

  return (
    <div className="ep-page">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--card-border,#e2e8f0)', marginBottom: 20 }}>
        <button style={tabStyle(activeTab === 'payslips')} onClick={() => setActiveTab('payslips')}>
          Salary History
        </button>
        <button style={tabStyle(activeTab === 'my-slips')} onClick={() => { setActiveTab('my-slips'); setMySlipsLoaded(false); }}>
          My Salary Slips
        </button>
        <button style={tabStyle(activeTab === 'offer-letter')} onClick={() => setActiveTab('offer-letter')}>
          Offer Letter
        </button>
      </div>

      {/* ── Payslips tab ── */}
      {activeTab === 'payslips' && (
        <>
          <div className="ep-header">
            <div>
              <h1>My Payslips</h1>
              <p>Your salary records and payment history</p>
            </div>
            {years.length > 0 && (
              <select className="ep-year-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
                <option value="all">All Years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>

          {error && <div className="ep-error">{error}</div>}

          {!error && records.length > 0 && (
            <div className="ep-summary">
              <div className="ep-stat"><span>Total Records</span><strong>{filtered.length}</strong></div>
              <div className="ep-stat"><span>Fully Paid</span><strong className="green">{totalPaid}</strong></div>
              <div className="ep-stat"><span>Total Net Salary</span><strong>{fmtNum(totalNet)}</strong></div>
              <div className="ep-stat"><span>Total Received</span><strong className="green">{fmtNum(totalPaidAmt)}</strong></div>
            </div>
          )}

          {/* ── Live Current Month Attendance-Based Salary Card ── */}
          {attSummary && (
            <div style={{
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
              border: '1px solid #334155',
              borderRadius: 16,
              padding: '20px 24px',
              marginBottom: 20,
              color: '#f1f5f9',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    📊 {attSummary.month} {attSummary.year} — Estimated Salary
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
                    Based on your attendance this month (updates daily)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                    {fmtNum(attSummary.estimated_net_salary)}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>Estimated Net Salary</div>
                </div>
              </div>

              {/* Attendance grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Present', value: attSummary.present_days, color: '#34d399' },
                  { label: 'Absent', value: attSummary.absent_days, color: '#f87171' },
                  { label: 'Late', value: attSummary.late_days, color: '#fbbf24' },
                  { label: 'Half Day', value: attSummary.half_days, color: '#f97316' },
                  { label: 'Paid Leave', value: attSummary.paid_leave_days, color: '#60a5fa' },
                  { label: 'Unpaid Leave', value: attSummary.unpaid_leave_days, color: '#e879f9' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Deduction breakdown */}
              {attSummary.total_deduction > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#fca5a5', marginBottom: 8 }}>
                    💸 Deduction Breakdown
                  </div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {attSummary.leave_and_absence_deduction > 0 && (
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Absent / Unpaid Leave</span>
                        <div style={{ color: '#f87171', fontWeight: 700 }}>{fmtNum(attSummary.leave_and_absence_deduction)}</div>
                      </div>
                    )}
                    {attSummary.attendance_deductions > 0 && (
                      <div>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Late Deductions (≥4×)</span>
                        <div style={{ color: '#fbbf24', fontWeight: 700 }}>{fmtNum(attSummary.attendance_deductions)}</div>
                      </div>
                    )}
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Total Deduction</span>
                      <div style={{ color: '#f87171', fontWeight: 800 }}>{fmtNum(attSummary.total_deduction)}</div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>Daily Rate</span>
                      <div style={{ color: '#cbd5e1', fontWeight: 700 }}>{fmtNum(attSummary.daily_rate)}/day</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {filtered.length === 0 && !error && (
            <div className="ep-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13ZM8 13H16V15H8V13ZM8 17H16V19H8V17ZM8 9H11V11H8V9Z" fill="var(--card-border,#cbd5e1)" />
              </svg>
              <p>No payslips found for the selected period.</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="ep-table-wrap">
              <table className="ep-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Basic</th>
                    <th>Gross</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Paid</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec) => {
                    const meta = statusMeta(rec.payment_status);
                    const monthLabel = rec.month || (rec.month_number ? MONTHS[rec.month_number] : '—');
                    return (
                      <tr key={rec.id || `${rec.month}-${rec.year}`} onClick={() => setSelected(rec)} className="ep-row">
                        <td><strong>{monthLabel} {rec.year}</strong></td>
                        <td>{fmtNum(rec.basic_salary)}</td>
                        <td>{fmtNum(rec.gross_salary)}</td>
                        <td className="red">{fmtNum(rec.deduction_amount)}</td>
                        <td><strong>{fmtNum(rec.net_salary)}</strong></td>
                        <td className="green">{fmtNum(rec.paid_amount)}</td>
                        <td>{Number(rec.balance_amount || 0) > 0 ? <span className="ep-balance">{fmtNum(rec.balance_amount)}</span> : <span className="ep-zero">""</span>}</td>
                        <td>
                          <span className="ep-badge" style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}>
                            {meta.label}
                          </span>
                        </td>
                        <td>
                          <button
                            className="ep-print-btn"
                            onClick={(e) => { e.stopPropagation(); handleDownloadSlip(rec); }}
                            disabled={downloadingId === rec.id}
                            title="Download Salary Slip PDF"
                          >
                            {downloadingId === rec.id ? (
                              'Generating...'
                            ) : (
                              <>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                  <path d="M5 20H19V18H5V20ZM19 9H15V3H9V9H5L12 16L19 9Z" fill="currentColor"/>
                                </svg>
                                Download
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Slip detail modal */}
          {selected && (
            <div className="ep-overlay" onClick={() => setSelected(null)}>
              <div className="ep-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ep-modal-header">
                  <div>
                    <h2>Salary Slip – {selected.month || MONTHS[selected.month_number]} {selected.year}</h2>
                    <span className="ep-badge" style={{
                      color: statusMeta(selected.payment_status).color,
                      background: statusMeta(selected.payment_status).bg,
                      border: `1px solid ${statusMeta(selected.payment_status).border}`,
                    }}>
                      {statusMeta(selected.payment_status).label}
                    </span>
                  </div>
                  <button className="ep-close-btn" onClick={() => setSelected(null)}>✕</button>
                </div>

                <div className="ep-slip-grid">
                  <div className="ep-slip-row earnings">
                    <div className="ep-slip-section-label">Earnings</div>
                    <div className="ep-slip-item">
                      <span>Basic Salary</span>
                      <strong>{fmtNum(selected.basic_salary)}</strong>
                    </div>
                    <div className="ep-slip-item">
                      <span>Gross Salary</span>
                      <strong>{fmtNum(selected.gross_salary)}</strong>
                    </div>
                  </div>
                  <div className="ep-slip-row deductions">
                    <div className="ep-slip-section-label">Deductions</div>
                    <div className="ep-slip-item">
                      <span>Total Deductions</span>
                      <strong className="red">{fmtNum(selected.deduction_amount)}</strong>
                    </div>
                  </div>
                  <div className="ep-slip-row net">
                    <div className="ep-slip-item total">
                      <span>Net Salary</span>
                      <strong>{fmtNum(selected.net_salary)}</strong>
                    </div>
                    <div className="ep-slip-item">
                      <span>Paid Amount</span>
                      <strong className="green">{fmtNum(selected.paid_amount)}</strong>
                    </div>
                    <div className="ep-slip-item">
                      <span>Balance Due</span>
                      <strong className={Number(selected.balance_amount || 0) > 0 ? 'red' : ''}>{fmtNum(selected.balance_amount)}</strong>
                    </div>
                  </div>
                </div>

                <div className="ep-modal-footer">
                  <button
                    className="ep-print-full"
                    onClick={() => handleDownloadSlip(selected)}
                    disabled={downloadingId === selected.id}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 20H19V18H5V20ZM19 9H15V3H9V9H5L12 16L19 9Z" fill="currentColor"/>
                    </svg>
                    {downloadingId === selected.id ? 'Generating PDF...' : 'Download PDF'}
                  </button>
                  <button className="ep-close-modal" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── My Salary Slips tab (generated on payment) ── */}
      {activeTab === 'my-slips' && (
        <div>
          <div className="ep-header">
            <div>
              <h1>My Salary Slips</h1>
              <p>Salary slips confirmed after payment — available for download</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={slipYearFilter} onChange={e => { setSlipYearFilter(e.target.value); setMySlipsLoaded(false); }}
                style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--card-border,#e2e8f0)', background: 'var(--card-bg,#fff)', color: 'var(--theme-text,#1e293b)', fontSize: '0.875rem' }}>
                <option value="">All Years</option>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={slipMonthFilter} onChange={e => { setSlipMonthFilter(e.target.value); setMySlipsLoaded(false); }}
                style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid var(--card-border,#e2e8f0)', background: 'var(--card-bg,#fff)', color: 'var(--theme-text,#1e293b)', fontSize: '0.875rem' }}>
                <option value="">All Months</option>
                {MONTHS_SHORT.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
            </div>
          </div>

          {mySlipsLoading ? (
            <div className="ep-loading">Loading salary slips...</div>
          ) : mySlips.length === 0 ? (
            <div className="ep-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2ZM13 9V3.5L18.5 9H13Z" fill="var(--card-border,#cbd5e1)" /></svg>
              <p>No confirmed salary slips found</p>
              <p style={{ fontSize: 13 }}>Slips appear here after your salary is marked as paid by HR</p>
            </div>
          ) : (
            <div className="ep-cards">
              {mySlips.map((slip) => (
                <div key={slip.id} className="ep-card">
                  <div className="ep-card-month">{slip.month} {slip.year}</div>
                  <div className="ep-card-amount">{fmtNum(slip.net_salary)}</div>
                  <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--theme-text-muted,#64748b)' }}>
                    Generated: {slip.generated_at ? new Date(slip.generated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                      ✓ Paid
                    </span>
                  </div>
                  <button
                    className="ep-download-btn"
                    disabled={downloadingId === slip.salary_record_id}
                    onClick={async () => {
                      setDownloadingId(slip.salary_record_id);
                      try {
                        const res = await axios.get(`${API_BASE}/api/salary/my-slip/${slip.salary_record_id}`, { headers: authH() });
                        const fullRec = res.data?.salary_slip;
                        if (fullRec) await salarySlipPDFService.downloadFromRecord(fullRec);
                        else throw new Error('Slip not found');
                      } catch (err) {
                        alert('Failed to download slip: ' + (err.message || 'Unknown error'));
                      } finally {
                        setDownloadingId(null);
                      }
                    }}
                  >
                    {downloadingId === slip.salary_record_id ? 'Generating...' : '⬇ Download Slip'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Offer Letter tab ── */}
      {activeTab === 'offer-letter' && (
        <div>
          <div className="ep-header">
            <div>
              <h1>My Offer Letter</h1>
              <p>Your employment offer letter issued by HR</p>
            </div>
          </div>

          {olLoading && <div className="ep-loading">Loading offer letter...</div>}
          {olError && <div className="ep-error">{olError}</div>}

          {!olLoading && !olError && offerLetters.length === 0 && (
            <div className="ep-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6A2 2 0 0 0 4 4V20A2 2 0 0 0 6 22H18A2 2 0 0 0 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM9 13H15V15H9V13ZM9 17H15V19H9V17Z" fill="var(--card-border,#cbd5e1)" />
              </svg>
              <p>No offer letter found. Please contact HR if you believe this is an error.</p>
            </div>
          )}

          {!olLoading && offerLetters.map((letter) => {
            const fd = letter.form_data || {};
            const statusMap = {
              accepted: { label: 'Accepted', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', border: 'rgba(22,163,74,0.3)' },
              rejected: { label: 'Rejected', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.3)' },
              sent:     { label: 'Sent',     color: '#2563eb', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.3)' },
            };
            const sm = statusMap[String(letter.status || '').toLowerCase()] || { label: 'Pending', color: '#d97706', bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.3)' };
            return (
              <div key={letter.id} style={{
                background: 'var(--card-bg,#fff)', border: '1px solid var(--card-border,#e2e8f0)',
                borderRadius: 12, padding: 24, marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                      Offer of Employment – {fd.designation || 'Position'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--theme-text-muted,#64748b)', marginBottom: 4 }}>
                      Issued on: {letter.issue_date ? new Date(letter.issue_date).toLocaleDateString('en-IN') : '—'}
                    </div>
                    {fd.joiningDate && (
                      <div style={{ fontSize: 13, color: 'var(--theme-text-muted,#64748b)' }}>
                        Joining Date: {new Date(fd.joiningDate).toLocaleDateString('en-IN')}
                      </div>
                    )}
                    {fd.ctc && (
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        CTC: <strong>₹{Number(fd.ctc).toLocaleString('en-IN')}/year</strong>
                        {fd.ctc ? ` (₹${Math.round(Number(fd.ctc) / 12).toLocaleString('en-IN')}/month)` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                    <span className="ep-badge" style={{ color: sm.color, background: sm.bg, border: `1px solid ${sm.border}` }}>
                      {sm.label}
                    </span>
                    <button
                      style={{
                        padding: '8px 18px', background: '#1C47C9', color: '#fff', border: 'none',
                        borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: downloadingOl ? 'not-allowed' : 'pointer',
                        opacity: downloadingOl ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
                      }}
                      onClick={() => handleDownloadOL(letter)}
                      disabled={downloadingOl}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                        <path d="M5 20H19V18H5V20ZM19 9H15V3H9V9H5L12 16L19 9Z" fill="currentColor"/>
                      </svg>
                      {downloadingOl ? 'Generating...' : 'Download PDF'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmployeePayslips;

