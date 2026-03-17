import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, getMyReviews, uploadImage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LocalToast from '../components/LocalToast';
import { useToast } from '../utils/useToast';
import styles from './Profile.module.css';
import { Star, Camera, Car, User } from 'lucide-react';

const Profile = () => {
    const navigate = useNavigate();
    const { user: authUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [uploading, setUploading] = useState(false); // Shared loading state for uploads
    const [message, setMessage] = useState({ type: '', text: '' });
    const [reviews, setReviews] = useState([]);
    const { toasts, showToast, removeToast } = useToast();

    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', role: '',
        vehicleModel: '', licensePlate: '', vehicleCapacity: '',
        profilePictureUrl: '', bio: '', carImageUrl: '', carFeatures: '',
        currentPassword: '', newPassword: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profile = await getProfile();
                const reviewData = await getMyReviews();
                setFormData({
                    ...profile,
                    currentPassword: '', newPassword: '',
                    carFeatures: profile.carFeatures || '',
                    bio: profile.bio || '',
                    profilePictureUrl: profile.profilePictureUrl || '',
                    carImageUrl: profile.carImageUrl || '',
                    vehicleModel: profile.vehicleModel || '',
                    licensePlate: profile.licensePlate || '',
                    vehicleCapacity: profile.vehicleCapacity || ''
                });
                setReviews(reviewData || []);
            } catch (err) {
                console.error(err);
            } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Handle Profile Pic Upload
    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            setFormData(prev => ({ ...prev, profilePictureUrl: url }));
            showToast("Avatar uploaded successfully", "SUCCESS");
        } catch (err) {
            showToast("Avatar upload failed: " + err.message, "ERROR");
        } finally {
            setUploading(false);
        }
    };

    // Handle Car Image Upload
    const handleCarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadImage(file);
            setFormData(prev => ({ ...prev, carImageUrl: url }));
            showToast("Car image uploaded successfully", "SUCCESS");
        } catch (err) {
            showToast("Car image upload failed: " + err.message, "ERROR");
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUpdating(true);
        setMessage({ type: '', text: '' });
        
        try {
            await updateProfile(formData);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Update failed.' });
        } finally { setUpdating(false); }
    };

    if (loading) return <div className="container" style={{padding: '2rem'}}>Loading...</div>;

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <LocalToast toasts={toasts} onRemove={removeToast} />
            <div className="container">
                <h1 className={styles.pageTitle}>Profile Settings</h1>
                {message.text && <div className={`${styles.alert} ${styles[message.type]}`}>{message.text}</div>}
                
                <form onSubmit={handleSubmit} className={styles.profileGrid}>
                    {/* LEFT COLUMN: Identity & Auth */}
                    <div className={styles.leftColumn}>
                        <div className={styles.card}>
                            <div className={styles.avatarSection}>
                                <div className={styles.avatar}>
                                    {formData.profilePictureUrl ? (
                                        <img src={formData.profilePictureUrl} alt="Profile" />
                                    ) : (
                                        <User size={48} strokeWidth={1.5} />
                                    )}
                                </div>
                                <label htmlFor="avatar-upload" className={styles.uploadBtn}>
                                    <Camera size={16} /> Change Photo
                                </label>
                                <input 
                                    id="avatar-upload" 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleAvatarUpload} 
                                    style={{display: 'none'}} 
                                    disabled={uploading}
                                />
                            </div>
                            
                            <Input label="Full Name" name="name" value={formData.name} onChange={handleChange} />
                            <Input label="Email" value={formData.email} disabled className={styles.disabledInput} />
                            <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} />
                            
                            <div className={styles.divider}></div>
                            
                            <div className={styles.passwordSection}>
                                <h3>Security</h3>
                                <Input label="New Password" name="newPassword" type="password" value={formData.newPassword} onChange={handleChange} placeholder="Change password" />
                                {formData.newPassword && (
                                    <Input label="Current Password (Required)" name="currentPassword" type="password" value={formData.currentPassword} onChange={handleChange} required />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Details & Car */}
                    <div className={styles.rightColumn}>
                        <div className={styles.card}>
                            <h3>About Me</h3>
                            <textarea className={styles.textarea} name="bio" value={formData.bio} onChange={handleChange} placeholder="Tell us about yourself..." rows={3} />
                            
                            {formData.role === 'DRIVER' && (
                                <div className={styles.driverSection}>
                                    <h3>Vehicle Details</h3>
                                    <div className={styles.row}>
                                        <Input label="Model" name="vehicleModel" value={formData.vehicleModel} onChange={handleChange} />
                                        <Input label="Plate" name="licensePlate" value={formData.licensePlate} onChange={handleChange} />
                                    </div>
                                    <Input label="Capacity" name="vehicleCapacity" type="number" value={formData.vehicleCapacity} onChange={handleChange} />
                                    
                                    {/* Car Image Upload Section */}
                                    <div className={styles.carUploadContainer}>
                                        <label className={styles.label}>Car Photo</label>
                                        <div className={styles.carPreview}>
                                            {formData.carImageUrl ? (
                                                <img src={formData.carImageUrl} alt="Car" />
                                            ) : (
                                                <div className={styles.carPlaceholder}>
                                                    <Car size={32} />
                                                    <span>No image</span>
                                                </div>
                                            )}
                                        </div>
                                        <label htmlFor="car-upload" className={styles.uploadBtn}>
                                            <Camera size={16} /> {formData.carImageUrl ? "Change Car Photo" : "Upload Car Photo"}
                                        </label>
                                        <input 
                                            id="car-upload" 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleCarUpload} 
                                            style={{display: 'none'}} 
                                            disabled={uploading}
                                        />
                                    </div>

                                    <Input label="Features (e.g. AC, WiFi)" name="carFeatures" value={formData.carFeatures} onChange={handleChange} />
                                </div>
                            )}
                        </div>

                        {/* Reviews Section */}
                        <div className={styles.card}>
                            <h3>My Reviews ({reviews.length})</h3>
                            <div className={styles.reviewList}>
                                {reviews.length === 0 ? <p className={styles.empty}>No reviews yet.</p> : reviews.map(r => (
                                    <div key={r.id} className={styles.reviewItem}>
                                        <div className={styles.reviewHeader}>
                                            <strong>{r.reviewer?.name}</strong>
                                            <div className={styles.stars}>{Array(r.rating).fill().map((_, i) => <Star key={i} size={12} fill="#ffc107" color="#ffc107"/>)}</div>
                                        </div>
                                        <p>"{r.comment}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={styles.footerActions}>
                         <Button type="submit" disabled={updating || uploading} style={{width: '200px'}}>
                            {updating ? 'Saving...' : uploading ? 'Uploading...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;