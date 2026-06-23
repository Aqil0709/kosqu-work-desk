import React, { useState, useEffect } from 'react';
import './Expense.css';
import { expenseAPI } from '../../../services/expenseAPI';
import * as XLSX from 'xlsx'; 

const ExpenseTable = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    receipt_url: ''
  });

  // Get current user from localStorage
  const getCurrentUser = () => {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  };

  const currentUser = getCurrentUser();

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await expenseAPI.getMyExpenses();
      setExpenses(response.data.expenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      alert('Error loading expenses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      // If no data to export
      if (filteredExpenses.length === 0) {
        alert('No expenses to export!');
        return;
      }

      // Prepare data for export
      const exportData = filteredExpenses.map(expense => ({
        'Expense ID': expense.id,
        'Category': expense.category_name,
        'Amount (₹)': expense.amount,
        'Formatted Amount': formatCurrency(expense.amount),
        'Description': expense.description,
        'Status': expense.status.charAt(0).toUpperCase() + expense.status.slice(1),
        'Submitted Date': formatDate(expense.submitted_at),
        'Processed Date': expense.approved_at ? formatDate(expense.approved_at) : 'Not Processed',
        'Receipt URL': expense.receipt_url || 'No Receipt',
        'Employee Name': currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Unknown',
        'Employee ID': currentUser?.employee_id || `UID-${currentUser?.id || 'N/A'}`
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Set column widths
      const wscols = [
        { wch: 12 },  // Expense ID
        { wch: 20 },  // Category
        { wch: 15 },  // Amount (₹)
        { wch: 20 },  // Formatted Amount
        { wch: 40 },  // Description
        { wch: 15 },  // Status
        { wch: 15 },  // Submitted Date
        { wch: 15 },  // Processed Date
        { wch: 30 },  // Receipt URL
        { wch: 25 },  // Employee Name
        { wch: 15 }   // Employee ID
      ];
      worksheet['!cols'] = wscols;

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses');

      // Generate file name with current date and user name
      const userName = currentUser ? `${currentUser.first_name}_${currentUser.last_name}` : 'User';
      const fileName = `Expenses_${userName}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Export to Excel
      XLSX.writeFile(workbook, fileName);
 
      alert(`Exported ${filteredExpenses.length} expenses successfully!`);
    } catch (error) {
      console.error('❌ Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const loadCategories = async () => {
    try {
      const response = await expenseAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.category_id || !formData.amount || !formData.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      alert('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        category_id: formData.category_id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        receipt_url: formData.receipt_url || null
      };

      await expenseAPI.create(expenseData);
      
      // Reset form
      setFormData({
        category_id: '',
        amount: '',
        description: '',
        receipt_url: ''
      });
      
      setIsModalOpen(false);
      
      // Reload expenses to show the new one
      await loadExpenses();
      
      alert('Expense submitted successfully!');
    } catch (error) {
      console.error('Error submitting expense:', error);
      const errorMessage = error.response?.data?.message || 'Error submitting expense. Please try again.';
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'approved': 'status-approved',
      'pending': 'status-pending',
      'rejected': 'status-rejected'
    };
    
    const statusLabels = {
      'approved': 'Approved',
      'pending': 'Pending',
      'rejected': 'Rejected'
    };
    
    return (
      <span className={`status-badge ${statusClasses[status]}`}>
        {statusLabels[status]}
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

  const filteredExpenses = filterStatus === 'All' 
    ? expenses 
    : expenses.filter(expense => expense.status === filterStatus);

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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <button 
              className="export-btn"
              onClick={handleExport}
              disabled={filteredExpenses.length === 0}
            >
              Export
            </button>
        </div>
        </div>
        
        <table className="expense-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Date Submitted</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map(expense => (
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
                    {expense.receipt_url && (
                      <div className="receipt-link">
                        <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                          📎 View Receipt
                        </a>
                      </div>
                    )}
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
                  {getStatusBadge(expense.status)}
                  {expense.approved_at && (
                    <div className="processed-date">
                      {formatDate(expense.approved_at)}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredExpenses.length === 0 && (
          <div className="no-expenses">
            <div className="no-data-icon">💰</div>
            <p>No expenses found</p>
            <p className="no-data-subtext">
              {filterStatus !== 'All' 
                ? 'Try changing your status filter to see more results.'
                : 'Get started by submitting your first expense.'}
            </p>
            {filterStatus === 'All' && (
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
                  placeholder="Describe the expense purpose, including who, what, when, and why..."
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Receipt URL (Optional)</label>
                <input
                  type="url"
                  name="receipt_url"
                  value={formData.receipt_url}
                  onChange={handleInputChange}
                  placeholder="https://example.com/receipt.jpg"
                />
                <small className="helper-text">
                  Provide a link to your receipt image or document
                </small>
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