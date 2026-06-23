// src/pages/dashboard/admin/HolidayManagement.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import {
    FaCalendarAlt,
    FaList,
    FaTrash,
    FaPlus,
    FaEdit,
    FaFileExport,
    FaFileImport,
    FaSearch,
    FaSync,
    FaCalendarCheck,
    FaCalendarPlus,
    FaFileUpload
} from 'react-icons/fa';
import './HolidayManagement.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

const normalizeDate = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value.split('T')[0];
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value).split('T')[0];
};

const getHolidayCategory = (desc) => {
    if (!desc) return 'Gazetted';
    const match = desc.match(/^\[(.*?)\]/);
    return match ? match[1] : 'Gazetted';
};

const cleanHolidayDescription = (desc) => {
    if (!desc) return '';
    return desc.replace(/^\[.*?\]\s*/, '');
};

const GAZETTED_HOLIDAYS_BY_YEAR = {
    2026: [
        { date: '2026-01-26', name: 'Republic Day' },
        { date: '2026-03-04', name: 'Holi' },
        { date: '2026-03-21', name: 'Id-ul-Fitr' },
        { date: '2026-03-26', name: 'Ram Navami' },
        { date: '2026-03-31', name: 'Mahavir Jayanti' },
        { date: '2026-04-03', name: 'Good Friday' },
        { date: '2026-05-01', name: 'Buddha Purnima' },
        { date: '2026-05-27', name: 'Id-ul-Zuha (Bakrid)' },
        { date: '2026-06-26', name: 'Muharram' },
        { date: '2026-08-15', name: 'Independence Day' },
        { date: '2026-08-26', name: 'Milad-un-Nabi or Id-e-Milad' },
        { date: '2026-09-04', name: 'Janmashtami' },
        { date: '2026-10-02', name: "Mahatma Gandhi's Birthday" },
        { date: '2026-10-20', name: 'Dussehra' },
        { date: '2026-11-08', name: 'Diwali (Deepavali)' },
        { date: '2026-11-24', name: "Guru Nanak's Birthday" },
        { date: '2026-12-25', name: 'Christmas Day' },
    ],
};

