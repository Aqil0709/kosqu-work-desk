import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTableControls } from '../../../hooks/useTableControls';
import '../../../styles/tableControls.css';
import './SalaryManagement.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const SALARY_SEARCH_FIELDS = ['first_name', 'last_name', 'department', 'position', 'payment_status', 'employment_category'];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = [2023, 2024, 2025, 2026];

const fmt = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.round(amount || 0));

const SalaryManagement = () => {
    const [salaries, setSalaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Filters
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [departments, setDepartments] = useState([]);

    // Totals
    const [totals, setTotals] = useState({ total_net: 0, total_paid: 0, total_balance: 0 });

    // Modals
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSalaryDetailsModalOpen, setIsSalaryDetailsModalOpen] = useState(false);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [selectedEmployeeData, setSelectedEmployeeData] = useState(null);
    const [selectedAttendanceData, setSelectedAttendanceData] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    const [paymentForm, setPaymentForm] = useState({
        amount: '', payment_method: 'bank_transfer', transaction_id: '', notes: ''
    });

    // Spending graph
    const [showSpendGraph, setShowSpendGraph] = useState(true);
    const [spendGraphData, setSpendGraphData] = useState([]);
    const [spendGraphLoading, setSpendGraphLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const token = localStorage.getItem('token');
    const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    // ── Data loading ──────────────────────────────────────────────────────────

    const loadSalaries = useCallback(async () => {
        try {
            setLoading(true);
            const params = { month: selectedMonth, year: selectedYear };
            if (categoryFilter) params.category = categoryFilter;
            if (departmentFilter) params.department = departmentFilter;

            const res = await axios.get(`${API_URL}/api/salary/records`, { params, headers: authHeaders });
            if (res.data.success) {
                const records = res.data.salaries || [];
                setSalaries(records);

                // Extract unique departments for the filter dropdown
                const depts = [...new Set(records.map(r => r.department).filter(Boolean))].sort();
                setDepartments(depts);

                const t = records.reduce((acc, r) => {
                    acc.total_net += Number(r.net_salary || 0);
                    acc.total_paid += Number(r.paid_amount || 0);
                    acc.total_balance += Number(r.balance_amount || 0);
                    return acc;
                }, { total_net: 0, total_paid: 0, total_balance: 0 });
                setTotals(t);
                setCurrentPage(1);
            } else {
                setSalaries([]);
                setTotals({ total_net: 0, total_paid: 0, total_balance: 0 });
            }
        } catch (err) {
            console.error('Error loading salaries:', err);
            setSalaries([]);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, categoryFilter, departmentFilter, authHeaders]);

    useEffect(() => { loadSalaries(); }, [loadSalaries]);

    // Spending graph
    useEffect(() => {
        if (!showSpendGraph) return;
        const load = async () => {
            try {
                setSpendGraphLoading(true);
                const params = {};
                if (categoryFilter) params.category = categoryFilter;
                const res = await axios.get(`${API_URL}/api/salary/graph`, { headers: authHeaders, params });
                setSpendGraphData((res.data?.data || []).map(d => ({
                    label: `${d.month_name ? d.month_name.substring(0, 3) : String(d.month).padStart(2, '0')} ${d.year}`,
                    'Net Salary': Number(d.total_net),
                    'Gross Salary': Number(d.total_gross),
                })));
            } catch (_) {
                setSpendGraphData([]);
            } finally {
                setSpendGraphLoading(false);
            }
        };
        load();
    }, [showSpendGraph, categoryFilter, authHeaders]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleGenerateAll = async () => {
        if (!window.confirm(`Generate salaries for ${MONTHS[selectedMonth - 1]} ${selectedYear}?`)) return;
        try {
            setGenerating(true);
            const res = await axios.post(`${API_URL}/api/salary/generate-all`,
                { month: selectedMonth, year: selectedYear },
                { headers: authHeaders }
            );
            if (res.data.success) {
                alert(res.data.message);
                loadSalaries();
            } else {
                alert(res.data.message || 'Failed to generate salaries');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to generate salaries');
        } finally {
            setGenerating(false);
        }
    };

    const openPayModal = (salary) => {
        const due = Math.max(0, Math.round((salary.balance_amount || salary.net_salary - salary.paid_amount) || 0));
        setSelectedSalary(salary);
        setPaymentForm({ amount: String(due), payment_method: 'bank_transfer', transaction_id: '', notes: '' });
        setIsPaymentModalOpen(true);
    };

    const handleRecordPayment = async (e) => {
        e.preventDefault();
        if (!selectedSalary) return;
        const amount = Math.round(parseFloat(paymentForm.amount));
        const due = Math.round(selectedSalary.balance_amount || 0);
        if (!amount || amount <= 0) { alert('Enter a valid amount'); return; }
        if (amount > due) { alert(`Amount cannot exceed due amount of ${fmt(due)}`); return; }
        try {
            setPaymentSubmitting(true);
            const res = await axios.post(
                `${API_URL}/api/salary/payment/${selectedSalary.id}`,
                { amount, payment_method: paymentForm.payment_method, transaction_id: paymentForm.transaction_id, notes: paymentForm.notes },
                { headers: authHeaders }
            );
            if (res.data.success) {
                alert(`Payment of ${fmt(amount)} recorded! Status: ${(res.data.new_status || 'updated').toUpperCase()}`);
                setIsPaymentModalOpen(false);
                setIsSalaryDetailsModalOpen(false);
                await loadSalaries();
            } else {
                alert(res.data.message || 'Payment failed');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setPaymentSubmitting(false);
        }
    };

    const handleMarkPaid = async (salary) => {
        if (!window.confirm(`Mark ${salary.first_name} ${salary.last_name}'s salary as fully PAID?`)) return;
        try {
            const res = await axios.post(`${API_URL}/api/salary/mark-paid/${salary.id}`, {}, { headers: authHeaders });
            if (res.data.success) { alert('Marked as paid!'); await loadSalaries(); }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed');
        }
    };

    const handleInlineEdit = (salary) => {
        const newAmt = prompt('Edit Net Salary:', salary.net_salary);
        if (!newAmt || isNaN(newAmt)) return;
        if (!window.confirm(`Change net salary to ${fmt(parseFloat(newAmt))}? (This does NOT record a payment)`)) return;
        axios.put(`${API_URL}/api/salary/update/${salary.id}`,
            { amount: parseFloat(newAmt), reason: 'Manual admin adjustment' },
            { headers: authHeaders }
        ).then(res => { if (res.data.success) { alert('Updated!'); loadSalaries(); } })
         .catch(err => alert(err.response?.data?.message || 'Failed'));
    };

    const loadAttendanceDetails = async (employeeId) => {
        try {
            setLoadingAttendance(true);
            const res = await axios.get(`${API_URL}/api/salary/calculation/${employeeId}`,
                { params: { month: selectedMonth, year: selectedYear }, headers: authHeaders }
            );
            if (res.data.success) { setSelectedAttendanceData(res.data); setIsAttendanceModalOpen(true); }
        } catch (err) {
            alert('Could not load attendance details');
        } finally {
            setLoadingAttendance(false);
        }
    };

    const loadSalaryHistory = async (employeeId) => {
        try {
            setLoadingDetails(true);
            const res = await axios.get(`${API_URL}/api/salary/history/${employeeId}`, { headers: authHeaders });
            if (res.data.success) { setSelectedEmployeeData(res.data); setIsSalaryDetailsModalOpen(true); }
        } catch (err) {
            alert('Could not load salary history');
        } finally {
            setLoadingDetails(false);
        }
    };

    // ── Table controls ────────────────────────────────────────────────────────

    const filteredSalaries = useMemo(() => {
        return statusFilter ? salaries.filter(s => s.payment_status === statusFilter) : salaries;
    }, [salaries, statusFilter]);

    const { controlledRows, searchTerm, setSearchTerm, requestSort, sortLabel } =
        useTableControls(filteredSalaries, SALARY_SEARCH_FIELDS, { key: 'first_name', accessor: 'first_name', direction: 'asc' });

    const totalPages = Math.ceil(controlledRows.length / itemsPerPage);
    const pageSalaries = controlledRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusBadge = (status) => {
        const cfg = { paid: ['#dcfce7', '#15803d', 'PAID'], pending: ['#fef9c3', '#92400e', 'PENDING'], partial: ['#fff7ed', '#c2410c', 'PARTIAL'] };
        const [bg, color, label] = cfg[status] || cfg.pending;
        return <span style={{ background: bg, color, padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>{label}</span>;
    };

    const getCategoryBadge = (cat) => {
        const cfg = { employee: '#dbeafe', intern: '#fef3c7', consultant: '#f3e8ff' };
        return <span style={{ background: cfg[cat] || 'var(--theme-bg-muted,#f1f5f9)', padding: '1px 8px', borderRadius: 10, fontSize: 11, textTransform: 'capitalize' }}>{cat || 'employee'}</span>;
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="salary-management">
            <div className="salary-header">
                <h2>Salary Management</h2>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-generate-small" onClick={handleGenerateAll} disabled={generating}>
                        {generating ? 'Generating...' : 'Generate Salaries'}
                    </button>
                    <button className="btn-generate-small" style={{ background: '#7c3aed' }} onClick={() => setShowSpendGraph(g => !g)}>
                        {showSpendGraph ? 'Hide Graph' : '📊 Spending Graph'}
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card">
                    <div className="summary-label">Total Net Salary</div>
                    <div className="summary-value net">{fmt(totals.total_net)}</div>
                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#6b7280)', marginTop: 4 }}>{salaries.length} records</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Total Paid</div>
                    <div className="summary-value paid">{fmt(totals.total_paid)}</div>
                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#6b7280)', marginTop: 4 }}>{salaries.filter(s => s.payment_status === 'paid').length} fully paid</div>
                </div>
                <div className="summary-card">
                    <div className="summary-label">Pending Balance</div>
                    <div className="summary-value balance">{fmt(totals.total_balance)}</div>
                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#6b7280)', marginTop: 4 }}>{salaries.filter(s => s.payment_status !== 'paid').length} unpaid</div>
                </div>
            </div>

            {/* Spending Graph */}
            {showSpendGraph && (
                <div style={{ background: 'var(--card-bg,#fff)', borderRadius: 10, padding: 24, marginBottom: 20, boxShadow: '0 1px 6px #0001' }}>
                    <h3 style={{ marginBottom: 16, fontSize: 15, fontWeight: 700 }}>
                        Salary Spend -- Last 12 Months{categoryFilter ? ` (${categoryFilter}s)` : ''}
                    </h3>
                    {spendGraphLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>Loading graph...</div>
                    ) : spendGraphData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--theme-text-muted,#6b7280)' }}>No data available</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={spendGraphData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} />
                                <Tooltip formatter={v => `₹${Number(v).toLocaleString('en-IN')}`} />
                                <Legend />
                                <Bar dataKey="Gross Salary" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Net Salary" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}

            <div className="salary-table-container">
                {/* Filters */}
                <div className="filters-card">
                    <div className="filters-row" style={{ flexWrap: 'wrap', gap: 12 }}>
                        <div className="filter-group">
                            <label>Month / Year</label>
                            <div className="month-year-select">
                                <select value={selectedMonth} onChange={e => { setSelectedMonth(+e.target.value); setCurrentPage(1); }}>
                                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                                <select value={selectedYear} onChange={e => { setSelectedYear(+e.target.value); setCurrentPage(1); }}>
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="filter-group">
                            <label>Category</label>
                            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
                                <option value="">All Categories</option>
                                <option value="employee">Employees</option>
                                <option value="intern">Interns</option>
                                <option value="consultant">Consultants</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Department</label>
                            <select value={departmentFilter} onChange={e => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}>
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Payment Status</label>
                            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                                <option value="">All Status</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="partial">Partial</option>
                            </select>
                        </div>

                        <div className="filter-group">
                            <label>Search</label>
                            <input
                                type="search"
                                className="table-search-input"
                                placeholder="Name, dept, position..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    {loading ? (
                        <div className="loading">Loading salaries...</div>
                    ) : controlledRows.length === 0 ? (
                        <div className="no-data">
                            <p>No records for {MONTHS[selectedMonth - 1]} {selectedYear}</p>
                            <button className="btn-generate-small" onClick={handleGenerateAll} disabled={generating}>
                                {generating ? 'Generating...' : 'Generate Now'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <table className="salary-table">
                                <thead>
                                    <tr>
                                        <th className="sortable-th" onClick={() => requestSort('first_name', 'first_name')}>Employee{sortLabel('first_name')}</th>
                                        <th className="sortable-th" onClick={() => requestSort('department', 'department')}>Department{sortLabel('department')}</th>
                                        <th>Category</th>
                                        <th className="sortable-th" onClick={() => requestSort('basic_salary', 'basic_salary')}>Basic Salary{sortLabel('basic_salary')}</th>
                                        <th className="sortable-th" onClick={() => requestSort('net_salary', 'net_salary')}>Net Salary{sortLabel('net_salary')}</th>
                                        <th className="sortable-th" onClick={() => requestSort('paid_amount', 'paid_amount')}>Paid{sortLabel('paid_amount')}</th>
                                        <th>Balance</th>
                                        <th className="sortable-th" onClick={() => requestSort('payment_status', 'payment_status')}>Status{sortLabel('payment_status')}</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageSalaries.map(salary => {
                                        const balance = Math.round(salary.balance_amount || Math.max(0, salary.net_salary - salary.paid_amount));
                                        const isPaid = salary.payment_status === 'paid';
                                        return (
                                            <tr key={salary.id}>
                                                <td>
                                                    <div
                                                        className="employee-name clickable"
                                                        style={{ cursor: 'pointer', color: '#2563eb', fontWeight: 600 }}
                                                        onClick={() => loadAttendanceDetails(salary.employee_id)}
                                                        title="Click for salary breakdown"
                                                    >
                                                        {salary.first_name} {salary.last_name}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--theme-text-muted,#6b7280)' }}>ID: {salary.employee_id}</div>
                                                </td>
                                                <td>{salary.department || salary.position || '--'}</td>
                                                <td>{getCategoryBadge(salary.employment_category)}</td>
                                                <td>{fmt(salary.basic_salary)}</td>
                                                <td>
                                                    <span
                                                        title="Click to edit"
                                                        style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                                                        onClick={() => handleInlineEdit(salary)}
                                                    >
                                                        {fmt(salary.net_salary)}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#15803d', fontWeight: 600 }}>{fmt(salary.paid_amount)}</td>
                                                <td style={{ color: balance > 0 ? '#dc2626' : '#15803d', fontWeight: 600 }}>{fmt(balance)}</td>
                                                <td>{getStatusBadge(salary.payment_status)}</td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {!isPaid && (
                                                            <button
                                                                className="btn-pay"
                                                                onClick={() => openPayModal(salary)}
                                                                title="Record payment"
                                                            >
                                                                Pay {fmt(balance)}
                                                            </button>
                                                        )}
                                                        {!isPaid && balance <= 0 && (
                                                            <button className="btn-pay" style={{ background: '#15803d' }} onClick={() => handleMarkPaid(salary)}>
                                                                Mark Paid
                                                            </button>
                                                        )}
                                                        <button
                                                            className="btn-history"
                                                            onClick={() => loadSalaryHistory(salary.employee_id)}
                                                            title="Salary History"
                                                        >
                                                            History
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button className="pagination-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(n => Math.abs(n - currentPage) <= 2)
                                        .map(n => (
                                            <button key={n} className={`pagination-number ${n === currentPage ? 'active' : ''}`} onClick={() => setCurrentPage(n)}>{n}</button>
                                        ))}
                                    <button className="pagination-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Payment Modal ── */}
            {isPaymentModalOpen && selectedSalary && (
                <div className="modal-overlay">
                    <div className="modal-content payment-modal">
                        <div className="modal-header">
                            <h3>Pay Salary -- {selectedSalary.first_name} {selectedSalary.last_name}</h3>
                            <button className="close-btn" onClick={() => setIsPaymentModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleRecordPayment}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16, padding: '12px 0', borderBottom: '1px solid var(--card-border,#e2e8f0)' }}>
                                <div><div style={{ fontSize: 11, color: 'var(--theme-text-muted,#6b7280)', fontWeight: 600 }}>NET SALARY</div><div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(selectedSalary.net_salary)}</div></div>
                                <div><div style={{ fontSize: 11, color: 'var(--theme-text-muted,#6b7280)', fontWeight: 600 }}>PAID</div><div style={{ fontSize: 18, fontWeight: 700, color: '#15803d' }}>{fmt(selectedSalary.paid_amount)}</div></div>
                                <div><div style={{ fontSize: 11, color: 'var(--theme-text-muted,#6b7280)', fontWeight: 600 }}>BALANCE DUE</div><div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{fmt(selectedSalary.balance_amount)}</div></div>
                            </div>
                            <div className="form-group">
                                <label>Payment Amount *</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max={Math.round(selectedSalary.balance_amount || 0)}
                                    required
                                    value={paymentForm.amount}
                                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Payment Method</label>
                                <div className="payment-method-options">
                                    {['bank_transfer', 'upi', 'cheque', 'cash'].map(m => (
                                        <label key={m} className="payment-option-label">
                                            <input
                                                type="radio"
                                                name="payment_method"
                                                value={m}
                                                checked={paymentForm.payment_method === m}
                                                onChange={e => setPaymentForm(f => ({ ...f, payment_method: e.target.value }))}
                                            />
                                            {m === 'bank_transfer' ? 'Bank Transfer' : m.charAt(0).toUpperCase() + m.slice(1)}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Transaction / Reference ID</label>
                                <input
                                    type="text"
                                    placeholder="UTR / Cheque no. / Reference"
                                    value={paymentForm.transaction_id}
                                    onChange={e => setPaymentForm(f => ({ ...f, transaction_id: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label>Notes (optional)</label>
                                <input
                                    type="text"
                                    placeholder="Any notes"
                                    value={paymentForm.notes}
                                    onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsPaymentModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-submit" disabled={paymentSubmitting}>
                                    {paymentSubmitting ? 'Recording...' : `Record Payment of ${fmt(paymentForm.amount || 0)}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Salary Breakdown Modal ── */}
            {isAttendanceModalOpen && selectedAttendanceData && (
                <div className="modal-overlay">
                    <div className="modal-content attendance-details-modal">
                        <div className="modal-header">
                            <h3>Salary Breakdown -- {MONTHS[selectedMonth - 1]} {selectedYear}</h3>
                            <button className="close-btn" onClick={() => setIsAttendanceModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingAttendance ? <div className="loading">Loading...</div> : (() => {
                                const emp = selectedAttendanceData.employee || {};
                                const calc = selectedAttendanceData.calculation || {};
                                return (
                                    <>
                                        <div className="details-section">
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
                                                <div><span style={{ color: 'var(--theme-text-muted,#6b7280)' }}>Employee: </span><strong>{emp.first_name} {emp.last_name}</strong></div>
                                                <div><span style={{ color: 'var(--theme-text-muted,#6b7280)' }}>Dept: </span><strong>{emp.department || '--'}</strong></div>
                                                <div><span style={{ color: 'var(--theme-text-muted,#6b7280)' }}>Position: </span><strong>{emp.position || '--'}</strong></div>
                                                <div><span style={{ color: 'var(--theme-text-muted,#6b7280)' }}>Monthly Salary: </span><strong>{fmt(emp.monthly_salary)}</strong></div>
                                            </div>
                                        </div>
                                        <div className="details-section">
                                            <h4>Attendance</h4>
                                            <div className="attendance-grid">
                                                {[
                                                    ['Present', calc.present_days || 0, ''],
                                                    ['Half Days', calc.half_days || 0, ''],
                                                    ['Late / Delayed', calc.late_days || 0, ''],
                                                    ['Absent', calc.absent_days || 0, '#fef2f2'],
                                                    ['Paid Leave', calc.paid_leave_days || 0, '#f0fdf4'],
                                                    ['Unpaid Leave', calc.unpaid_leave_days || 0, '#fef2f2'],
                                                    ['Weekly Off + Holidays', (calc.weekly_off_days || 0) + (calc.holiday_days || 0), '#fff7ed'],
                                                ].map(([label, value, bg]) => (
                                                    <div key={label} className="attendance-item" style={bg ? { backgroundColor: bg } : {}}>
                                                        <span className="attendance-label">{label}</span>
                                                        <span className="attendance-value">{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="details-section">
                                            <h4>Calculation</h4>
                                            <div className="calculation-breakdown">
                                                {[
                                                    ['Gross Salary', fmt(calc.gross_salary || emp.monthly_salary)],
                                                    ['Deduction Days', `${calc.deduction_days || 0} days`],
                                                    ['Deduction Amount', fmt(calc.deduction_amount)],
                                                ].map(([l, v]) => (
                                                    <div key={l} className="calc-row"><span>{l}</span><span>{v}</span></div>
                                                ))}
                                                <div className="calc-row grand-total">
                                                    <span>Net Salary</span><span>{fmt(calc.calculated_net_salary || calc.net_salary)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-close-modal" onClick={() => setIsAttendanceModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Salary History Modal ── */}
            {isSalaryDetailsModalOpen && selectedEmployeeData && (
                <div className="modal-overlay">
                    <div className="modal-content salary-details-modal">
                        <div className="modal-header">
                            <h3>Salary History -- {selectedEmployeeData.employee?.first_name} {selectedEmployeeData.employee?.last_name}</h3>
                            <button className="close-btn" onClick={() => setIsSalaryDetailsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {loadingDetails ? <div className="loading">Loading...</div> : (
                                <>
                                    <div className="summary-stats">
                                        <div className="stat-card"><div className="stat-label">Total Records</div><div className="stat-value">{selectedEmployeeData.summary?.total_records || 0}</div></div>
                                        <div className="stat-card success"><div className="stat-label">Paid</div><div className="stat-value">{selectedEmployeeData.summary?.paid_records || 0}</div></div>
                                        <div className="stat-card warning"><div className="stat-label">Pending</div><div className="stat-value">{selectedEmployeeData.summary?.pending_records || 0}</div></div>
                                        <div className="stat-card info"><div className="stat-label">Total Paid</div><div className="stat-value">{fmt(selectedEmployeeData.summary?.total_paid)}</div></div>
                                    </div>
                                    <div className="history-section">
                                        <table className="history-table">
                                            <thead>
                                                <tr>
                                                    <th>Month / Year</th>
                                                    <th>Net Salary</th>
                                                    <th>Paid</th>
                                                    <th>Balance</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(selectedEmployeeData.history || []).map(record => (
                                                    <tr key={record.id}>
                                                        <td><strong>{record.month}</strong></td>
                                                        <td>{fmt(record.net_salary)}</td>
                                                        <td style={{ color: '#15803d' }}>{fmt(record.paid_amount)}</td>
                                                        <td style={{ color: record.balance_amount > 0 ? '#dc2626' : '#15803d' }}>{fmt(record.balance_amount)}</td>
                                                        <td>{getStatusBadge(record.payment_status)}</td>
                                                        <td>
                                                            {record.balance_amount > 0 && (
                                                                <button
                                                                    className="btn-pay"
                                                                    onClick={() => {
                                                                        setSelectedSalary(record);
                                                                        setPaymentForm({ amount: String(Math.round(record.balance_amount)), payment_method: 'bank_transfer', transaction_id: '', notes: '' });
                                                                        setIsPaymentModalOpen(true);
                                                                        setIsSalaryDetailsModalOpen(false);
                                                                    }}
                                                                >
                                                                    Pay
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-close-modal" onClick={() => setIsSalaryDetailsModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryManagement;

