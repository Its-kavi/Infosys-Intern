import React, { useEffect, useState, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Button from '../../components/ui/Button';
import PaymentModal from '../../components/PaymentModal';
import ReviewModal from '../../components/ReviewModal';
import UserProfileModal from '../../components/UserProfileModal';
import LocalToast from '../../components/LocalToast';
import ChatButton from '../../components/chat/ChatButton';
import SupportRequestModal from '../../components/passenger/SupportRequestModal';
import { useToast } from '../../utils/useToast';
import { getMyBookings, cancelBooking, createSupportRequest, getMySupportRequests } from '../../services/api';
import styles from './MyBookings.module.css';
import { Calendar, Clock, MapPin, CheckCircle, CreditCard, XCircle, History, Clock3, Star, Receipt, HelpCircle } from 'lucide-react';

const passengerCancelReasons = [
    { value: 'CHANGED_PLANS', label: 'Changed plans' },
    { value: 'LONG_WAIT_TIME', label: 'Long wait time' },
    { value: 'BETTER_RIDE_AVAILABLE', label: 'Better ride available' },
    { value: 'INCORRECT_PICKUP', label: 'Incorrect pickup' },
    { value: 'OTHER', label: 'Other' }
];

const MyBookings = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paymentBooking, setPaymentBooking] = useState(null);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [viewProfileId, setViewProfileId] = useState(null);
    const [supportModalBooking, setSupportModalBooking] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming');
    const { toasts, showToast, removeToast } = useToast();
    const [supportRequests, setSupportRequests] = useState({});
    const [supportRequestsList, setSupportRequestsList] = useState([]);
    const [cancelModal, setCancelModal] = useState({
        show: false,
        bookingId: null,
        reason: 'CHANGED_PLANS',
        reasonText: '',
        error: ''
    });
    const notificationRefreshTimer = useRef(null);

    const buildSupportRequestMap = (requests = []) => {
        return requests.reduce((acc, request) => {
            if (!request?.bookingId) return acc;
            const existing = acc[request.bookingId];
            if (!existing) {
                acc[request.bookingId] = request;
                return acc;
            }
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const nextTime = new Date(request.updatedAt || request.createdAt || 0).getTime();
            if (nextTime >= existingTime) {
                acc[request.bookingId] = request;
            }
            return acc;
        }, {});
    };

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const [bookingsResult, supportResult] = await Promise.allSettled([
                getMyBookings(),
                getMySupportRequests()
            ]);

            if (bookingsResult.status === 'fulfilled') {
                setBookings(bookingsResult.value || []);
            } else {
                throw bookingsResult.reason;
            }

            if (supportResult && supportResult.status === 'fulfilled') {
                const list = supportResult.value || [];
                setSupportRequests(buildSupportRequestMap(list));
                setSupportRequestsList(list);
            }
        } catch (error) {
            console.error('Failed to fetch bookings', error);
            showToast('Failed to fetch bookings', 'ERROR');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        const handleNotification = () => {
            if (notificationRefreshTimer.current) {
                clearTimeout(notificationRefreshTimer.current);
            }
            notificationRefreshTimer.current = setTimeout(() => {
                fetchBookings();
            }, 1000);
        };

        window.addEventListener('notification-received', handleNotification);
        return () => {
            window.removeEventListener('notification-received', handleNotification);
            if (notificationRefreshTimer.current) {
                clearTimeout(notificationRefreshTimer.current);
            }
        };
    }, []);

    const handlePaymentSuccess = () => {
        setPaymentBooking(null);
        setLoading(true);
        fetchBookings();
    };

    const handleReviewSuccess = () => {
        setReviewBooking(null);
        showToast("Review Submitted! Thank you.", "SUCCESS");
        fetchBookings();
    };

    const handleCancel = (id) => {
        setCancelModal({
            show: true,
            bookingId: id,
            reason: 'CHANGED_PLANS',
            reasonText: '',
            error: ''
        });
    };

    const submitCancel = async () => {
        if (!cancelModal.reason) {
            setCancelModal(prev => ({ ...prev, error: 'Please select a reason.' }));
            return;
        }
        if (cancelModal.reason === 'OTHER' && !cancelModal.reasonText.trim()) {
            setCancelModal(prev => ({ ...prev, error: 'Please provide details for the selected reason.' }));
            return;
        }
        try {
            await cancelBooking(cancelModal.bookingId, cancelModal.reason, cancelModal.reasonText.trim());
            showToast('Booking Cancelled', 'SUCCESS');
            setCancelModal({ show: false, bookingId: null, reason: 'CHANGED_PLANS', reasonText: '', error: '' });
            fetchBookings();
        } catch (err) {
            showToast(err.message, 'ERROR');
        }
    };

    const handleSupportRequest = (booking) => {
        setSupportModalBooking(booking);
    };

    const handleSupportSubmit = async (payload) => {
        const data = await createSupportRequest(payload);
        showToast('Support request submitted.', 'SUCCESS');
        setSupportModalBooking(null);
        setSupportRequests((prev) => ({
            ...prev,
            [data.bookingId]: data
        }));
        setSupportRequestsList((prev) => [data, ...(prev || [])]);
    };

    // Filter Logic
    const upcomingBookings = bookings.filter(b =>
        (b.status === 'PENDING_APPROVAL' || b.status === 'PENDING_PAYMENT' || b.status === 'CONFIRMED' || b.status === 'ONBOARDED') &&
        !b.ride.status.includes('CANCELLED') &&
        b.ride.status !== 'COMPLETED'
    );

    // History: CANCELLED, REFUNDED, COMPLETED, or Admin/Driver Cancelled
    const historyBookings = bookings.filter(b =>
        b.status === 'CANCELLED' ||
        b.status === 'CANCELLED_BY_DRIVER' ||
        b.status === 'REJECTED' ||
        b.status === 'REFUNDED' ||
        b.ride.status === 'COMPLETED' ||
        b.ride.status.includes('CANCELLED')
    );

    const getStatusBadge = (status, rideStatus) => {
        if (rideStatus === 'CANCELLED_BY_ADMIN') return <div className={`${styles.statusBadge} ${styles.CANCELLED}`}><XCircle size={14} /> Ride Cancelled (Admin)</div>;
        if (rideStatus === 'COMPLETED') return <div className={`${styles.statusBadge} ${styles.CONFIRMED}`}><CheckCircle size={14} /> Ride Completed</div>;
        if (status === 'ONBOARDED') return <div className={`${styles.statusBadge} ${styles.ONBOARDED}`}><CheckCircle size={14} />  Onboarded</div>;
        if (status === 'CONFIRMED') return <div className={`${styles.statusBadge} ${styles.CONFIRMED}`}><CheckCircle size={14} /> Confirmed</div>;
        if (status === 'PENDING_APPROVAL') return <div className={`${styles.statusBadge} ${styles.PENDING}`}><Clock3 size={14} /> Awaiting Approval</div>;
        if (status === 'PENDING_PAYMENT') return <div className={`${styles.statusBadge} ${styles.PAYMENT}`}><CreditCard size={14} /> Awaiting Onboarding</div>;
        if (status === 'REJECTED') return <div className={`${styles.statusBadge} ${styles.CANCELLED}`}><XCircle size={14} /> Rejected</div>;
        if (status.includes('CANCELLED')) return <div className={`${styles.statusBadge} ${styles.CANCELLED}`}><XCircle size={14} /> Cancelled</div>;
        return <div className={styles.statusBadge}>{status}</div>;
    };

    const getSupportStatusBadge = (request) => {
        if (!request) return null;
        const statusClass = request.status === 'RESOLVED'
            ? styles.supportResolved
            : request.status === 'IN_REVIEW'
                ? styles.supportReview
                : styles.supportPending;
        return (
            <div className={`${styles.supportBadge} ${statusClass}`}>
                Support {request.status}
            </div>
        );
    };

    const renderBookings = (list) => (
        <div className={styles.bookingsList}>
            {list.map((booking) => {
                const supportRequest = supportRequests[booking.id];
                return (
                <div key={booking.id} className={styles.bookingCard}>
                    <div className={styles.cardHeader}>
                        {getStatusBadge(booking.status, booking.ride.status)}
                    </div>

                    <div className={styles.route}>
                        <div className={styles.location}>
                            <MapPin size={16} className={styles.icon} color="#10b981" />
                            <span>{booking.ride.source}</span>
                        </div>
                        <div className={styles.connector}></div>
                        <div className={styles.location}>
                            <MapPin size={16} className={styles.icon} color="#ef4444" />
                            <span>{booking.ride.destination}</span>
                        </div>
                    </div>

                    <div className={styles.details}>
                        <div className={styles.detailItem}>
                            <Calendar size={16} /> {booking.ride.travelDate}
                        </div>
                        <div className={styles.detailItem}>
                            <Clock size={16} /> {booking.ride.travelTime}
                        </div>
                        <div
                            className={styles.detailItem}
                            onClick={() => setViewProfileId(booking.ride.driver?.id)}
                            style={{ cursor: 'pointer', color: '#0f4c81', fontWeight: '500' }}
                            title="View Driver Profile"
                        >
                            Driver: {booking.ride.driver?.name || 'Unknown'}
                        </div>
                    </div>

                    <div className={styles.footer}>
                        <div className={styles.costInfo}>
                            <span className={styles.seats}>{booking.seatsBooked} Seat(s)</span>
                            <span className={styles.price}>
                                Total: ₹{booking.ride.pricePerSeat * booking.seatsBooked}
                            </span>
                            {supportRequest && (
                                <div className={styles.supportInfo}>
                                    {getSupportStatusBadge(supportRequest)}
                                </div>
                            )}
                        </div>

                        <div className={styles.actions} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {/* Chat Button - Show for confirmed/onboarded bookings that aren't completed or cancelled */}
                            {(booking.status === 'PENDING_PAYMENT' || booking.status === 'CONFIRMED' || booking.status === 'ONBOARDED') && 
                             booking.ride.status !== 'COMPLETED' && 
                             !booking.ride.status.includes('CANCELLED') && 
                             booking.ride.driver && (
                                <ChatButton
                                    tripId={booking.ride.id}
                                    otherUser={{
                                        id: booking.ride.driver.id,
                                        name: booking.ride.driver.name
                                    }}
                                    rideInfo={{
                                        from: booking.ride.source,
                                        to: booking.ride.destination
                                    }}
                                    variant="secondary"
                                    label="Chat"
                                />
                            )}

                            {/* Cancel Button - Show if active and not completed */}
                            {!booking.status.includes('CANCELLED') && booking.status !== 'REJECTED' && booking.status !== 'ONBOARDED' && booking.ride.status !== 'COMPLETED' && booking.ride.status !== 'CANCELLED' && (
                                <Button
                                    variant="outline"
                                    onClick={() => handleCancel(booking.id)}
                                    style={{ borderColor: '#dc3545', color: '#dc3545' }}
                                >
                                    Cancel
                                </Button>
                            )}

                            {/* Pay Button - Only after onboarding */}
                            {booking.status === 'ONBOARDED' && booking.ride.status !== 'COMPLETED' && (
                                <Button className={styles.payBtn} onClick={() => setPaymentBooking(booking)}>
                                    <CreditCard size={16} style={{ marginRight: '5px' }} /> Pay Now
                                </Button>
                            )}

                            {/* Review Button - Only if Completed & Confirmed/Onboarded */}
                            {booking.ride.status === 'COMPLETED' && (booking.status === 'CONFIRMED' || booking.status === 'ONBOARDED') && (
                                <Button
                                    onClick={() => setReviewBooking(booking)}
                                    style={{ backgroundColor: '#ffc107', color: '#333', borderColor: '#ffc107' }}
                                >
                                    <Star size={16} style={{ marginRight: '5px' }} /> Rate Driver
                                </Button>
                            )}

                            {/* Support Button - For post-ride issues */}
                            {activeTab === 'history' && !supportRequest && (
                                <Button variant="outline" onClick={() => handleSupportRequest(booking)} style={{ borderColor: '#0f4c81', color: '#0f4c81' }}>
                                    <HelpCircle size={16} style={{ marginRight: '5px' }} /> Report Issue
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                );
            })}
        </div>
    );

    const renderSupportRequests = () => {
        const sorted = [...(supportRequestsList || [])].sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return bTime - aTime;
        });

        if (sorted.length === 0) {
            return <div className={styles.emptyState}>No support requests yet.</div>;
        }

        return (
            <div className={styles.supportList}>
                {sorted.map((request) => (
                    <div key={request.id} className={styles.supportCard}>
                        <div className={styles.supportHeader}>
                            <div>
                                <div className={styles.supportTitle}>Request #{request.id}</div>
                                <div className={styles.supportMeta}>Booking #{request.bookingId}</div>
                            </div>
                            {getSupportStatusBadge(request)}
                        </div>
                        <div className={styles.supportBody}>
                            <div className={styles.supportRow}>
                                <span>Route</span>
                                <span>{request.rideSource} to {request.rideDestination}</span>
                            </div>
                            <div className={styles.supportRow}>
                                <span>Date</span>
                                <span>{request.rideDate} {request.rideTime}</span>
                            </div>
                            <div className={styles.supportRow}>
                                <span>Issue</span>
                                <span>{request.issueDescription}</span>
                            </div>
                            <div className={styles.supportRow}>
                                <span>Refund Requested</span>
                                <span>{request.refundRequested ? 'Yes' : 'No'}</span>
                            </div>
                            {Array.isArray(request.evidenceUrls) && request.evidenceUrls.length > 0 && (
                                <div className={styles.supportRow}>
                                    <span>Evidence</span>
                                    <span>
                                        {request.evidenceUrls.map((url, idx) => (
                                            <a key={`${request.id}-evidence-${idx}`} href={url} target="_blank" rel="noreferrer" style={{ color: '#0f4c81', display: 'inline-block', marginRight: '0.5rem' }}>
                                                Evidence {idx + 1}
                                            </a>
                                        ))}
                                    </span>
                                </div>
                            )}
                            {request.adminNotes && (
                                <div className={styles.supportRow}>
                                    <span>Admin Notes</span>
                                    <span>{request.adminNotes}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <LocalToast toasts={toasts} onRemove={removeToast} />
            <div className="container">
                <div className={styles.header}>
                    <h1>My Bookings</h1>
                    <Link to="/history">
                        <Button variant="outline" style={{ borderColor: '#0f4c81', color: '#0f4c81', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Receipt size={18} /> Payment History
                        </Button>
                    </Link>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.active : ''}`}
                        onClick={() => setActiveTab('upcoming')}
                    >
                        <Calendar size={18} style={{ marginRight: '5px' }} /> Upcoming
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'history' ? styles.active : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <History size={18} style={{ marginRight: '5px' }} /> History
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'support' ? styles.active : ''}`}
                        onClick={() => setActiveTab('support')}
                    >
                        <HelpCircle size={18} style={{ marginRight: '5px' }} /> Support
                    </button>
                </div>

                {loading ? (
                    <p>Loading bookings...</p>
                ) : activeTab === 'upcoming' ? (
                    upcomingBookings.length === 0 ? <div className={styles.emptyState}>No upcoming trips. Book a ride now!</div> : renderBookings(upcomingBookings)
                ) : activeTab === 'history' ? (
                    <>
                        {historyBookings.length === 0 ? <div className={styles.emptyState}>No past trips.</div> : renderBookings(historyBookings)}
                        {historyBookings.length > 0 && (
                            <div style={{ marginTop: '3rem', marginBottom: '2rem' }}>
                                <h3 style={{ marginBottom: '1rem', color: '#1e293b' }}>Spending Summary</h3>
                                <SpendingChart history={historyBookings} />
                            </div>
                        )}
                    </>
                ) : (
                    renderSupportRequests()
                )}
            </div>

            {/* Modals */}
            {paymentBooking && (
                <PaymentModal
                    booking={paymentBooking}
                    onClose={() => setPaymentBooking(null)}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            {reviewBooking && (
                <ReviewModal
                    booking={reviewBooking}
                    onClose={() => setReviewBooking(null)}
                    onSuccess={handleReviewSuccess}
                />
            )}

            {supportModalBooking && (
                <SupportRequestModal
                    isOpen={!!supportModalBooking}
                    booking={supportModalBooking}
                    onClose={() => setSupportModalBooking(null)}
                    onSubmit={handleSupportSubmit}
                />
            )}

            {viewProfileId && (
                <UserProfileModal
                    userId={viewProfileId}
                    onClose={() => setViewProfileId(null)}
                    hasBooked={true}
                />
            )}

            {cancelModal.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>Cancel Booking</h3>
                            <button
                                onClick={() => setCancelModal({ show: false, bookingId: null, reason: 'CHANGED_PLANS', reasonText: '', error: '' })}
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
                                {passengerCancelReasons.map((option) => (
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
                            <Button variant="outline" onClick={() => setCancelModal({ show: false, bookingId: null, reason: 'CHANGED_PLANS', reasonText: '', error: '' })}>
                                Close
                            </Button>
                            <Button onClick={submitCancel} style={{ backgroundColor: '#dc3545', color: '#fff' }}>
                                Confirm Cancellation
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyBookings;

// Internal Component for Spending Chart
const SpendingChart = ({ history }) => {
    // Process Data: Group by Month
    const data = useMemo(() => {
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('default', { month: 'short' });
            last6Months.push({ name: monthName, uv: 0 }); // uv = Amount
        }

        history.forEach(booking => {
            // Note: Use booking.ride.status or booking.status depending on logic.
            // Assuming completed rides or paid bookings count.
            if ((booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && booking.ride.status === 'COMPLETED') {
                const date = new Date(booking.ride.travelDate); // Use travel date for spending visual
                const monthName = date.toLocaleString('default', { month: 'short' });
                const monthEntry = last6Months.find(m => m.name === monthName);
                if (monthEntry) {
                    // Calculate price: pricePerSeat * seatsBooked
                    monthEntry.uv += (booking.ride.pricePerSeat * booking.seatsBooked);
                }
            }
        });
        return last6Months;
    }, [history]);

    return (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f0f0f0" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
