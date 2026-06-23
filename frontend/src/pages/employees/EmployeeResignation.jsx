import React, { useState, useEffect, useRef } from 'react';
import { resignationAPI } from '../../services/resignationAPI';

const STATUS_CONFIG = {
    pending:      { label: 'Pending',      color: '#b45309', bg: '#fef3c7' },
    under_review: { label: 'Under Review', color: '#1d4ed8', bg: '#dbeafe' },
    approved:     { label: 'Approved',     color: '#15803d', bg: '#dcfce7' },
    rejected:     { label: 'Rejected',     color: '#b91c1c', bg: '#fee2e2' },
    withdrawn:    { label: 'Withdrawn',    color: '#6b7280', bg: '#f3f4f6' },
};

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    return (
        <span style={{ color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
            {cfg.label}
        </span>
    );
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';

const EmployeeResignation = () => {
    const [myRequest, setMyRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [form, setForm] = useState({
        resignation_date: '',
        reason: '',
        remarks: '',
    });
    const [attachment, setAttachment] = useState(null);
    const fileRef = useRef(null);

    useEffect(() => { fetchMyRequest(); }, []);

    const fetchMyRequest = async () => {
        setLoading(true);
        try {
            const res = await resignationAPI.getMyRequests();
            const requests = res.data?.data || [];
            setMyRequest(requests[0] || null);
        } catch (_) {
            setMyRequest(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!form.resignation_date || !form.reason.trim()) {
            setError('Resignation date and reason are required.');
            return;
        }
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('resignation_date', form.resignation_date);
            fd.append('reason', form.reason.trim());
            if (form.remarks.trim()) fd.append('remarks', form.remarks.trim());
            if (attachment) fd.append('attachment', attachment);

            const res = await resignationAPI.submitRequest(fd);
            setSuccess(res.data?.message || 'Resignation submitted successfully.');
            setShowForm(false);
            setForm({ resignation_date: '', reason: '', remarks: '' });
            setAttachment(null);
            await fetchMyRequest();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit resignation.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleWithdraw = async () => {
        if (!myRequest || !window.confirm('Are you sure you want to withdraw your resignation request?')) return;
        setWithdrawing(true);
        setError('');
        try {
            await resignationAPI.withdrawRequest(myRequest.id);
            setSuccess('Resignation request withdrawn.');
            await fetchMyRequest();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to withdraw request.');
        } finally {
            setWithdrawing(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                <div style={{ width: 36, height: 36, border: '3px solid var(--theme-border,#e2e8f0)', borderTop: '3px solid #4f46e5', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '28px 24px', maxWidth: 760, margin: '0 auto', fontFamily: 'Inter,system-ui,sans-serif' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: 'var(--theme-text-strong,#0f172a)' }}>My Resignation</h2>
            <p style={{ margin: '0 0 24px', color: 'var(--theme-text-muted,#64748b)', fontSize: 13 }}>Submit and track your resignation request</p>

            {error && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>
            )}
            {success && (
                <div style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{success}</div>
            )}

            {/* Active Request Card */}
            {myRequest ? (
                <div style={{ background: 'var(--theme-surface,#fff)', border: '1px solid var(--theme-border,#e2e8f0)', borderRadius: 14, padding: '22px 24px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
                        <div>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--theme-text-muted,#64748b)' }}>Reference</p>
                            <p style={{ margin: '3px 0 0', fontWeight: 800, fontSize: 16, color: 'var(--theme-text-strong,#0f172a)' }}>{myRequest.ref_number}</p>
                        </div>
                        <StatusBadge status={myRequest.status} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 18 }}>
                        {[
                            { label: 'Resignation Date', value: fmtDate(myRequest.resignation_date || myRequest.requested_last_day) },
                            { label: 'Notice Period', value: myRequest.notice_period_days ? `${myRequest.notice_period_days} days` : '--' },
                            { label: 'Last Working Day', value: fmtDate(myRequest.revised_last_working_date || myRequest.original_last_working_date) },
                            { label: 'Submitted On', value: fmtDate(myRequest.created_at) },
                        ].map(({ label, value }) => (
                            <div key={label}>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--theme-text-muted,#64748b)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</p>
                                <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)', fontSize: 14 }}>{value}</p>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 600, color: 'var(--theme-text-muted,#64748b)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Reason</p>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--theme-text,#334155)', lineHeight: 1.6 }}>{myRequest.reason}</p>
                    </div>

                    {myRequest.remarks && (
                        <div style={{ marginBottom: 16 }}>
                            <p style={{ margin: '0 0 5px', fontSize: 12, fontWeight: 600, color: 'var(--theme-text-muted,#64748b)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Additional Remarks</p>
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--theme-text,#334155)' }}>{myRequest.remarks}</p>
                        </div>
                    )}

                    {myRequest.rejection_reason && (
                        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>Rejection Reason</p>
                            <p style={{ margin: 0, fontSize: 13, color: '#7f1d1d' }}>{myRequest.rejection_reason}</p>
                        </div>
                    )}

                    {myRequest.override_reason && (
                        <div style={{ background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>LWD Override Note</p>
                            <p style={{ margin: 0, fontSize: 13, color: '#1e3a8a' }}>{myRequest.override_reason}</p>
                        </div>
                    )}

                    {myRequest.hr_note && (
                        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
                            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#15803d' }}>HR Note</p>
                            <p style={{ margin: 0, fontSize: 13, color: '#14532d' }}>{myRequest.hr_note}</p>
                        </div>
                    )}

                    {myRequest.status === 'pending' && (
                        <button
                            onClick={handleWithdraw}
                            disabled={withdrawing}
                            style={{ padding: '9px 20px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, opacity: withdrawing ? 0.7 : 1 }}
                        >
                            {withdrawing ? 'Withdrawing...' : '↩ Withdraw Request'}
                        </button>
                    )}
                </div>
            ) : (
                !showForm && (
                    <div style={{ background: 'var(--theme-surface,#fff)', border: '2px dashed var(--theme-border,#e2e8f0)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                        <h3 style={{ margin: '0 0 8px', color: 'var(--theme-text-strong,#0f172a)' }}>No Resignation Request</h3>
                        <p style={{ margin: '0 0 20px', color: 'var(--theme-text-muted,#64748b)', fontSize: 14 }}>You haven't submitted a resignation request yet.</p>
                        <button
                            onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
                            style={{ padding: '11px 28px', background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                        >
                            Submit Resignation
                        </button>
                    </div>
                )
            )}

            {/* Submission Form */}
            {showForm && (
                <div style={{ background: 'var(--theme-surface,#fff)', border: '1px solid var(--theme-border,#e2e8f0)', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--theme-text-strong,#0f172a)' }}>Submit Resignation</h3>
                    <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--theme-text-muted,#64748b)' }}>Your Last Working Date will be automatically calculated from your notice period.</p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 18 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--theme-text,#334155)', marginBottom: 6 }}>
                                Resignation Date <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <input
                                type="date"
                                required
                                min={new Date().toISOString().split('T')[0]}
                                value={form.resignation_date}
                                onChange={e => setForm(f => ({ ...f, resignation_date: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--theme-border,#cbd5e1)', boxSizing: 'border-box', fontSize: 14, background: 'var(--theme-bg,#f8fafc)', color: 'var(--theme-text,#334155)' }}
                            />
                            <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--theme-text-muted,#64748b)' }}>
                                Your last working day will be automatically calculated based on your notice period.
                            </p>
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--theme-text,#334155)', marginBottom: 6 }}>
                                Reason for Resignation <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                required
                                rows={4}
                                placeholder="Please provide your reason for resignation..."
                                value={form.reason}
                                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--theme-border,#cbd5e1)', boxSizing: 'border-box', fontSize: 14, resize: 'vertical', background: 'var(--theme-bg,#f8fafc)', color: 'var(--theme-text,#334155)' }}
                            />
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--theme-text,#334155)', marginBottom: 6 }}>
                                Additional Remarks <span style={{ color: 'var(--theme-text-muted,#94a3b8)', fontWeight: 400 }}>(optional)</span>
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Any additional comments or notes..."
                                value={form.remarks}
                                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--theme-border,#cbd5e1)', boxSizing: 'border-box', fontSize: 14, resize: 'vertical', background: 'var(--theme-bg,#f8fafc)', color: 'var(--theme-text,#334155)' }}
                            />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--theme-text,#334155)', marginBottom: 6 }}>
                                Attachment <span style={{ color: 'var(--theme-text-muted,#94a3b8)', fontWeight: 400 }}>(optional -- PDF, JPG, PNG up to 10MB)</span>
                            </label>
                            <div
                                onClick={() => fileRef.current?.click()}
                                style={{ border: '2px dashed var(--theme-border,#cbd5e1)', borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'var(--theme-bg,#f8fafc)' }}
                            >
                                {attachment ? (
                                    <p style={{ margin: 0, fontSize: 13, color: '#4f46e5', fontWeight: 600 }}>📎 {attachment.name}</p>
                                ) : (
                                    <p style={{ margin: 0, fontSize: 13, color: 'var(--theme-text-muted,#64748b)' }}>Click to upload a file</p>
                                )}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    style={{ display: 'none' }}
                                    onChange={e => setAttachment(e.target.files[0] || null)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setError(''); }}
                                style={{ padding: '9px 20px', background: 'var(--theme-bg,#f1f5f9)', color: 'var(--theme-text,#475569)', border: '1px solid var(--theme-border,#cbd5e1)', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                style={{ padding: '9px 24px', background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, opacity: submitting ? 0.7 : 1 }}
                            >
                                {submitting ? 'Submitting...' : 'Submit Resignation'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {myRequest && !showForm && ['rejected', 'withdrawn'].includes(myRequest.status) && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <button
                        onClick={() => { setShowForm(true); setError(''); setSuccess(''); }}
                        style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#4f46e5,#3b82f6)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14 }}
                    >
                        Submit New Resignation
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmployeeResignation;
