import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/api';
import Button from '../components/ui/Button';
import styles from './Login.module.css';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [message, setMessage] = useState('');
    const hasCalled = useRef(false);

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Invalid or missing verification token');
                return;
            }

            console.log('Verifying email with token:', token);

            try {
                const response = await verifyEmail(token);
                console.log('Verification response:', response);
                setStatus('success');
                setMessage(response.message || 'Email verified successfully! You can now login.');
            } catch (err) {
                console.error('Verification error:', err);
                setStatus('error');
                setMessage(err.message || 'Failed to verify email. The link may be expired or invalid.');
            }
        };

        if (!hasCalled.current) {
            verify();
            hasCalled.current = true;
        }
    }, [token]);

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        {status === 'loading' && (
                            <>
                                <Loader size={64} style={{ color: '#6366f1', margin: '0 auto 1rem', animation: 'spin 1s linear infinite' }} />
                                <h2>Verifying Email...</h2>
                                <p>Please wait while we verify your email address.</p>
                            </>
                        )}
                        
                        {status === 'success' && (
                            <>
                                <CheckCircle size={64} style={{ color: '#10b981', margin: '0 auto 1rem' }} />
                                <h2>Email Verified!</h2>
                                <p>{message}</p>
                            </>
                        )}
                        
                        {status === 'error' && (
                            <>
                                <XCircle size={64} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
                                <h2>Verification Failed</h2>
                                <p>{message}</p>
                            </>
                        )}
                    </div>

                    {status !== 'loading' && (
                        <div style={{ marginTop: '2rem' }}>
                            {status === 'success' ? (
                                <Button 
                                    className={styles.submitBtn} 
                                    onClick={() => navigate('/login')}
                                >
                                    Go to Login
                                </Button>
                            ) : (
                                <Button 
                                    className={styles.submitBtn} 
                                    onClick={() => navigate('/register')}
                                >
                                    Back to Register
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default VerifyEmail;
