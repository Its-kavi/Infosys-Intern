import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LocalToast from '../components/LocalToast';
import { useToast } from '../utils/useToast';
import styles from './Register.module.css';

const Register = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('PASSENGER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { toasts, showToast, removeToast } = useToast();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        vehicleModel: '',
        licensePlate: '',
        vehicleCapacity: 4
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const payload = { ...formData, role };

        // Remove vehicle fields if Passenger
        if (role === 'PASSENGER') {
            delete payload.vehicleModel;
            delete payload.licensePlate;
            delete payload.vehicleCapacity;
        }

        try {
            await registerUser(payload);
            showToast('Registration Successful! Please Login.', 'SUCCESS');
            setTimeout(() => navigate('/login'), 1500); // Delay navigation to show toast
        } catch (err) {
            if (err.message) {
                setError(err.message);
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.pageWrapper}>
            <LocalToast toasts={toasts} onRemove={removeToast} />
            
            <div className={styles.header}>
                <div className={styles.logo}>
                    <span className={styles.logoText}>RideConnect</span>
                </div>
                <div className={styles.loginLink}>
                    Already a member? <Link to="/login" className={styles.link}>Login</Link>
                </div>
            </div>

            <div className={styles.container}>
                <div className={styles.formCard}>
                    <div className={styles.formHeader}>
                        <h2>Let's get you started</h2>
                        <p className={styles.subtitle}>Enter the details to get started</p>
                    </div>

                    <div className={styles.roleToggle}>
                        <button
                            type="button"
                            className={`${styles.roleBtn} ${role === 'PASSENGER' ? styles.active : ''}`}
                            onClick={() => setRole('PASSENGER')}
                        >
                            Passenger
                        </button>
                        <button
                            type="button"
                            className={`${styles.roleBtn} ${role === 'DRIVER' ? styles.active : ''}`}
                            onClick={() => setRole('DRIVER')}
                        >
                            Driver
                        </button>
                    </div>

                    {error && <div className={styles.errorAlert}>{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGrid}>
                            <Input label="Full Name" id="name" name="name" placeholder="Enter your Full Name" value={formData.name} onChange={handleChange} required />
                            <Input label="Email Address" id="email" name="email" type="email" placeholder="Enter your Email Address" value={formData.email} onChange={handleChange} required />
                        </div>

                        <div className={styles.formGrid}>
                            <Input label="Password" id="password" name="password" type="password" placeholder="Enter your Password" value={formData.password} onChange={handleChange} required />
                            <Input label="Phone Number" id="phone" name="phone" placeholder="Enter your Phone Number" value={formData.phone} onChange={handleChange} required />
                        </div>

                        {role === 'DRIVER' && (
                            <div className={styles.driverFields}>
                                <h3 className={styles.sectionTitle}>Vehicle Details</h3>
                                <div className={styles.formGrid}>
                                    <Input label="Vehicle Model" id="vehicleModel" name="vehicleModel" placeholder="Enter Vehicle Model" value={formData.vehicleModel} onChange={handleChange} required />
                                    <Input label="License Plate" id="licensePlate" name="licensePlate" placeholder="Enter License Plate" value={formData.licensePlate} onChange={handleChange} required />
                                </div>
                                <div className={styles.formGrid}>
                                    <Input label="Vehicle Capacity" id="vehicleCapacity" name="vehicleCapacity" type="number" min="1" max="10" placeholder="Enter Capacity" value={formData.vehicleCapacity} onChange={handleChange} required />
                                    <div></div>
                                </div>
                            </div>
                        )}

                        <Button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
