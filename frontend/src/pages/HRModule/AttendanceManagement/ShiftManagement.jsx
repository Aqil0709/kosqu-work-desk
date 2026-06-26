﻿import React, { useState, useEffect, useCallback } from 'react';
import { FaExclamationTriangle, FaStar, FaCrown, FaSyncAlt, FaTasks, FaCalendarAlt } from 'react-icons/fa';
import { shiftAPI } from '../../../services/shiftAPI';
import './ShiftManagement.css';

const ShiftTemplates = () => {
  // ==================== SHIFT MANAGEMENT STATE ====================
  const [shiftData, setShiftData] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isEmployeesModalOpen, setIsEmployeesModalOpen] = useState(false);
  const [isSetDefaultModalOpen, setIsSetDefaultModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);
  const [shiftToSetDefault, setShiftToSetDefault] = useState(null);
  const [newShift, setNewShift] = useState({
    shift_name: '',
    shift_code: '',
    description: '',
    shift_type: 'General',
    check_in_time: '',
    check_out_time: '',
    break_duration: 60,
    min_hours: 8,
    employees: [],
    is_default: false,
    grace_period_minutes: 15
  });

  // Load initial data
  useEffect(() => {
    loadShiftData();
    loadAvailableEmployees();
  }, []);

  const loadShiftData = async () => {
    try {
      setLoading(true);
      const response = await shiftAPI.getAll();
      setShiftData(response.data.shifts || []);
    } catch (error) {
      console.error('Error loading shift data:', error);
      alert('Error loading shift data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableEmployees = async () => {
    try {
      const response = await shiftAPI.getEmployees();
      setAvailableEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Error loading employees:', error);
      alert('Error loading available employees.');
      setAvailableEmployees([]);
    }
  };

  const loadShiftEmployees = async (shiftId) => {
    try {
      const response = await shiftAPI.getShiftEmployees(shiftId);
      return response.data.employees || [];
    } catch (error) {
      console.error('Error loading shift employees:', error);
      return [];
    }
  };

  const handleAddShift = () => {
    setIsShiftModalOpen(true);
    setSelectedShift(null);
    setNewShift({
      shift_name: '',
      shift_code: '',
      description: '',
      shift_type: 'General',
      check_in_time: '',
      check_out_time: '',
      break_duration: 60,
      min_hours: 8,
      employees: [],
      is_default: false,
      grace_period_minutes: 15
    });
  };

  const handleSaveShift = async () => {
    if (newShift.shift_name && newShift.check_in_time && newShift.check_out_time) {
        try {
            const saveData = {
                shift_name: newShift.shift_name,
                shift_code: newShift.shift_code,
                description: newShift.description,
                shift_type: newShift.shift_type,
                check_in_time: newShift.check_in_time,
                check_out_time: newShift.check_out_time,
                break_duration: newShift.break_duration || 60,
                min_hours: newShift.min_hours || 8,
                grace_period_minutes: newShift.grace_period_minutes || 15,
                is_default: newShift.is_default || false,
                employees: newShift.employees || []
            };

            await shiftAPI.create(saveData);
            await loadShiftData();
            setIsShiftModalOpen(false);
            alert('Shift added successfully!');
        } catch (error) {
            console.error('Error creating shift:', error);
            alert(error.response?.data?.message || 'Error creating shift. Please try again.');
        }
    } else {
        alert('Please fill all required fields!');
    }
  };

  const handleViewEmployees = async (shift) => {
    try {
      const employees = await loadShiftEmployees(shift.shift_id);
      setSelectedShift({
        ...shift,
        employeesInShift: employees
      });
      setIsEmployeesModalOpen(true);
    } catch (error) {
      console.error('Error loading shift employees:', error);
      alert('Error loading shift employees.');
    }
  };

  const handleEditShift = async (shift) => {
    try {
      const employees = await loadShiftEmployees(shift.shift_id);
      setSelectedShift(shift);
      setNewShift({
        shift_name: shift.shift_name || '',
        shift_code: shift.shift_code || '',
        description: shift.description || '',
        shift_type: shift.shift_type || 'General',
        check_in_time: shift.check_in_time || '',
        check_out_time: shift.check_out_time || '',
        break_duration: shift.break_duration || 60,
        min_hours: shift.min_hours || 8,
        employees: employees.map(employee => employee.employee_id),
        is_default: shift.is_default || false,
        grace_period_minutes: shift.grace_period_minutes || 15
      });
      setIsShiftModalOpen(true);
    } catch (error) {
      console.error('Error loading shift details:', error);
      alert('Error loading shift details.');
    }
  };

  const handleSetAsDefault = (shift) => {
    setShiftToSetDefault(shift);
    setIsSetDefaultModalOpen(true);
  };

  const handleConfirmSetDefault = async () => {
    try {
      await shiftAPI.setAsDefault(shiftToSetDefault.shift_id);
      await loadShiftData();
      setIsSetDefaultModalOpen(false);
      setShiftToSetDefault(null);
      alert(`${shiftToSetDefault.shift_name} has been set as the default shift!`);
    } catch (error) {
      console.error('Error setting default shift:', error);
      alert('Error setting default shift. Please try again.');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await shiftAPI.delete(shiftId);
        await loadShiftData();
        alert('Shift deleted successfully!');
      } catch (error) {
        console.error('Error deleting shift:', error);
        alert(error.response?.data?.message || 'Error deleting shift. Please try again.');
      }
    }
  };

  const handleUpdateShift = async () => {
    if (newShift.shift_name && newShift.check_in_time && newShift.check_out_time) {
        try {
            const updateData = {
                shift_name: newShift.shift_name,
                shift_code: newShift.shift_code,
                description: newShift.description,
                shift_type: newShift.shift_type,
                check_in_time: newShift.check_in_time,
                check_out_time: newShift.check_out_time,
                break_duration: newShift.break_duration || 60,
                min_hours: newShift.min_hours || 8,
                grace_period_minutes: newShift.grace_period_minutes || 15,
                employees: newShift.employees || []
            };

            await shiftAPI.update(selectedShift.shift_id, updateData);
            await loadShiftData();
            setIsShiftModalOpen(false);
            setSelectedShift(null);
            alert('Shift updated successfully!');
        } catch (error) {
            console.error('Error updating shift:', error);
            alert(error.response?.data?.message || 'Error updating shift. Please try again.');
        }
    } else {
        alert('Please fill all required fields!');
    }
  };
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="lm-container">
        <div className="loading-container">
          <div>Loading shift data...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lm-table-container lm-glass-effect" style={{marginBottom: '2rem'}}>
        <div className="lm-table-header">
          <h3 id="lm-shift-section-title">Shift Templates</h3>
          <button
            onClick={handleAddShift}
            className="lm-primary-btn"
            id="lm-add-shift-btn"
          >
            Add Shift
          </button>
        </div>

        <div className="lm-table-wrapper">
          <table className="lm-data-table" style={{tableLayout: 'fixed', width: '100%'}}>
            <thead>
              <tr>
                <th style={{width: '20%'}}>Shift Name</th>
                <th style={{width: '15%'}}>Shift Times</th>
                <th style={{width: '10%'}}>Grace Period</th>
                <th style={{width: '12%'}}>Status</th>
                <th style={{width: '13%'}}>Employees</th>
                <th style={{width: '30%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shiftData.map(shift => (
                <tr key={shift.shift_id} className={shift.is_default ? 'lm-default-shift-row' : ''}>
                  <td style={{width: '20%'}}>
                    <div className="lm-cell-content">
                      <div className="lm-primary-text">
                        {shift.shift_name}
                        {shift.is_default && (
                          <span className="lm-default-badge">
                            <FaCrown /> Default
                          </span>
                        )}
                      </div>
                    </div>
                   </td>
                  <td style={{width: '15%'}}>
                    <div className="lm-time-cell">
                      {shift.check_in_time} - {shift.check_out_time}
                    </div>
                   </td>
                  <td style={{width: '10%'}}>
                    <div className="lm-grace-cell">
                      {shift.grace_period_minutes || 0} min
                    </div>
                   </td>
                  <td style={{width: '12%'}}>
                    <div className="lm-status-cell">
                      {shift.is_default ? (
                        <span className="lm-status-default">Default</span>
                      ) : (
                        <span className="lm-status-regular">Regular</span>
                      )}
                    </div>
                   </td>
                  <td style={{width: '13%'}}>
                    <div 
                      className="lm-primary-text lm-interactive-text"
                      onClick={() => handleViewEmployees(shift)}
                    >
                      View [{shift.employee_count || 0}]
                    </div>
                   </td>
                  <td style={{width: '30%'}}>
                    <div className="lm-actions-group">
                      {!shift.is_default && (
                        <button
                          onClick={() => handleSetAsDefault(shift)}
                          className="lm-action-btn lm-default-btn"
                          title="Set as Default Shift"
                        >
                          <FaStar /> Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleEditShift(shift)}
                        className="lm-action-btn lm-edit-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift.shift_id)}
                        className="lm-action-btn lm-delete-btn"
                        disabled={shift.is_default}
                        title={shift.is_default ? 'Cannot delete default shift' : 'Delete shift'}
                      >
                        Delete
                      </button>
                    </div>
                   </td>
                 </tr>
              ))}
            </tbody>
           </table>
        </div>

        {shiftData.length === 0 && (
          <div className="no-data">
            <div className="no-data-icon">⏰</div>
            <p>No shifts found</p>
            <p className="no-data-subtext">
              Create your first shift to get started with shift management.
            </p>
          </div>
        )}
      </div>

      {/* ==================== ADD/EDIT SHIFT MODAL ==================== */}
      {isShiftModalOpen && (
        <div className="lm-modal-backdrop">
          <div className="lm-modal-card">
            <div className="lm-modal-header">
              <h2 id="lm-shift-modal-title">
                {selectedShift ? 'Edit Shift' : 'Add New Shift'}
              </h2>
              <button 
                className="lm-close-button"
                onClick={() => setIsShiftModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="lm-form-container">
              <div className="lm-form-section">
                <h3 className="lm-section-heading">Shift Details</h3>
                <div className="lm-form-field">
                  <label>Shift Name *</label>
                  <input
                    type="text"
                    value={newShift.shift_name}
                    onChange={(e) => setNewShift(prev => ({...prev, shift_name: e.target.value}))}
                    placeholder="Enter shift name"
                  />
                </div>

                <div className="lm-form-row">
                  <div className="lm-form-field">
                    <label>Shift Code</label>
                    <input
                      type="text"
                      value={newShift.shift_code}
                      onChange={(e) => setNewShift(prev => ({...prev, shift_code: e.target.value}))}
                      placeholder="e.g., MORNING_01"
                    />
                  </div>
                  <div className="lm-form-field">
                    <label>Shift Type</label>
                    <select value={newShift.shift_type} onChange={(e) => setNewShift(prev => ({...prev, shift_type: e.target.value}))}>
                      <option>General</option><option>Morning</option><option>Evening</option><option>Night</option><option>Flexible</option><option>Rotational</option>
                    </select>
                  </div>
                </div>
                
                <div className="lm-form-row">
                  <div className="lm-form-field">
                    <label>Check In Time *</label>
                    <input
                      type="time"
                      value={newShift.check_in_time}
                      onChange={(e) => setNewShift(prev => ({...prev, check_in_time: e.target.value}))}
                    />
                  </div>
                  <div className="lm-form-field">
                    <label>Check Out Time *</label>
                    <input
                      type="time"
                      value={newShift.check_out_time}
                      onChange={(e) => setNewShift(prev => ({...prev, check_out_time: e.target.value}))}
                    />
                  </div>
                </div>

                <div className="lm-form-row">
                  <div className="lm-form-field">
                    <label>Minimum Hours</label>
                    <input
                      type="number"
                      value={newShift.min_hours}
                      onChange={(e) => setNewShift(prev => ({...prev, min_hours: parseInt(e.target.value) || 0}))}
                      min="0"
                    />
                  </div>
                  <div className="lm-form-field">
                    <label>Break Duration (minutes)</label>
                    <input
                      type="number"
                      value={newShift.break_duration}
                      onChange={(e) => setNewShift(prev => ({...prev, break_duration: parseInt(e.target.value) || 0}))}
                      min="0"
                    />
                  </div>
                </div>
                <div className="lm-form-field">
                  <label>Grace Period (minutes)</label>
                  <input
                    type="number"
                    value={newShift.grace_period_minutes}
                    onChange={(e) => setNewShift(prev => ({...prev, grace_period_minutes: parseInt(e.target.value) || 0}))}
                    placeholder="Enter grace period in minutes"
                    min="0"
                    step="1"
                  />
                  <small>
                    Employees arriving within this period after check-in time won't be marked late.
                    Set to 0 for no grace period.
                  </small>
                </div>

                <div className="lm-form-field">
                  <label>Description</label>
                  <textarea
                    value={newShift.description}
                    onChange={(e) => setNewShift(prev => ({...prev, description: e.target.value}))}
                    placeholder="Optional: Add a short description for this shift"
                    rows="2"
                  />
                </div>

                {!selectedShift && (
                  <div className="lm-form-field lm-checkbox-field">
                    <label className="lm-checkbox-label">
                      <input
                        type="checkbox"
                        checked={newShift.is_default}
                        onChange={(e) => setNewShift(prev => ({...prev, is_default: e.target.checked}))}
                      />
                      <span className="lm-checkbox-custom"></span>
                      Set as default shift for all employees
                    </label>
                    <small className="lm-checkbox-description">
                      When checked, this shift will be automatically assigned to all employees without specific shift assignments.
                    </small>
                  </div>
                )}
                
                <div className="lm-form-field">
                  <label>Assign Employees (Optional)</label>
                  <select
                    multiple
                    value={newShift.employees}
                    onChange={(e) => setNewShift(prev => ({
                      ...prev, 
                      employees: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                    style={{height: '120px'}}
                  >
                    {availableEmployees.map(employee => (
                      <option key={employee.employee_id} value={employee.employee_id}>
                        {employee.employee_name}
                        {employee.default_shift_name && ` (Default: ${employee.default_shift_name})`}
                      </option>
                    ))}
                  </select>
                  <small>Hold Ctrl/Cmd to select multiple employees. Employees will be assigned to this shift for today only.</small>
                </div>
              </div>

              <div className="lm-form-actions">
                <button
                  onClick={selectedShift ? handleUpdateShift : handleSaveShift}
                  className="lm-action-btn lm-confirm-btn"
                >
                  {selectedShift ? 'Update Shift' : 'Save Shift'}
                </button>
                <button
                  onClick={() => setIsShiftModalOpen(false)}
                  className="lm-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SET DEFAULT SHIFT MODAL ==================== */}
      {isSetDefaultModalOpen && shiftToSetDefault && (
        <div className="lm-modal-backdrop">
          <div className="lm-modal-card">
            <div className="lm-modal-header">
              <h2 id="lm-set-default-modal-title">Set as Default Shift</h2>
              <button 
                className="lm-close-button"
                onClick={() => setIsSetDefaultModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="lm-form-container">
              <div className="lm-warning-message">
                <FaExclamationTriangle className="lm-warning-icon" />
                <div className="lm-warning-content">
                  <h3>Are you sure you want to set this shift as default?</h3>
                  <p>
                    <strong>{shiftToSetDefault.shift_name}</strong> will become the default shift for all employees.
                    This means:
                  </p>
                  <ul>
                    <li>All employees without specific shift assignments will use this shift</li>
                    <li>New employees will automatically be assigned this shift</li>
                    <li>The current default shift will lose its default status</li>
                  </ul>
                </div>
              </div>

              <div className="lm-form-actions">
                <button
                  onClick={handleConfirmSetDefault}
                  className="lm-action-btn lm-confirm-btn"
                >
                  <FaStar /> Set as Default
                </button>
                <button
                  onClick={() => setIsSetDefaultModalOpen(false)}
                  className="lm-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EMPLOYEES IN SHIFT MODAL ==================== */}
      {isEmployeesModalOpen && selectedShift && (
        <div className="lm-modal-backdrop">
          <div className="lm-modal-card lm-large-modal">
            <div className="lm-modal-header">
              <h2 id="lm-employees-modal-title">
                Employees in {selectedShift.shift_name}
                {selectedShift.is_default && <span className="lm-default-badge">Default</span>}
              </h2>
              <button 
                className="lm-close-button"
                onClick={() => setIsEmployeesModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="lm-details-content">
              <div className="lm-form-section">
                <h3 className="lm-section-heading">Shift Details</h3>
                <div className="lm-details-grid">
                  <div className="lm-detail-item">
                    <label>Check In</label>
                    <span>{selectedShift.check_in_time}</span>
                  </div>
                  <div className="lm-detail-item">
                    <label>Check Out</label>
                    <span>{selectedShift.check_out_time}</span>
                  </div>
                  <div className="lm-detail-item">
                    <label>Grace Period</label>
                    <span>{selectedShift.grace_period_minutes || 0} minutes</span>
                  </div>
                  <div className="lm-detail-item">
                    <label>Status</label>
                    <span>
                      {selectedShift.is_default ? (
                        <span className="lm-status-default">Default Shift</span>
                      ) : (
                        <span className="lm-status-regular">Regular Shift</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lm-form-section">
                <h3 className="lm-section-heading">Employees in Shift (Today)</h3>
                <div className="lm-table-wrapper">
                  <table className="lm-data-table" style={{tableLayout: 'fixed', width: '100%'}}>
                    <thead>
                      <tr>
                        <th style={{width: '100%'}}>Employee Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedShift.employeesInShift && selectedShift.employeesInShift.length > 0 ? (
                        selectedShift.employeesInShift.map((employee) => (
                          <tr key={employee.employee_id}>
                            <td style={{width: '100%'}}>
                              <div className="lm-cell-content">
                                <div className="lm-primary-text">
                                  {employee.employee_name}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="1" style={{textAlign: 'center', color: 'var(--theme-text-muted,#666)'}}>
                            No employees assigned to this shift for today
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lm-form-actions">
                <button
                  onClick={() => setIsEmployeesModalOpen(false)}
                  className="lm-cancel-button"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ShiftRotation = () => (
  <div className="placeholder-content">
    <FaSyncAlt className="placeholder-icon" />
    <h3>Shift Rotation Engine</h3>
    <p>This feature is coming soon.</p>
    <p className="no-data-subtext">
      You will be able to create and manage automated shift rotation schedules for different teams and departments.
    </p>
  </div>
);

const RosterManagement = () => (
  <div className="placeholder-content">
    <FaTasks className="placeholder-icon" />
    <h3>Roster Management</h3>
    <p>This feature is coming soon.</p>
    <p className="no-data-subtext">
      This section will provide tools to build, manage, and publish weekly or monthly employee rosters.
    </p>
  </div>
);

const ShiftManagement = () => {
  const [activeTab, setActiveTab] = useState('templates');

  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'templates':
        return <ShiftTemplates />;
      case 'rotation':
        return <ShiftRotation />;
      case 'roster':
        return <RosterManagement />;
      default:
        return <ShiftTemplates />;
    }
  }, [activeTab]);

  return (
    <div className="lm-container" id="lm-main-container">
      <div className="lm-header">
        <h2 id="lm-main-title">Enterprise Shift Management</h2>
      </div>

      <div className="lm-tabs">
        <button onClick={() => setActiveTab('templates')} className={`lm-tab-btn ${activeTab === 'templates' ? 'active' : ''}`}>
          <FaCalendarAlt /> Shift Templates
        </button>
        <button onClick={() => setActiveTab('rotation')} className={`lm-tab-btn ${activeTab === 'rotation' ? 'active' : ''}`}>
          <FaSyncAlt /> Shift Rotation
        </button>
        <button onClick={() => setActiveTab('roster')} className={`lm-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}>
          <FaTasks /> Roster Management
        </button>
      </div>

      <div className="lm-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ShiftManagement;