const HolidayManagement = () => {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [gazettedLoading, setGazettedLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Calendar select state (for multi-select bulk adding)
    const [selectedDates, setSelectedDates] = useState(() => {
        const saved = localStorage.getItem('holidaySelectedDates');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return new Set(parsed);
            } catch {
                return new Set();
            }
        }
        return new Set();
    });

    // View toggler state
    const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'

    // Search and list filters
    const [searchText, setSearchText] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [selectedListIds, setSelectedListIds] = useState(new Set());

    // Modals visibility
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);

    // Modal Form States
    const [newHolidayData, setNewHolidayData] = useState({
        name: '',
        date: '',
        endDate: '',
        category: 'Gazetted',
        description: '',
        isRange: false
    });

    const [editHolidayData, setEditHolidayData] = useState({
        id: '',
        name: '',
        date: '',
        category: 'Gazetted',
        description: ''
    });

    const token = localStorage.getItem('token');
    const isInitialMount = useRef(true);

    const authHeaders = useMemo(() => ({
        Authorization: `Bearer ${token}`
    }), [token]);

    // Save calendar selections to local storage
    useEffect(() => {
        if (isInitialMount.current && selectedDates.size === 0) {
            isInitialMount.current = false;
            return;
        }

        if (selectedDates.size === 0) {
            localStorage.removeItem('holidaySelectedDates');
        } else {
            const normalized = [...selectedDates];
            localStorage.setItem('holidaySelectedDates', JSON.stringify(normalized));
        }
    }, [selectedDates]);

    // API Loader
    const loadHolidays = useCallback(async () => {
        if (!selectedYear) return;

        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/api/salary/holidays/year/${selectedYear}/month/${selectedMonth}`, {
                headers: authHeaders
            });

            if (response.data.success) {
                setHolidays(response.data.holidays || []);
            }
        } catch (error) {
            console.error('Error loading holidays:', error);
            try {
                // Fallback to fetch all holidays if month-specific route fails
                const fallbackResponse = await axios.get(`${API_URL}/api/salary/holidays`, {
                    params: { year: selectedYear },
                    headers: authHeaders
                });
                if (fallbackResponse.data.success) {
                    setHolidays(fallbackResponse.data.holidays || []);
                }
            } catch (fallbackError) {
                console.error('Fallback failed:', fallbackError);
            }
        } finally {
            setLoading(false);
        }
    }, [selectedYear, selectedMonth, authHeaders]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadHolidays();
    }, [selectedYear, selectedMonth, loadHolidays]);

    // Helpers
    const isDateHoliday = useCallback((dateStr) => {
        return holidays.find(h => normalizeDate(h.date) === dateStr);
    }, [holidays]);

    const getDaysInMonth = (year, month) => {
        return new Date(year, month, 0).getDate();
    };

    const getMonthName = (month) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[month - 1];
    };

    // Calculate dynamic stats
    const stats = useMemo(() => {
        const total = holidays.length;

        // Find next upcoming holiday
        const todayStr = normalizeDate(new Date());
        const upcoming = holidays
            .filter(h => normalizeDate(h.date) >= todayStr)
            .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

        // Breakup count
        const breakup = {
            Gazetted: 0,
            Restricted: 0,
            Company: 0,
            Local: 0
        };

        holidays.forEach(h => {
            const cat = getHolidayCategory(h.description);
            if (breakup[cat] !== undefined) {
                breakup[cat]++;
            } else {
                breakup.Gazetted++;
            }
        });

        return { total, upcoming, breakup };
    }, [holidays]);

    // Calendar day grid generator
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
        const days = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holiday = isDateHoliday(dateStr);
            const isSunday = new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
            const isSelected = selectedDates.has(dateStr);

            days.push({
                day,
                date: dateStr,
                isHoliday: !!holiday,
                holidayId: holiday?.id,
                holidayName: holiday?.name,
                holidayDescription: holiday?.description,
                isSunday,
                isSelected
            });
        }

        return days;
    }, [selectedYear, selectedMonth, isDateHoliday, selectedDates]);

    // Calendar Click Logic
    const handleDayClick = (day, event) => {
        if (!day) return;

        if (event.ctrlKey) {
            // Multi-selection mode for bulk adding
            if (day.isSunday) {
                alert("Sunday is already a weekly off!");
                return;
            }
            if (day.isHoliday) {
                alert("This date is already a holiday!");
                return;
            }
            setSelectedDates(prev => {
                const newSelected = new Set(prev);
                if (newSelected.has(day.date)) {
                    newSelected.delete(day.date);
                } else {
                    newSelected.add(day.date);
                }
                return newSelected;
            });
        } else {
            // Open corresponding Modal
            if (day.isHoliday) {
                const cat = getHolidayCategory(day.holidayDescription);
                const desc = cleanHolidayDescription(day.holidayDescription);
                setEditHolidayData({
                    id: day.holidayId,
                    name: day.holidayName,
                    date: day.date,
                    category: cat,
                    description: desc
                });
                setShowEditModal(true);
            } else {
                if (day.isSunday) {
                    alert("Sunday is a weekly off!");
                    return;
                }
                setNewHolidayData({
                    name: '',
                    date: day.date,
                    endDate: day.date,
                    category: 'Gazetted',
                    description: '',
                    isRange: false
                });
                setShowAddModal(true);
            }
        }
    };

    // CRUD Handlers
    const handleAddHoliday = async (e) => {
        e.preventDefault();
        const { name, date, endDate, category, description, isRange } = newHolidayData;

        if (!name || !date) {
            alert('Holiday Name and Date are required');
            return;
        }

        const compoundDescription = `[${category}] ${description}`.trim();
        const datesToAdd = [];

        if (isRange && endDate && endDate > date) {
            let start = new Date(date);
            let end = new Date(endDate);
            while (start <= end) {
                // Skip Sundays when creating multi-day range
                if (start.getDay() !== 0) {
                    datesToAdd.push(normalizeDate(start));
                }
                start.setDate(start.getDate() + 1);
            }
        } else {
            datesToAdd.push(date);
        }

        try {
            setLoading(true);
            let successCount = 0;

            for (const d of datesToAdd) {
                const response = await axios.post(`${API_URL}/api/salary/holidays`, {
                    name,
                    date: d,
                    description: compoundDescription
                }, { headers: authHeaders });

                if (response.data.success) {
                    successCount++;
                }
            }

            alert(`Successfully added ${successCount} holiday record(s).`);
            setShowAddModal(false);
            await loadHolidays();
        } catch (error) {
            console.error('Error adding holidays:', error);
            alert('Failed to add holidays.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateHoliday = async (e) => {
        e.preventDefault();
        const { id, name, date, category, description } = editHolidayData;

        if (!name || !date) {
            alert('Holiday Name and Date are required');
            return;
        }

        const compoundDescription = `[${category}] ${description}`.trim();

        try {
            setLoading(true);
            const response = await axios.put(`${API_URL}/api/salary/holidays/${id}`, {
                name,
                date,
                description: compoundDescription
            }, { headers: authHeaders });

            if (response.data.success) {
                alert('Holiday details updated successfully!');
                setShowEditModal(false);
                await loadHolidays();
            }
        } catch (error) {
            console.error('Error updating holiday:', error);
            alert('Failed to update holiday.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHoliday = async (id) => {
        if (!window.confirm('Are you sure you want to remove this holiday?')) return;

        try {
            setLoading(true);
            const response = await axios.delete(`${API_URL}/api/salary/holidays/${id}`, { headers: authHeaders });
            if (response.data.success) {
                alert('Holiday deleted successfully.');
                setShowEditModal(false);
                await loadHolidays();
            }
        } catch (error) {
            console.error('Error deleting holiday:', error);
            alert('Failed to delete holiday.');
        } finally {
            setLoading(false);
        }
    };

    // Bulk actions
    const handleAddSelectedBulk = async () => {
        if (selectedDates.size === 0) return;

        const datesArray = [...selectedDates];
        setNewHolidayData({
            name: '',
            date: datesArray[0],
            endDate: datesArray[datesArray.length - 1],
            category: 'Gazetted',
            description: 'Bulk selected dates',
            isRange: false
        });

        // Open standard Add modal with dates prefilled
        setShowAddModal(true);
    };

    const handleBulkDelete = async () => {
        if (selectedListIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete the ${selectedListIds.size} selected holiday(s)?`)) return;

        try {
            setLoading(true);
            const response = await axios.post(`${API_URL}/api/salary/holidays/bulk-delete`, {
                ids: Array.from(selectedListIds)
            }, { headers: authHeaders });

            if (response.data.success) {
                alert(`${selectedListIds.size} holidays deleted successfully.`);
                setSelectedListIds(new Set());
                await loadHolidays();
            }
        } catch (error) {
            console.error('Error during bulk deletion:', error);
            alert('Bulk deletion failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddGazettedHolidays = async () => {
        const gazettedHolidays = GAZETTED_HOLIDAYS_BY_YEAR[selectedYear];

        if (!gazettedHolidays) {
            alert(`Gazetted holiday list is not available for ${selectedYear}. Please use Import Data for this year.`);
            return;
        }

        if (!window.confirm(`Add ${gazettedHolidays.length} gazetted holidays for ${selectedYear}? Existing dates will be skipped.`)) {
            return;
        }

        try {
            setGazettedLoading(true);
            let createdCount = 0;
            let existingCount = 0;

            for (const holiday of gazettedHolidays) {
                const response = await axios.post(`${API_URL}/api/salary/holidays`, {
                    name: holiday.name,
                    date: holiday.date,
                    description: '[Gazetted] Central Government Gazetted holiday',
                }, {
                    headers: authHeaders
                });

                if (response.data?.already_exists) {
                    existingCount += 1;
                } else if (response.data?.success) {
                    createdCount += 1;
                }
            }

            alert(`Gazetted import complete. Added ${createdCount}, skipped ${existingCount} existing.`);
            await loadHolidays();
        } catch (error) {
            console.error('Error adding gazetted holidays:', error);
            alert('Failed to add gazetted holidays.');
        } finally {
            setGazettedLoading(false);
        }
    };

    const toggleSelectAllList = () => {
        if (selectedListIds.size === filteredHolidays.length) {
            setSelectedListIds(new Set());
        } else {
            setSelectedListIds(new Set(filteredHolidays.map(h => h.id)));
        }
    };

    const toggleListSelect = (id) => {
        setSelectedListIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // List filtering logic
    const filteredHolidays = holidays.filter(h => {
        const nameMatch = h.name.toLowerCase().includes(searchText.toLowerCase());
        const descMatch = (h.description || '').toLowerCase().includes(searchText.toLowerCase());
        const dateMatch = normalizeDate(h.date).includes(searchText);

        const cat = getHolidayCategory(h.description);
        const catMatch = filterCategory === 'All' || cat === filterCategory;

        return (nameMatch || descMatch || dateMatch) && catMatch;
    });

    // Excel export utility
    const handleExportExcel = () => {
        const dataToExport = holidays.map((h, index) => ({
            'Sr No': index + 1,
            'Holiday Name': h.name,
            'Date': normalizeDate(h.date),
            'Day': new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' }),
            'Category': getHolidayCategory(h.description),
            'Description': cleanHolidayDescription(h.description)
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Holidays');

        // Auto-fit column widths
        const maxLens = {};
        dataToExport.forEach(row => {
            Object.keys(row).forEach(key => {
                const val = String(row[key] || '');
                maxLens[key] = Math.max(maxLens[key] || 10, val.length + 2);
            });
        });
        worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] }));

        XLSX.writeFile(workbook, `Holidays_${selectedYear}_Month_${selectedMonth}.xlsx`);
    };

    // Excel/CSV import parsing utility
    const handleImportFile = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Parse rows (expects headers: Date, Name, Category, Description)
                const data = XLSX.utils.sheet_to_json(ws);
                if (data.length === 0) {
                    alert("No holiday rows found in file.");
                    return;
                }

                setLoading(true);
                let addedCount = 0;

                for (const row of data) {
                    // Match key fields ignoring case
                    const rowKeys = Object.keys(row);
                    const dateKey = rowKeys.find(k => k.toLowerCase().includes('date'));
                    const nameKey = rowKeys.find(k => k.toLowerCase().includes('name'));
                    const catKey = rowKeys.find(k => k.toLowerCase().includes('cat'));
                    const descKey = rowKeys.find(k => k.toLowerCase().includes('desc'));

                    const rawDate = row[dateKey];
                    const name = row[nameKey];
                    const category = row[catKey] || 'Gazetted';
                    const description = row[descKey] || '';

                    let dateStr = '';
                    if (rawDate) {
                        if (typeof rawDate === 'number') {
                            // Convert Excel serialized dates
                            const dateObj = new Date((rawDate - (25567 + 2)) * 86400 * 1000);
                            dateStr = normalizeDate(dateObj);
                        } else {
                            dateStr = normalizeDate(new Date(rawDate));
                        }
                    }

                    if (!dateStr || isNaN(new Date(dateStr).getTime()) || !name) continue;

                    const compoundDescription = `[${category}] ${description}`.trim();

                    try {
                        await axios.post(`${API_URL}/api/salary/holidays`, {
                            name,
                            date: dateStr,
                            description: compoundDescription
                        }, { headers: authHeaders });
                        addedCount++;
                    } catch (err) {
                        console.error('Row insert failed:', row, err);
                    }
                }

                alert(`Import complete! Created ${addedCount} holiday(s).`);
                setShowImportModal(false);
                await loadHolidays();
            } catch (error) {
                console.error("Error reading spreadsheet:", error);
                alert("Failed to parse sheet. Please ensure it follows template formatting.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const downloadImportTemplate = () => {
        const templateData = [
            {
                'Date (YYYY-MM-DD)': '2026-08-15',
                'Holiday Name': 'Independence Day',
                'Category (Gazetted/Restricted/Company/Local)': 'Gazetted',
                'Description': 'National Day celebration'
            },
            {
                'Date (YYYY-MM-DD)': '2026-10-25',
                'Holiday Name': 'Dussehra',
                'Category (Gazetted/Restricted/Company/Local)': 'Restricted',
                'Description': 'Regional festival'
            }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        XLSX.writeFile(workbook, 'Holiday_Import_Template.xlsx');
    };

    return (
        <div className="holiday-container">
            {/* Page Header */}
            <div className="holiday-header">
                <div className="holiday-title-group">
                    <h2>Holiday Management</h2>
                    <p>Configure yearly organization calendars, gazetted holidays, and custom leaves.</p>
                </div>
                <div className="holiday-header-actions">
                    <button className="btn btn-secondary" onClick={handleExportExcel} title="Export list to Excel">
                        <FaFileExport /> Export Excel
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowImportModal(true)} title="Import from CSV/Excel">
                        <FaFileImport /> Import Data
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        setNewHolidayData({
                            name: '',
                            date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
                            endDate: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
                            category: 'Gazetted',
                            description: '',
                            isRange: false
                        });
                        setShowAddModal(true);
                    }}>
                        <FaPlus /> Add Holiday
                    </button>
                </div>
            </div>

            {/* Dashboard Stats */}
            <div className="stats-grid">
                <div className="stat-card stat-card--combined">
                    {/* Top: total count */}
                    <div className="combined-top">
                        <div className="stat-icon" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary-color)' }}>
                            <FaCalendarCheck />
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.total}</span>
                            <span className="stat-label">Total Holidays ({selectedYear})</span>
                        </div>
                    </div>
                    {/* Divider */}
                    <div className="combined-divider" />
                    {/* Bottom: category bars */}
                    <div className="category-breakdown">
                        {[
                            { key: 'Gazetted',   label: 'Gazetted',   color: '#ef4444', bg: '#fee2e2' },
                            { key: 'Restricted', label: 'Restricted', color: '#f97316', bg: '#ffedd5' },
                            { key: 'Company',    label: 'Company',    color: '#6366f1', bg: '#e0e7ff' },
                            { key: 'Local',      label: 'Local',      color: 'var(--theme-text-muted,#6b7280)', bg: 'var(--theme-bg-muted,#f3f4f6)' },
                        ].map(({ key, label, color, bg }) => {
                            const count = stats.breakup[key] || 0;
                            const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                            return (
                                <div key={key} className="cat-row">
                                    <span className="cat-pill" style={{ background: bg, color }}>{label}</span>
                                    <div className="cat-bar-track">
                                        <div className="cat-bar-fill" style={{ width: `${pct}%`, background: color }} />
                                    </div>
                                    <span className="cat-count" style={{ color }}>{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="stat-card stat-card--upcoming">
                    <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--success-color)' }}>
                        <FaCalendarPlus />
                    </div>
                    <div className="stat-info">
                        <span className="stat-value stat-value--holiday-name">
                            {stats.upcoming ? stats.upcoming.name : 'None'}
                        </span>
                        {stats.upcoming && (
                            <span className="stat-date">{normalizeDate(stats.upcoming.date)}</span>
                        )}
                        <span className="stat-label">Next Upcoming Holiday</span>
                    </div>
                </div>
            </div>

            {/* Filter / View Toggles */}
            <div className="controls-card">
                <div className="holiday-filter-group">
                    {viewMode === 'calendar' && (
                        <div className="holiday-filter-field holiday-filter-field--period">
                            <label>Select Month</label>
                            <div className="holiday-select-row">
                                <select className="holiday-select" value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>{getMonthName(month)}</option>
                                    ))}
                                </select>
                                <select className="holiday-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                                    {[2023, 2024, 2025, 2026, 2027, 2028].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {viewMode === 'list' && (
                        <>
                            <div className="holiday-filter-field holiday-filter-field--year">
                                <label>Year</label>
                                <select className="holiday-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                                    {[2023, 2024, 2025, 2026, 2027, 2028].map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="holiday-filter-field">
                                <label>Category</label>
                                <select className="holiday-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                    <option value="All">All Categories</option>
                                    <option value="Gazetted">Gazetted</option>
                                    <option value="Restricted">Restricted</option>
                                    <option value="Company">Company Holiday</option>
                                    <option value="Local">Local</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="holiday-action-group">
                    <button className="btn btn-secondary" onClick={loadHolidays} disabled={loading}>
                        <FaSync className={loading ? 'spin-icon' : ''} /> Sync
                    </button>
                    <div className="view-tabs">
                        <button className={`view-tab ${viewMode === 'calendar' ? 'active' : ''}`} onClick={() => setViewMode('calendar')}>
                            <FaCalendarAlt /> Calendar
                        </button>
                        <button className={`view-tab ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
                            <FaList /> List View
                        </button>
                    </div>
                </div>
            </div>

            {/* Views rendering */}
            {viewMode === 'calendar' ? (
                <>
                    <div className="calendar-card">
                        <div className="calendar-days-header">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                        </div>
                        <div className="calendar-grid">
                            {calendarDays.map((day, index) => {
                                if (!day) {
                                    return <div key={`empty-${index}`} className="calendar-cell cell-empty"></div>;
                                }

                                const cellClasses = ['calendar-cell', 'clickable'];
                                if (day.isSunday) cellClasses.push('cell-sunday');
                                else if (day.isHoliday) cellClasses.push('cell-holiday');
                                else if (day.isSelected) cellClasses.push('cell-selected');

                                return (
                                    <div
                                        key={index}
                                        className={cellClasses.join(' ')}
                                        onClick={(e) => handleDayClick(day, e)}
                                    >
                                        <span className="cell-number">{day.day}</span>
                                        {day.isHoliday && (
                                            <div className="cell-label cell-holiday-label" title={day.holidayName}>
                                                {day.holidayName}
                                            </div>
                                        )}
                                        {day.isSelected && !day.isSunday && !day.isHoliday && (
                                            <div className="cell-label cell-selected-label">
                                                Selected
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="legend-card">
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.4)' }}></div>
                            <span>Weekly Off (Sunday)</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.3)' }}></div>
                            <span>Holiday</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)' }}></div>
                            <span>Selected (Ctrl+Click)</span>
                        </div>
                        <div className="legend-item">
                            <div className="legend-color" style={{ backgroundColor: 'var(--card-bg,#fff)', borderColor: 'var(--card-border,#e5e7eb)' }}></div>
                            <span>Working Day</span>
                        </div>
                    </div>
                </>
            ) : (
                /* List View */
                <div className="list-view-container">
                    <div className="list-view-header">
                        <div className="search-input-wrapper">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search by name, description, date..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                        </div>
                        {selectedListIds.size > 0 && (
                            <button className="btn btn-danger" onClick={handleBulkDelete}>
                                <FaTrash /> Delete Selected ({selectedListIds.size})
                            </button>
                        )}
                    </div>

                    <div className="table-responsive">
                        <table className="holiday-table">
                            <thead>
                                <tr>
                                    <th className="checkbox-cell">
                                        <input
                                            type="checkbox"
                                            className="checkbox-input"
                                            checked={filteredHolidays.length > 0 && selectedListIds.size === filteredHolidays.length}
                                            onChange={toggleSelectAllList}
                                        />
                                    </th>
                                    <th>Holiday Name</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th>Category</th>
                                    <th>Description</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHolidays.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                                            No holiday records found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHolidays.map((h) => {
                                        const cat = getHolidayCategory(h.description);
                                        const desc = cleanHolidayDescription(h.description);
                                        const dateStr = normalizeDate(h.date);
                                        const dayOfWeek = new Date(h.date).toLocaleDateString('en-US', { weekday: 'long' });

                                        return (
                                            <tr key={h.id}>
                                                <td className="checkbox-cell">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox-input"
                                                        checked={selectedListIds.has(h.id)}
                                                        onChange={() => toggleListSelect(h.id)}
                                                    />
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{h.name}</td>
                                                <td>{dateStr}</td>
                                                <td>{dayOfWeek}</td>
                                                <td>
                                                    <span className={`badge-cat badge-${cat.toLowerCase()}`}>
                                                        {cat}
                                                    </span>
                                                </td>
                                                <td style={{ color: 'var(--text-muted)' }}>{desc || '""'}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                                        onClick={() => {
                                                            setEditHolidayData({
                                                                id: h.id,
                                                                name: h.name,
                                                                date: dateStr,
                                                                category: cat,
                                                                description: desc
                                                            });
                                                            setShowEditModal(true);
                                                        }}
                                                    >
                                                        <FaEdit /> Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal: Add Holiday */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add Holiday</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleAddHoliday}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Holiday Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. New Year's Day"
                                        required
                                        value={newHolidayData.name}
                                        onChange={(e) => setNewHolidayData({ ...newHolidayData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="modal-checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={newHolidayData.isRange}
                                            onChange={(e) => setNewHolidayData({ ...newHolidayData, isRange: e.target.checked })}
                                        />
                                        <span>Create as Date Range (Multi-day)</span>
                                    </label>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">{newHolidayData.isRange ? 'Start Date' : 'Date'}</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            required
                                            value={newHolidayData.date}
                                            onChange={(e) => setNewHolidayData({ ...newHolidayData, date: e.target.value })}
                                        />
                                    </div>
                                    {newHolidayData.isRange && (
                                        <div className="form-group">
                                            <label className="form-label">End Date</label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                required
                                                value={newHolidayData.endDate}
                                                onChange={(e) => setNewHolidayData({ ...newHolidayData, endDate: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input"
                                        value={newHolidayData.category}
                                        onChange={(e) => setNewHolidayData({ ...newHolidayData, category: e.target.value })}
                                    >
                                        <option value="Gazetted">Gazetted (National)</option>
                                        <option value="Restricted">Restricted Holiday</option>
                                        <option value="Company">Company Holiday</option>
                                        <option value="Local">Local Off</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        style={{ height: '60px', resize: 'vertical' }}
                                        placeholder="Brief details about the holiday"
                                        value={newHolidayData.description}
                                        onChange={(e) => setNewHolidayData({ ...newHolidayData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Holiday'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit Holiday */}
            {showEditModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Edit Holiday</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleUpdateHoliday}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Holiday Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        value={editHolidayData.name}
                                        onChange={(e) => setEditHolidayData({ ...editHolidayData, name: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        required
                                        value={editHolidayData.date}
                                        onChange={(e) => setEditHolidayData({ ...editHolidayData, date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        className="form-input"
                                        value={editHolidayData.category}
                                        onChange={(e) => setEditHolidayData({ ...editHolidayData, category: e.target.value })}
                                    >
                                        <option value="Gazetted">Gazetted (National)</option>
                                        <option value="Restricted">Restricted Holiday</option>
                                        <option value="Company">Company Holiday</option>
                                        <option value="Local">Local Off</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        style={{ height: '60px', resize: 'vertical' }}
                                        value={editHolidayData.description}
                                        onChange={(e) => setEditHolidayData({ ...editHolidayData, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                                <button type="button" className="btn btn-danger" onClick={() => handleDeleteHoliday(editHolidayData.id)}>
                                    <FaTrash /> Delete
                                </button>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Import Data */}
            {showImportModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Import Holidays</h3>
                            <button className="modal-close" onClick={() => setShowImportModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="import-area" onClick={() => document.getElementById('file-upload-input').click()}>
                                <FaFileUpload className="import-icon" />
                                <p>Click to select or drag & drop Excel / CSV here</p>
                                <span>Accepted formats: .xlsx, .xls, .csv</span>
                                <input
                                    type="file"
                                    id="file-upload-input"
                                    style={{ display: 'none' }}
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleImportFile}
                                />
                            </div>
                            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <button className="template-link" onClick={downloadImportTemplate}>
                                    📥 Download spreadsheet template (.xlsx)
                                </button>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowImportModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HolidayManagement;

