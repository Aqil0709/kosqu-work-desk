import React, { useState, useEffect } from 'react';
import { expenseAPI } from '../../services/expenseAPI';
import './AddExpenseModal.css';

const AddExpenseModal = ({ isOpen, onClose, onExpenseAdded }) => {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    limit_amount: '',
    description: ''
  });
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      // Reset form when modal opens
      setFormData({
        category_id: '',
        amount: '',
        description: '',
      });
      setImage(null);
      setImagePreview(null);
      setError(null);
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      const response = await expenseAPI.getCategories();
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryData.name.trim()) {
      alert('Please enter a category name');
      return;
    }

    setAddingCategory(true);
    try {
      const response = await expenseAPI.createCategory({
        name: newCategoryData.name.trim(),
        limit_amount: newCategoryData.limit_amount ? parseFloat(newCategoryData.limit_amount) : 0,
        description: newCategoryData.description.trim()
      });

      if (response.data.category) {
        // Add new category to list and set it as selected
        setCategories([...categories, response.data.category]);
        setFormData(prev => ({
          ...prev,
          category_id: response.data.category.id
        }));

        // Reset and close form
        setNewCategoryData({ name: '', limit_amount: '', description: '' });
        setShowAddCategory(false);
        alert('Category created successfully!');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.response?.data?.message || 'Failed to create category');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleNewCategoryChange = (e) => {
    const { name, value } = e.target;
    setNewCategoryData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChange = (e) => {
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

    setLoading(true);
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      await expenseAPI.create(expenseData);
      
      // Reset form
      setFormData({
        category_id: '',
        amount: '',
        description: '',
        receipt_url: ''
      });
      
      onExpenseAdded(); // Refresh the expense list
      onClose(); // Close modal
      
      alert('Expense submitted successfully!');
    } catch (error) {
      console.error('Error submitting expense:', error);
      alert(error.response?.data?.message || 'Failed to submit expense');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--card-bg,#fff)',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: 'var(--color-navy)' }}>
            Submit New Expense
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category Selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <label style={{
                fontWeight: '500',
                color: 'var(--color-text)'
              }}>
                Expense Category *
              </label>
              <button
                type="button"
                onClick={() => setShowAddCategory(!showAddCategory)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textDecoration: 'underline',
                  fontWeight: '500',
                  padding: 0
                }}
              >
                {showAddCategory ? '✕ Cancel' : '+ Add Category'}
              </button>
            </div>

            {!showAddCategory ? (
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid var(--card-border,#e2e8f0)',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  backgroundColor: 'var(--card-bg,#fff)'
                }}
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.limit_amount > 0 && `(Limit: ₹${category.limit_amount})`}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{
                border: '1px solid var(--card-border,#cbd5e0)',
                borderRadius: '6px',
                padding: '1rem',
                backgroundColor: 'var(--theme-surface-muted,#f7fafc)'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    color: 'var(--color-text)'
                  }}>
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newCategoryData.name}
                    onChange={handleNewCategoryChange}
                    placeholder="e.g., Travel, Food, Office Supplies"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--card-border,#e2e8f0)',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    color: 'var(--color-text)'
                  }}>
                    Limit Amount (₹) (Optional)
                  </label>
                  <input
                    type="number"
                    name="limit_amount"
                    value={newCategoryData.limit_amount}
                    onChange={handleNewCategoryChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--card-border,#e2e8f0)',
                      borderRadius: '4px',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontWeight: '500',
                    fontSize: '0.9rem',
                    color: 'var(--color-text)'
                  }}>
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={newCategoryData.description}
                    onChange={handleNewCategoryChange}
                    placeholder="Category description..."
                    rows="2"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--card-border,#e2e8f0)',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={addingCategory}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    background: addingCategory ? '#cbd5e0' : '#48bb78',
                    color: 'var(--card-bg,#fff)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: addingCategory ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                  }}
                >
                  {addingCategory ? 'Creating...' : '✓ Create Category'}
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: 'var(--color-text)'
            }}>
              Amount (₹) *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--card-border,#e2e8f0)',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: 'var(--color-text)'
            }}>
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the expense purpose..."
              rows="4"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--card-border,#e2e8f0)',
                borderRadius: '6px',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Receipt URL (Optional) */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: 'var(--color-text)'
            }}>
              Receipt URL (Optional)
            </label>
            <input
              type="url"
              name="receipt_url"
              value={formData.receipt_url}
              onChange={handleChange}
              placeholder="https://example.com/receipt.jpg"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--card-border,#e2e8f0)',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'var(--card-bg,#fff)',
                color: 'var(--color-text)',
                border: '1px solid var(--card-border,#e2e8f0)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading ? '#cbd5e0' : '#6d6ab8',
                color: 'var(--card-bg,#fff)',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              {loading ? 'Submitting...' : 'Submit Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExpenseModal;
