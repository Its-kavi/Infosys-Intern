import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import styles from './Login.module.css';
import { useToast } from '../utils/useToast';
import LocalToast from '../components/LocalToast';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (!token) {
            setError('Invalid or missing reset token');
            return;
        }

        setLoading(true);
        try {
            await resetPassword(token, newPassword);
            showToast('Password reset successful! Please login.', 'SUCCESS');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className={styles.pageWrapper}>
                <div className={styles.container}>
                    <div className={styles.formCard}>
                        <div className={styles.formHeader}>
                            <h2>Invalid Link</h2>
                            <p>This password reset link is invalid or has expired.</p>
                        </div>
                        <Button onClick={() => navigate('/login')}>Go to Login</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <h2>Reset Password</h2>
                        <p>Enter your new password below</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <Input
                            label="New Password"
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <Input
                            label="Confirm Password"
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        {error && <div className={styles.errorAlert}>{error}</div>}

                        <Button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>
                </div>
            </div>
            <LocalToast toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default ResetPassword;
