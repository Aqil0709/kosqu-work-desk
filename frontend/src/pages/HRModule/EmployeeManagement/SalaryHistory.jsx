import React, { useState, useEffect } from 'react';
import { salaryAPI } from '../../../services/salaryAPI';
import { salarySlipPDFService } from '../../../services/salarySlipPDFService';
import { HiOutlineUserGroup, HiOutlineCurrencyDollar, HiOutlineEye, HiOutlineArrowDownTray, HiMagnifyingGlass } from "react-icons/hi2";
import './SalaryHistory.css';

const SalaryHistory = () => {
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        employee: '',
        month: '',
        year: ''
    });

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const empRes = await salaryAPI.getEmployees();
                setEmployees(empRes.data.employees || []);
                fetchRecords();
            } catch (err) {
                console.error("Error fetching initial data:", err);
            }
        };
        fetchInitialData();
    }, []);

    const fetchRecords = async () => {
        setLoading(true);
        try {
            const res = await salaryAPI.getAll(filters);
            setRecords(res.data.salaryRecords || []);
        } catch (err) {
            console.error("Error fetching records:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecords();
    }, [filters]);

    const mapRecordToFormData = (record) => ({
        fullName: record.employee_name,
        designation: record.designation,
        monthYear: `${record.month} ${record.year}`,
        paymentMode: record.payment_mode || "Bank Transfer",
        earnings: {
            basic: record.basic_salary,
            hra: record.allowances?.hra || 0,
            conveyance: record.allowances?.transport || 0,
            medical: record.allowances?.medical || 0,
            special: record.allowances?.special || 0
        },
        deductions: {
            pf: record.deductions?.provident_fund || 0,
            pt: record.deductions?.professional_tax || 0,
            tds: record.deductions?.tax || 0
        }
    });

    const handleAction = async (action, record) => {
        try {
            const formData = mapRecordToFormData(record);
            if (action === 'view') await salarySlipPDFService.viewSalarySlip(formData);
            else await salarySlipPDFService.downloadSalarySlip(formData);
        } catch (err) {
            alert("Action failed. Please try again.");
        }
    };

    return (
        <div className="salary-history-container">
            <div className="history-header">
                <div>
                    <h1>Salary History</h1>
                    <p>Manage and track all employee salary records</p>
                </div>
                <div className="stats-mini">
                    <div className="stat-item">
                        <span className="stat-label">Total Records</span>
                        <span className="stat-value">{records.length}</span>
                    </div>
                </div>
            </div>

            <div className="filters-section">
                <div className="filter-group">
                    <HiMagnifyingGlass className="filter-icon" />
                    <select 
                        value={filters.employee}
                        onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
                        className="history-select"
                    >
                        <option value="">All Employees</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <select 
                        value={filters.month}
                        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        className="history-select"
                    >
                        <option value="">All Months</option>
                        {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <select 
                        value={filters.year}
                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        className="history-select"
                    >
                        <option value="">All Years</option>
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                
                <button className="reset-btn" onClick={() => setFilters({ employee: '', month: '', year: '' })}>
                    Reset
                </button>
            </div>

            <div className="history-content">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading salary records...</p>
                    </div>
                ) : records.length > 0 ? (
                    <div className="records-table-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Period</th>
                                    <th>Net Salary</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(record => (
                                    <tr key={record.id}>
                                        <td>
                                            <div className="emp-cell">
                                                <div className="emp-avatar">
                                                    {record.employee_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="emp-name">{record.employee_name}</div>
                                                    <div className="emp-role">{record.designation}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="period-box">
                                                {record.month} {record.year}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="net-salary-txt">₹{record.net_salary.toLocaleString()}</span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${record.status}`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-btns">
                                                <button className="action-view" onClick={() => handleAction('view', record)} title="View Preview">
                                                    <HiOutlineEye size={18} />
                                                </button>
                                                <button className="action-download" onClick={() => handleAction('download', record)} title="Download PDF">
                                                    <HiOutlineArrowDownTray size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <HiOutlineCurrencyDollar size={64} />
                        <h3>No records found</h3>
                        <p>Try adjusting your search filters</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalaryHistory;
