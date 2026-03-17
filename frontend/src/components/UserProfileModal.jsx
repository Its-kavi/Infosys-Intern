import React, { useEffect, useState } from 'react';
import { getUserPublicProfile } from '../services/api';
import styles from './UserProfileModal.module.css';
import { Star, Phone, X, Car, User, Shield } from 'lucide-react';
import Button from './ui/Button';

const UserProfileModal = ({ userId, onClose, hasBooked = false }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getUserPublicProfile(userId);
                setProfile(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (userId) fetchProfile();
    }, [userId]);

    if (!userId) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className={styles.closeBtn}><X size={20} /></button>

                {loading ? (
                    <div className={styles.loading}>Loading profile...</div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : profile ? (
                    <div className={styles.content}>
                        {/* Header: Avatar & Name */}
                        <div className={styles.header}>
                            <div className={styles.avatar}>
                                {profile.profilePictureUrl ? (
                                    <img src={profile.profilePictureUrl} alt={profile.name} />
                                ) : (
                                    <User size={40} />
                                )}
                            </div>
                            <div className={styles.basicInfo}>
                                <h2>{profile.name}</h2>
                                <div className={styles.badges}>
                                    {profile.   berSince && (
                                        <span className={styles.memberSinceBadge}>Member since {profile.memberSince}</span>
                                    )}
                                    {profile.role === 'DRIVER' && (
                                        <div className={styles.rating}>
                                            <Star size={14} fill="#ffc107" color="#ffc107" />
                                            <span>
                                                {profile.totalReviews > 0
                                                    ? `${profile.averageRating} (${profile.totalReviews} reviews)`
                                                    : "New Driver"}
                                            </span>
                                        </div>
                                    )}
                                    {profile.role === 'PASSENGER' && (
                                        <div className={styles.rating}>
                                            <Star size={14} fill="#ffc107" color="#ffc107" />
                                            <span>
                                                {profile.totalReviews > 0
                                                    ? `${profile.averageRating} (${profile.totalReviews} ratings)`
                                                    : "New Member"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
                            </div>
                        </div>

                        <div className={styles.divider}></div>

                        {/* Contact Info */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionTitle}>Contact Info</h3>
                            {hasBooked ? (
                                <div className={styles.infoRow}>
                                    <Phone size={16} className={styles.icon} />
                                    <span>{profile.phone}</span>
                                </div>
                            ) : (
                                <div className={styles.privacyNote}>
                                    <Shield size={14} /> Contact details visible only after booking this ride.
                                </div>
                            )}
                        </div>

                        {/* Driver Specifics */}
                        {profile.role === 'DRIVER' && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>Vehicle Details</h3>
                                <div className={styles.carCard}>
                                    {profile.carImageUrl ? (
                                        <img src={profile.carImageUrl} alt="Car" className={styles.carImg} />
                                    ) : (
                                        <div className={styles.carPlaceholder}><Car size={32} /></div>
                                    )}
                                    <div className={styles.carInfo}>
                                        <h4>Vehicle: {profile.vehicleModel || "Standard Car"}</h4>
                                        {profile.licensePlate && <small className={styles.plate}>{profile.licensePlate}</small>}
                                        {profile.carFeatures && (
                                            <div className={styles.features}>
                                                {profile.carFeatures.split(',').map((f, i) => (
                                                    <span key={i} className={styles.featureTag}>{f.trim()}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Reviews Section */}
                        {profile.reviews && profile.reviews.length > 0 && (
                            <div className={styles.section}>
                                <h3 className={styles.sectionTitle}>Reviews ({profile.reviews.length})</h3>
                                <div className={styles.reviewsList}>
                                    {profile.reviews.map((review, index) => (
                                        <div key={index} className={styles.reviewCard}>
                                            <div className={styles.reviewHeader}>
                                                <div className={styles.reviewerInfo}>
                                                    <div className={styles.reviewerAvatar}>
                                                        {review.reviewerProfilePicture ? (
                                                            <img src={review.reviewerProfilePicture} alt={review.reviewerName} />
                                                        ) : (
                                                            <User size={20} />
                                                        )}
                                                    </div>
                                                    <div className={styles.reviewerDetails}>
                                                        <span className={styles.reviewerName}>{review.reviewerName}</span>
                                                        <span className={styles.reviewDate}>
                                                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={styles.reviewRating}>
                                                    <Star size={12} fill="#ffc107" color="#ffc107" />
                                                    <span>{review.rating}</span>
                                                </div>
                                            </div>
                                            {review.comment && (
                                                <p className={styles.reviewComment}>{review.comment}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default UserProfileModal;