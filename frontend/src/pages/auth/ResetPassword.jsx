import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Login.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [id]: value
        }));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.resetPassword(token, { newPassword: formData.newPassword });
            setSuccess(response.data.message || 'Password has been safely reset!');
            // clear form
            setFormData({ newPassword: '', confirmPassword: '' });
            
            setTimeout(() => {
                navigate('/login');
            }, 3000);
            
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.message || 'Token is invalid or has expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="travel-login-container">
            <div className="company-content">
                <div className="company-text">
                    <h1 className="company-title">WORK DESK</h1>
                    <div className="company-quote">
                        <p className="quote-text">Create a secure new path</p>
                    </div>
                </div>
            </div>

            <div className="forms-container">
                {error && (
                    <div style={{ background: 'rgba(220, 38, 38, 0.9)', color: 'var(--card-bg,#fff)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', width: '100%', maxWidth: '28rem' }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.9)', color: 'var(--card-bg,#fff)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', width: '100%', maxWidth: '28rem' }}>
                        {success} Redirecting to login...
                    </div>
                )}

                <div className="form-wrapper glass-form active">
                    <h2 className="form-title">Reset Your Password</h2>
                    <p className="form-subtitle">Choose a new, strong password</p>

                    <form className="form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="newPassword" className="form-label">
                                New Password
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                placeholder="********"
                                className="form-input glass-input"
                                value={formData.newPassword}
                                onChange={handleInputChange}
                                disabled={loading || success}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                id="confirmPassword"
                                placeholder="********"
                                className="form-input glass-input"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                disabled={loading || success}
                            />
                        </div>

                        <button
                            type="submit"
                            className="submit-btn btn-travel"
                            disabled={loading || success}
                        >
                            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
                        </button>
                    </form>
                    
                    <div className="form-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
                        <Link to="/login" className="forgot-link">
                            &larr; Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
