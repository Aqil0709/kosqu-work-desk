import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import './MOM.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const MOM = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    meeting_date: '',
    location: '',
    meeting_type: 'Regular',
    attendees: [],
    agenda: '',
    notes: ''
  });
  const [actionItems, setActionItems] = useState([]);
  const [newActionItem, setNewActionItem] = useState({
    description: '',
    assigned_to: '',
    due_date: '',
    priority: 'medium'
  });

  const isAdmin = user?.position === 'admin';

  useEffect(() => {
    loadMeetings();
  }, []);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/mom`, { headers: authH() });
      setMeetings(res.data.meetings || []);
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActionItems = async (momId) => {
    try {
      const res = await axios.get(`${API_BASE}/api/mom/${momId}/action-items`, { headers: authH() });
      setActionItems(res.data.action_items || []);
    } catch (err) {
      console.error('Failed to load action items:', err);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.meeting_date) {
      alert('Please fill required fields');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/mom`, formData, { headers: authH() });
      alert('Meeting created successfully');
      setIsCreateModalOpen(false);
      setFormData({
        title: '',
        meeting_date: '',
        location: '',
        meeting_type: 'Regular',
        attendees: [],
        agenda: '',
        notes: ''
      });
      await loadMeetings();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create meeting');
    }
  };

  const handleAddActionItem = async (e) => {
    e.preventDefault();
    if (!selectedMeeting || !newActionItem.description) {
      alert('Please fill required fields');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/mom/${selectedMeeting.id}/action-items`, newActionItem, { headers: authH() });
      setNewActionItem({ description: '', assigned_to: '', due_date: '', priority: 'medium' });
      await loadActionItems(selectedMeeting.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add action item');
    }
  };

  const handleUpdateActionItem = async (itemId, status) => {
    try {
      await axios.put(`${API_BASE}/api/mom/action-items/${itemId}`, { status }, { headers: authH() });
      await loadActionItems(selectedMeeting.id);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update action item');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#ef4444',
      in_progress: '#f59e0b',
      completed: '#10b981',
      cancelled: 'var(--theme-text-muted,#64748b)'
    };
    return colors[status] || '#6366f1';
  };

  const getPriorityLabel = (priority) => {
    const labels = { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' };
    return labels[priority] || priority;
  };

  if (loading) return <div className="mom-section">Loading...</div>;

  return (
    <div className="mom-section">
      <div className="mom-header">
        <h2>Minutes of Meeting</h2>
        {isAdmin && (
          <button className="mom-btn-create" onClick={() => setIsCreateModalOpen(true)}>
            + New Meeting
          </button>
        )}
      </div>

      {/* Meetings Grid */}
      <div className="mom-grid">
        {meetings.map(meeting => (
          <div key={meeting.id} className="mom-card" onClick={() => {
            setSelectedMeeting(meeting);
            loadActionItems(meeting.id);
          }}>
            <div className="mom-card-header">
              <div>
                <h3>{meeting.title}</h3>
                <p className="mom-date">{new Date(meeting.meeting_date).toLocaleDateString()}</p>
              </div>
              <span className="mom-status" style={{ background: meeting.status === 'published' ? '#10b98133' : '#f5940033' }}>
                {meeting.status}
              </span>
            </div>
            {meeting.location && <p className="mom-location">📍 {meeting.location}</p>}
            {meeting.first_name && <p className="mom-organizer">By {meeting.first_name} {meeting.last_name}</p>}
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="mom-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="mom-modal" onClick={e => e.stopPropagation()}>
            <div className="mom-modal-header">
              <h2>New Meeting Minutes</h2>
              <button className="mom-close" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMeeting} className="mom-form">
              <div className="mom-form-row">
                <div className="mom-form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    required
                  />
                </div>
                <div className="mom-form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={formData.meeting_date}
                    onChange={e => setFormData({...formData, meeting_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="mom-form-row">
                <div className="mom-form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    placeholder="Office / Zoom / Hybrid"
                  />
                </div>
                <div className="mom-form-group">
                  <label>Type</label>
                  <select value={formData.meeting_type} onChange={e => setFormData({...formData, meeting_type: e.target.value})}>
                    <option>Regular</option>
                    <option>Standup</option>
                    <option>Planning</option>
                    <option>Retrospective</option>
                    <option>Executive</option>
                  </select>
                </div>
              </div>

              <div className="mom-form-group">
                <label>Agenda</label>
                <textarea
                  value={formData.agenda}
                  onChange={e => setFormData({...formData, agenda: e.target.value})}
                  placeholder="Meeting agenda points..."
                  rows="4"
                />
              </div>

              <div className="mom-form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  placeholder="Meeting notes..."
                  rows="4"
                />
              </div>

              <div className="mom-form-actions">
                <button type="button" className="mom-btn-cancel" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="mom-btn-submit">Create Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail View */}
      {selectedMeeting && (
        <div className="mom-modal-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="mom-modal mom-modal-large" onClick={e => e.stopPropagation()}>
            <div className="mom-modal-header">
              <h2>{selectedMeeting.title}</h2>
              <button className="mom-close" onClick={() => setSelectedMeeting(null)}>✕</button>
            </div>

            <div className="mom-detail">
              <div className="mom-detail-info">
                <div><strong>Date:</strong> {new Date(selectedMeeting.meeting_date).toLocaleDateString()}</div>
                <div><strong>Type:</strong> {selectedMeeting.meeting_type}</div>
                {selectedMeeting.location && <div><strong>Location:</strong> {selectedMeeting.location}</div>}
                <div><strong>Organizer:</strong> {selectedMeeting.first_name} {selectedMeeting.last_name}</div>
              </div>

              {selectedMeeting.agenda && (
                <div className="mom-section-block">
                  <h3>Agenda</h3>
                  <p>{selectedMeeting.agenda}</p>
                </div>
              )}

              {selectedMeeting.notes && (
                <div className="mom-section-block">
                  <h3>Notes</h3>
                  <p>{selectedMeeting.notes}</p>
                </div>
              )}

              <div className="mom-section-block">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3>Action Items</h3>
                  {isAdmin && <button className="mom-btn-small" onClick={() => document.querySelector('.mom-action-form').style.display = 'block'}>+ Add Item</button>}
                </div>

                <form onSubmit={handleAddActionItem} className="mom-action-form" style={{ display: 'none', padding: '12px', background: 'var(--theme-bg-muted, #f8fafc)', borderRadius: '8px', marginBottom: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                    <input
                      type="text"
                      placeholder="Action item description"
                      value={newActionItem.description}
                      onChange={e => setNewActionItem({...newActionItem, description: e.target.value})}
                      required
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--card-border, #e2e8f0)' }}
                    />
                    <input
                      type="date"
                      value={newActionItem.due_date}
                      onChange={e => setNewActionItem({...newActionItem, due_date: e.target.value})}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--card-border, #e2e8f0)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={newActionItem.priority} onChange={e => setNewActionItem({...newActionItem, priority: e.target.value})} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--card-border, #e2e8f0)' }}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                    <button type="submit" className="mom-btn-submit" style={{ padding: '8px 16px' }}>Add</button>
                    <button type="button" onClick={e => e.target.closest('.mom-action-form').style.display = 'none'} style={{ padding: '8px 16px', background: 'var(--theme-bg-muted, #f8fafc)', border: '1px solid var(--card-border, #e2e8f0)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                </form>

                {actionItems.length === 0 ? (
                  <p style={{ color: 'var(--theme-text-muted, #64748b)', fontSize: '13px' }}>No action items</p>
                ) : (
                  <div className="mom-action-items">
                    {actionItems.map(item => (
                      <div key={item.id} className="mom-action-item" style={{ borderLeft: `3px solid ${getStatusColor(item.status)}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 4px', fontWeight: '600', color: 'var(--theme-text-strong, #0f172a)' }}>{item.description}</p>
                            <p style={{ margin: '0', fontSize: '12px', color: 'var(--theme-text-muted, #64748b)' }}>
                              {getPriorityLabel(item.priority)} · Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'Not set'}
                              {item.first_name && ` · Assigned to ${item.first_name}`}
                            </p>
                          </div>
                          {isAdmin && (
                            <select
                              value={item.status}
                              onChange={e => handleUpdateActionItem(item.id, e.target.value)}
                              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--card-border, #e2e8f0)', fontSize: '12px', color: getStatusColor(item.status) }}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mom-modal-actions">
                <button className="mom-btn-cancel" onClick={() => setSelectedMeeting(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MOM;

