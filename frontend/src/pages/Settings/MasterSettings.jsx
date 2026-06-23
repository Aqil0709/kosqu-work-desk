import { useEffect, useMemo, useState } from 'react';
import { employeeAPI } from '../../services/employeeAPI';
import { expenseAPI } from '../../services/expenseAPI';
import './MasterSettings.css';

const emptyDepartment = {
  name: '',
  description: '',
  manager: ''
};

const emptyExpenseCategory = {
  name: '',
  limit_amount: '',
  description: ''
};

const MasterSettings = () => {
  const [departments, setDepartments] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [formData, setFormData] = useState(emptyDepartment);
  const [categoryFormData, setCategoryFormData] = useState(emptyExpenseCategory);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const filteredDepartments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return departments;

    return departments.filter((department) => (
      department.name?.toLowerCase().includes(term) ||
      department.description?.toLowerCase().includes(term) ||
      department.manager?.toLowerCase().includes(term)
    ));
  }, [departments, searchTerm]);

  const filteredExpenseCategories = useMemo(() => {
    const term = categorySearchTerm.trim().toLowerCase();
    if (!term) return expenseCategories;

    return expenseCategories.filter((category) => (
      category.name?.toLowerCase().includes(term) ||
      category.description?.toLowerCase().includes(term)
    ));
  }, [expenseCategories, categorySearchTerm]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getDepartments();
      setDepartments(response.data.departments || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to load departments'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExpenseCategories = async () => {
    try {
      setCategoryLoading(true);
      const response = await expenseAPI.getCategories();
      setExpenseCategories(response.data.categories || []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to load expense categories'
      });
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
    loadExpenseCategories();
  }, []);

  const resetForm = () => {
    setFormData(emptyDepartment);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (event) => {
    const { name, value } = event.target;
    setCategoryFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = formData.name.trim();

    if (!name) {
      setMessage({ type: 'error', text: 'Department name is required' });
      return;
    }

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const payload = {
        name,
        description: formData.description.trim(),
        manager: formData.manager.trim()
      };

      const response = editingId
        ? await employeeAPI.updateDepartment(editingId, payload)
        : await employeeAPI.createDepartment(payload);

      setDepartments(response.data.departments || []);
      setMessage({
        type: 'success',
        text: response.data.message || (editingId ? 'Department updated' : 'Department created')
      });
      resetForm();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save department'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    const name = categoryFormData.name.trim();
    const limitAmount = categoryFormData.limit_amount === ''
      ? null
      : Number(categoryFormData.limit_amount);

    if (!name) {
      setMessage({ type: 'error', text: 'Expense category name is required' });
      return;
    }

    if (limitAmount !== null && (Number.isNaN(limitAmount) || limitAmount < 0)) {
      setMessage({ type: 'error', text: 'Expense limit must be 0 or greater' });
      return;
    }

    try {
      setCategorySaving(true);
      setMessage({ type: '', text: '' });
      await expenseAPI.createCategory({
        name,
        limit_amount: limitAmount,
        description: categoryFormData.description.trim()
      });
      await loadExpenseCategories();
      setCategoryFormData(emptyExpenseCategory);
      setMessage({ type: 'success', text: 'Expense category created' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to save expense category'
      });
    } finally {
      setCategorySaving(false);
    }
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setFormData({
      name: department.name || '',
      description: department.description || '',
      manager: department.manager || ''
    });
    setMessage({ type: '', text: '' });
  };

  const handleDelete = async (department) => {
    if (!window.confirm(`Delete department "${department.name}"?`)) return;

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const response = await employeeAPI.deleteDepartment(department.id);
      setDepartments(response.data.departments || []);
      setMessage({ type: 'success', text: response.data.message || 'Department deleted' });
      if (editingId === department.id) resetForm();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to delete department'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="master-settings-page app-page">
      <div className="master-settings-header app-page-header">
        <div>
          <h2 className="app-page-title">Master Settings</h2>
          <p className="app-page-subtitle">Manage department and expense masters used across Kosqu Technolab HRMS.</p>
        </div>
      </div>

      {message.text && (
        <div className={`app-message ${message.type === 'success' ? 'app-message-success' : 'app-message-error'}`}>
          {message.text}
        </div>
      )}

      <div className="master-settings-grid">
        <section className="master-panel app-card app-card-padded">
          <h3 className="app-section-title">{editingId ? 'Edit Department' : 'Add Department'}</h3>
          <form onSubmit={handleSubmit} className="master-form app-form">
            <div className="app-form-group">
              <label>Department Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Human Resources"
                required
                maxLength={100}
              />
            </div>

            <div className="app-form-group">
              <label>Manager</label>
              <input
                name="manager"
                value={formData.manager}
                onChange={handleChange}
                placeholder="e.g. Asha Patel"
                maxLength={255}
              />
            </div>

            <div className="app-form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Short department description"
                rows={4}
              />
            </div>

            <div className="master-actions app-actions">
              {editingId && (
                <button type="button" className="app-button app-button-secondary" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
              <button type="submit" className="app-button app-button-primary" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Department' : 'Add Department'}
              </button>
            </div>
          </form>
        </section>

        <section className="master-panel master-list-panel app-card app-card-padded">
          <div className="master-list-header">
            <div>
              <h3 className="app-section-title">Departments</h3>
              <span>{departments.length} total</span>
            </div>
            <input
              className="master-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search departments"
            />
          </div>

          <div className="master-table-wrap app-table-wrap">
            <table className="master-table app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Manager</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="4" className="app-empty-state">Loading departments...</td>
                  </tr>
                ) : filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="app-empty-state">No departments found.</td>
                  </tr>
                ) : (
                  filteredDepartments.map((department) => (
                    <tr key={department.id}>
                      <td>{department.name}</td>
                      <td>{department.manager || '-'}</td>
                      <td>{department.description || '-'}</td>
                      <td className="master-row-actions">
                        <button type="button" className="app-button app-button-secondary" onClick={() => handleEdit(department)} disabled={saving}>
                          Edit
                        </button>
                        <button type="button" className="app-button app-button-danger" onClick={() => handleDelete(department)} disabled={saving}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="master-section-spacer" />

      <div className="master-settings-grid">
        <section className="master-panel app-card app-card-padded">
          <h3 className="app-section-title">Add Expense Category</h3>
          <form onSubmit={handleCategorySubmit} className="master-form app-form">
            <div className="app-form-group">
              <label>Category Name *</label>
              <input
                name="name"
                value={categoryFormData.name}
                onChange={handleCategoryChange}
                placeholder="e.g. Travel"
                required
                maxLength={100}
              />
            </div>

            <div className="app-form-group">
              <label>Limit Amount</label>
              <input
                type="number"
                name="limit_amount"
                value={categoryFormData.limit_amount}
                onChange={handleCategoryChange}
                placeholder="0 for no limit"
                min="0"
                step="0.01"
              />
            </div>

            <div className="app-form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={categoryFormData.description}
                onChange={handleCategoryChange}
                placeholder="Short category description"
                rows={4}
              />
            </div>

            <div className="master-actions app-actions">
              <button type="submit" className="app-button app-button-primary" disabled={categorySaving}>
                {categorySaving ? 'Saving...' : 'Add Category'}
              </button>
            </div>
          </form>
        </section>

        <section className="master-panel master-list-panel app-card app-card-padded">
          <div className="master-list-header">
            <div>
              <h3 className="app-section-title">Expense Categories</h3>
              <span>{expenseCategories.length} total</span>
            </div>
            <input
              className="master-search"
              value={categorySearchTerm}
              onChange={(event) => setCategorySearchTerm(event.target.value)}
              placeholder="Search categories"
            />
          </div>

          <div className="master-table-wrap app-table-wrap">
            <table className="master-table app-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Limit</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {categoryLoading ? (
                  <tr>
                    <td colSpan="3" className="app-empty-state">Loading expense categories...</td>
                  </tr>
                ) : filteredExpenseCategories.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="app-empty-state">No expense categories found.</td>
                  </tr>
                ) : (
                  filteredExpenseCategories.map((category) => (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{Number(category.limit_amount || 0) > 0 ? `INR ${category.limit_amount}` : 'No limit'}</td>
                      <td>{category.description || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MasterSettings;
