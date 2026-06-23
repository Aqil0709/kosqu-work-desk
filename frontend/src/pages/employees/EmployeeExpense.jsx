import React, { useState, useEffect } from 'react';
import './EmployeeExpense.css';
import { expenseAPI } from '../../services/expenseAPI';
import * as XLSX from 'xlsx';
import { useTableControls } from '../../hooks/useTableControls';

import { API_BASE_URL as API_URL } from '../../services/api';
import '../../styles/tableControls.css';

const EXPENSE_SEARCH_FIELDS = ['category_name', 'description', 'payment_status', 'amount', 'submitted_at'];

const ExpenseTable = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterPayment, setFilterPayment] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    receipt_image: null
  });

  // Get current user from localStorage
  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  };

  const currentUser = getCurrentUser();
  const {
    controlledRows: visibleExpenses,
    requestSort,
    searchTerm,
    setSearchTerm,
    sortLabel,
  } = useTableControls(expenses, EXPENSE_SEARCH_FIELDS, { key: 'submitted_at', accessor: 'submitted_at', direction: 'desc' });

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, []);

  useEffect(() => {
    // Reload expenses when payment filter changes
    loadExpenses();
  }, [filterPayment]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getMyExpenses();
      let expensesData = response.data.expenses || [];
      
      // Apply payment filter
      if (filterPayment !== 'All') {
        expensesData = expensesData.filter(expense => (expense.payment_status || 'pending') === filterPayment);
      }
      
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading expenses:', error);
      alert('Error loading expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      if (visibleExpenses.length === 0) {
        alert('No expenses to export!');
        return;
      }

      const exportData = visibleExpenses.map(expense => ({
        'Expense ID': expense.id,
        'Category': expense.category_name,
        'Amount (₹)': expense.amount,
        'Formatted Amount': formatCurrency(expense.amount),
        'Description': expense.description,
        'Payment Status': expense.payment_status ? expense.payment_status.toUpperCase() : 'PENDING',
        'Submitted Date': formatDate(expense.submitted_at),
        'Processed Date': expense.approved_at ? formatDate(expense.approved_at) : 'Not Processed',
        'Has Receipt': expense.image ? 'Yes' : 'No',
        'Employee Name': currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Unknown',
        'Employee ID': currentUser?.employee_id || `UID-${currentUser?.id || 'N/A'}`
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      const wscols = [
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 20 },
        { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      const userName = currentUser ? `${currentUser.first_name}_${currentUser.last_name}` : 'User';
      const fileName = `Expenses_${userName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      alert(`Exported ${visibleExpenses.length} expenses successfully!`);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const loadCategories = async () => {
  try {

    const response = await expenseAPI.getCategories();
   
    
    let categoriesData = [];
    
    if (response.data?.categories) {
      categoriesData = response.data.categories;
    
    } else if (response.data?.data) {
      categoriesData = response.data.data;
   
    } else if (Array.isArray(response.data)) {
      categoriesData = response.data;

    }
    

    setCategories(categoriesData);
   
  } catch (error) {
    console.error('=== Error Loading Categories ===');
    console.error('Error:', error);
    console.error('Error response:', error.response?.data);
    alert('Error loading categories. Please refresh the page.');
  }
};

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF)');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setReceiptImage(file);
      setFormData(prev => ({ ...prev, receipt_image: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
 
  
  if (!formData.category_id || !formData.amount || !formData.description) {
    alert('Please fill in all required fields');
    return;
  }

  // Validate amount is a positive number
  const amountNum = parseFloat(formData.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    alert('Please enter a valid amount greater than 0');
    return;
  }

  setIsSubmitting(true);

  try {
    const submitData = new FormData();
    submitData.append('category_id', String(formData.category_id));
    submitData.append('amount', amountNum.toString());
    submitData.append('description', formData.description.trim());
    if (receiptImage) {
      submitData.append('image', receiptImage);
    }

    for (let pair of submitData.entries()) {
   
    }

  
    
    const response = await expenseAPI.create(submitData);
  
    
    // Reset form
    setFormData({
      category_id: '',
      amount: '',
      description: ''
    });
    setReceiptImage(null);
    setImagePreview(null);
    setIsModalOpen(false);
    
    await loadExpenses();
    alert('Expense submitted successfully!');
  } catch (error) {

    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    console.error('Error response status:', error.response?.status);
    console.error('Error response headers:', error.response?.headers);
    
    // Show detailed error message
    let errorMessage = 'Error submitting expense';
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    alert(`Failed to submit expense: ${errorMessage}`);
  } finally {
    setIsSubmitting(false);
  }
};

  const getPaymentBadge = (paymentStatus) => {
    const paymentClasses = {
      'paid': 'status-approved',
      'pending': 'status-pending',
      'cancelled': 'status-rejected'
    };
    
    const paymentLabels = {
      'paid': 'Paid',
      'pending': ' Pending',
      'cancelled': ' Cancelled'
    };
    
    return (
      <span className={`status-badge ${paymentClasses[paymentStatus || 'pending']}`}>
        {paymentLabels[paymentStatus || 'pending']}
      </span>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="expense-section">
        <div className="expense-header">
          <h2>Expense Management</h2>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expense-section">
      <div className="expense-header">
        <h2>Expense Management</h2>
        <button 
          className="add-expense-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <span className="btn-icon">+</span>
          Add New Expense
        </button>
      </div>

      <div className="expense-table-container glass-form">
        <div className="table-header">
          <h3>My Expenses</h3>
          <div className="table-actions">
            <select 
              className="filter-btn"
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
            >
              <option value="All">All Payment Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <input
              className="table-search-input"
              type="search"
              placeholder="Search category, description, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <button 
              className="export-btn"
              onClick={handleExport}
              disabled={visibleExpenses.length === 0}
            >
              Export to Excel
            </button>
          </div>
        </div>
        
        <table className="expense-table">
          <thead>
            <tr>
              <th className="sortable-th" onClick={() => requestSort('category_name', 'category_name')}>Category{sortLabel('category_name')}</th>
              <th className="sortable-th" onClick={() => requestSort('description', 'description')}>Description{sortLabel('description')}</th>
              <th className="sortable-th" onClick={() => requestSort('amount', 'amount')}>Amount{sortLabel('amount')}</th>
              <th className="sortable-th" onClick={() => requestSort('submitted_at', 'submitted_at')}>Date Submitted{sortLabel('submitted_at')}</th>
              <th className="sortable-th" onClick={() => requestSort('payment_status', 'payment_status')}>Payment Status{sortLabel('payment_status')}</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {visibleExpenses.map(expense => (
              <tr key={expense.id}>
                <td>
                  <div className="category-cell">
                    <span className="category-dot"></span>
                    {expense.category_name}
                  </div>
                </td>
                <td>
                  <div className="description-cell">
                    {expense.description}
                  </div>
                </td>
                <td>
                  <div className="amount-cell">
                    {formatCurrency(expense.amount)}
                  </div>
                </td>
                <td>
                  <div className="date-cell">
                    {formatDate(expense.submitted_at)}
                  </div>
                </td>
                <td>
                  {getPaymentBadge(expense.payment_status)}
                </td>
                <td style={{ padding: '1rem' }}>
                  {expense.image ? (
                    <a 
                      href={`${API_URL}${expense.image}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#6d6ab8',
                        textDecoration: 'none',
                        fontSize: '0.875rem'
                      }}
                    >
                      View Receipt
                    </a>
                  ) : (
                    <span style={{ color: 'var(--theme-text-muted,#94a3b8)', fontSize: '0.875rem' }}>No receipt</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleExpenses.length === 0 && (
          <div className="no-expenses">
            <div className="no-data-icon">💰</div>
            <p>No expenses found</p>
            <p className="no-data-subtext">
              {filterPayment !== 'All'
                ? 'Try changing your filters to see more results.'
                : 'Get started by submitting your first expense.'}
            </p>
            {filterPayment === 'All' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="add-first-btn"
              >
                Submit First Expense
              </button>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Submit New Expense</h2>
              <button 
                className="close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="expense-form">
              <div className="form-group">
                <label>Category *</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name} {category.limit_amount > 0 ? `(Limit: ₹${category.limit_amount})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the expense purpose..."
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Receipt Image (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ padding: '0.5rem', border: '1px solid var(--card-border,#e2e8f0)', borderRadius: '6px' }}
                />
                {imagePreview && (
                  <div style={{ marginTop: '1rem' }}>
                    <img src={imagePreview} alt="Receipt preview" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptImage(null);
                        setImagePreview(null);
                        setFormData(prev => ({ ...prev, receipt_image: null }));
                      }}
                      style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem', background: '#ef4444', color: 'var(--card-bg,#fff)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <small className="helper-text">Upload receipt image (Max 5MB, JPEG, PNG, GIF)</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-btn"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseTable;
