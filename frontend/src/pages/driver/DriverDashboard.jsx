import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Button from '../../components/ui/Button';
import ConfirmModal from '../../components/ConfirmModal';
import LocalToast from '../../components/LocalToast';
import ChatButton from '../../components/chat/ChatButton';
import { useToast } from '../../utils/useToast';
import {
    cancelPublishedRide,
    getRidePassengers,
    getMyRides,
    acceptBookingRequest,
    rejectBookingRequest,
    startRide,
    completeRide,
    verifyOnboarding
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import UserProfileModal from '../../components/UserProfileModal';
import ReviewModal from '../../components/ReviewModal';
import styles from './DriverDashboard.module.css';
import { Plus, Calendar, Clock, MapPin, Users, XCircle, List, History, Check, X, Wallet, Play, Flag, Star } from 'lucide-react';

const driverCancelReasons = [
    { value: 'UNPROFITABLE_DESTINATION', label: 'Unprofitable destination' },
    { value: 'VEHICLE_ISSUES', label: 'Vehicle issues' },
    { value: 'OTHER', label: 'Other' }
];

const DriverDashboard = () => {
    const { user } = useAuth();
    const [rides, setRides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('upcoming');

    // Modal States
    const [passengerModal, setPassengerModal] = useState({ show: false, passengers: [], rideId: null, rideStatus: null });
    const [loadingPassengers, setLoadingPassengers] = useState(false);
    const [viewProfileId, setViewProfileId] = useState(null);
    const [reviewTarget, setReviewTarget] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null, type: 'warning' });
    const [cancelModal, setCancelModal] = useState({ show: false, rideId: null, reason: 'UNPROFITABLE_DESTINATION', reasonText: '', error: '' });
    const { toasts, showToast, removeToast } = useToast();
    const notificationRefreshTimer = useRef(null);
    
    // OTP Verification State
    const [otpInputs, setOtpInputs] = useState({});
    const [verifyingOtp, setVerifyingOtp] = useState({});

    const isVerified = user?.isVerified === true;

    const fetchRides = async () => {
        try {
            const data = await getMyRides();
            setRides(data || []);
        } catch (error) {
            console.error('Failed to fetch rides', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRides();
    }, []);

    useEffect(() => {
        const handleNotification = () => {
            if (notificationRefreshTimer.current) {
                clearTimeout(notificationRefreshTimer.current);
            }
            notificationRefreshTimer.current = setTimeout(async () => {
                try {
                    await fetchRides();
                    if (passengerModal.show && passengerModal.rideId) {
                        const list = await getRidePassengers(passengerModal.rideId);
                        setPassengerModal(prev => ({ ...prev, passengers: list }));
                    }
                } catch (err) {
                    console.log('Notification refresh failed:', err);
                }
            }, 1000);
        };

        window.addEventListener('notification-received', handleNotification);
        return () => {
            window.removeEventListener('notification-received', handleNotification);
            if (notificationRefreshTimer.current) {
                clearTimeout(notificationRefreshTimer.current);
            }
        };
    }, [passengerModal.show, passengerModal.rideId]);

    const handleStartRide = async (rideId) => {
        setConfirmModal({
            show: true,
            title: 'Start Ride',
            message: 'Start this ride? This will notify passengers.',
            type: 'info',
            onConfirm: async () => {
                try {
                    await startRide(rideId);
                    fetchRides();
                    showToast('Ride started successfully!', 'SUCCESS');
                } catch (err) {
                    showToast(err.message, 'ERROR');
                }
            }
        });
    };

    const handleCompleteRide = async (rideId) => {
        setConfirmModal({
            show: true,
            title: 'Complete Ride',
            message: 'Complete this ride? This allows passengers to leave reviews.',
            type: 'info',
            onConfirm: async () => {
                try {
                    await completeRide(rideId);
                    fetchRides();
                    showToast('Ride completed successfully!', 'SUCCESS');
                } catch (err) {
                    showToast(err.message, 'ERROR');
                }
            }
        });
    };

    const handleCancelRide = async (rideId) => {
        setCancelModal({
            show: true,
            rideId,
            reason: 'UNPROFITABLE_DESTINATION',
            reasonText: '',
            error: ''
        });
    };

    const submitCancelRide = async () => {
        if (!cancelModal.reason) {
            setCancelModal(prev => ({ ...prev, error: 'Please select a reason.' }));
            return;
        }
        if (cancelModal.reason === 'OTHER' && !cancelModal.reasonText.trim()) {
            setCancelModal(prev => ({ ...prev, error: 'Please provide details for the selected reason.' }));
            return;
        }
        try {
            await cancelPublishedRide(cancelModal.rideId, cancelModal.reason, cancelModal.reasonText.trim());
            showToast('Ride cancelled successfully!', 'SUCCESS');
            setCancelModal({ show: false, rideId: null, reason: 'UNPROFITABLE_DESTINATION', reasonText: '', error: '' });
            fetchRides();
        } catch (err) {
            showToast(err.message, 'ERROR');
        }
    };

    const openPassengerList = async (ride) => {
        setLoadingPassengers(true);
        setPassengerModal({ show: true, passengers: [], rideId: ride.id, rideStatus: ride.status });
        try {
            const list = await getRidePassengers(ride.id);
            setPassengerModal({ show: true, passengers: list, rideId: ride.id, rideStatus: ride.status });
        } catch (err) {
            showToast('Failed to load passengers: ' + err.message, 'ERROR');
            setPassengerModal({ show: false, passengers: [], rideId: null, rideStatus: null });
        } finally {
            setLoadingPassengers(false);
        }
    };

    const handleAccept = async (bookingId) => {
        try {
            await acceptBookingRequest(bookingId);
            showToast('Booking accepted successfully!', 'SUCCESS');
            const list = await getRidePassengers(passengerModal.rideId);
            setPassengerModal(prev => ({ ...prev, passengers: list }));
            // Refresh rides to get updated seat counts from backend
            fetchRides();
        } catch (err) {
            showToast(err.message, 'ERROR');
        }
    };

    const handleReject = async (bookingId) => {
        setConfirmModal({
            show: true,
            title: 'Reject Passenger',
            message: 'Are you sure you want to reject this passenger?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await rejectBookingRequest(bookingId);
                    showToast('Booking rejected', 'SUCCESS');
                    const list = await getRidePassengers(passengerModal.rideId);
                    setPassengerModal(prev => ({ ...prev, passengers: list }));
                } catch (err) {
                    showToast(err.message, 'ERROR');
                }
            }
        });
    };

    const handleReviewSuccess = () => {
        setReviewTarget(null);
        showToast('Review submitted successfully!', 'SUCCESS');
    };

    const handleVerifyOnboarding = async (bookingId) => {
        const otp = otpInputs[bookingId];
        if (!otp || otp.trim().length !== 6) {
            showToast('Please enter a valid 6-digit OTP', 'ERROR');
            return;
        }

        setVerifyingOtp(prev => ({ ...prev, [bookingId]: true }));
        try {
            await verifyOnboarding(bookingId, otp.trim());
            showToast('Passenger verified and onboarded successfully!', 'SUCCESS');
            
            // Refresh passenger list
            const list = await getRidePassengers(passengerModal.rideId);
            setPassengerModal(prev => ({ ...prev, passengers: list }));
            
            // Clear OTP input
            setOtpInputs(prev => ({ ...prev, [bookingId]: '' }));
        } catch (err) {
            showToast(err.message || 'Failed to verify OTP', 'ERROR');
        } finally {
            setVerifyingOtp(prev => ({ ...prev, [bookingId]: false }));
        }
    };

    const handleOtpChange = (bookingId, value) => {
        // Only allow digits and max 6 characters
        const sanitized = value.replace(/\D/g, '').slice(0, 6);
        setOtpInputs(prev => ({ ...prev, [bookingId]: sanitized }));
    };

    const upcomingRides = rides.filter(r => ['AVAILABLE', 'IN_PROGRESS', 'FULL'].includes(r.status));
    const historyRides = rides.filter(r => ['COMPLETED', 'CANCELLED', 'CANCELLED_BY_ADMIN', 'CANCELLED_BY_DRIVER'].includes(r.status));

    const renderRideList = (rideList) => (
        <div className={styles.ridesGrid}>
            {rideList.map((ride) => {
                return (
                <div key={ride.id} className={styles.rideCard}>
                    <div className={`${styles.statusBadge} ${styles[ride.status]}`}>
                        {ride.status ? ride.status.replace(/_/g, ' ') : 'AVAILABLE'}
                    </div>

                    <div className={styles.route}>
                        <div className={styles.location}>
                            <MapPin size={16} className={styles.icon} />
                            <span>{ride.source}</span>
                        </div>
                        <div className={styles.connector}></div>
                        <div className={styles.location}>
                            <MapPin size={16} className={styles.icon} />
                            <span>{ride.destination}</span>
                        </div>
                    </div>

                    <div className={styles.details}>
                        <div className={styles.detailItem}>
                            <Calendar size={16} className={styles.icon} /> {ride.travelDate}
                        </div>
                        <div className={styles.detailItem}>
                            <Clock size={16} className={styles.icon} /> {ride.travelTime}
                        </div>
                        <div className={styles.detailItem}>
                            <Users size={16} className={styles.icon} /> {ride.availableSeats} Seats Available
                        </div>
                    </div>

                    <div className={styles.priceTag}>₹{ride.pricePerSeat} / seat</div>

                    <div className={styles.actions}>
                        <Button variant="outline" className={styles.viewBtn} onClick={() => openPassengerList(ride)}>
                            <List size={16} style={{ marginRight: '5px' }} /> List
                        </Button>

                        {activeTab === 'upcoming' && (
                            <>
                                {ride.status === 'AVAILABLE' || ride.status === 'FULL' ? (
                                    <Button onClick={() => handleStartRide(ride.id)} style={{ backgroundColor: '#0f4c81', color: 'white' }}>
                                        <Play size={16} style={{ marginRight: '5px' }} /> Start
                                    </Button>
                                ) : ride.status === 'IN_PROGRESS' ? (
                                    <Button onClick={() => handleCompleteRide(ride.id)} style={{ backgroundColor: '#28a745', color: 'white' }}>
                                        <Flag size={16} style={{ marginRight: '5px' }} /> Complete
                                    </Button>
                                ) : null}

                                {ride.status !== 'IN_PROGRESS' && (
                                    <Button variant="outline" onClick={() => handleCancelRide(ride.id)} className={styles.cancelBtn} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
                                        <XCircle size={16} />
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
                );
            })}
        </div>
    );

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <div className="container">
                {!isVerified && <div className={styles.verificationBanner}>⚠️ Your account is pending Admin verification.</div>}

                <div className={styles.header}>
                    <div>
                        <h1>Driver Dashboard</h1>
                        <p className={styles.subHeader}>Manage your rides and bookings</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isVerified && <div className={styles.verifiedBadge}>Verified</div>}
                        <Link to="/driver-history">
                            <Button variant="outline" style={{ borderColor: '#0f4c81', color: '#0f4c81', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Wallet size={18} /> View Earnings
                            </Button>
                        </Link>
                        <Link to="/post-ride">
                            <Button disabled={!isVerified}><Plus size={18} style={{ marginRight: '8px' }} /> Post Ride</Button>
                        </Link>
                    </div>
                </div>

                <div className={styles.tabs}>
                    <button className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.active : ''}`} onClick={() => setActiveTab('upcoming')}>
                        <Calendar size={18} style={{ marginRight: '5px' }} /> Upcoming
                    </button>
                    <button className={`${styles.tabBtn} ${activeTab === 'history' ? styles.active : ''}`} onClick={() => setActiveTab('history')}>
                        <History size={18} style={{ marginRight: '5px' }} /> History
                    </button>
                </div>

                <div className={styles.ridesSection}>
                    {loading ? <p>Loading...</p> : (
                        activeTab === 'upcoming' ?
                            (upcomingRides.length === 0 ? <div className={styles.emptyState}>No upcoming rides.</div> : renderRideList(upcomingRides)) :
                            (historyRides.length === 0 ? <div className={styles.emptyState}>No past rides.</div> : renderRideList(historyRides))
                    )}
                </div>
            </div>

            {/* Passenger List Modal */}
            {passengerModal.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>Passenger List (Ride {passengerModal.rideId})</h3>
                            <button onClick={() => setPassengerModal({ show: false, passengers: [], rideId: null, rideStatus: null })} className={styles.closeBtn}>&times;</button>
                        </div>
                        {loadingPassengers ? <p>Loading...</p> : passengerModal.passengers.length === 0 ? <p className={styles.emptyText}>No passengers yet.</p> : (
                            <ul className={styles.passengerList}>
                                {passengerModal.passengers.map((p, idx) => (
                                    <li key={idx} className={styles.passengerItem}>
                                        <div className={styles.pInfo}>
                                            <span
                                                className={styles.pName}
                                                onClick={() => setViewProfileId(p.userId)}
                                                style={{ cursor: 'pointer', textDecoration: 'underline', color: '#0f4c81' }}
                                            >
                                                {p.name}
                                            </span>
                                            <span className={styles.pContact}>{p.phone}</span>
                                        </div>
                                        <div className={styles.pMeta}>
                                            <span className={styles.pSeats}>{p.seatsBooked} Seat(s)</span>

                                            {/* Status Badge - Hide CONFIRMED during IN_PROGRESS/COMPLETED and hide ONBOARDED (shown separately) */}
                                            {!(passengerModal.rideStatus === 'COMPLETED' && p.bookingStatus === 'CONFIRMED') && 
                                             !(passengerModal.rideStatus === 'IN_PROGRESS' && p.bookingStatus === 'CONFIRMED') &&
                                             p.bookingStatus !== 'ONBOARDED' && (
                                                <span className={`${styles.pStatus} ${styles[p.bookingStatus]}`}>{p.bookingStatus.replace('_', ' ')}</span>
                                            )}
                                            
                                            {/* ONBOARDED Badge (special styling) - Hide when ride is COMPLETED */}
                                            {p.bookingStatus === 'ONBOARDED' && passengerModal.rideStatus !== 'COMPLETED' && (
                                                <span className={`${styles.pStatus} ${styles.ONBOARDED}`}>✓ ONBOARDED</span>
                                            )}

                                            {/* Chat Button - Show for accepted passengers */}
                                            {(p.bookingStatus === 'PENDING_PAYMENT' || p.bookingStatus === 'CONFIRMED' || p.bookingStatus === 'ONBOARDED') && (
                                                <div style={{ marginTop: '8px' }}>
                                                    <ChatButton
                                                        tripId={passengerModal.rideId}
                                                        otherUser={{
                                                            id: p.userId,
                                                            name: p.name
                                                        }}
                                                        rideInfo={{
                                                            from: rides.find(r => r.id === passengerModal.rideId)?.source || 'Pickup',
                                                            to: rides.find(r => r.id === passengerModal.rideId)?.destination || 'Drop-off'
                                                        }}
                                                        variant="tertiary"
                                                        label="Chat"
                                                        showIcon={true}
                                                    />
                                                </div>
                                            )}

                                            {/* Accept/Reject Buttons */}
                                            {p.bookingStatus === 'PENDING_APPROVAL' && (
                                                <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
                                                    <Button size="sm" onClick={() => handleAccept(p.bookingId)} style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: '#28a745', color: 'white', border: 'none' }}>
                                                        <Check size={14} style={{ marginRight: '2px' }} /> Accept
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleReject(p.bookingId)} style={{ padding: '4px 8px', fontSize: '0.7rem', backgroundColor: '#dc3545', borderColor: '#dc3545', color: 'white' }}>
                                                        <X size={14} style={{ marginRight: '2px' }} /> Reject
                                                    </Button>
                                                </div>
                                            )}

                                            {/* OTP Verification (Only for passengers awaiting onboarding) */}
                                            {p.bookingStatus === 'PENDING_PAYMENT' && (
                                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #dee2e6' }}>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '5px', color: '#495057' }}>
                                                        Verify Passenger OTP:
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            placeholder="Enter 6-digit OTP"
                                                            value={otpInputs[p.bookingId] || ''}
                                                            onChange={(e) => handleOtpChange(p.bookingId, e.target.value)}
                                                            maxLength={6}
                                                            style={{
                                                                flex: 1,
                                                                padding: '6px 10px',
                                                                fontSize: '0.85rem',
                                                                border: '1px solid #ced4da',
                                                                borderRadius: '4px',
                                                                outline: 'none',
                                                                letterSpacing: '2px',
                                                                fontWeight: '600',
                                                                textAlign: 'center'
                                                            }}
                                                            disabled={verifyingOtp[p.bookingId]}
                                                        />
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleVerifyOnboarding(p.bookingId)}
                                                            disabled={verifyingOtp[p.bookingId] || !otpInputs[p.bookingId] || otpInputs[p.bookingId].length !== 6}
                                                            style={{
                                                                padding: '6px 12px',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: '#0f4c81',
                                                                color: 'white',
                                                                border: 'none',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {verifyingOtp[p.bookingId] ? 'Verifying...' : 'Verify'}
                                                        </Button>
                                                    </div>
                                                    <p style={{ fontSize: '0.65rem', color: '#6c757d', marginTop: '4px', marginBottom: 0 }}>
                                                        Ask passenger for their OTP from the booking confirmation
                                                    </p>
                                                </div>
                                            )}

                                            {/* Rate Passenger Button - Only if Ride is COMPLETED and Passenger CONFIRMED/ONBOARDED */}
                                            {passengerModal.rideStatus === 'COMPLETED' && (p.bookingStatus === 'CONFIRMED' || p.bookingStatus === 'ONBOARDED') && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => setReviewTarget({ bookingId: p.bookingId, passengerName: p.name })}
                                                    style={{ marginTop: '5px', backgroundColor: '#ffc107', color: '#333', borderColor: '#ffc107', fontSize: '0.75rem', padding: '4px 8px' }}
                                                >
                                                    <Star size={12} style={{ marginRight: '3px' }} /> Rate
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {viewProfileId && <UserProfileModal 
                userId={viewProfileId} 
                onClose={() => setViewProfileId(null)} 
                hasBooked={true}
            />}

            {/* Review Modal */}
            {reviewTarget && (
                <ReviewModal
                    booking={reviewTarget}
                    onClose={() => setReviewTarget(null)}
                    onSuccess={handleReviewSuccess}
                />
            )}

            {cancelModal.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>Cancel Ride</h3>
                            <button
                                onClick={() => setCancelModal({ show: false, rideId: null, reason: 'UNPROFITABLE_DESTINATION', reasonText: '', error: '' })}
                                className={styles.closeBtn}
                            >
                                x
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.modalLabel}>Reason</label>
                            <select
                                className={styles.modalInput}
                                value={cancelModal.reason}
                                onChange={(e) => setCancelModal(prev => ({ ...prev, reason: e.target.value, error: '' }))}
                            >
                                {driverCancelReasons.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            {cancelModal.reason === 'OTHER' && (
                                <>
                                    <label className={styles.modalLabel}>Reason Details</label>
                                    <textarea
                                        className={styles.modalTextarea}
                                        rows={3}
                                        value={cancelModal.reasonText}
                                        onChange={(e) => setCancelModal(prev => ({ ...prev, reasonText: e.target.value, error: '' }))}
                                    />
                                </>
                            )}
                            {cancelModal.error && <div className={styles.modalError}>{cancelModal.error}</div>}
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setCancelModal({ show: false, rideId: null, reason: 'UNPROFITABLE_DESTINATION', reasonText: '', error: '' })}>
                                Close
                            </Button>
                            <Button onClick={submitCancelRide} style={{ backgroundColor: '#dc3545', color: '#fff' }}>
                                Confirm Cancellation
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.show}
                onClose={() => setConfirmModal({ ...confirmModal, show: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmText="Confirm"
                cancelText="Cancel"
            />

            {/* Toast Notifications */}
            <LocalToast toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default DriverDashboard;
