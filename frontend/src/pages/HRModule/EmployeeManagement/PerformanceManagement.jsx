import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../../contexts/AuthContext';
import './PerformanceManagement.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
const authH = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const RATING_CATEGORIES = [
  'Quality of Work',
  'Punctuality & Attendance',
  'Teamwork & Collaboration',
  'Communication',
  'Initiative & Proactiveness'
];

const PerformanceManagement = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    period_label: '',
    period_start: '',
    period_end: '',
    categories: RATING_CATEGORIES.map(name => ({ name, rating: 3, comments: '' })),
    comments: ''
  });

  const isAdmin = user?.position === 'admin';

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/performance`, { headers: authH() });
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    if (!formData.employee_id || !formData.period_label || !formData.period_start) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await axios.post(`${API_BASE}/api/performance`, formData, { headers: authH() });
      alert('Review created successfully');
      setIsModalOpen(false);
      setFormData({
        employee_id: '',
        period_label: '',
        period_start: '',
        period_end: '',
        categories: RATING_CATEGORIES.map(name => ({ name, rating: 3, comments: '' })),
        comments: ''
      });
      await loadReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create review');
    }
  };

  const handleUpdateReview = async (status) => {
    if (!selectedReview) return;
    try {
      await axios.put(`${API_BASE}/api/performance/${selectedReview.id}`,
        {
          categories: selectedReview.categories,
          comments: selectedReview.comments,
          status
        },
        { headers: authH() }
      );
      alert(`Review ${status}`);
      setSelectedReview(null);
      await loadReviews();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update review');
    }
  };

  const getRatingColor = (rating) => {
    if (rating < 3) return '#ef4444'; // red
    if (rating < 4) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  const getRatingLabel = (rating) => {
    if (rating < 2) return 'Poor';
    if (rating < 3) return 'Below Average';
    if (rating < 4) return 'Average';
    if (rating < 5) return 'Good';
    return 'Excellent';
  };

  if (loading) return <div className="perf-section">Loading...</div>;

  return (
    <div className="perf-section">
      <div className="perf-header">
        <h2>Performance Reviews</h2>
        {isAdmin && (
          <button className="perf-btn-create" onClick={() => setIsModalOpen(true)}>
            + New Review
          </button>
        )}
      </div>

      {/* Reviews List */}
      <div className="perf-grid">
        {reviews.map(review => (
          <div key={review.id} className="perf-card" onClick={() => setSelectedReview(review)}>
            <div className="perf-card-header">
              <div>
                <h3>{review.first_name} {review.last_name}</h3>
                <p className="perf-period">{review.period_label}</p>
              </div>
              <div className="perf-rating" style={{ color: getRatingColor(review.overall_rating) }}>
                {review.overall_rating}/5
              </div>
            </div>
            <div className="perf-card-body">
              <p className="perf-label">{getRatingLabel(review.overall_rating)}</p>
              <div className="perf-badge" style={{ background: getRatingColor(review.overall_rating) + '20', color: getRatingColor(review.overall_rating) }}>
                {review.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="perf-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="perf-modal" onClick={e => e.stopPropagation()}>
            <div className="perf-modal-header">
              <h2>New Performance Review</h2>
              <button className="perf-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateReview} className="perf-form">
              <div className="perf-form-group">
                <label>Employee ID *</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={e => setFormData({...formData, employee_id: e.target.value})}
                  placeholder="EMP..."
                  required
                />
              </div>

              <div className="perf-form-row">
                <div className="perf-form-group">
                  <label>Review Period *</label>
                  <input
                    type="text"
                    value={formData.period_label}
                    onChange={e => setFormData({...formData, period_label: e.target.value})}
                    placeholder="Q1 2026 / Jan-Mar 2026"
                    required
                  />
                </div>
                <div className="perf-form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={e => setFormData({...formData, period_start: e.target.value})}
                    required
                  />
                </div>
                <div className="perf-form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={e => setFormData({...formData, period_end: e.target.value})}
                  />
                </div>
              </div>

              <div className="perf-categories">
                <h3>Rating Categories (1-5 stars)</h3>
                {formData.categories.map((cat, idx) => (
                  <div key={idx} className="perf-category">
                    <label>{cat.name}</label>
                    <div className="perf-rating-input">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          type="button"
                          className={`perf-star ${cat.rating >= star ? 'filled' : ''}`}
                          onClick={() => {
                            const newCats = [...formData.categories];
                            newCats[idx].rating = star;
                            setFormData({...formData, categories: newCats});
                          }}
                        >
                          ☁...
                        </button>
                      ))}
                      <span className="perf-rating-value">{cat.rating}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="perf-form-group">
                <label>Comments</label>
                <textarea
                  value={formData.comments}
                  onChange={e => setFormData({...formData, comments: e.target.value})}
                  placeholder="Additional feedback..."
                  rows="4"
                />
              </div>

              <div className="perf-form-actions">
                <button type="button" className="perf-btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="perf-btn-submit">Create Review</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedReview && (
        <div className="perf-modal-overlay" onClick={() => setSelectedReview(null)}>
          <div className="perf-modal perf-modal-large" onClick={e => e.stopPropagation()}>
            <div className="perf-modal-header">
              <h2>Review: {selectedReview.first_name} {selectedReview.last_name}</h2>
              <button className="perf-modal-close" onClick={() => setSelectedReview(null)}>✕</button>
            </div>
            <div className="perf-detail">
              <div className="perf-detail-header">
                <div>
                  <p><strong>Period:</strong> {selectedReview.period_label}</p>
                  <p><strong>Status:</strong> {selectedReview.status}</p>
                </div>
                <div className="perf-detail-rating" style={{ color: getRatingColor(selectedReview.overall_rating) }}>
                  <div style={{ fontSize: '48px', fontWeight: 'bold' }}>{selectedReview.overall_rating}</div>
                  <div>{getRatingLabel(selectedReview.overall_rating)}</div>
                </div>
              </div>

              <div className="perf-categories-detail">
                <h3>Ratings Breakdown</h3>
                {selectedReview.categories?.map((cat, idx) => (
                  <div key={idx} className="perf-category-detail">
                    <div className="perf-cat-name">{cat.category_name}</div>
                    <div className="perf-cat-rating" style={{ color: getRatingColor(cat.rating) }}>
                      {Array(5).fill('☁...').map((s, i) => (
                        <span key={i} style={{ opacity: i < cat.rating ? 1 : 0.2 }}>☁...</span>
                      ))} {cat.rating}/5
                    </div>
                    {cat.comments && <div className="perf-cat-comment">{cat.comments}</div>}
                  </div>
                ))}
              </div>

              {selectedReview.comments && (
                <div className="perf-comments">
                  <h3>Overall Comments</h3>
                  <p>{selectedReview.comments}</p>
                </div>
              )}

              <div className="perf-detail-actions">
                {isAdmin && selectedReview.status === 'draft' && (
                  <>
                    <button className="perf-btn-submit" onClick={() => handleUpdateReview('submitted')}>
                      Submit Review
                    </button>
                    <button className="perf-btn-cancel" onClick={() => setSelectedReview(null)}>
                      Close
                    </button>
                  </>
                )}
                {!isAdmin && selectedReview.status === 'submitted' && (
                  <>
                    <button className="perf-btn-submit" onClick={() => handleUpdateReview('acknowledged')}>
                      Acknowledge
                    </button>
                    <button className="perf-btn-cancel" onClick={() => setSelectedReview(null)}>
                      Close
                    </button>
                  </>
                )}
                {selectedReview.status === 'acknowledged' && (
                  <button className="perf-btn-cancel" onClick={() => setSelectedReview(null)}>
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceManagement;

