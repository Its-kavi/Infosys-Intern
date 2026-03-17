import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser, forgotPassword } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import styles from './Login.module.css';
import { useToast } from '../utils/useToast';
import LocalToast from '../components/LocalToast';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { toasts, showToast, removeToast } = useToast();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await loginUser(formData.email, formData.password);
            const { token } = data;

            // Prioritize data from response body, fallback to decoding token
            let role = data.role;
            let name = data.name || data.user?.name;
            let email = data.email || data.user?.email || formData.email;

            if (token) {
                try {
                    // Decode the JWT payload (Base64 decode the middle part)
                    const payload = JSON.parse(atob(token.split('.')[1]));

                    // If backend didn't send role in body, grab from token
                    if (!role) {
                        role = payload.role || payload.authorities?.[0] || 'PASSENGER';
                        if (role.startsWith('ROLE_')) role = role.replace('ROLE_', '');
                    }

                    // If backend didn't send name in body, grab from token claims
                    if (!name) {
                        // We added "name" key in JwtUtil.java
                        name = payload.name || payload.sub;
                    }

                    // If backend didn't send email, grab from token or use login email
                    if (!email) {
                        email = payload.email || payload.sub || formData.email;
                    }

                    console.log("Decoded User:", { name, email, role });
                } catch (e) {
                    console.error("Failed to decode token", e);
                }
            }

            // Extract verification status with explicit handling
            // If data.isVerified is undefined (e.g. for Passenger), default to false
            const isVerified = data.isVerified !== undefined ? data.isVerified : (data.user?.isVerified !== undefined ? data.user.isVerified : false);

            // Update Global Auth Context
            login(token, role, name, email, isVerified);

            // Redirect based on Role
            showToast("Successfully Logged In!", "SUCCESS");
            setTimeout(() => {
                if (role === 'ADMIN') {
                    navigate('/admin-dashboard');
                } else if (role === 'DRIVER') {
                    navigate('/driver-dashboard');
                } else {
                    navigate('/passenger-dashboard');
                }
            }, 1000);

        } catch (err) {
            const errorMessage = err.message || 'Login failed. Please try again.';
            // Check if error is related to email verification
            if (errorMessage.toLowerCase().includes('email') && 
                (errorMessage.toLowerCase().includes('verify') || 
                 errorMessage.toLowerCase().includes('verified') ||
                 errorMessage.toLowerCase().includes('verification'))) {
                setError('⚠️ Please verify your email before logging in. Check your inbox for the verification link.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setForgotLoading(true);
        try {
            await forgotPassword(forgotEmail);
            showToast('Password reset link sent to your email!', 'SUCCESS');
            setShowForgotPassword(false);
            setForgotEmail('');
        } catch (err) {
            showToast(err.message || 'Failed to send reset link', 'ERROR');
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <h2>Welcome Back</h2>
                        <p>Login to continue to RideConnect</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <Input
                            label="Email Address"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="name@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Password"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />

                        {error && <div className={styles.errorAlert}>{error}</div>}

                        <div className={styles.forgotPasswordLink}>
                            <button 
                                type="button" 
                                onClick={() => setShowForgotPassword(true)}
                                className={styles.forgotBtn}
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <Button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </Button>
                    </form>

                    <p className={styles.footerText}>
                        Don't have an account? <Link to="/register" className={styles.link}>Sign up</Link>
                    </p>
                </div>
            </div>

            {/* Forgot Password Modal - Moved outside login form to prevent event bubbling */}
            {showForgotPassword && (
                <div className={styles.modalOverlay} onClick={() => setShowForgotPassword(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Reset Password</h2>
                        <p className={styles.modalText}>Enter your email address and we'll send you a link to reset your password.</p>
                        
                        <form onSubmit={handleForgotPassword}>
                            <Input
                                label="Email Address"
                                id="forgotEmail"
                                name="forgotEmail"
                                type="email"
                                placeholder="name@example.com"
                                value={forgotEmail}
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                            />
                            
                            <div className={styles.modalActions}>
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setShowForgotPassword(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={forgotLoading}>
                                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <LocalToast toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default Login;