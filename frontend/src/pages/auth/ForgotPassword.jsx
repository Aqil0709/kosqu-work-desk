import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import './Login.css';

const ForgotPassword = () => {
    const [formData, setFormData] = useState({
        email: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [id]: value
        }));
        setError('');
        setMessage('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (!formData.email) {
            setError('Please provide your registered email.');
            setLoading(false);
            return;
        }

        try {
            const response = await authAPI.forgotPassword({
                email: formData.email
            });
            setMessage(response.data.message || 'If an account exists, a reset link has been sent.');
        } catch (err) {
            console.error('Forgot password error:', err);
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
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
                        <p className="quote-text">Password Rescue Center</p>
                    </div>
                </div>
            </div>

            <div className="forms-container">
                {error && (
                    <div style={{ background: 'rgba(220, 38, 38, 0.9)', color: 'var(--card-bg,#fff)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', width: '100%', maxWidth: '28rem' }}>
                        {error}
                    </div>
                )}
                {message && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.9)', color: 'var(--card-bg,#fff)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', width: '100%', maxWidth: '28rem' }}>
                        {message}
                    </div>
                )}

                <div className="form-wrapper active">
                    <h2 className="form-title">Forgot Password?</h2>
                    <p className="form-subtitle">We'll send you a recovery link</p>

                    <form className="form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">
                                Registered Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                placeholder="Enter your email"
                                className="form-input glass-input"
                                value={formData.email}
                                onChange={handleInputChange}
                                disabled={loading}
                            />
                        </div>

                        <button
                            type="submit"
                            className="submit-btn btn-travel"
                            disabled={loading}
                        >
                            {loading ? 'SENDING LINK...' : 'SEND RESET LINK'}
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

export default ForgotPassword;
